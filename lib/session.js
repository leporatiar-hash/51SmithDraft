import { kv } from './kv';
import { SESSION_SECONDS } from './auth';

// Sessions carry the auth-version stamped when they were created. Bumping
// auth-version (done by the commissioner's "wipe everything") instantly
// invalidates every previously-issued session, without needing to track
// and delete each token individually.

export async function currentAuthVersion() {
  return (await kv.get('auth-version')) ?? 0;
}

export async function getSession(req) {
  const token = req.cookies.get('session')?.value;
  if (!token) return null;
  const session = await kv.get(`session:${token}`);
  if (!session) return null;
  const version = await currentAuthVersion();
  if ((session.v ?? 0) !== version) return null;
  return session;
}

/** Merges `patch` into the caller's session, reusing their token if they have one. Caller sets the cookie. */
export async function writeSession(req, patch) {
  const existing = await getSession(req);
  const token = req.cookies.get('session')?.value || crypto.randomUUID();
  const version = await currentAuthVersion();
  const session = { ...(existing ?? {}), ...patch, v: version };
  await kv.set(`session:${token}`, session, { ex: SESSION_SECONDS });
  return { session, token };
}

export function setSessionCookie(res, token) {
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_SECONDS,
    path: '/',
  });
}
