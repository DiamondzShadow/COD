require('dotenv').config();
const express = require('express');
const cors = require('cors');
const AuthService = require('./services/auth.service');
const StatsService = require('./services/stats.service');
const CacheService = require('./services/cache.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
const SCRIPTS_PATH = process.env.SCRIPTS_PATH || '../';
const authService = new AuthService(SCRIPTS_PATH);
const statsService = new StatsService(SCRIPTS_PATH);
const cacheService = new CacheService(parseInt(process.env.CACHE_TTL) || 300);

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * POST /auth/login
 * Login to Activision account
 */
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const result = await authService.login(username, password);
    
    if (result.success) {
      // Clear cache on new login
      cacheService.flush();
      return res.json(result);
    }

    return res.status(401).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /auth/status
 * Check authentication status
 */
app.get('/auth/status', async (req, res) => {
  try {
    const isAuth = await authService.isAuthenticated();
    res.json({
      authenticated: isAuth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /auth/logout
 * Logout and clear session
 */
app.post('/auth/logout', async (req, res) => {
  try {
    await authService.logout();
    cacheService.flush();
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// PLAYER STATS ENDPOINTS
// ============================================

/**
 * GET /stats/:platform/:username
 * Get player stats
 * Query params: title (default: cw), refresh (boolean)
 */
app.get('/stats/:platform/:username', async (req, res) => {
  try {
    const { platform, username } = req.params;
    const title = req.query.title || 'cw';
    const refresh = req.query.refresh === 'true';

    // Check authentication
    const isAuth = await authService.isAuthenticated();
    if (!isAuth) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login first.'
      });
    }

    // Check cache
    const cacheKey = CacheService.generatePlayerKey(username, platform, title);
    
    if (!refresh) {
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return res.json({
          ...cached,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Fetch fresh data
    const result = await statsService.fetchPlayerStats(username, platform, title);
    
    if (result.success) {
      // Cache the result
      cacheService.set(cacheKey, result);
    }

    res.json({
      ...result,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /stats/:platform/:username/:mode
 * Get player stats for specific mode with key stats extracted
 */
app.get('/stats/:platform/:username/:mode', async (req, res) => {
  try {
    const { platform, username, mode } = req.params;
    const title = req.query.title || 'cw';
    const refresh = req.query.refresh === 'true';

    const isAuth = await authService.isAuthenticated();
    if (!isAuth) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login first.'
      });
    }

    const cacheKey = `${CacheService.generatePlayerKey(username, platform, title)}:${mode}`;
    
    if (!refresh) {
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return res.json({ ...cached, cached: true });
      }
    }

    const result = await statsService.fetchPlayerStats(username, platform, title);
    
    if (result.success && result.data[mode]) {
      const keyStats = statsService.extractKeyStats(result.data[mode], mode);
      const response = {
        success: true,
        player: username,
        platform: platform,
        game: title,
        mode: mode,
        stats: keyStats,
        rawData: result.data[mode]
      };
      
      cacheService.set(cacheKey, response);
      return res.json({ ...response, cached: false });
    }

    res.status(404).json({
      success: false,
      error: `No ${mode} data found for player ${username}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// PLAYER COMPARISON ENDPOINTS
// ============================================

/**
 * POST /compare
 * Compare two players
 * Body: { player1, platform1, player2, platform2, title, mode }
 */
app.post('/compare', async (req, res) => {
  try {
    const { player1, platform1, player2, platform2, title = 'cw', mode = 'mp' } = req.body;

    if (!player1 || !platform1 || !player2 || !platform2) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: player1, platform1, player2, platform2'
      });
    }

    const isAuth = await authService.isAuthenticated();
    if (!isAuth) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login first.'
      });
    }

    // Check cache
    const cacheKey = CacheService.generateComparisonKey(
      player1, platform1, player2, platform2, title, mode
    );
    
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Fetch and compare
    const result = await statsService.comparePlayers(
      player1, platform1, player2, platform2, title, mode
    );

    if (result.success) {
      cacheService.set(cacheKey, result);
    }

    res.json({ ...result, cached: false });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /compare/:platform1/:player1/vs/:platform2/:player2
 * Compare two players (GET version)
 * Query params: title (default: cw), mode (default: mp)
 */
app.get('/compare/:platform1/:player1/vs/:platform2/:player2', async (req, res) => {
  try {
    const { platform1, player1, platform2, player2 } = req.params;
    const title = req.query.title || 'cw';
    const mode = req.query.mode || 'mp';

    const isAuth = await authService.isAuthenticated();
    if (!isAuth) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login first.'
      });
    }

    const cacheKey = CacheService.generateComparisonKey(
      player1, platform1, player2, platform2, title, mode
    );
    
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const result = await statsService.comparePlayers(
      player1, platform1, player2, platform2, title, mode
    );

    if (result.success) {
      cacheService.set(cacheKey, result);
    }

    res.json({ ...result, cached: false });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// CACHE MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /cache/stats
 * Get cache statistics
 */
app.get('/cache/stats', (req, res) => {
  res.json(cacheService.getStats());
});

/**
 * DELETE /cache
 * Clear cache
 */
app.delete('/cache', (req, res) => {
  cacheService.flush();
  res.json({
    success: true,
    message: 'Cache cleared'
  });
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * GET /platforms
 * List supported platforms
 */
app.get('/platforms', (req, res) => {
  res.json({
    platforms: [
      { code: 'xbl', name: 'Xbox Live' },
      { code: 'psn', name: 'PlayStation Network' },
      { code: 'battle', name: 'Battle.net' },
      { code: 'steam', name: 'Steam' },
      { code: 'uno', name: 'Activision' }
    ]
  });
});

/**
 * GET /games
 * List supported games
 */
app.get('/games', (req, res) => {
  res.json({
    games: [
      { code: 'bo4', name: 'Black Ops 4', modes: ['mp', 'blackout', 'zombies'] },
      { code: 'bo3', name: 'Black Ops 3', modes: ['mp', 'zombies'] },
      { code: 'cw', name: 'Black Ops Cold War', modes: ['mp', 'zombies'] },
      { code: 'mw', name: 'Modern Warfare 2019', modes: ['mp', 'wz'] },
      { code: 'mw2', name: 'Modern Warfare 2022', modes: ['mp', 'wz'] },
      { code: 'vg', name: 'Vanguard', modes: ['mp'] },
      { code: 'iw', name: 'Infinite Warfare', modes: ['mp'] },
      { code: 'ww2', name: 'World War 2', modes: ['mp'] }
    ]
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   COD API Wrapper Server Running      ║
║   Port: ${PORT}                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
╚════════════════════════════════════════╝

Available endpoints:
  - POST   /auth/login
  - GET    /auth/status
  - POST   /auth/logout
  - GET    /stats/:platform/:username
  - GET    /stats/:platform/:username/:mode
  - POST   /compare
  - GET    /compare/:platform1/:player1/vs/:platform2/:player2
  - GET    /platforms
  - GET    /games
  - GET    /cache/stats
  - DELETE /cache
  `);
});

module.exports = app;
