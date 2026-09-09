import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';

export async function GET() {
  const users = (await kv.get('users')) ?? {};
  const claimed = Object.fromEntries(
    Object.entries(users).map(([username, u]) => [u.owner, username])
  );
  return NextResponse.json({ claimed });
}
