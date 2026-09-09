import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { hashPassword, SESSION_SECONDS } from '@/lib/auth';

export async function POST(req) {
  const { username, password } = await req.json();
  const users = (await kv.get('users')) ?? {};
  const rec = users[username];

  if (!rec || rec.passwordHash !== hashPassword(password)) {
    return NextResponse.json({ error: 'Wrong username or password' }, { status: 401 });
  }

  const token = crypto.randomUUID();
  await kv.set(`session:${token}`, { username, owner: rec.owner }, { ex: SESSION_SECONDS });

  const res = NextResponse.json({ username, owner: rec.owner });
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_SECONDS,
    path: '/',
  });
  return res;
}
