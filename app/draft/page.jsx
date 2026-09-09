'use client';

import { useEffect, useRef, useState } from 'react';
import { OWNERS, TEAMS, LEAGUE_NAME } from '@/lib/league';
import { pickerAt, roundOf, availableTeams } from '@/lib/draft';

const colorOf = Object.fromEntries(OWNERS.map((o) => [o.name, o.color]));

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, data: await res.json() };
}

export default function DraftPage() {
  const [draft, setDraft] = useState(null);
  const [me, setMe] = useState(undefined); // undefined = not checked yet, null = logged out
  const [loginName, setLoginName] = useState(OWNERS[0].name);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    api('/api/draft').then(({ data }) => setDraft(data));
    api('/api/me').then(({ data }) => setMe(data.name));
    pollRef.current = setInterval(() => api('/api/draft').then(({ data }) => setDraft(data)), 2000);
    return () => clearInterval(pollRef.current);
  }, []);

  if (!draft || me === undefined) {
    return (
      <main>
        <h1>{LEAGUE_NAME} Draft</h1>
        <p className="empty">Loading…</p>
      </main>
    );
  }

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    setLoginError('');
    const { ok, data } = await api('/api/login', { name: loginName, password });
    setBusy(false);
    if (ok) { setMe(data.name); setPassword(''); }
    else setLoginError(data.error);
  };

  const logout = async () => {
    await api('/api/logout', {});
    setMe(null);
  };

  const claim = async (team) => {
    setBusy(true);
    setActionError('');
    const { ok, data } = await api('/api/draft', { action: 'claim', team });
    setBusy(false);
    if (ok) setDraft(data);
    else setActionError(data.error);
  };

  const act = async (action) => {
    setBusy(true);
    const { data } = await api('/api/draft', { action });
    setDraft(data);
    setBusy(false);
  };

  const index = draft.picks.length;
  const picker = draft.status === 'in_progress' ? pickerAt(draft.order, index) : null;
  const round = draft.status === 'in_progress' ? roundOf(index, draft.order.length) : null;
  const open = draft.status === 'in_progress' ? availableTeams(draft.picks) : [];
  const myTurn = me && picker === me;

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

      {me ? (
        <div className="whoami">
          Logged in as <strong style={{ color: colorOf[me] }}>{me}</strong>
          {' · '}
          <button className="linklike" onClick={logout}>log out</button>
        </div>
      ) : (
        <form className="login" onSubmit={login}>
          <select value={loginName} onChange={(e) => setLoginName(e.target.value)}>
            {OWNERS.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
          </select>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn" disabled={busy} type="submit">Log in</button>
          {loginError && <p className="alert">{loginError}</p>}
        </form>
      )}

      {draft.status === 'not_started' && me && (
        <button className="btn" disabled={busy} onClick={() => act('start')}>
          Start draft
        </button>
      )}

      {draft.status === 'in_progress' && (
        <>
          <div className="turn" style={{ borderLeftColor: colorOf[picker] }}>
            <span className="turn-label">On the clock</span>
            <span className="turn-name" style={{ color: colorOf[picker] }}>{picker}</span>
          </div>

          {actionError && <p className="alert">{actionError}</p>}

          <h2>Available teams</h2>
          {!myTurn && (
            <p className="empty">
              {me ? `Waiting for ${picker}'s turn.` : 'Log in to claim a team on your turn.'}
            </p>
          )}
          <div className="teamgrid">
            {open.map((t) => (
              <button
                key={t}
                className="teambtn"
                disabled={busy || !myTurn}
                onClick={() => claim(t)}
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

      {me && (
        <footer className="foot">
          <button className="linklike" onClick={() => { if (confirm('Reset the draft? This clears all picks.')) act('reset'); }}>
            Reset draft
          </button>
        </footer>
      )}
    </main>
  );
}
