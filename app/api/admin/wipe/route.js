import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { newDraft } from '@/lib/draft';
import { getSession } from '@/lib/session';

export async function POST(req) {
  const session = await getSession(req);
  if (!session?.admin) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 });

  await kv.set('draft', newDraft());
  await kv.set('users', {});
  await kv.set('schedule', { startAt: null });
  await kv.set('auth-version', Date.now()); // logs everyone out, including this session

  return NextResponse.json({ ok: true });
}
