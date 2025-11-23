# Integration Architecture Diagram

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          COD BET ARENA                              │
│                     (Your Web Application)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Betting    │  │   Match      │  │  Leaderboard │             │
│  │   Interface  │  │   Tracking   │  │   Display    │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                     │
│         └──────────────────┴──────────────────┘                     │
│                            │                                        │
│                     React/Vue/Vanilla JS                           │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             │ HTTP REST API
                             │ (JSON)
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER (THIS PROJECT)                 │
│                        Node.js + Express                            │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │                    API ENDPOINTS                           │    │
│  │                                                            │    │
│  │  /auth/login      /auth/status      /auth/logout         │    │
│  │  /stats/:platform/:player                                 │    │
│  │  /compare/:p1/vs/:p2                                      │    │
│  │  /platforms       /games            /cache                │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐              │
│  │    Auth     │  │    Stats    │  │    Cache     │              │
│  │   Service   │  │   Service   │  │   Service    │              │
│  │             │  │             │  │              │              │
│  │ • Login     │  │ • Fetch     │  │ • TTL: 5min  │              │
│  │ • Logout    │  │ • Compare   │  │ • Statistics │              │
│  │ • Session   │  │ • Extract   │  │ • Flush      │              │
│  └─────────────┘  └─────────────┘  └──────────────┘              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │           PowerShell Executor Utility                   │      │
│  │                                                          │      │
│  │  • Cross-platform (Windows/Mac/Linux)                  │      │
│  │  • Execute .ps1 scripts                                 │      │
│  │  • Parse JSON output                                    │      │
│  │  • Error handling                                       │      │
│  └─────────────────────────────────────────────────────────┘      │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             │ PowerShell Script Execution
                             │ (shell commands)
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    POWERSHELL COD SCRIPTS                           │
│                      (Original Repository)                          │
│                                                                     │
│  ┌──────────────────┐  ┌────────────────────┐  ┌────────────────┐ │
│  │  cod_login.ps1   │  │ fetch_game_data.ps1│  │ build_sso_     │ │
│  │                  │  │                    │  │ websession.ps1 │ │
│  │ • Register device│  │ • Fetch player data│  │                │ │
│  │ • Authenticate   │  │ • Multiple modes   │  │ • Create       │ │
│  │ • Save tokens    │  │ • Save JSON files  │  │   session      │ │
│  └──────────────────┘  └────────────────────┘  └────────────────┘ │
│                                                                     │
│  ┌──────────────────┐  ┌────────────────────┐  ┌────────────────┐ │
│  │ fetch_icons.ps1  │  │ fetch_items_       │  │ fetch_maps_    │ │
│  │                  │  │ icons.ps1          │  │ icons.ps1      │ │
│  │ • Download icons │  │ • Item images      │  │ • Map images   │ │
│  └──────────────────┘  └────────────────────┘  └────────────────┘ │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             │ HTTPS API Calls
                             │ (REST requests with auth)
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    ACTIVISION COD API                               │
│                 https://my.callofduty.com/                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │  /api/papi-client/stats/cod/v1/title/{title}/          │      │
│  │    platform/{platform}/gamer/{username}/                │      │
│  │    profile/type/{mode}/                                 │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                     │
│  Returns: Player stats, K/D, W/L, Level, Prestige, etc.           │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Examples

### Example 1: Betting Odds Calculation

```
USER                    FRONTEND              API WRAPPER           POWERSHELL           ACTIVISION
  │                        │                       │                    │                     │
  │ Click "Compare"        │                       │                    │                     │
  ├───────────────────────>│                       │                    │                     │
  │                        │ POST /compare         │                    │                     │
  │                        ├──────────────────────>│                    │                     │
  │                        │                       │ Execute fetch_     │                     │
  │                        │                       │ game_data.ps1      │                     │
  │                        │                       ├───────────────────>│                     │
  │                        │                       │                    │ GET /stats/...      │
  │                        │                       │                    ├────────────────────>│
  │                        │                       │                    │ Player 1 JSON       │
  │                        │                       │                    │<────────────────────┤
  │                        │                       │                    │ GET /stats/...      │
  │                        │                       │                    ├────────────────────>│
  │                        │                       │                    │ Player 2 JSON       │
  │                        │                       │                    │<────────────────────┤
  │                        │                       │ JSON Data          │                     │
  │                        │                       │<───────────────────┤                     │
  │                        │                       │ Calculate          │                     │
  │                        │                       │ comparison         │                     │
  │                        │                       │ & cache            │                     │
  │                        │ JSON Response         │                    │                     │
  │                        │<──────────────────────┤                    │                     │
  │ Display Odds           │                       │                    │                     │
  │<───────────────────────┤                       │                    │                     │
  │                        │                       │                    │                     │
```

### Example 2: Match Result Verification

```
USER                    FRONTEND              API WRAPPER           POWERSHELL           ACTIVISION
  │                        │                       │                    │                     │
  │ Match starts           │ Save initial stats    │                    │                     │
  │                        ├──────────────────────>│                    │                     │
  │                        │                       │ [Cache hit]        │                     │
  │                        │<──────────────────────┤                    │                     │
  │                        │                       │                    │                     │
  │ [5 min later]          │                       │                    │                     │
  │                        │ GET /stats?refresh=   │                    │                     │
  │                        │ true                  │                    │                     │
  │                        ├──────────────────────>│                    │                     │
  │                        │                       │ [Bypass cache]     │                     │
  │                        │                       ├───────────────────>│                     │
  │                        │                       │                    ├────────────────────>│
  │                        │                       │                    │ Updated JSON        │
  │                        │                       │                    │<────────────────────┤
  │                        │                       │<───────────────────┤                     │
  │                        │ Updated stats         │                    │                     │
  │                        │<──────────────────────┤                    │                     │
  │ Process payout         │ Compare wins          │                    │                     │
  │<───────────────────────┤                       │                    │                     │
```

## 📊 Component Responsibilities

### Frontend (Cod-Bet-Arena)
- ✓ User interface
- ✓ Betting logic
- ✓ Payment processing
- ✓ Match scheduling
- ✓ Real-time updates
- ✓ User accounts

### Integration Layer (This Project)
- ✓ API gateway
- ✓ Authentication management
- ✓ Data formatting
- ✓ Caching strategy
- ✓ Error handling
- ✓ Rate limiting

### PowerShell Scripts (Original Repo)
- ✓ Activision authentication
- ✓ API communication
- ✓ Session management
- ✓ JSON file generation
- ✓ Asset downloading

### Activision API (External)
- ✓ Player statistics
- ✓ Match history
- ✓ Game data
- ✓ Profile information

## 🎯 Integration Points

### 1. Authentication Flow
```javascript
// Frontend calls
await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
});

// API Wrapper executes
cod_login.ps1 → Activision API → login_data.json → Session created
```

### 2. Stats Retrieval
```javascript
// Frontend calls
await fetch('http://localhost:3000/stats/xbl/Player1?title=mw2');

// API Wrapper executes
fetch_game_data.ps1 → Activision API → JSON files → Parsed → Cached → Returned
```

### 3. Player Comparison
```javascript
// Frontend calls
await fetch('http://localhost:3000/compare', {
  method: 'POST',
  body: JSON.stringify({ player1, platform1, player2, platform2 })
});

// API Wrapper executes
Fetch both → Compare stats → Calculate metrics → Return comparison
```

## 🚀 Deployment Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        PRODUCTION                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐         ┌──────────────┐               │
│  │   Frontend   │         │  API Wrapper │               │
│  │   (Vercel/   │◄───────┤│  (Heroku/    │               │
│  │   Netlify)   │   HTTPS ││   AWS/VPS)   │               │
│  └──────────────┘         │└──────────────┘               │
│       :3001                       :3000                    │
│                                                            │
│  ┌──────────────────────────────────────┐                │
│  │         Load Balancer (optional)     │                │
│  └──────────────────────────────────────┘                │
│                                                            │
│  ┌──────────────┐         ┌──────────────┐               │
│  │    Redis     │         │   Database   │               │
│  │   (Cache)    │         │  (Optional)  │               │
│  └──────────────┘         └──────────────┘               │
└────────────────────────────────────────────────────────────┘
```

## 📈 Scalability Considerations

### Current Setup (Development)
- Single Node.js process
- In-memory cache
- Direct PowerShell execution
- **Handles**: ~10 requests/second

### Recommended Production Setup
- Multiple Node.js instances (PM2 cluster mode)
- Redis for distributed caching
- Queue system for PowerShell jobs (Bull/BeeQueue)
- **Handles**: ~100+ requests/second

### Enterprise Setup
- Kubernetes deployment
- Redis cluster
- Database for historical data
- CDN for static assets
- **Handles**: 1000+ requests/second

---

**This integration provides everything needed to connect your COD betting arena with real Activision player statistics!** 🎮
