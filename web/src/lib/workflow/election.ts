import {
  exactKeys, executeCommand, initialWorkflow, quorum, rejectUnless,
  type Command, type WorkflowResult, type WorkflowState,
} from './common.ts';

// Browser-local application demo only. No votes, shared DB/CAS, cryptographic
// proofs, contracts, external reconciliation or money movement are implemented.
// The fixed FINAL result, trusted signed time and other spending conditions are
// fixtures. These commands neither prove nor unlock production gates G-01..05.
type CandidateId = 'A' | 'B';
export type ElectionBankStatus =
  | 'NOT_SUBMITTED' | 'RESERVED' | 'SUBMITTED' | 'UNKNOWN' | 'COMPLETED' | 'NOT_SENT';
type ElectionHistory =
  | { type: 'candidate-withdraw' | 'candidate-revoke'; candidateId: CandidateId; day: number }
  | { type: 'objection'; day: number; evidenceHash: string; reason: 'election-invalid';
      signers: readonly string[]; proof: 'demo-bound-evidence'; status: 'ACCEPTED_UNRESOLVED' };

export type ElectionState = WorkflowState & {
  selectedCandidateId: 'A';
  candidates: Record<CandidateId, { active: boolean }>;
  contracted: boolean;
  held: boolean;
  paid: boolean;
  reserved: boolean;
  unknown: boolean;
  day: number;
  history: ElectionHistory[];
  bankStatus: ElectionBankStatus;
  final: Readonly<{ status: 'FINAL'; day: 21; selectedCandidateId: 'A';
    candidateConditionsHash: 'demo-fixed-A-B-conditions' }>;
};
export type ElectionAction = Command & (
  | { type: 'candidate-withdraw'; candidateId: CandidateId; day: number }
  | { type: 'candidate-revoke'; candidateId: CandidateId; day: number }
  | { type: 'contract' }
  | { type: 'reserve' }
  | { type: 'bank-submit' }
  | { type: 'bank-confirm'; result: 'completed' | 'not-sent' }
  | { type: 'bank-unknown' }
  | { type: 'objection'; evidenceHash: string; reason: 'election-invalid';
      signers: readonly string[]; proof: 'demo-bound-evidence' }
);

export function createDemoElection(): ElectionState {
  return {
    ...initialWorkflow(), selectedCandidateId: 'A',
    candidates: { A: { active: true }, B: { active: true } },
    contracted: false, held: false, paid: false, reserved: false, unknown: false,
    day: 21, history: [], bankStatus: 'NOT_SUBMITTED',
    final: { status: 'FINAL', day: 21, selectedCandidateId: 'A',
      candidateConditionsHash: 'demo-fixed-A-B-conditions' },
  };
}

const commandKeys = ['id', 'type', 'expectedRevision'] as const;
function allowNewSpending(state: ElectionState, code: string) {
  rejectUnless(!state.held && state.candidates[state.selectedCandidateId].active, code);
}

export function applyElection(state: ElectionState, action: ElectionAction): WorkflowResult<ElectionState> {
  // executeCommand clones before mutation; rejected operations return the original
  // state without consuming IDs. Its receipt replay happens before revision CAS.
  return executeCommand(state, action, next => {
    switch (action.type) {
      case 'candidate-withdraw':
      case 'candidate-revoke': {
        exactKeys(action, [...commandKeys, 'candidateId', 'day']);
        rejectUnless(action.candidateId === 'A' || action.candidateId === 'B', 'INVALID_CANDIDATE');
        rejectUnless(Number.isSafeInteger(action.day) && action.day >= 21 && action.day >= next.day, 'INVALID_DAY');
        next.day = action.day;
        next.candidates[action.candidateId].active = false;
        next.history.push({ type: action.type, candidateId: action.candidateId, day: action.day });
        if (action.candidateId === next.selectedCandidateId) {
          next.held = true;
          return 'デモ：選任済み候補の条件喪失を記録し、新規契約・支出を保留しました。FINAL・既払い・予約は維持します。';
        }
        return 'デモ：落選候補の変更を履歴へ記録しました。選任済み候補の契約・支出は停止しません。';
      }
      case 'contract':
        exactKeys(action, commandKeys);
        allowNewSpending(next, 'CONTRACT_ON_HOLD');
        rejectUnless(!next.contracted, 'CONTRACT_ALREADY_EXISTS');
        next.contracted = true;
        return 'デモ：契約条件の成立を記録しました。実際の契約手続ではありません。';
      case 'reserve':
        exactKeys(action, commandKeys);
        allowNewSpending(next, 'SPENDING_ON_HOLD');
        rejectUnless(next.contracted, 'CONTRACT_REQUIRED');
        rejectUnless(!next.paid, 'BANK_ALREADY_COMPLETED');
        rejectUnless(!next.reserved, 'RESERVATION_EXISTS');
        next.reserved = true;
        next.bankStatus = 'RESERVED';
        return 'デモ：単一支出の予約を記録しました。実資金は拘束していません。';
      case 'bank-submit':
        exactKeys(action, commandKeys);
        allowNewSpending(next, 'BANK_EXECUTION_ON_HOLD');
        rejectUnless(next.bankStatus !== 'UNKNOWN', 'UNKNOWN_REQUIRES_RECONCILIATION');
        rejectUnless(!next.paid, 'BANK_ALREADY_COMPLETED');
        rejectUnless(next.bankStatus !== 'SUBMITTED', 'BANK_ALREADY_SUBMITTED');
        rejectUnless(next.reserved && (next.bankStatus === 'RESERVED' || next.bankStatus === 'NOT_SENT'), 'RESERVATION_REQUIRED');
        next.bankStatus = 'SUBMITTED';
        return 'デモ：最新候補条件を照合し、銀行処理の開始を記録しました。外部送信・実送金は行っていません。';
      case 'bank-unknown':
        exactKeys(action, commandKeys);
        rejectUnless(next.bankStatus === 'SUBMITTED', 'BANK_NOT_SUBMITTED');
        next.bankStatus = 'UNKNOWN';
        next.unknown = true;
        return 'デモ：銀行結果不明を記録しました。照合まで予約を維持し、再実行を拒否します。';
      case 'bank-confirm':
        exactKeys(action, [...commandKeys, 'result']);
        rejectUnless(action.result === 'completed' || action.result === 'not-sent', 'INVALID_BANK_RESULT');
        rejectUnless(next.bankStatus === 'SUBMITTED' || next.bankStatus === 'UNKNOWN', 'BANK_NOT_PENDING');
        // This records a terminal result for the already submitted demo operation;
        // it is not a new execution. A later hold cannot erase its completion.
        // NOT_SENT resolves uncertainty, not the underlying reserved obligation.
        next.unknown = false;
        if (action.result === 'completed') {
          next.bankStatus = 'COMPLETED';
          next.paid = true;
          next.reserved = false;
          return 'デモ：既存銀行処理の完了照合を記録しました。保留後も既払い履歴は巻き戻しません。実送金の証明ではありません。';
        }
        next.bankStatus = 'NOT_SENT';
        return 'デモ：銀行処理の未送金終端を記録しました。債務の予約は維持し、保留中は再実行しません。';
      case 'objection':
        exactKeys(action, [...commandKeys, 'evidenceHash', 'reason', 'signers', 'proof']);
        rejectUnless(typeof action.evidenceHash === 'string' && /^[a-fA-F0-9]{64}$/.test(action.evidenceHash)
          && action.reason === 'election-invalid' && action.proof === 'demo-bound-evidence', 'INVALID_EVIDENCE');
        quorum(action.signers);
        // The literal proof is an explicit fixture bound to this demo election's
        // allegation, NOT verification of evidence or external signer identities.
        next.history.push({ type: 'objection', day: next.day, evidenceHash: action.evidenceHash,
          reason: action.reason, signers: [...action.signers], proof: action.proof,
          status: 'ACCEPTED_UNRESOLVED' });
        next.held = true;
        return 'デモ：選挙有効性の異議を独立3/5の仮定で受理し、新規契約・支出を保留しました。外部署名・証拠の暗号検証は未実装です。';
      default:
        rejectUnless(false, 'INVALID_COMMAND');
    }
  });
}
