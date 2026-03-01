#!/usr/bin/env bash
set -euo pipefail

echo "⛵ Jadran AI — one-command deploy"
echo "Node: $(node -v) | npm: $(npm -v)"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- ENV bootstrap (non-destructive) ---
if [[ ! -f "$ROOT_DIR/server/.env" && -f "$ROOT_DIR/server/.env.example" ]]; then
  cp "$ROOT_DIR/server/.env.example" "$ROOT_DIR/server/.env"
  echo "ℹ️  Created server/.env from example. Please edit it for production secrets (CLAUDE_API_KEY etc.)."
fi

if [[ ! -f "$ROOT_DIR/client/.env" && -f "$ROOT_DIR/client/.env.example" ]]; then
  cp "$ROOT_DIR/client/.env.example" "$ROOT_DIR/client/.env"
  echo "ℹ️  Created client/.env from example. Optional: set VITE_API_BASE_URL if needed."
fi

# --- Install & build client ---
echo "📦 Installing client dependencies..."
cd "$ROOT_DIR/client"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "🏗️  Building client (Vite)..."
npm run build

# --- Install server deps ---
echo "📦 Installing server dependencies..."
cd "$ROOT_DIR/server"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

# --- Start server (serves API + built client) ---
export NODE_ENV=production
export PORT="${PORT:-3001}"

echo "🚀 Starting server on :$PORT"
echo "   Health:  http://localhost:$PORT/health"
echo "   UI:      http://localhost:$PORT/"
node src/index.js
