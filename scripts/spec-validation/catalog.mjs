// Isolated synthetic CASE-08/09 model, not an implementation of a consensus service.
// Semantic relations and opaque '*Hash' labels are fixture assumptions, not AI output
// or cryptographic hashes. Reviewer IDs assume independent synthetic people; checking
// three distinct members of this fixed five-person panel is NOT signature verification.
export const HOUR = 3600;
export const DAY = 24 * HOUR;
export const PANEL = Object.freeze(Array.from({ length: 5 }, (_, i) => `synthetic-reviewer-${i + 1}`));
export const THREE = Object.freeze(PANEL.slice(0, 3));

export function createCatalogModel({ relations = {} } = {}) {
  const proposals = {};
  const entries = [];
  let version = 0;
  const quorum = (ids) => Array.isArray(ids) && ids.length >= 3
    && new Set(ids).size === ids.length && ids.every((id) => PANEL.includes(id));
  const proposal = (id) => {
    if (!proposals[id]) throw new Error(`Unknown synthetic proposal: ${id}`);
    return proposals[id];
  };
  const expired = (p, now) => now >= p.roundExpiresAt
    || (p.signatureExpiresAt !== null && now >= p.signatureExpiresAt)
    || (p.state === 'RECONCILING' && now >= p.reconciliationStartedAt + 48 * HOUR);
  const expire = (p, now) => {
    if (!expired(p, now)) return false;
    p.state = 'REVIEW_EXPIRED';
    return true;
  };
  const prepared = (p, now) => p.state === 'FINALIZATION_WAIT'
    && p.signedCatalogVersion === version && !expired(p, now)
    && now >= p.objectionClosesAt && quorum(p.reviewers);
  const rank = (a, b) => a.firstReadyAt - b.firstReadyAt
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const initial = (id, options) => ({
    id, proposalVersion: options.proposalVersion ?? 1, round: options.round ?? 1,
    contentHash: options.contentHash ?? `fixture-content:${id}`,
    candidateHash: options.candidateHash ?? `fixture-candidates:${id}`,
    conclusion: options.conclusion ?? 'NEW', reviewers: [...options.reviewers],
    approvedAt: options.approvedAt, objectionOpenedAt: options.approvedAt,
    objectionClosesAt: options.approvedAt + 7 * DAY,
    roundExpiresAt: options.approvedAt + 12 * DAY,
    signedCatalogVersion: version, state: 'PROVISIONAL_APPROVED', eventId: null,
    firstReadyAt: null, reconciliationStartedAt: null, signatureExpiresAt: null,
    conflicts: 0, reconciliation: null, reconciliationRecords: [], previousRounds: [],
  });
  const envelope = (p) => ({
    proposalId: p.id, proposalVersion: p.proposalVersion, round: p.round,
    contentHash: p.contentHash, candidateHash: p.candidateHash, conclusion: p.conclusion,
    fromVersion: p.signedCatalogVersion, toVersion: p.reconciliation.toVersion,
    diffHash: p.reconciliation.diffHash, reason: 'fixture-confirmed-unrelated',
  });

  return {
    approve(id, { reviewers = THREE, approvedAt = 0, ...options } = {}) {
      if (proposals[id]) return 'PROPOSAL_EXISTS';
      if (!quorum(reviewers)) return 'INSUFFICIENT_INDEPENDENT_REVIEWERS';
      proposals[id] = initial(id, { ...options, reviewers, approvedAt });
      return 'PROVISIONAL_APPROVED';
    },
    ready(id, now) {
      const p = proposal(id);
      if (!['PROVISIONAL_APPROVED', 'FINALIZATION_WAIT'].includes(p.state)) return 'NOT_READY';
      if (expire(p, now)) return p.state;
      if (now < p.objectionClosesAt) return 'OBJECTION_OPEN';
      p.state = 'FINALIZATION_WAIT';
      p.firstReadyAt ??= now;
      return p.state;
    },
    beginReconciliation(id, now) {
      const p = proposal(id);
      if (!['FINALIZATION_WAIT', 'RECONCILING'].includes(p.state)) return 'NOT_READY';
      if (expire(p, now)) return p.state;
      if (p.signedCatalogVersion === version) return 'NO_CATALOG_CHANGE';
      p.reconciliationStartedAt ??= now;
      p.conflicts += 1; // Diagnostic only; no three-conflict expiry.
      p.state = 'RECONCILING';
      p.reconciliation = null;
      return p.state;
    },
    reconcile(id, now) {
      const p = proposal(id);
      if (p.state !== 'RECONCILING') return 'NOT_RECONCILING';
      if (expire(p, now)) return p.state;
      const changes = entries.filter((e) => e.version > p.signedCatalogVersion);
      const classifications = changes.map((e) => relations[id]?.[e.proposalId]);
      // Known related changes cannot be hidden by other still-unclassified changes.
      if (classifications.some((c) => ['duplicate', 'candidate-change', 'comparison-change', 'identity-change'].includes(c))) {
        p.state = 'NEEDS_CHANGE';
        return 'NEW_PROPOSAL_AND_ROUND_REQUIRED';
      }
      if (classifications.some((c) => c !== 'unrelated')) return 'UNCLASSIFIED_UPDATE';
      p.reconciliation = {
        toVersion: version, diffHash: `fixture-diff:${p.id}:${p.signedCatalogVersion}-${version}`,
      };
      return 'UNRELATED';
    },
    reconciliationPayload(id) {
      const p = proposal(id);
      if (!p.reconciliation) throw new Error('No classified synthetic reconciliation');
      return structuredClone(envelope(p));
    },
    resign(id, { reviewers, payload, now }) {
      const p = proposal(id);
      if (p.state !== 'RECONCILING') return 'NOT_RECONCILING';
      if (expire(p, now)) return p.state;
      if (!p.reconciliation) return 'UNCLASSIFIED_UPDATE';
      if (p.reconciliation.toVersion !== version) return 'CATALOG_CONFLICT';
      const expected = envelope(p);
      if (!payload || Object.keys(payload).length !== Object.keys(expected).length
        || Object.entries(expected).some(([key, value]) => payload[key] !== value)) return 'IMMUTABLE_DECISION_MISMATCH';
      if (!quorum(reviewers)) return 'INSUFFICIENT_INDEPENDENT_REVIEWERS';
      p.reviewers = [...reviewers];
      p.signedCatalogVersion = version;
      p.signatureExpiresAt = Math.min(now + 48 * HOUR, p.roundExpiresAt);
      p.reconciliationRecords.push({ ...expected, reviewers: [...reviewers],
        startedAt: p.reconciliationStartedAt, signedAt: now, expiresAt: p.signatureExpiresAt });
      p.reconciliationStartedAt = null; // Three signatures complete this cycle; the next conflict starts another.
      p.state = 'FINALIZATION_WAIT';
      // firstReadyAt and the original objection/12-day windows remain unchanged.
      return p.state;
    },
    startNewRound(id, options) {
      const p = proposal(id);
      if (p.state !== 'NEEDS_CHANGE') return 'RELATED_CHANGE_REQUIRED';
      if (!(options.proposalVersion > p.proposalVersion && options.round > p.round)) return 'NEW_PROPOSAL_AND_ROUND_REQUIRED';
      if (!quorum(options.reviewers)) return 'NEW_ROUND_SIGNATURES_REQUIRED';
      if (!(options.approvedAt >= p.approvedAt)) return 'INVALID_APPROVAL_TIME';
      const next = initial(id, options);
      next.previousRounds = [...p.previousRounds, structuredClone({ ...p, previousRounds: [] })];
      proposals[id] = next;
      return next.state;
    },
    finalize(id, expectedCatalogVersion, now) {
      // CAS rejection changes neither proposal state/eventId nor the catalog.
      if (expectedCatalogVersion !== version) return 'CATALOG_CONFLICT';
      const p = proposal(id);
      if (['FINAL_NEW', 'FINAL_LINKED', 'NEEDS_CHANGE', 'REVIEW_EXPIRED'].includes(p.state)) return 'NOT_READY';
      if (expire(p, now)) return p.state;
      if (now < p.objectionClosesAt) return 'OBJECTION_OPEN';
      if (!prepared(p, now)) return 'LATEST_THREE_SIGNATURES_REQUIRED';
      if (p.conclusion === 'NEW' && entries.some((e) => relations[id]?.[e.proposalId] === 'duplicate')) return 'TRUE_DUPLICATE_NEW_FORBIDDEN';
      if (Object.values(proposals).filter((other) => prepared(other, now)).sort(rank)[0] !== p) return 'WAIT_ORDER';
      const target = /^LINK\((.+)\)$/.exec(p.conclusion)?.[1];
      if (p.conclusion !== 'NEW' && (!target || !entries.some((e) => e.eventId === target && e.conclusion === 'NEW'))) return 'INVALID_CONCLUSION_OR_REFERENCE';
      p.state = target ? 'FINAL_LINKED' : 'FINAL_NEW';
      p.eventId = target ?? p.id;
      version += 1;
      entries.push({ version, proposalId: id, eventId: p.eventId, conclusion: p.conclusion });
      return p.state;
    },
    snapshot() { return structuredClone({ version, entries, proposals }); },
  };
}
