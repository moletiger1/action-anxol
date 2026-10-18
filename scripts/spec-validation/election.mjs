// Small synthetic state model for spec v0.4 §§10.3, 12.3, 13.2, 17.1.
// A/B, fixed membership/root, election outcome and all other spending conditions
// are fixtures, not voting/amount implementations. Proof labels assume externally
// verified signatures, independent identities and final consensus time in days.
// Calls are sequential, assuming atomic ordering with the bank commit point.
// This does NOT verify crypto, production gates, concurrency or bank capabilities.
const requireThat = (condition, reason) => {
  if (!condition) throw new Error(reason);
};
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const dayNumber = (value) => Number.isInteger(value) && value >= 0;
const exactKeys = (value, keys) => value && typeof value === 'object'
  && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));

export function createElection({ phase = 'OPEN' } = {}) {
  requireThat(['OPEN', 'CLOSED'].includes(phase), 'INVALID_PHASE');
  const electionId = 'election-1';
  const candidates = { A: true, B: true };
  const history = [];
  const receipts = new Map();
  const disbursements = new Map();
  const obligations = new Set();
  const objections = [];
  let final = null;
  let latestDay = phase === 'CLOSED' ? 18 : 7;
  let held = false;
  let contracted = false;

  // Fixed allowed-field tuples below are equality encodings, NOT cryptographic hashes
  // or RFC 8785/signature canonicalization. Rejections never consume event keys.
  function once(eventId, payload, apply) {
    requireThat(text(eventId), 'INVALID_EVENT_ID');
    const existing = receipts.get(eventId);
    if (existing) {
      requireThat(existing.payload === payload, 'IDEMPOTENCY_CONFLICT');
      return { ...existing.result };
    }
    const result = apply();
    receipts.set(eventId, { payload, result });
    return { ...result };
  }

  function usable(reason) {
    requireThat(final !== null, 'NOT_FINAL');
    requireThat(!held && candidates[final.selectedCandidateId], reason);
  }

  return {
    finalize(candidateId = 'A', day = 21) {
      requireThat(['OPEN', 'CLOSED'].includes(phase), 'ELECTION_NOT_FINALIZABLE');
      requireThat(Object.hasOwn(candidates, candidateId) && candidates[candidateId], 'INVALID_CANDIDATE');
      requireThat(dayNumber(day) && day >= latestDay && day >= 18 && day <= 21, 'SELECTION_DEADLINE');
      latestDay = day;
      final = Object.freeze({ electionId, status: 'FINAL', selectedCandidateId: candidateId,
        candidateConditionsHash: `synthetic-conditions-${candidateId}`, day });
      phase = 'FINAL';
      return { ...final };
    },

    candidateEvent(event) {
      requireThat(exactKeys(event, ['eventId', 'candidateId', 'kind', 'day', 'proof']), 'INVALID_EVENT');
      const { eventId, candidateId, kind, day, proof } = event;
      requireThat(Object.hasOwn(candidates, candidateId), 'INVALID_CANDIDATE');
      requireThat(['WITHDRAWAL', 'REVOCATION'].includes(kind) && dayNumber(day), 'INVALID_EVENT');
      requireThat(proof === `synthetic-${kind}-${candidateId}`, 'MISSING_BOUND_PROOF');
      const payload = JSON.stringify(['candidate', candidateId, kind, day, proof]);
      return once(eventId, payload, () => {
        requireThat(!final || day >= final.day, 'PAST_EVENT_REQUIRES_OBJECTION');
        requireThat(day >= latestDay, 'NON_MONOTONIC_SYNTHETIC_TIME');
        latestDay = day;
        candidates[candidateId] = false;
        history.push({ eventId, candidateId, kind, day });
        if (!final) phase = 'CANCELLED';
        // The v0.4 fix: losing candidates update history only after FINAL.
        else if (candidateId === final.selectedCandidateId) held = true;
        return { status: phase, held };
      });
    },

    objection(event) {
      requireThat(exactKeys(event, ['eventId', 'electionId', 'evidenceHash', 'reason', 'proof', 'signers']), 'INVALID_OBJECTION');
      const { eventId, evidenceHash, reason, proof, signers } = event;
      requireThat(event.electionId === electionId, 'WRONG_ELECTION');
      requireThat(text(evidenceHash) && ['PRE_FINAL_INELIGIBILITY', 'DOUBLE_ELIGIBILITY', 'VERIFICATION_MISMATCH'].includes(reason), 'INVALID_EVIDENCE');
      requireThat(proof === `synthetic-election-proof:${electionId}:${reason}:${evidenceHash}`, 'MISSING_BOUND_PROOF');
      requireThat(Array.isArray(signers) && signers.length >= 3 && signers.length <= 5
        && new Set(signers).size === signers.length
        && signers.every((signer) => ['P1', 'P2', 'P3', 'P4', 'P5'].includes(signer)), 'INDEPENDENT_3_OF_5_REQUIRED');
      const payload = JSON.stringify(['objection', event.electionId, evidenceHash, reason, proof, [...signers].sort()]);
      return once(eventId, payload, () => {
        requireThat(final !== null, 'NOT_FINAL');
        held = true;
        objections.push({ eventId, electionId, evidenceHash, reason, status: 'ACCEPTED_UNRESOLVED' });
        return { status: 'ACCEPTED_UNRESOLVED', held };
      });
    },

    contract() {
      usable('CONTRACT_ON_HOLD');
      contracted = true;
      return 'CONTRACTED';
    },

    reserve(disbursementId) {
      usable('SPENDING_ON_HOLD');
      requireThat(contracted, 'NO_CONTRACT');
      requireThat(text(disbursementId) && !disbursements.has(disbursementId), 'DUPLICATE_DISBURSEMENT');
      disbursements.set(disbursementId, { status: 'RESERVED', reserved: true });
      obligations.add(disbursementId);
      return 'RESERVED';
    },

    executeBankTransfer(disbursementId, outcome = 'PAID') {
      const entry = disbursements.get(disbursementId);
      requireThat(entry, 'NO_RESERVATION');
      requireThat(['PAID', 'UNKNOWN'].includes(outcome), 'INVALID_BANK_OUTCOME');
      requireThat(entry.status !== 'UNKNOWN', 'UNKNOWN_REQUIRES_RECONCILIATION');
      if (entry.status === 'PAID') {
        requireThat(outcome === 'PAID', 'IDEMPOTENCY_CONFLICT');
        return 'PAID'; // Replay only, never a new bank instruction.
      }
      usable('BANK_EXECUTION_ON_HOLD'); // Fresh check at synthetic bank commit point.
      entry.status = outcome;
      entry.reserved = outcome === 'UNKNOWN';
      if (outcome === 'PAID') obligations.delete(disbursementId);
      return outcome;
    },

    releaseReservation(disbursementId) {
      const entry = disbursements.get(disbursementId);
      requireThat(entry, 'NO_RESERVATION');
      // No external terminal non-execution proof/reconciliation is modeled.
      requireThat(!entry.reserved, entry.status === 'UNKNOWN'
        ? 'UNKNOWN_REQUIRES_RECONCILIATION' : 'OBLIGATION_PRESERVED');
      return 'ALREADY_COMPLETED';
    },

    requestReelection(startDay, nextElectionId) {
      requireThat(held || phase === 'CANCELLED', 'REELECTION_NOT_REQUIRED');
      // 7 initial + 3 runoff + 1 tally + 2 objection + 1 adjudication days.
      requireThat(dayNumber(startDay) && startDay >= latestDay && startDay >= 7 && startDay + 14 <= 21, 'REELECTION_SCHEDULE_EXCEEDS_DEADLINE');
      requireThat(text(nextElectionId) && nextElectionId !== electionId, 'NEW_ELECTION_ID_REQUIRED');
      return { nextElectionId, selectionDeadline: 21 }; // Old FINAL stays untouched.
    },

    snapshot() {
      return { electionId, phase, latestDay, held, contracted, final: final && { ...final },
        fixedRoot: 'synthetic-root', fixedN: 3, candidates: { ...candidates },
        history: history.map((entry) => ({ ...entry })),
        objections: objections.map((entry) => ({ ...entry })),
        disbursements: Object.fromEntries([...disbursements].map(([id, entry]) => [id, { ...entry }])),
        obligations: [...obligations] };
    },
  };
}
