// Talks to Upstash's REST API directly, so it works regardless of which
// env var names Vercel's marketplace integration lands on (KV_REST_API_*
// from the legacy Vercel KV product, or UPSTASH_REDIS_REST_* from a direct
// Upstash connection). Falls back to an in-process Map when neither is set
// (local dev) — that only shares state within one server process.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const memory = new Map();

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
      async set(key, value) {
        await call(`/set/${key}/${encodeURIComponent(JSON.stringify(value))}`);
      },
    }
  : {
      async get(key) {
        return memory.get(key) ?? null;
      },
      async set(key, value) {
        memory.set(key, value);
      },
    };
