import type { ContractResult } from './primitives.ts';
import { exactRecord, fail, fixtureRef, validate, version, yen } from './primitives.ts';
import type { FixtureEnvelope } from './envelope.ts';
import { parseFixtureEnvelope } from './envelope.ts';
import type { RefundContext, RefundIntent } from './refund-contract.ts';
import { deriveRefundBankKey, deriveRefundOffsetKey, validateRefundDispatch } from './refund-contract.ts';
import { canonicalizeFixtureJSON, parseStrictFixtureJSON } from './strict-json.ts';

/** Synthetic offset proposal, not cancellation/fence/terminal evidence or adjudication. */
export type FixtureRefundOffset = Readonly<{
  recruitmentId: string; batchId: string; privateRefundOwnerRef: string; bankKey: string;
  cancelEventId: string; preinstructionVersion: number; offsetKey: string; offsetAmount: number;
  transactionVersion: number; approvedRevision: number; terminalProofRef: string; fenceRef: string;
}>;
export type UntrustedRefundExecuteOperation = Readonly<{
  trust: 'untrusted-fixture'; operationName: 'executeRefund'; envelope: FixtureEnvelope;
  intent: RefundIntent; context: RefundContext; immutableCanonical: string;
}>;
export type UntrustedRefundOffsetOperation = Readonly<{
  trust: 'untrusted-fixture'; operationName: 'offsetRefundReservation'; envelope: FixtureEnvelope;
  offset: FixtureRefundOffset; immutableCanonical: string;
}>;
const offsetKeys = ['recruitmentId', 'batchId', 'privateRefundOwnerRef', 'bankKey', 'cancelEventId',
  'preinstructionVersion', 'offsetKey', 'offsetAmount', 'transactionVersion', 'approvedRevision',
  'terminalProofRef', 'fenceRef'] as const;
const payloadExpectationKeys = ['payloadHash', 'expectedStateRoot', 'payloadCanonical'] as const;
const contextExpectationKeys = ['transactionVersion', 'instructionVersion', 'revision', 'remainingAmount',
  'recipientRef', 'holderProofRef'] as const;

function unwrap<T>(result: ContractResult<T>): T {
  if (!result.ok) fail(result.error);
  return result.value;
}
// Used only with parsed/cloned, data-only DTOs, never arbitrary caller JS objects.
function canonicalData(data: unknown): string {
  return unwrap(canonicalizeFixtureJSON(JSON.stringify(data)));
}
function bundle(input: unknown, keys: readonly string[]): Record<string, unknown> {
  return exactRecord(unwrap(parseStrictFixtureJSON(input)), keys);
}
function envelope(input: unknown, fixtureNow: unknown): FixtureEnvelope {
  // input comes from the text-only parser's fresh, frozen, data-only tree.
  return unwrap(parseFixtureEnvelope(JSON.stringify(input), fixtureNow)).envelope;
}

/** Claimed fixture oracle ONLY. Equality is neither a digest check nor a root proof. */
function bindPayload(header: FixtureEnvelope, payload: unknown, expected: Record<string, unknown>): void {
  if (expected.payloadHash !== header.payloadHash || expected.expectedStateRoot !== header.expectedStateRoot) fail('INTENT_CONFLICT');
  const canonical = unwrap(canonicalizeFixtureJSON(expected.payloadCanonical));
  if (canonical !== expected.payloadCanonical || canonical !== canonicalData(payload)) fail('INTENT_CONFLICT');
}

export function parseFixtureRefundOffset(input: unknown): ContractResult<Readonly<{
  trust: 'untrusted-fixture'; offset: FixtureRefundOffset;
}>> {
  return validate(() => {
    const record = exactRecord(input, offsetKeys);
    const recruitmentId = fixtureRef(record.recruitmentId);
    const batchId = fixtureRef(record.batchId);
    const privateRefundOwnerRef = fixtureRef(record.privateRefundOwnerRef);
    const bankKey = deriveRefundBankKey(recruitmentId, batchId, privateRefundOwnerRef);
    if (record.bankKey !== bankKey) fail('INTENT_CONFLICT');
    const cancelEventId = fixtureRef(record.cancelEventId);
    const preinstructionVersion = version(record.preinstructionVersion);
    const offsetKey = deriveRefundOffsetKey(cancelEventId, bankKey, preinstructionVersion);
    if (record.offsetKey !== offsetKey) fail('INTENT_CONFLICT');
    const offset: FixtureRefundOffset = Object.freeze({ recruitmentId, batchId, privateRefundOwnerRef,
      bankKey, cancelEventId, preinstructionVersion, offsetKey, offsetAmount: yen(record.offsetAmount),
      transactionVersion: version(record.transactionVersion), approvedRevision: version(record.approvedRevision),
      terminalProofRef: fixtureRef(record.terminalProofRef), fenceRef: fixtureRef(record.fenceRef) });
    return Object.freeze({ trust: 'untrusted-fixture' as const, offset });
  });
}

/** Fixture unadmitted request only. Historical permits/retries require later authoritative ports. */
export function validateFixtureRefundExecute(input: unknown, original: unknown, expectation: unknown,
  fixtureNow: unknown): ContractResult<UntrustedRefundExecuteOperation> {
  return validate(() => {
    const request = bundle(input, ['envelope', 'intent', 'context']);
    const expected = exactRecord(expectation, [...payloadExpectationKeys, ...contextExpectationKeys]);
    const header = envelope(request.envelope, fixtureNow);
    if (header.operationName !== 'executeRefund') fail('UNSUPPORTED_OPERATION');
    const dispatch = unwrap(validateRefundDispatch(original, request.intent, request.context, {
      transactionVersion: expected.transactionVersion, instructionVersion: expected.instructionVersion,
      revision: expected.revision, remainingAmount: expected.remainingAmount,
      recipientRef: expected.recipientRef, holderProofRef: expected.holderProofRef,
    }));
    const { intent, context } = dispatch;
    // Fixture wire choice: targetVersion is ORIGINAL instructionVersion, not executionVersion
    // or the newer context instructionVersion. No normative production schema is adopted.
    if (header.targetId !== intent.bankKey || header.targetVersion !== intent.instructionVersion
      || header.idempotencyKey !== intent.operationKey) fail('INTENT_CONFLICT');
    bindPayload(header, intent, expected);
    return Object.freeze({ trust: 'untrusted-fixture' as const, operationName: 'executeRefund' as const,
      envelope: header, intent, context, immutableCanonical: canonicalData({ envelope: header, intent }) });
  });
}

export function validateFixtureRefundOffset(input: unknown, original: unknown, expectation: unknown,
  fixtureNow: unknown): ContractResult<UntrustedRefundOffsetOperation> {
  return validate(() => {
    const request = bundle(input, ['envelope', 'offset']);
    const expected = exactRecord(expectation, payloadExpectationKeys);
    const header = envelope(request.envelope, fixtureNow);
    if (header.operationName !== 'offsetRefundReservation') fail('UNSUPPORTED_OPERATION');
    const baseline = unwrap(parseFixtureRefundOffset(original)).offset;
    const offset = unwrap(parseFixtureRefundOffset(request.offset)).offset;
    if (offsetKeys.some(key => baseline[key] !== offset[key])) fail('INTENT_CONFLICT');
    if (header.targetId !== offset.bankKey || header.targetVersion !== offset.preinstructionVersion
      || header.idempotencyKey !== offset.offsetKey) fail('INTENT_CONFLICT');
    bindPayload(header, offset, expected);
    return Object.freeze({ trust: 'untrusted-fixture' as const, operationName: 'offsetRefundReservation' as const,
      envelope: header, offset, immutableCanonical: canonicalData({ envelope: header, offset }) });
  });
}
