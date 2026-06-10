# Trailing After 8 — The Late-Inning Ledger

An interactive scoreboard tracking every MLB team's record **when trailing after eight innings**, refreshed live throughout the season. Born from one stat: the 2026 Red Sox started 0–35 when losing after 8.

## What it shows

- League-wide record when trailing after 8 (spoiler: it's grim)
- All 30 clubs, sortable by games, wins, losses, and win percentage
- Three perspectives: **trailing**, **tied**, or **leading** after 8
- Per-team game logs — every qualifying game with the score after 8, the final, extra-inning markers, and MLB Gameday links
- Biggest escape of the season, most comeback wins, and the longest-suffering club

## How the data works

- Source: the public [MLB Stats API](https://statsapi.mlb.com) — inning-by-inning linescores for every regular-season game
- "After 8" means eight full innings of a nine-inning game; rain-shortened games are excluded, suspended games are de-duplicated
- The current season is resolved automatically (falls back to the previous season during the offseason), so the site keeps working in 2027 and beyond
- Computed standings are cached server-side for 30 minutes (`unstable_cache` with the `mlb-data` tag)
- The **Refresh** button re-pulls from the MLB API on demand (`POST /api/comebacks`); the page also revalidates in the background every 30 minutes and refetches when the tab regains focus

## Development

```bash
npm install
npm run dev
```

- `lib/mlb.ts` — fetching, season resolution, and the trailing/tied/leading computation
- `lib/teams.ts` — static team metadata (names, leagues, divisions, colors)
- `app/api/comebacks/route.ts` — JSON API (GET cached, POST force-refresh)
- `components/Dashboard.tsx` — the interactive scoreboard UI

Not affiliated with MLB.
