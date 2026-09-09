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

function formatWhen(iso) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function splitCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export default function DraftPage() {
  const [draft, setDraft] = useState(null);
  const [schedule, setSchedule] = useState(undefined);
  const [now, setNow] = useState(Date.now());
  const [me, setMe] = useState(undefined); // undefined = not checked, null = not an owner
  const [slots, setSlots] = useState({});
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');

  const pollRef = useRef(null);
  const tickRef = useRef(null);

  const refreshDraft = () => api('/api/draft').then(({ data }) => setDraft(data));
  const refreshSchedule = () => api('/api/schedule').then(({ data }) => setSchedule(data));
  const refreshSlots = () => api('/api/users').then(({ data }) => setSlots(data.slots));

  useEffect(() => {
    api('/api/me').then(({ data }) => {
      if (!data.owner) { window.location.href = '/login'; return; }
      setMe(data);
    });
    refreshDraft();
    refreshSchedule();
    refreshSlots();
    pollRef.current = setInterval(() => { refreshDraft(); refreshSchedule(); refreshSlots(); }, 2000);
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(pollRef.current); clearInterval(tickRef.current); };
  }, []);

  if (!draft || me === undefined || me === null || schedule === undefined) {
    return (
      <main>
        <h1>{LEAGUE_NAME} Draft</h1>
        <p className="empty">Loading…</p>
      </main>
    );
  }

  const nameFor = (owner) => slots[owner]?.teamName || owner;

  const logout = async () => {
    await api('/api/logout', {});
    window.location.href = '/login';
  };

  const claim = async (team) => {
    setBusy(true);
    setActionError('');
    const { ok, data } = await api('/api/draft', { action: 'claim', team });
    setBusy(false);
    if (ok) setDraft(data);
    else setActionError(data.error);
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
  const joinedCount = Object.keys(slots).length;

  const rosters = Object.fromEntries(OWNERS.map((o) => [o.name, []]));
  for (const p of draft.picks) rosters[p.owner]?.push(p.team);

  const whoami = (
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
            autoFocus
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
  );

  if (draft.status === 'not_started') {
    const c = countdownMs != null ? splitCountdown(countdownMs) : null;
    return (
      <main>
        <header className="head">
          <h1>{LEAGUE_NAME} Draft</h1>
        </header>

        {whoami}

        <div className="hero">
          {c ? (
            <>
              <div className="hero-label">Draft starts {formatWhen(schedule.startAt)}</div>
              <div className="hero-clock">
                <div className="hero-unit"><span className="hero-digit">{c.h}</span><span className="hero-unit-label">hrs</span></div>
                <span className="hero-colon">:</span>
                <div className="hero-unit"><span className="hero-digit">{pad(c.m)}</span><span className="hero-unit-label">min</span></div>
                <span className="hero-colon">:</span>
                <div className="hero-unit"><span className="hero-digit">{pad(c.s)}</span><span className="hero-unit-label">sec</span></div>
              </div>
            </>
          ) : (
            <div className="hero-label">Waiting for the commissioner to set a start time</div>
          )}
          <div className="hero-sub">{joinedCount} of 4 teams joined</div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <header className="head">
        <h1>{LEAGUE_NAME} Draft</h1>
        <p className="sub">
          {draft.status === 'in_progress' && `Round ${round} · Pick ${index + 1} of ${TEAMS.length}`}
          {draft.status === 'complete' && 'Draft complete'}
        </p>
      </header>

      {whoami}

      {draft.status === 'in_progress' && (
        <>
          <div className={myTurn ? 'turn turn-mine' : 'turn'} style={{ borderLeftColor: colorOf[picker] }}>
            <span className="turn-label">{myTurn ? "You're on the clock" : 'On the clock'}</span>
            <span className="turn-name" style={{ color: colorOf[picker] }}>{nameFor(picker)}</span>
          </div>

          {actionError && <p className="alert">{actionError}</p>}

          <h2>Available teams</h2>
          {!myTurn && <p className="empty">Waiting for {nameFor(picker)}'s turn.</p>}
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
