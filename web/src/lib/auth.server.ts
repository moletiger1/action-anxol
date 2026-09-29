import { createHmac, timingSafeEqual } from "node:crypto";
import { Firestore } from "@google-cloud/firestore";

export const AUTH_COOKIE = "__Host-demo-auth";
export const SESSION_SECONDS = 8 * 60 * 60;
let db: Firestore | undefined;

function signature(expires: string, username: string, password: string, sessionSecret: string) {
  return createHmac("sha256", sessionSecret).update(JSON.stringify(["demo-auth", username, password, expires])).digest("hex");
}

export function issueSession(username: string, password: string, sessionSecret: string) {
  const expires = String(Date.now() + SESSION_SECONDS * 1000);
  return `${expires}.${signature(expires, username, password, sessionSecret)}`;
}

export function validSession(value: string | undefined, username: string, password: string, sessionSecret: string) {
  const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(value ?? "");
  if (!match || Number(match[1]) <= Date.now()) return false;
  return timingSafeEqual(Buffer.from(match[2], "hex"), Buffer.from(signature(match[1], username, password, sessionSecret), "hex"));
}

// Reserve BEFORE checking credentials: even a correct guess must not bypass the limit.
export async function reserveLoginAttempt(): Promise<number> {
  const projectId = process.env.AUTH_FIRESTORE_PROJECT_ID;
  const databaseId = process.env.AUTH_FIRESTORE_DATABASE_ID;
  if (!projectId || !databaseId || (process.env.K_SERVICE && process.env.FIRESTORE_EMULATOR_HOST)) {
    throw new Error("Authentication rate limit storage is not configured");
  }
  db ??= new Firestore({ projectId, databaseId, preferRest: true });
  const ref = db.doc("authRateLimits/basic");
  // ponytail: shared demo account, 20 new login attempts/minute globally. Use an identity provider for per-user limits.
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const stored = snapshot.data();
    const now = Date.now();
    if (stored && (!Number.isSafeInteger(stored.count) || stored.count < 0 || !Number.isSafeInteger(stored.resetAt))) {
      throw new Error("Invalid authentication rate limit state");
    }
    const state = stored && stored.resetAt > now ? stored : { count: 0, resetAt: now + 60_000 };
    if (state.count >= 20) return Math.ceil((state.resetAt - now) / 1000);
    transaction.set(ref, { count: state.count + 1, resetAt: state.resetAt });
    return 0;
  }, { maxAttempts: 10 });
}
