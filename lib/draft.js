import { OWNERS, TEAMS } from './league';

const OWNER_NAMES = OWNERS.map((o) => o.name);

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function newDraft() {
  return { status: 'not_started', order: [], picks: [] };
}

export function startDraft() {
  return { status: 'in_progress', order: shuffle(OWNER_NAMES), picks: [] };
}

/** Whose turn is it for the given pick index (0-based), snake order. */
export function pickerAt(order, index) {
  const round = Math.floor(index / order.length);
  const pos = index % order.length;
  const seq = round % 2 === 0 ? order : [...order].reverse();
  return seq[pos];
}

export function roundOf(index, size) {
  return Math.floor(index / size) + 1;
}

export function availableTeams(picks) {
  const taken = new Set(picks.map((p) => p.team));
  return TEAMS.filter((t) => !taken.has(t));
}

/** Auto-starts the draft once the scheduled time has passed. */
export function maybeAutoStart(draft, schedule) {
  if (draft.status === 'not_started' && schedule?.startAt && Date.now() >= new Date(schedule.startAt).getTime()) {
    return startDraft();
  }
  return draft;
}
