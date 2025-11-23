/**
 * Example Usage for COD API Wrapper
 * These examples show how to integrate with cod-bet-arena
 */

const BASE_URL = 'http://localhost:3000';

// ============================================
// AUTHENTICATION
// ============================================

async function login(username, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return response.json();
}

// ============================================
// BETTING ODDS CALCULATION
// ============================================

async function calculateBettingOdds(player1, platform1, player2, platform2, game = 'mw2') {
  // Fetch comparison data
  const response = await fetch(`${BASE_URL}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player1,
      platform1,
      player2,
      platform2,
      title: game,
      mode: 'mp'
    })
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  // Calculate odds based on K/D ratio and skill gap
  const p1KD = data.player1.stats.kdRatio;
  const p2KD = data.player2.stats.kdRatio;
  const skillGap = data.comparison.skillGap;

  // Simple odds calculation (can be more sophisticated)
  const p1WinProbability = p1KD / (p1KD + p2KD);
  const p2WinProbability = 1 - p1WinProbability;

  // Adjust for skill gap (higher gap = more confidence in prediction)
  const confidence = Math.min(skillGap / 50, 1); // 0-1 scale

  return {
    player1: {
      username: player1,
      odds: (1 / p1WinProbability).toFixed(2),
      winProbability: (p1WinProbability * 100).toFixed(1),
      stats: data.player1.stats
    },
    player2: {
      username: player2,
      odds: (1 / p2WinProbability).toFixed(2),
      winProbability: (p2WinProbability * 100).toFixed(1),
      stats: data.player2.stats
    },
    matchup: {
      skillGap,
      confidence: (confidence * 100).toFixed(1),
      favorite: data.comparison.player1Advantage ? player1 : player2,
      kdDifference: data.comparison.kdRatioDiff,
      recommendation: confidence > 0.5 ? 'High confidence bet' : 'Risky bet'
    }
  };
}

// ============================================
// MATCH VERIFICATION
// ============================================

async function verifyMatchResult(player, platform, game, beforeStats) {
  // Fetch current stats with cache refresh
  const response = await fetch(
    `${BASE_URL}/stats/${platform}/${player}/mp?title=${game}&refresh=true`
  );
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  const afterStats = data.stats;

  // Detect changes
  const changes = {
    winsIncreased: afterStats.wins > beforeStats.wins,
    lossesIncreased: afterStats.losses > beforeStats.losses,
    killsGained: afterStats.kills - beforeStats.kills,
    deathsGained: afterStats.deaths - beforeStats.deaths,
    gamesPlayed: (afterStats.wins + afterStats.losses) - (beforeStats.wins + beforeStats.losses)
  };

  return {
    matchPlayed: changes.gamesPlayed > 0,
    playerWon: changes.winsIncreased,
    playerLost: changes.lossesIncreased,
    performance: {
      killsInMatch: changes.killsGained,
      deathsInMatch: changes.deathsGained,
      kdInMatch: (changes.killsGained / Math.max(changes.deathsGained, 1)).toFixed(2)
    },
    beforeStats,
    afterStats
  };
}

// ============================================
// LEADERBOARD GENERATION
// ============================================

async function generateLeaderboard(players, game = 'mw2') {
  // Fetch all player stats in parallel
  const statsPromises = players.map(({ username, platform }) =>
    fetch(`${BASE_URL}/stats/${platform}/${username}/mp?title=${game}`)
      .then(r => r.json())
  );

  const results = await Promise.all(statsPromises);

  // Filter successful fetches and sort by K/D
  const leaderboard = results
    .filter(r => r.success)
    .map((r, index) => ({
      rank: 0, // Will be set after sorting
      player: r.player,
      platform: r.platform,
      kdRatio: r.stats.kdRatio,
      wlRatio: r.stats.wlRatio,
      wins: r.stats.wins,
      kills: r.stats.kills,
      level: r.stats.level,
      prestige: r.stats.prestige,
      score: calculatePlayerScore(r.stats)
    }))
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({ ...player, rank: index + 1 }));

  return leaderboard;
}

function calculatePlayerScore(stats) {
  // Weighted score calculation
  return (
    stats.kdRatio * 100 +
    stats.wlRatio * 50 +
    stats.level * 2 +
    stats.prestige * 10
  );
}

// ============================================
// LIVE MATCH TRACKING
// ============================================

class MatchTracker {
  constructor(player, platform, game) {
    this.player = player;
    this.platform = platform;
    this.game = game;
    this.initialStats = null;
    this.pollInterval = null;
  }

  async start() {
    // Capture initial stats
    const response = await fetch(
      `${BASE_URL}/stats/${this.platform}/${this.player}/mp?title=${this.game}`
    );
    const data = await response.json();
    
    if (data.success) {
      this.initialStats = data.stats;
      console.log(`Tracking started for ${this.player}`);
    }
  }

  async checkForUpdate(callback) {
    // Poll every minute for stat changes
    this.pollInterval = setInterval(async () => {
      const response = await fetch(
        `${BASE_URL}/stats/${this.platform}/${this.player}/mp?title=${this.game}&refresh=true`
      );
      const data = await response.json();

      if (data.success) {
        const currentStats = data.stats;
        const gamesPlayedBefore = this.initialStats.wins + this.initialStats.losses;
        const gamesPlayedNow = currentStats.wins + currentStats.losses;

        if (gamesPlayedNow > gamesPlayedBefore) {
          // Match completed!
          const result = {
            matchCompleted: true,
            won: currentStats.wins > this.initialStats.wins,
            performance: {
              kills: currentStats.kills - this.initialStats.kills,
              deaths: currentStats.deaths - this.initialStats.deaths
            }
          };
          
          callback(result);
          this.stop();
        }
      }
    }, 60000); // Check every minute
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      console.log(`Tracking stopped for ${this.player}`);
    }
  }
}

// ============================================
// TOURNAMENT BRACKET
// ============================================

async function generateTournamentBracket(participants, game = 'mw2') {
  // Fetch stats for all participants
  const statsPromises = participants.map(({ username, platform }) =>
    fetch(`${BASE_URL}/stats/${platform}/${username}/mp?title=${game}`)
      .then(r => r.json())
  );

  const results = await Promise.all(statsPromises);

  // Seed players by K/D ratio
  const seededPlayers = results
    .filter(r => r.success)
    .sort((a, b) => b.stats.kdRatio - a.stats.kdRatio)
    .map((player, index) => ({
      seed: index + 1,
      username: player.player,
      platform: player.platform,
      kdRatio: player.stats.kdRatio,
      stats: player.stats
    }));

  // Create bracket matchups (1 vs 8, 2 vs 7, etc.)
  const bracket = [];
  for (let i = 0; i < seededPlayers.length / 2; i++) {
    const player1 = seededPlayers[i];
    const player2 = seededPlayers[seededPlayers.length - 1 - i];
    
    bracket.push({
      matchId: i + 1,
      player1,
      player2,
      predictedWinner: player1.kdRatio > player2.kdRatio ? player1.username : player2.username
    });
  }

  return { seededPlayers, bracket };
}

// ============================================
// USAGE EXAMPLES
// ============================================

async function main() {
  try {
    // 1. Login first
    console.log('Logging in...');
    await login('your_email@example.com', 'your_password');

    // 2. Calculate betting odds
    console.log('\n=== BETTING ODDS ===');
    const odds = await calculateBettingOdds('Player1', 'xbl', 'Player2', 'psn', 'mw2');
    console.log(`${odds.player1.username} odds: ${odds.player1.odds} (${odds.player1.winProbability}%)`);
    console.log(`${odds.player2.username} odds: ${odds.player2.odds} (${odds.player2.winProbability}%)`);
    console.log(`Favorite: ${odds.matchup.favorite}`);
    console.log(`Confidence: ${odds.matchup.confidence}%`);

    // 3. Generate leaderboard
    console.log('\n=== LEADERBOARD ===');
    const leaderboard = await generateLeaderboard([
      { username: 'Player1', platform: 'xbl' },
      { username: 'Player2', platform: 'psn' },
      { username: 'Player3', platform: 'battle' }
    ], 'mw2');
    
    leaderboard.forEach(player => {
      console.log(`#${player.rank} ${player.player} - K/D: ${player.kdRatio}`);
    });

    // 4. Track a live match
    console.log('\n=== MATCH TRACKING ===');
    const tracker = new MatchTracker('Player1', 'xbl', 'mw2');
    await tracker.start();
    tracker.checkForUpdate((result) => {
      console.log('Match completed!', result);
    });

    // 5. Generate tournament bracket
    console.log('\n=== TOURNAMENT BRACKET ===');
    const tournament = await generateTournamentBracket([
      { username: 'Player1', platform: 'xbl' },
      { username: 'Player2', platform: 'psn' },
      { username: 'Player3', platform: 'battle' },
      { username: 'Player4', platform: 'steam' }
    ], 'mw2');
    
    tournament.bracket.forEach(match => {
      console.log(`Match ${match.matchId}: ${match.player1.username} vs ${match.player2.username}`);
      console.log(`  Predicted winner: ${match.predictedWinner}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Export for use in other modules
module.exports = {
  login,
  calculateBettingOdds,
  verifyMatchResult,
  generateLeaderboard,
  MatchTracker,
  generateTournamentBracket
};

// Run examples if called directly
if (require.main === module) {
  main();
}
