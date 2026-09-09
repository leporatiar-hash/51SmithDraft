// ESPN's team abbreviations, used for their logo CDN. Verified against
// site.api.espn.com/.../nfl/teams — these match TEAMS in league.js exactly.
const ABBR = {
  '49ers': 'sf', Bears: 'chi', Bengals: 'cin', Bills: 'buf', Broncos: 'den',
  Browns: 'cle', Buccaneers: 'tb', Cardinals: 'ari', Chargers: 'lac', Chiefs: 'kc',
  Colts: 'ind', Commanders: 'wsh', Cowboys: 'dal', Dolphins: 'mia', Eagles: 'phi',
  Falcons: 'atl', Giants: 'nyg', Jaguars: 'jax', Jets: 'nyj', Lions: 'det',
  Packers: 'gb', Panthers: 'car', Patriots: 'ne', Raiders: 'lv', Rams: 'lar',
  Ravens: 'bal', Saints: 'no', Seahawks: 'sea', Steelers: 'pit', Texans: 'hou',
  Titans: 'ten', Vikings: 'min',
};

export function logoFor(team) {
  const abbr = ABBR[team];
  return abbr ? `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png` : null;
}
