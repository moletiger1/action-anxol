"use client";

import { FilePenLine } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { routes } from "@/lib/routes";
import { useCreateDraft } from "./draft";

export function DashboardDraftCard() {
  const { draft, persistenceFailed, draftInvalid } = useCreateDraft();
  if (!draft.savedAt && !draftInvalid) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-[#EEF2F5] px-5 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-3">
        <FilePenLine className="mt-0.5 size-5 shrink-0 text-text-sub" aria-hidden />
        <div className="flex min-w-0 flex-col">
          <p className="text-[15px] font-bold text-text">
            {draftInvalid ? "保存した下書きを確認してください" : `作成中の下書き：${draft.company.trim() || "名称未入力の案件"}`}
          </p>
          <p className="text-[13px] text-text-muted">
            {draftInvalid
              ? "保存データが不完全です。記入例で上書きせず、確認してから再開してください。"
              : persistenceFailed
                ? "このタブ内だけに保持しています。ブラウザーには保存できていません。"
                : "このブラウザーに入力内容を保存しています。"}
          </p>
        </div>
      </div>
      <ButtonLink href={draft.previewId ? routes.createReview : routes.create} variant="secondary" className="shrink-0">
        {draftInvalid ? "保存データを確認" : "下書きを開く"}
      </ButtonLink>
    </div>
  );
}
