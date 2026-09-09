import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(req) {
  const session = await getSession(req);
  return NextResponse.json(session ?? { username: null, owner: null });
}
