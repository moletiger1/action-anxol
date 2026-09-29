import type { CreateDraft } from "@/components/groupB/draft";

export type PublishedPreview = {
  id: string;
  rows: [string, string][];
  draft: unknown;
  createdAt: string;
  updatedAt?: string;
};

export type PreviewSaveResult = "saved" | "history-unreadable" | "preview-missing" | "storage-unavailable";
export type PreviewReadError = "history-unreadable" | "storage-unavailable";
export type PreviewReadResult = { previews: PublishedPreview[] } | { error: PreviewReadError };

const KEY = "groupB.publishedPreview.v1";

function isPreview(value: unknown): value is Omit<PublishedPreview, "id"> & { id?: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "rows" in value &&
    Array.isArray(value.rows) &&
    value.rows.every((row) => Array.isArray(row) && row.length === 2 && row.every((cell) => typeof cell === "string")) &&
    new Set(value.rows.map(([label]) => label)).size === value.rows.length &&
    "draft" in value &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    (!("id" in value) || (typeof value.id === "string" && value.id.length > 0 && value.id.length <= 256)) &&
    (!("updatedAt" in value) || (typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))))
  );
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readStoredPreviewsForAppend(): PreviewReadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { error: "storage-unavailable" };
  }
  if (raw === null) return { previews: [] };

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { error: "history-unreadable" };
  }
  const stored = Array.isArray(value) ? value : isPreview(value) ? [value] : null;
  if (!stored || !stored.every(isPreview)) return { error: "history-unreadable" };

  const previews = stored.map((preview) => ({ ...preview, id: preview.id ?? `legacy:${preview.createdAt}` }));
  if (new Set(previews.map((preview) => preview.id)).size !== previews.length) {
    return { error: "history-unreadable" };
  }
  return { previews };
}

export function savePublishedPreview(rows: [string, string][], draft: CreateDraft): PreviewSaveResult {
  const stored = readStoredPreviewsForAppend();
  if ("error" in stored) return stored.error;

  try {
    const now = new Date().toISOString();
    let previews: PublishedPreview[];
    if (draft.previewId) {
      const index = stored.previews.findIndex((preview) => preview.id === draft.previewId);
      if (index < 0) return "preview-missing";
      const preview = {
        ...stored.previews[index],
        rows,
        draft,
        updatedAt: now,
      };
      previews = [preview, ...stored.previews.filter((item) => item.id !== draft.previewId)];
    } else {
      previews = [{ id: newId(), rows, draft, createdAt: now }, ...stored.previews];
    }
    localStorage.setItem(KEY, JSON.stringify(previews));
    return "saved";
  } catch {
    return "storage-unavailable";
  }
}

export function readPublishedPreviews(): PreviewReadResult {
  return readStoredPreviewsForAppend();
}
