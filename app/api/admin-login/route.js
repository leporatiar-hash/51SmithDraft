import { NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/auth';
import { writeSession, setSessionCookie } from '@/lib/session';

export async function POST(req) {
  const { password } = await req.json();
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Wrong commissioner password' }, { status: 401 });
  }

  const { session, token } = await writeSession(req, { admin: true });
  const res = NextResponse.json(session);
  setSessionCookie(res, token);
  return res;
}
