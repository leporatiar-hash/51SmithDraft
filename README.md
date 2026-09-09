# Team Auction

Season standings for a 4-owner NFL team auction league. Each owner drafts 8 teams;
standings are computed from every game those teams play.

No database, no accounts, no admin panel. Rosters are a config file, scores come
from ESPN, standings are derived. After draft night nobody ever writes to it again.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Set it up

Edit **`lib/league.js`** — it's the only file you need to touch.

1. Set `LEAGUE_NAME` and `SEASON` (the 2026 season runs Sept 2026 – Jan 2027).
2. Paste each owner's 8 teams into `OWNERS`, using ESPN nicknames exactly as
   listed in `TEAMS` (`49ers`, `Commanders`, `Buccaneers`, …).
3. Pick `SCORING`:
   - `'diff'` — total point differential across your teams. Recommended: a
     41–10 loss should hurt more than a 1-point loss.
   - `'record'` — combined win percentage. Simpler to explain, less precise.

The page validates the config on load. Misspelled team, same team on two
rosters, uneven roster sizes, or an undrafted team all show up as an error
instead of quietly producing wrong standings.

## Deploy

```bash
git init && git add -A && git commit -m "init"
gh repo create team-auction --private --source=. --push
```

Then import the repo at vercel.com. Framework detection handles the rest —
no environment variables, no database to provision. Free tier is plenty.

To change rosters later, edit `lib/league.js`, commit, push. Vercel redeploys.

## How the scores work

`lib/espn.js` hits ESPN's public scoreboard endpoint:

```
https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week=3
```

**The fetch runs in the browser, deliberately.** ESPN's edge returns 403 for
server-side requests from datacenter IPs — a Next.js server component or a
Vercel cron job gets blocked. But the endpoint sends
`access-control-allow-origin: *`, so a client-side fetch from a real browser
works without any proxy or key. That's why `app/page.jsx` is a client
component and why this deploys as a fully static site.

Only games with `STATUS_FINAL` are counted, so in-progress games never
pollute the standings. Bye weeks need no special handling — differential is
totalled, not averaged.

The endpoint is undocumented. If ESPN ever changes or removes it, everything
lives in `lib/espn.js`; swap in another source and the rest of the app is
unaffected.

## Layout

```
lib/league.js      rosters, season, scoring mode, validation   ← edit this
lib/espn.js        fetching and normalising scores
lib/standings.js   pure functions: games + rosters → standings
app/page.jsx       the single page
app/globals.css    styles
```

`lib/standings.js` has no I/O, so it's the easy place to change scoring rules
(add a weekly-wins bonus, weight divisional games, whatever the group argues
into existence).
