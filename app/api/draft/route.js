import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { newDraft, startDraft, pickerAt, availableTeams } from '@/lib/draft';
import { TEAMS } from '@/lib/league';

const KEY = 'draft';

export async function GET() {
  const draft = (await kv.get(KEY)) ?? newDraft();
  return NextResponse.json(draft);
}

export async function POST(req) {
  const { action, team } = await req.json();
  let draft = (await kv.get(KEY)) ?? newDraft();

  if (action === 'start') {
    draft = startDraft();
  } else if (action === 'reset') {
    draft = newDraft();
  } else if (action === 'claim') {
    if (draft.status === 'in_progress' && availableTeams(draft.picks).includes(team)) {
      const index = draft.picks.length;
      const owner = pickerAt(draft.order, index);
      const picks = [...draft.picks, { team, owner, pick: index + 1 }];
      draft = {
        ...draft,
        picks,
        status: picks.length === TEAMS.length ? 'complete' : 'in_progress',
      };
    }
  }

  await kv.set(KEY, draft);
  return NextResponse.json(draft);
}
