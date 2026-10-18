import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { P1_NAMESPACE, parseFixtureEnvelope } from '../../src/domain/operational/envelope.ts';
import { deriveRefundBankKey, deriveRefundOperationKey, deriveRefundOffsetKey, validateRefundDispatch } from '../../src/domain/operational/refund-contract.ts';
import { canonicalizeFixtureJSON } from '../../src/domain/operational/strict-json.ts';
import { validateFixtureRefundExecute, validateFixtureRefundOffset } from '../../src/domain/operational/operation-bindings.ts';
import { deriveFixtureActorScope } from '../../src/domain/operational/scope.ts';
import { createFixtureReplayState, checkFixtureOperationReplay } from '../../src/domain/operational/fixture-replay.ts';

// Actual server module; only Next's compile-time poison marker is substituted.
// This is not a browser/client-build negative integration test.
const path = new URL('../../src/server/ports/closed.ts', import.meta.url);
const source = readFileSync(path, 'utf8');
const ast = ts.createSourceFile('closed.ts', source, ts.ScriptTarget.Latest, true);
const markers = ast.statements.filter(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === 'server-only');
assert.equal(markers.length, 1, 'the actual server module must have its server-only marker');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const testModule = { exports: {} };
// Compile actual code in this realm: cross-realm Object prototypes otherwise
// make strict equality fail even for identical immutable rejection results.
const evaluate = vm.compileFunction(js, ['require', 'module', 'exports'], { filename: 'closed.ts' });
evaluate(name => {
  assert.equal(name, 'server-only', 'no SDK/network dependency may be imported'); return {};
}, testModule, testModule.exports);
const { createClosedOperationalPorts, UNCONFIGURED_CAPABILITIES } = testModule.exports;
const ports = createClosedOperationalPorts();
const denied = { ok: false, code: 'PRODUCTION_PORT_UNAVAILABLE', admission: 'REJECTED', effects: 0 };

test('capability metadata is immutable UNCONFIGURED status, not an approval switch', () => {
  assert.deepEqual(UNCONFIGURED_CAPABILITIES, { finality: 'UNCONFIGURED', eligibility: 'UNCONFIGURED',
    jointCustodyBankCommit: 'UNCONFIGURED', notificationCommit: 'UNCONFIGURED' });
  assert.equal(Object.isFrozen(UNCONFIGURED_CAPABILITIES), true);
  assert.throws(() => { UNCONFIGURED_CAPABILITIES.jointCustodyBankCommit = 'VERIFIED'; }, TypeError);
  assert.deepEqual(ports.custodian.execute(UNCONFIGURED_CAPABILITIES), denied);
});

test('actual valid envelope/intent/context remain untrusted and cannot admit a live operation', () => {
  const recruitmentId = 'fixture-r', batchId = 'fixture-b', privateRefundOwnerRef = 'fixture-owner';
  const bankKey = deriveRefundBankKey(recruitmentId, batchId, privateRefundOwnerRef);
  const operationKey = deriveRefundOperationKey(bankKey, 1);
  const original = { recruitmentId, batchId, privateRefundOwnerRef, bankKey, operationKey,
    executionVersion: 1, amount: 20, transactionVersion: 1, instructionVersion: 1,
    approvedRevision: 1, recipientRef: 'fixture-recipient' };
  const current = { recruitmentId, batchId, privateRefundOwnerRef, bankKey, executionVersion: 1,
    transactionVersion: 2, instructionVersion: 3, expectedRevision: 4, remainingAmount: 20,
    recipientRef: 'fixture-recipient', holderProofRef: 'fixture-holder' };
  const expected = { transactionVersion: 2, instructionVersion: 3, revision: 4,
    remainingAmount: 20, recipientRef: 'fixture-recipient', holderProofRef: 'fixture-holder' };
  const before = structuredClone({ original, current, expected });
  const dispatch = validateRefundDispatch(original, { ...original }, current, expected);
  const envelope = parseFixtureEnvelope(JSON.stringify({ ...P1_NAMESPACE, operationName: 'executeRefund',
    targetId: bankKey, targetVersion: 1, payloadHash: 'a'.repeat(64), expectedStateRoot: 'b'.repeat(64),
    nonce: 'fixture-n', idempotencyKey: operationKey, issuedAt: 1000, expiresAt: 1100,
    signerProof: { kind: 'unconfigured', proofRef: 'fixture-proof' } }), 1050);
  assert.equal(dispatch.ok, true);
  assert.equal(envelope.ok, true);
  assert.deepEqual(ports.custodian.execute({ dispatch: dispatch.value, envelope: envelope.value,
    verified: true, gates: { G01: true, G02: true, G03: true, G04: true, G05: true } }), denied);
  assert.deepEqual({ original, current, expected }, before);
});

const canonical = value => canonicalizeFixtureJSON(JSON.stringify(value)).value;
const replayRequest = operation => ({
  actorScope: deriveFixtureActorScope({ domainTag: operation.envelope.domainTag,
    environmentId: operation.envelope.environmentId, consensusId: operation.envelope.consensusId,
    signerProofRef: operation.envelope.signerProof.proofRef }),
  nonce: operation.envelope.nonce, idempotencyKey: operation.envelope.idempotencyKey,
  immutableCanonical: operation.immutableCanonical,
});
function joinedFixture() {
  const recruitmentId = 'fixture-r', batchId = 'fixture-b', privateRefundOwnerRef = 'fixture-owner';
  const bankKey = deriveRefundBankKey(recruitmentId, batchId, privateRefundOwnerRef);
  const intent = { recruitmentId, batchId, privateRefundOwnerRef, bankKey,
    operationKey: deriveRefundOperationKey(bankKey, 3), executionVersion: 3, amount: 20,
    transactionVersion: 5, instructionVersion: 7, approvedRevision: 6, recipientRef: 'fixture-recipient' };
  const context = { recruitmentId, batchId, privateRefundOwnerRef, bankKey, executionVersion: 3,
    transactionVersion: 8, instructionVersion: 11, expectedRevision: 9, remainingAmount: 20,
    recipientRef: 'fixture-recipient', holderProofRef: 'fixture-holder' };
  const envelope = { ...P1_NAMESPACE, operationName: 'executeRefund', targetId: bankKey, targetVersion: 7,
    payloadHash: 'a'.repeat(64), expectedStateRoot: 'b'.repeat(64), nonce: 'fixture-nonce',
    idempotencyKey: intent.operationKey, issuedAt: 1000, expiresAt: 1100,
    signerProof: { kind: 'unconfigured', proofRef: 'fixture-proof' } };
  const expected = { payloadHash: envelope.payloadHash, expectedStateRoot: envelope.expectedStateRoot,
    payloadCanonical: canonical(intent), transactionVersion: 8, instructionVersion: 11, revision: 9,
    remainingAmount: 20, recipientRef: 'fixture-recipient', holderProofRef: 'fixture-holder' };
  return { intent, context, envelope, expected };
}
test('bound execute + fresh context replay never opens any live port or creates a business receipt', () => {
  const f = joinedFixture();
  const first = validateFixtureRefundExecute(JSON.stringify({ envelope: f.envelope, intent: f.intent, context: f.context }), f.intent, f.expected, 1050);
  assert.equal(first.ok, true);
  const model = checkFixtureOperationReplay(createFixtureReplayState(), replayRequest(first.value));
  assert.equal(model.ok, true); assert.equal(model.value.state.operations.length, 1);
  f.context.instructionVersion++; f.expected.instructionVersion++;
  const next = validateFixtureRefundExecute(JSON.stringify({ envelope: f.envelope, intent: f.intent, context: f.context }), f.intent, f.expected, 1050);
  assert.equal(next.ok, true);
  const again = checkFixtureOperationReplay(model.value.state, replayRequest(next.value));
  assert.equal(again.ok, true); assert.equal(again.value.replayed, true);
  assert.equal(again.value.state, model.value.state);
  for (const port of Object.values(ports)) {
    const result = Object.values(port)[0]({ operation: next.value, replay: again.value, verified: true });
    assert.deepEqual(result, denied); assert.equal('receipt' in result, false);
  }
});
test('bound offset + fixture terminal/fence refs + replay still cannot release or execute actual funds', () => {
  const f = joinedFixture();
  const offset = { recruitmentId: f.intent.recruitmentId, batchId: f.intent.batchId,
    privateRefundOwnerRef: f.intent.privateRefundOwnerRef, bankKey: f.intent.bankKey,
    cancelEventId: 'fixture-cancel', preinstructionVersion: 11,
    offsetKey: deriveRefundOffsetKey('fixture-cancel', f.intent.bankKey, 11), offsetAmount: 30,
    transactionVersion: 8, approvedRevision: 9, terminalProofRef: 'fixture-terminal', fenceRef: 'fixture-fence' };
  const envelope = { ...f.envelope, operationName: 'offsetRefundReservation', targetVersion: 11, idempotencyKey: offset.offsetKey };
  const expected = { payloadHash: envelope.payloadHash, expectedStateRoot: envelope.expectedStateRoot, payloadCanonical: canonical(offset) };
  const operation = validateFixtureRefundOffset(JSON.stringify({ envelope, offset }), offset, expected, 1050);
  assert.equal(operation.ok, true);
  const state = checkFixtureOperationReplay(createFixtureReplayState(), replayRequest(operation.value));
  assert.equal(state.ok, true); assert.equal(state.value.trust, 'untrusted-fixture');
  assert.deepEqual(ports.custodian.execute({ operation: operation.value, replay: state.value, terminal: true, fenceVerified: true }), denied);
  assert.equal('receipt' in state.value, false);
});

for (const [name, port] of Object.entries(ports)) {
  const method = Object.values(port)[0];
  test(`${name}: arbitrary claims never open a live port`, () => {
    for (const input of [null, {}, { mode: 'production', verified: true, gates: { G03: true } },
      { environmentId: 'p1-fixture', kind: 'untrusted-fixture-envelope' },
      { env: { G_01: 'true', G_02: 'true', G_03: 'true', G_04: 'true', G_05: 'true' } }]) {
      assert.deepEqual(method(input), denied);
    }
  });
  test(`${name}: no input getter/callback is invoked and no receipt is admitted`, () => {
    const input = Object.defineProperty({}, 'verified', { get() { throw Error('private'); } });
    input.commit = () => { throw Error('must not run'); };
    assert.deepEqual(method(input), denied);
    assert.equal(Object.isFrozen(method(input)), true);
  });
}
test('no injectable implementation/options; frozen port methods cannot be replaced', () => {
  const configured = createClosedOperationalPorts({ custodian: { execute() { throw Error('must not run'); } } });
  assert.deepEqual(configured.custodian.execute({ verified: true }), denied);
  assert.equal(Object.isFrozen(configured), true);
  assert.equal(Object.isFrozen(configured.custodian), true);
  assert.throws(() => { configured.custodian.execute = () => ({ ok: true }); }, TypeError);
});
