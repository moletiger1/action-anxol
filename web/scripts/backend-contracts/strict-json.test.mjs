import assert from 'node:assert/strict';
import test from 'node:test';
import { JSON_LIMITS, parseStrictFixtureJSON, canonicalizeFixtureJSON } from '../../src/domain/operational/strict-json.ts';

const error = (input, code) => assert.deepEqual(parseStrictFixtureJSON(input), { ok: false, error: code });

test('integer-only fixture JSON roundtrips without coercion', () => {
  const result = canonicalizeFixtureJSON(' {"z":[true,null,-2],"a":1} ');
  assert.deepEqual(result, { ok: true, value: '{"a":1,"z":[true,null,-2]}' });
});
for (const [label, input, code] of [
  ['direct duplicate', '{"a":1,"a":2}', 'DUPLICATE_KEY'],
  ['escaped duplicate', '{"a":1,"\\u0061":2}', 'DUPLICATE_KEY'],
  ['nested duplicate', '{"a":[{"b":1,"b":2}]}', 'DUPLICATE_KEY'],
  ['unsafe prototype key', '{"__proto__":{}}', 'UNSAFE_KEY'],
  ['constructor key', '{"constructor":1}', 'UNSAFE_KEY'],
  ['prototype key', '{"prototype":1}', 'UNSAFE_KEY'],
  ['fraction', '{"a":1.5}', 'INVALID_INTEGER'],
  ['integer decimal syntax', '{"a":1.0}', 'INVALID_INTEGER'],
  ['exponent', '{"a":1e2}', 'INVALID_INTEGER'],
  ['negative zero', '{"a":-0}', 'INVALID_INTEGER'],
  ['unsafe integer', '{"a":9007199254740992}', 'INVALID_INTEGER'],
  ['lone high surrogate value', '"\\ud800"', 'INVALID_STRING'],
  ['lone low surrogate key', '{"\\udc00":1}', 'INVALID_STRING'],
  ['trailing token', '{} true', 'INVALID_JSON'],
  ['trailing comma', '[1,]', 'INVALID_JSON'],
  ['leading zero', '{"a":01}', 'INVALID_JSON'],
  ['bad escape', '"\\x00"', 'INVALID_JSON'],
  ['raw control', '"\n"', 'INVALID_JSON'],
  ['empty', '', 'INVALID_JSON'],
  ['non-string', { a: 1 }, 'INVALID_JSON'],
]) test(`rejects ${label}`, () => error(input, code));

test('UTF-16 key order, not code point/UTF-8/locale order', () => {
  assert.deepEqual(canonicalizeFixtureJSON('{"\\ue000":1,"\\ud83d\\ude00":2}'), {
    ok: true, value: '{"😀":2,"":1}',
  });
});
test('does not apply Unicode normalization to distinct keys', () => {
  assert.equal(parseStrictFixtureJSON('{"é":1,"e\\u0301":2}').ok, true);
});
test('parsed records are null-prototype and recursively immutable', () => {
  const result = parseStrictFixtureJSON('{"a":[{"b":1}]}');
  assert.equal(result.ok, true);
  assert.equal(Object.getPrototypeOf(result.value), null);
  assert.equal(Object.isFrozen(result.value.a[0]), true);
  assert.throws(() => { result.value.a[0].b = 2; }, TypeError);
});
test('valid surrogate pairs remain valid', () => {
  assert.deepEqual(canonicalizeFixtureJSON('"\\ud83d\\ude00"'), { ok: true, value: '"😀"' });
});
test('input depth is bounded before stack exhaustion', () => {
  error('['.repeat(JSON_LIMITS.depth + 1) + '0' + ']'.repeat(JSON_LIMITS.depth + 1), 'INPUT_LIMIT');
});
test('input size is bounded in UTF-8 bytes', () => {
  error(`"${'あ'.repeat(JSON_LIMITS.bytes / 3)}"`, 'INPUT_LIMIT');
});
test('node budget limits wide structures', () => {
  error(`[${Array(JSON_LIMITS.nodes + 1).fill('0').join(',')}]`, 'INPUT_LIMIT');
});
test('non-string input never invokes toJSON/valueOf/getters', () => {
  const input = { toJSON() { throw Error('private'); }, valueOf() { throw Error('private'); } };
  error(input, 'INVALID_JSON');
});
