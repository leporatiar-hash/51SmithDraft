import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { getSession } from '@/lib/session';

const KEY = 'schedule';

export async function GET() {
  const schedule = (await kv.get(KEY)) ?? { startAt: null };
  return NextResponse.json(schedule);
}

export async function POST(req) {
  const session = await getSession(req);
  if (!session?.admin) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 });

  const { action, startAt } = await req.json();
  const current = (await kv.get(KEY)) ?? { startAt: null };

  let next;
  if (action === 'set') {
    const t = new Date(startAt).getTime();
    if (!startAt || Number.isNaN(t)) {
      return NextResponse.json({ error: 'Invalid time' }, { status: 400 });
    }
    next = { startAt: new Date(t).toISOString() };
  } else if (action === 'push') {
    const base = current.startAt ? new Date(current.startAt).getTime() : Date.now();
    next = { startAt: new Date(base + 30 * 60 * 1000).toISOString() };
  } else if (action === 'clear') {
    next = { startAt: null };
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  await kv.set(KEY, next);
  return NextResponse.json(next);
}
