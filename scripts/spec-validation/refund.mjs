// Synthetic executable specification ONLY. No product imports, bank calls, real signatures or persistence.
// A synchronous transaction and a revision counter stand in for external serialization/ledger-root CAS.
const POOL = new Set(Array.from({ length: 5 }, (_, i) => `reviewer-${i + 1}`));
const fail = code => { throw new Error(code); };
const yen = value => {
  if (!Number.isSafeInteger(value) || value < 0) fail('INVALID_YEN');
  return value;
};
const sum = values => values.reduce((a, b) => yen(a + yen(b)), 0);
const id = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) fail('INVALID_SYNTHETIC_ID');
  return value;
};
const canonical = value => JSON.stringify(normalize(value));
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, normalize(value[k])]));
  return value;
}
function approve(approvers) {
  if (!Array.isArray(approvers) || new Set(approvers).size !== approvers.length || approvers.some(a => !POOL.has(a)) || approvers.length < 3) fail('QUORUM_REQUIRED');
}
function verified(proof, issuer) {
  if (!proof || proof.verified !== true || proof.issuer !== issuer) fail('SYNTHETIC_ATTESTATION_REQUIRED');
}
function reserveTotal(s, ownerId) {
  return sum([...s.instructions.values()].filter(i => i.ownerId === ownerId).map(i => i.reservedRemaining));
}
function right(s, ownerId) {
  const o = s.owners.get(ownerId);
  if (!o) fail('OWNER_NOT_FOUND');
  return Math.max(0, o.gross - o.reversed - o.nonRefundable - o.completed);
}
function obligations(s) {
  // Reservations are the SAME liabilities as the corresponding refundPayable, never counted twice.
  return sum([...s.liabilities.values(), s.externalAdvance, ...[...s.instructions.values()].map(i => i.reservedRemaining)]);
}
function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function allocation(s, amount) {
  let candidates = [...s.owners.values()].map(o => ({
    id: o.id, w: o.gross - o.reversed, cap: Math.max(0, right(s, o.id) - reserveTotal(s, o.id)),
  })).filter(o => o.w > 0 && o.cap > 0).sort((a, b) => compare(a.id, b.id));
  if (!candidates.length) fail('NO_ELIGIBLE_WEIGHT');
  if (amount > sum(candidates.map(o => o.cap))) fail('CAP_EXCEEDED');
  const result = Object.fromEntries([...s.owners.keys()].map(k => [k, 0]));
  let remaining = amount;
  while (candidates.length) {
    const W = BigInt(sum(candidates.map(o => o.w)));
    const above = candidates.filter(o => BigInt(remaining) * BigInt(o.w) > BigInt(o.cap) * W);
    if (!above.length) {
      const ranked = candidates.map(o => {
        const numerator = BigInt(remaining) * BigInt(o.w);
        result[o.id] = Number(numerator / W);
        return { ...o, remainder: numerator % W };
      }).sort((a, b) => a.remainder === b.remainder ? compare(a.id, b.id) : a.remainder > b.remainder ? -1 : 1);
      let extra = remaining - sum(candidates.map(o => result[o.id]));
      for (const o of ranked) if (extra > 0 && result[o.id] < o.cap) { result[o.id]++; extra--; }
      if (extra !== 0) fail('ALLOCATION_INVARIANT');
      break;
    }
    for (const o of above) { result[o.id] = o.cap; remaining -= o.cap; }
    const excluded = new Set(above.map(o => o.id));
    candidates = candidates.filter(o => !excluded.has(o.id));
  }
  if (sum(Object.values(result)) !== amount) fail('ALLOCATION_INVARIANT');
  return result;
}

export class RefundModel {
  #s;
  constructor({ owners, liabilities = [] }) {
    const ownerMap = new Map();
    for (const input of owners) {
      const ownerId = id(input.id);
      if (ownerMap.has(ownerId)) fail('DUPLICATE_OWNER');
      const gross = yen(input.gross), nonRefundable = yen(input.nonRefundable ?? 0);
      if (nonRefundable > gross) fail('COST_EXCEEDS_CONTRIBUTION');
      ownerMap.set(ownerId, { id: ownerId, gross, nonRefundable, reversed: 0, completed: 0, transactionVersion: 1 });
    }
    const liabilityMap = new Map();
    for (const item of liabilities) {
      if (liabilityMap.has(id(item.id))) fail('DUPLICATE_LIABILITY');
      liabilityMap.set(item.id, yen(item.amount));
    }
    this.#s = {
      revision: 0, cash: sum([...ownerMap.values()].map(o => o.gross - o.nonRefundable)), externalAdvance: 0,
      owners: ownerMap, liabilities: liabilityMap, instructions: new Map(), batches: new Map(),
      cancellations: new Map(), offsets: new Map(), executions: new Map(), resolutions: new Map(), entries: [],
    };
    this.#validate(this.#s);
  }
  get revision() { return this.#s.revision; }
  get cash() { return this.#s.cash; }
  get obligations() { return obligations(this.#s); }
  get shortfall() { return Math.max(0, this.obligations - this.cash); }
  get refundAvailable() { return Math.max(0, this.cash - this.obligations); }
  reserved(ownerId) { return reserveTotal(this.#s, ownerId); }
  cap(ownerId) { return Math.max(0, right(this.#s, ownerId) - this.reserved(ownerId)); }
  owner(ownerId) { return structuredClone(this.#s.owners.get(ownerId)); }
  instruction(key) { return structuredClone(this.#s.instructions.get(key)); }
  batch(batchId) { return structuredClone(this.#s.batches.get(batchId)?.fixed); }
  snapshot() { return structuredClone(this.#s); }
  invariants() { this.#validate(this.#s); return true; }
  overpayment(ownerId) {
    const o = this.#s.owners.get(ownerId);
    return Math.max(0, o.completed - Math.max(0, o.gross - o.reversed - o.nonRefundable));
  }
  #cas(expected) { if (expected !== this.revision) fail('LEDGER_CAS_CONFLICT'); }
  #duplicate(map, key, command) {
    const previous = map.get(key);
    if (!previous) return undefined;
    if (previous.payload !== canonical(command)) fail('IDEMPOTENCY_CONFLICT');
    return structuredClone(previous.result);
  }
  #update(kind, details, mutate) {
    const next = structuredClone(this.#s);
    const result = mutate(next);
    next.revision++;
    next.entries.push({ sequence: next.entries.length + 1, revision: next.revision, kind, ...structuredClone(details) });
    this.#validate(next);
    this.#s = next;
    return structuredClone(result);
  }
  #validate(s) {
    yen(s.cash); yen(s.externalAdvance); yen(obligations(s));
    const gross = sum([...s.owners.values()].map(o => o.gross));
    const used = sum([...s.owners.values()].flatMap(o => [o.nonRefundable, o.reversed, o.completed]));
    if (BigInt(s.cash) + BigInt(used) !== BigInt(gross) + BigInt(s.externalAdvance)) fail('CASH_IDENTITY');
    for (const i of s.instructions.values()) {
      if (i.originalAmount !== sum([i.completedAmount, i.offsetAmount, i.reservedRemaining])) fail('INSTRUCTION_IDENTITY');
      if (i.completedAmount + i.offsetAmount > i.originalAmount) fail('INSTRUCTION_OVERRUN');
      const original = s.batches.get(i.batchId).fixed.allocations[i.ownerId];
      if (i.originalAmount !== original) fail('BATCH_HISTORY_CHANGED');
    }
    for (const o of s.owners.values()) {
      if (o.reversed > o.gross) fail('CANCELLATION_OVERRUN');
      if (sum([...s.instructions.values()].filter(i => i.ownerId === o.id).map(i => i.completedAmount)) !== o.completed) fail('OWNER_COMPLETION_IDENTITY');
    }
  }
  finalizeBatch(command) {
    id(command.batchId); yen(command.amount);
    const duplicate = this.#duplicate(this.#s.batches, command.batchId, command);
    if (duplicate) return duplicate;
    this.#cas(command.expectedRevision); approve(command.approvers);
    if (this.shortfall > 0 || command.amount > this.refundAvailable) fail('INSUFFICIENT_REFUND_CASH');
    const allocations = allocation(this.#s, command.amount);
    const fixed = { batchId: command.batchId, amount: command.amount, allocations, basisRevision: this.revision };
    return this.#update('BATCH_RESERVED', fixed, s => {
      s.batches.set(command.batchId, { payload: canonical(command), result: fixed, fixed });
      for (const [ownerId, amount] of Object.entries(allocations)) if (amount > 0) {
        const key = `${command.batchId}:${ownerId}`;
        s.instructions.set(key, {
          key, bankKey: key, ownerId, batchId: command.batchId, order: s.batches.size,
          originalAmount: amount, completedAmount: 0, offsetAmount: 0, reservedRemaining: amount,
          instructionVersion: 1, executionVersion: 1, state: 'RESERVED', retries: 0,
        });
      }
      return fixed;
    });
  }
  consumeCancellation(proof) {
    id(proof.eventId); id(proof.ownerId); yen(proof.amount); verified(proof, 'synthetic-provider');
    const duplicate = this.#duplicate(this.#s.cancellations, proof.eventId, proof);
    if (duplicate) return duplicate;
    const owner = this.#s.owners.get(proof.ownerId);
    if (!owner) fail('OWNER_NOT_FOUND');
    if (proof.previousVersion !== owner.transactionVersion || proof.transactionVersion !== owner.transactionVersion + 1) fail('PAYMENT_CAUSAL_VERSION');
    if (proof.amount > owner.gross - owner.reversed) fail('CANCELLATION_OVERRUN');
    return this.#update('PAYMENT_CANCELLED', proof, s => {
      const o = s.owners.get(proof.ownerId);
      o.reversed += proof.amount; o.transactionVersion = proof.transactionVersion;
      // If an externally confirmed cancellation exceeds cash, record the synthetic bridge as debt, not free cash.
      const bridge = Math.max(0, proof.amount - s.cash);
      s.externalAdvance = yen(s.externalAdvance + bridge);
      s.cash = Math.max(0, s.cash - proof.amount);
      const result = { eventId: proof.eventId, ownerId: proof.ownerId };
      s.cancellations.set(proof.eventId, { payload: canonical(proof), result, proof });
      return result;
    });
  }
  prepareOffset(eventId, key, proof, approvers) {
    const event = this.#s.cancellations.get(eventId), i = this.#s.instructions.get(key);
    if (!event || !i || event.proof.ownerId !== i.ownerId) fail('OFFSET_EVENT_SCOPE');
    const amount = Math.min(i.reservedRemaining, Math.max(0, this.reserved(i.ownerId) - right(this.#s, i.ownerId)));
    return {
      eventId, key, amount, expectedRevision: this.revision, instructionVersion: i.instructionVersion,
      transactionVersion: this.#s.owners.get(i.ownerId).transactionVersion,
      executionVersion: i.executionVersion, proof: structuredClone(proof), approvers: structuredClone(approvers),
    };
  }
  offsetReservation(command) {
    const offsetKey = `${command.eventId}:${command.key}:${command.instructionVersion}`;
    const duplicate = this.#duplicate(this.#s.offsets, offsetKey, command);
    if (duplicate) return duplicate;
    this.#cas(command.expectedRevision); approve(command.approvers); yen(command.amount);
    const i = this.#s.instructions.get(command.key), event = this.#s.cancellations.get(command.eventId);
    if (!i || !event || event.proof.ownerId !== i.ownerId) fail('OFFSET_EVENT_SCOPE');
    if (i.instructionVersion !== command.instructionVersion || i.executionVersion !== command.executionVersion || this.#s.owners.get(i.ownerId).transactionVersion !== command.transactionVersion) fail('OFFSET_VERSION');
    if (['SUBMITTED', 'UNKNOWN'].includes(i.state)) fail('EXECUTION_UNKNOWN');
    if (!['RESERVED', 'FAILED'].includes(i.state)) fail('NOTHING_TO_OFFSET');
    verified(command.proof, 'synthetic-bank');
    if (command.proof.key !== i.key || command.proof.executionVersion !== i.executionVersion || command.proof.futureExecutionImpossible !== true) fail('FUTURE_EXECUTION_NOT_CLOSED');
    const expected = Math.min(i.reservedRemaining, Math.max(0, this.reserved(i.ownerId) - right(this.#s, i.ownerId)));
    if (expected === 0 || command.amount !== expected) fail('OFFSET_AMOUNT_MISMATCH');
    const eligible = [...this.#s.instructions.values()].filter(j => j.ownerId === i.ownerId && j.reservedRemaining > 0 && ['RESERVED', 'FAILED'].includes(j.state)).sort((a, b) => a.order - b.order || compare(a.key, b.key));
    if (eligible[0].key !== i.key) fail('OFFSET_ORDER');
    return this.#update('REFUND_RESERVATION_OFFSET', command, s => {
      const current = s.instructions.get(i.key);
      current.offsetAmount += command.amount; current.reservedRemaining -= command.amount;
      current.instructionVersion++; current.executionVersion++; current.retries = 0;
      current.state = current.reservedRemaining === 0 ? 'OFFSET_CLOSED' : 'RESERVED';
      delete current.failureTerminal;
      const result = { key: i.key, offsetAmount: command.amount, remaining: current.reservedRemaining };
      s.offsets.set(offsetKey, { payload: canonical(command), result });
      return result;
    });
  }
  prepareExecution(key) {
    const i = this.#s.instructions.get(key);
    if (!i) fail('INSTRUCTION_NOT_FOUND');
    return {
      key, bankKey: i.bankKey, operationKey: `${key}:executeRefund:${i.executionVersion}`,
      executionVersion: i.executionVersion, instructionVersion: i.instructionVersion,
      transactionVersion: this.#s.owners.get(i.ownerId).transactionVersion,
      expectedRevision: this.revision, amount: i.reservedRemaining,
      holder: { ownerId: i.ownerId, verified: true },
    };
  }
  #executionConditions(command, i) {
    if (!i || command.bankKey !== i.bankKey || command.operationKey !== `${i.key}:executeRefund:${i.executionVersion}` || command.executionVersion !== i.executionVersion) fail('EXECUTION_VERSION');
    yen(command.amount);
    if (command.holder?.verified !== true || command.holder.ownerId !== i.ownerId) fail('HOLDER_MISMATCH');
    if (command.amount !== i.reservedRemaining || command.amount <= 0) fail('EXECUTION_AMOUNT');
    if (right(this.#s, i.ownerId) < this.reserved(i.ownerId)) fail('LATEST_RIGHT_MISMATCH');
    if (this.shortfall > 0) fail('INSUFFICIENT_REFUND_CASH');
  }
  submitRefund(command) {
    const duplicate = this.#duplicate(this.#s.executions, command.operationKey, command);
    if (duplicate) return duplicate; // Receipt replay, NOT another bank submission.
    const i = this.#s.instructions.get(command.key);
    this.#executionConditions(command, i); this.#cas(command.expectedRevision);
    if (i.instructionVersion !== command.instructionVersion || this.#s.owners.get(i.ownerId).transactionVersion !== command.transactionVersion) fail('EXECUTION_STATE_VERSION');
    if (i.state !== 'RESERVED') fail('EXECUTION_STATE');
    return this.#update('REFUND_SUBMITTED', command, s => {
      const current = s.instructions.get(i.key);
      current.state = 'SUBMITTED'; current.instructionVersion++;
      const result = { key: i.key, operationKey: command.operationKey, state: 'SUBMITTED' };
      s.executions.set(command.operationKey, { payload: canonical(command), result });
      return result;
    });
  }
  markUnknown(key) {
    const i = this.#s.instructions.get(key);
    if (!i || i.state !== 'SUBMITTED') fail('EXECUTION_STATE');
    return this.#update('REFUND_RESULT_UNKNOWN', { key }, s => {
      s.instructions.get(key).state = 'UNKNOWN'; s.instructions.get(key).instructionVersion++;
      return { key, state: 'UNKNOWN' };
    });
  }
  resolveRefund(proof) {
    id(proof.eventId); verified(proof, 'synthetic-bank');
    const duplicate = this.#duplicate(this.#s.resolutions, proof.eventId, proof);
    if (duplicate) return duplicate;
    const i = this.#s.instructions.get(proof.key);
    if (!i || proof.executionVersion !== i.executionVersion || !['SUBMITTED', 'UNKNOWN'].includes(i.state)) fail('EXECUTION_STATE_VERSION');
    if (!['COMPLETED', 'FAILED'].includes(proof.result)) fail('EXTERNAL_RECONCILIATION_REQUIRED');
    if (proof.result === 'COMPLETED' && (proof.paidAmount !== i.reservedRemaining || proof.futureExecutionImpossible !== true)) fail('TERMINAL_AMOUNT_PROOF');
    if (proof.result === 'FAILED' && (proof.paidAmount !== 0 || proof.attemptNotSent !== true)) fail('FAILURE_NOT_PROVEN');
    return this.#update('REFUND_RECONCILED', proof, s => {
      const current = s.instructions.get(i.key);
      if (proof.result === 'COMPLETED') {
        const amount = current.reservedRemaining;
        const bridge = Math.max(0, amount - s.cash);
        s.externalAdvance = yen(s.externalAdvance + bridge); s.cash = Math.max(0, s.cash - amount);
        current.completedAmount += amount; current.reservedRemaining = 0; current.state = 'COMPLETED';
        s.owners.get(current.ownerId).completed += amount;
      } else { current.state = 'FAILED'; current.failureTerminal = proof.futureExecutionImpossible === true; }
      current.instructionVersion++;
      const result = { key: i.key, state: current.state };
      s.resolutions.set(proof.eventId, { payload: canonical(proof), result });
      return result;
    });
  }
  prepareRetryContext(key) {
    const i = this.#s.instructions.get(key);
    if (!i) fail('INSTRUCTION_NOT_FOUND');
    // Fixture of a fresh external reconciliation, separate from immutable original approval payload.
    return {
      key, ownerId: i.ownerId, expectedRevision: this.revision, instructionVersion: i.instructionVersion,
      executionVersion: i.executionVersion, transactionVersion: this.#s.owners.get(i.ownerId).transactionVersion,
      issuer: 'synthetic-provider', verified: true,
    };
  }
  retryRefund(command, context) {
    const prior = this.#s.executions.get(command.operationKey);
    if (!prior || prior.payload !== canonical(command)) fail('IDEMPOTENCY_CONFLICT');
    const i = this.#s.instructions.get(command.key);
    if (!context || context.verified !== true || context.issuer !== 'synthetic-provider') fail('LATEST_RETRY_CONTEXT_REQUIRED');
    this.#cas(context.expectedRevision);
    if (!i || context.key !== i.key || context.ownerId !== i.ownerId || context.instructionVersion !== i.instructionVersion || context.executionVersion !== i.executionVersion || context.transactionVersion !== this.#s.owners.get(i.ownerId).transactionVersion) fail('LATEST_RETRY_CONTEXT_REQUIRED');
    this.#executionConditions(command, i);
    if (i.state !== 'FAILED' || i.failureTerminal) fail('RETRY_NOT_ALLOWED');
    if (i.retries >= 3) fail('RETRY_LIMIT');
    return this.#update('REFUND_RETRIED', { key: i.key, operationKey: command.operationKey, liveContext: context }, s => {
      const current = s.instructions.get(i.key);
      current.state = 'SUBMITTED'; current.instructionVersion++; current.retries++;
      return { key: i.key, state: 'SUBMITTED' };
    });
  }
}
