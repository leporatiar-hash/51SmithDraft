import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';

export async function POST(req) {
  const { teamName } = await req.json();
  const token = req.cookies.get('session')?.value;
  const session = token ? await kv.get(`session:${token}`) : null;
  if (!session?.username) return NextResponse.json({ error: 'Log in first' }, { status: 401 });

  const users = (await kv.get('users')) ?? {};
  if (!users[session.username]) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const trimmed = (teamName ?? '').trim().slice(0, 40);
  users[session.username].teamName = trimmed || null;
  await kv.set('users', users);

  return NextResponse.json({ teamName: users[session.username].teamName });
}
