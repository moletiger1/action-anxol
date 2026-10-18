import test from 'node:test';
import assert from 'node:assert/strict';
// Import the actual Next application reducer, not a copied synthetic validator.
import { createDemoCatalog, applyCatalog } from '../../src/lib/workflow/catalog.ts';

const DAY = 86400;
const D7 = 7 * DAY;
const HOURS48 = 2 * DAY;
const SIGNERS = ['demo-1', 'demo-2', 'demo-3'];
let serial = 0;
function action(state, type, proposalId, fields = {}) {
  return { id: `catalog-${++serial}`, type, expectedRevision: state.revision, proposalId, now: state.now, ...fields };
}
function run(state, type, proposalId, fields = {}) {
  const command = action(state, type, proposalId, fields);
  const before = structuredClone(state);
  const result = applyCatalog(state, command);
  assert.deepEqual(state, before, 'input state must remain immutable');
  assert.equal(result.ok, true, result.error);
  assert.match(result.message, /[ぁ-んァ-ン一-龠]/, 'public successes are Japanese');
  return result.state;
}
function refused(state, command, code) {
  const before = structuredClone(state);
  const result = applyCatalog(state, command);
  assert.equal(result.ok, false);
  assert.equal(result.error, code);
  assert.strictEqual(result.state, state);
  assert.deepEqual(state, before, 'rejected commands are fully atomic');
  return result;
}
function finalize(state, id, now = state.now) {
  return run(state, 'finalize', id, { expectedCatalogVersion: state.catalogVersion, now });
}
function begin(state, id, now = state.now) { return run(state, 'begin-reconcile', id, { now }); }
function reconcile(state, id, now = state.now, relation = 'unrelated', signers = SIGNERS) {
  return run(state, 'reconcile', id, { relation, signers, now });
}

test('D7 fixture has objection-complete 3/5 approvals at catalog version zero and original D12 cap', () => {
  const state = createDemoCatalog();
  assert.equal(state.mode, 'demo');
  assert.equal(state.now, D7);
  assert.equal(state.catalogVersion, 0);
  assert.equal(state.revision, 0);
  assert.deepEqual(Object.keys(state.proposals), ['P', 'Q', 'R', 'S']);
  for (const proposal of Object.values(state.proposals)) {
    assert.equal(proposal.status, 'FINALIZATION_WAIT');
    assert.equal(proposal.signedVersion, 0);
    assert.equal(proposal.firstReadyAt, D7);
    assert.equal(proposal.signatureExpiresAt, 12 * DAY);
    assert.equal(proposal.deadline, 12 * DAY);
    assert.equal(proposal.reconciliationStartedAt, null);
    assert.equal(proposal.related, false);
    assert.deepEqual(proposal.signers, SIGNERS);
  }
  state.proposals.P.signers.push('demo-4');
  assert.deepEqual(createDemoCatalog().proposals.P.signers, SIGNERS, 'fixtures do not share mutable arrays');
});

test('P/Q/R/S survive three unrelated conflicts and all finalize at the latest version', () => {
  let state = createDemoCatalog();
  state = finalize(state, 'P');
  const originalRank = state.proposals.S.firstReadyAt;
  const failed = action(state, 'finalize', 'S', { expectedCatalogVersion: 0 });
  refused(state, failed, 'CATALOG_CONFLICT');
  state = begin(state, 'S', D7 + 1);
  const start = state.proposals.S.reconciliationStartedAt;
  state = reconcile(state, 'S', D7 + 2, 'unknown', []);
  state = begin(state, 'Q', D7 + 3);
  state = reconcile(state, 'Q', D7 + 4);
  state = finalize(state, 'Q');
  refused(state, action(state, 'finalize', 'S', { expectedCatalogVersion: 1 }), 'CATALOG_CONFLICT');
  state = begin(state, 'S', D7 + 5);
  assert.equal(state.proposals.S.reconciliationStartedAt, start);
  state = begin(state, 'R', D7 + 6);
  state = reconcile(state, 'R', D7 + 7);
  state = finalize(state, 'R');
  refused(state, action(state, 'finalize', 'S', { expectedCatalogVersion: 2 }), 'CATALOG_CONFLICT');
  state = begin(state, 'S', D7 + 8);
  assert.equal(state.proposals.S.reconciliationStartedAt, start);
  assert.equal(state.proposals.S.status, 'RECONCILING');
  state = reconcile(state, 'S', D7 + 9);
  assert.equal(state.proposals.S.signedVersion, 3);
  assert.equal(state.proposals.S.firstReadyAt, originalRank);
  assert.equal(state.proposals.S.reconciliationStartedAt, null);
  assert.deepEqual(state.proposals.S.signedDiff.eventIds, ['event-P', 'event-Q', 'event-R']);
  state = finalize(state, 'S');
  assert.equal(state.catalogVersion, 4);
  assert.ok(Object.values(state.proposals).every(p => p.status === 'FINAL'));
  assert.deepEqual(state.history.map(e => e.proposalId), ['P', 'Q', 'R', 'S']);
});

test('catalog CAS and workflow revision CAS reject without changing any field', () => {
  const initial = createDemoCatalog();
  const state = finalize(initial, 'P');
  refused(state, action(state, 'finalize', 'Q', { expectedCatalogVersion: 0 }), 'CATALOG_CONFLICT');
  refused(state, action(state, 'finalize', 'Q', { expectedCatalogVersion: 1 }), 'LATEST_SIGNATURE_REQUIRED');
  refused(state, action(state, 'begin-reconcile', 'Q', { expectedRevision: 0 }), 'STATE_CONFLICT');
  assert.equal(state.proposals.Q.eventId, null);
});

test('unknown is a hold, not an unrelated signature; absent or duplicate signers cannot approve', () => {
  let state = begin(finalize(createDemoCatalog(), 'P'), 'Q');
  state = reconcile(state, 'Q', D7 + 1, 'unknown', []);
  assert.equal(state.proposals.Q.status, 'RECONCILING');
  assert.equal(state.proposals.Q.signedVersion, 0);
  refused(state, action(state, 'finalize', 'Q', { expectedCatalogVersion: 1 }), 'LATEST_SIGNATURE_REQUIRED');
  for (const signers of [[], ['demo-1', 'demo-2'], ['demo-1', 'demo-1', 'demo-2'], ['demo-1', 'demo-2', 'outsider']]) {
    refused(state, action(state, 'reconcile', 'Q', { relation: 'unrelated', signers }), 'QUORUM_REQUIRED');
  }
  state = reconcile(state, 'Q', D7 + 2);
  assert.equal(state.proposals.Q.status, 'FINALIZATION_WAIT');
  assert.equal(state.proposals.Q.signedAtRevision, state.revision);
});

for (const relation of ['duplicate', 'changed']) {
  test(`${relation} requires a new round; old NEW and old signatures cannot finalize`, () => {
    let state = begin(finalize(createDemoCatalog(), 'P'), 'Q');
    state = reconcile(state, 'Q', D7 + 1, relation);
    assert.equal(state.proposals.Q.status, 'NEEDS_CHANGE');
    assert.equal(state.proposals.Q.related, true);
    assert.equal(state.proposals.Q.deadline, 12 * DAY);
    refused(state, action(state, 'finalize', 'Q', { expectedCatalogVersion: 1 }), 'NEW_REVIEW_REQUIRED');
    refused(state, action(state, 'reconcile', 'Q', { relation: 'unrelated', signers: SIGNERS }), 'NEW_REVIEW_REQUIRED');
    refused(state, action(state, 'begin-reconcile', 'Q'), 'NEW_REVIEW_REQUIRED');
  });
}

test('signed payload cannot be changed, injected or reused after revision changes', () => {
  const state = createDemoCatalog();
  for (const [key, value] of [['proposalVersion', 2], ['proposalHash', 'altered'], ['candidateHash', 'altered'], ['decision', 'LINK']]) {
    const tampered = structuredClone(state);
    tampered.proposals.P[key] = value;
    refused(tampered, action(tampered, 'finalize', 'P', { expectedCatalogVersion: 0 }), 'SIGNED_PAYLOAD_CHANGED');
  }
  refused(state, action(state, 'reconcile', 'P', { relation: 'unrelated', signers: SIGNERS, proposalHash: 'altered' }), 'INVALID_COMMAND');
  let next = begin(finalize(state, 'P'), 'Q');
  const oldCommand = action(next, 'reconcile', 'Q', { relation: 'unrelated', signers: SIGNERS });
  next = begin(next, 'R');
  refused(next, oldCommand, 'STATE_CONFLICT');
});

test('finalization enforces initial 3/5 signature and latest signed version', () => {
  const state = createDemoCatalog();
  state.proposals.P.signers = ['demo-1', 'demo-2'];
  refused(state, action(state, 'finalize', 'P', { expectedCatalogVersion: 0 }), 'QUORUM_REQUIRED');
});

test('firstReadyAt order uses proposalId as tie-breaker and preserves rank through reconciliation', () => {
  let state = createDemoCatalog();
  refused(state, action(state, 'finalize', 'Q', { expectedCatalogVersion: 0 }), 'FINALIZATION_ORDER');
  state = finalize(state, 'P');
  state = begin(state, 'Q');
  state = reconcile(state, 'Q');
  state = begin(state, 'R');
  state = reconcile(state, 'R');
  refused(state, action(state, 'finalize', 'R', { expectedCatalogVersion: 1 }), 'FINALIZATION_ORDER');
  assert.equal(state.proposals.Q.firstReadyAt, D7);
  assert.equal(state.proposals.R.firstReadyAt, D7);
  state = finalize(state, 'Q');
  assert.equal(state.proposals.Q.status, 'FINAL');
});

test('an earlier unready proposal is skipped, then regains its original place when ready', () => {
  let state = begin(finalize(createDemoCatalog(), 'P'), 'Q');
  state = begin(state, 'R');
  state = reconcile(state, 'R');
  state = finalize(state, 'R');
  state = begin(state, 'Q');
  state = reconcile(state, 'Q');
  state = begin(state, 'S');
  state = reconcile(state, 'S');
  refused(state, action(state, 'finalize', 'S', { expectedCatalogVersion: 2 }), 'FINALIZATION_ORDER');
  assert.equal(state.proposals.Q.firstReadyAt, D7);
});

test('later firstReadyAt cannot overtake earlier ready proposals even with smaller id', () => {
  const state = createDemoCatalog();
  state.proposals.P.firstReadyAt = D7 + 10;
  refused(state, action(state, 'finalize', 'P', { expectedCatalogVersion: 0, now: D7 + 10 }), 'FINALIZATION_ORDER');
  const next = finalize(state, 'Q', D7 + 10);
  assert.equal(next.proposals.Q.status, 'FINAL');
});

test('updates within an unfinished reconciliation do not reset the 48-hour clock', () => {
  let state = begin(finalize(createDemoCatalog(), 'P'), 'S', D7 + 1);
  const start = state.proposals.S.reconciliationStartedAt;
  state = begin(state, 'Q', D7 + 2);
  state = reconcile(state, 'Q', D7 + 3);
  state = finalize(state, 'Q');
  state = begin(state, 'S', D7 + HOURS48);
  assert.equal(state.proposals.S.reconciliationStartedAt, start);
  state = reconcile(state, 'S', start + HOURS48 + 1);
  assert.equal(state.proposals.S.status, 'REVIEW_EXPIRED');
  assert.equal(state.proposals.S.signedVersion, 0);
  refused(state, action(state, 'finalize', 'S', { expectedCatalogVersion: 2 }), 'REVIEW_EXPIRED');
});

test('completed first cycle allows a new cycle beyond its old 48h start while current signature is valid', () => {
  let state = begin(finalize(createDemoCatalog(), 'P'), 'S', D7 + 1);
  state = reconcile(state, 'S', D7 + DAY);
  assert.equal(state.proposals.S.reconciliationStartedAt, null);
  const previousExpiry = D7 + DAY + HOURS48;
  assert.equal(state.proposals.S.signatureExpiresAt, previousExpiry);
  state = begin(state, 'Q', D7 + DAY + 1);
  state = reconcile(state, 'Q', D7 + DAY + 2);
  state = finalize(state, 'Q');
  state = begin(state, 'S', D7 + HOURS48 + 2);
  assert.equal(state.proposals.S.reconciliationStartedAt, D7 + HOURS48 + 2);
  assert.equal(state.proposals.S.signatureExpiresAt, previousExpiry, 'beginning a cycle cannot renew the current signature');
  state = reconcile(state, 'S', D7 + HOURS48 + 3);
  assert.equal(state.proposals.S.status, 'FINALIZATION_WAIT');
  assert.equal(state.proposals.S.signatureExpiresAt, D7 + 2 * HOURS48 + 3);
  assert.equal(state.proposals.S.deadline, 12 * DAY);
});

for (const offset of [-1, 0, 1]) {
  test(`repeated begin at start+48h${offset >= 0 ? '+' : ''}${offset}s cannot reset the unsigned period`, () => {
    let state = begin(finalize(createDemoCatalog(), 'P'), 'Q', D7);
    state = begin(state, 'Q', D7 + HOURS48 + offset);
    assert.equal(state.proposals.Q.status, offset < 0 ? 'RECONCILING' : 'REVIEW_EXPIRED');
    assert.equal(state.proposals.Q.reconciliationStartedAt, D7);
    assert.equal(state.proposals.Q.signedVersion, 0);
  });
  test(`reconciliation signatures at start+48h${offset >= 0 ? '+' : ''}${offset}s use strict expiry`, () => {
    let state = begin(finalize(createDemoCatalog(), 'P'), 'Q', D7);
    state = reconcile(state, 'Q', D7 + HOURS48 + offset);
    assert.equal(state.proposals.Q.status, offset < 0 ? 'FINALIZATION_WAIT' : 'REVIEW_EXPIRED');
    assert.equal(state.proposals.Q.signedVersion, offset < 0 ? 1 : 0);
  });
  test(`dedicated signatures at signedAt+48h${offset >= 0 ? '+' : ''}${offset}s use strict expiry`, () => {
    let state = begin(finalize(createDemoCatalog(), 'P'), 'Q', D7);
    state = reconcile(state, 'Q', D7 + 1);
    const now = state.proposals.Q.signatureExpiresAt + offset;
    if (offset < 0) {
      state = finalize(state, 'Q', now);
      assert.equal(state.proposals.Q.status, 'FINAL');
    } else {
      refused(state, action(state, 'finalize', 'Q', { expectedCatalogVersion: 1, now }), 'REVIEW_EXPIRED');
    }
  });
}

function secondConflict() {
  let state = begin(finalize(createDemoCatalog(), 'P'), 'S', D7 + 1);
  state = reconcile(state, 'S', D7 + 3);
  state = begin(state, 'Q', D7 + 4);
  state = reconcile(state, 'Q', D7 + 5);
  return finalize(state, 'Q');
}
for (const type of ['begin-reconcile', 'reconcile']) {
  for (const offset of [0, 1]) {
    test(`${type} cannot resurrect a dedicated signature at its expiry+${offset}s in a new cycle`, () => {
      let state = secondConflict();
      const expiry = state.proposals.S.signatureExpiresAt;
      const original = structuredClone(state.proposals.S);
      const fields = type === 'reconcile' ? { relation: 'unrelated', signers: SIGNERS } : {};
      state = run(state, type, 'S', { ...fields, now: expiry + offset });
      assert.equal(state.proposals.S.status, 'REVIEW_EXPIRED');
      for (const key of ['signedVersion', 'signatureExpiresAt', 'reconciliationStartedAt', 'signedAtRevision', 'signedDiff', 'history', 'deadline', 'firstReadyAt', 'eventId']) {
        assert.deepEqual(state.proposals.S[key], original[key], `${key} cannot be renewed by expiry`);
      }
      refused(state, action(state, 'reconcile', 'S', { relation: 'unrelated', signers: SIGNERS }), 'REVIEW_EXPIRED');
    });
  }
  test(`${type} respects the older dedicated-signature expiry during an already-started second cycle`, () => {
    let state = secondConflict();
    const expiry = state.proposals.S.signatureExpiresAt;
    state = begin(state, 'S', expiry - DAY);
    const start = state.proposals.S.reconciliationStartedAt;
    const fields = type === 'reconcile' ? { relation: 'unrelated', signers: SIGNERS } : {};
    state = run(state, type, 'S', { ...fields, now: expiry });
    assert.equal(state.proposals.S.status, 'REVIEW_EXPIRED');
    assert.equal(state.proposals.S.signatureExpiresAt, expiry);
    assert.equal(state.proposals.S.reconciliationStartedAt, start);
    assert.equal(state.proposals.S.signedVersion, 1);
  });
}

test('the ready-order filter skips a signature at exact expiry but not one second earlier', () => {
  let state = begin(finalize(createDemoCatalog(), 'P'), 'Q', D7 + 1);
  state = reconcile(state, 'Q', D7 + 1);
  state = begin(state, 'R', D7 + 2);
  state = reconcile(state, 'R', D7 + 2);
  const expiry = state.proposals.Q.signatureExpiresAt;
  refused(state, action(state, 'finalize', 'R', { expectedCatalogVersion: 1, now: expiry - 1 }), 'FINALIZATION_ORDER');
  state = finalize(state, 'R', expiry);
  assert.equal(state.proposals.R.status, 'FINAL');
});

test('all deadlines stay capped at original D12, including a D11 signature', () => {
  let state = begin(finalize(createDemoCatalog(), 'P'), 'Q', 11 * DAY);
  state = reconcile(state, 'Q', 11 * DAY);
  assert.equal(state.proposals.Q.signatureExpiresAt, 12 * DAY);
  assert.equal(state.proposals.Q.deadline, 12 * DAY);
  refused(state, action(state, 'finalize', 'Q', { expectedCatalogVersion: 1, now: 12 * DAY + 1 }), 'REVIEW_EXPIRED');
  refused(state, action(state, 'finalize', 'Q', { expectedCatalogVersion: 1, now: 12 * DAY }), 'REVIEW_EXPIRED');
  state = finalize(state, 'Q', 12 * DAY - 1);
  assert.equal(state.proposals.Q.status, 'FINAL');
});

for (const type of ['finalize', 'begin-reconcile', 'reconcile']) {
  for (const offset of [-1, 0, 1]) {
    test(`${type} treats the original D12 cap${offset >= 0 ? '+' : ''}${offset}s as exclusive`, () => {
      let state = createDemoCatalog();
      const id = type === 'finalize' ? 'P' : 'Q';
      if (type !== 'finalize') state = finalize(state, 'P');
      const fields = type === 'finalize' ? { expectedCatalogVersion: state.catalogVersion }
        : type === 'reconcile' ? { relation: 'unrelated', signers: SIGNERS } : {};
      const command = action(state, type, id, { ...fields, now: 12 * DAY + offset });
      if (type === 'finalize' && offset >= 0) {
        refused(state, command, 'REVIEW_EXPIRED');
      } else {
        const result = applyCatalog(state, command);
        assert.equal(result.ok, true, result.error);
        assert.equal(result.state.proposals[id].status, offset >= 0 ? 'REVIEW_EXPIRED'
          : type === 'finalize' ? 'FINAL' : type === 'begin-reconcile' ? 'RECONCILING' : 'FINALIZATION_WAIT');
        assert.equal(result.state.proposals[id].deadline, 12 * DAY);
      }
    });
  }
}

test('expired initial signatures cannot finalize, restart or extend the original period', () => {
  let state = createDemoCatalog();
  refused(state, action(state, 'finalize', 'P', { expectedCatalogVersion: 0, now: 12 * DAY + 1 }), 'REVIEW_EXPIRED');
  state = begin(state, 'P', 12 * DAY + 1);
  assert.equal(state.proposals.P.status, 'REVIEW_EXPIRED');
  assert.equal(state.proposals.P.deadline, 12 * DAY);
  refused(state, action(state, 'begin-reconcile', 'P'), 'REVIEW_EXPIRED');
});

test('every operation is gated outside demo, including idempotent retries', () => {
  for (const mode of ['production', 'preview', undefined]) {
    const state = createDemoCatalog();
    state.mode = mode;
    for (const type of ['finalize', 'begin-reconcile', 'reconcile']) {
      const fields = type === 'finalize' ? { expectedCatalogVersion: 0 } : type === 'reconcile' ? { relation: 'unrelated', signers: SIGNERS } : {};
      refused(state, action(state, type, 'P', fields), 'PRODUCTION_GATE_CLOSED');
    }
  }
  const state = createDemoCatalog();
  const command = action(state, 'finalize', 'P', { expectedCatalogVersion: 0 });
  const result = applyCatalog(state, command);
  result.state.mode = 'production';
  refused(result.state, command, 'PRODUCTION_GATE_CLOSED');
});

test('same id and payload replay once, but same id with changed payload is rejected', () => {
  const state = createDemoCatalog();
  const command = action(state, 'finalize', 'P', { expectedCatalogVersion: 0 });
  const first = applyCatalog(state, command);
  assert.equal(first.ok, true);
  const replay = applyCatalog(first.state, { ...command });
  assert.equal(replay.ok, true);
  assert.strictEqual(replay.state, first.state);
  assert.equal(replay.message, first.message);
  assert.equal(replay.state.catalogVersion, 1);
  assert.equal(replay.state.audit.length, 1);
  refused(first.state, { ...command, now: D7 + 1 }, 'IDEMPOTENCY_CONFLICT');
  refused(first.state, { ...command, proposalId: 'Q' }, 'IDEMPOTENCY_CONFLICT');
});

test('begin and reconcile replay preserve reconciliation start, signature expiry and audit exactly', () => {
  let state = finalize(createDemoCatalog(), 'P');
  const startCommand = action(state, 'begin-reconcile', 'Q', { now: D7 + 1 });
  const started = applyCatalog(state, startCommand);
  assert.equal(started.ok, true);
  state = started.state;
  const startReplay = applyCatalog(state, { ...startCommand });
  assert.equal(startReplay.ok, true);
  assert.strictEqual(startReplay.state, state);
  assert.equal(state.proposals.Q.reconciliationStartedAt, D7 + 1);
  const signCommand = action(state, 'reconcile', 'Q', { relation: 'unrelated', signers: SIGNERS, now: D7 + 2 });
  const signed = applyCatalog(state, signCommand);
  assert.equal(signed.ok, true);
  const replay = applyCatalog(signed.state, { ...signCommand, signers: [...SIGNERS] });
  assert.equal(replay.ok, true);
  assert.strictEqual(replay.state, signed.state);
  assert.equal(replay.state.proposals.Q.signatureExpiresAt, D7 + 2 + HOURS48);
  assert.equal(replay.state.proposals.Q.history.length, 1);
  assert.equal(replay.state.proposals.Q.reconciliationStartedAt, null);
  refused(signed.state, { ...signCommand, now: D7 + 3 }, 'IDEMPOTENCY_CONFLICT');
  refused(signed.state, { ...signCommand, signers: ['demo-2', 'demo-3', 'demo-4'] }, 'IDEMPOTENCY_CONFLICT');
});

test('the original five-person panel cannot be replaced for finalization or re-signing', () => {
  const state = createDemoCatalog();
  state.proposals.P.panel = ['demo-1', 'demo-2', 'demo-3', 'demo-4', 'outsider'];
  refused(state, action(state, 'finalize', 'P', { expectedCatalogVersion: 0 }), 'PANEL_CHANGED');
  let next = finalize(createDemoCatalog(), 'P');
  next = begin(next, 'Q');
  next.proposals.Q.panel = ['demo-1', 'demo-2', 'demo-3'];
  refused(next, action(next, 'reconcile', 'Q', { relation: 'unrelated', signers: SIGNERS }), 'PANEL_CHANGED');
});

test('all actions have exact keys and strict runtime scalar validation', () => {
  const state = createDemoCatalog();
  for (const command of [
    action(state, 'finalize', 'P', { expectedCatalogVersion: 0, payload: 'injected' }),
    action(state, 'begin-reconcile', 'P', { signers: SIGNERS }),
    action(state, 'reconcile', 'P', { relation: 'unrelated', signers: SIGNERS, expectedCatalogVersion: 0 }),
    action(state, 'reconcile', 'P', { relation: 'unclassified', signers: SIGNERS }),
    action(state, 'finalize', '__proto__', { expectedCatalogVersion: 0 }),
    action(state, 'finalize', 'P', { expectedCatalogVersion: '0' }),
    action(state, 'bogus', 'P'),
    action(state, 'finalize', 'P', { expectedCatalogVersion: 0, now: NaN }),
    action(state, 'begin-reconcile', 'P', { now: -1 }),
    action(state, 'begin-reconcile', 'P', { now: D7 - 1 }),
    null,
  ]) refused(state, command, 'INVALID_COMMAND');
});
