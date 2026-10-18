import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoCatalog, applyCatalog } from '../../src/lib/workflow/catalog.ts';
import { catalogReconciliation } from '../../src/lib/workflow/presentation.ts';
const execute = (state, id, fields) => {
  const result = applyCatalog(state, { id, expectedRevision: state.revision, ...fields });
  assert.equal(result.ok, true, result.error); return result.state;
};
for (const relation of ['unrelated', 'duplicate', 'changed', 'unknown']) {
  test(`actual UI command: ${relation}の分類を適切な承認で到達可能にする`, () => {
    let state = createDemoCatalog();
    state = execute(state, 'final-P', { type: 'finalize', proposalId: 'P', expectedCatalogVersion: 0, now: state.now + 1 });
    state = execute(state, 'begin-S', { type: 'begin-reconcile', proposalId: 'S', now: state.now + 1 });
    state = execute(state, 'reconcile-S', catalogReconciliation(state, 'S', relation));
    assert.equal(state.proposals.S.status, relation === 'unknown' ? 'RECONCILING' : relation === 'unrelated' ? 'FINALIZATION_WAIT' : 'NEEDS_CHANGE');
  });
}
