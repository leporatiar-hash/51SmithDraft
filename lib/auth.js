import { createHash } from 'crypto';

// Not high-security — a private draft link for a handful of friends. Just
// enough that passwords aren't sitting in KV as plain text.
const SALT = 'team-auction-draft';

export function hashPassword(password) {
  return createHash('sha256').update(SALT + password).digest('hex');
}

export const SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days
