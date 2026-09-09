// Falls back to an in-process Map when Vercel KV isn't configured (local
// dev without `vercel env pull`). Production relies on real KV so state is
// shared across everyone's phone, not just one server process.

const memory = new Map();

const hasVercelKV = Boolean(process.env.KV_REST_API_URL);

export const kv = hasVercelKV
  ? await import('@vercel/kv').then((m) => m.kv)
  : {
      async get(key) {
        return memory.get(key) ?? null;
      },
      async set(key, value) {
        memory.set(key, value);
      },
    };
