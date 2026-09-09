import { OWNERS, SCORING, ownerOf } from './league';

/**
 * Turn a flat list of finished games into owner standings.
 * Each game credits both teams' owners, so a game between two owned
 * teams counts once for each side.
 */
export function standings(games) {
  const table = new Map(
    OWNERS.map((o) => [
      o.name,
      { owner: o, wins: 0, losses: 0, ties: 0, diff: 0, played: 0, teams: {} },
    ])
  );

  for (const g of games) {
    const sides = [
      [g.home, g.homeScore, g.awayScore],
      [g.away, g.awayScore, g.homeScore],
    ];

    for (const [team, scored, allowed] of sides) {
      const owner = ownerOf[team];
      if (!owner) continue;

      const row = table.get(owner.name);
      const margin = scored - allowed;

      row.diff += margin;
      row.played += 1;
      if (margin > 0) row.wins += 1;
      else if (margin < 0) row.losses += 1;
      else row.ties += 1;

      const t = (row.teams[team] ??= { wins: 0, losses: 0, ties: 0, diff: 0 });
      t.diff += margin;
      if (margin > 0) t.wins += 1;
      else if (margin < 0) t.losses += 1;
      else t.ties += 1;
    }
  }

  const rows = [...table.values()];
  const winPct = (r) => (r.played ? (r.wins + r.ties / 2) / r.played : 0);

  return rows.sort((a, b) =>
    SCORING === 'record'
      ? winPct(b) - winPct(a) || b.diff - a.diff
      : b.diff - a.diff || winPct(b) - winPct(a)
  );
}

export function record(r) {
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`;
}

export function signed(n) {
  return n > 0 ? `+${n}` : `${n}`;
}
