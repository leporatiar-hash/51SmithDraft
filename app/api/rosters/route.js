import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { OWNERS } from '@/lib/league';

export async function GET() {
  const draft = await kv.get('draft');

  if (draft?.status !== 'complete') {
    return NextResponse.json({ owners: OWNERS, source: 'static' });
  }

  const users = (await kv.get('users')) ?? {};
  const nameFor = {};
  for (const u of Object.values(users)) nameFor[u.owner] = u.teamName || u.owner;

  const picksByOwner = Object.fromEntries(OWNERS.map((o) => [o.name, []]));
  for (const p of draft.picks) picksByOwner[p.owner]?.push(p.team);

  const owners = OWNERS.map((o) => ({
    name: nameFor[o.name] || o.name,
    color: o.color,
    teams: picksByOwner[o.name],
  }));

  return NextResponse.json({ owners, source: 'draft' });
}
