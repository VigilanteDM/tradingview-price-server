# TradingView to Airtable via n8n

## Goal
Fetch daily close prices for 19 LSE ETFs from TradingView and update Airtable multiple times per day.

## Architecture
```
TradingView API ← Price Server (localhost:3456) ← n8n → Airtable
```

## Quick Start
1. Start the price server: `node scripts/price-server.js`
2. Import `n8n/workflow.json` into n8n
3. Add your Airtable credentials in n8n
4. Activate the workflow

## File Structure
```
/
├── claude.md              # This file
├── etf-list.json          # 19 ETF symbols (from Airtable)
├── package.json           # Node.js dependencies
├── n8n/
│   └── workflow.json      # Import this into n8n
└── scripts/
    ├── price-server.js    # HTTP server for TradingView prices
    ├── test-tradingview.js
    ├── test-lse-etf.js
    └── fetch-etf-list.js
```

## Price Server API
Run: `node scripts/price-server.js`

| Endpoint | Description |
|----------|-------------|
| `GET /price?symbol=LSE:ISPY` | Single ETF price |
| `GET /prices?symbols=LSE:ISPY,LSE:SMGB` | Multiple prices |
| `GET /health` | Health check |

## Airtable Config
- **Base ID:** appKm59Y0VssE73u7
- **Table:** ETF
- **Price Field:** `Price (TradingView)`
- **Symbol Field:** `Ticker`

## n8n Workflow
1. **Schedule Trigger** - Every 4 hours (adjustable)
2. **Get ETFs from Airtable** - Fetches all ETF records
3. **Loop Over ETFs** - Process one at a time
4. **Fetch Price** - HTTP request to price server
5. **Update Airtable** - Write price back to record

## Deployment Notes
- Price server must run on same machine as n8n (or update URL)
- Consider using PM2 or systemd to keep price server running
- TradingView API is unofficial - may break without notice
