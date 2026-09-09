import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { hashPassword } from '@/lib/auth';
import { writeSession, setSessionCookie } from '@/lib/session';

export async function POST(req) {
  const { username, password } = await req.json();
  const users = (await kv.get('users')) ?? {};
  const rec = users[username];

  if (!rec || rec.passwordHash !== hashPassword(password)) {
    return NextResponse.json({ error: 'Wrong username or password' }, { status: 401 });
  }

  const { session, token } = await writeSession(req, { username, owner: rec.owner });
  const res = NextResponse.json(session);
  setSessionCookie(res, token);
  return res;
}
