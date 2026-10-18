import type { ContractResult } from './primitives.ts';
import { exactRecord, fail, validate } from './primitives.ts';
import { parseFixtureEnvelope } from './envelope.ts';
import { parseRefundIntent } from './refund-contract.ts';
import { parseFixtureRefundOffset } from './operation-bindings.ts';
import { canonicalizeFixtureJSON, parseStrictFixtureJSON } from './strict-json.ts';
import { deriveFixtureActorScope, deriveFixtureNonceKey, deriveFixtureIdempotencyKey,
  deriveFixtureNullifierKey } from './scope.ts';

/** Technical resource caps for syntactic fixtures, not production business rules. */
const MAX_ENTRIES_PER_CLASS = 128;
type OperationEntry = Readonly<{
  nonceKey: string; idempotencyKey: string; immutableCanonical: string;
}>;
export type FixtureReplayState = Readonly<{
  trust: 'untrusted-fixture';
  operations: readonly OperationEntry[];
  nullifiers: readonly string[];
}>;
export type FixtureOperationReplay = Readonly<{
  trust: 'untrusted-fixture'; state: FixtureReplayState; replayed: boolean;
}>;
export type FixtureNullifierCheck = Readonly<{
  trust: 'untrusted-fixture'; state: FixtureReplayState;
}>;

// Identity branding is only boundary hardening for this module's frozen data.
// It stores no service history and asserts no issuer/authenticity/admission.
// Deserialized or forged states are intentionally unsupported. Callers retain
// each immutable snapshot: rewinding one defeats one-use. There is no durable
// storage, concurrent atomicity, authoritative clock, receipt or real proof.
const fixtureStates = new WeakSet<object>();
function issueState(operations: readonly OperationEntry[], nullifiers: readonly string[]): FixtureReplayState {
  const state: FixtureReplayState = Object.freeze({ trust: 'untrusted-fixture', operations, nullifiers });
  fixtureStates.add(state);
  return state;
}
function readState(input: unknown): FixtureReplayState {
  if (input === null || typeof input !== 'object' || !fixtureStates.has(input)) fail('INVALID_RECORD');
  // Only issueState can add this identity. All nested arrays/entries were made
  // internally from validated data and frozen, so no untrusted getter is read.
  return input as FixtureReplayState;
}
export function createFixtureReplayState(): FixtureReplayState {
  return issueState(Object.freeze([]), Object.freeze([]));
}

const envelopeKeys = [
  'domainTag', 'environmentId', 'consensusId', 'schemaVersion', 'ruleVersion',
  'operationName', 'targetId', 'targetVersion', 'payloadHash', 'expectedStateRoot',
  'nonce', 'idempotencyKey', 'issuedAt', 'expiresAt', 'signerProof',
] as const;

function readCanonicalHeader(immutableCanonical: unknown) {
  const parsed = parseStrictFixtureJSON(immutableCanonical);
  if (!parsed.ok) fail(parsed.error);
  const normalized = canonicalizeFixtureJSON(immutableCanonical);
  if (!normalized.ok) fail(normalized.error);
  if (normalized.value !== immutableCanonical) fail('INTENT_CONFLICT');
  const decoded = parsed.value;
  const hasOffset = decoded !== null && typeof decoded === 'object' && Object.hasOwn(decoded, 'offset');
  const carrier = exactRecord(decoded, hasOffset ? ['envelope', 'offset'] : ['envelope', 'intent']);
  const rawHeader = exactRecord(carrier.envelope, envelopeKeys);
  // Replay may examine historical syntactic fixtures. issuedAt is used solely
  // to check header grammar/time-window shape, not actual expiry or authority.
  // This checker is NOT a gateway and MUST NOT substitute for admission checks.
  const header = parseFixtureEnvelope(JSON.stringify(rawHeader), rawHeader.issuedAt);
  if (!header.ok) fail(header.error);
  const envelope = header.value.envelope;
  // Direct replay input cannot rely on a caller having run the operation binder.
  // This is a source-DTO cross-link only, NOT a digest/root/current-state proof.
  if (envelope.operationName === 'executeRefund') {
    if (hasOffset) fail('FIELDS_MISMATCH');
    const intent = parseRefundIntent(carrier.intent);
    if (!intent.ok) fail(intent.error);
    const dto = intent.value.intent;
    if (envelope.targetId !== dto.bankKey || envelope.targetVersion !== dto.instructionVersion
      || envelope.idempotencyKey !== dto.operationKey) fail('INTENT_CONFLICT');
  } else {
    if (!hasOffset) fail('FIELDS_MISMATCH');
    const offset = parseFixtureRefundOffset(carrier.offset);
    if (!offset.ok) fail(offset.error);
    const dto = offset.value.offset;
    if (envelope.targetId !== dto.bankKey || envelope.targetVersion !== dto.preinstructionVersion
      || envelope.idempotencyKey !== dto.offsetKey) fail('INTENT_CONFLICT');
  }
  return { envelope, canonical: normalized.value };
}

/**
 * Pure snapshot transition for validated fixture carrier text only. Not auth,
 * financial execution, consumption authority, or a durable replay service.
 * immutableCanonical covers envelope + original intent/offset, never fresh context.
 */
export function checkFixtureOperationReplay(state: unknown, request: unknown): ContractResult<FixtureOperationReplay> {
  return validate(() => {
    const previous = readState(state);
    const raw = exactRecord(request, ['actorScope', 'nonce', 'idempotencyKey', 'immutableCanonical']);
    const nonceKey = deriveFixtureNonceKey(raw.actorScope, raw.nonce);
    const idempotencyKey = deriveFixtureIdempotencyKey(raw.actorScope, raw.idempotencyKey);
    const checked = readCanonicalHeader(raw.immutableCanonical);
    const envelope = checked.envelope;
    const canonicalActor = deriveFixtureActorScope({
      domainTag: envelope.domainTag, environmentId: envelope.environmentId,
      consensusId: envelope.consensusId, signerProofRef: envelope.signerProof.proofRef,
    });
    if (raw.actorScope !== canonicalActor || raw.nonce !== envelope.nonce
      || raw.idempotencyKey !== envelope.idempotencyKey) fail('CONTEXT_CONFLICT');
    const existingId = previous.operations.find(entry => entry.idempotencyKey === idempotencyKey);
    if (existingId) {
      if (existingId.nonceKey !== nonceKey || existingId.immutableCanonical !== checked.canonical) fail('INTENT_CONFLICT');
      return Object.freeze({ trust: 'untrusted-fixture', state: previous, replayed: true });
    }
    if (previous.operations.some(entry => entry.nonceKey === nonceKey)) fail('CONTEXT_CONFLICT');
    if (previous.operations.length >= MAX_ENTRIES_PER_CLASS) fail('INPUT_LIMIT');
    const entry = Object.freeze({ nonceKey, idempotencyKey, immutableCanonical: checked.canonical });
    const next = issueState(Object.freeze([...previous.operations, entry]), previous.nullifiers);
    return Object.freeze({ trust: 'untrusted-fixture', state: next, replayed: false });
  });
}

/**
 * Caller-supplied fixture marks only. Fresh marks or rewound snapshots can evade
 * this check; it does NOT calculate a credential/nullifier or prove a person.
 */
export function checkFixtureNullifierReuse(
  state: unknown, voteScope: unknown, suppliedMark: unknown,
): ContractResult<FixtureNullifierCheck> {
  return validate(() => {
    const previous = readState(state);
    const key = deriveFixtureNullifierKey(voteScope, suppliedMark);
    if (previous.nullifiers.includes(key)) fail('CONTEXT_CONFLICT');
    if (previous.nullifiers.length >= MAX_ENTRIES_PER_CLASS) fail('INPUT_LIMIT');
    const next = issueState(previous.operations, Object.freeze([...previous.nullifiers, key]));
    return Object.freeze({ trust: 'untrusted-fixture', state: next });
  });
}
