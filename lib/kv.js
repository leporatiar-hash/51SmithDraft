// Talks to Upstash's REST API directly, so it works regardless of which
// env var names Vercel's marketplace integration lands on (KV_REST_API_*
// from the legacy Vercel KV product, or UPSTASH_REDIS_REST_* from a direct
// Upstash connection). Falls back to a JSON file on disk when neither is
// set (local dev) — an in-memory Map doesn't work here since Next.js dev
// doesn't reliably share one module instance across different API routes;
// a file on disk is genuinely shared.

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const DEV_FILE = join(tmpdir(), 'team-auction-dev-kv.json');

async function readDevStore() {
  try {
    return JSON.parse(await readFile(DEV_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function call(path) {
  const res = await fetch(`${URL_}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`KV request failed: ${res.status}`);
  return res.json();
}

export const kv = URL_ && TOKEN
  ? {
      async get(key) {
        const { result } = await call(`/get/${key}`);
        return result ? JSON.parse(result) : null;
      },
      async set(key, value, { ex } = {}) {
        const encoded = encodeURIComponent(JSON.stringify(value));
        await call(ex ? `/set/${key}/${encoded}/EX/${ex}` : `/set/${key}/${encoded}`);
      },
    }
  : {
      async get(key) {
        const store = await readDevStore();
        return store[key] ?? null;
      },
      async set(key, value) {
        const store = await readDevStore();
        store[key] = value;
        await writeFile(DEV_FILE, JSON.stringify(store));
      },
    };
