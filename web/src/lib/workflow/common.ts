// Application command infrastructure for the explicitly labelled, isolated demo workflow.
// This is not external signature verification or a substitute for the production gates.
export type Command = { id: string; type: string; expectedRevision: number };
export type WorkflowState = {
  mode: "demo";
  revision: number;
  receipts: Record<string, { fingerprint: string; message: string }>;
  audit: { revision: number; commandId: string; type: string; summary: string }[];
};
export type WorkflowResult<S> =
  | { ok: true; state: S; message: string }
  | { ok: false; state: S; error: string };

export function rejectUnless(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(reason);
}
export function yen(value: unknown): number {
  rejectUnless(typeof value === "number" && Number.isSafeInteger(value) && value >= 0, "INVALID_YEN");
  return value;
}
export function quorum(signers: readonly string[]) {
  rejectUnless(Array.isArray(signers) && signers.length >= 3 && signers.length <= 5
    && new Set(signers).size === signers.length
    && signers.every(signer => ["demo-1", "demo-2", "demo-3", "demo-4", "demo-5"].includes(signer)), "QUORUM_REQUIRED");
}
export function exactKeys(value: object, keys: readonly string[]) {
  rejectUnless(Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), "INVALID_COMMAND");
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}
export function initialWorkflow(): WorkflowState {
  return { mode: "demo", revision: 0, receipts: {}, audit: [] };
}
export function executeCommand<S extends WorkflowState, A extends Command>(
  state: S, action: A, mutate: (next: S) => string,
): WorkflowResult<S> {
  try {
    rejectUnless(state.mode === "demo", "PRODUCTION_GATE_CLOSED");
    rejectUnless(action !== null && typeof action === "object"
      && typeof action.id === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(action.id)
      && !["__proto__", "prototype", "constructor"].includes(action.id), "INVALID_COMMAND");
    const fingerprint = canonical(action);
    const receipt = Object.hasOwn(state.receipts, action.id) ? state.receipts[action.id] : undefined;
    if (receipt) {
      rejectUnless(receipt.fingerprint === fingerprint, "IDEMPOTENCY_CONFLICT");
      return { ok: true, state, message: receipt.message };
    }
    rejectUnless(Number.isSafeInteger(action.expectedRevision) && action.expectedRevision === state.revision, "STATE_CONFLICT");
    const next = structuredClone(state);
    const message = mutate(next);
    next.revision++;
    rejectUnless(Number.isSafeInteger(next.revision), "STATE_CONFLICT");
    next.receipts[action.id] = { fingerprint, message };
    next.audit.push({ revision: next.revision, commandId: action.id, type: action.type, summary: message });
    return { ok: true, state: next, message };
  } catch (error) {
    return { ok: false, state, error: error instanceof Error ? error.message : "INVALID_COMMAND" };
  }
}
export const DEMO_SIGNERS = ["demo-1", "demo-2", "demo-3"] as const;
