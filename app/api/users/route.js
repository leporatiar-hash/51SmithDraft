import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';

export async function GET() {
  const users = (await kv.get('users')) ?? {};
  const slots = {};
  for (const [username, u] of Object.entries(users)) {
    slots[u.owner] = { username, teamName: u.teamName ?? null };
  }
  return NextResponse.json({ slots });
}
