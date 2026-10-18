import type { ContractResult } from './primitives.ts';
import { fail, validate } from './primitives.ts';

/** Restricted fixture JSON, not a production signature/proof format. */
export type FixtureJSON = null | boolean | number | string | readonly FixtureJSON[] | { readonly [key: string]: FixtureJSON };
// Technical fixture parser limits, not approved production business rules.
export const JSON_LIMITS = Object.freeze({ bytes: 16_384, depth: 16, nodes: 1024 });

function validUnicode(text: string): void {
  for (let index = 0; index < text.length; index++) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail('INVALID_STRING');
    } else if (unit >= 0xdc00 && unit <= 0xdfff) fail('INVALID_STRING');
  }
}

/** Text is the trust boundary: never invoke input.toJSON/getters/valueOf. */
function decode(input: unknown): FixtureJSON {
  if (typeof input !== 'string') fail('INVALID_JSON');
  if (input.length > JSON_LIMITS.bytes || new TextEncoder().encode(input).length > JSON_LIMITS.bytes) fail('INPUT_LIMIT');
  let cursor = 0;
  let nodes = 0;
  const whitespace = () => { while (cursor < input.length && /[ \t\r\n]/.test(input[cursor])) cursor++; };
  const expect = (token: string) => {
    if (input[cursor] !== token) fail('INVALID_JSON');
    cursor++;
  };
  const string = (): string => {
    if (input[cursor] !== '"') fail('INVALID_JSON');
    const start = cursor++;
    while (cursor < input.length) {
      if (input[cursor] === '"') {
        let decoded: string;
        try { decoded = JSON.parse(input.slice(start, ++cursor)) as string; }
        catch { fail('INVALID_JSON'); }
        validUnicode(decoded);
        return decoded;
      }
      if (input[cursor] === '\\') cursor += 2;
      else cursor++;
    }
    return fail('INVALID_JSON');
  };
  const value = (depth: number): FixtureJSON => {
    if (depth > JSON_LIMITS.depth || ++nodes > JSON_LIMITS.nodes) fail('INPUT_LIMIT');
    whitespace();
    const token = input[cursor];
    if (token === '"') return string();
    if (token === '{') {
      cursor++; whitespace();
      const object: Record<string, FixtureJSON> = Object.create(null);
      const keys = new Set<string>();
      if (input[cursor] === '}') { cursor++; return Object.freeze(object); }
      while (true) {
        const key = string();
        if (keys.has(key)) fail('DUPLICATE_KEY');
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') fail('UNSAFE_KEY');
        keys.add(key);
        whitespace(); expect(':');
        object[key] = value(depth + 1);
        whitespace();
        if (input[cursor] === '}') { cursor++; return Object.freeze(object); }
        expect(','); whitespace();
      }
    }
    if (token === '[') {
      cursor++; whitespace();
      const array: FixtureJSON[] = [];
      if (input[cursor] === ']') { cursor++; return Object.freeze(array); }
      while (true) {
        array.push(value(depth + 1));
        whitespace();
        if (input[cursor] === ']') { cursor++; return Object.freeze(array); }
        expect(','); whitespace();
      }
    }
    for (const [literal, decoded] of [['true', true], ['false', false], ['null', null]] as const) {
      if (input.startsWith(literal, cursor)) { cursor += literal.length; return decoded; }
    }
    const numeric = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(input.slice(cursor));
    if (numeric === null) return fail('INVALID_JSON');
    const raw = numeric[0];
    if (/[.eE]/.test(raw) || raw === '-0') fail('INVALID_INTEGER');
    const integer = Number(raw);
    if (!Number.isSafeInteger(integer)) fail('INVALID_INTEGER');
    cursor += raw.length;
    return integer;
  };
  const result = value(0);
  whitespace();
  if (cursor !== input.length) fail('INVALID_JSON');
  return result;
}

// Only called with decode's fresh data-only tree, never arbitrary JS objects.
// JS default sort compares decoded UTF-16 code units, as required by JCS.
function canonical(value: FixtureJSON): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as { readonly [key: string]: FixtureJSON };
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}

export function parseStrictFixtureJSON(input: unknown): ContractResult<FixtureJSON> {
  return validate(() => decode(input));
}

/** Immutable canonical text; UTF-8 encoding and proof verification are separate. */
export function canonicalizeFixtureJSON(input: unknown): ContractResult<string> {
  return validate(() => canonical(decode(input)));
}
