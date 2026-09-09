import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { hashPassword, SESSION_SECONDS } from '@/lib/auth';
import { OWNERS } from '@/lib/league';

export async function POST(req) {
  const { username, password, owner } = await req.json();

  if (!username?.trim() || !password || password.length < 4) {
    return NextResponse.json({ error: 'Pick a username and a password (4+ characters).' }, { status: 400 });
  }
  if (!OWNERS.some((o) => o.name === owner)) {
    return NextResponse.json({ error: 'Not a valid team slot.' }, { status: 400 });
  }

  const users = (await kv.get('users')) ?? {};

  if (users[username]) {
    return NextResponse.json({ error: 'That username is taken.' }, { status: 409 });
  }
  if (Object.values(users).some((u) => u.owner === owner)) {
    return NextResponse.json({ error: `${owner} has already been claimed.` }, { status: 409 });
  }

  users[username] = { passwordHash: hashPassword(password), owner };
  await kv.set('users', users);

  const token = crypto.randomUUID();
  await kv.set(`session:${token}`, { username, owner }, { ex: SESSION_SECONDS });

  const res = NextResponse.json({ username, owner });
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_SECONDS,
    path: '/',
  });
  return res;
}
