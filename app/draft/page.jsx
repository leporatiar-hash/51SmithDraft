'use client';

import { useEffect, useRef, useState } from 'react';
import { OWNERS, TEAMS, LEAGUE_NAME } from '@/lib/league';
import { pickerAt, roundOf, availableTeams } from '@/lib/draft';

const colorOf = Object.fromEntries(OWNERS.map((o) => [o.name, o.color]));

async function api(body) {
  const res = await fetch('/api/draft', {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export default function DraftPage() {
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    api().then(setDraft);
    pollRef.current = setInterval(() => api().then(setDraft), 2000);
    return () => clearInterval(pollRef.current);
  }, []);

  if (!draft) {
    return (
      <main>
        <h1>{LEAGUE_NAME} Draft</h1>
        <p className="empty">Loading…</p>
      </main>
    );
  }

  const act = async (body) => {
    setBusy(true);
    const next = await api(body);
    setDraft(next);
    setBusy(false);
  };

  const index = draft.picks.length;
  const picker = draft.status === 'in_progress' ? pickerAt(draft.order, index) : null;
  const round = draft.status === 'in_progress' ? roundOf(index, draft.order.length) : null;
  const open = draft.status === 'in_progress' ? availableTeams(draft.picks) : [];

  const rosters = Object.fromEntries(OWNERS.map((o) => [o.name, []]));
  for (const p of draft.picks) rosters[p.owner]?.push(p.team);

  return (
    <main>
      <header className="head">
        <h1>{LEAGUE_NAME} Draft</h1>
        <p className="sub">
          {draft.status === 'not_started' && 'Snake draft · random pick order · 8 teams each'}
          {draft.status === 'in_progress' && `Round ${round} · Pick ${index + 1} of ${TEAMS.length}`}
          {draft.status === 'complete' && 'Draft complete'}
        </p>
      </header>

      {draft.status === 'not_started' && (
        <button className="btn" disabled={busy} onClick={() => act({ action: 'start' })}>
          Start draft
        </button>
      )}

      {draft.status === 'in_progress' && (
        <>
          <div className="turn" style={{ borderLeftColor: colorOf[picker] }}>
            <span className="turn-label">On the clock</span>
            <span className="turn-name" style={{ color: colorOf[picker] }}>{picker}</span>
          </div>

          <h2>Available teams</h2>
          <div className="teamgrid">
            {open.map((t) => (
              <button
                key={t}
                className="teambtn"
                disabled={busy}
                onClick={() => act({ action: 'claim', team: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </>
      )}

      <h2>Rosters</h2>
      <div className="rosters">
        {OWNERS.map((o) => (
          <div key={o.name} className="roster" style={{ borderLeftColor: o.color }}>
            <h3 style={{ color: o.color }}>{o.name}</h3>
            <ul>
              {rosters[o.name].map((t) => (
                <li key={t}><span>{t}</span></li>
              ))}
              {rosters[o.name].length === 0 && <li className="empty">No picks yet</li>}
            </ul>
          </div>
        ))}
      </div>

      {draft.status === 'complete' && (
        <>
          <h2>Paste into lib/league.js</h2>
          <pre className="code">
{OWNERS.map((o) => `  {\n    name: '${o.name}',\n    color: '${o.color}',\n    teams: [${rosters[o.name].map((t) => `'${t}'`).join(', ')}],\n  },`).join('\n')}
          </pre>
        </>
      )}

      <footer className="foot">
        <button className="linklike" onClick={() => { if (confirm('Reset the draft? This clears all picks.')) act({ action: 'reset' }); }}>
          Reset draft
        </button>
      </footer>
    </main>
  );
}
