const NodeCache = require('node-cache');

class CacheService {
  constructor(ttlSeconds = 300) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
      useClones: false
    });

    // Track cache stats
    this.stats = {
      hits: 0,
      misses: 0
    };
  }

  /**
   * Get value from cache
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      this.stats.hits++;
      console.log(`Cache HIT: ${key}`);
    } else {
      this.stats.misses++;
      console.log(`Cache MISS: ${key}`);
    }
    
    return value;
  }

  /**
   * Set value in cache
   * @param {string} key
   * @param {*} value
   * @param {number} ttl - Optional TTL override in seconds
   * @returns {boolean}
   */
  set(key, value, ttl) {
    console.log(`Cache SET: ${key}`);
    return this.cache.set(key, value, ttl);
  }

  /**
   * Delete key from cache
   * @param {string} key
   * @returns {number} - Number of deleted entries
   */
  delete(key) {
    console.log(`Cache DELETE: ${key}`);
    return this.cache.del(key);
  }

  /**
   * Flush all cache entries
   */
  flush() {
    console.log('Cache FLUSH: All entries cleared');
    this.cache.flushAll();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      keys: this.cache.keys().length,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Generate cache key for player stats
   * @param {string} username
   * @param {string} platform
   * @param {string} title
   * @returns {string}
   */
  static generatePlayerKey(username, platform, title) {
    return `player:${platform}:${username}:${title}`;
  }

  /**
   * Generate cache key for player comparison
   * @param {string} player1
   * @param {string} platform1
   * @param {string} player2
   * @param {string} platform2
   * @param {string} title
   * @param {string} mode
   * @returns {string}
   */
  static generateComparisonKey(player1, platform1, player2, platform2, title, mode) {
    return `comparison:${title}:${mode}:${platform1}:${player1}:${platform2}:${player2}`;
  }
}

module.exports = CacheService;
