import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { newDraft, startDraft, pickerAt, availableTeams, maybeAutoStart } from '@/lib/draft';
import { TEAMS } from '@/lib/league';

const KEY = 'draft';

async function loadDraft() {
  const draft = (await kv.get(KEY)) ?? newDraft();
  const schedule = (await kv.get('schedule')) ?? null;
  const advanced = maybeAutoStart(draft, schedule);
  if (advanced !== draft) await kv.set(KEY, advanced);
  return advanced;
}

export async function GET() {
  const draft = await loadDraft();
  return NextResponse.json(draft);
}

export async function POST(req) {
  const { action, team } = await req.json();
  const draft = await loadDraft();

  const token = req.cookies.get('session')?.value;
  const session = token ? await kv.get(`session:${token}`) : null;

  if (action === 'start') {
    if (!session?.admin) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 });
    const next = startDraft();
    await kv.set(KEY, next);
    return NextResponse.json(next);
  }

  if (action === 'reset') {
    if (!session?.admin) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 });
    const next = newDraft();
    await kv.set(KEY, next);
    return NextResponse.json(next);
  }

  if (action === 'claim') {
    if (!session?.owner) return NextResponse.json({ error: 'Log in first' }, { status: 401 });

    if (draft.status !== 'in_progress' || !availableTeams(draft.picks).includes(team)) {
      return NextResponse.json(draft);
    }

    const index = draft.picks.length;
    const owner = pickerAt(draft.order, index);
    if (session.owner !== owner) {
      return NextResponse.json({ error: `It's ${owner}'s turn, not yours` }, { status: 403 });
    }

    const picks = [...draft.picks, { team, owner, pick: index + 1 }];
    const next = {
      ...draft,
      picks,
      status: picks.length === TEAMS.length ? 'complete' : 'in_progress',
    };
    await kv.set(KEY, next);
    return NextResponse.json(next);
  }

  return NextResponse.json(draft);
}
