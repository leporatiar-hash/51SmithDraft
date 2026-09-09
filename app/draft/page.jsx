'use client';

import { useEffect, useRef, useState } from 'react';
import { OWNERS, TEAMS, LEAGUE_NAME } from '@/lib/league';
import { pickerAt, roundOf, availableTeams } from '@/lib/draft';
import { logoFor } from '@/lib/logos';

const colorOf = Object.fromEntries(OWNERS.map((o) => [o.name, o.color]));

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, data: await res.json() };
}

function Logo({ team, size = 22 }) {
  const src = logoFor(team);
  if (!src) return null;
  return <img className="logo" src={src} alt="" width={size} height={size} loading="lazy" />;
}

function pad(n) { return String(n).padStart(2, '0'); }

function toLocalInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function todayAt6pm() {
  const d = new Date();
  d.setHours(18, 0, 0, 0);
  return d;
}

function formatCountdown(ms) {
  if (ms <= 0) return 'starting…';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function DraftPage() {
  const [draft, setDraft] = useState(null);
  const [schedule, setSchedule] = useState(undefined);
  const [now, setNow] = useState(Date.now());
  const [me, setMe] = useState(undefined); // undefined = not checked yet, null = logged out
  const [slots, setSlots] = useState({}); // owner -> { username, teamName }
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signupOwner, setSignupOwner] = useState('');
  const [authError, setAuthError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [scheduleInput, setScheduleInput] = useState('');

  const [editingTeamName, setEditingTeamName] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');

  const pollRef = useRef(null);
  const tickRef = useRef(null);

  const refreshDraft = () => api('/api/draft').then(({ data }) => setDraft(data));
  const refreshSchedule = () => api('/api/schedule').then(({ data }) => setSchedule(data));
  const refreshSlots = () => api('/api/users').then(({ data }) => setSlots(data.slots));

  useEffect(() => {
    refreshDraft();
    refreshSchedule();
    refreshSlots();
    api('/api/me').then(({ data }) => setMe(data.owner || data.admin ? data : null));
    pollRef.current = setInterval(() => { refreshDraft(); refreshSchedule(); refreshSlots(); }, 2000);
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(pollRef.current); clearInterval(tickRef.current); };
  }, []);

  useEffect(() => {
    if (schedule?.startAt && !scheduleInput) setScheduleInput(toLocalInputValue(new Date(schedule.startAt)));
  }, [schedule]);

  if (!draft || me === undefined || schedule === undefined) {
    return (
      <main>
        <h1>{LEAGUE_NAME} Draft</h1>
        <p className="empty">Loading…</p>
      </main>
    );
  }

  const openOwners = OWNERS.filter((o) => !slots[o.name]);
  const nameFor = (owner) => slots[owner]?.teamName || owner;

  const submitAuth = async (e) => {
    e.preventDefault();
    setBusy(true);
    setAuthError('');
    const path = mode === 'login' ? '/api/login' : '/api/signup';
    const body = mode === 'login'
      ? { username, password }
      : { username, password, owner: signupOwner };
    const { ok, data } = await api(path, body);
    setBusy(false);
    if (ok) {
      setMe(data);
      setPassword('');
      refreshSlots();
    } else {
      setAuthError(data.error);
    }
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

  const submitAdminLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setAdminError('');
    const { ok, data } = await api('/api/admin-login', { password: adminPassword });
    setBusy(false);
    if (ok) { setMe(data); setAdminPassword(''); setShowAdminLogin(false); }
    else setAdminError(data.error);
  };

  const setScheduleTo = async (date) => {
    setBusy(true);
    const { data } = await api('/api/schedule', { action: 'set', startAt: date.toISOString() });
    setSchedule(data);
    setBusy(false);
  };

  const pushSchedule = async () => {
    setBusy(true);
    const { data } = await api('/api/schedule', { action: 'push' });
    setSchedule(data);
    setBusy(false);
  };

  const saveTeamName = async (e) => {
    e.preventDefault();
    setBusy(true);
    await api('/api/team-name', { teamName: teamNameInput });
    setBusy(false);
    setEditingTeamName(false);
    refreshSlots();
  };

  const index = draft.picks.length;
  const picker = draft.status === 'in_progress' ? pickerAt(draft.order, index) : null;
  const round = draft.status === 'in_progress' ? roundOf(index, draft.order.length) : null;
  const open = draft.status === 'in_progress' ? availableTeams(draft.picks) : [];
  const myTurn = me && picker === me.owner;
  const countdownMs = schedule.startAt ? new Date(schedule.startAt).getTime() - now : null;

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

      {me?.admin ? (
        <div className="admin">
          <div className="admin-title">Commissioner controls</div>

          <div className="schedule-row">
            {schedule.startAt ? (
              <>Draft starts <strong>{formatWhen(schedule.startAt)}</strong>{' '}
                {countdownMs != null && draft.status === 'not_started' && (
                  <span className="countdown">in {formatCountdown(countdownMs)}</span>
                )}
              </>
            ) : 'No start time set.'}
          </div>

          <div className="admin-actions">
            <button className="btn-sm" disabled={busy} onClick={() => setScheduleTo(todayAt6pm())}>Set 6:00 PM today</button>
            <button className="btn-sm" disabled={busy || !schedule.startAt} onClick={pushSchedule}>+30 min</button>
          </div>
          <div className="admin-actions">
            <input
              type="datetime-local"
              value={scheduleInput}
              onChange={(e) => setScheduleInput(e.target.value)}
            />
            <button
              className="btn-sm"
              disabled={busy || !scheduleInput}
              onClick={() => setScheduleTo(new Date(scheduleInput))}
            >
              Set time
            </button>
          </div>

          <div className="admin-actions">
            {draft.status === 'not_started' && (
              <button className="btn-sm primary" disabled={busy} onClick={() => act('start')}>Start now</button>
            )}
            <button
              className="btn-sm warn"
              disabled={busy}
              onClick={() => { if (confirm('Restart the draft? This clears all picks.')) act('reset'); }}
            >
              Restart draft
            </button>
          </div>
        </div>
      ) : showAdminLogin ? (
        <form className="login" onSubmit={submitAdminLogin}>
          <input
            type="password"
            placeholder="Commissioner password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />
          <button className="btn" disabled={busy} type="submit">Unlock</button>
          <button type="button" className="linklike" onClick={() => setShowAdminLogin(false)}>cancel</button>
          {adminError && <p className="alert">{adminError}</p>}
        </form>
      ) : (
        <button className="linklike" onClick={() => setShowAdminLogin(true)}>Commissioner login</button>
      )}

      {draft.status === 'not_started' && !me?.admin && schedule.startAt && countdownMs != null && (
        <div className="turn">
          <span className="turn-label">Draft starts {formatWhen(schedule.startAt)}</span>
          <span className="turn-name countdown-big">{formatCountdown(countdownMs)}</span>
        </div>
      )}

      {me?.owner ? (
        <div className="whoami">
          <div>
            Logged in as <strong>{me.username}</strong> · playing as{' '}
            <strong style={{ color: colorOf[me.owner] }}>{nameFor(me.owner)}</strong>
            {' · '}
            <button className="linklike" onClick={logout}>log out</button>
          </div>
          {editingTeamName ? (
            <form className="login" onSubmit={saveTeamName} style={{ marginTop: 8 }}>
              <input
                placeholder="Team name"
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                maxLength={40}
              />
              <button className="btn" disabled={busy} type="submit">Save</button>
              <button type="button" className="linklike" onClick={() => setEditingTeamName(false)}>cancel</button>
            </form>
          ) : (
            <button
              className="linklike"
              style={{ marginTop: 4 }}
              onClick={() => { setTeamNameInput(slots[me.owner]?.teamName || ''); setEditingTeamName(true); }}
            >
              {slots[me.owner]?.teamName ? 'change team name' : 'set a team name'}
            </button>
          )}
        </div>
      ) : (
        <div className="authbox">
          <div className="authtabs">
            <button
              className={mode === 'login' ? 'tab active' : 'tab'}
              onClick={() => { setMode('login'); setAuthError(''); }}
            >
              Log in
            </button>
            <button
              className={mode === 'signup' ? 'tab active' : 'tab'}
              disabled={openOwners.length === 0}
              onClick={() => { setMode('signup'); setAuthError(''); setSignupOwner(openOwners[0]?.name ?? ''); }}
            >
              Claim a team
            </button>
          </div>

          <form className="login" onSubmit={submitAuth}>
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            {authError && <p className="alert">{authError}</p>}
            {mode === 'signup' && openOwners.length === 0 && (
              <p className="empty">All 4 team slots have been claimed.</p>
            )}
          </form>
        </div>
      )}

      {draft.status === 'in_progress' && (
        <>
          <div className={myTurn ? 'turn turn-mine' : 'turn'} style={{ borderLeftColor: colorOf[picker] }}>
            <span className="turn-label">{myTurn ? "You're on the clock" : 'On the clock'}</span>
            <span className="turn-name" style={{ color: colorOf[picker] }}>{nameFor(picker)}</span>
          </div>

          {actionError && <p className="alert">{actionError}</p>}

          <h2>Available teams</h2>
          {!myTurn && (
            <p className="empty">
              {me?.owner ? `Waiting for ${nameFor(picker)}'s turn.` : 'Log in to claim a team on your turn.'}
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
                <Logo team={t} size={36} />
                <span>{t}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <h2>Rosters</h2>
      <div className="rosters">
        {OWNERS.map((o) => (
          <div key={o.name} className="roster" style={{ borderLeftColor: o.color }}>
            <h3 style={{ color: o.color }}>
              {nameFor(o.name)}
              {slots[o.name] ? ` · ${slots[o.name].username}` : ''}
            </h3>
            <ul>
              {rosters[o.name].map((t) => (
                <li key={t}>
                  <span className="teamname"><Logo team={t} /> {t}</span>
                </li>
              ))}
              {rosters[o.name].length === 0 && <li className="empty">No picks yet</li>}
            </ul>
          </div>
        ))}
      </div>

      {draft.status === 'complete' && (
        <div className="alert alert-good">
          Draft's done — rosters are live on the <a href="/">season standings page</a>, no copy-paste needed.
        </div>
      )}
    </main>
  );
}
