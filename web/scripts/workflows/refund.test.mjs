import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoRefund, applyRefund, refundTotals, refundIntent } from '../../src/lib/workflow/refund.ts';
const signers = ['demo-1', 'demo-2', 'demo-3'];
const command = (state, id, fields) => ({ id, expectedRevision: state.revision, ...fields });
function run(state, id, fields) {
  const result = applyRefund(state, command(state, id, fields));
  assert.equal(result.ok, true, result.error);
  return result.state;
}
const cancel = (state, amount = 100) => run(state, 'cancel-A', {
  type: 'cancel', ownerId: 'A', amount, transactionVersion: 2, proof: 'demo-payment-cancelled',
});
const offset = (state, overrides = {}) => run(state, 'offset-A', {
  type: 'offset', key: 'batch-1:A', eventId: 'cancel-A', signers,
  instructionVersion: state.instructions['batch-1:A'].instructionVersion,
  transactionVersion: state.owners.A.transactionVersion,
  proof: { kind: 'demo-unsent', key: 'batch-1:A', executionVersion: state.instructions['batch-1:A'].executionVersion, futureExecutionImpossible: true },
  ...overrides,
});

test('app: A全取消の追記相殺でBの残り50円を返せる原資を解放する', () => {
  let state = createDemoRefund();
  const fixed = structuredClone(state.batches);
  state = cancel(state);
  state = offset(state);
  assert.equal(state.instructions['batch-1:A'].reservedRemaining, 0);
  assert.equal(state.instructions['batch-1:A'].status, 'OFFSET_CLOSED');
  assert.equal(state.cash, 100);
  assert.equal(refundTotals(state).refundAvailable, 50);
  assert.deepEqual(state.batches, fixed);
});

const send = (state, key = 'batch-1:B', type = 'submit') => run(state, `${type}-${key.replace(':', '-')}-${state.revision}`, {
  type, key, instructionVersion: state.instructions[key].instructionVersion,
  executionVersion: state.instructions[key].executionVersion,
  transactionVersion: state.owners[state.instructions[key].ownerId].transactionVersion,
  holder: { ownerId: state.instructions[key].ownerId, proof: 'demo-owner-bound' }, intent: refundIntent(state, key),
});
const confirm = (state, key, result = 'completed') => run(state, `confirm-${state.revision}`, {
  type: 'confirm', key, executionVersion: state.instructions[key].executionVersion, result, proof: 'demo-bank-final',
});
function denied(state, fields, error) {
  const before = structuredClone(state);
  const payload = ['submit', 'retry'].includes(fields.type) ? { intent: refundIntent(state, fields.key), ...fields } : fields;
  const result = applyRefund(state, command(state, 'rejected', payload));
  assert.equal(result.ok, false); assert.equal(result.error, error);
  assert.equal(result.state, state); assert.deepEqual(state, before);
}

test('app: Bへ第1回50円と追加50円、Aへ0円、cash0', () => {
  let state = offset(cancel(createDemoRefund()));
  state = confirm(send(state), 'batch-1:B');
  assert.equal(state.cash, 50); assert.equal(refundTotals(state).owners.B.cap, 50);
  state = run(state, 'b2', { type: 'reserve-remaining', batchId: 'batch-2', signers });
  assert.deepEqual(state.batches[1].allocations, { A: 0, B: 50 });
  state = confirm(send(state, 'batch-2:B'), 'batch-2:B');
  assert.equal(state.cash, 0); assert.equal(state.owners.B.completed, 100);
  assert.equal(state.owners.A.completed, 0); assert.equal(refundTotals(state).obligations, 0);
});
for (const amount of [30, 80]) test(`app: 部分取消${amount}円の残余権利`, () => {
  let state = cancel(createDemoRefund(), amount);
  if (amount === 80) state = offset(state);
  else denied(state, { type: 'offset', key: 'batch-1:A', eventId: 'cancel-A', signers,
    instructionVersion: 1, transactionVersion: 2,
    proof: { kind: 'demo-unsent', key: 'batch-1:A', executionVersion: 1, futureExecutionImpossible: true } }, 'NO_OFFSET_REQUIRED');
  assert.equal(state.instructions['batch-1:A'].reservedRemaining, amount === 80 ? 20 : 50);
  assert.equal(refundTotals(state).owners.A.cap, amount === 30 ? 20 : 0);
});
test('app: 取消額1〜100を実モジュールへ適用し必要額だけ相殺', () => {
  for (let amount = 1; amount <= 100; amount++) {
    let state = cancel(createDemoRefund(), amount);
    if (amount > 50) state = offset(state);
    assert.equal(state.instructions['batch-1:A'].offsetAmount, Math.max(0, amount - 50));
    assert.equal(refundTotals(state).owners.A.cap, Math.max(0, 50 - amount));
    assert.equal(state.cash, 200 - amount);
  }
});
test('app: UNKNOWNは結果照合まで予約を維持し、未送金照合後だけ解放', () => {
  let state = send(createDemoRefund(), 'batch-1:A');
  state = run(state, 'unknown', { type: 'unknown', key: 'batch-1:A' }); state = cancel(state);
  denied(state, { type: 'offset', key: 'batch-1:A', eventId: 'cancel-A', signers,
    instructionVersion: state.instructions['batch-1:A'].instructionVersion, transactionVersion: 2,
    proof: { kind: 'demo-unsent', key: 'batch-1:A', executionVersion: 1, futureExecutionImpossible: true } }, 'EXTERNAL_RECONCILIATION_REQUIRED');
  assert.equal(refundTotals(state).refundAvailable, 0);
  state = confirm(state, 'batch-1:A', 'not-sent'); state = offset(state);
  assert.equal(refundTotals(state).refundAvailable, 50);
});
test('app: 実行先行/取消先行の順序を区別し完了額は戻さない', () => {
  let state = send(createDemoRefund(), 'batch-1:A'); state = cancel(state);
  state = confirm(state, 'batch-1:A');
  assert.equal(state.owners.A.completed, 50); assert.equal(refundTotals(state).owners.A.overpaid, 50);
  assert.equal(state.cash, 50); assert.equal(state.instructions['batch-1:A'].offsetAmount, 0);
  const cancelled = cancel(createDemoRefund());
  denied(cancelled, { type: 'submit', key: 'batch-1:A', instructionVersion: 1, executionVersion: 1, transactionVersion: 2,
    holder: { ownerId: 'A', proof: 'demo-owner-bound' } }, 'LATEST_RIGHT_MISMATCH');
});
test('app: FAILED→80円取消→新実行版20円は同じbankKeyを維持', () => {
  let state = confirm(send(createDemoRefund(), 'batch-1:A'), 'batch-1:A', 'not-sent');
  state = offset(cancel(state, 80));
  assert.equal(state.instructions['batch-1:A'].bankKey, 'batch-1:A');
  assert.equal(state.instructions['batch-1:A'].executionVersion, 2);
  state = confirm(send(state, 'batch-1:A'), 'batch-1:A');
  assert.equal(state.owners.A.completed, 20); assert.equal(state.instructions['batch-1:A'].offsetAmount, 30);
});
test('app: 取消後の旧権利版/古い指示版は再試行不可', () => {
  let state = confirm(send(createDemoRefund(), 'batch-1:A'), 'batch-1:A', 'not-sent');
  const old = { type: 'retry', key: 'batch-1:A', instructionVersion: state.instructions['batch-1:A'].instructionVersion,
    executionVersion: 1, transactionVersion: 1, holder: { ownerId: 'A', proof: 'demo-owner-bound' } };
  state = cancel(state, 30); denied(state, old, 'INSTRUCTION_VERSION_CONFLICT');
  const original = structuredClone(state.executions['batch-1:A:executeRefund:1']);
  state = send(state, 'batch-1:A', 'retry'); assert.equal(state.instructions['batch-1:A'].executionVersion, 1);
  assert.deepEqual(state.executions['batch-1:A:executeRefund:1'], original);
  assert.equal(original.transactionVersion, 1); assert.equal(state.owners.A.transactionVersion, 2);
});
test('app: 相殺には独立3人/対象結合/将来不実行の明示証明を要求', () => {
  const state = cancel(createDemoRefund());
  const base = { type: 'offset', key: 'batch-1:A', eventId: 'cancel-A', signers,
    instructionVersion: 1, transactionVersion: 2,
    proof: { kind: 'demo-unsent', key: 'batch-1:A', executionVersion: 1, futureExecutionImpossible: true } };
  denied(state, { ...base, signers: signers.slice(0, 2) }, 'QUORUM_REQUIRED');
  denied(state, { ...base, signers: ['demo-1', 'demo-1', 'demo-2'] }, 'QUORUM_REQUIRED');
  denied(state, { ...base, proof: { ...base.proof, futureExecutionImpossible: 'true' } }, 'UNSENT_PROOF_REQUIRED');
  denied(state, { ...base, proof: { ...base.proof, key: 'batch-1:B' } }, 'UNSENT_PROOF_REQUIRED');
  denied(state, { ...base, eventId: 'missing' }, 'CANCELLATION_PROOF_REQUIRED');
});
test('app: 再送は一度だけ、異payload/旧CAS/未知fieldは副作用なく拒否', () => {
  const initial = createDemoRefund();
  const request = command(initial, 'cancel-A', { type: 'cancel', ownerId: 'A', amount: 100, transactionVersion: 2, proof: 'demo-payment-cancelled' });
  const state = applyRefund(initial, request).state;
  const replay = applyRefund(state, structuredClone(request)); assert.equal(replay.ok, true); assert.equal(replay.state, state);
  const different = applyRefund(state, { ...request, amount: 99 }); assert.equal(different.error, 'IDEMPOTENCY_CONFLICT'); assert.equal(different.state, state);
  const stale = applyRefund(state, { ...request, id: 'stale' }); assert.equal(stale.error, 'STATE_CONFLICT');
  denied(initial, { ...request, extra: 'not-allowed' }, 'INVALID_COMMAND');
});
test('app: 本番mode/不正command ID/JPY入力を拒否', () => {
  const initial = createDemoRefund();
  const action = { type: 'cancel', ownerId: 'A', amount: 100, transactionVersion: 2, proof: 'demo-payment-cancelled' };
  const production = { ...initial, mode: 'production' };
  denied(production, action, 'PRODUCTION_GATE_CLOSED');
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) denied(initial, { ...action, amount: value }, 'INVALID_YEN');
  for (const id of ['__proto__', 'constructor', 'prototype']) {
    const result = applyRefund(initial, { ...action, id, expectedRevision: 0 }); assert.equal(result.error, 'INVALID_COMMAND'); assert.equal(result.state, initial);
  }
});
test('app: 初回送金に実行版別の不変intentを保存する', () => {
  const state = send(createDemoRefund(), 'batch-1:A');
  assert.ok(state.executions?.['batch-1:A:executeRefund:1'], '不変送金intentの記録がない');
});
test('app: 同実行版の再試行で操作キー・原intentを変更できない', () => {
  const state = confirm(send(createDemoRefund(), 'batch-1:A'), 'batch-1:A', 'not-sent');
  const original = refundIntent(state, 'batch-1:A');
  const retry = { type: 'retry', key: 'batch-1:A', instructionVersion: state.instructions['batch-1:A'].instructionVersion,
    executionVersion: 1, transactionVersion: 1, holder: { ownerId: 'A', proof: 'demo-owner-bound' }, intent: original };
  for (const change of [{ operationKey: 'different' }, { amount: 49 }, { ownerId: 'B' }, { bankKey: 'other-bank' }, { transactionVersion: 2 }, { approvedRevision: 1 }]) {
    denied(state, { ...retry, intent: { ...original, ...change } }, 'EXECUTION_INTENT_CONFLICT');
  }
});
test('app: 数値batchIdを文字列へ暗黙変換して受理しない', () => {
  denied(createDemoRefund(), { type: 'reserve-remaining', batchId: 123, signers }, 'BATCH_ID_CONFLICT');
});
test('app: shortfallで既予約実行/追加バッチ停止、他債務を勝手に消さない', () => {
  const state = { ...createDemoRefund(), liabilities: 150 };
  denied(state, { type: 'submit', key: 'batch-1:B', instructionVersion: 1, executionVersion: 1, transactionVersion: 1,
    holder: { ownerId: 'B', proof: 'demo-owner-bound' } }, 'INSUFFICIENT_CASH');
  denied(state, { type: 'reserve-remaining', batchId: 'batch-2', signers }, 'INSUFFICIENT_REFUND_CASH');
  assert.equal(state.liabilities, 150);
});
