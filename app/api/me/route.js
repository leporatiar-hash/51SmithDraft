import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';

export async function GET(req) {
  const token = req.cookies.get('session')?.value;
  const session = token ? await kv.get(`session:${token}`) : null;
  return NextResponse.json(session ?? { username: null, owner: null, admin: false });
}
