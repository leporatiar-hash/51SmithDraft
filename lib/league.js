// ─────────────────────────────────────────────────────────────
// The only file you need to edit. Fill this in after draft night.
// ─────────────────────────────────────────────────────────────

export const LEAGUE_NAME = 'The League';

// NFL season year. The 2026 season runs Sept 2026 – Jan 2027.
export const SEASON = 2026;

// 'diff'   → ranked by total point differential (recommended)
// 'record' → ranked by combined win percentage
export const SCORING = 'diff';

// Paste your draft results here. Use ESPN nicknames exactly as listed
// in TEAMS below — spelling matters, the app checks it on load.
export const OWNERS = [
  {
    name: 'Owner 1',
    color: '#0F6B66',
    teams: ['Seahawks', 'Bills', 'Ravens', 'Panthers', 'Giants', 'Jets', 'Cardinals', 'Titans'],
  },
  {
    name: 'Owner 2',
    color: '#D97706',
    teams: ['Chiefs', 'Eagles', 'Lions', 'Browns', 'Raiders', 'Saints', 'Bears', 'Colts'],
  },
  {
    name: 'Owner 3',
    color: '#B91C1C',
    teams: ['49ers', 'Packers', 'Bengals', 'Texans', 'Dolphins', 'Falcons', 'Jaguars', 'Patriots'],
  },
  {
    name: 'Owner 4',
    color: '#4338CA',
    teams: ['Rams', 'Cowboys', 'Vikings', 'Chargers', 'Broncos', 'Buccaneers', 'Steelers', 'Commanders'],
  },
];

export const TEAMS = [
  '49ers', 'Bears', 'Bengals', 'Bills', 'Broncos', 'Browns', 'Buccaneers', 'Cardinals',
  'Chargers', 'Chiefs', 'Colts', 'Commanders', 'Cowboys', 'Dolphins', 'Eagles', 'Falcons',
  'Giants', 'Jaguars', 'Jets', 'Lions', 'Packers', 'Panthers', 'Patriots', 'Raiders',
  'Rams', 'Ravens', 'Saints', 'Seahawks', 'Steelers', 'Texans', 'Titans', 'Vikings',
];

/** Returns a list of problems with the roster config, or [] if it's clean. */
export function validate() {
  const errors = [];
  const seen = new Map();

  for (const o of OWNERS) {
    for (const t of o.teams) {
      if (!TEAMS.includes(t)) errors.push(`"${t}" (${o.name}) is not a valid team nickname.`);
      if (seen.has(t)) errors.push(`${t} is on both ${seen.get(t)} and ${o.name}.`);
      seen.set(t, o.name);
    }
  }

  const counts = OWNERS.map((o) => o.teams.length);
  if (new Set(counts).size > 1) {
    errors.push(`Uneven rosters: ${OWNERS.map((o) => `${o.name} ${o.teams.length}`).join(', ')}.`);
  }

  const missing = TEAMS.filter((t) => !seen.has(t));
  if (missing.length) errors.push(`Undrafted: ${missing.join(', ')}.`);

  return errors;
}

export function buildOwnerOf(owners) {
  return Object.fromEntries(owners.flatMap((o) => o.teams.map((t) => [t, o])));
}

/** team nickname → owner object, for the static (pre-draft) config */
export const ownerOf = buildOwnerOf(OWNERS);
