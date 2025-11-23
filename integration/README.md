# COD API Wrapper - Integration Layer

Node.js/Express REST API wrapper for PowerShell Call of Duty API scripts. This service provides a clean HTTP interface for fetching COD player stats, perfect for integration with web applications like **cod-bet-arena**.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v14 or higher)
- **PowerShell** (Windows) or **PowerShell Core** (Linux/Mac)
- Activision account

### Installation

1. Install dependencies:
```bash
cd integration
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Start the server:
```bash
npm start
```

The API will be available at `http://localhost:3000`

## 📡 API Endpoints

### Authentication

#### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "username": "your_email@example.com",
  "password": "your_password"
}
```

#### Check Auth Status
```bash
GET /auth/status
```

#### Logout
```bash
POST /auth/logout
```

### Player Stats

#### Get Player Stats (All Modes)
```bash
GET /stats/:platform/:username?title=cw&refresh=false

# Example
GET /stats/xbl/ATE48?title=bo4
```

#### Get Player Stats (Specific Mode)
```bash
GET /stats/:platform/:username/:mode?title=cw

# Example
GET /stats/xbl/ATE48/mp?title=cw
```

**Supported Platforms:**
- `xbl` - Xbox Live
- `psn` - PlayStation Network
- `battle` - Battle.net
- `steam` - Steam
- `uno` - Activision

**Supported Games:**
- `bo4` - Black Ops 4
- `cw` - Cold War
- `mw` - Modern Warfare 2019
- `mw2` - Modern Warfare 2022
- `bo3` - Black Ops 3
- `vg` - Vanguard
- `iw` - Infinite Warfare
- `ww2` - World War 2

**Game Modes:**
- `mp` - Multiplayer
- `zombies` - Zombies
- `blackout` - Blackout (BO4)
- `wz` - Warzone (MW/MW2)

### Player Comparison

#### Compare Two Players (POST)
```bash
POST /compare
Content-Type: application/json

{
  "player1": "ATE48",
  "platform1": "xbl",
  "player2": "PlayerTwo",
  "platform2": "psn",
  "title": "cw",
  "mode": "mp"
}
```

#### Compare Two Players (GET)
```bash
GET /compare/:platform1/:player1/vs/:platform2/:player2?title=cw&mode=mp

# Example
GET /compare/xbl/ATE48/vs/psn/PlayerTwo?title=cw&mode=mp
```

**Response includes:**
- Individual player stats
- K/D ratio comparison
- Win/Loss ratio comparison
- Skill gap calculation (0-100 scale)
- Player advantage indicator

### Utility Endpoints

#### List Supported Platforms
```bash
GET /platforms
```

#### List Supported Games
```bash
GET /games
```

#### Cache Statistics
```bash
GET /cache/stats
```

#### Clear Cache
```bash
DELETE /cache
```

#### Health Check
```bash
GET /health
```

## 📊 Response Format

### Player Stats Response
```json
{
  "success": true,
  "player": "ATE48",
  "platform": "xbl",
  "game": "cw",
  "mode": "mp",
  "stats": {
    "level": 100,
    "prestige": 8,
    "kills": 45678,
    "deaths": 34567,
    "kdRatio": 1.32,
    "wins": 1234,
    "losses": 987,
    "wlRatio": 1.25,
    "timePlayed": 3456789,
    "scorePerMinute": 342.5
  },
  "cached": false,
  "timestamp": "2025-11-23T12:00:00.000Z"
}
```

### Player Comparison Response
```json
{
  "success": true,
  "player1": {
    "username": "ATE48",
    "platform": "xbl",
    "stats": { ... }
  },
  "player2": {
    "username": "PlayerTwo",
    "platform": "psn",
    "stats": { ... }
  },
  "comparison": {
    "kdRatioDiff": "0.25",
    "wlRatioDiff": "0.15",
    "levelDiff": 10,
    "player1Advantage": true,
    "skillGap": 12
  },
  "mode": "mp",
  "game": "cw",
  "cached": false
}
```

## 🎯 Integration with COD Bet Arena

### Example: Pre-Match Betting Odds

```javascript
// Fetch both players and calculate odds
const response = await fetch('http://localhost:3000/compare', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    player1: 'Challenger1',
    platform1: 'xbl',
    player2: 'Challenger2',
    platform2: 'psn',
    title: 'mw2',
    mode: 'mp'
  })
});

const { comparison, player1, player2 } = await response.json();

// Use stats to calculate betting odds
const odds = calculateOdds(
  player1.stats.kdRatio,
  player2.stats.kdRatio,
  comparison.skillGap
);
```

### Example: Match Result Verification

```javascript
// Before match
const beforeStats = await fetchPlayerStats('Player1', 'xbl', 'mw2');

// After match (wait for stats to update)
setTimeout(async () => {
  const afterStats = await fetchPlayerStats('Player1', 'xbl', 'mw2', true);
  
  // Verify win/loss change
  if (afterStats.stats.wins > beforeStats.stats.wins) {
    console.log('Player1 won!');
    // Process bet payouts
  }
}, 300000); // 5 minutes
```

### Example: Real-time Leaderboard

```javascript
const players = ['Player1', 'Player2', 'Player3'];
const leaderboard = await Promise.all(
  players.map(player => 
    fetch(`http://localhost:3000/stats/xbl/${player}/mp?title=mw2`)
      .then(r => r.json())
  )
);

// Sort by K/D ratio
leaderboard.sort((a, b) => 
  b.stats.kdRatio - a.stats.kdRatio
);
```

## 🔧 Configuration

### Environment Variables (.env)

```env
PORT=3000
NODE_ENV=development
ACTIVISION_USERNAME=your_email@example.com
ACTIVISION_PASSWORD=your_password
CACHE_TTL=300
SCRIPTS_PATH=../
```

### Cache Settings

- Default TTL: 5 minutes (300 seconds)
- Automatically clears on login/logout
- Manual clear via `DELETE /cache`
- Use `?refresh=true` to bypass cache

## 🛠️ Development

```bash
# Install with dev dependencies
npm install

# Run with auto-reload
npm run dev

# Run tests (when implemented)
npm test
```

## 📝 Architecture

```
┌─────────────────┐
│  COD Bet Arena  │  (Frontend/Web App)
│   React/Vue.js  │
└────────┬────────┘
         │ HTTP REST
         ↓
┌─────────────────┐
│  API Wrapper    │  (This Service)
│  Node.js/Express│
│  - Auth Service │
│  - Stats Service│
│  - Cache Layer  │
└────────┬────────┘
         │ PowerShell Execution
         ↓
┌─────────────────┐
│  PowerShell     │  (Original Scripts)
│  COD Scripts    │
│  - cod_login    │
│  - fetch_data   │
└────────┬────────┘
         │ HTTPS API Calls
         ↓
┌─────────────────┐
│  Activision     │
│  COD API        │
└─────────────────┘
```

## 🔒 Security Notes

- Store credentials in `.env` (never commit)
- Use HTTPS in production
- Implement rate limiting for production
- Add authentication tokens for API access
- Validate all user inputs

## 📚 Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message here",
  "message": "Human-readable description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing parameters)
- `401` - Unauthorized (not logged in)
- `404` - Resource not found
- `500` - Internal server error

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues or questions:
- Check existing issues on GitHub
- Review API documentation
- Check PowerShell script logs
- Verify Activision account credentials

---

**Built for integration with cod-bet-arena** 🎮
