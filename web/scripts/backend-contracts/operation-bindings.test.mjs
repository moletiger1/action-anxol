import assert from 'node:assert/strict';
import test from 'node:test';
import { P1_NAMESPACE } from '../../src/domain/operational/envelope.ts';
import { canonicalizeFixtureJSON } from '../../src/domain/operational/strict-json.ts';
import { deriveRefundBankKey, deriveRefundOperationKey, deriveRefundOffsetKey } from '../../src/domain/operational/refund-contract.ts';
import { parseFixtureRefundOffset, validateFixtureRefundExecute, validateFixtureRefundOffset } from '../../src/domain/operational/operation-bindings.ts';

const canonical = object => canonicalizeFixtureJSON(JSON.stringify(object)).value;
function fixture() {
  const recruitmentId = 'fixture-r', batchId = 'fixture-b', privateRefundOwnerRef = 'fixture-owner';
  const bankKey = deriveRefundBankKey(recruitmentId, batchId, privateRefundOwnerRef);
  const original = { recruitmentId, batchId, privateRefundOwnerRef, bankKey,
    operationKey: deriveRefundOperationKey(bankKey, 3), executionVersion: 3, amount: 20,
    transactionVersion: 5, instructionVersion: 7, approvedRevision: 6, recipientRef: 'fixture-recipient' };
  const context = { recruitmentId, batchId, privateRefundOwnerRef, bankKey, executionVersion: 3,
    transactionVersion: 8, instructionVersion: 11, expectedRevision: 9, remainingAmount: 20,
    recipientRef: 'fixture-recipient', holderProofRef: 'fixture-holder' };
  const envelope = { ...P1_NAMESPACE, operationName: 'executeRefund', targetId: bankKey, targetVersion: 7,
    payloadHash: 'a'.repeat(64), expectedStateRoot: 'b'.repeat(64), nonce: 'fixture-nonce',
    idempotencyKey: original.operationKey, issuedAt: 1000, expiresAt: 1100,
    signerProof: { kind: 'unconfigured', proofRef: 'fixture-signer' } };
  const expectation = { payloadHash: envelope.payloadHash, expectedStateRoot: envelope.expectedStateRoot,
    payloadCanonical: canonical(original), transactionVersion: 8, instructionVersion: 11, revision: 9,
    remainingAmount: 20, recipientRef: 'fixture-recipient', holderProofRef: 'fixture-holder' };
  return { original, request: { envelope, intent: { ...original }, context }, expectation };
}
const execute = f => validateFixtureRefundExecute(JSON.stringify(f.request), f.original, f.expectation, 1050);
const rejected = result => {
  assert.equal(result.ok, false);
  assert.notEqual(result.error, 'NOT_IMPLEMENTED', 'reject must reach an implemented validation boundary');
};

test('joins original instruction7/execution3 with latest context11; remains untrusted', () => {
  const f = fixture(), before = structuredClone(f);
  const result = execute(f);
  assert.equal(result.ok, true);
  assert.equal(result.value.trust, 'untrusted-fixture');
  assert.equal(result.value.operationName, 'executeRefund');
  assert.equal(Object.isFrozen(result.value.context), true);
  assert.equal(Object.isFrozen(result.value.envelope.signerProof), true);
  assert.deepEqual(f, before);
});
for (const [field, value] of [['operationName', 'offsetRefundReservation'], ['targetId', 'fixture-wrong'],
  ['targetVersion', 3], ['idempotencyKey', 'fixture-other'], ['payloadHash', 'c'.repeat(64)], ['expectedStateRoot', 'c'.repeat(64)]]) {
  test(`execute rejects cross-swap of envelope ${field}`, () => {
    const f = fixture(); f.request.envelope[field] = value; rejected(execute(f));
  });
}
test('original targetVersion cannot be rewritten to latest context instructionVersion', () => {
  const f = fixture(); f.request.envelope.targetVersion = f.request.context.instructionVersion;
  rejected(execute(f));
});
test('executionVersion-only change with a recalculated key cannot rewrite original intent', () => {
  const f = fixture(); f.request.intent.executionVersion = 4;
  f.request.intent.operationKey = deriveRefundOperationKey(f.original.bankKey, 4);
  f.request.envelope.idempotencyKey = f.request.intent.operationKey;
  rejected(execute(f));
});
test('same opaque hash with altered intent cannot pass canonical binding', () => {
  const f = fixture(); f.request.intent.amount = 21; rejected(execute(f));
  const g = fixture(); g.expectation.payloadCanonical = canonical({ ...g.original, amount: 21 }); rejected(execute(g));
});
for (const key of Object.keys(fixture().expectation)) {
  test(`execute requires fixture expectation ${key}`, () => {
    const f = fixture(); delete f.expectation[key]; rejected(execute(f));
  });
}
for (const [key, value] of Object.entries({ payloadHash: 'c'.repeat(64), expectedStateRoot: 'c'.repeat(64),
  payloadCanonical: '{}', transactionVersion: 9, instructionVersion: 12, revision: 10, remainingAmount: 21,
  recipientRef: 'fixture-other', holderProofRef: 'fixture-other' })) {
  test(`execute rejects expectation substitution ${key}`, () => {
    const f = fixture(); f.expectation[key] = value; rejected(execute(f));
  });
}
test('current-only changes do not alter immutable replay canonical', () => {
  const a = fixture(), b = fixture();
  b.request.context.transactionVersion++; b.expectation.transactionVersion++;
  b.request.context.instructionVersion++; b.expectation.instructionVersion++;
  b.request.context.expectedRevision++; b.expectation.revision++;
  const first = execute(a), later = execute(b);
  assert.equal(first.ok, true); assert.equal(later.ok, true);
  assert.equal(first.value.immutableCanonical, later.value.immutableCanonical);
  assert.notDeepEqual(first.value.context, later.value.context);
  assert.equal(JSON.parse(first.value.immutableCanonical).context, undefined);
});
test('extra bundle/header/context/expectation fields and PII are rejected', () => {
  for (const target of ['request', 'expectation']) {
    const f = fixture(); f[target].email = 'not-a-real-address'; rejected(execute(f));
  }
  for (const target of ['envelope', 'intent', 'context']) {
    const f = fixture(); f.request[target].verified = true; rejected(execute(f));
  }
});
test('missing bundle fields, object input, malformed duplicate and float wire values reject', () => {
  for (const key of ['envelope', 'intent', 'context']) {
    const f = fixture(); delete f.request[key]; rejected(execute(f));
  }
  const f = fixture();
  rejected(validateFixtureRefundExecute(f.request, f.original, f.expectation, 1050));
  const raw = JSON.stringify(f.request).replace('"amount":20', '"\\u0061mount":20,"amount":20');
  assert.deepEqual(validateFixtureRefundExecute(raw, f.original, f.expectation, 1050), { ok: false, error: 'DUPLICATE_KEY' });
  rejected(validateFixtureRefundExecute(JSON.stringify(f.request).replace('"amount":20', '"amount":20.0'), f.original, f.expectation, 1050));
});
test('expectation accessor is rejected without evaluation and expiry is still checked', () => {
  const f = fixture(); let invoked = 0;
  Object.defineProperty(f.expectation, 'payloadHash', { get() { invoked++; throw Error('private'); }, enumerable: true });
  rejected(execute(f)); assert.equal(invoked, 0);
  const g = fixture(); rejected(validateFixtureRefundExecute(JSON.stringify(g.request), g.original, g.expectation, 1100));
});
function offsetFixture() {
  const f = fixture();
  const offset = { recruitmentId: f.original.recruitmentId, batchId: f.original.batchId,
    privateRefundOwnerRef: f.original.privateRefundOwnerRef, bankKey: f.original.bankKey,
    cancelEventId: 'fixture-cancel', preinstructionVersion: 11,
    offsetKey: deriveRefundOffsetKey('fixture-cancel', f.original.bankKey, 11), offsetAmount: 30,
    transactionVersion: 8, approvedRevision: 9, terminalProofRef: 'fixture-terminal', fenceRef: 'fixture-fence' };
  const envelope = { ...f.request.envelope, operationName: 'offsetRefundReservation', targetVersion: 11,
    idempotencyKey: offset.offsetKey };
  const expectation = { payloadHash: envelope.payloadHash, expectedStateRoot: envelope.expectedStateRoot, payloadCanonical: canonical(offset) };
  return { original: offset, request: { envelope, offset: { ...offset } }, expectation };
}
const applyOffset = f => validateFixtureRefundOffset(JSON.stringify(f.request), f.original, f.expectation, 1050);
test('offset DTO and joined operation remain untrusted without terminal/fence proof acceptance', () => {
  const f = offsetFixture(); const dto = parseFixtureRefundOffset(f.original);
  assert.equal(dto.ok, true); assert.equal(dto.value.trust, 'untrusted-fixture');
  const result = applyOffset(f); assert.equal(result.ok, true);
  assert.equal(result.value.operationName, 'offsetRefundReservation');
  assert.equal(result.value.trust, 'untrusted-fixture');
  assert.equal(Object.isFrozen(result.value.offset), true);
});
for (const key of Object.keys(offsetFixture().original)) {
  test(`offset original ${key} cannot be substituted or omitted`, () => {
    const f = offsetFixture();
    f.request.offset[key] = typeof f.request.offset[key] === 'number' ? f.request.offset[key] + 1 : 'fixture-other';
    rejected(applyOffset(f));
    const g = offsetFixture(); delete g.request.offset[key]; rejected(applyOffset(g));
  });
}
for (const [key, value] of [['operationName', 'executeRefund'], ['targetId', 'fixture-other'], ['targetVersion', 3], ['idempotencyKey', 'fixture-other']]) {
  test(`offset envelope ${key} must bind the original offset tuple`, () => {
    const f = offsetFixture(); f.request.envelope[key] = value; rejected(applyOffset(f));
  });
}
test('offset rejects status/verified/bankNotSent claims and real refs without proof promotion', () => {
  for (const key of ['status', 'verified', 'bankNotSent']) {
    const f = offsetFixture(); f.request.offset[key] = true; rejected(applyOffset(f));
  }
  const f = offsetFixture(); f.request.offset.fenceRef = 'real-fence'; rejected(applyOffset(f));
});
test('offset expectation is exactly three fields and checks full payload/root/hash pair', () => {
  for (const key of Object.keys(offsetFixture().expectation)) {
    const f = offsetFixture(); delete f.expectation[key]; rejected(applyOffset(f));
    const g = offsetFixture(); g.expectation[key] = key === 'payloadCanonical' ? '{}' : 'c'.repeat(64); rejected(applyOffset(g));
  }
  const f = offsetFixture(); f.expectation.actorApproved = true; rejected(applyOffset(f));
});
