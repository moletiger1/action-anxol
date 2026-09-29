export type JoinDemoState = {
  submittedAt: string;
  selectedFileCount: number;
  skippedFiles: boolean;
  status: "registered" | "cancelled";
  cancelledAt: string | null;
};
export type JoinDemoLoadError = "invalid" | "unavailable";
export type JoinDemoReadResult = JoinDemoState | null | JoinDemoLoadError;

const KEY = "groupB.joinSubmission.v1";
const keyFor = (recruitmentId: string) => `${KEY}.${recruitmentId}`;

export function saveJoinDemoState(selectedFileCount: number, skippedFiles: boolean, recruitmentId = "timescar-corporate"): boolean {
  if (!Number.isInteger(selectedFileCount) || selectedFileCount < 0 || typeof skippedFiles !== "boolean") return false;
  const current = loadJoinDemoState(recruitmentId);
  if (typeof current === "string") return false;
  try {
    localStorage.setItem(
      keyFor(recruitmentId),
      JSON.stringify({
        submittedAt: new Date().toISOString(),
        selectedFileCount,
        skippedFiles,
        status: "registered",
        cancelledAt: null,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function loadJoinDemoState(recruitmentId = "timescar-corporate"): JoinDemoReadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(keyFor(recruitmentId)) ?? (recruitmentId === "timescar-corporate" ? localStorage.getItem(KEY) : null);
  } catch {
    return "unavailable";
  }
  if (raw === null) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return "invalid";
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "submittedAt" in value &&
    typeof value.submittedAt === "string" &&
    Number.isFinite(Date.parse(value.submittedAt)) &&
    "selectedFileCount" in value &&
    typeof value.selectedFileCount === "number" &&
    Number.isInteger(value.selectedFileCount) &&
    value.selectedFileCount >= 0 &&
    "skippedFiles" in value &&
    typeof value.skippedFiles === "boolean"
  ) {
    const status = "status" in value ? value.status : "registered";
    const cancelledAt = "cancelledAt" in value ? value.cancelledAt : null;
    if (
      (status === "registered" || status === "cancelled") &&
      (cancelledAt === null || (typeof cancelledAt === "string" && Number.isFinite(Date.parse(cancelledAt))))
    ) {
      return { ...value, status, cancelledAt } as JoinDemoState;
    }
  }
  return "invalid";
}

export function cancelJoinDemoState(recruitmentId = "timescar-corporate"): JoinDemoReadResult {
  const current = loadJoinDemoState(recruitmentId);
  if (typeof current === "string") return current;
  if (!current || current.status === "cancelled") return current;

  const cancelled: JoinDemoState = {
    ...current,
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(keyFor(recruitmentId), JSON.stringify(cancelled));
    return cancelled;
  } catch {
    return null;
  }
}
