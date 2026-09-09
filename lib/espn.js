import { SEASON } from './league';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

// Fetched from the browser on purpose. ESPN's edge blocks server-side
// requests (403 on datacenter IPs / non-browser clients), but sends
// `access-control-allow-origin: *`, so a client fetch works everywhere.

async function scoreboard(params) {
  const res = await fetch(`${BASE}?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error(`ESPN responded ${res.status}`);
  return res.json();
}

export async function currentWeek() {
  const data = await scoreboard({ seasontype: 2 });
  return data?.week?.number ?? 1;
}

/** Finished games for one week → [{ week, home, homeScore, away, awayScore }] */
export async function weekGames(week) {
  const data = await scoreboard({ dates: SEASON, seasontype: 2, week });

  return (data.events ?? []).flatMap((event) => {
    const game = event.competitions?.[0];
    if (game?.status?.type?.name !== 'STATUS_FINAL') return [];

    const home = game.competitors.find((c) => c.homeAway === 'home');
    const away = game.competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) return [];

    return [{
      week,
      home: home.team.name,
      homeScore: Number(home.score),
      away: away.team.name,
      awayScore: Number(away.score),
    }];
  });
}

/** Every finished game from week 1 through `through`. */
export async function gamesThrough(through) {
  const weeks = Array.from({ length: through }, (_, i) => i + 1);
  const results = await Promise.all(weeks.map((w) => weekGames(w).catch(() => [])));
  return results.flat();
}
