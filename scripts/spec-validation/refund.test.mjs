// Observed RED: old specification retained A's 50-yen reservation; expected 0, actual 50 (exit 1).
// All provider/bank attestations below are fixture labels, NOT cryptographically verified signatures.
import assert from 'node:assert/strict';
import test from 'node:test';
import { RefundModel } from './refund.mjs';

const panel = ['reviewer-1', 'reviewer-2', 'reviewer-3'];
const cancellation = (eventId, amount, ownerId = 'A', previousVersion = 1) => ({
  eventId, ownerId, amount, previousVersion, transactionVersion: previousVersion + 1,
  issuer: 'synthetic-provider', verified: true,
});
const terminal = (key, executionVersion = 1) => ({
  key, executionVersion, issuer: 'synthetic-bank', verified: true,
  futureExecutionImpossible: true,
});
const fixture = () => {
  const model = new RefundModel({ owners: [{ id: 'A', gross: 100 }, { id: 'B', gross: 100 }] });
  model.finalizeBatch({ batchId: 'batch-1', amount: 100, expectedRevision: model.revision, approvers: panel });
  return model;
};

test('全取消の不要予約を相殺しBの残額返金原資を解放する', () => {
  const model = fixture();
  const batchBefore = model.batch('batch-1');
  model.consumeCancellation(cancellation('cancel-A', 100));
  model.offsetReservation(model.prepareOffset('cancel-A', 'batch-1:A', terminal('batch-1:A'), panel));
  assert.equal(model.reserved('A'), 0);
  assert.equal(model.instruction('batch-1:A').state, 'OFFSET_CLOSED');
  assert.equal(model.cash, 100);
  assert.equal(model.refundAvailable, 50);
  assert.deepEqual(model.batch('batch-1'), batchBefore);
});

function unchanged(model, operation, code) {
  const before = model.snapshot();
  assert.throws(operation, error => error.message === code, code);
  assert.deepEqual(model.snapshot(), before, 'rejected transaction must be atomic');
}
function submit(model, key) {
  const command = model.prepareExecution(key);
  model.submitRefund(command);
  return command;
}
function resolve(model, key, result = 'COMPLETED', futureExecutionImpossible = true, eventId = `bank-${model.revision}`) {
  const instruction = model.instruction(key);
  const proof = {
    ...terminal(key, instruction.executionVersion), eventId, result,
    paidAmount: result === 'COMPLETED' ? instruction.reservedRemaining : 0,
    attemptNotSent: result === 'FAILED', futureExecutionImpossible,
  };
  model.resolveRefund(proof);
  return proof;
}
function offset(model, eventId = 'cancel-A', key = 'batch-1:A') {
  const instruction = model.instruction(key);
  const command = model.prepareOffset(eventId, key, terminal(key, instruction.executionVersion), panel);
  model.offsetReservation(command);
  return command;
}

test('元のA/B反例を最後まで精算しBへ100円、Aへ0円となる', () => {
  const model = fixture();
  model.consumeCancellation(cancellation('cancel-A', 100));
  offset(model);
  submit(model, 'batch-1:B'); resolve(model, 'batch-1:B');
  assert.equal(model.cash, 50); assert.equal(model.cap('B'), 50);
  model.finalizeBatch({ batchId: 'batch-2', amount: 50, expectedRevision: model.revision, approvers: panel });
  assert.deepEqual(model.batch('batch-2').allocations, { A: 0, B: 50 });
  submit(model, 'batch-2:B'); resolve(model, 'batch-2:B');
  assert.equal(model.owner('B').completed, 100);
  assert.equal(model.owner('A').completed, 0);
  assert.equal(model.cash, 0); assert.equal(model.obligations, 0);
  assert.equal(model.invariants(), true);
});

test('旧仕様の取消予約50円はBの最後の50円を拘束する反例である', () => {
  const legacyCashAfterB = 200 - 100 - 50;
  const legacyUnpaidReservationForA = 50;
  const legacyAvailable = Math.max(0, legacyCashAfterB - legacyUnpaidReservationForA);
  assert.equal(legacyAvailable, 0);
  assert.notEqual(legacyAvailable, 50, 'old rules cannot release the remaining B entitlement');
});

for (const [cancelAmount, reserve, cap] of [[30, 50, 20], [80, 20, 0]]) {
  test(`Aの${cancelAmount}円部分取消で予約${reserve}円・残余cap${cap}円`, () => {
    const model = fixture(), before = model.batch('batch-1');
    model.consumeCancellation(cancellation('cancel-A', cancelAmount));
    if (cancelAmount > 50) offset(model);
    assert.equal(model.reserved('A'), reserve); assert.equal(model.cap('A'), cap);
    assert.equal(model.instruction('batch-1:A').originalAmount, 50);
    assert.equal(model.instruction('batch-1:A').offsetAmount, 50 - reserve);
    assert.deepEqual(model.batch('batch-1'), before);
    if (cancelAmount > 50) {
      submit(model, 'batch-1:A'); resolve(model, 'batch-1:A');
      assert.equal(model.owner('A').completed, 20);
    }
  });
}

test('Aの取消額0〜100円を全列挙し恒等式と必要額のみの相殺を確認する', () => {
  for (let amount = 0; amount <= 100; amount++) {
    const model = fixture();
    model.consumeCancellation(cancellation('cancel-A', amount));
    const expectedOffset = Math.max(0, amount - 50);
    if (expectedOffset > 0) offset(model);
    const i = model.instruction('batch-1:A');
    assert.equal(i.offsetAmount, expectedOffset, `amount=${amount}`);
    assert.equal(i.reservedRemaining, 50 - expectedOffset);
    assert.equal(model.cap('A'), Math.max(0, 50 - amount));
    assert.equal(model.cash, 200 - amount);
    assert.equal(model.obligations, 100 - expectedOffset);
    assert.equal(model.refundAvailable, 100 - amount + expectedOffset);
    assert.equal(model.invariants(), true);
  }
});

test('取消が送金確定より先なら最新権利照合で拒否し相殺後もAへ送らない', () => {
  const model = fixture();
  const stale = model.prepareExecution('batch-1:A');
  model.consumeCancellation(cancellation('cancel-A', 100));
  unchanged(model, () => model.submitRefund(stale), 'LATEST_RIGHT_MISMATCH');
  offset(model);
  unchanged(model, () => model.submitRefund(stale), 'EXECUTION_VERSION');
  unchanged(model, () => model.submitRefund(model.prepareExecution('batch-1:A')), 'EXECUTION_AMOUNT');
  assert.equal(model.owner('A').completed, 0);
});

for (const state of ['SUBMITTED', 'UNKNOWN']) {
  test(`${state}の取消では予約解放せず外部不実行照合後にのみ相殺する`, () => {
    const model = fixture();
    submit(model, 'batch-1:A');
    if (state === 'UNKNOWN') model.markUnknown('batch-1:A');
    model.consumeCancellation(cancellation('cancel-A', 100));
    unchanged(model, () => offset(model), 'EXECUTION_UNKNOWN');
    assert.equal(model.reserved('A'), 50);
    assert.equal(model.refundAvailable, 0);
    resolve(model, 'batch-1:A', 'FAILED');
    offset(model);
    assert.equal(model.reserved('A'), 0); assert.equal(model.refundAvailable, 50);
    assert.equal(model.owner('A').completed, 0);
  });
}

test('UNKNOWNが実送金済みと確定した場合は予約相殺でなく既払い/損失へ計上する', () => {
  const model = fixture();
  submit(model, 'batch-1:A'); model.markUnknown('batch-1:A');
  model.consumeCancellation(cancellation('cancel-A', 100));
  resolve(model, 'batch-1:A');
  assert.equal(model.cash, 50); assert.equal(model.owner('A').completed, 50);
  assert.equal(model.overpayment('A'), 50);
  assert.equal(model.instruction('batch-1:A').offsetAmount, 0);
  unchanged(model, () => offset(model), 'NOTHING_TO_OFFSET');
  assert.equal(model.invariants(), true);
});

test('送金完了が取消より先でも過去の完了額と固定バッチを書き換えない', () => {
  const model = fixture(), batch = model.batch('batch-1');
  submit(model, 'batch-1:A'); resolve(model, 'batch-1:A');
  model.consumeCancellation(cancellation('cancel-A', 100));
  assert.equal(model.cash, 50); assert.equal(model.reserved('A'), 0);
  assert.equal(model.owner('A').completed, 50); assert.equal(model.overpayment('A'), 50);
  assert.deepEqual(model.batch('batch-1'), batch);
});

test('FAILED→80円取消→30円相殺→新実行版20円は固定銀行キーを維持する', () => {
  const model = fixture();
  const first = submit(model, 'batch-1:A');
  resolve(model, 'batch-1:A', 'FAILED');
  model.consumeCancellation(cancellation('cancel-A', 80)); offset(model);
  const fresh = model.prepareExecution('batch-1:A');
  assert.equal(fresh.bankKey, first.bankKey);
  assert.notEqual(fresh.operationKey, first.operationKey);
  assert.equal(fresh.executionVersion, 2); assert.equal(fresh.amount, 20);
  unchanged(model, () => model.submitRefund({ ...fresh, operationKey: first.operationKey }), 'IDEMPOTENCY_CONFLICT');
  const beforeReplay = model.snapshot();
  model.submitRefund(first); // replay old RECEIPT, not the old bank execution
  assert.deepEqual(model.snapshot(), beforeReplay);
  model.submitRefund(fresh); resolve(model, fresh.key);
  const final = model.snapshot(); model.submitRefund(fresh);
  assert.deepEqual(model.snapshot(), final);
  assert.equal(model.owner('A').completed, 20);
  assert.equal(model.instruction(first.key).offsetAmount, 30);
});

test('取消後の旧取引版だけを根拠にFAILED再試行を復活させない', () => {
  const model = fixture(), command = submit(model, 'batch-1:A');
  resolve(model, command.key, 'FAILED', false);
  const stale = model.prepareRetryContext(command.key);
  model.consumeCancellation(cancellation('cancel-A', 30));
  unchanged(model, () => model.retryRefund(command, { ...stale, expectedRevision: model.revision }), 'LATEST_RETRY_CONTEXT_REQUIRED');
  unchanged(model, () => model.retryRefund(command, model.revision), 'LATEST_RETRY_CONTEXT_REQUIRED');
});

test('部分取消後の最新権利contextなら原署名payload不変の同版再試行が可能', () => {
  const model = fixture(), command = submit(model, 'batch-1:A');
  const original = structuredClone(command);
  resolve(model, command.key, 'FAILED', false);
  model.consumeCancellation(cancellation('cancel-A', 30));
  const context = model.prepareRetryContext(command.key);
  assert.equal(context.transactionVersion, 2);
  assert.equal(command.transactionVersion, 1);
  unchanged(model, () => model.retryRefund(command, { ...context, verified: 'false' }), 'LATEST_RETRY_CONTEXT_REQUIRED');
  model.retryRefund(command, context);
  assert.deepEqual(command, original);
  assert.equal(model.instruction(command.key).executionVersion, 1);
  resolve(model, command.key);
  assert.equal(model.owner('A').completed, 50); assert.equal(model.cap('A'), 20);
});

test('文字列falseを所持証明の成功値として受理しない', () => {
  const model = fixture(), command = model.prepareExecution('batch-1:A');
  unchanged(model, () => model.submitRefund({ ...command, holder: { ownerId: 'A', verified: 'false' } }), 'HOLDER_MISMATCH');
});

test('FAILEDの同じ実行版再試行は同じ操作キー/payload、実行版は増やさない', () => {
  const model = fixture();
  const first = submit(model, 'batch-1:A');
  resolve(model, first.key, 'FAILED', false);
  const context = model.prepareRetryContext(first.key);
  unchanged(model, () => model.retryRefund({ ...first, amount: 49 }, context), 'IDEMPOTENCY_CONFLICT');
  unchanged(model, () => model.retryRefund(first, { ...context, expectedRevision: model.revision - 1 }), 'LEDGER_CAS_CONFLICT');
  model.retryRefund(first, context);
  assert.equal(model.instruction(first.key).executionVersion, first.executionVersion);
  resolve(model, first.key);
  assert.equal(model.owner('A').completed, 50);
});

test('FAILEDだけでは解放不可、将来不実行証明を要求しUNKNOWN再試行も拒否する', () => {
  const model = fixture(); const first = submit(model, 'batch-1:A');
  resolve(model, first.key, 'FAILED', false);
  model.consumeCancellation(cancellation('cancel-A', 100));
  const missing = model.prepareOffset('cancel-A', first.key, { ...terminal(first.key), futureExecutionImpossible: false }, panel);
  unchanged(model, () => model.offsetReservation(missing), 'FUTURE_EXECUTION_NOT_CLOSED');
  offset(model);
  assert.equal(model.reserved('A'), 0);
  const unknown = fixture(), command = submit(unknown, 'batch-1:A');
  unknown.markUnknown(command.key);
  unchanged(unknown, () => unknown.retryRefund(command, unknown.prepareRetryContext(command.key)), 'RETRY_NOT_ALLOWED');
});

test('元の同一実行版が終端不実行なら同版再試行で復活させない', () => {
  const model = fixture(), command = submit(model, 'batch-1:A');
  resolve(model, command.key, 'FAILED', true);
  unchanged(model, () => model.retryRefund(command, model.prepareRetryContext(command.key)), 'RETRY_NOT_ALLOWED');
  assert.equal(model.reserved('A'), 50);
});

test('再試行3回の上限に達しても予約/返金権利を消さない', () => {
  const model = fixture(), command = submit(model, 'batch-1:A');
  for (let attempt = 0; attempt < 3; attempt++) {
    resolve(model, command.key, 'FAILED', false);
    model.retryRefund(command, model.prepareRetryContext(command.key));
  }
  resolve(model, command.key, 'FAILED', false);
  unchanged(model, () => model.retryRefund(command, model.prepareRetryContext(command.key)), 'RETRY_LIMIT');
  assert.equal(model.reserved('A'), 50); assert.equal(model.owner('A').completed, 0);
});

test('同じ取消・相殺・完了証明再送は一度だけ反映し異内容は拒否する', () => {
  const model = fixture(), event = cancellation('cancel-A', 100);
  model.consumeCancellation(event); const afterCancel = model.snapshot();
  model.consumeCancellation({ ...event }); assert.deepEqual(model.snapshot(), afterCancel);
  unchanged(model, () => model.consumeCancellation({ ...event, amount: 99 }), 'IDEMPOTENCY_CONFLICT');
  const command = offset(model), afterOffset = model.snapshot();
  model.offsetReservation(structuredClone(command)); assert.deepEqual(model.snapshot(), afterOffset);
  unchanged(model, () => model.offsetReservation({ ...command, amount: 49 }), 'IDEMPOTENCY_CONFLICT');
  submit(model, 'batch-1:B'); const proof = resolve(model, 'batch-1:B');
  const afterComplete = model.snapshot(); model.resolveRefund(structuredClone(proof));
  assert.deepEqual(model.snapshot(), afterComplete);
  unchanged(model, () => model.resolveRefund({ ...proof, paidAmount: 49 }), 'IDEMPOTENCY_CONFLICT');
});

test('相殺/追加バッチ/送金の古い台帳CASは副作用なしで拒否する', () => {
  const model = fixture();
  model.consumeCancellation(cancellation('cancel-A', 80));
  const plan = model.prepareOffset('cancel-A', 'batch-1:A', terminal('batch-1:A'), panel);
  submit(model, 'batch-1:B');
  unchanged(model, () => model.offsetReservation(plan), 'LEDGER_CAS_CONFLICT');
  offset(model);
  const batch = { batchId: 'batch-2', amount: 10, expectedRevision: model.revision, approvers: panel };
  resolve(model, 'batch-1:B');
  unchanged(model, () => model.finalizeBatch(batch), 'LEDGER_CAS_CONFLICT');
  const send = model.prepareExecution('batch-1:A');
  model.finalizeBatch({ ...batch, expectedRevision: model.revision });
  unchanged(model, () => model.submitRefund(send), 'LEDGER_CAS_CONFLICT');
});

test('取消署名/因果版/権利scope・相殺証明の欠落は状態とイベント消費を変更しない', () => {
  const model = fixture();
  unchanged(model, () => model.consumeCancellation({ ...cancellation('cancel-A', 100), verified: false }), 'SYNTHETIC_ATTESTATION_REQUIRED');
  unchanged(model, () => model.consumeCancellation({ ...cancellation('cancel-A', 100), previousVersion: 2, transactionVersion: 3 }), 'PAYMENT_CAUSAL_VERSION');
  unchanged(model, () => model.consumeCancellation(cancellation('cancel-A', 101)), 'CANCELLATION_OVERRUN');
  model.consumeCancellation(cancellation('cancel-A', 100));
  const plan = model.prepareOffset('cancel-A', 'batch-1:A', terminal('batch-1:A'), panel);
  for (const approvers of [panel.slice(0, 2), ['reviewer-1', 'reviewer-1', 'reviewer-2'], ['outsider', ...panel]]) {
    unchanged(model, () => model.offsetReservation({ ...plan, approvers }), 'QUORUM_REQUIRED');
  }
  for (const proof of [{ ...plan.proof, verified: false }, { ...plan.proof, issuer: 'outsider' }]) {
    unchanged(model, () => model.offsetReservation({ ...plan, proof }), 'SYNTHETIC_ATTESTATION_REQUIRED');
  }
  unchanged(model, () => model.offsetReservation({ ...plan, proof: terminal('batch-1:B') }), 'FUTURE_EXECUTION_NOT_CLOSED');
  unchanged(model, () => model.offsetReservation({ ...plan, proof: terminal('batch-1:A', 2) }), 'FUTURE_EXECUTION_NOT_CLOSED');
  unchanged(model, () => model.offsetReservation({ ...plan, amount: 51 }), 'OFFSET_AMOUNT_MISMATCH');
  unchanged(model, () => model.offsetReservation({ ...plan, transactionVersion: 1 }), 'OFFSET_VERSION');
  unchanged(model, () => model.offsetReservation({ ...plan, key: 'batch-1:B' }), 'OFFSET_EVENT_SCOPE');
  model.offsetReservation(plan);
  assert.equal(model.instruction(plan.key).state, 'OFFSET_CLOSED');
});

test('取消後の権利が予約額以上なら期限切れの名目で相殺しない', () => {
  const model = fixture(); model.consumeCancellation(cancellation('cancel-A', 30));
  unchanged(model, () => offset(model), 'OFFSET_AMOUNT_MISMATCH');
  assert.equal(model.reserved('A'), 50);
});

test('複数バッチ予約は確定順で必要額だけ相殺する', () => {
  const model = fixture();
  model.finalizeBatch({ batchId: 'batch-2', amount: 100, expectedRevision: model.revision, approvers: panel });
  model.consumeCancellation(cancellation('cancel-A', 80));
  unchanged(model, () => offset(model, 'cancel-A', 'batch-2:A'), 'OFFSET_ORDER');
  offset(model);
  assert.equal(model.instruction('batch-1:A').offsetAmount, 50);
  offset(model, 'cancel-A', 'batch-2:A');
  assert.equal(model.instruction('batch-2:A').offsetAmount, 30);
  assert.equal(model.reserved('A'), 20); assert.equal(model.reserved('B'), 100);
  assert.equal(model.refundAvailable, 0); assert.equal(model.invariants(), true);
});

test('UNKNOWN先行予約を飛ばして未送金分だけ相殺、後の照合で別追記を行う', () => {
  const model = fixture();
  model.finalizeBatch({ batchId: 'batch-2', amount: 100, expectedRevision: model.revision, approvers: panel });
  submit(model, 'batch-1:A'); model.markUnknown('batch-1:A');
  model.consumeCancellation(cancellation('cancel-A', 100));
  offset(model, 'cancel-A', 'batch-2:A');
  assert.equal(model.reserved('A'), 50);
  assert.equal(model.instruction('batch-1:A').state, 'UNKNOWN');
  assert.equal(model.refundAvailable, 0); assert.equal(model.shortfall, 50);
  resolve(model, 'batch-1:A', 'FAILED'); offset(model);
  assert.equal(model.reserved('A'), 0); assert.equal(model.shortfall, 0);
  assert.equal(model.snapshot().entries.filter(e => e.kind === 'REFUND_RESERVATION_OFFSET').length, 2);
});

test('最新の本人権利だけで判断し他人の所持証明/条件外額を拒否する', () => {
  const model = fixture(), command = model.prepareExecution('batch-1:A');
  unchanged(model, () => model.submitRefund({ ...command, holder: { ownerId: 'B', verified: true } }), 'HOLDER_MISMATCH');
  unchanged(model, () => model.submitRefund({ ...command, amount: 51 }), 'EXECUTION_AMOUNT');
  unchanged(model, () => model.submitRefund({ ...command, transactionVersion: 2 }), 'EXECUTION_STATE_VERSION');
  model.submitRefund(command);
  const invalid = { ...terminal(command.key), eventId: 'bad', result: 'COMPLETED', paidAmount: 50, verified: false };
  unchanged(model, () => model.resolveRefund(invalid), 'SYNTHETIC_ATTESTATION_REQUIRED');
  unchanged(model, () => model.resolveRefund({ ...invalid, verified: true, paidAmount: 51 }), 'TERMINAL_AMOUNT_PROOF');
  unchanged(model, () => model.resolveRefund({ ...invalid, verified: true, futureExecutionImpossible: false }), 'TERMINAL_AMOUNT_PROOF');
});

test('返金原資と権利capを超える新バッチは拒否し原バッチ履歴不変', () => {
  const model = fixture(), original = model.batch('batch-1');
  unchanged(model, () => model.finalizeBatch({ batchId: 'batch-2', amount: 101, expectedRevision: model.revision, approvers: panel }), 'INSUFFICIENT_REFUND_CASH');
  unchanged(model, () => model.finalizeBatch({ batchId: 'batch-2', amount: 50, expectedRevision: model.revision, approvers: panel.slice(0, 2) }), 'QUORUM_REQUIRED');
  model.consumeCancellation(cancellation('cancel-A', 100)); offset(model);
  unchanged(model, () => model.finalizeBatch({ batchId: 'batch-1', amount: 50, expectedRevision: model.revision, approvers: panel }), 'IDEMPOTENCY_CONFLICT');
  assert.deepEqual(model.batch('batch-1'), original);
  // Returned snapshots cannot mutate the internal history/ledger.
  original.allocations.A = 999;
  const snapshot = model.snapshot(); snapshot.instructions.get('batch-1:A').reservedRemaining = 999;
  assert.equal(model.batch('batch-1').allocations.A, 50); assert.equal(model.reserved('A'), 0);
});

test('既存5:3:1/4円→追加1円と端数上限を維持する', () => {
  const model = new RefundModel({ owners: [{ id: 'A', gross: 5 }, { id: 'B', gross: 3 }, { id: 'C', gross: 1 }] });
  model.finalizeBatch({ batchId: 'b1', amount: 4, expectedRevision: model.revision, approvers: panel });
  assert.deepEqual(model.batch('b1').allocations, { A: 2, B: 1, C: 1 });
  for (const ownerId of ['A', 'B', 'C']) { submit(model, `b1:${ownerId}`); resolve(model, `b1:${ownerId}`); }
  model.finalizeBatch({ batchId: 'b2', amount: 1, expectedRevision: model.revision, approvers: panel });
  assert.deepEqual(model.batch('b2').allocations, { A: 1, B: 0, C: 0 });
  assert.deepEqual(model.batch('b1').allocations, { A: 2, B: 1, C: 1 });
});

test('5:3:1の1円バッチ9回で上限に達し10回目と重複バッチを拒否する', () => {
  const model = new RefundModel({ owners: [{ id: 'A', gross: 5 }, { id: 'B', gross: 3 }, { id: 'C', gross: 1 }] });
  const payments = { A: 0, B: 0, C: 0 };
  for (let number = 1; number <= 9; number++) {
    const command = { batchId: `b${number}`, amount: 1, expectedRevision: model.revision, approvers: panel };
    model.finalizeBatch(command); const after = model.snapshot();
    model.finalizeBatch(structuredClone(command)); assert.deepEqual(model.snapshot(), after);
    const ownerId = Object.keys(payments).find(k => model.batch(command.batchId).allocations[k] === 1);
    submit(model, `${command.batchId}:${ownerId}`); resolve(model, `${command.batchId}:${ownerId}`); payments[ownerId]++;
  }
  assert.deepEqual(payments, { A: 5, B: 3, C: 1 });
  unchanged(model, () => model.finalizeBatch({ batchId: 'b10', amount: 1, expectedRevision: model.revision, approvers: panel }), 'INSUFFICIENT_REFUND_CASH');
});

test('債務/準備金/手数料55円を留保し返金45円までとする', () => {
  const model = new RefundModel({ owners: [{ id: 'A', gross: 100 }], liabilities: [
    { id: 'legal-debt', amount: 40 }, { id: 'reserve', amount: 10 }, { id: 'fee-due', amount: 5 },
  ] });
  assert.equal(model.refundAvailable, 45);
  unchanged(model, () => model.finalizeBatch({ batchId: 'b1', amount: 46, expectedRevision: model.revision, approvers: panel }), 'INSUFFICIENT_REFUND_CASH');
  model.finalizeBatch({ batchId: 'b1', amount: 45, expectedRevision: model.revision, approvers: panel });
  model.consumeCancellation(cancellation('cancel-A', 80));
  offset(model, 'cancel-A', 'b1:A');
  assert.equal(model.cash, 20); assert.equal(model.reserved('A'), 20);
  assert.equal(model.obligations, 75); assert.equal(model.shortfall, 55);
  assert.equal(model.snapshot().liabilities.get('legal-debt'), 40);
  unchanged(model, () => model.submitRefund(model.prepareExecution('b1:A')), 'INSUFFICIENT_REFUND_CASH');
  unchanged(model, () => model.finalizeBatch({ batchId: 'b2', amount: 1, expectedRevision: model.revision, approvers: panel }), 'INSUFFICIENT_REFUND_CASH');
});

test('返金済み後の全取消で現金不足は外部立替債務として記録し他人へ転嫁しない', () => {
  const model = new RefundModel({ owners: [{ id: 'A', gross: 100 }] });
  model.finalizeBatch({ batchId: 'b1', amount: 100, expectedRevision: model.revision, approvers: panel });
  submit(model, 'b1:A'); resolve(model, 'b1:A');
  model.consumeCancellation(cancellation('cancel-A', 100));
  assert.equal(model.cash, 0); assert.equal(model.snapshot().externalAdvance, 100);
  assert.equal(model.shortfall, 100); assert.equal(model.overpayment('A'), 100);
  assert.equal(model.owner('A').completed, 100); assert.equal(model.invariants(), true);
});

test('費用負担でcapが先に小さくなる参加者は上限付き配分を行う', () => {
  const model = new RefundModel({ owners: [{ id: 'A', gross: 100, nonRefundable: 90 }, { id: 'B', gross: 100 }] });
  model.finalizeBatch({ batchId: 'b1', amount: 100, expectedRevision: model.revision, approvers: panel });
  assert.deepEqual(model.batch('b1').allocations, { A: 10, B: 90 });
  assert.equal(model.invariants(), true);
});

test('JPY非整数・負数・安全整数超過と重複所有者を拒否する', () => {
  for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => new RefundModel({ owners: [{ id: 'A', gross: value }] }), /INVALID_YEN/);
    const model = fixture();
    unchanged(model, () => model.finalizeBatch({ batchId: 'b2', amount: value, expectedRevision: model.revision, approvers: panel }), 'INVALID_YEN');
  }
  assert.throws(() => new RefundModel({ owners: [{ id: 'A', gross: Number.MAX_SAFE_INTEGER }, { id: 'B', gross: 1 }] }), /INVALID_YEN/);
  assert.throws(() => new RefundModel({ owners: [{ id: 'A', gross: 100 }, { id: 'A', gross: 100 }] }), /DUPLICATE_OWNER/);
  assert.throws(() => new RefundModel({ owners: [{ id: 'A', gross: 100 }], liabilities: [{ id: 'debt', amount: 1 }, { id: 'debt', amount: 1 }] }), /DUPLICATE_LIABILITY/);
});
