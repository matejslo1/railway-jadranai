# One-command deploy (VPS)

After unzipping this project on your server, run:

```bash
bash deploy.sh
```

It will:
- create `server/.env` and `client/.env` from examples (if missing)
- `npm ci` in `client/` and build the UI
- `npm ci` in `server/`
- start the server (serves `/api/*` and the built UI)

## Notes
- Edit `server/.env` and set `CLAUDE_API_KEY` for AI features.
- If you run behind a reverse proxy (nginx), keep `PORT` internal and proxy to it.
