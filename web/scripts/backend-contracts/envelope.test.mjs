import assert from 'node:assert/strict';
import test from 'node:test';
import { P1_NAMESPACE, parseFixtureEnvelope } from '../../src/domain/operational/envelope.ts';

const fixture = () => ({ ...P1_NAMESPACE, operationName: 'executeRefund',
  targetId: 'fixture-instruction', targetVersion: 1, payloadHash: 'a'.repeat(64),
  expectedStateRoot: 'b'.repeat(64), nonce: 'fixture-nonce', idempotencyKey: 'fixture-op',
  issuedAt: 1000, expiresAt: 1100, signerProof: { kind: 'unconfigured', proofRef: 'fixture-proof' } });
const parse = (change = {}, now = 1050) => parseFixtureEnvelope(JSON.stringify({ ...fixture(), ...change }), now);
const error = (change, code, now = 1050) => assert.deepEqual(parse(change, now), { ok: false, error: code });

test('valid fixture is untrusted syntax, never a verified/admitted grant', () => {
  const result = parse();
  assert.equal(result.ok, true);
  assert.equal(result.value.kind, 'untrusted-fixture-envelope');
  assert.equal('verified' in result.value, false);
  assert.equal('admission' in result.value, false);
  assert.equal(Object.isFrozen(result.value.envelope.signerProof), true);
});
for (const field of ['domainTag', 'environmentId', 'consensusId', 'schemaVersion', 'ruleVersion']) {
  test(`fixture rejects namespace/version alteration: ${field}`, () => error({ [field]: field === 'schemaVersion' ? 2 : 'production' }, 'FIXTURE_ONLY'));
}
for (const field of Object.keys(fixture())) {
  test(`full envelope requires ${field}`, () => {
    const input = fixture(); delete input[field];
    assert.deepEqual(parseFixtureEnvelope(JSON.stringify(input), 1050), { ok: false, error: 'FIELDS_MISMATCH' });
  });
}
for (const extra of ['mode', 'verified', 'email', 'bankAccount', 'webhook']) {
  test(`closed envelope rejects ${extra}`, () => error({ [extra]: true }, 'FIELDS_MISMATCH'));
}
test('unconfigured proof schema rejects fake verified/demo proofs', () => {
  error({ signerProof: { kind: 'demo-owner-bound', proofRef: 'fixture-proof' } }, 'UNCONFIGURED_PROOF_REQUIRED');
  error({ signerProof: { kind: 'unconfigured', proofRef: 'fixture-proof', verified: true } }, 'FIELDS_MISMATCH');
});
test('only scoped fixture refs, no arbitrary targets/nonce/proof URLs', () => {
  error({ targetId: 'real-instruction' }, 'FIXTURE_ONLY');
  error({ nonce: 'https://example.com/private' }, 'FIXTURE_ONLY');
  error({ signerProof: { kind: 'unconfigured', proofRef: 'secret-bank-session' } }, 'FIXTURE_ONLY');
});
test('hash/root are bounded unverified hex references', () => {
  error({ payloadHash: 'signed-and-verified' }, 'INVALID_STRING');
  error({ expectedStateRoot: 'g'.repeat(64) }, 'INVALID_STRING');
});
test('strict expiry [issuedAt,expiresAt), including exact boundaries', () => {
  assert.equal(parse({}, 1000).ok, true);
  assert.equal(parse({}, 1099).ok, true);
  error({}, 'EXPIRED', 1100); error({}, 'EXPIRED', 1101);
  error({}, 'FUTURE_ISSUED_AT', 999);
  error({ expiresAt: 1000 }, 'INVALID_TIME_WINDOW');
});
test('clock/versions reject coercion and unsafe values', () => {
  error({}, 'INTEGER_INVALID', '1050');
  error({ targetVersion: -1 }, 'INTEGER_INVALID');
  error({ issuedAt: true }, 'INTEGER_INVALID');
});
test('unsupported operations cannot reuse fixture proof', () => error({ operationName: 'executeBankTransfer' }, 'UNSUPPORTED_OPERATION'));
test('canonical covers signerProof and all envelope fields independent of insertion order', () => {
  const a = parse().value;
  const reversed = Object.fromEntries(Object.entries(fixture()).reverse());
  const b = parseFixtureEnvelope(JSON.stringify(reversed), 1050).value;
  assert.equal(a.canonical, b.canonical);
  assert.match(a.canonical, /"signerProof":\{"kind":"unconfigured","proofRef":"fixture-proof"\}/);
  assert.notEqual(a.canonical, parse({ nonce: 'fixture-other' }).value.canonical);
});
test('escaped duplicate envelope keys are rejected before native JSON collapse', () => {
  const raw = JSON.stringify(fixture()).replace('"nonce":', '"\\u006eonce":"fixture-another","nonce":');
  assert.deepEqual(parseFixtureEnvelope(raw, 1050), { ok: false, error: 'DUPLICATE_KEY' });
});
