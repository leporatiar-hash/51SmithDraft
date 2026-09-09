import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { getSession } from '@/lib/session';

export async function POST(req) {
  const { teamName } = await req.json();
  const session = await getSession(req);
  if (!session?.username) return NextResponse.json({ error: 'Log in first' }, { status: 401 });

  const users = (await kv.get('users')) ?? {};
  if (!users[session.username]) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const trimmed = (teamName ?? '').trim().slice(0, 40);
  users[session.username].teamName = trimmed || null;
  await kv.set('users', users);

  return NextResponse.json({ teamName: users[session.username].teamName });
}
