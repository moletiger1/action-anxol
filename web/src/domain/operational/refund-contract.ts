import type { ContractResult } from './primitives.ts';
import { exactRecord, fail, fixtureRef, validate, version, yen } from './primitives.ts';

/** P1 syntactic fixtures only: none of these DTOs constitute bank or holder acceptance. */
export type RefundIntent = Readonly<{
  recruitmentId: string;
  batchId: string;
  privateRefundOwnerRef: string;
  bankKey: string;
  operationKey: string;
  executionVersion: number;
  amount: number;
  transactionVersion: number;
  instructionVersion: number;
  approvedRevision: number;
  recipientRef: string;
}>;

export type RefundContext = Readonly<{
  recruitmentId: string;
  batchId: string;
  privateRefundOwnerRef: string;
  bankKey: string;
  executionVersion: number;
  transactionVersion: number;
  instructionVersion: number;
  expectedRevision: number;
  remainingAmount: number;
  recipientRef: string;
  holderProofRef: string;
}>;

/** Caller-provided fixture oracle; explicitly NOT an authoritative current-state proof. */
export type RefundFixtureExpectation = Readonly<{
  transactionVersion: number;
  instructionVersion: number;
  revision: number;
  remainingAmount: number;
  recipientRef: string;
  holderProofRef: string;
}>;

export type UntrustedRefundIntent = Readonly<{
  trust: 'untrusted-fixture';
  intent: RefundIntent;
}>;
export type UntrustedRefundContext = Readonly<{
  trust: 'untrusted-fixture';
  context: RefundContext;
}>;
export type UntrustedRefundDispatch = Readonly<{
  trust: 'untrusted-fixture';
  intent: RefundIntent;
  context: RefundContext;
}>;

const intentKeys = [
  'recruitmentId', 'batchId', 'privateRefundOwnerRef', 'bankKey', 'operationKey',
  'executionVersion', 'amount', 'transactionVersion', 'instructionVersion',
  'approvedRevision', 'recipientRef',
] as const;
const contextKeys = [
  'recruitmentId', 'batchId', 'privateRefundOwnerRef', 'bankKey', 'executionVersion',
  'transactionVersion', 'instructionVersion', 'expectedRevision', 'remainingAmount',
  'recipientRef', 'holderProofRef',
] as const;
const expectationKeys = [
  'transactionVersion', 'instructionVersion', 'revision', 'remainingAmount',
  'recipientRef', 'holderProofRef',
] as const;
const bankPrefix = 'fixture-bank-';

// All tuple parts are bounded ASCII; decimal lengths are exact byte lengths here.
// This is an injective fixture identity encoding, NOT a hash/signature/crypto choice.
function tuple(parts: readonly string[]): string {
  return parts.map((part) => `${part.length}:${part}`).join('');
}

export function deriveRefundBankKey(
  recruitmentId: unknown, batchId: unknown, privateRefundOwnerRef: unknown,
): string {
  return `${bankPrefix}${tuple([
    fixtureRef(recruitmentId), fixtureRef(batchId), fixtureRef(privateRefundOwnerRef),
  ])}`;
}

/** Derived keys are bounded canonical tuples, not the short opaque fixtureRef grammar. */
function canonicalBankKey(input: unknown): string {
  if (typeof input !== 'string') fail('INVALID_STRING');
  if (!input.startsWith('fixture-')) fail('FIXTURE_ONLY');
  // Three refs of maximum length 72, each with its two-digit length and colon.
  if (!input.startsWith(bankPrefix) || input.length > bankPrefix.length + 3 * 75) fail('INTENT_CONFLICT');
  let cursor = bankPrefix.length;
  const parts: string[] = [];
  for (let index = 0; index < 3; index++) {
    const colon = input.indexOf(':', cursor);
    if (colon === -1) fail('INTENT_CONFLICT');
    const lengthText = input.slice(cursor, colon);
    const length = Number(lengthText);
    if (!Number.isSafeInteger(length) || length < 9 || length > 72
      || String(length) !== lengthText) fail('INTENT_CONFLICT');
    const start = colon + 1;
    const part = input.slice(start, start + length);
    if (part.length !== length) fail('INTENT_CONFLICT');
    parts.push(fixtureRef(part));
    cursor = start + length;
  }
  if (cursor !== input.length || `${bankPrefix}${tuple(parts)}` !== input) fail('INTENT_CONFLICT');
  return input;
}

export function deriveRefundOperationKey(bankKey: unknown, executionVersion: unknown): string {
  return `fixture-operation-${tuple([
    canonicalBankKey(bankKey), 'executeRefund', String(version(executionVersion)),
  ])}`;
}

export function deriveRefundOffsetKey(
  cancelEventId: unknown, bankKey: unknown, preinstructionVersion: unknown,
): string {
  return `fixture-offset-${tuple([
    fixtureRef(cancelEventId), canonicalBankKey(bankKey), String(version(preinstructionVersion)),
  ])}`;
}

function readIntent(input: unknown): RefundIntent {
  const record = exactRecord(input, intentKeys);
  const recruitmentId = fixtureRef(record.recruitmentId);
  const batchId = fixtureRef(record.batchId);
  const privateRefundOwnerRef = fixtureRef(record.privateRefundOwnerRef);
  const executionVersion = version(record.executionVersion);
  const amount = yen(record.amount);
  const transactionVersion = version(record.transactionVersion);
  const instructionVersion = version(record.instructionVersion);
  const approvedRevision = version(record.approvedRevision);
  const recipientRef = fixtureRef(record.recipientRef);
  const bankKey = deriveRefundBankKey(recruitmentId, batchId, privateRefundOwnerRef);
  const operationKey = deriveRefundOperationKey(bankKey, executionVersion);
  if (record.bankKey !== bankKey || record.operationKey !== operationKey) fail('INTENT_CONFLICT');
  return Object.freeze({
    recruitmentId, batchId, privateRefundOwnerRef, bankKey, operationKey, executionVersion,
    amount, transactionVersion, instructionVersion, approvedRevision, recipientRef,
  });
}

function readContext(input: unknown): RefundContext {
  const record = exactRecord(input, contextKeys);
  const recruitmentId = fixtureRef(record.recruitmentId);
  const batchId = fixtureRef(record.batchId);
  const privateRefundOwnerRef = fixtureRef(record.privateRefundOwnerRef);
  const executionVersion = version(record.executionVersion);
  const transactionVersion = version(record.transactionVersion);
  const instructionVersion = version(record.instructionVersion);
  const expectedRevision = version(record.expectedRevision);
  const remainingAmount = yen(record.remainingAmount);
  const recipientRef = fixtureRef(record.recipientRef);
  const holderProofRef = fixtureRef(record.holderProofRef);
  const bankKey = deriveRefundBankKey(recruitmentId, batchId, privateRefundOwnerRef);
  if (record.bankKey !== bankKey) fail('CONTEXT_CONFLICT');
  return Object.freeze({
    recruitmentId, batchId, privateRefundOwnerRef, bankKey, executionVersion,
    transactionVersion, instructionVersion, expectedRevision, remainingAmount,
    recipientRef, holderProofRef,
  });
}

function readExpectation(input: unknown): RefundFixtureExpectation {
  const record = exactRecord(input, expectationKeys);
  return Object.freeze({
    transactionVersion: version(record.transactionVersion),
    instructionVersion: version(record.instructionVersion),
    revision: version(record.revision),
    remainingAmount: yen(record.remainingAmount),
    recipientRef: fixtureRef(record.recipientRef),
    holderProofRef: fixtureRef(record.holderProofRef),
  });
}

/** Input is the raw exact-key DTO; output is a cloned, immutable, untrusted fixture. */
export function parseRefundIntent(input: unknown): ContractResult<UntrustedRefundIntent> {
  return validate(() => Object.freeze({ trust: 'untrusted-fixture', intent: readIntent(input) }));
}

export function parseRefundContext(input: unknown): ContractResult<UntrustedRefundContext> {
  return validate(() => Object.freeze({ trust: 'untrusted-fixture', context: readContext(input) }));
}

function unchangedIntent(original: unknown, candidate: unknown): RefundIntent {
  const stored = readIntent(original);
  const proposed = readIntent(candidate);
  // Compare the entire normalized payload, not merely operationKey or amount.
  if (intentKeys.some((key) => stored[key] !== proposed[key])) fail('INTENT_CONFLICT');
  return stored;
}

/** Compare raw DTOs, including all original approval versions and canonical identity. */
export function compareRefundIntent(
  original: unknown, candidate: unknown,
): ContractResult<UntrustedRefundIntent> {
  return validate(() => Object.freeze({
    trust: 'untrusted-fixture', intent: unchangedIntent(original, candidate),
  }));
}

/**
 * Syntactic P1 fixture check only; this does not dispatch money or authorize a retry.
 * `expected` is mandatory but only a caller fixture oracle, never an authoritative
 * bank/state/holder proof. Authenticity, revocation, fences, receipts and admission
 * remain the responsibility of later verified server/external contracts.
 */
export function validateRefundDispatch(
  original: unknown, candidate: unknown, current: unknown, expected: unknown,
): ContractResult<UntrustedRefundDispatch> {
  return validate(() => {
    const intent = unchangedIntent(original, candidate);
    const context = readContext(current);
    const expectation = readExpectation(expected);
    if (context.recruitmentId !== intent.recruitmentId || context.batchId !== intent.batchId
      || context.privateRefundOwnerRef !== intent.privateRefundOwnerRef
      || context.bankKey !== intent.bankKey || context.executionVersion !== intent.executionVersion
      || context.transactionVersion !== expectation.transactionVersion
      || context.instructionVersion !== expectation.instructionVersion
      || context.expectedRevision !== expectation.revision
      || context.remainingAmount !== expectation.remainingAmount
      || context.recipientRef !== expectation.recipientRef
      || context.holderProofRef !== expectation.holderProofRef
      || context.remainingAmount !== intent.amount || context.recipientRef !== intent.recipientRef
      || context.transactionVersion < intent.transactionVersion
      || context.instructionVersion < intent.instructionVersion
      || context.expectedRevision < intent.approvedRevision) fail('CONTEXT_CONFLICT');
    // Original intent versions stay immutable; newer context versions are separate.
    return Object.freeze({ trust: 'untrusted-fixture', intent, context });
  });
}
