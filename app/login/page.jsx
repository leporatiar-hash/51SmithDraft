'use client';

import { useEffect, useState } from 'react';
import { OWNERS, LEAGUE_NAME } from '@/lib/league';

async function api(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.json() };
}

export default function LoginPage() {
  const [checked, setChecked] = useState(false);
  const [claimed, setClaimed] = useState({});
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signupOwner, setSignupOwner] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((me) => {
      if (me.owner) { window.location.href = '/draft'; return; }
      setChecked(true);
    });
    fetch('/api/users').then((r) => r.json()).then(({ slots }) => setClaimed(slots ?? {}));
  }, []);

  if (!checked) {
    return (
      <main>
        <h1>{LEAGUE_NAME}</h1>
        <p className="empty">Loading…</p>
      </main>
    );
  }

  const openOwners = OWNERS.filter((o) => !claimed[o.name]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const path = mode === 'login' ? '/api/login' : '/api/signup';
    const body = mode === 'login'
      ? { username, password }
      : { username, password, owner: signupOwner };
    const { ok, data } = await api(path, body);
    if (ok) {
      window.location.href = '/draft';
      return;
    }
    setBusy(false);
    setError(data.error);
  };

  return (
    <main>
      <header className="head">
        <h1>{LEAGUE_NAME}</h1>
        <p className="sub">Draft night</p>
      </header>

      <div className="authbox">
        <div className="authtabs">
          <button
            className={mode === 'login' ? 'tab active' : 'tab'}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Log in
          </button>
          <button
            className={mode === 'signup' ? 'tab active' : 'tab'}
            disabled={openOwners.length === 0}
            onClick={() => { setMode('signup'); setError(''); setSignupOwner(openOwners[0]?.name ?? ''); }}
          >
            Claim a team
          </button>
        </div>

        <form className="login" onSubmit={submit}>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'signup' && (
            <select value={signupOwner} onChange={(e) => setSignupOwner(e.target.value)}>
              {openOwners.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
            </select>
          )}
          <button className="btn" disabled={busy} type="submit">
            {mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
          {error && <p className="alert">{error}</p>}
          {mode === 'signup' && openOwners.length === 0 && (
            <p className="empty">All 4 team slots have been claimed.</p>
          )}
        </form>
      </div>
    </main>
  );
}
