import assert from 'node:assert/strict';
import test from 'node:test';
import { P1_NAMESPACE } from '../../src/domain/operational/envelope.ts';
import { validate } from '../../src/domain/operational/primitives.ts';
import { deriveFixtureActorScope, deriveFixtureNonceKey, deriveFixtureIdempotencyKey,
  deriveFixtureVoteScope, deriveFixtureNullifierKey } from '../../src/domain/operational/scope.ts';

const tuple = (parts) => parts.map(part => `${part.length}:${part}`).join('');
const actor = (overrides = {}) => ({ domainTag: P1_NAMESPACE.domainTag,
  environmentId: P1_NAMESPACE.environmentId, consensusId: P1_NAMESPACE.consensusId,
  signerProofRef: 'fixture-proof', ...overrides });
const vote = (overrides = {}) => ({ domainTag: P1_NAMESPACE.domainTag,
  environmentId: P1_NAMESPACE.environmentId, consensusId: P1_NAMESPACE.consensusId,
  recruitmentId: 'fixture-r', electionId: 'fixture-election', roundId: 'INITIAL',
  ruleVersion: P1_NAMESPACE.ruleVersion, ...overrides });
const actorLiteral = `fixture-actor-scope-${tuple(Object.values(actor()))}`;
const voteLiteral = `fixture-vote-scope-${tuple(Object.values(vote()))}`;
const reject = (fn, error) => assert.deepEqual(validate(fn), { ok: false, error });

test('claimed signer fixture scope is the exact namespace + proofRef tuple, not an auth grant', () => {
  assert.equal(deriveFixtureActorScope(actor()), actorLiteral);
  assert.match(actorLiteral, /^fixture-[A-Za-z0-9_:-]+$/);
  assert.notEqual(deriveFixtureActorScope(actor({ signerProofRef: 'fixture-proof-2' })), actorLiteral);
});
for (const field of ['domainTag', 'environmentId', 'consensusId']) {
  test(`actor refuses namespace drift: ${field}`, () => reject(() => deriveFixtureActorScope(actor({ [field]: 'fixture-other' })), 'FIXTURE_ONLY'));
}
test('actor deliberately rejects operation/target/root/auth/account selectors', () => {
  for (const key of ['operationName', 'targetId', 'currentRoot', 'authId', 'email', 'account', 'ruleVersion', 'verified']) {
    reject(() => deriveFixtureActorScope(actor({ [key]: 'fixture-x' })), 'FIELDS_MISMATCH');
  }
  reject(() => deriveFixtureActorScope(actor({ signerProofRef: 'real-proof' })), 'FIXTURE_ONLY');
});
test('scope raw records reject getters, hidden values, symbols and custom prototypes without reading accessors', () => {
  let reads = 0;
  const input = actor();
  Object.defineProperty(input, 'signerProofRef', { enumerable: true, get() { reads++; return 'fixture-proof'; } });
  reject(() => deriveFixtureActorScope(input), 'INVALID_RECORD');
  assert.equal(reads, 0);
  reject(() => deriveFixtureActorScope({ ...actor(), [Symbol('x')]: 1 }), 'INVALID_RECORD');
  reject(() => deriveFixtureActorScope(Object.assign(Object.create({}), actor())), 'INVALID_RECORD');
  const hidden = vote(); Object.defineProperty(hidden, 'electionId', { value: 'fixture-election', enumerable: false });
  reject(() => deriveFixtureVoteScope(hidden), 'INVALID_RECORD');
});
test('nonce is claimed-signer scoped, while financial idempotency is namespace scoped only', () => {
  const nonce = deriveFixtureNonceKey(actorLiteral, 'fixture-nonce');
  const idem = deriveFixtureIdempotencyKey(actorLiteral, 'fixture-nonce');
  assert.equal(nonce, `fixture-nonce-${tuple([actorLiteral, 'fixture-nonce'])}`);
  assert.equal(idem, `fixture-idempotency-${tuple([P1_NAMESPACE.domainTag, P1_NAMESPACE.environmentId, P1_NAMESPACE.consensusId, 'fixture-nonce'])}`);
  assert.equal(idem, deriveFixtureIdempotencyKey(deriveFixtureActorScope(actor({ signerProofRef: 'fixture-proof-2' })), 'fixture-nonce'));
  assert.notEqual(nonce, idem);
  assert.notEqual(nonce, deriveFixtureNonceKey(deriveFixtureActorScope(actor({ signerProofRef: 'fixture-proof-2' })), 'fixture-nonce'));
  assert.notEqual(nonce, deriveFixtureNonceKey(actorLiteral, 'fixture-nonce-2'));
});
test('idempotency accepts envelope derived-operation grammar and rejects nonfixtures, overlength and newline aliases', () => {
  assert.match(deriveFixtureIdempotencyKey(actorLiteral, 'fixture-operation-12:fixture-bank_1'), /^fixture-/);
  assert.match(deriveFixtureIdempotencyKey(actorLiteral, `fixture-${'x'.repeat(1024)}`), /^fixture-/);
  for (const token of ['real-key', `fixture-${'x'.repeat(1025)}`, 'fixture-key\n', 'fixture-https://x']) {
    reject(() => deriveFixtureIdempotencyKey(actorLiteral, token), 'FIXTURE_ONLY');
  }
  reject(() => deriveFixtureNonceKey(actorLiteral, 'fixture-nonce:1'), 'FIXTURE_ONLY');
});
test('untrusted actor strings must be canonical encodings, never arbitrary prefix buckets', () => {
  for (const scope of ['fixture-actor-scope-forged', actorLiteral + 'x', actorLiteral.replace(`${P1_NAMESPACE.domainTag.length}:`, `0${P1_NAMESPACE.domainTag.length}:`), voteLiteral]) {
    reject(() => deriveFixtureNonceKey(scope, 'fixture-nonce'), 'CONTEXT_CONFLICT');
    reject(() => deriveFixtureIdempotencyKey(scope, 'fixture-key'), 'CONTEXT_CONFLICT');
  }
  const drift = `fixture-actor-scope-${tuple(Object.values(actor({ environmentId: 'fixture-other' })))}`;
  reject(() => deriveFixtureNonceKey(drift, 'fixture-nonce'), 'FIXTURE_ONLY');
  reject(() => deriveFixtureNonceKey('x'.repeat(2049), 'fixture-nonce'), 'INPUT_LIMIT');
});
test('vote fixture tuple includes exactly seven fields and INITIAL/RUNOFF have different keys', () => {
  assert.equal(deriveFixtureVoteScope(vote()), voteLiteral);
  const runoff = deriveFixtureVoteScope(vote({ roundId: 'RUNOFF' }));
  assert.notEqual(runoff, voteLiteral);
  assert.notEqual(deriveFixtureNullifierKey(voteLiteral, 'fixture-mark'), deriveFixtureNullifierKey(runoff, 'fixture-mark'));
  assert.equal(deriveFixtureNullifierKey(voteLiteral, 'fixture-mark'), `fixture-nullifier-${tuple([voteLiteral, 'fixture-mark'])}`);
  assert.match(deriveFixtureNullifierKey(voteLiteral, 'fixture-mark'), /^fixture-[A-Za-z0-9_:-]+$/);
});
for (const field of ['domainTag', 'environmentId', 'consensusId', 'ruleVersion']) {
  test(`vote refuses namespace drift: ${field}`, () => reject(() => deriveFixtureVoteScope(vote({ [field]: 'fixture-other' })), 'FIXTURE_ONLY'));
}
test('vote selectors cannot add root/candidate/auth/amount aliases, and unsupported rounds are refused', () => {
  for (const key of ['rootVersion', 'rootHash', 'candidateId', 'selectedCandidateId', 'authId', 'amount', 'credentialSecret']) {
    reject(() => deriveFixtureVoteScope(vote({ [key]: 'fixture-x' })), 'FIELDS_MISMATCH');
  }
  for (const roundId of ['initial', 'FINAL', 'INITIAL\n']) {
    reject(() => deriveFixtureVoteScope(vote({ roundId })), 'INVALID_STRING');
  }
  reject(() => deriveFixtureVoteScope(vote({ recruitmentId: 'real-r' })), 'FIXTURE_ONLY');
});
test('both scope DTOs require every field and no caller object coercion is invoked', () => {
  for (const [fixture, derive] of [[actor, deriveFixtureActorScope], [vote, deriveFixtureVoteScope]]) {
    for (const key of Object.keys(fixture())) {
      const partial = fixture(); delete partial[key];
      reject(() => derive(partial), 'FIELDS_MISMATCH');
    }
  }
  let coercions = 0;
  const value = { toString() { coercions++; return 'fixture-proof'; }, valueOf() { coercions++; return 'fixture-proof'; } };
  reject(() => deriveFixtureActorScope(actor({ signerProofRef: value })), 'INVALID_STRING');
  reject(() => deriveFixtureNonceKey(value, 'fixture-nonce'), 'INVALID_STRING');
  assert.equal(coercions, 0);
});
test('maximum bounded fixture refs remain canonical and overlength/newline ref aliases fail closed', () => {
  const max = `fixture-${'x'.repeat(64)}`;
  const scope = deriveFixtureActorScope(actor({ signerProofRef: max }));
  assert.match(deriveFixtureNonceKey(scope, max), /^fixture-/);
  const maximumVote = deriveFixtureVoteScope(vote({ recruitmentId: max, electionId: max }));
  assert.match(deriveFixtureNullifierKey(maximumVote, max), /^fixture-/);
  for (const ref of [`fixture-${'x'.repeat(65)}`, 'fixture-proof\n']) {
    reject(() => deriveFixtureActorScope(actor({ signerProofRef: ref })), 'FIXTURE_ONLY');
    reject(() => deriveFixtureNullifierKey(maximumVote, ref), 'FIXTURE_ONLY');
  }
});
test('vote identity is injective across recruitment/election/round; caller marks are fixture refs only', () => {
  const scopes = new Set();
  for (const recruitmentId of ['fixture-r', 'fixture-r-fixture-election']) {
    for (const electionId of ['fixture-election', 'fixture-election-fixture-r']) {
      for (const roundId of ['INITIAL', 'RUNOFF']) scopes.add(deriveFixtureVoteScope(vote({ recruitmentId, electionId, roundId })));
    }
  }
  assert.equal(scopes.size, 8);
  reject(() => deriveFixtureNullifierKey('fixture-vote-scope-forged', 'fixture-mark'), 'CONTEXT_CONFLICT');
  reject(() => deriveFixtureNullifierKey(actorLiteral, 'fixture-mark'), 'CONTEXT_CONFLICT');
  reject(() => deriveFixtureNullifierKey(voteLiteral, 'secret-nullifier'), 'FIXTURE_ONLY');
  reject(() => deriveFixtureNullifierKey(voteLiteral.replace('7:INITIAL', '07:INITIAL'), 'fixture-mark'), 'CONTEXT_CONFLICT');
});
