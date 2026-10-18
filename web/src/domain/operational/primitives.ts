export type ContractCode =
  | 'NOT_IMPLEMENTED' | 'INVALID_JSON' | 'DUPLICATE_KEY' | 'UNSAFE_KEY'
  | 'INPUT_LIMIT' | 'INVALID_STRING' | 'INVALID_INTEGER' | 'INVALID_RECORD'
  | 'FIELDS_MISMATCH' | 'FIXTURE_ONLY' | 'UNSUPPORTED_OPERATION'
  | 'UNCONFIGURED_PROOF_REQUIRED' | 'EXPIRED' | 'FUTURE_ISSUED_AT'
  | 'INVALID_TIME_WINDOW' | 'INTENT_CONFLICT' | 'CONTEXT_CONFLICT'
  | 'JPY_INVALID' | 'JPY_OVERFLOW' | 'INTEGER_INVALID'
  | 'INTERNAL_VALIDATION_FAILED';

export type ContractResult<T> = { ok: true; value: T } | { ok: false; error: ContractCode };

const codes: ReadonlySet<string> = new Set<ContractCode>([
  'NOT_IMPLEMENTED', 'INVALID_JSON', 'DUPLICATE_KEY', 'UNSAFE_KEY', 'INPUT_LIMIT',
  'INVALID_STRING', 'INVALID_INTEGER', 'INVALID_RECORD', 'FIELDS_MISMATCH',
  'FIXTURE_ONLY', 'UNSUPPORTED_OPERATION', 'UNCONFIGURED_PROOF_REQUIRED', 'EXPIRED',
  'FUTURE_ISSUED_AT', 'INVALID_TIME_WINDOW', 'INTENT_CONFLICT', 'CONTEXT_CONFLICT',
  'JPY_INVALID', 'JPY_OVERFLOW', 'INTEGER_INVALID', 'INTERNAL_VALIDATION_FAILED',
]);
// Do not inspect properties of arbitrary thrown values (including getters/proxies).
const contractErrors = new WeakMap<object, ContractCode>();

export class ContractError extends Error {
  readonly code: ContractCode;

  constructor(code: ContractCode) {
    const safeCode = typeof code === 'string' && codes.has(code)
      ? code : 'INTERNAL_VALIDATION_FAILED';
    super(safeCode);
    this.name = 'ContractError';
    this.code = safeCode;
    contractErrors.set(this, safeCode);
    Object.freeze(this);
  }
}

export function fail(code: ContractCode): never {
  throw new ContractError(code);
}

export function validate<T>(fn: () => T): ContractResult<T> {
  try {
    return { ok: true, value: fn() };
  } catch (error: unknown) {
    const code = error !== null && (typeof error === 'object' || typeof error === 'function')
      ? contractErrors.get(error) : undefined;
    return { ok: false, error: code ?? 'INTERNAL_VALIDATION_FAILED' };
  }
}

/** Shallow descriptor-only copy. Callers must validate every nested field separately. */
export function exactRecord(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) fail('INVALID_RECORD');
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== null && prototype !== Object.prototype) fail('INVALID_RECORD');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const ownKeys = Reflect.ownKeys(descriptors);
  for (const key of ownKeys) {
    if (typeof key !== 'string') fail('INVALID_RECORD');
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') fail('UNSAFE_KEY');
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail('INVALID_RECORD');
  }
  const expectedKeys = new Set(keys);
  if (expectedKeys.size !== keys.length || ownKeys.length !== keys.length
    || ownKeys.some((key) => !expectedKeys.has(key as string))) fail('FIELDS_MISMATCH');
  const copy: Record<string, unknown> = Object.create(null);
  for (const key of keys) copy[key] = descriptors[key].value;
  return copy;
}

export function fixtureRef(input: unknown): string {
  if (typeof input !== 'string') fail('INVALID_STRING');
  // Compare the whole match to reject the final-newline exception of JS's `$` anchor.
  const match = /^fixture-[A-Za-z0-9_-]{1,64}$/.exec(input);
  if (match === null || match[0] !== input) fail('FIXTURE_ONLY');
  return input;
}

function nonnegativeInteger(input: unknown, error: ContractCode): number {
  if (typeof input !== 'number' || !Number.isSafeInteger(input)
    || input < 0 || Object.is(input, -0)) fail(error);
  return input;
}

export function version(input: unknown): number {
  return nonnegativeInteger(input, 'INTEGER_INVALID');
}

export function yen(input: unknown): number {
  return nonnegativeInteger(input, 'JPY_INVALID');
}

function checkedYen(input: bigint): number {
  if (input < BigInt(0)) fail('JPY_INVALID');
  if (input > BigInt(Number.MAX_SAFE_INTEGER)) fail('JPY_OVERFLOW');
  return Number(input);
}

export function addYen(a: unknown, b: unknown): number {
  return checkedYen(BigInt(yen(a)) + BigInt(yen(b)));
}

export function subtractYen(a: unknown, b: unknown): number {
  return checkedYen(BigInt(yen(a)) - BigInt(yen(b)));
}

/** Integer floor, exact even when the intermediate product exceeds Number safety. */
export function multiplyDivideYen(amount: unknown, numerator: unknown, denominator: unknown): number {
  const value = BigInt(yen(amount));
  const multiplier = BigInt(version(numerator));
  const divisor = version(denominator);
  if (divisor === 0) fail('INTEGER_INVALID');
  return checkedYen(value * multiplier / BigInt(divisor));
}
