// Typed application workflow. Demo evidence is explicitly NOT a real payment/bank attestation.
import { executeCommand, initialWorkflow, exactKeys, rejectUnless, yen, quorum, type Command, type WorkflowState } from "./common.ts";
export type RefundOwnerId = "A" | "B";
export type RefundIntent = {
  operationKey: string; key: string; bankKey: string; ownerId: RefundOwnerId;
  executionVersion: number; amount: number; transactionVersion: number;
  instructionVersion: number; approvedRevision: number; holderProof: "demo-owner-bound";
};
type Owner = { contributed: number; reversed: number; completed: number; transactionVersion: number };
type Instruction = {
  key: string; ownerId: RefundOwnerId; batchId: string; bankKey: string;
  originalAmount: number; completedAmount: number; offsetAmount: number; reservedRemaining: number;
  instructionVersion: number; executionVersion: number; attempts: number;
  status: "RESERVED" | "SUBMITTED" | "UNKNOWN" | "FAILED" | "COMPLETED" | "OFFSET_CLOSED";
};
export type RefundState = WorkflowState & {
  cash: number; externalAdvance: number; liabilities: number;
  owners: Record<RefundOwnerId, Owner>;
  batches: { id: string; amount: number; allocations: Record<RefundOwnerId, number> }[];
  instructions: Record<string, Instruction>;
  executions: Record<string, RefundIntent>;
  cancellations: Record<string, { ownerId: RefundOwnerId; amount: number; transactionVersion: number }>;
};
type Base = Command;
export type RefundAction = Base & (
  | { type: "cancel"; ownerId: RefundOwnerId; amount: number; transactionVersion: number; proof: "demo-payment-cancelled" }
  | { type: "offset"; key: string; eventId: string; signers: readonly string[]; instructionVersion: number; transactionVersion: number;
      proof: { kind: "demo-unsent"; key: string; executionVersion: number; futureExecutionImpossible: true } }
  | { type: "submit" | "retry"; key: string; instructionVersion: number; executionVersion: number; transactionVersion: number;
      holder: { ownerId: RefundOwnerId; proof: "demo-owner-bound" }; intent: RefundIntent }
  | { type: "unknown"; key: string }
  | { type: "confirm"; key: string; executionVersion: number; result: "completed" | "not-sent"; proof: "demo-bank-final" }
  | { type: "reserve-remaining"; batchId: string; signers: readonly string[] }
);
const IDS: RefundOwnerId[] = ["A", "B"];
const BASE = ["id", "type", "expectedRevision"];
function createInstruction(batchId: string, ownerId: RefundOwnerId, amount: number): Instruction {
  return { key: `${batchId}:${ownerId}`, bankKey: `${batchId}:${ownerId}`, ownerId, batchId,
    originalAmount: amount, completedAmount: 0, offsetAmount: 0, reservedRemaining: amount,
    instructionVersion: 1, executionVersion: 1, attempts: 0, status: "RESERVED" };
}
export function createDemoRefund(): RefundState {
  return { ...initialWorkflow(), cash: 200, externalAdvance: 0, liabilities: 0,
    owners: { A: { contributed: 100, reversed: 0, completed: 0, transactionVersion: 1 }, B: { contributed: 100, reversed: 0, completed: 0, transactionVersion: 1 } },
    batches: [{ id: "batch-1", amount: 100, allocations: { A: 50, B: 50 } }],
    instructions: { "batch-1:A": createInstruction("batch-1", "A", 50), "batch-1:B": createInstruction("batch-1", "B", 50) }, executions: {}, cancellations: {} };
}
export function refundTotals(state: RefundState) {
  const owners = Object.fromEntries(IDS.map(ownerId => {
    const owner = state.owners[ownerId];
    const reserved = yen(Object.values(state.instructions).filter(i => i.ownerId === ownerId).reduce((sum, i) => sum + i.reservedRemaining, 0));
    const right = Math.max(0, owner.contributed - owner.reversed - owner.completed);
    return [ownerId, { reserved, right, cap: Math.max(0, right - reserved), overpaid: Math.max(0, owner.completed - (owner.contributed - owner.reversed)) }];
  })) as Record<RefundOwnerId, { reserved: number; right: number; cap: number; overpaid: number }>;
  const obligations = yen(state.liabilities + state.externalAdvance + owners.A.reserved + owners.B.reserved);
  return { owners, obligations, refundAvailable: Math.max(0, state.cash - obligations), shortfall: Math.max(0, obligations - state.cash) };
}
function invariant(state: RefundState) {
  yen(state.cash); yen(state.externalAdvance); yen(state.liabilities);
  const used = IDS.reduce((sum, ownerId) => sum + state.owners[ownerId].reversed + state.owners[ownerId].completed, 0);
  rejectUnless(state.cash + used === 200 + state.externalAdvance, "CASH_IDENTITY");
  for (const instruction of Object.values(state.instructions)) {
    rejectUnless(instruction.originalAmount === instruction.completedAmount + instruction.offsetAmount + instruction.reservedRemaining, "RESERVATION_IDENTITY");
    rejectUnless(state.batches.find(b => b.id === instruction.batchId)?.allocations[instruction.ownerId] === instruction.originalAmount, "FIXED_BATCH_CHANGED");
    yen(instruction.completedAmount); yen(instruction.offsetAmount); yen(instruction.reservedRemaining);
  }
  for (const ownerId of IDS) {
    const owner = state.owners[ownerId];
    rejectUnless(owner.reversed <= owner.contributed && owner.completed === Object.values(state.instructions).filter(i => i.ownerId === ownerId).reduce((sum, i) => sum + i.completedAmount, 0), "OWNER_LEDGER_MISMATCH");
  }
  refundTotals(state);
}
function instruction(state: RefundState, key: string) {
  rejectUnless(Object.hasOwn(state.instructions, key), "INSTRUCTION_NOT_FOUND");
  return state.instructions[key];
}
export function refundIntent(state: RefundState, key: string): RefundIntent {
  const i = instruction(state, key), operationKey = `${i.key}:executeRefund:${i.executionVersion}`;
  if (Object.hasOwn(state.executions, operationKey)) return structuredClone(state.executions[operationKey]);
  return { operationKey, key: i.key, bankKey: i.bankKey, ownerId: i.ownerId,
    executionVersion: i.executionVersion, amount: i.reservedRemaining,
    transactionVersion: state.owners[i.ownerId].transactionVersion, instructionVersion: i.instructionVersion,
    approvedRevision: state.revision, holderProof: "demo-owner-bound" };
}
export function applyRefund(state: RefundState, action: RefundAction) {
  return executeCommand(state, action, next => {
    let message: string;
    switch (action.type) {
      case "cancel": {
        exactKeys(action, [...BASE, "ownerId", "amount", "transactionVersion", "proof"]);
        rejectUnless(IDS.includes(action.ownerId) && action.proof === "demo-payment-cancelled", "PAYMENT_PROOF_REQUIRED");
        const owner = next.owners[action.ownerId], amount = yen(action.amount);
        rejectUnless(action.transactionVersion === owner.transactionVersion + 1, "PAYMENT_VERSION_CONFLICT");
        rejectUnless(amount > 0 && amount <= owner.contributed - owner.reversed, "CANCELLATION_AMOUNT");
        owner.reversed += amount; owner.transactionVersion++;
        const bridge = Math.max(0, amount - next.cash);
        next.externalAdvance = yen(next.externalAdvance + bridge); next.cash = Math.max(0, next.cash - amount);
        next.cancellations[action.id] = { ownerId: action.ownerId, amount, transactionVersion: action.transactionVersion };
        message = `${action.ownerId}の入金${amount}円をデモ台帳で取消しました。予約は照合・相殺まで維持します。`;
        break;
      }
      case "offset": {
        exactKeys(action, [...BASE, "key", "eventId", "signers", "instructionVersion", "transactionVersion", "proof"]);
        const i = instruction(next, action.key);
        rejectUnless(Object.hasOwn(next.cancellations, action.eventId) && next.cancellations[action.eventId].ownerId === i.ownerId, "CANCELLATION_PROOF_REQUIRED");
        quorum(action.signers);
        rejectUnless(action.instructionVersion === i.instructionVersion && action.transactionVersion === next.owners[i.ownerId].transactionVersion, "INSTRUCTION_VERSION_CONFLICT");
        rejectUnless(i.status !== "UNKNOWN" && i.status !== "SUBMITTED", "EXTERNAL_RECONCILIATION_REQUIRED");
        rejectUnless(i.status === "RESERVED" || i.status === "FAILED", "RESERVATION_CLOSED");
        exactKeys(action.proof, ["kind", "key", "executionVersion", "futureExecutionImpossible"]);
        rejectUnless(action.proof.kind === "demo-unsent" && action.proof.key === i.key && action.proof.executionVersion === i.executionVersion && action.proof.futureExecutionImpossible === true, "UNSENT_PROOF_REQUIRED");
        const totals = refundTotals(next).owners[i.ownerId];
        const amount = Math.min(i.reservedRemaining, Math.max(0, totals.reserved - totals.right));
        rejectUnless(amount > 0, "NO_OFFSET_REQUIRED");
        const earliest = Object.values(next.instructions).find(j => j.ownerId === i.ownerId && j.reservedRemaining > 0 && (j.status === "RESERVED" || j.status === "FAILED"));
        rejectUnless(earliest?.key === i.key, "OFFSET_ORDER");
        i.offsetAmount += amount; i.reservedRemaining -= amount; i.instructionVersion++; i.executionVersion++; i.attempts = 0;
        i.status = i.reservedRemaining === 0 ? "OFFSET_CLOSED" : "RESERVED";
        message = `${i.ownerId}の未送金予約${amount}円を追記相殺しました。元バッチと現金は変更しません。`;
        break;
      }
      case "submit":
      case "retry": {
        exactKeys(action, [...BASE, "key", "instructionVersion", "executionVersion", "transactionVersion", "holder", "intent"]);
        const i = instruction(next, action.key), totals = refundTotals(next);
        const expected = refundIntent(next, i.key);
        rejectUnless(action.intent !== null && typeof action.intent === "object", "EXECUTION_INTENT_CONFLICT");
        exactKeys(action.intent, Object.keys(expected));
        rejectUnless(Object.entries(expected).every(([key, value]) => action.intent[key as keyof RefundIntent] === value), "EXECUTION_INTENT_CONFLICT");
        if (action.type === "retry") rejectUnless(Object.hasOwn(next.executions, expected.operationKey), "EXECUTION_INTENT_REQUIRED");
        exactKeys(action.holder, ["ownerId", "proof"]);
        rejectUnless(action.holder.ownerId === i.ownerId && action.holder.proof === "demo-owner-bound", "HOLDER_PROOF_REQUIRED");
        rejectUnless(action.instructionVersion === i.instructionVersion && action.executionVersion === i.executionVersion && action.transactionVersion === next.owners[i.ownerId].transactionVersion, "INSTRUCTION_VERSION_CONFLICT");
        rejectUnless(i.reservedRemaining > 0 && totals.owners[i.ownerId].right >= totals.owners[i.ownerId].reserved, "LATEST_RIGHT_MISMATCH");
        rejectUnless(totals.shortfall === 0, "INSUFFICIENT_CASH");
        rejectUnless((action.type === "submit" && i.status === "RESERVED") || (action.type === "retry" && i.status === "FAILED" && i.attempts < 4), "EXECUTION_NOT_ALLOWED");
        if (action.type === "submit") next.executions[expected.operationKey] = structuredClone(action.intent);
        // Transport command IDs and the current reconciliation context may change;
        // the execution-version operation key and original approved intent never do.
        i.status = "SUBMITTED"; i.instructionVersion++; i.attempts++;
        message = `${i.ownerId}の返金${i.reservedRemaining}円をデモ指示にしました。まだ返金完了ではありません。`;
        break;
      }
      case "unknown": {
        exactKeys(action, [...BASE, "key"]);
        const i = instruction(next, action.key);
        rejectUnless(i.status === "SUBMITTED", "EXECUTION_NOT_ALLOWED");
        i.status = "UNKNOWN"; i.instructionVersion++;
        message = "結果不明として予約を保持しました。照合前の相殺・再送はできません。";
        break;
      }
      case "confirm": {
        exactKeys(action, [...BASE, "key", "executionVersion", "result", "proof"]);
        const i = instruction(next, action.key);
        rejectUnless(action.proof === "demo-bank-final" && action.executionVersion === i.executionVersion, "BANK_PROOF_REQUIRED");
        rejectUnless(i.status === "SUBMITTED" || i.status === "UNKNOWN", "EXECUTION_NOT_ALLOWED");
        rejectUnless(action.result === "completed" || action.result === "not-sent", "BANK_PROOF_REQUIRED");
        if (action.result === "completed") {
          const amount = i.reservedRemaining, bridge = Math.max(0, amount - next.cash);
          next.externalAdvance = yen(next.externalAdvance + bridge); next.cash = Math.max(0, next.cash - amount);
          i.completedAmount += amount; i.reservedRemaining = 0; next.owners[i.ownerId].completed += amount; i.status = "COMPLETED";
          message = `${i.ownerId}への${amount}円の完了をデモ照合で記録しました。実際の送金はありません。`;
        } else {
          i.status = "FAILED";
          message = "実行されなかった結果をデモ照合しました。将来不実行の証明と3人承認がそろうまで予約は解放しません。";
        }
        i.instructionVersion++;
        break;
      }
      case "reserve-remaining": {
        exactKeys(action, [...BASE, "batchId", "signers"]); quorum(action.signers);
        rejectUnless(typeof action.batchId === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(action.batchId) && !next.batches.some(b => b.id === action.batchId), "BATCH_ID_CONFLICT");
        const totals = refundTotals(next);
        const capSum = yen(totals.owners.A.cap + totals.owners.B.cap);
        // This demo has no unreleased non-refund expense allocation: reserve the complete eligible remainder,
        // which equals all caps. No cumulative redistribution or discretionary owner targeting is permitted.
        rejectUnless(totals.shortfall === 0 && capSum > 0 && capSum <= totals.refundAvailable, "INSUFFICIENT_REFUND_CASH");
        const allocations = { A: totals.owners.A.cap, B: totals.owners.B.cap };
        next.batches.push({ id: action.batchId, amount: capSum, allocations });
        for (const ownerId of IDS) if (allocations[ownerId] > 0) {
          const i = createInstruction(action.batchId, ownerId, allocations[ownerId]); next.instructions[i.key] = i;
        }
        message = `${capSum}円の残余権利を新バッチに予約しました。確定済みバッチは不変です。`;
        break;
      }
      default: throw new Error("INVALID_COMMAND");
    }
    invariant(next);
    return message;
  });
}
