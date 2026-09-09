import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { checkAdminPassword, SESSION_SECONDS } from '@/lib/auth';

export async function POST(req) {
  const { password } = await req.json();
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Wrong commissioner password' }, { status: 401 });
  }

  const existingToken = req.cookies.get('session')?.value;
  const existing = existingToken ? await kv.get(`session:${existingToken}`) : null;
  const token = existingToken || crypto.randomUUID();
  const session = { ...(existing ?? {}), admin: true };
  await kv.set(`session:${token}`, session, { ex: SESSION_SECONDS });

  const res = NextResponse.json(session);
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_SECONDS,
    path: '/',
  });
  return res;
}
