// Run against a local Firestore emulator after `npm run build`.
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Firestore } from '@google-cloud/firestore';

assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/,
  'Use a local Firestore emulator; this test must never lock out real users');
const projectId = `auth-test-${randomBytes(6).toString('hex')}`;
const password = randomBytes(32).toString('base64url');
const sessionSecret = randomBytes(48).toString('base64url');
const env = { ...process.env, BASIC_AUTH_USERNAME: 'reviewer', BASIC_AUTH_PASSWORD: password,
  AUTH_SESSION_SECRET: sessionSecret,
  AUTH_FIRESTORE_PROJECT_ID: projectId, AUTH_FIRESTORE_DATABASE_ID: '(default)' };
const db = new Firestore({ projectId });
const bucket = db.doc('authRateLimits/basic');
const servers = [];
let logs = '';
const request = (port, headers = {}, path = '/') => fetch(`http://127.0.0.1:${port}${path}`, { headers });
const authorization = `Basic ${Buffer.from(`reviewer:${password}`).toString('base64')}`;

async function start(port, serverEnv) {
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    { env: serverEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  servers.push(child);
  child.stdout.on('data', (data) => { logs += data; });
  child.stderr.on('data', (data) => { logs += data; });
  for (let i = 0; i < 80; i++) {
    assert.equal(child.exitCode, null, 'Next.js exited before becoming ready');
    try { await request(port); return; } catch { await delay(100); }
  }
  assert.fail('Next.js did not start');
}

try {
  await start(3317, env);
  await start(3318, env);
  const login = await request(3317, { authorization });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get('set-cookie') ?? '';
  assert.match(setCookie, /__Host-demo-auth=/, 'Successful login must issue a session cookie');
  for (const flag of [/HttpOnly/i, /Secure/i, /SameSite=Strict/i, /Path=\//]) assert.match(setCookie, flag);
  const cookie = setCookie.split(';')[0];
  assert.equal((await request(3318, { cookie })).status, 200, 'Session must work on another instance');

  execFileSync(process.execPath, ['scripts/check-basic-auth.mjs'], {
    env: { ...env, BASIC_AUTH_TEST_URL: 'http://127.0.0.1:3317' }, stdio: 'inherit',
  });
  // Give the limit a full window so the test does not straddle a wall-clock minute.
  await bucket.set({ count: 0, resetAt: Date.now() + 60_000 });
  const statuses = await Promise.all(Array.from({ length: 24 }, (_, i) => request(i % 2 ? 3317 : 3318, {
    authorization: `Basic ${Buffer.from(`reviewer:wrong-${i}`).toString('base64')}`,
    'x-forwarded-for': `203.0.113.${i + 1}`, 'x-real-ip': `198.51.100.${i + 1}`,
  }).then((r) => r.status)));
  assert.equal(statuses.filter((s) => s === 401).length, 20, 'Exactly 20 attempts allowed across both instances');
  assert.equal(statuses.filter((s) => s === 429).length, 4);
  const limited = await request(3318, { authorization });
  assert.equal(limited.status, 429, 'Correct credentials must not bypass an exhausted attempt budget');
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.match(limited.headers.get('cache-control'), /no-store/);
  assert.equal((await request(3318, { cookie })).status, 200, 'Already signed-in users keep access');
  assert.equal((await request(3317, { cookie: `${cookie}x`, authorization })).status, 429, 'Tampered cookie cannot bypass limit');
  const forgedExpiry = Date.now() + 60_000;
  const guessedPasswordSignature = createHmac('sha256', password).update(`demo-auth:reviewer:${forgedExpiry}`).digest('hex');
  assert.equal((await request(3317, { cookie: `__Host-demo-auth=${forgedExpiry}.${guessedPasswordSignature}`, authorization })).status, 429,
    'Knowing or guessing the Basic password must not allow minting cookies outside the limiter');
  const expires = Date.now() - 1000;
  const signature = createHmac('sha256', sessionSecret).update(JSON.stringify(['demo-auth', 'reviewer', password, String(expires)])).digest('hex');
  assert.equal((await request(3317, { cookie: `__Host-demo-auth=${expires}.${signature}`, authorization })).status, 429,
    'Expired cookie cannot bypass limit');
  await bucket.set({ count: 20, resetAt: Date.now() - 1 });
  assert.equal((await request(3317, { authorization })).status, 200, 'Expired window admits a new login');
  await bucket.set({ count: 'corrupt', resetAt: Date.now() + 60_000 });
  const unavailable = await request(3318, { authorization });
  assert.equal(unavailable.status, 503, 'Invalid storage state must not reset the limit');
  assert.equal(await unavailable.text(), 'Authentication temporarily unavailable');
  assert.equal((await request(3318, { cookie })).status, 200);
  // A fresh process with missing storage configuration must fail closed.
  await start(3319, { ...env, AUTH_FIRESTORE_PROJECT_ID: '' });
  assert.equal((await request(3319, { authorization })).status, 503);
  await start(3320, { ...env, AUTH_SESSION_SECRET: '' });
  assert.equal((await request(3320, { authorization })).status, 503);
  console.log('Auth security: headers, shared concurrent limit, spoofing, independent session key, tampering/expiry, recovery and fail-closed checks passed');
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  await Promise.all(servers.map((child) => new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve); child.kill('SIGTERM');
  })));
  await db.terminate();
}
