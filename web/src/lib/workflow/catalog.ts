import {
  DEMO_SIGNERS, exactKeys, executeCommand, initialWorkflow, quorum, rejectUnless,
  type Command, type WorkflowResult, type WorkflowState,
} from './common.ts';

const DAY = 86400;
const RECONCILIATION_WINDOW = 2 * DAY;
const PROPOSAL_IDS = ['P', 'Q', 'R', 'S'] as const;
const PANEL = ['demo-1', 'demo-2', 'demo-3', 'demo-4', 'demo-5'] as const;
type ProposalId = typeof PROPOSAL_IDS[number];
type Relation = 'unrelated' | 'duplicate' | 'changed' | 'unknown';
type Payload = {
  proposalId: ProposalId;
  proposalVersion: number;
  proposalHash: string;
  candidateHash: string;
  roundId: string;
  decision: 'NEW';
};
type Proposal = {
  status: 'FINALIZATION_WAIT' | 'RECONCILING' | 'NEEDS_CHANGE' | 'REVIEW_EXPIRED' | 'FINAL';
  signedVersion: number;
  firstReadyAt: number;
  signatureExpiresAt: number;
  deadline: number;
  reconciliationStartedAt: number | null;
  related: boolean;
  proposalVersion: number;
  proposalHash: string;
  candidateHash: string;
  roundId: string;
  decision: 'NEW';
  panel: readonly string[];
  signers: readonly string[];
  signedPayload: Payload;
  signedAtRevision: number;
  signedDiff: { fromVersion: number; toVersion: number; eventIds: string[]; relation: 'unrelated' };
  eventId: string | null;
  history: { at: number; fromVersion: number; toVersion: number; relation: Relation }[];
};
export type CatalogState = WorkflowState & {
  now: number;
  catalogVersion: number;
  proposals: Record<ProposalId, Proposal>;
  history: { catalogVersion: number; proposalId: ProposalId; eventId: string; at: number }[];
};
export type CatalogAction = Command & (
  | { type: 'finalize'; proposalId: ProposalId; expectedCatalogVersion: number; now: number }
  | { type: 'begin-reconcile'; proposalId: ProposalId; now: number }
  | { type: 'reconcile'; proposalId: ProposalId; relation: Relation; signers: readonly string[]; now: number }
);

// Fixture-only approvals, objection completion, panel identity, and time are assumptions.
// No AI inference, cryptographic signatures, shared database consensus, or production gate
// evidence is supplied here. Relation is an explicitly selected diff-classification fixture,
// NOT a semantic identity detector; it must never authorize real catalog decisions.
export function createDemoCatalog(): CatalogState {
  const proposals = {} as CatalogState['proposals'];
  for (const proposalId of PROPOSAL_IDS) {
    const payload: Payload = {
      proposalId, proposalVersion: 1, proposalHash: `fixture-proposal-${proposalId}-v1`,
      candidateHash: `fixture-candidates-${proposalId}-v1`, roundId: `${proposalId}-round-1`, decision: 'NEW',
    };
    proposals[proposalId] = {
      ...payload, status: 'FINALIZATION_WAIT', signedVersion: 0, firstReadyAt: 7 * DAY,
      signatureExpiresAt: 12 * DAY, deadline: 12 * DAY, reconciliationStartedAt: null,
      related: false, panel: [...PANEL], signers: [...DEMO_SIGNERS], signedPayload: { ...payload },
      signedAtRevision: 0, signedDiff: { fromVersion: 0, toVersion: 0, eventIds: [], relation: 'unrelated' },
      eventId: null, history: [],
    };
  }
  return { ...initialWorkflow(), now: 7 * DAY, catalogVersion: 0, proposals, history: [] };
}

function payloadMatches(proposal: Proposal, proposalId: ProposalId): boolean {
  const signed = proposal.signedPayload;
  return signed.proposalId === proposalId && signed.proposalVersion === proposal.proposalVersion
    && signed.proposalHash === proposal.proposalHash && signed.candidateHash === proposal.candidateHash
    && signed.roundId === proposal.roundId && signed.decision === proposal.decision;
}
function panelMatches(proposal: Proposal): boolean {
  return proposal.panel.length === PANEL.length && PANEL.every(id => proposal.panel.includes(id));
}
function validQuorum(proposal: Proposal): boolean {
  return Array.isArray(proposal.signers) && proposal.signers.length >= 3 && proposal.signers.length <= 5
    && new Set(proposal.signers).size === proposal.signers.length
    && proposal.signers.every(id => PANEL.includes(id as typeof PANEL[number]));
}
function ready(state: CatalogState, proposalId: ProposalId, now: number): boolean {
  const proposal = state.proposals[proposalId];
  return proposal.status === 'FINALIZATION_WAIT' && !proposal.related
    && proposal.signedVersion === state.catalogVersion && proposal.signedDiff.toVersion === state.catalogVersion
    && !approvalExpired(proposal, now)
    && panelMatches(proposal) && validQuorum(proposal) && payloadMatches(proposal, proposalId);
}
function requireActive(proposal: Proposal): void {
  rejectUnless(proposal.status !== 'FINAL', 'ALREADY_FINAL');
  rejectUnless(!proposal.related && proposal.status !== 'NEEDS_CHANGE', 'NEW_REVIEW_REQUIRED');
  rejectUnless(proposal.status !== 'REVIEW_EXPIRED', 'REVIEW_EXPIRED');
}
// Match the existing synthetic validation: expiry timestamps are exclusive.
// A new conflict/period must not revive an already-expired dedicated approval;
// only new signatures established BEFORE its expiry may replace that approval.
function approvalExpired(proposal: Proposal, now: number): boolean {
  return now >= proposal.deadline || now >= proposal.signatureExpiresAt;
}
function reconciliationExpired(proposal: Proposal, now: number): boolean {
  return approvalExpired(proposal, now) || (proposal.reconciliationStartedAt !== null
    && now >= proposal.reconciliationStartedAt + RECONCILIATION_WINDOW);
}
function expire(proposal: Proposal): string {
  proposal.status = 'REVIEW_EXPIRED';
  return '審査期限が終了しました。旧承認では確定できません。';
}

export function applyCatalog(state: CatalogState, action: CatalogAction): WorkflowResult<CatalogState> {
  return executeCommand(state, action, next => {
    const base = ['id', 'type', 'expectedRevision', 'proposalId', 'now'];
    switch (action.type) {
      case 'finalize': exactKeys(action, [...base, 'expectedCatalogVersion']); break;
      case 'begin-reconcile': exactKeys(action, base); break;
      case 'reconcile': exactKeys(action, [...base, 'relation', 'signers']); break;
      default: rejectUnless(false, 'INVALID_COMMAND');
    }
    rejectUnless(PROPOSAL_IDS.includes(action.proposalId), 'INVALID_COMMAND');
    rejectUnless(Number.isSafeInteger(action.now) && action.now >= next.now, 'INVALID_COMMAND');
    const proposal = next.proposals[action.proposalId];
    if (action.type === 'reconcile') {
      rejectUnless(['unrelated', 'duplicate', 'changed', 'unknown'].includes(action.relation), 'INVALID_COMMAND');
      rejectUnless(Array.isArray(action.signers), 'INVALID_COMMAND');
    }
    if (action.type === 'finalize') {
      rejectUnless(Number.isSafeInteger(action.expectedCatalogVersion) && action.expectedCatalogVersion >= 0, 'INVALID_COMMAND');
      // A failed catalog CAS never starts reconciliation or changes state/eventId.
      // The UI may follow it with the separate begin-reconcile command.
      rejectUnless(action.expectedCatalogVersion === next.catalogVersion, 'CATALOG_CONFLICT');
      requireActive(proposal);
      rejectUnless(!approvalExpired(proposal, action.now), 'REVIEW_EXPIRED');
      rejectUnless(proposal.signedVersion === next.catalogVersion
        && proposal.signedDiff.toVersion === next.catalogVersion, 'LATEST_SIGNATURE_REQUIRED');
      rejectUnless(payloadMatches(proposal, action.proposalId), 'SIGNED_PAYLOAD_CHANGED');
      rejectUnless(panelMatches(proposal), 'PANEL_CHANGED');
      quorum(proposal.signers);
      rejectUnless(proposal.status === 'FINALIZATION_WAIT', 'RECONCILIATION_REQUIRED');
      for (const id of PROPOSAL_IDS) {
        if (id === action.proposalId || !ready(next, id, action.now)) continue;
        const preceding = next.proposals[id];
        rejectUnless(preceding.firstReadyAt > proposal.firstReadyAt
          || (preceding.firstReadyAt === proposal.firstReadyAt && id > action.proposalId), 'FINALIZATION_ORDER');
      }
      next.catalogVersion++;
      rejectUnless(Number.isSafeInteger(next.catalogVersion), 'CATALOG_CONFLICT');
      proposal.status = 'FINAL';
      proposal.eventId = `event-${action.proposalId}`;
      next.history.push({ catalogVersion: next.catalogVersion, proposalId: action.proposalId, eventId: proposal.eventId, at: action.now });
      next.now = action.now;
      return `${action.proposalId}を最新カタログ版で最終確定しました。`;
    }

    requireActive(proposal);
    next.now = action.now;
    if (reconciliationExpired(proposal, action.now)) return expire(proposal);
    rejectUnless(proposal.signedVersion < next.catalogVersion, 'CATALOG_UP_TO_DATE');
    rejectUnless(payloadMatches(proposal, action.proposalId), 'SIGNED_PAYLOAD_CHANGED');
    rejectUnless(panelMatches(proposal), 'PANEL_CHANGED');
    // Starting/repeating a still-unfinished period cannot move its start time.
    if (proposal.reconciliationStartedAt === null) proposal.reconciliationStartedAt = action.now;
    proposal.status = 'RECONCILING';
    if (action.type === 'begin-reconcile') return `${action.proposalId}の最新差分の再照合を開始しました。`;

    const fromVersion = proposal.signedVersion;
    if (action.relation !== 'unknown') quorum(action.signers);
    proposal.history.push({ at: action.now, fromVersion, toVersion: next.catalogVersion, relation: action.relation });
    if (action.relation === 'unknown') return `${action.proposalId}は未分類のため再照合を保留しています。`;
    if (action.relation === 'duplicate' || action.relation === 'changed') {
      proposal.related = true;
      proposal.status = 'NEEDS_CHANGE';
      return `${action.proposalId}は関連変更のため新提案・新審査が必要です。旧承認では確定しません。`;
    }

    // This single revision-bound demo command means NEW approvals by 3/5 of the
    // original panel over the unchanged payload and EVERY finalized delta through
    // the current version. It cannot import an old signature or replace its payload.
    // These readable fixture identifiers are NOT cryptographic hashes or signatures.
    proposal.signers = [...action.signers];
    proposal.signedVersion = next.catalogVersion;
    proposal.signedAtRevision = next.revision + 1;
    proposal.signedDiff = {
      fromVersion, toVersion: next.catalogVersion, relation: 'unrelated',
      eventIds: next.history.filter(event => event.catalogVersion > fromVersion
        && event.catalogVersion <= next.catalogVersion).map(event => event.eventId),
    };
    proposal.signatureExpiresAt = Math.min(action.now + RECONCILIATION_WINDOW, proposal.deadline);
    proposal.reconciliationStartedAt = null; // Completed; the NEXT conflict gets its own period.
    proposal.status = 'FINALIZATION_WAIT';
    return `${action.proposalId}の最新差分を無関係と再照合し、専用の３署名を記録しました。待機順位は維持します。`;
  });
}
