# ⛵ Jadran AI — Adriatic Voyage Planner

AI-powered sailing trip planner with live weather, curated anchorages & local restaurant picks across 1,200+ Croatian islands.

## Quick Start

```bash
# Server
cd server && cp .env.example .env && npm install && npm run dev

# Client (new terminal)
cd client && npm install && npm run dev
```

Add your `CLAUDE_API_KEY` to `server/.env`

## Deploy to Railway

1. Railway → New Service → GitHub repo
2. Root Directory: `server`
3. Add variable: `CLAUDE_API_KEY=your-key`
