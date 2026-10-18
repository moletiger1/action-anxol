import { P1_NAMESPACE } from './envelope.ts';
import { exactRecord, fail, fixtureRef } from './primitives.ts';

const actorKeys = ['domainTag', 'environmentId', 'consensusId', 'signerProofRef'] as const;
const voteKeys = [
  'domainTag', 'environmentId', 'consensusId', 'recruitmentId', 'electionId', 'roundId', 'ruleVersion',
] as const;
const actorPrefix = 'fixture-actor-scope-';
const votePrefix = 'fixture-vote-scope-';

// Validated parts are ASCII, so these lengths are exact byte lengths. This is
// an injective fixture encoding, NOT adoption of H, a signature or any proof.
function tuple(parts: readonly string[]): string {
  return parts.map(part => `${part.length}:${part}`).join('');
}

function namespace(record: Record<string, unknown>): void {
  for (const key of ['domainTag', 'environmentId', 'consensusId'] as const) {
    if (record[key] !== P1_NAMESPACE[key]) fail('FIXTURE_ONLY');
  }
}

/** Claimed signer reference only: neither authentication nor a true actor identity. */
export function deriveFixtureActorScope(input: unknown): string {
  const record = exactRecord(input, actorKeys);
  namespace(record);
  return `${actorPrefix}${tuple([
    P1_NAMESPACE.domainTag, P1_NAMESPACE.environmentId, P1_NAMESPACE.consensusId,
    fixtureRef(record.signerProofRef),
  ])}`;
}

/** Fixture tuple only; root/candidate/auth/amount/secret are deliberately not fields. */
export function deriveFixtureVoteScope(input: unknown): string {
  const record = exactRecord(input, voteKeys);
  namespace(record);
  if (record.ruleVersion !== P1_NAMESPACE.ruleVersion) fail('FIXTURE_ONLY');
  const round = record.roundId;
  if (round !== 'INITIAL' && round !== 'RUNOFF') fail('INVALID_STRING');
  return `${votePrefix}${tuple([
    P1_NAMESPACE.domainTag, P1_NAMESPACE.environmentId, P1_NAMESPACE.consensusId,
    fixtureRef(record.recruitmentId), fixtureRef(record.electionId), round,
    P1_NAMESPACE.ruleVersion,
  ])}`;
}

// Untrusted scope strings must decode and rederive canonically. A fixture prefix
// alone would permit callers to fabricate new nonce/nullifier buckets.
function decodeScope(input: unknown, prefix: string, keys: readonly string[]): Record<string, unknown> {
  if (typeof input !== 'string') fail('INVALID_STRING');
  if (input.length > 1024) fail('INPUT_LIMIT');
  if (!input.startsWith(prefix)) fail('CONTEXT_CONFLICT');
  let cursor = prefix.length;
  const record: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const colon = input.indexOf(':', cursor);
    if (colon === -1) fail('CONTEXT_CONFLICT');
    const text = input.slice(cursor, colon);
    const length = Number(text);
    if (!Number.isSafeInteger(length) || length < 1 || length > 72
      || String(length) !== text) fail('CONTEXT_CONFLICT');
    const start = colon + 1;
    const part = input.slice(start, start + length);
    if (part.length !== length) fail('CONTEXT_CONFLICT');
    record[key] = part;
    cursor = start + length;
  }
  if (cursor !== input.length) fail('CONTEXT_CONFLICT');
  const canonical = prefix === actorPrefix
    ? deriveFixtureActorScope(record) : deriveFixtureVoteScope(record);
  if (canonical !== input) fail('CONTEXT_CONFLICT');
  return record;
}

export function deriveFixtureNonceKey(actorScope: unknown, nonce: unknown): string {
  decodeScope(actorScope, actorPrefix, actorKeys);
  return `fixture-nonce-${tuple([actorScope as string, fixtureRef(nonce)])}`;
}

// Same bounded grammar as envelope.idempotencyKey, including derived op keys.
function idempotencyToken(input: unknown): string {
  if (typeof input !== 'string') fail('INVALID_STRING');
  const match = /^fixture-[A-Za-z0-9_:\-]{1,1024}$/.exec(input);
  if (match === null || match[0] !== input) fail('FIXTURE_ONLY');
  return input;
}

/** Changing the claimed signer cannot create a second financial-operation slot. */
export function deriveFixtureIdempotencyKey(actorScope: unknown, idempotencyKey: unknown): string {
  decodeScope(actorScope, actorPrefix, actorKeys);
  return `fixture-idempotency-${tuple([
    P1_NAMESPACE.domainTag, P1_NAMESPACE.environmentId, P1_NAMESPACE.consensusId,
    idempotencyToken(idempotencyKey),
  ])}`;
}

/** The mark is supplied by the caller; no credential secret/natural-person calculation. */
export function deriveFixtureNullifierKey(voteScope: unknown, suppliedMark: unknown): string {
  decodeScope(voteScope, votePrefix, voteKeys);
  return `fixture-nullifier-${tuple([voteScope as string, fixtureRef(suppliedMark)])}`;
}
