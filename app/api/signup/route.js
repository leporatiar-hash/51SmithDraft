import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { hashPassword } from '@/lib/auth';
import { writeSession, setSessionCookie } from '@/lib/session';
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

  users[username] = { passwordHash: hashPassword(password), owner, teamName: null };
  await kv.set('users', users);

  const { session, token } = await writeSession(req, { username, owner });
  const res = NextResponse.json(session);
  setSessionCookie(res, token);
  return res;
}
