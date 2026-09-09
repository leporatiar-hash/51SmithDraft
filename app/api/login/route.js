import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';

const SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function POST(req) {
  const { name, password } = await req.json();
  const creds = JSON.parse(process.env.OWNER_PASSWORDS || '{}');

  if (!creds[name] || creds[name] !== password) {
    return NextResponse.json({ error: 'Wrong name or password' }, { status: 401 });
  }

  const token = crypto.randomUUID();
  await kv.set(`session:${token}`, name, { ex: SESSION_SECONDS });

  const res = NextResponse.json({ name });
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_SECONDS,
    path: '/',
  });
  return res;
}
