"use client";

import { useCallback, useSyncExternalStore } from "react";
import { TIMESCAR_EVENT_ID } from "@/lib/eventIds";

/**
 * 案件作成ウィザードの下書き。localStorage に自動保存し、
 * 4段階の行き来・閉じた後の再開で同じ内容を使う。
 * 初期値はデザインのデモ入力（架空）。
 */
export type Relation = "self" | "corporate" | "family" | "unknown" | "";
export type LinkMode = "new" | "existing";
export type FundingMode = "interest" | "now";

export type CreateDraft = {
  company: string;
  year: string;
  month: string;
  timeUnknown: boolean;
  what: string;
  relation: Relation;
  linkMode: LinkMode;
  eventId: string | null;
  previewId: string | null;
  targets: string[];
  sourceUrl: string;
  purposes: string[];
  purposeOther: string;
  funding: FundingMode;
  goalYen: string;
  legacyGoalUsdc?: string;
  deadline: string;
  usage: string;
  approver: string;
  refund: string;
  /** 公開前の確認欄。初期状態は未チェック */
  confirmPii: boolean;
  confirmFacts: boolean;
  savedAt: string | null;
  published: boolean;
};

export const DEMO_DRAFT: CreateDraft = {
  company: "タイムズカー（カーシェアリング）",
  year: "2026",
  month: "9",
  timeUnknown: false,
  what: "運営会社から、不正アクセスにより会員情報が漏えいしたという通知メールが届きました。どの情報が対象か、法人会員の利用者にも影響があるのかが分かりません。",
  relation: "corporate",
  linkMode: "new",
  eventId: null,
  previewId: null,
  targets: ["corporate", "unaware"],
  sourceUrl: "https://share.timescar.jp/news/2026/0928/1815.html",
  purposes: ["scope", "inquiry", "damages"],
  purposeOther: "",
  funding: "interest",
  goalYen: "",
  deadline: "",
  usage: "",
  approver: "",
  refund: "",
  confirmPii: false,
  confirmFacts: false,
  savedAt: null,
  published: false,
};

const KEY = "groupB.createDraft.v1";
const listeners = new Set<() => void>();
let rawCache: string | null | undefined;
let valueCache: CreateDraft = DEMO_DRAFT;
let storageUnavailable = false;
let invalidSavedDraft = false;

function read(): CreateDraft {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
    return valueCache;
  }
  if (raw !== rawCache) {
    rawCache = raw;
    try {
      if (!raw) {
        valueCache = DEMO_DRAFT;
        invalidSavedDraft = false;
      } else {
        const saved: unknown = JSON.parse(raw);
        const candidate = normalizeDraft(saved);
        invalidSavedDraft = candidate === null;
        valueCache = candidate ?? DEMO_DRAFT;
      }
    } catch {
      invalidSavedDraft = true;
      valueCache = DEMO_DRAFT;
    }
  }
  return valueCache;
}

function write(next: CreateDraft | null): boolean {
  if (invalidSavedDraft && next !== null) return false;
  let stored = true;
  try {
    if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
    storageUnavailable = false;
    if (next === null) invalidSavedDraft = false;
  } catch {
    stored = false;
    storageUnavailable = true;
    // 保存できない環境ではメモリ上だけで続ける
    rawCache = next ? JSON.stringify(next) : null;
    valueCache = next ?? DEMO_DRAFT;
  }
  listeners.forEach((l) => l());
  return stored;
}

function isCreateDraft(value: unknown): value is CreateDraft {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Record<string, unknown>;
  const textFields = [
    "company", "year", "month", "what", "sourceUrl", "purposeOther", "goalYen", "deadline", "usage", "approver", "refund",
  ];
  return (
    textFields.every((key) => typeof d[key] === "string") &&
    typeof d.timeUnknown === "boolean" &&
    ["self", "corporate", "family", "unknown", ""].includes(String(d.relation)) &&
    (d.linkMode === "new" || d.linkMode === "existing") &&
    (d.eventId === null || (typeof d.eventId === "string" && /^0x[0-9a-fA-F]{64}$/.test(d.eventId))) &&
    (d.previewId === null || typeof d.previewId === "string") &&
    Array.isArray(d.targets) && d.targets.every((key) => targetOptions.some((option) => option.key === key)) &&
    Array.isArray(d.purposes) && d.purposes.every((key) => purposeOptions.some((option) => option.key === key)) &&
    (d.funding === "interest" || d.funding === "now") &&
    typeof d.confirmPii === "boolean" &&
    typeof d.confirmFacts === "boolean" &&
    (typeof d.savedAt === "string" || d.savedAt === null) &&
    typeof d.published === "boolean"
  );
}

function normalizeDraft(value: unknown, previewId?: string | null): CreateDraft | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const saved = value as Partial<CreateDraft> & { goalUsdc?: unknown };
  const candidate = {
    ...saved,
    goalYen: saved.goalYen ?? "",
    legacyGoalUsdc: saved.legacyGoalUsdc ?? (typeof saved.goalUsdc === "string" ? saved.goalUsdc : undefined),
    eventId: saved.eventId ?? (saved.linkMode === "existing" ? TIMESCAR_EVENT_ID : null),
    previewId: previewId ?? saved.previewId ?? null,
  };
  return isCreateDraft(candidate) ? candidate : null;
}

export type RestoreCreateDraftResult = "restored" | "invalid-draft" | "storage-unavailable";

export function restoreCreateDraft(snapshot: unknown, previewId: string | null = null): RestoreCreateDraftResult {
  const saved = normalizeDraft(snapshot, previewId);
  if (!saved) return "invalid-draft";
  const restored = {
    ...saved,
    confirmPii: false,
    confirmFacts: false,
    published: false,
  };
  if (!isCreateDraft(restored)) return "invalid-draft";
  return write(restored) ? "restored" : "storage-unavailable";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function useCreateDraft() {
  const draft = useSyncExternalStore(subscribe, read, () => DEMO_DRAFT);
  const persistenceFailed = useSyncExternalStore(subscribe, () => storageUnavailable, () => false);
  const draftInvalid = useSyncExternalStore(subscribe, () => invalidSavedDraft, () => false);
  const update = useCallback((patch: Partial<CreateDraft>) => {
    if (invalidSavedDraft) return;
    write({ ...read(), ...patch, savedAt: nowHHMM() });
  }, []);
  const reset = useCallback(() => write(null), []);
  return { draft, update, reset, persistenceFailed, draftInvalid };
}

export const relationLabels: Record<Exclude<Relation, "">, string> = {
  self: "通知を受け取った本人",
  corporate: "法人会員の担当者・利用者",
  family: "家族・関係者",
  unknown: "まだ分からない",
};

export const targetOptions = [
  {
    key: "corporate",
    label: "法人会員の担当者・利用者",
    short: "法人会員の担当者・利用者",
    note: "法人契約でタイムズカーを利用している企業・団体と、その利用者",
  },
  {
    key: "individual",
    label: "個人会員",
    short: "個人会員",
    note: "個人向けの募集は、同じ事件の中で既に募集中です",
  },
  {
    key: "unaware",
    label: "通知を受け取っていないが、心当たりのある方",
    short: "心当たりのある方",
  },
] as const;

export const purposeOptions = [
  { key: "scope", label: "漏えいした情報の範囲と、自分たちへの影響を知りたい", short: "情報の範囲と影響" },
  { key: "inquiry", label: "企業への説明の求め方・問い合わせの進め方を知りたい", short: "説明の求め方" },
  {
    key: "damages",
    label: "損害賠償などを求められる可能性と、その費用・期間を知りたい",
    short: "損害賠償の可能性と費用",
  },
  { key: "other", label: "その他（自由記述）", short: "その他" },
] as const;
