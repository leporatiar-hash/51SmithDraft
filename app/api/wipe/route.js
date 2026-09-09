import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { newDraft } from '@/lib/draft';

// No auth gate on purpose: this is the recovery path when every team slot
// is already claimed by stale accounts and no one can log in to reset it
// any other way. Low-stakes private link, four friends — the friction of
// a password here caused more real problems than it prevented.
export async function POST() {
  await kv.set('draft', newDraft());
  await kv.set('users', {});
  await kv.set('schedule', { startAt: null });
  await kv.set('auth-version', Date.now()); // logs everyone out

  return NextResponse.json({ ok: true });
}
