"use client";

import { useEffect, useId, useState } from "react";
import { ButtonLink } from "@/components/ui";
import { loadJoinDemoState, type JoinDemoReadResult } from "@/lib/joinDemo";
import { routes } from "@/lib/routes";

export function MyJoinStatus({ recruitmentId = "timescar-corporate" }: { recruitmentId?: "timescar-corporate" | "timescar-individual" }) {
  const [state, setState] = useState<JoinDemoReadResult | undefined>(undefined);
  const titleId = useId();
  const joinHref = recruitmentId === "timescar-individual" ? routes.individualJoin : routes.join;
  useEffect(() => setState(loadJoinDemoState(recruitmentId)), [recruitmentId]);

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary-soft p-4 md:p-5"
    >
      <div>
        <h2 id={titleId} className="font-bold text-text">
          このブラウザーの参加状態
        </h2>
        <p className="text-sm text-text-sub">
          {state === undefined
            ? "状態を確認中…"
            : typeof state === "string"
              ? "保存状態を確認できません"
              : state?.status === "registered"
                ? "参加希望を登録済み"
                : state?.status === "cancelled"
                  ? "参加希望を取り消し済み"
                  : "参加希望は未登録"}
          {typeof state !== "string" && state?.status === "registered" &&
            state.selectedFileCount > 0 &&
            `・資料選択 ${state.selectedFileCount}件（未送信）`}
        </p>
      </div>
      <p className="text-[13px] text-text-muted">
        {typeof state === "string"
          ? state === "invalid"
            ? "保存データが壊れているため、未登録とは判断できません。元データを残しています。"
            : "ブラウザーの保存領域を利用できず、状態を確認できません。"
          : "このブラウザーにだけ保存したデモ記録です。募集人数には加算されず、実際の募集状態は変わりません."}
      </p>
      <ButtonLink href={joinHref} variant="secondary" className="self-start">
        {state === undefined
          ? "状態を確認中…"
          : typeof state === "string"
            ? "登録状態を確認できません"
            : state?.status === "registered"
              ? "登録内容を確認・変更"
              : state?.status === "cancelled"
                ? "デモ記録を再登録"
                : "参加希望を登録"}
      </ButtonLink>
    </section>
  );
}
