import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogModel, DAY, HOUR, PANEL, THREE } from './catalog.mjs';

// Fixtures assert semantic relations; these tests measure neither AI quality nor
// cryptography, reviewer independence in the real world, or live consensus/CAS.
const T = 7 * DAY;
const unrelated = (ids) => Object.fromEntries(ids.map((id) => [id,
  Object.fromEntries(ids.filter((other) => other !== id).map((other) => [other, 'unrelated'])),
]));
function setup(ids = ['P', 'S'], relations = unrelated(ids)) {
  const model = createCatalogModel({ relations });
  for (const id of ids) {
    assert.equal(model.approve(id), 'PROVISIONAL_APPROVED');
    assert.equal(model.ready(id, T), 'FINALIZATION_WAIT');
  }
  return model;
}
function resign(model, id, now, reviewers = THREE) {
  assert.equal(model.reconcile(id, now), 'UNRELATED');
  return model.resign(id, { now, reviewers, payload: model.reconciliationPayload(id) });
}
function reconcileAndSign(model, id, now, reviewers = THREE) {
  assert.equal(model.beginReconciliation(id, now), 'RECONCILING');
  assert.equal(resign(model, id, now, reviewers), 'FINALIZATION_WAIT');
}
function pending() {
  const model = setup();
  assert.equal(model.finalize('P', 0, T), 'FINAL_NEW');
  assert.equal(model.beginReconciliation('S', T + 1), 'RECONCILING');
  return model;
}

test('CASE-09: unrelated P/Q/R/S finalize after S encounters three conflicts', () => {
  const model = setup(['P', 'Q', 'R', 'S']);
  assert.equal(model.finalize('P', 0, T), 'FINAL_NEW');
  assert.equal(model.finalize('S', 0, T + 1), 'CATALOG_CONFLICT');
  assert.equal(model.beginReconciliation('S', T + 1), 'RECONCILING');
  assert.equal(model.reconcile('S', T + 1), 'UNRELATED');
  reconcileAndSign(model, 'Q', T + 2);
  assert.equal(model.finalize('Q', 1, T + 2), 'FINAL_NEW');
  assert.equal(model.finalize('S', 0, T + 3), 'CATALOG_CONFLICT');
  assert.equal(model.beginReconciliation('S', T + 3), 'RECONCILING');
  assert.equal(model.reconcile('S', T + 3), 'UNRELATED');
  reconcileAndSign(model, 'R', T + 4);
  assert.equal(model.finalize('R', 2, T + 4), 'FINAL_NEW');
  assert.equal(model.finalize('S', 0, T + 5), 'CATALOG_CONFLICT');
  assert.equal(model.beginReconciliation('S', T + 5), 'RECONCILING',
    'unrelated third conflict must not expire S');
  assert.equal(resign(model, 'S', T + 6, PANEL.slice(2)), 'FINALIZATION_WAIT');
  assert.equal(model.finalize('S', 3, T + 6), 'FINAL_NEW');
  const snapshot = model.snapshot();
  assert.equal(snapshot.version, 4);
  assert.deepEqual(snapshot.entries.map((entry) => entry.eventId), ['P', 'Q', 'R', 'S']);
  assert.deepEqual(snapshot.entries.map((entry) => entry.version), [1, 2, 3, 4]);
  const s = snapshot.proposals.S;
  assert.equal(s.conflicts, 3);
  assert.equal(s.reconciliationStartedAt, null);
  assert.equal(s.firstReadyAt, T);
  assert.equal(s.objectionOpenedAt, 0);
  assert.equal(s.roundExpiresAt, 12 * DAY);
  assert.deepEqual(s.reconciliationRecords[0], {
    proposalId: 'S', proposalVersion: 1, round: 1,
    contentHash: 'fixture-content:S', candidateHash: 'fixture-candidates:S', conclusion: 'NEW',
    fromVersion: 0, toVersion: 3, diffHash: 'fixture-diff:S:0-3',
    reason: 'fixture-confirmed-unrelated', reviewers: PANEL.slice(2),
    startedAt: T + 1, signedAt: T + 6, expiresAt: T + 6 + 48 * HOUR,
  });
});

test('CASE-08: stale CAS leaves all proposal states, eventIds and catalog unchanged', () => {
  const model = setup(['P', 'Q']);
  assert.equal(model.finalize('P', 0, T), 'FINAL_NEW');
  const before = model.snapshot();
  assert.equal(model.finalize('Q', 0, T), 'CATALOG_CONFLICT');
  assert.deepEqual(model.snapshot(), before);
  assert.equal(model.finalize('Q', 1, T), 'LATEST_THREE_SIGNATURES_REQUIRED');
  assert.deepEqual(model.snapshot(), before);
  reconcileAndSign(model, 'Q', T + 1);
  assert.equal(model.finalize('Q', 1, T + 1), 'FINAL_NEW');
});

test('CAS rejection precedes even expiry and remains mutation-free', () => {
  const model = pending();
  const before = model.snapshot();
  assert.equal(model.finalize('S', 0, 13 * DAY), 'CATALOG_CONFLICT');
  assert.deepEqual(model.snapshot(), before);
});

test('unclassified update stays pending and cannot obtain signatures or finalize', () => {
  const model = setup(['P', 'S'], {});
  model.finalize('P', 0, T);
  model.beginReconciliation('S', T + 1);
  assert.equal(model.reconcile('S', T + 1), 'UNCLASSIFIED_UPDATE');
  assert.equal(model.resign('S', { now: T + 1, reviewers: THREE, payload: {} }), 'UNCLASSIFIED_UPDATE');
  assert.equal(model.finalize('S', 1, T + 1), 'LATEST_THREE_SIGNATURES_REQUIRED');
  assert.equal(model.snapshot().proposals.S.state, 'RECONCILING');
  assert.equal(model.snapshot().version, 1);
});

for (const classification of ['duplicate', 'candidate-change', 'comparison-change', 'identity-change']) {
  test(`${classification} requires a new proposal, round, signatures and objection window`, () => {
    const model = setup(['P', 'S'], { S: { P: classification } });
    model.finalize('P', 0, T);
    model.beginReconciliation('S', T + 1);
    assert.equal(model.reconcile('S', T + 1), 'NEW_PROPOSAL_AND_ROUND_REQUIRED');
    assert.equal(model.finalize('S', 1, T + 1), 'NOT_READY');
    assert.equal(model.resign('S', { now: T + 1, reviewers: THREE, payload: {} }), 'NOT_RECONCILING');
    const fresh = { proposalVersion: 2, round: 2, conclusion: 'LINK(P)',
      candidateHash: 'fixture-new-candidates:S', approvedAt: T + 2, reviewers: PANEL.slice(2) };
    assert.equal(model.startNewRound('S', { ...fresh, proposalVersion: 1 }), 'NEW_PROPOSAL_AND_ROUND_REQUIRED');
    assert.equal(model.startNewRound('S', { ...fresh, round: 1 }), 'NEW_PROPOSAL_AND_ROUND_REQUIRED');
    assert.equal(model.startNewRound('S', { ...fresh, reviewers: undefined }), 'NEW_ROUND_SIGNATURES_REQUIRED');
    assert.equal(model.startNewRound('S', fresh), 'PROVISIONAL_APPROVED');
    const next = model.snapshot().proposals.S;
    assert.equal(next.previousRounds[0].state, 'NEEDS_CHANGE');
    assert.equal(next.previousRounds[0].roundExpiresAt, 12 * DAY);
    assert.equal(next.firstReadyAt, null);
    assert.equal(next.objectionOpenedAt, T + 2);
    assert.equal(next.reconciliationRecords.length, 0);
    assert.equal(model.ready('S', T + 3), 'OBJECTION_OPEN');
    assert.equal(model.finalize('S', 1, T + 3), 'OBJECTION_OPEN');
    assert.equal(model.ready('S', next.objectionClosesAt), 'FINALIZATION_WAIT');
    assert.equal(model.finalize('S', 1, next.objectionClosesAt), 'FINAL_LINKED');
    assert.equal(model.snapshot().proposals.S.eventId, 'P');
    assert.equal(model.snapshot().version, 2);
  });
}

test('even fresh NEW-round signatures cannot finalize a fixture-classified true duplicate', () => {
  const model = setup(['P', 'S'], { S: { P: 'duplicate' } });
  model.finalize('P', 0, T);
  model.beginReconciliation('S', T + 1);
  model.reconcile('S', T + 1);
  assert.equal(model.startNewRound('S', { proposalVersion: 2, round: 2,
    conclusion: 'NEW', approvedAt: T + 2, reviewers: THREE }), 'PROVISIONAL_APPROVED');
  const now = T + 2 + 7 * DAY;
  model.ready('S', now);
  const before = model.snapshot();
  assert.equal(model.finalize('S', 1, now), 'TRUE_DUPLICATE_NEW_FORBIDDEN');
  assert.deepEqual(model.snapshot(), before);
});

test('known true duplicate is not masked by another unclassified update', () => {
  const model = setup(['P', 'Q', 'S'], { Q: { P: 'unrelated' }, S: { P: 'duplicate' } });
  model.finalize('P', 0, T);
  reconcileAndSign(model, 'Q', T + 1);
  model.finalize('Q', 1, T + 1);
  model.beginReconciliation('S', T + 2);
  assert.equal(model.reconcile('S', T + 2), 'NEW_PROPOSAL_AND_ROUND_REQUIRED');
  assert.equal(model.finalize('S', 2, T + 2), 'NOT_READY');
});

for (const field of ['proposalVersion', 'round', 'contentHash', 'candidateHash', 'conclusion', 'toVersion', 'diffHash', 'reason']) {
  test(`unrelated re-signature cannot change bound ${field}`, () => {
    const model = pending();
    model.reconcile('S', T + 2);
    const before = model.snapshot();
    const payload = model.reconciliationPayload('S');
    payload[field] = typeof payload[field] === 'number' ? payload[field] + 1 : 'changed';
    assert.equal(model.resign('S', { now: T + 2, reviewers: THREE, payload }), 'IMMUTABLE_DECISION_MISMATCH');
    assert.deepEqual(model.snapshot(), before);
  });
}

for (const [label, reviewers] of [
  ['two reviewers', THREE.slice(0, 2)],
  ['duplicate IDs', [THREE[0], THREE[0], THREE[1]]],
  ['different panel', [...THREE.slice(0, 2), 'synthetic-outsider']],
]) {
  test(`${label} do not meet independent three-of-five synthetic quorum`, () => {
    const model = pending();
    model.reconcile('S', T + 2);
    const before = model.snapshot();
    assert.equal(model.resign('S', { now: T + 2, reviewers,
      payload: model.reconciliationPayload('S') }), 'INSUFFICIENT_INDEPENDENT_REVIEWERS');
    assert.deepEqual(model.snapshot(), before);
  });
}

test('a newer unrelated catalog requires a fresh latest-version three-person attestation', () => {
  const model = setup(['P', 'Q', 'S']);
  model.finalize('P', 0, T);
  model.beginReconciliation('S', T + 1);
  model.reconcile('S', T + 1);
  const oldPayload = model.reconciliationPayload('S');
  reconcileAndSign(model, 'Q', T + 2);
  model.finalize('Q', 1, T + 2);
  const before = model.snapshot();
  assert.equal(model.resign('S', { now: T + 3, reviewers: THREE, payload: oldPayload }), 'CATALOG_CONFLICT');
  assert.deepEqual(model.snapshot(), before);
  assert.equal(model.finalize('S', 2, T + 3), 'LATEST_THREE_SIGNATURES_REQUIRED');
  assert.equal(resign(model, 'S', T + 4), 'FINALIZATION_WAIT');
  assert.equal(model.finalize('S', 2, T + 4), 'FINAL_NEW');
});

test('completed reconciliation permits a new cycle beyond the first 48h within current signature expiry', () => {
  const model = setup(['P', 'Q', 'S']);
  model.finalize('P', 0, T);
  model.beginReconciliation('S', T);
  assert.equal(resign(model, 'S', 8 * DAY), 'FINALIZATION_WAIT');
  const firstSigned = model.snapshot().proposals.S;
  assert.equal(firstSigned.signatureExpiresAt, 10 * DAY);
  reconcileAndSign(model, 'Q', 9 * DAY + 1);
  assert.equal(model.finalize('Q', 1, 9 * DAY + 1), 'FINAL_NEW');
  assert.equal(model.beginReconciliation('S', 9 * DAY + 2), 'RECONCILING');
  assert.equal(model.snapshot().proposals.S.signatureExpiresAt, firstSigned.signatureExpiresAt);
  assert.equal(model.reconcile('S', 9 * DAY + 2), 'UNRELATED',
    'a completed first 48-hour cycle must not expire the separate second cycle');
  assert.equal(model.snapshot().proposals.S.reconciliationStartedAt, 9 * DAY + 2);
  assert.equal(model.resign('S', { now: 9 * DAY + 3, reviewers: THREE,
    payload: model.reconciliationPayload('S') }), 'FINALIZATION_WAIT');
  const secondSigned = model.snapshot().proposals.S;
  assert.equal(secondSigned.reconciliationStartedAt, null);
  assert.deepEqual(secondSigned.reconciliationRecords.map((record) => record.startedAt), [T, 9 * DAY + 2]);
  assert.equal(secondSigned.firstReadyAt, T);
  assert.equal(secondSigned.objectionOpenedAt, 0);
  assert.equal(secondSigned.objectionClosesAt, T);
  assert.equal(secondSigned.roundExpiresAt, 12 * DAY);
  assert.equal(model.finalize('S', 2, 9 * DAY + 3), 'FINAL_NEW');
});

for (const offset of [-1, 0]) {
  test(`reconciliation signatures at start+48h${offset === -1 ? '-1s succeed' : ' expire'}`, () => {
    const model = pending();
    const now = T + 1 + 48 * HOUR + offset;
    if (offset === -1) {
      assert.equal(resign(model, 'S', now), 'FINALIZATION_WAIT');
      assert.equal(model.finalize('S', 1, now), 'FINAL_NEW');
    } else {
      assert.equal(model.reconcile('S', now), 'REVIEW_EXPIRED');
      assert.equal(model.snapshot().version, 1);
    }
  });
  test(`dedicated re-signature at signedAt+48h${offset === -1 ? '-1s succeeds' : ' expires'}`, () => {
    const model = pending();
    const signedAt = T + 2;
    assert.equal(resign(model, 'S', signedAt), 'FINALIZATION_WAIT');
    assert.equal(model.finalize('S', 1, signedAt + 48 * HOUR + offset),
      offset === -1 ? 'FINAL_NEW' : 'REVIEW_EXPIRED');
  });
  test(`original 12-day cap${offset === -1 ? '-1s succeeds' : ' expires'} despite late re-signature`, () => {
    const model = setup();
    model.finalize('P', 0, 11 * DAY);
    model.beginReconciliation('S', 11 * DAY + 1);
    assert.equal(resign(model, 'S', 11 * DAY + 2), 'FINALIZATION_WAIT');
    assert.equal(model.snapshot().proposals.S.signatureExpiresAt, 12 * DAY);
    assert.equal(model.finalize('S', 1, 12 * DAY + offset),
      offset === -1 ? 'FINAL_NEW' : 'REVIEW_EXPIRED');
  });
}

test('a new unrelated reconciliation cycle does not extend existing signature expiry, objection or 12-day cap', () => {
  const model = setup(['P', 'Q', 'S']);
  model.finalize('P', 0, T);
  reconcileAndSign(model, 'S', T + 1);
  const signed = model.snapshot().proposals.S;
  reconcileAndSign(model, 'Q', T + 2);
  // Q has earlier proposalId rank at the same first-ready timestamp.
  assert.equal(model.finalize('Q', 1, T + 2), 'FINAL_NEW');
  assert.equal(model.beginReconciliation('S', T + 3), 'RECONCILING');
  assert.equal(model.reconcile('S', T + 3), 'UNRELATED');
  const after = model.snapshot().proposals.S;
  assert.equal(signed.reconciliationStartedAt, null);
  assert.equal(after.reconciliationStartedAt, T + 3);
  for (const key of ['signatureExpiresAt', 'objectionOpenedAt', 'objectionClosesAt', 'roundExpiresAt']) {
    assert.equal(after[key], signed[key]);
  }
  assert.equal(model.finalize('S', 2, T + 3), 'LATEST_THREE_SIGNATURES_REQUIRED');
  assert.equal(model.reconcile('S', signed.signatureExpiresAt), 'REVIEW_EXPIRED');
  assert.equal(model.snapshot().version, 2);
});

test('unrelated versions during one unsigned reconciliation do not restart its 48-hour clock', () => {
  const model = setup(['P', 'Q', 'S']);
  model.finalize('P', 0, T);
  model.beginReconciliation('S', T + 1);
  reconcileAndSign(model, 'Q', T + 47 * HOUR);
  model.finalize('Q', 1, T + 47 * HOUR);
  model.beginReconciliation('S', T + 47 * HOUR + 1);
  assert.equal(model.snapshot().proposals.S.reconciliationStartedAt, T + 1);
  assert.equal(model.reconcile('S', T + 1 + 48 * HOUR), 'REVIEW_EXPIRED');
});

test('first readiness rank survives reconciliation and prevents later ready overtaking', () => {
  const model = createCatalogModel({ relations: unrelated(['P', 'Q', 'S']) });
  for (const id of ['P', 'Q', 'S']) model.approve(id);
  model.ready('P', T);
  model.ready('S', T);
  model.ready('Q', T + 1);
  model.finalize('P', 0, T);
  reconcileAndSign(model, 'S', T + 2);
  reconcileAndSign(model, 'Q', T + 3);
  const before = model.snapshot();
  assert.equal(before.proposals.S.firstReadyAt, T);
  assert.equal(before.proposals.Q.firstReadyAt, T + 1);
  assert.equal(model.finalize('Q', 1, T + 3), 'WAIT_ORDER');
  assert.deepEqual(model.snapshot(), before);
  assert.equal(model.finalize('S', 1, T + 3), 'FINAL_NEW');
});

test('an earlier proposal awaiting re-signature can be skipped without extending its deadlines', () => {
  const model = createCatalogModel({ relations: unrelated(['P', 'Q', 'S']) });
  for (const id of ['P', 'Q', 'S']) model.approve(id);
  model.ready('P', T);
  model.ready('S', T);
  model.ready('Q', T + 1);
  model.finalize('P', 0, T);
  model.beginReconciliation('S', T + 2);
  const waiting = model.snapshot().proposals.S;
  reconcileAndSign(model, 'Q', T + 3);
  assert.equal(model.finalize('Q', 1, T + 3), 'FINAL_NEW');
  model.beginReconciliation('S', T + 4);
  const after = model.snapshot().proposals.S;
  assert.equal(after.firstReadyAt, waiting.firstReadyAt);
  assert.equal(after.reconciliationStartedAt, waiting.reconciliationStartedAt);
  assert.equal(after.roundExpiresAt, waiting.roundExpiresAt);
});

test('equal first-ready timestamps use proposalId rather than insertion order', () => {
  const model = setup(['Z', 'A']);
  const before = model.snapshot();
  assert.equal(model.finalize('Z', 0, T), 'WAIT_ORDER');
  assert.deepEqual(model.snapshot(), before);
  assert.equal(model.finalize('A', 0, T), 'FINAL_NEW');
});

test('no finalization before the original objection window closes; success is terminal', () => {
  const model = createCatalogModel();
  model.approve('P');
  assert.equal(model.ready('P', T - 1), 'OBJECTION_OPEN');
  assert.equal(model.finalize('P', 0, T - 1), 'OBJECTION_OPEN');
  assert.equal(model.snapshot().version, 0);
  assert.equal(model.ready('P', T), 'FINALIZATION_WAIT');
  assert.equal(model.finalize('P', 0, T), 'FINAL_NEW');
  const before = model.snapshot();
  assert.equal(model.finalize('P', 1, T), 'NOT_READY');
  assert.deepEqual(model.snapshot(), before);
});
