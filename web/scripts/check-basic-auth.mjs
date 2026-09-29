import assert from 'node:assert/strict';

const base = process.env.BASIC_AUTH_TEST_URL;
const username = process.env.BASIC_AUTH_USERNAME;
const password = process.env.BASIC_AUTH_PASSWORD;
assert.ok(base && username && password, 'Set BASIC_AUTH_TEST_URL, BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD');
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const request = (path, headers = {}) => fetch(new URL(path, base), { headers, redirect: 'manual' });

for (const path of ['/', '/recruitments/timescar-corporate/contribute', '/favicon.ico', '/_next/static/missing.js']) {
  const response = await request(path);
  assert.equal(response.status, 401, path);
  assert.match(response.headers.get('www-authenticate'), /^Basic /);
  assert.match(response.headers.get('cache-control'), /no-store/);
}
for (const invalid of ['Basic !!!', 'Bearer invalid', `Basic ${Buffer.from(`${username}:wrong`).toString('base64')}`]) {
  assert.equal((await request('/', { authorization: invalid })).status, 401);
}
assert.equal((await request('/', { 'x-middleware-subrequest': 'proxy:proxy:proxy:proxy:proxy', RSC: '1' })).status, 401);
const response = await request('/', { authorization });
assert.equal(response.status, 200);
assert.match(response.headers.get('cache-control'), /no-store/);
const html = await response.text();
assert.ok(html.includes('集団訴訟'));
const asset = html.match(/src="([^" ]+\/_next\/static\/[^" ]+|\/_next\/static\/[^" ]+)"/)?.[1];
assert.ok(asset, 'Rendered page includes a Next.js asset');
assert.equal((await request(asset)).status, 401);
assert.equal((await request(asset, { authorization })).status, 200);
console.log('Basic auth: missing/wrong/bypass denied; correct credentials and assets accepted');
