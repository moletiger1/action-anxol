import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveRefundBankKey, deriveRefundOperationKey, deriveRefundOffsetKey,
  parseRefundIntent, parseRefundContext, compareRefundIntent, validateRefundDispatch,
} from '../../src/domain/operational/refund-contract.ts';
import { validate } from '../../src/domain/operational/primitives.ts';

// Literal fixture keys make RED demonstrate missing contract behavior, not an import failure.
const tuple = (parts) => parts.map((part) => `${part.length}:${part}`).join('');
const bankKey = `fixture-bank-${tuple(['fixture-r', 'fixture-b', 'fixture-owner'])}`;
const operationKey = `fixture-operation-${tuple([bankKey, 'executeRefund', '1'])}`;
const intent = (overrides = {}) => ({
  recruitmentId: 'fixture-r', batchId: 'fixture-b', privateRefundOwnerRef: 'fixture-owner',
  bankKey, operationKey, executionVersion: 1, amount: 50, transactionVersion: 1,
  instructionVersion: 1, approvedRevision: 1, recipientRef: 'fixture-recipient', ...overrides,
});
const context = (overrides = {}) => ({
  recruitmentId: 'fixture-r', batchId: 'fixture-b', privateRefundOwnerRef: 'fixture-owner',
  bankKey, executionVersion: 1, transactionVersion: 2, instructionVersion: 3,
  expectedRevision: 4, remainingAmount: 50, recipientRef: 'fixture-recipient',
  holderProofRef: 'fixture-holder', ...overrides,
});
const expectation = (overrides = {}) => ({
  transactionVersion: 2, instructionVersion: 3, revision: 4, remainingAmount: 50,
  recipientRef: 'fixture-recipient', holderProofRef: 'fixture-holder', ...overrides,
});
const reject = (actual, error) => assert.deepEqual(actual, { ok: false, error });

test('fixed bank key is derived from an injective length-prefixed fixture scope tuple', () => {
  assert.equal(deriveRefundBankKey('fixture-r', 'fixture-b', 'fixture-owner'), bankKey);
  const keys = new Set();
  for (const a of ['fixture-a', 'fixture-a-fixture-b']) {
    for (const b of ['fixture-b', 'fixture-b-fixture-a']) {
      for (const owner of ['fixture-owner', 'fixture-owner-2']) keys.add(deriveRefundBankKey(a, b, owner));
    }
  }
  assert.equal(keys.size, 8);
  assert.notEqual(deriveRefundBankKey('fixture-a-fixture-b', 'fixture-c', 'fixture-o'), deriveRefundBankKey('fixture-a', 'fixture-b-fixture-c', 'fixture-o'));
});
test('execution operation key varies by safe execution version but not bank identity', () => {
  assert.equal(deriveRefundOperationKey(bankKey, 1), operationKey);
  assert.notEqual(deriveRefundOperationKey(bankKey, 2), operationKey);
  reject(validate(() => deriveRefundOperationKey(bankKey, -0)), 'INTEGER_INVALID');
  reject(validate(() => deriveRefundOperationKey(bankKey, Number.MAX_SAFE_INTEGER + 1)), 'INTEGER_INVALID');
});
test('offset key includes cancellation event, fixed bank key and preinstruction version', () => {
  const key = deriveRefundOffsetKey('fixture-cancel', bankKey, 3);
  assert.equal(key, `fixture-offset-${tuple(['fixture-cancel', bankKey, '3'])}`);
  assert.notEqual(key, deriveRefundOffsetKey('fixture-cancel-2', bankKey, 3));
  assert.notEqual(key, deriveRefundOffsetKey('fixture-cancel', bankKey, 4));
});
test('key derivation rejects nonfixtures and malformed/noncanonical bank identity', () => {
  reject(validate(() => deriveRefundBankKey('live-r', 'fixture-b', 'fixture-owner')), 'FIXTURE_ONLY');
  reject(validate(() => deriveRefundOperationKey('fixture-bank-forged', 1)), 'INTENT_CONFLICT');
  reject(validate(() => deriveRefundOffsetKey('live-event', bankKey, 1)), 'FIXTURE_ONLY');
});
test('parse intent clones and freezes an explicitly untrusted fixture DTO', () => {
  const input = intent();
  const parsed = parseRefundIntent(input);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.trust, 'untrusted-fixture');
  assert.deepEqual({ ...parsed.value.intent }, input);
  assert.equal(Object.isFrozen(parsed.value), true);
  assert.equal(Object.isFrozen(parsed.value.intent), true);
  input.amount = 999;
  assert.equal(parsed.value.intent.amount, 50);
  assert.throws(() => { parsed.value.intent.amount = 20; }, TypeError);
  assert.equal('verified' in parsed.value, false);
});
test('parse context clones and freezes a syntactic holder reference, not a proof grant', () => {
  const input = context();
  const parsed = parseRefundContext(input);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.trust, 'untrusted-fixture');
  assert.equal(Object.isFrozen(parsed.value.context), true);
  input.holderProofRef = 'fixture-altered';
  assert.equal(parsed.value.context.holderProofRef, 'fixture-holder');
});
test('refund DTOs reject unknown fields, PII, self-attested auth and actual proof kinds', () => {
  for (const field of ['email', 'accountNumber', 'signerProof', 'verified', 'issuer', 'holderProofKind', 'bankAccepted', 'selectedCandidateId']) {
    reject(parseRefundIntent(intent({ [field]: 'sensitive' })), 'FIELDS_MISMATCH');
    reject(parseRefundContext(context({ [field]: 'sensitive' })), 'FIELDS_MISMATCH');
  }
});
test('refund DTOs reject missing keys, accessors, nonenumerable fields and symbols', () => {
  const missing = intent(); delete missing.amount;
  reject(parseRefundIntent(missing), 'FIELDS_MISMATCH');
  let reads = 0;
  const accessor = intent(); Object.defineProperty(accessor, 'amount', { enumerable: true, get() { reads++; return 50; } });
  reject(parseRefundIntent(accessor), 'INVALID_RECORD');
  assert.equal(reads, 0);
  const hidden = context(); Object.defineProperty(hidden, 'recipientRef', { value: 'fixture-recipient', enumerable: false });
  reject(parseRefundContext(hidden), 'INVALID_RECORD');
  reject(parseRefundIntent({ ...intent(), [Symbol('private')]: 1 }), 'INVALID_RECORD');
});
for (const field of ['recruitmentId', 'batchId', 'privateRefundOwnerRef', 'recipientRef']) {
  test(`intent rejects nonfixture ${field}`, () => reject(parseRefundIntent(intent({ [field]: 'live-ref' })), 'FIXTURE_ONLY'));
}
test('context rejects a nonfixture holder reference', () => reject(parseRefundContext(context({ holderProofRef: 'real-proof' })), 'FIXTURE_ONLY'));
test('intent validates every version and amount without coercion', () => {
  for (const field of ['executionVersion', 'transactionVersion', 'instructionVersion', 'approvedRevision']) {
    for (const value of [-0, -1, 0.5, '1', Number.MAX_SAFE_INTEGER + 1]) {
      reject(parseRefundIntent(intent({ [field]: value })), 'INTEGER_INVALID');
    }
  }
  for (const amount of [-0, -1, 1.5, '50', Number.MAX_SAFE_INTEGER + 1]) reject(parseRefundIntent(intent({ amount })), 'JPY_INVALID');
});
test('derived bank and operation keys must match the full intent identity', () => {
  reject(parseRefundIntent(intent({ bankKey: 'fixture-bank-forged' })), 'INTENT_CONFLICT');
  reject(parseRefundIntent(intent({ operationKey: 'fixture-operation-forged' })), 'INTENT_CONFLICT');
  reject(parseRefundContext(context({ bankKey: 'fixture-bank-forged' })), 'CONTEXT_CONFLICT');
});
test('same full original intent in any property order compares equal', () => {
  const candidate = Object.fromEntries(Object.entries(intent()).reverse());
  const result = compareRefundIntent(intent(), candidate);
  assert.equal(result.ok, true);
  assert.equal(result.value.trust, 'untrusted-fixture');
});
test('same operation key with any changed payload, original version or recipient conflicts', () => {
  for (const [field, value] of Object.entries({ amount: 20, transactionVersion: 2, instructionVersion: 3, approvedRevision: 2, recipientRef: 'fixture-other' })) {
    reject(compareRefundIntent(intent(), intent({ [field]: value })), 'INTENT_CONFLICT');
  }
});
test('changing execution version and recomputing operation key cannot rewrite the original intent', () => {
  const candidate = intent({ executionVersion: 2, operationKey: `fixture-operation-${tuple([bankKey, 'executeRefund', '2'])}`, amount: 20 });
  reject(compareRefundIntent(intent(), candidate), 'INTENT_CONFLICT');
  reject(validateRefundDispatch(intent(), candidate, context({ executionVersion: 2, remainingAmount: 20 }), expectation({ remainingAmount: 20 })), 'INTENT_CONFLICT');
});
for (const amount of [20, 50]) {
  test(`original txn1/instruction1 with latest txn2/instruction3 accepts unchanged ${amount} fixture amount`, () => {
    const original = Object.freeze(intent({ amount }));
    const result = validateRefundDispatch(original, { ...original }, Object.freeze(context({ remainingAmount: amount })), Object.freeze(expectation({ remainingAmount: amount })));
    assert.equal(result.ok, true);
    assert.equal(result.value.trust, 'untrusted-fixture');
    assert.equal(result.value.intent.amount, amount);
    assert.equal(result.value.context.transactionVersion, 2);
    assert.equal(result.value.context.instructionVersion, 3);
    assert.equal(Object.isFrozen(result.value), true);
    assert.equal(Object.isFrozen(result.value.intent), true);
    assert.equal(Object.isFrozen(result.value.context), true);
    assert.equal('bankAccepted' in result.value, false);
  });
}
test('dispatch checks current fields against every explicitly supplied fixture expectation', () => {
  for (const [field, value] of Object.entries({ transactionVersion: 9, instructionVersion: 9, expectedRevision: 9, remainingAmount: 20, recipientRef: 'fixture-other', holderProofRef: 'fixture-other' })) {
    reject(validateRefundDispatch(intent(), intent(), context({ [field]: value }), expectation()), 'CONTEXT_CONFLICT');
  }
});
test('dispatch rejects absent and extra expectations; expectation is not an authoritative proof', () => {
  reject(validateRefundDispatch(intent(), intent(), context(), undefined), 'INVALID_RECORD');
  reject(validateRefundDispatch(intent(), intent(), context(), expectation({ verified: true })), 'FIELDS_MISMATCH');
  const result = validateRefundDispatch(intent(), intent(), context(), expectation());
  assert.equal(result.value.trust, 'untrusted-fixture');
});
test('matching current/expectation cannot authorize different amount or recipient from original', () => {
  reject(validateRefundDispatch(intent(), intent(), context({ remainingAmount: 20 }), expectation({ remainingAmount: 20 })), 'CONTEXT_CONFLICT');
  reject(validateRefundDispatch(intent(), intent(), context({ recipientRef: 'fixture-other' }), expectation({ recipientRef: 'fixture-other' })), 'CONTEXT_CONFLICT');
});
test('dispatch rejects foreign recruitment, batch or owner even with its canonical bank key', () => {
  for (const field of ['recruitmentId', 'batchId', 'privateRefundOwnerRef']) {
    const foreign = context({ [field]: 'fixture-foreign' });
    foreign.bankKey = `fixture-bank-${tuple([foreign.recruitmentId, foreign.batchId, foreign.privateRefundOwnerRef])}`;
    reject(validateRefundDispatch(intent(), intent(), foreign, expectation()), 'CONTEXT_CONFLICT');
  }
});
test('matching current and expectation still reject stale and regressed original versions', () => {
  reject(validateRefundDispatch(intent(), intent(), context({ transactionVersion: 0 }), expectation({ transactionVersion: 0 })), 'CONTEXT_CONFLICT');
  reject(validateRefundDispatch(intent(), intent(), context({ instructionVersion: 0 }), expectation({ instructionVersion: 0 })), 'CONTEXT_CONFLICT');
  reject(validateRefundDispatch(intent(), intent(), context({ expectedRevision: 0 }), expectation({ revision: 0 })), 'CONTEXT_CONFLICT');
});
test('matching amount and all current fields still reject a different execution version', () => {
  reject(validateRefundDispatch(intent(), intent(), context({ executionVersion: 2 }), expectation()), 'CONTEXT_CONFLICT');
});
