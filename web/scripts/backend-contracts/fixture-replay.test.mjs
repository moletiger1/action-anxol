import assert from 'node:assert/strict';
import test from 'node:test';
import { P1_NAMESPACE } from '../../src/domain/operational/envelope.ts';
import { canonicalizeFixtureJSON } from '../../src/domain/operational/strict-json.ts';
import { deriveRefundOperationKey, deriveRefundOffsetKey } from '../../src/domain/operational/refund-contract.ts';
import { createFixtureReplayState, checkFixtureOperationReplay, checkFixtureNullifierReuse } from '../../src/domain/operational/fixture-replay.ts';

const tuple = (parts) => parts.map(part => `${part.length}:${part}`).join('');
const actorScope = `fixture-actor-scope-${tuple([P1_NAMESPACE.domainTag, P1_NAMESPACE.environmentId, P1_NAMESPACE.consensusId, 'fixture-proof'])}`;
const voteScope = (round = 'INITIAL', election = 'fixture-election') => `fixture-vote-scope-${tuple([P1_NAMESPACE.domainTag, P1_NAMESPACE.environmentId, P1_NAMESPACE.consensusId, 'fixture-r', election, round, P1_NAMESPACE.ruleVersion])}`;
const bankKey = `fixture-bank-${tuple(['fixture-r', 'fixture-b', 'fixture-owner'])}`;
const operationKey = `fixture-operation-${tuple([bankKey, 'executeRefund', '1'])}`;
const intent = () => ({ recruitmentId: 'fixture-r', batchId: 'fixture-b', privateRefundOwnerRef: 'fixture-owner',
  bankKey, operationKey, executionVersion: 1, amount: 50, transactionVersion: 1,
  instructionVersion: 1, approvedRevision: 1, recipientRef: 'fixture-recipient' });
const envelope = (change = {}) => ({ ...P1_NAMESPACE, operationName: 'executeRefund',
  targetId: bankKey, targetVersion: 1, payloadHash: 'a'.repeat(64), expectedStateRoot: 'b'.repeat(64),
  nonce: 'fixture-nonce', idempotencyKey: operationKey, issuedAt: 1000, expiresAt: 1100,
  signerProof: { kind: 'unconfigured', proofRef: 'fixture-proof' }, ...change });
const canon = (value) => {
  const result = canonicalizeFixtureJSON(JSON.stringify(value)); assert.equal(result.ok, true); return result.value;
};
const request = (header = {}, payload = {}, extra = {}) => {
  const env = envelope(header);
  return { actorScope, nonce: env.nonce, idempotencyKey: env.idempotencyKey,
    immutableCanonical: canon({ envelope: env, intent: { ...intent(), ...payload } }), ...extra };
};
const executionRequest = (executionVersion, header = {}) => {
  const key = deriveRefundOperationKey(bankKey, executionVersion);
  return request({ idempotencyKey: key, ...header }, { executionVersion, operationKey: key });
};
const reject = (actual, error) => assert.deepEqual(actual, { ok: false, error });
const accepted = (actual) => { assert.equal(actual.ok, true, JSON.stringify(actual)); return actual.value; };

test('empty state is deeply frozen, exact, untrusted and explicitly caller held', () => {
  const state = createFixtureReplayState();
  assert.deepEqual(Object.keys(state).sort(), ['nullifiers', 'operations', 'trust']);
  assert.equal(state.trust, 'untrusted-fixture');
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.operations), true);
  assert.equal(Object.isFrozen(state.nullifiers), true);
  assert.equal(state.operations.length, 0); assert.equal(state.nullifiers.length, 0);
  assert.equal('verified' in state, false); assert.equal('receipt' in state, false);
});
test('first canonical operation creates new immutable state; identical replay preserves state identity', () => {
  const initial = createFixtureReplayState();
  const first = accepted(checkFixtureOperationReplay(initial, request()));
  assert.equal(first.trust, 'untrusted-fixture'); assert.equal(first.replayed, false);
  assert.notEqual(first.state, initial); assert.equal(initial.operations.length, 0);
  assert.equal(first.state.operations.length, 1);
  assert.equal(Object.isFrozen(first), true); assert.equal(Object.isFrozen(first.state.operations[0]), true);
  const again = accepted(checkFixtureOperationReplay(first.state, request()));
  assert.equal(again.replayed, true); assert.equal(again.state, first.state);
});
test('same id with changed original intent or envelope is INTENT_CONFLICT, never replaces history', () => {
  const first = accepted(checkFixtureOperationReplay(createFixtureReplayState(), request()));
  reject(checkFixtureOperationReplay(first.state, request({}, { amount: 51 })), 'INTENT_CONFLICT');
  reject(checkFixtureOperationReplay(first.state, request({ expectedStateRoot: 'c'.repeat(64) })), 'INTENT_CONFLICT');
  reject(checkFixtureOperationReplay(first.state, request({ nonce: 'fixture-other' })), 'INTENT_CONFLICT');
  assert.equal(first.state.operations.length, 1);
  assert.equal(accepted(checkFixtureOperationReplay(first.state, request())).state, first.state);
});
test('changing claimed signer cannot bypass financial idempotency; changed canonical is rejected', () => {
  const first = accepted(checkFixtureOperationReplay(createFixtureReplayState(), request()));
  const proof = 'fixture-other';
  const otherActor = actorScope.replace('fixture-proof', proof);
  reject(checkFixtureOperationReplay(first.state, request({ signerProof: { kind: 'unconfigured', proofRef: proof } }, {}, { actorScope: otherActor })), 'INTENT_CONFLICT');
  assert.equal(first.state.operations.length, 1);
});
test('reusing signer nonce for a legitimate different execution/key cannot create another bucket', () => {
  const first = accepted(checkFixtureOperationReplay(createFixtureReplayState(), executionRequest(1)));
  reject(checkFixtureOperationReplay(first.state, executionRequest(2)), 'CONTEXT_CONFLICT');
  assert.equal(first.state.operations.length, 1);
  // With a distinct nonce, the rederived execution key is syntactically valid.
  const second = accepted(checkFixtureOperationReplay(first.state, executionRequest(2, { nonce: 'fixture-nonce-2' })));
  assert.equal(second.state.operations.length, 2);
});
test('raw replay request is exact data-only; getters are never invoked', () => {
  const state = createFixtureReplayState();
  reject(checkFixtureOperationReplay(state, { ...request(), freshContext: {} }), 'FIELDS_MISMATCH');
  let reads = 0; const raw = request();
  Object.defineProperty(raw, 'immutableCanonical', { enumerable: true, get() { reads++; return request().immutableCanonical; } });
  reject(checkFixtureOperationReplay(state, raw), 'INVALID_RECORD'); assert.equal(reads, 0);
  reject(checkFixtureOperationReplay(state, { ...request(), [Symbol('x')]: 1 }), 'INVALID_RECORD');
});
test('strict canonical text is required: whitespace/order aliases and duplicate keys are rejected before state growth', () => {
  const state = createFixtureReplayState(); const raw = request();
  reject(checkFixtureOperationReplay(state, { ...raw, immutableCanonical: ` ${raw.immutableCanonical}` }), 'INTENT_CONFLICT');
  reject(checkFixtureOperationReplay(state, { ...raw, immutableCanonical: JSON.stringify({ envelope: envelope(), intent: intent() }) }), 'INTENT_CONFLICT');
  reject(checkFixtureOperationReplay(state, { ...raw, immutableCanonical: '{"envelope":{},"envelope":{},"intent":{}}' }), 'DUPLICATE_KEY');
  reject(checkFixtureOperationReplay(state, { ...raw, immutableCanonical: {} }), 'INVALID_JSON');
  assert.equal(state.operations.length, 0);
});
test('canonical carrier is closed envelope + original intent, never arbitrary JSON or fresh context', () => {
  const state = createFixtureReplayState();
  for (const value of [null, 'fixture-x', [], {}, { envelope: envelope() },
    { envelope: envelope(), intent: intent(), freshContext: {} }, { envelope: envelope(), intent: { ...intent(), email: 'pii' } }]) {
    assert.equal(checkFixtureOperationReplay(state, { ...request(), immutableCanonical: canon(value) }).ok, false);
  }
  reject(checkFixtureOperationReplay(state, request({}, { recipientRef: 'real-person' })), 'FIXTURE_ONLY');
  assert.equal(state.operations.length, 0);
});
test('actual canonical header binds nonce/idempotency/namespace/proofRef to the supplied replay request', () => {
  const state = createFixtureReplayState();
  reject(checkFixtureOperationReplay(state, request({}, {}, { nonce: 'fixture-asserted' })), 'CONTEXT_CONFLICT');
  reject(checkFixtureOperationReplay(state, request({}, {}, { idempotencyKey: 'fixture-asserted' })), 'CONTEXT_CONFLICT');
  const alteredActor = actorScope.replace('fixture-proof', 'fixture-other');
  reject(checkFixtureOperationReplay(state, request({}, {}, { actorScope: alteredActor })), 'CONTEXT_CONFLICT');
  reject(checkFixtureOperationReplay(state, request({ environmentId: 'production' })), 'FIXTURE_ONLY');
  reject(checkFixtureOperationReplay(state, request({ signerProof: { kind: 'verified', proofRef: 'fixture-proof' } })), 'UNCONFIGURED_PROOF_REQUIRED');
  reject(checkFixtureOperationReplay(state, request({}, {}, { actorScope: 'fixture-actor-scope-forged' })), 'CONTEXT_CONFLICT');
  const first = accepted(checkFixtureOperationReplay(state, request()));
  reject(checkFixtureOperationReplay(first.state, request({}, {}, { nonce: 'fixture-asserted' })), 'CONTEXT_CONFLICT');
});
test('full 15-field header remains mandatory and timestamp shape is checked without an actual clock', () => {
  const state = createFixtureReplayState();
  for (const key of Object.keys(envelope())) {
    const partial = envelope(); delete partial[key];
    reject(checkFixtureOperationReplay(state, { ...request(), immutableCanonical: canon({ envelope: partial, intent: intent() }) }), 'FIELDS_MISMATCH');
  }
  reject(checkFixtureOperationReplay(state, request({ expiresAt: 1000 })), 'INVALID_TIME_WINDOW');
  const saved = Date.now;
  Date.now = () => { throw new Error('actual clock forbidden'); };
  try { assert.equal(checkFixtureOperationReplay(state, request()).ok, true); }
  finally { Date.now = saved; }
});
test('forged/deserialized/nonstate objects and accessors are rejected without getter reads', () => {
  const state = createFixtureReplayState();
  for (const forged of [null, {}, { ...state }, Object.freeze({ ...state }), JSON.parse(JSON.stringify(state))]) {
    reject(checkFixtureOperationReplay(forged, request()), 'INVALID_RECORD');
    reject(checkFixtureNullifierReuse(forged, voteScope(), 'fixture-mark'), 'INVALID_RECORD');
  }
  let reads = 0;
  const fake = Object.freeze({ get trust() { reads++; return 'untrusted-fixture'; } });
  reject(checkFixtureOperationReplay(fake, request()), 'INVALID_RECORD'); assert.equal(reads, 0);
});
test('nullifier same round duplicate is refused, initial/runoff each allow one caller-supplied mark', () => {
  const empty = createFixtureReplayState();
  const initial = accepted(checkFixtureNullifierReuse(empty, voteScope(), 'fixture-mark'));
  assert.equal(initial.trust, 'untrusted-fixture'); assert.equal(initial.state.nullifiers.length, 1);
  assert.equal(initial.state.operations.length, 0); assert.equal(empty.nullifiers.length, 0);
  reject(checkFixtureNullifierReuse(initial.state, voteScope(), 'fixture-mark'), 'CONTEXT_CONFLICT');
  const runoff = accepted(checkFixtureNullifierReuse(initial.state, voteScope('RUNOFF'), 'fixture-mark'));
  assert.equal(runoff.state.nullifiers.length, 2);
  reject(checkFixtureNullifierReuse(runoff.state, voteScope('RUNOFF'), 'fixture-mark'), 'CONTEXT_CONFLICT');
});
test('nullifier keys validate canonical tuple and election scope; invalid inputs never grow state', () => {
  const empty = createFixtureReplayState();
  reject(checkFixtureNullifierReuse(empty, 'fixture-vote-scope-forged', 'fixture-mark'), 'CONTEXT_CONFLICT');
  reject(checkFixtureNullifierReuse(empty, voteScope(), 'real-mark'), 'FIXTURE_ONLY');
  const first = accepted(checkFixtureNullifierReuse(empty, voteScope(), 'fixture-mark'));
  const differentElection = accepted(checkFixtureNullifierReuse(first.state, voteScope('INITIAL', 'fixture-election-2'), 'fixture-mark'));
  assert.equal(differentElection.state.nullifiers.length, 2);
});
test('two counter classes are independent and preserve the other immutable array', () => {
  const op = accepted(checkFixtureOperationReplay(createFixtureReplayState(), request()));
  const mark = accepted(checkFixtureNullifierReuse(op.state, voteScope(), 'fixture-mark'));
  assert.equal(mark.state.operations, op.state.operations);
  const again = accepted(checkFixtureOperationReplay(mark.state, request()));
  assert.equal(again.state, mark.state); assert.equal(again.replayed, true);
  assert.equal(mark.state.nullifiers.length, 1);
});
test('technical caps of 128 entries per class reject without consuming state; replay at capacity is still allowed', () => {
  let state = createFixtureReplayState();
  for (let index = 0; index < 128; index++) {
    state = accepted(checkFixtureOperationReplay(state, executionRequest(index + 1, { nonce: `fixture-n-${index}` }))).state;
    state = accepted(checkFixtureNullifierReuse(state, voteScope(), `fixture-m-${index}`)).state;
  }
  reject(checkFixtureOperationReplay(state, executionRequest(129, { nonce: 'fixture-n-129' })), 'INPUT_LIMIT');
  reject(checkFixtureNullifierReuse(state, voteScope(), 'fixture-m-129'), 'INPUT_LIMIT');
  assert.equal(accepted(checkFixtureOperationReplay(state, executionRequest(1, { nonce: 'fixture-n-0' }))).state, state);
  assert.equal(state.operations.length, 128); assert.equal(state.nullifiers.length, 128);
});
const offsetKey = `fixture-offset-${tuple(['fixture-cancel', bankKey, '3'])}`;
const offset = () => ({ recruitmentId: 'fixture-r', batchId: 'fixture-b', privateRefundOwnerRef: 'fixture-owner',
  bankKey, cancelEventId: 'fixture-cancel', preinstructionVersion: 3, offsetKey, offsetAmount: 30,
  transactionVersion: 2, approvedRevision: 4, terminalProofRef: 'fixture-terminal', fenceRef: 'fixture-fence' });
const offsetRequest = (header = {}, payload = {}, extra = {}) => {
  const env = envelope({ operationName: 'offsetRefundReservation', idempotencyKey: offsetKey,
    nonce: 'fixture-offset-nonce', targetVersion: 3, ...header });
  return { actorScope, nonce: env.nonce, idempotencyKey: env.idempotencyKey,
    immutableCanonical: canon({ envelope: env, offset: { ...offset(), ...payload } }), ...extra };
};
function crossLinkDenial(raw, valid = request()) {
  const empty = createFixtureReplayState();
  const operations = empty.operations, nullifiers = empty.nullifiers;
  reject(checkFixtureOperationReplay(empty, raw), 'INTENT_CONFLICT');
  assert.equal(empty.operations, operations); assert.equal(empty.nullifiers, nullifiers);
  assert.equal(empty.operations.length, 0); assert.equal(empty.nullifiers.length, 0);
  // Denial did not burn the fixture nonce/id: a correct carrier still works.
  assert.equal(accepted(checkFixtureOperationReplay(empty, valid)).state.operations.length, 1);
  assert.equal(empty.operations.length, 0);
}
for (const [field, value] of [['targetId', 'fixture-other-bank'], ['targetVersion', 2], ['idempotencyKey', 'fixture-other-key']]) {
  test(`direct execute carrier cross-links ${field} to its source DTO before state growth`, () => crossLinkDenial(request({ [field]: value })));
}
for (const [field, value] of [['targetId', 'fixture-other-bank'], ['targetVersion', 4], ['idempotencyKey', 'fixture-other-offset']]) {
  test(`direct offset carrier cross-links ${field} to its source DTO before state growth`, () => crossLinkDenial(offsetRequest({ [field]: value }), offsetRequest()));
}
test('direct execute carrier rejects changed execution with a rederived payload key but stale header key', () => {
  crossLinkDenial(request({}, { executionVersion: 2, operationKey: deriveRefundOperationKey(bankKey, 2) }));
});
test('direct offset carrier rejects changed preinstruction with a rederived payload key but stale header fields', () => {
  crossLinkDenial(offsetRequest({}, { preinstructionVersion: 4, offsetKey: deriveRefundOffsetKey('fixture-cancel', bankKey, 4) }), offsetRequest());
});
test('closed original offset carrier supports identical replay and rejects changed canonical payload', () => {
  const empty = createFixtureReplayState();
  const first = accepted(checkFixtureOperationReplay(empty, offsetRequest()));
  assert.equal(first.replayed, false); assert.equal(first.state.operations.length, 1);
  const again = accepted(checkFixtureOperationReplay(first.state, offsetRequest()));
  assert.equal(again.replayed, true); assert.equal(again.state, first.state);
  reject(checkFixtureOperationReplay(first.state, offsetRequest({}, { offsetAmount: 31 })), 'INTENT_CONFLICT');
  reject(checkFixtureOperationReplay(first.state, offsetRequest({ nonce: 'fixture-another' })), 'INTENT_CONFLICT');
});
test('offset cannot smuggle unknown fields, nonfixture proof refs, mismatched keys or carrier operation', () => {
  const state = createFixtureReplayState();
  reject(checkFixtureOperationReplay(state, offsetRequest({}, { email: 'pii' })), 'FIELDS_MISMATCH');
  reject(checkFixtureOperationReplay(state, offsetRequest({}, { fenceRef: 'real-fence' })), 'FIXTURE_ONLY');
  reject(checkFixtureOperationReplay(state, offsetRequest({}, { offsetKey: 'fixture-fake-key' })), 'INTENT_CONFLICT');
  reject(checkFixtureOperationReplay(state, offsetRequest({ operationName: 'executeRefund' })), 'FIELDS_MISMATCH');
  reject(checkFixtureOperationReplay(state, request({ operationName: 'offsetRefundReservation' })), 'FIELDS_MISMATCH');
  assert.equal(state.operations.length, 0);
});
test('nonce scope is shared across execute/offset operations and neither check invokes network or actual clock', () => {
  const state = createFixtureReplayState(); const savedFetch = globalThis.fetch; const savedClock = Date.now;
  let calls = 0;
  globalThis.fetch = () => { calls++; throw new Error('network forbidden'); };
  Date.now = () => { calls++; throw new Error('actual clock forbidden'); };
  try {
    const first = accepted(checkFixtureOperationReplay(state, request()));
    reject(checkFixtureOperationReplay(first.state, offsetRequest({ nonce: 'fixture-nonce' })), 'CONTEXT_CONFLICT');
    accepted(checkFixtureNullifierReuse(first.state, voteScope(), 'fixture-mark'));
    assert.equal(calls, 0);
  } finally { globalThis.fetch = savedFetch; Date.now = savedClock; }
});
test('fixture state rewind and fresh supplied marks are intentionally NOT durable one-use/natural-person guarantees', () => {
  const old = createFixtureReplayState();
  accepted(checkFixtureNullifierReuse(old, voteScope(), 'fixture-mark'));
  assert.equal(checkFixtureNullifierReuse(old, voteScope(), 'fixture-mark').ok, true);
  const one = accepted(checkFixtureNullifierReuse(old, voteScope(), 'fixture-mark'));
  assert.equal(checkFixtureNullifierReuse(one.state, voteScope(), 'fixture-other-mark').ok, true);
});
