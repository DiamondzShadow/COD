# Quick Start Guide - COD API Integration

This guide will help you set up the integration between the PowerShell COD scripts and a web application like cod-bet-arena.

## 📋 Prerequisites

### System Requirements
- **Node.js** v14+ (Download: https://nodejs.org/)
- **PowerShell**:
  - Windows: Built-in PowerShell 5.1+
  - Mac/Linux: Install PowerShell Core 7+ (https://aka.ms/powershell)
- **Activision Account** with valid credentials
- **Git** (optional, for cloning)

### Verify Installations

```bash
# Check Node.js
node --version

# Check PowerShell
pwsh --version  # Mac/Linux
powershell.exe -Command "echo 'test'"  # Windows

# Check npm
npm --version
```

## 🚀 Installation Steps

### Step 1: Navigate to Integration Directory

```bash
cd integration
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- Express (Web server)
- CORS (Cross-origin resource sharing)
- node-cache (Caching layer)
- dotenv (Environment configuration)

### Step 3: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use any text editor
```

Required configuration in `.env`:

```env
PORT=3000
NODE_ENV=development
ACTIVISION_USERNAME=your_email@example.com
ACTIVISION_PASSWORD=your_password
CACHE_TTL=300
SCRIPTS_PATH=../
```

**Important**: Never commit `.env` to version control!

### Step 4: Test PowerShell Access

```bash
# Test if PowerShell scripts are accessible
cd ..
./cod_login.ps1 -Username "test@example.com" -Password (ConvertTo-SecureString "test" -AsPlainText -Force)
cd integration
```

### Step 5: Start the Server

```bash
npm start
```

You should see:

```
╔════════════════════════════════════════╗
║   COD API Wrapper Server Running      ║
║   Port: 3000                          ║
║   Environment: development            ║
╚════════════════════════════════════════╝
```

### Step 6: Test the API

Open another terminal and test:

```bash
# Health check
curl http://localhost:3000/health

# List platforms
curl http://localhost:3000/platforms

# List games
curl http://localhost:3000/games
```

## 🧪 Testing the Integration

### 1. Login to Activision

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_email@example.com","password":"your_password"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully authenticated with Activision"
}
```

### 2. Fetch Player Stats

```bash
curl "http://localhost:3000/stats/xbl/ATE48?title=bo4"
```

### 3. Compare Two Players

```bash
curl -X POST http://localhost:3000/compare \
  -H "Content-Type: application/json" \
  -d '{
    "player1": "Player1",
    "platform1": "xbl",
    "player2": "Player2",
    "platform2": "psn",
    "title": "mw2",
    "mode": "mp"
  }'
```

### 4. Open Demo Frontend

```bash
# Open in browser
open examples/demo-frontend.html
# Or on Windows:
start examples/demo-frontend.html
```

## 🎯 Integration with Cod-Bet-Arena

### Architecture Overview

```
┌─────────────────────┐
│   Cod-Bet-Arena     │  Your Frontend Application
│   (React/Vue/etc)   │  - Betting Interface
│                     │  - Match Tracking
│                     │  - Leaderboards
└──────────┬──────────┘
           │ HTTP/REST API Calls
           ↓
┌─────────────────────┐
│  Integration Layer  │  This Service (Port 3000)
│  (Node.js/Express)  │  - Authentication
│                     │  - Data Formatting
│                     │  - Caching
└──────────┬──────────┘
           │ PowerShell Execution
           ↓
┌─────────────────────┐
│  PowerShell Scripts │  Original COD Scripts
│  (cod_login, etc)   │  - API Calls
│                     │  - Session Management
└──────────┬──────────┘
           │ HTTPS API Calls
           ↓
┌─────────────────────┐
│  Activision COD API │  Official Backend
└─────────────────────┘
```

### Frontend Integration Example

```javascript
// In your React/Vue/etc app
const API_URL = 'http://localhost:3000';

// Fetch player comparison for betting odds
async function getMatchOdds(player1, player2) {
  const response = await fetch(`${API_URL}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player1: player1.username,
      platform1: player1.platform,
      player2: player2.username,
      platform2: player2.platform,
      title: 'mw2',
      mode: 'mp'
    })
  });
  
  return response.json();
}

// Use in your betting component
const odds = await getMatchOdds(
  { username: 'Player1', platform: 'xbl' },
  { username: 'Player2', platform: 'psn' }
);

// Display odds to users
console.log(`Player 1 K/D: ${odds.player1.stats.kdRatio}`);
console.log(`Player 2 K/D: ${odds.player2.stats.kdRatio}`);
console.log(`Skill Gap: ${odds.comparison.skillGap}`);
```

## 🔧 Common Issues & Solutions

### Issue 1: PowerShell Not Found

**Error**: `powershell.exe: command not found` or `pwsh: command not found`

**Solution**:
- Windows: PowerShell is built-in, check PATH
- Mac/Linux: Install PowerShell Core:
  ```bash
  brew install --cask powershell  # Mac
  sudo snap install powershell --classic  # Linux
  ```

### Issue 2: Authentication Failed

**Error**: `Can't connect: invalid credentials`

**Solution**:
- Verify your Activision email/password
- Try logging in at https://profile.callofduty.com/
- Check if 2FA is enabled (may need special handling)

### Issue 3: CORS Errors in Browser

**Error**: `CORS policy: No 'Access-Control-Allow-Origin'`

**Solution**:
Already handled by the server! CORS is enabled in `server.js`

### Issue 4: Stats Not Updating

**Solution**:
- Use `?refresh=true` query parameter to bypass cache
- Or clear cache: `curl -X DELETE http://localhost:3000/cache`
- Note: Activision API may have delays (5-10 minutes)

### Issue 5: Rate Limiting

**Error**: API calls being rejected

**Solution**:
- Cache is enabled (5 min default)
- Avoid rapid consecutive calls
- Consider implementing request queuing

## 📱 Production Deployment

### Environment Setup

```env
PORT=3000
NODE_ENV=production
ACTIVISION_USERNAME=your_email@example.com
ACTIVISION_PASSWORD=use_secure_secrets_manager
CACHE_TTL=600
SCRIPTS_PATH=/path/to/cod/scripts/
```

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name cod-api-wrapper

# Enable startup on boot
pm2 startup
pm2 save
```

### Using Docker

```dockerfile
FROM node:18-alpine

# Install PowerShell
RUN apk add --no-cache \
    ca-certificates \
    less \
    ncurses-terminfo-base \
    krb5-libs \
    libgcc \
    libintl \
    libssl1.1 \
    libstdc++ \
    tzdata \
    userspace-rcu \
    zlib \
    icu-libs \
    curl

RUN curl -L https://github.com/PowerShell/PowerShell/releases/download/v7.3.0/powershell-7.3.0-linux-alpine-x64.tar.gz -o /tmp/powershell.tar.gz && \
    mkdir -p /opt/microsoft/powershell/7 && \
    tar zxf /tmp/powershell.tar.gz -C /opt/microsoft/powershell/7 && \
    chmod +x /opt/microsoft/powershell/7/pwsh && \
    ln -s /opt/microsoft/powershell/7/pwsh /usr/bin/pwsh

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### Security Considerations

1. **Never expose to public internet without authentication**
2. **Use environment variables for secrets**
3. **Implement rate limiting** (e.g., express-rate-limit)
4. **Add API key authentication**
5. **Use HTTPS in production**
6. **Validate all inputs**

## 📊 Monitoring & Logs

### View Logs

```bash
# If using PM2
pm2 logs cod-api-wrapper

# If using systemd
journalctl -u cod-api-wrapper -f
```

### Health Checks

```bash
# Add to monitoring system
curl http://localhost:3000/health

# Check cache performance
curl http://localhost:3000/cache/stats
```

## 🎓 Next Steps

1. **Integrate with your frontend** - Use the provided examples
2. **Add custom endpoints** - Extend `server.js` as needed
3. **Implement websockets** - For real-time match updates
4. **Add database** - Store historical data
5. **Enhance caching** - Use Redis for distributed caching
6. **Add analytics** - Track API usage patterns

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [PowerShell Documentation](https://docs.microsoft.com/powershell/)
- [COD API Unofficial Docs](../docs/README.md)
- [Example Usage](./examples/usage-examples.js)
- [Demo Frontend](./examples/demo-frontend.html)

## 🆘 Getting Help

1. Check console logs for errors
2. Verify PowerShell scripts work independently
3. Test API endpoints with curl/Postman
4. Review the example files
5. Check network tab in browser dev tools

---

**Ready to build your COD Bet Arena!** 🎮🎯
