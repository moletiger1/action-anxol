import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ContractError, fail, validate, exactRecord, fixtureRef, version, yen,
  addYen, subtractYen, multiplyDivideYen,
} from '../../src/domain/operational/primitives.ts';

const result = (fn) => validate(fn);
const rejects = (fn, error) => assert.deepEqual(result(fn), { ok: false, error });
const max = Number.MAX_SAFE_INTEGER;

test('validate returns a success value', () => {
  assert.deepEqual(result(() => 42), { ok: true, value: 42 });
});
test('fail throws the typed contract error and validate only returns its code', () => {
  assert.throws(() => fail('EXPIRED'), (e) => e instanceof ContractError && e.code === 'EXPIRED');
  rejects(() => fail('EXPIRED'), 'EXPIRED');
});
test('unexpected exceptions and forged error codes cannot leak values', () => {
  for (const error of [new Error('sensitive'), { code: 'JPY_INVALID', message: 'sensitive' }, 'sensitive']) {
    rejects(() => { throw error; }, 'INTERNAL_VALIDATION_FAILED');
  }
  rejects(() => { throw new ContractError('sensitive'); }, 'INTERNAL_VALIDATION_FAILED');
});
test('exactRecord copies frozen object data to a fresh null-prototype record', () => {
  const input = Object.freeze({ a: 1, b: 'fixture-b' });
  const output = exactRecord(input, ['a', 'b']);
  assert.equal(Object.getPrototypeOf(output), null);
  assert.notEqual(input, output);
  assert.equal(output.a, 1);
  assert.equal(output.b, 'fixture-b');
  output.a = 2;
  assert.equal(input.a, 1);
  assert.equal(exactRecord(Object.assign(Object.create(null), { a: 1 }), ['a']).a, 1);
});
test('exactRecord rejects unsupported record shapes', () => {
  class RecordClass { a = 1; }
  for (const input of [null, undefined, 'x', 1, [], new RecordClass(), Object.create({ a: 1 })]) {
    rejects(() => exactRecord(input, ['a']), 'INVALID_RECORD');
  }
});
test('exactRecord rejects extra and missing fields', () => {
  for (const input of [{ a: 1, b: 2 }, {}]) rejects(() => exactRecord(input, ['a']), 'FIELDS_MISMATCH');
});
test('exactRecord rejects getters without invoking them, symbols and hidden data', () => {
  let reads = 0;
  const accessor = { get a() { reads++; return 1; } };
  const hidden = Object.defineProperty({}, 'a', { value: 1 });
  const symbol = { a: 1, [Symbol('secret')]: 2 };
  for (const input of [accessor, hidden, symbol]) rejects(() => exactRecord(input, ['a']), 'INVALID_RECORD');
  assert.equal(reads, 0);
});
test('exactRecord rejects unsafe own keys even with null prototype', () => {
  const input = Object.create(null);
  input.__proto__ = 'sensitive';
  rejects(() => exactRecord(input, ['__proto__']), 'UNSAFE_KEY');
});
test('fixture refs accept only the bounded explicit fixture namespace', () => {
  for (const ref of ['fixture-A', 'fixture-a_b-9', `fixture-${'a'.repeat(64)}`]) assert.equal(fixtureRef(ref), ref);
  for (const ref of ['', 'fixture-', 'live-owner', 'fixture-a:b', 'fixture-å', 'fixture-a\n', `fixture-${'a'.repeat(65)}`]) {
    rejects(() => fixtureRef(ref), 'FIXTURE_ONLY');
  }
  for (const ref of [null, 5, {}, ['fixture-a']]) rejects(() => fixtureRef(ref), 'INVALID_STRING');
});
test('versions are nonnegative safe integers, never coerced or negative zero', () => {
  for (const n of [0, 1, max]) assert.equal(version(n), n);
  for (const n of [-0, -1, 1.5, NaN, Infinity, max + 1, '1', 1n, null, true]) rejects(() => version(n), 'INTEGER_INVALID');
});
test('JPY accepts the safe integer boundaries', () => {
  for (const n of [0, 1, max]) assert.equal(yen(n), n);
});
test('JPY rejects coercion, fractional/unsafe/negative values and negative zero', () => {
  for (const n of [-0, -1, 1.5, NaN, Infinity, max + 1, '1', 1n, null, true, { valueOf() { throw Error('must not coerce'); } }]) {
    rejects(() => yen(n), 'JPY_INVALID');
  }
});
test('JPY addition uses checked exact intermediates', () => {
  assert.equal(addYen(20, 30), 50);
  assert.equal(addYen(max - 1, 1), max);
  rejects(() => addYen(max, 1), 'JPY_OVERFLOW');
  rejects(() => addYen('20', 30), 'JPY_INVALID');
});
test('JPY subtraction forbids underflow', () => {
  assert.equal(subtractYen(50, 30), 20);
  assert.equal(subtractYen(max, max), 0);
  rejects(() => subtractYen(20, 30), 'JPY_INVALID');
});
test('multiplyDivideYen floors integer rational arithmetic with BigInt intermediates', () => {
  assert.equal(multiplyDivideYen(50, 2, 3), 33);
  assert.equal(multiplyDivideYen(max, max, max), max);
  assert.equal(multiplyDivideYen(max - 1, max - 1, max), max - 2);
  assert.equal(multiplyDivideYen(0, max, 1), 0);
  rejects(() => multiplyDivideYen(max, 2, 1), 'JPY_OVERFLOW');
});
test('multiplyDivideYen rejects invalid integer ratios and zero denominator', () => {
  for (const ratio of [-0, -1, 0.5, '2', Infinity, max + 1]) {
    rejects(() => multiplyDivideYen(50, ratio, 1), 'INTEGER_INVALID');
    rejects(() => multiplyDivideYen(50, 1, ratio), 'INTEGER_INVALID');
  }
  rejects(() => multiplyDivideYen(50, 1, 0), 'INTEGER_INVALID');
  rejects(() => multiplyDivideYen(-1, 1, 1), 'JPY_INVALID');
});
