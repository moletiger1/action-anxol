import test from 'node:test';
import assert from 'node:assert/strict';
// Test the application reducer, never scripts/spec-validation's isolated model.
import { createDemoElection, applyElection } from '../../src/lib/workflow/election.ts';

const signers = ['demo-1', 'demo-2', 'demo-3'];
const evidenceHash = 'a'.repeat(64);
function command(state, type, fields = {}) {
  return { id: `command-${state.revision}`, type, expectedRevision: state.revision, ...fields };
}
function advance(state, type, fields = {}) {
  const result = applyElection(state, command(state, type, fields));
  assert.equal(result.ok, true, result.error);
  assert.match(result.message, /デモ/);
  return result.state;
}
function rejected(state, action, error) {
  const snapshot = structuredClone(state);
  const result = applyElection(state, action);
  assert.equal(result.ok, false);
  assert.equal(result.error, error);
  assert.strictEqual(result.state, state);
  assert.deepEqual(state, snapshot, 'a rejection must be atomic');
  return result;
}
function reserved() {
  return advance(advance(createDemoElection(), 'contract'), 'reserve');
}
function submitted() { return advance(reserved(), 'bank-submit'); }
function objection(state, fields = {}) {
  return command(state, 'objection', { evidenceHash, reason: 'election-invalid', signers,
    proof: 'demo-bound-evidence', ...fields });
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

// RED was executed before the implementation using the NOT_IMPLEMENTED reducer.
// The loser-withdraw test failed on its first real application operation.
test('fixture fixes A selected / B lost at FINAL D21, with no bank execution', () => {
  const state = createDemoElection();
  assert.equal(state.mode, 'demo');
  assert.equal(state.revision, 0);
  assert.equal(state.day, 21);
  assert.equal(state.selectedCandidateId, 'A');
  assert.deepEqual(state.candidates, { A: { active: true }, B: { active: true } });
  assert.deepEqual([state.contracted, state.held, state.paid, state.reserved, state.unknown],
    [false, false, false, false, false]);
  assert.equal(state.final.status, 'FINAL');
  assert.equal(state.final.day, 21);
  assert.equal(state.bankStatus, 'NOT_SUBMITTED');
  assert.deepEqual(state.history, []);
  const other = createDemoElection();
  state.candidates.A.active = false;
  assert.equal(other.candidates.A.active, true, 'fixtures must not share nested state');
});

for (const type of ['candidate-withdraw', 'candidate-revoke']) {
  test(`loser ${type}: history only, A contract and bank execution continue`, () => {
    const original = createDemoElection();
    let state = advance(original, type, { candidateId: 'B', day: 22 });
    assert.equal(state.candidates.B.active, false);
    assert.equal(state.candidates.A.active, true);
    assert.equal(state.held, false);
    assert.equal(state.history.length, 1);
    assert.equal(state.history[0].candidateId, 'B');
    assert.equal(state.history[0].type, type);
    assert.deepEqual(state.final, original.final);
    state = advance(advance(advance(state, 'contract'), 'reserve'), 'bank-submit');
    state = advance(state, 'bank-confirm', { result: 'completed' });
    assert.equal(state.paid, true);
    assert.equal(original.candidates.B.active, true);
  });
  test(`winner ${type}: hold blocks contract, reservation, and unsubmitted bank execution`, () => {
    const original = reserved();
    const state = advance(original, type, { candidateId: 'A', day: 22 });
    assert.equal(state.held, true);
    assert.equal(state.candidates.A.active, false);
    assert.equal(state.reserved, true);
    assert.equal(state.contracted, true);
    assert.equal(state.bankStatus, 'RESERVED');
    assert.deepEqual(state.final, original.final);
    rejected(state, command(state, 'contract'), 'CONTRACT_ON_HOLD');
    rejected(state, command(state, 'reserve'), 'SPENDING_ON_HOLD');
    rejected(state, command(state, 'bank-submit'), 'BANK_EXECUTION_ON_HOLD');
  });
  test(`bank completed before winner ${type}: no rollback of paid or FINAL`, () => {
    const original = advance(submitted(), 'bank-confirm', { result: 'completed' });
    const state = advance(original, type, { candidateId: 'A', day: 22 });
    assert.equal(state.paid, true);
    assert.equal(state.reserved, false);
    assert.equal(state.bankStatus, 'COMPLETED');
    assert.deepEqual(state.final, original.final);
    rejected(state, command(state, 'reserve'), 'SPENDING_ON_HOLD');
  });
  test(`bank submitted before winner ${type}: later completed reconciliation is recorded despite hold`, () => {
    let state = advance(submitted(), type, { candidateId: 'A', day: 22 });
    state = advance(state, 'bank-confirm', { result: 'completed' });
    assert.equal(state.held, true);
    assert.equal(state.paid, true);
    assert.equal(state.reserved, false);
    assert.equal(state.bankStatus, 'COMPLETED');
  });
  test(`loser ${type} after payment preserves past bank state and does not hold`, () => {
    const original = advance(submitted(), 'bank-confirm', { result: 'completed' });
    const state = advance(original, type, { candidateId: 'B', day: 22 });
    assert.equal(state.paid, true);
    assert.equal(state.bankStatus, 'COMPLETED');
    assert.equal(state.held, false);
    assert.deepEqual(state.final, original.final);
  });
}

test('reservation -> loser withdrawal -> submit uses latest candidate state and succeeds', () => {
  const state = advance(reserved(), 'candidate-withdraw', { candidateId: 'B', day: 22 });
  assert.equal(advance(state, 'bank-submit').bankStatus, 'SUBMITTED');
});
test('UNKNOWN preserves reservation and requires reconciliation, never another submission', () => {
  const original = submitted();
  let state = advance(original, 'bank-unknown');
  assert.equal(state.bankStatus, 'UNKNOWN');
  assert.equal(state.unknown, true);
  assert.equal(state.reserved, true);
  assert.equal(state.paid, false);
  rejected(state, command(state, 'bank-submit'), 'UNKNOWN_REQUIRES_RECONCILIATION');
  rejected(state, command(state, 'reserve'), 'RESERVATION_EXISTS');
  state = advance(state, 'candidate-revoke', { candidateId: 'A', day: 22 });
  assert.equal(state.unknown, true);
  assert.equal(state.reserved, true);
  state = advance(state, 'bank-confirm', { result: 'completed' });
  assert.equal(state.paid, true);
  assert.equal(state.unknown, false);
  assert.equal(state.reserved, false);
  assert.equal(state.held, true);
});
test('UNKNOWN -> not-sent resolves uncertainty but retains obligation, hold forbids retry', () => {
  let state = advance(submitted(), 'bank-unknown');
  state = advance(state, 'candidate-withdraw', { candidateId: 'A', day: 22 });
  state = advance(state, 'bank-confirm', { result: 'not-sent' });
  assert.equal(state.bankStatus, 'NOT_SENT');
  assert.equal(state.reserved, true);
  assert.equal(state.unknown, false);
  assert.equal(state.paid, false);
  rejected(state, command(state, 'bank-submit'), 'BANK_EXECUTION_ON_HOLD');
});
test('not-sent terminal demo result permits retry only while unheld, with no duplicate reservation', () => {
  let state = advance(submitted(), 'bank-confirm', { result: 'not-sent' });
  rejected(state, command(state, 'reserve'), 'RESERVATION_EXISTS');
  state = advance(state, 'bank-submit');
  state = advance(state, 'bank-confirm', { result: 'completed' });
  assert.equal(state.paid, true);
});
test('completed bank result cannot be replaced or executed a second time', () => {
  const state = advance(submitted(), 'bank-confirm', { result: 'completed' });
  rejected(state, command(state, 'bank-submit'), 'BANK_ALREADY_COMPLETED');
  rejected(state, command(state, 'bank-confirm', { result: 'not-sent' }), 'BANK_NOT_PENDING');
  rejected(state, command(state, 'bank-unknown'), 'BANK_NOT_SUBMITTED');
  rejected(state, command(state, 'reserve'), 'BANK_ALREADY_COMPLETED');
});
for (const [type, fields, error] of [
  ['reserve', {}, 'CONTRACT_REQUIRED'],
  ['bank-submit', {}, 'RESERVATION_REQUIRED'],
  ['bank-confirm', { result: 'completed' }, 'BANK_NOT_PENDING'],
  ['bank-unknown', {}, 'BANK_NOT_SUBMITTED'],
]) {
  test(`invalid bank/contract order ${type} rejects atomically`, () => {
    const state = createDemoElection();
    rejected(state, command(state, type, fields), error);
  });
}
test('second contract is rejected rather than overwriting the original contract', () => {
  const state = advance(createDemoElection(), 'contract');
  rejected(state, command(state, 'contract'), 'CONTRACT_ALREADY_EXISTS');
});
test('submitted instruction cannot be submitted again or reserved twice', () => {
  const state = submitted();
  rejected(state, command(state, 'bank-submit'), 'BANK_ALREADY_SUBMITTED');
  rejected(state, command(state, 'reserve'), 'RESERVATION_EXISTS');
});

test('bound demo evidence and independent 3/5 accept unresolved election objection', () => {
  const original = reserved();
  const result = applyElection(original, objection(original));
  assert.equal(result.ok, true, result.error);
  const state = result.state;
  assert.equal(state.held, true);
  assert.equal(state.history.at(-1).type, 'objection');
  assert.equal(state.history.at(-1).evidenceHash, evidenceHash);
  assert.deepEqual(state.final, original.final);
  assert.equal(state.reserved, true);
  rejected(state, command(state, 'contract'), 'CONTRACT_ON_HOLD');
  rejected(state, command(state, 'reserve'), 'SPENDING_ON_HOLD');
  rejected(state, command(state, 'bank-submit'), 'BANK_EXECUTION_ON_HOLD');
});
test('accepted objection after UNKNOWN permits terminal reconciliation and preserves FINAL', () => {
  const original = advance(submitted(), 'bank-unknown');
  const accepted = applyElection(original, objection(original));
  assert.equal(accepted.ok, true);
  const state = advance(accepted.state, 'bank-confirm', { result: 'completed' });
  assert.equal(state.held, true);
  assert.equal(state.paid, true);
  assert.deepEqual(state.final, original.final);
});
test('accepted objection after completion preserves paid', () => {
  const original = advance(submitted(), 'bank-confirm', { result: 'completed' });
  const result = applyElection(original, objection(original));
  assert.equal(result.ok, true);
  assert.equal(result.state.paid, true);
  assert.equal(result.state.held, true);
  assert.deepEqual(result.state.final, original.final);
});
for (const [label, fields, error] of [
  ['simple withdrawal reason', { reason: 'candidate-withdraw' }, 'INVALID_EVIDENCE'],
  ['withdrawal proof', { proof: 'demo-candidate-withdraw' }, 'INVALID_EVIDENCE'],
  ['empty evidence', { evidenceHash: '' }, 'INVALID_EVIDENCE'],
  ['not a hash', { evidenceHash: 'candidate B withdrew' }, 'INVALID_EVIDENCE'],
  ['wrong evidence type', { evidenceHash: 42 }, 'INVALID_EVIDENCE'],
  ['two signers', { signers: ['demo-1', 'demo-2'] }, 'QUORUM_REQUIRED'],
  ['duplicate signers', { signers: ['demo-1', 'demo-1', 'demo-3'] }, 'QUORUM_REQUIRED'],
  ['foreign signer', { signers: ['demo-1', 'demo-2', 'B'] }, 'QUORUM_REQUIRED'],
  ['wrong signers type', { signers: 'demo-1,demo-2,demo-3' }, 'QUORUM_REQUIRED'],
]) {
  test(`objection rejects ${label} without consuming command id or holding contract`, () => {
    const state = createDemoElection();
    rejected(state, objection(state, fields), error);
    assert.equal(advance(state, 'contract').held, false);
  });
}
test('valid five distinct demo signers are accepted', () => {
  const state = createDemoElection();
  assert.equal(applyElection(state, objection(state, {
    signers: ['demo-1', 'demo-2', 'demo-3', 'demo-4', 'demo-5'],
  })).ok, true);
});

for (const day of [20, -1, 21.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '22']) {
  test(`invalid fixture time ${String(day)} rejects atomically`, () => {
    const state = createDemoElection();
    rejected(state, command(state, 'candidate-withdraw', { candidateId: 'B', day }), 'INVALID_DAY');
  });
}
test('signed-time fixture is monotonic: D25 then D22 rejected, same D25 accepted', () => {
  const state = advance(createDemoElection(), 'candidate-withdraw', { candidateId: 'B', day: 25 });
  rejected(state, command(state, 'candidate-revoke', { candidateId: 'A', day: 22 }), 'INVALID_DAY');
  const next = advance(state, 'candidate-revoke', { candidateId: 'A', day: 25 });
  assert.equal(next.day, 25);
  assert.equal(next.history.length, 2);
});
test('unknown candidate id rejects without mutating final', () => {
  const state = createDemoElection();
  rejected(state, command(state, 'candidate-withdraw', { candidateId: 'C', day: 22 }), 'INVALID_CANDIDATE');
});

const actionFixtures = [
  ['candidate-withdraw', { candidateId: 'B', day: 22 }],
  ['candidate-revoke', { candidateId: 'A', day: 22 }],
  ['contract', {}], ['reserve', {}], ['bank-submit', {}],
  ['bank-confirm', { result: 'completed' }], ['bank-unknown', {}],
  ['objection', { evidenceHash, reason: 'election-invalid', proof: 'demo-bound-evidence', signers }],
];
for (const [type, fields] of actionFixtures) {
  test(`${type} rejects extra and missing keys before transitions`, () => {
    const state = createDemoElection();
    rejected(state, command(state, type, { ...fields, unexpected: true }), 'INVALID_COMMAND');
    const missing = command(state, type, fields);
    delete missing.type;
    rejected(state, missing, 'INVALID_COMMAND');
    if (Object.keys(fields).length) {
      const missingPayload = command(state, type, fields);
      delete missingPayload[Object.keys(fields)[0]];
      rejected(state, missingPayload, 'INVALID_COMMAND');
    }
  });
  test(`production gate forbids ${type}, including otherwise malformed commands`, () => {
    const state = { ...createDemoElection(), mode: 'production' };
    rejected(state, command(state, type, fields), 'PRODUCTION_GATE_CLOSED');
  });
}
test('unknown command and invalid bank result reject atomically', () => {
  const state = createDemoElection();
  rejected(state, command(state, 'release-reservation'), 'INVALID_COMMAND');
  rejected(state, command(state, 'bank-confirm', { result: 'pending' }), 'INVALID_BANK_RESULT');
});
test('null command is rejected without exposing an exception', () => {
  const state = createDemoElection();
  rejected(state, null, 'INVALID_COMMAND');
});
test('replay returns the original receipt even after later revisions and hold; no additional audit/history', () => {
  let state = createDemoElection();
  const action = command(state, 'candidate-withdraw', { candidateId: 'B', day: 22 });
  const first = applyElection(state, action);
  assert.equal(first.ok, true);
  state = advance(first.state, 'candidate-revoke', { candidateId: 'A', day: 23 });
  const replay = applyElection(state, { ...action });
  assert.equal(replay.ok, true);
  assert.strictEqual(replay.state, state);
  assert.equal(replay.message, first.message);
  assert.equal(state.revision, 2);
  assert.equal(state.history.length, 2);
  assert.equal(state.audit.length, 2);
});
test('same command id with changed payload is rejected before stale-version checking', () => {
  const initial = createDemoElection();
  const action = command(initial, 'candidate-withdraw', { candidateId: 'B', day: 22 });
  const state = applyElection(initial, action).state;
  rejected(state, { ...action, candidateId: 'A' }, 'IDEMPOTENCY_CONFLICT');
  rejected(state, { ...action, expectedRevision: state.revision }, 'IDEMPOTENCY_CONFLICT');
});
test('stale and unsafe revisions reject, failed command id remains reusable', () => {
  const state = advance(createDemoElection(), 'contract');
  rejected(state, command(state, 'reserve', { expectedRevision: 0 }), 'STATE_CONFLICT');
  rejected(state, command(state, 'reserve', { expectedRevision: 1.5 }), 'STATE_CONFLICT');
  rejected(state, command(state, 'reserve', { expectedRevision: '1' }), 'STATE_CONFLICT');
  assert.equal(advance(state, 'reserve').reserved, true);
});
test('completed receipt replay after hold does not submit new bank operation', () => {
  const original = submitted();
  const action = command(original, 'bank-confirm', { result: 'completed' });
  const result = applyElection(original, action);
  const state = advance(result.state, 'candidate-withdraw', { candidateId: 'A', day: 22 });
  const replay = applyElection(state, action);
  assert.equal(replay.ok, true);
  assert.strictEqual(replay.state, state);
  assert.equal(state.paid, true);
});
test('production gate also blocks valid receipt replay', () => {
  const original = createDemoElection();
  const action = command(original, 'contract');
  const state = { ...applyElection(original, action).state, mode: 'production' };
  rejected(state, action, 'PRODUCTION_GATE_CLOSED');
});
test('prototype-like command ids are rejected atomically by the shared input contract', () => {
  const state = createDemoElection();
  for (const id of ['__proto__', 'prototype', 'constructor']) {
    rejected(state, command(state, 'contract', { id }), 'INVALID_COMMAND');
  }
});
test('deep-frozen state and command are supported, input remains unchanged on success', () => {
  const state = freeze(createDemoElection());
  const snapshot = structuredClone(state);
  const action = freeze(command(state, 'candidate-withdraw', { candidateId: 'B', day: 22 }));
  const result = applyElection(state, action);
  assert.equal(result.ok, true, result.error);
  assert.notStrictEqual(result.state, state);
  assert.deepEqual(state, snapshot);
  assert.equal(result.state.audit.length, 1);
  assert.equal(result.state.receipts[action.id].message, result.message);
});
