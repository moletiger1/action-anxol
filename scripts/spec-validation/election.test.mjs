import test from 'node:test';
import assert from 'node:assert/strict';
import { createElection } from './election.mjs';

// RED log from the first, deliberately legacy-only model (same command below):
// node --test scripts/spec-validation/election.test.mjs -> exit 1
// tests 1 / pass 0 / fail 1: first test's assert.doesNotThrow failed.
// Actual message: "CONTRACT_ON_HOLD". Legacy candidateEvent unconditionally held
// contracts even when B lost. This records an observed run, not an expected-fail
// test left in the final suite. Fixed model branches on selectedCandidateId.
// Scope: synthetic proofs, final time and independent P1..P5 are assumed;
// sequential calls model the bank linearization point, NOT real bank/crypto tests.

function candidateEvent(candidateId, kind = 'WITHDRAWAL', day = 22, eventId = `${candidateId}-${kind}`) {
  return { eventId, candidateId, kind, day, proof: `synthetic-${kind}-${candidateId}` };
}
function selected() {
  const model = createElection();
  model.finalize('A', 21);
  return model;
}
function objection(overrides = {}) {
  const evidenceHash = overrides.evidenceHash ?? 'synthetic-evidence';
  const reason = overrides.reason ?? 'PRE_FINAL_INELIGIBILITY';
  return { eventId: 'objection-1', electionId: 'election-1', evidenceHash, reason,
    proof: `synthetic-election-proof:election-1:${reason}:${evidenceHash}`,
    signers: ['P1', 'P2', 'P3'], ...overrides };
}
function reserved() {
  const model = selected();
  model.contract();
  model.reserve('expense-1');
  return model;
}

// Keep the original RED expectation (B withdrawal cannot stop A's new contract).
test('D+21 A selected / B lost; D+22 B withdrawal must not stop A contract', () => {
  const election = selected();
  election.candidateEvent(candidateEvent('B'));
  assert.doesNotThrow(() => election.contract(), 'loser-only withdrawal must not cause CONTRACT_ON_HOLD');
});

for (const kind of ['WITHDRAWAL', 'REVOCATION']) {
  for (const previouslyPaid of [false, true]) {
    test(`loser ${kind}, previously paid=${previouslyPaid}: history only, new A spending continues`, () => {
      const model = selected();
      const originalFinal = model.snapshot().final;
      if (previouslyPaid) {
        model.contract();
        model.reserve('past');
        model.executeBankTransfer('past');
      }
      model.candidateEvent(candidateEvent('B', kind));
      assert.equal(model.contract(), 'CONTRACTED');
      assert.equal(model.reserve('new'), 'RESERVED');
      assert.equal(model.executeBankTransfer('new'), 'PAID');
      const snapshot = model.snapshot();
      assert.equal(snapshot.held, false);
      assert.equal(snapshot.candidates.B, false);
      assert.equal(snapshot.history.length, 1);
      assert.deepEqual(snapshot.final, originalFinal);
      if (previouslyPaid) assert.equal(snapshot.disbursements.past.status, 'PAID');
    });
  }
  test(`winner ${kind}: no new contract or reservation, existing reservation/debt preserved`, () => {
    const model = reserved();
    const before = model.snapshot();
    model.candidateEvent(candidateEvent('A', kind));
    assert.throws(() => model.contract(), /CONTRACT_ON_HOLD/);
    assert.throws(() => model.reserve('new'), /SPENDING_ON_HOLD/);
    assert.throws(() => model.executeBankTransfer('expense-1'), /BANK_EXECUTION_ON_HOLD/);
    assert.throws(() => model.releaseReservation('expense-1'), /OBLIGATION_PRESERVED/);
    assert.deepEqual(model.snapshot().disbursements, before.disbursements);
    assert.deepEqual(model.snapshot().obligations, before.obligations);
    assert.deepEqual(model.snapshot().final, before.final);
  });
  test(`winner ${kind} after bank commit: paid and FINAL records never roll back`, () => {
    const model = reserved();
    model.executeBankTransfer('expense-1');
    const before = model.snapshot();
    model.candidateEvent(candidateEvent('A', kind));
    assert.throws(() => model.reserve('new'), /SPENDING_ON_HOLD/);
    assert.deepEqual(model.snapshot().disbursements, before.disbursements);
    assert.deepEqual(model.snapshot().final, before.final);
    assert.equal(model.executeBankTransfer('expense-1'), 'PAID'); // Replay, not transfer.
  });
}

test('reservation -> A revocation -> bank commit: reject and retain obligation', () => {
  const model = reserved();
  model.candidateEvent(candidateEvent('A', 'REVOCATION'));
  assert.throws(() => model.executeBankTransfer('expense-1'), /BANK_EXECUTION_ON_HOLD/);
  assert.deepEqual(model.snapshot().disbursements['expense-1'], { status: 'RESERVED', reserved: true });
  assert.deepEqual(model.snapshot().obligations, ['expense-1']);
});

test('reservation -> B withdrawal -> bank commit: latest loser event does not block bank', () => {
  const model = reserved();
  model.candidateEvent(candidateEvent('B'));
  assert.equal(model.executeBankTransfer('expense-1'), 'PAID');
});

test('bank commit -> A revocation: paid immutable, UNKNOWN reserved until reconciliation', () => {
  const model = reserved();
  model.executeBankTransfer('expense-1');
  model.reserve('uncertain');
  model.executeBankTransfer('uncertain', 'UNKNOWN');
  const before = model.snapshot();
  model.candidateEvent(candidateEvent('A', 'REVOCATION'));
  assert.deepEqual(model.snapshot().disbursements, before.disbursements);
  assert.deepEqual(model.snapshot().obligations, ['uncertain']);
  assert.throws(() => model.executeBankTransfer('uncertain'), /UNKNOWN_REQUIRES_RECONCILIATION/);
  assert.throws(() => model.releaseReservation('uncertain'), /UNKNOWN_REQUIRES_RECONCILIATION/);
  assert.equal(model.snapshot().disbursements.uncertain.reserved, true);
  assert.equal(model.snapshot().disbursements['expense-1'].status, 'PAID');
});

test('simple withdrawal signature is neither fraud evidence nor a common hold', () => {
  const model = selected();
  model.candidateEvent(candidateEvent('B'));
  const before = model.snapshot();
  assert.throws(() => model.objection(objection({ reason: 'WITHDRAWAL', proof: 'synthetic-WITHDRAWAL-B' })), /INVALID_EVIDENCE/);
  assert.deepEqual(model.snapshot(), before);
  assert.equal(model.contract(), 'CONTRACTED');
});

test('bound election evidence and independent 3/5 accepts unresolved objection, preserves past', () => {
  const model = reserved();
  model.executeBankTransfer('expense-1');
  model.reserve('unexecuted');
  const before = model.snapshot();
  model.candidateEvent(candidateEvent('B')); // Separate history event from allegation.
  assert.deepEqual(model.objection(objection()), { status: 'ACCEPTED_UNRESOLVED', held: true });
  assert.throws(() => model.contract(), /CONTRACT_ON_HOLD/);
  assert.throws(() => model.reserve('new'), /SPENDING_ON_HOLD/);
  assert.throws(() => model.executeBankTransfer('unexecuted'), /BANK_EXECUTION_ON_HOLD/);
  assert.deepEqual(model.snapshot().disbursements, before.disbursements);
  assert.deepEqual(model.snapshot().final, before.final);
  assert.deepEqual(model.snapshot().obligations, before.obligations);
  assert.equal(model.snapshot().objections.length, 1);
});

for (const [label, overrides, reason] of [
  ['2/5', { signers: ['P1', 'P2'] }, /INDEPENDENT_3_OF_5_REQUIRED/],
  ['duplicate identities', { signers: ['P1', 'P1', 'P2'] }, /INDEPENDENT_3_OF_5_REQUIRED/],
  ['candidate instead of independent signer', { signers: ['P1', 'P2', 'B'] }, /INDEPENDENT_3_OF_5_REQUIRED/],
  ['wrong election', { electionId: 'another-election' }, /WRONG_ELECTION/],
  ['no evidence', { evidenceHash: '' }, /INVALID_EVIDENCE/],
  ['no external proof', { proof: '' }, /MISSING_BOUND_PROOF/],
  ['proof bound to other evidence', { proof: 'synthetic-election-proof:election-1:PRE_FINAL_INELIGIBILITY:other' }, /MISSING_BOUND_PROOF/],
]) {
  test(`reject objection: ${label}; no hold or mutation`, () => {
    const model = selected();
    const before = model.snapshot();
    assert.throws(() => model.objection(objection(overrides)), reason);
    assert.deepEqual(model.snapshot(), before);
  });
}

test('same candidate event is idempotent; same eventId with other valid content conflicts', () => {
  const model = selected();
  const event = candidateEvent('B');
  const result = model.candidateEvent(event);
  const before = model.snapshot();
  assert.deepEqual(model.candidateEvent({ ...event }), result);
  assert.throws(() => model.candidateEvent(candidateEvent('A', 'WITHDRAWAL', 22, event.eventId)), /IDEMPOTENCY_CONFLICT/);
  assert.deepEqual(model.snapshot(), before);
});

test('objection replay is idempotent even with signer order reversed; changed evidence rejected', () => {
  const model = selected();
  const result = model.objection(objection());
  const before = model.snapshot();
  assert.deepEqual(model.objection(objection({ signers: ['P3', 'P2', 'P1'] })), result);
  assert.throws(() => model.objection(objection({ evidenceHash: 'different-evidence' })), /IDEMPOTENCY_CONFLICT/);
  assert.deepEqual(model.snapshot(), before);
});

test('rejected unsigned candidate event does not mutate or consume its eventId', () => {
  const model = selected();
  const event = candidateEvent('B');
  const before = model.snapshot();
  assert.throws(() => model.candidateEvent({ ...event, proof: '' }), /MISSING_BOUND_PROOF/);
  assert.deepEqual(model.snapshot(), before);
  assert.equal(model.candidateEvent(event).held, false);
});

for (const phase of ['OPEN', 'CLOSED']) {
  for (const kind of ['WITHDRAWAL', 'REVOCATION']) {
    test(`${phase} before FINAL, B ${kind}: whole election cancelled, fixed membership untouched`, () => {
      const model = createElection({ phase });
      const before = model.snapshot();
      model.candidateEvent(candidateEvent('B', kind, phase === 'OPEN' ? 10 : 18));
      assert.equal(model.snapshot().phase, 'CANCELLED');
      assert.equal(model.snapshot().fixedRoot, before.fixedRoot);
      assert.equal(model.snapshot().fixedN, before.fixedN);
      assert.equal(model.snapshot().final, null);
      assert.throws(() => model.finalize('A', 21), /ELECTION_NOT_FINALIZABLE/);
      assert.throws(() => model.contract(), /NOT_FINAL/);
      assert.throws(() => model.reserve('new'), /NOT_FINAL/);
    });
  }
}

test('D+22 winner loss: reject reelection past D+21, preserve FINAL and debts', () => {
  const model = reserved();
  model.candidateEvent(candidateEvent('A', 'REVOCATION'));
  const before = model.snapshot();
  assert.throws(() => model.requestReelection(22, 'election-2'), /REELECTION_SCHEDULE_EXCEEDS_DEADLINE/);
  assert.deepEqual(model.snapshot(), before);
});

test('reelection cannot fit by relaxing one day: start D+8 exceeds original full schedule', () => {
  const model = createElection();
  model.candidateEvent(candidateEvent('B', 'REVOCATION', 7));
  assert.throws(() => model.requestReelection(8, 'election-2'), /REELECTION_SCHEDULE_EXCEEDS_DEADLINE/);
  assert.deepEqual(model.requestReelection(7, 'election-2'), { nextElectionId: 'election-2', selectionDeadline: 21 });
  assert.throws(() => model.requestReelection(7, 'election-1'), /NEW_ELECTION_ID_REQUIRED/);
});

test('after D+22 loss a forged D+7 reelection start cannot rewind consensus time', () => {
  const model = selected();
  model.candidateEvent(candidateEvent('A', 'REVOCATION', 22));
  const before = model.snapshot();
  assert.throws(() => model.requestReelection(7, 'election-2'), /REELECTION_SCHEDULE_EXCEEDS_DEADLINE/);
  assert.deepEqual(model.snapshot(), before);
});

test('a fresh candidate event cannot move synthetic final time backwards', () => {
  const model = selected();
  model.candidateEvent(candidateEvent('B', 'WITHDRAWAL', 22));
  const before = model.snapshot();
  assert.throws(() => model.candidateEvent(candidateEvent('A', 'REVOCATION', 21)), /NON_MONOTONIC_SYNTHETIC_TIME/);
  assert.deepEqual(model.snapshot(), before);
  // Previously committed old event replay still returns its receipt without rewinding state.
  model.candidateEvent(candidateEvent('B', 'WITHDRAWAL', 22));
  assert.deepEqual(model.snapshot(), before);
});

test('final selection past D+21 is rejected rather than extending the deadline', () => {
  const model = createElection({ phase: 'CLOSED' });
  assert.throws(() => model.finalize('A', 22), /SELECTION_DEADLINE/);
  assert.equal(model.snapshot().final, null);
});
