'use client';

import { useEffect, useRef, useState } from 'react';
import { LEAGUE_NAME } from '@/lib/league';

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, data: await res.json() };
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

function formatWhen(iso) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AdminPage() {
  const [me, setMe] = useState(undefined);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [draft, setDraft] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [slots, setSlots] = useState({});
  const [scheduleInput, setScheduleInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [wiped, setWiped] = useState(false);
  const pollRef = useRef(null);

  const refresh = () => {
    api('/api/draft').then(({ data }) => setDraft(data));
    api('/api/schedule').then(({ data }) => setSchedule(data));
    api('/api/users').then(({ data }) => setSlots(data.slots));
  };

  useEffect(() => {
    api('/api/me').then(({ data }) => setMe(data.admin ? data : null));
    refresh();
    pollRef.current = setInterval(refresh, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (schedule?.startAt && !scheduleInput) setScheduleInput(toLocalInputValue(new Date(schedule.startAt)));
  }, [schedule]);

  if (me === undefined || !draft || !schedule) {
    return (
      <main>
        <h1>{LEAGUE_NAME}</h1>
        <p className="empty">Loading…</p>
      </main>
    );
  }

  const submitAdminLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setAuthError('');
    const { ok, data } = await api('/api/admin-login', { password });
    setBusy(false);
    if (ok) { setMe(data); setPassword(''); }
    else setAuthError(data.error);
  };

  if (!me) {
    return (
      <main>
        <header className="head">
          <h1>{LEAGUE_NAME}</h1>
          <p className="sub">Commissioner</p>
        </header>
        <form className="login" onSubmit={submitAdminLogin}>
          <input
            type="password"
            placeholder="Commissioner password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button className="btn" disabled={busy} type="submit">Unlock</button>
          {authError && <p className="alert">{authError}</p>}
        </form>
      </main>
    );
  }

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

  const act = async (action) => {
    setBusy(true);
    const { data } = await api('/api/draft', { action });
    setDraft(data);
    setBusy(false);
  };

  const wipe = async () => {
    if (!confirm('Wipe everything? This deletes all accounts, team names, and the draft, and logs everyone (including you) out.')) return;
    setBusy(true);
    await api('/api/admin/wipe', {});
    setBusy(false);
    setWiped(true);
  };

  if (wiped) {
    return (
      <main>
        <h1>{LEAGUE_NAME}</h1>
        <div className="alert alert-good">Everything's been wiped. Reload this page and unlock again to set up a fresh draft.</div>
      </main>
    );
  }

  const joinedCount = Object.keys(slots).length;

  return (
    <main>
      <header className="head">
        <h1>{LEAGUE_NAME}</h1>
        <p className="sub">Commissioner controls</p>
      </header>

      <div className="admin">
        <div className="admin-title">Draft status</div>
        <div className="schedule-row">
          {draft.status === 'not_started' && `Not started · ${joinedCount} of 4 teams joined`}
          {draft.status === 'in_progress' && `In progress · pick ${draft.picks.length + 1} of 32`}
          {draft.status === 'complete' && 'Complete'}
        </div>
      </div>

      <div className="admin">
        <div className="admin-title">Schedule</div>
        <div className="schedule-row">
          {schedule.startAt ? <>Draft starts <strong>{formatWhen(schedule.startAt)}</strong></> : 'No start time set.'}
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
      </div>

      <div className="admin">
        <div className="admin-title">Controls</div>
        <div className="admin-actions">
          {draft.status === 'not_started' && (
            <button className="btn-sm primary" disabled={busy} onClick={() => act('start')}>Start now</button>
          )}
          <button
            className="btn-sm warn"
            disabled={busy}
            onClick={() => { if (confirm('Restart the draft? This clears all picks but keeps accounts and team names.')) act('reset'); }}
          >
            Restart draft
          </button>
        </div>
        <div className="admin-actions">
          <button className="btn-sm warn" disabled={busy} onClick={wipe}>Wipe everything</button>
        </div>
      </div>

      <h2>Teams joined</h2>
      <ul className="games">
        {Object.entries(slots).map(([owner, s]) => (
          <li key={owner}>{s.teamName || owner} <span className="at">·</span> {s.username}</li>
        ))}
        {joinedCount === 0 && <p className="empty">No one has joined yet.</p>}
      </ul>
    </main>
  );
}
