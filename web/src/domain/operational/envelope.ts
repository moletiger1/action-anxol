import type { ContractResult } from './primitives.ts';
import { exactRecord, fail, fixtureRef, validate, version } from './primitives.ts';
import { canonicalizeFixtureJSON, parseStrictFixtureJSON } from './strict-json.ts';

// Synthetic namespace only. These constants do not approve real rules or keys.
export const P1_NAMESPACE = Object.freeze({
  domainTag: 'action-operational-p1-fixture',
  environmentId: 'p1-fixture',
  consensusId: 'unconfigured-fixture-authority',
  schemaVersion: 1,
  ruleVersion: 'unapproved-fixture-v1',
});

export type FixtureEnvelope = Readonly<{
  domainTag: string; environmentId: string; consensusId: string;
  schemaVersion: number; ruleVersion: string;
  operationName: 'executeRefund' | 'offsetRefundReservation';
  targetId: string; targetVersion: number; payloadHash: string;
  expectedStateRoot: string; nonce: string; idempotencyKey: string;
  issuedAt: number; expiresAt: number;
  signerProof: Readonly<{ kind: 'unconfigured'; proofRef: string }>;
}>;
export type UntrustedFixtureEnvelope = Readonly<{
  kind: 'untrusted-fixture-envelope'; envelope: FixtureEnvelope; canonical: string;
}>;
const envelopeKeys = [
  'domainTag', 'environmentId', 'consensusId', 'schemaVersion', 'ruleVersion',
  'operationName', 'targetId', 'targetVersion', 'payloadHash', 'expectedStateRoot',
  'nonce', 'idempotencyKey', 'issuedAt', 'expiresAt', 'signerProof',
] as const;

// Hex64 is an opaque fixture reference format, not selection of a hash algorithm.
function hexReference(input: unknown): string {
  if (typeof input !== 'string') fail('INVALID_STRING');
  const match = /^[a-f0-9]{64}$/.exec(input);
  if (match === null || match[0] !== input) fail('INVALID_STRING');
  return input;
}
// Includes length-prefixed derived fixture keys; no URLs or lookup capabilities.
function fixtureToken(input: unknown): string {
  if (typeof input !== 'string') fail('INVALID_STRING');
  const match = /^fixture-[A-Za-z0-9_:\-]{1,1024}$/.exec(input);
  if (match === null || match[0] !== input) fail('FIXTURE_ONLY');
  return input;
}

/** Structural fixture validation ONLY: no signature/hash/clock authenticity or admission. */
export function parseFixtureEnvelope(input: unknown, fixtureNow: unknown): ContractResult<UntrustedFixtureEnvelope> {
  return validate(() => {
    const parsed = parseStrictFixtureJSON(input);
    if (!parsed.ok) fail(parsed.error);
    const record = exactRecord(parsed.value, envelopeKeys);
    for (const field of ['domainTag', 'environmentId', 'consensusId', 'schemaVersion', 'ruleVersion'] as const) {
      if (record[field] !== P1_NAMESPACE[field]) fail('FIXTURE_ONLY');
    }
    const operationName = record.operationName;
    if (operationName !== 'executeRefund' && operationName !== 'offsetRefundReservation') fail('UNSUPPORTED_OPERATION');
    const proof = exactRecord(record.signerProof, ['kind', 'proofRef']);
    if (proof.kind !== 'unconfigured') fail('UNCONFIGURED_PROOF_REQUIRED');
    const signerProof = Object.freeze({ kind: 'unconfigured' as const, proofRef: fixtureRef(proof.proofRef) });
    const issuedAt = version(record.issuedAt);
    const expiresAt = version(record.expiresAt);
    const now = version(fixtureNow);
    if (expiresAt <= issuedAt) fail('INVALID_TIME_WINDOW');
    if (now < issuedAt) fail('FUTURE_ISSUED_AT');
    if (now >= expiresAt) fail('EXPIRED');
    const envelope: FixtureEnvelope = Object.freeze({
      ...P1_NAMESPACE, operationName, targetId: fixtureToken(record.targetId),
      targetVersion: version(record.targetVersion), payloadHash: hexReference(record.payloadHash),
      expectedStateRoot: hexReference(record.expectedStateRoot), nonce: fixtureRef(record.nonce),
      idempotencyKey: fixtureToken(record.idempotencyKey), issuedAt, expiresAt, signerProof,
    });
    const normalized = canonicalizeFixtureJSON(input);
    if (!normalized.ok) fail(normalized.error);
    return Object.freeze({ kind: 'untrusted-fixture-envelope' as const, envelope, canonical: normalized.value });
  });
}
