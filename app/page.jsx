'use client';

import { useEffect, useState } from 'react';
import { LEAGUE_NAME, SCORING, validate, OWNERS, buildOwnerOf } from '@/lib/league';
import { currentWeek, gamesThrough } from '@/lib/espn';
import { standings, record, signed } from '@/lib/standings';
import { logoFor } from '@/lib/logos';

const staticErrors = validate();
const byDiff = SCORING !== 'record';

export default function Page() {
  const [state, setState] = useState({ status: 'loading', week: 1, games: [] });
  const [owners, setOwners] = useState(OWNERS);
  const [rosterSource, setRosterSource] = useState(null); // null = not resolved yet

  useEffect(() => {
    fetch('/api/rosters')
      .then((r) => r.json())
      .then(({ owners, source }) => { setOwners(owners); setRosterSource(source); })
      .catch(() => setRosterSource('static'));

    if (staticErrors.length) return;
    let cancelled = false;

    (async () => {
      try {
        const week = await currentWeek();
        const games = await gamesThrough(week);
        if (!cancelled) setState({ status: 'ready', week, games });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, status: 'error' }));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (staticErrors.length && rosterSource !== 'draft') {
    return (
      <main>
        <h1>{LEAGUE_NAME}</h1>
        <div className="alert">
          <strong>Fix lib/league.js before this will work:</strong>
          <ul>{staticErrors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      </main>
    );
  }

  const ownerOf = buildOwnerOf(owners);
  const { status, week, games } = state;
  const table = standings(games, owners, ownerOf);
  const latest = games.filter((g) => g.week === week);

  return (
    <main>
      <header className="head">
        <h1>{LEAGUE_NAME}</h1>
        <p className="sub">
          {status === 'loading'
            ? 'Loading scores…'
            : `Week ${week} · ranked by ${byDiff ? 'point differential' : 'win percentage'}`}
        </p>
      </header>

      <a href="/draft" className="cta">
        Join Draft Night <span className="cta-arrow">→</span>
      </a>

      {status === 'error' && (
        <div className="alert">Couldn&apos;t reach ESPN. Reload in a minute.</div>
      )}

      <ol className="board">
        {table.map((r, i) => (
          <li
            key={r.owner.name}
            className={i === 0 && r.played ? 'row lead' : 'row'}
            style={{ borderLeftColor: r.owner.color }}
          >
            <span className="rank">{i + 1}</span>
            <span className="who">
              <span className="nm" style={{ color: r.owner.color }}>{r.owner.name}</span>
              <span className="meta">
                {byDiff
                  ? `${record(r)} across ${r.played} games`
                  : `${signed(r.diff)} point differential`}
              </span>
            </span>
            <span className={`big ${byDiff ? (r.diff > 0 ? 'up' : r.diff < 0 ? 'down' : '') : ''}`}>
              {byDiff ? signed(r.diff) : record(r)}
            </span>
          </li>
        ))}
      </ol>

      <section>
        <h2>Week {week}</h2>
        {latest.length === 0 ? (
          <p className="empty">
            {status === 'loading' ? 'Checking…' : 'No finished games yet this week.'}
          </p>
        ) : (
          <ul className="games">
            {latest.map((g, i) => (
              <li key={i}>
                <Team name={g.away} ownerOf={ownerOf} /> <b>{g.awayScore}</b>
                <span className="at">at</span>
                <Team name={g.home} ownerOf={ownerOf} /> <b>{g.homeScore}</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Rosters</h2>
        <div className="rosters">
          {table.map((r) => (
            <div key={r.owner.name} className="roster" style={{ borderLeftColor: r.owner.color }}>
              <h3 style={{ color: r.owner.color }}>{r.owner.name}</h3>
              <ul>
                {r.owner.teams
                  .map((t) => ({
                    name: t,
                    ...(r.teams[t] ?? { wins: 0, losses: 0, ties: 0, diff: 0 }),
                  }))
                  .sort((a, b) => b.diff - a.diff)
                  .map((t) => (
                    <li key={t.name}>
                      <span className="teamname"><Logo team={t.name} /> {t.name}</span>
                      <span className="tstat">
                        {record(t)}{' '}
                        <em className={t.diff > 0 ? 'up' : t.diff < 0 ? 'down' : ''}>
                          {signed(t.diff)}
                        </em>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="foot">
        Scores pulled live from ESPN each time this page loads.
      </footer>
    </main>
  );
}

function Team({ name, ownerOf }) {
  const o = ownerOf[name];
  return (
    <span className="teamname" style={o ? { color: o.color, fontWeight: 600 } : undefined}>
      <Logo team={name} /> {name}
    </span>
  );
}

function Logo({ team, size = 20 }) {
  const src = logoFor(team);
  if (!src) return null;
  return <img className="logo" src={src} alt="" width={size} height={size} loading="lazy" />;
}
