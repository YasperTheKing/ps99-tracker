# PS99 Titanic Hatch-Rate Bot

A Discord bot that tracks the **global** hatch rate of Titanic pets in Pet
Simulator 99 (Roblox), using BIG Games' official public API
(`ps99.biggamesapi.io`).

## How it works

There's no live "hatch event" or in-game-chat feed exposed by the public
API — only a snapshot endpoint (`/api/exists`) that reports how many of
each pet currently exist. This bot polls that endpoint on an interval,
diffs the Titanic pet counts against earlier snapshots, and extrapolates
a hatches-per-hour rate. It's an estimate, not an exact event log — counts
can occasionally dip slightly (trades/deletions), which the bot clamps to
zero rather than showing negative rates.

## Setup

1. **Create a Discord application & bot**
   - Go to https://discord.com/developers/applications → New Application
   - Bot tab → Reset Token, copy it
   - OAuth2 → URL Generator → check `bot` and `applications.commands` scopes,
     `Send Messages` + `Embed Links` permissions → use the generated URL to
     invite the bot to your server

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Fill in `DISCORD_TOKEN` and `CLIENT_ID` (both from the Developer Portal).
   Set `GUILD_ID` to your server's ID for instant command registration while
   testing (leave blank for global commands, which take up to ~1hr to appear).

4. **Register the slash commands**
   ```bash
   npm run deploy-commands
   ```

5. **Run the bot**
   ```bash
   npm start
   ```

## Commands

- `/hatchrate [window]` — current global Titanics/hour, optionally averaged
  over a custom window (5–180 minutes, default 60), with a breakdown of the
  fastest-moving Titanic pets.
- `/titanics` — current total in-game count of every Titanic pet.

## Optional: hourly auto-post

Set `ANNOUNCE_CHANNEL_ID` in `.env` to a channel ID and the bot will post an
hourly hatch-rate summary there automatically, on top of the hour.

## Notes

- `POLL_INTERVAL_MINUTES` (default 2) controls how often the bot hits the
  API. The API itself caches responses for 60s, so there's no benefit to
  polling faster than that.
- Snapshot history is persisted to `data/snapshots.json` so the rate
  calculation survives a bot restart. It keeps a rolling 3 hours of data.
- Titanic pet names are re-fetched from `/api/collection/Pets` on every
  poll, so new Titanic pets added in game updates show up automatically.
