const PowerShellExecutor = require('../utils/powershell-executor');
const path = require('path');

class StatsService {
  constructor(scriptsPath) {
    this.executor = new PowerShellExecutor(scriptsPath);
    this.scriptsPath = scriptsPath;
  }

  /**
   * Fetch player stats for a specific game
   * @param {string} username - Player username
   * @param {string} platform - Gaming platform (xbl, psn, battle, steam)
   * @param {string} title - Game title (bo4, cw, mw, etc.)
   * @returns {Promise<Object>}
   */
  async fetchPlayerStats(username, platform, title = 'cw') {
    try {
      const result = await this.executor.execute('fetch_game_data.ps1', {
        UserName: username,
        Platform: platform,
        title: title
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          message: 'Failed to fetch player stats'
        };
      }

      // Read the generated JSON files
      const stats = await this.readPlayerStatsFiles(username, platform, title);
      
      return {
        success: true,
        data: stats,
        player: username,
        platform: platform,
        game: title
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error fetching player stats'
      };
    }
  }

  /**
   * Read player stats from generated JSON files
   * @param {string} username
   * @param {string} platform
   * @param {string} title
   * @returns {Promise<Object>}
   */
  async readPlayerStatsFiles(username, platform, title) {
    const outputDir = path.join(this.scriptsPath, 'output_account', title);
    const stats = {};

    // Determine which modes to read based on game title
    const modes = this.getModesForTitle(title);

    for (const mode of modes) {
      try {
        const filePath = path.join(outputDir, `${platform}_${username}_${mode}.json`);
        const data = await this.executor.readJsonOutput(
          path.relative(this.scriptsPath, filePath)
        );
        stats[mode] = data;
      } catch (error) {
        console.warn(`Could not read ${mode} stats for ${username}:`, error.message);
        stats[mode] = null;
      }
    }

    return stats;
  }

  /**
   * Get available modes for a game title
   * @param {string} title
   * @returns {Array<string>}
   */
  getModesForTitle(title) {
    const modeMap = {
      'bo4': ['mp', 'blackout', 'zombies'],
      'bo3': ['mp', 'zombies'],
      'cw': ['mp', 'zombies'],
      'mw': ['mp', 'wz'],
      'mw2': ['mp', 'wz'],
      'vg': ['mp'],
      'iw': ['mp'],
      'ww2': ['mp']
    };

    return modeMap[title] || ['mp'];
  }

  /**
   * Extract key stats from player data
   * @param {Object} playerData - Raw player data from API
   * @param {string} mode - Game mode
   * @returns {Object} - Simplified stats object
   */
  extractKeyStats(playerData, mode = 'mp') {
    if (!playerData || !playerData.data) return null;

    try {
      const data = playerData.data;
      const lifetime = data[mode]?.lifetime?.all || data.lifetime?.all || {};

      return {
        level: data[mode]?.level || data.level || 0,
        prestige: data[mode]?.prestige || data.prestige || 0,
        paragonRank: data[mode]?.paragonRank || 0,
        wins: lifetime.wins || 0,
        losses: lifetime.losses || 0,
        kills: lifetime.kills || 0,
        deaths: lifetime.deaths || 0,
        kdRatio: lifetime.kdRatio || 0,
        wlRatio: lifetime.wlRatio || 0,
        ekiadRatio: lifetime.ekiadRatio || 0,
        timePlayed: lifetime.timePlayed || 0,
        gamesPlayed: lifetime.gamesPlayed || 0,
        score: lifetime.score || 0,
        scorePerMinute: lifetime.scorePerMinute || 0
      };
    } catch (error) {
      console.error('Error extracting stats:', error);
      return null;
    }
  }

  /**
   * Compare two players
   * @param {string} player1 - First player username
   * @param {string} platform1 - First player platform
   * @param {string} player2 - Second player username
   * @param {string} platform2 - Second player platform
   * @param {string} title - Game title
   * @param {string} mode - Game mode to compare
   * @returns {Promise<Object>}
   */
  async comparePlayers(player1, platform1, player2, platform2, title = 'cw', mode = 'mp') {
    try {
      // Fetch both players' stats
      const [stats1Result, stats2Result] = await Promise.all([
        this.fetchPlayerStats(player1, platform1, title),
        this.fetchPlayerStats(player2, platform2, title)
      ]);

      if (!stats1Result.success || !stats2Result.success) {
        return {
          success: false,
          error: 'Failed to fetch one or both player stats'
        };
      }

      // Extract key stats for comparison
      const player1Stats = this.extractKeyStats(stats1Result.data[mode], mode);
      const player2Stats = this.extractKeyStats(stats2Result.data[mode], mode);

      // Calculate comparison metrics
      const comparison = this.calculateComparison(player1Stats, player2Stats);

      return {
        success: true,
        player1: {
          username: player1,
          platform: platform1,
          stats: player1Stats
        },
        player2: {
          username: player2,
          platform: platform2,
          stats: player2Stats
        },
        comparison: comparison,
        mode: mode,
        game: title
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error comparing players'
      };
    }
  }

  /**
   * Calculate comparison metrics between two players
   * @param {Object} stats1
   * @param {Object} stats2
   * @returns {Object}
   */
  calculateComparison(stats1, stats2) {
    if (!stats1 || !stats2) return null;

    return {
      kdRatioDiff: (stats1.kdRatio - stats2.kdRatio).toFixed(2),
      wlRatioDiff: (stats1.wlRatio - stats2.wlRatio).toFixed(2),
      levelDiff: stats1.level - stats2.level,
      winsDiff: stats1.wins - stats2.wins,
      killsDiff: stats1.kills - stats2.kills,
      player1Advantage: stats1.kdRatio > stats2.kdRatio,
      skillGap: this.calculateSkillGap(stats1, stats2)
    };
  }

  /**
   * Calculate overall skill gap (0-100 scale)
   * @param {Object} stats1
   * @param {Object} stats2
   * @returns {number}
   */
  calculateSkillGap(stats1, stats2) {
    // Weighted skill calculation
    const weights = {
      kdRatio: 0.35,
      wlRatio: 0.25,
      scorePerMinute: 0.20,
      ekiadRatio: 0.20
    };

    const score1 = 
      (stats1.kdRatio * weights.kdRatio) +
      (stats1.wlRatio * weights.wlRatio) +
      ((stats1.scorePerMinute / 500) * weights.scorePerMinute) +
      (stats1.ekiadRatio * weights.ekiadRatio);

    const score2 = 
      (stats2.kdRatio * weights.kdRatio) +
      (stats2.wlRatio * weights.wlRatio) +
      ((stats2.scorePerMinute / 500) * weights.scorePerMinute) +
      (stats2.ekiadRatio * weights.ekiadRatio);

    return Math.round(Math.abs(score1 - score2) * 100);
  }
}

module.exports = StatsService;
