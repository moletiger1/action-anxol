"use client";

import { useId, useMemo } from "react";
import { ButtonLink, Skeleton, useDelayedFlag } from "@/components/ui";
import { createClientSnapshotStore, useClientSnapshot } from "@/lib/clientSnapshot";
import { loadJoinDemoState } from "@/lib/joinDemo";
import { routes } from "@/lib/routes";

/**
 * このブラウザーの参加状態。localStorage を読むため、
 * SSR とハイドレーションの間だけ値が未確定になる。
 */
export function MyJoinStatus({
  recruitmentId = "timescar-corporate",
}: {
  recruitmentId?: "timescar-corporate" | "timescar-individual";
}) {
  const titleId = useId();
  const joinHref = recruitmentId === "timescar-individual" ? routes.individualJoin : routes.join;
  const store = useMemo(
    () => createClientSnapshotStore(() => loadJoinDemoState(recruitmentId)),
    [recruitmentId],
  );
  const state = useClientSnapshot(store);
  // 200ms 未満で終わるなら骨組みを出さない
  const loading = useDelayedFlag(state === undefined);

  /*
   * SSR とハイドレーションの間だけ通る。実物と同じ罫線・寸法で置き、
   * 差し替えのときに位置が飛ばないようにする。
   */
  if (loading) {
    return (
      <section
        aria-labelledby={titleId}
        className="flex flex-col gap-3 border-l-2 border-border-strong pl-4"
      >
        <h2 id={titleId} className="font-display text-[15px] font-bold text-text">
          このブラウザーの参加状態
        </h2>
        <div role="status" aria-busy aria-label="参加状態を確認中" className="flex flex-col gap-2.5">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-11 w-44" />
        </div>
      </section>
    );
  }

  const unavailable = typeof state === "string";
  const status = state === undefined ? "loading" : unavailable ? "unavailable" : (state?.status ?? "none");

  const headline =
    status === "loading"
      ? "状態を確認中"
      : status === "unavailable"
        ? "保存状態を確認できません"
        : status === "registered"
          ? "参加希望を登録済み"
          : status === "cancelled"
            ? "参加希望を取り消し済み"
            : "参加希望は未登録";

  const note = unavailable
    ? state === "invalid"
      ? "保存データが壊れているため、未登録とは判断できません。元データを残しています。"
      : "ブラウザーの保存領域を利用できず、状態を確認できません。"
    : "このブラウザーにだけ保存したデモ記録です。募集人数には加算されず、実際の募集状態は変わりません。";

  const action =
    status === "loading"
      ? "状態を確認中"
      : status === "unavailable"
        ? "登録状態を確認できません"
        : status === "registered"
          ? "登録内容を確認・変更する"
          : status === "cancelled"
            ? "デモ記録を再登録する"
            : "参加希望を登録する";

  const fileCount =
    status === "registered" && state && typeof state !== "string" ? state.selectedFileCount : 0;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 border-l-2 border-primary bg-primary-soft px-4 py-4 md:px-5"
    >
      <div className="flex flex-col gap-0.5">
        <h2 id={titleId} className="font-display text-[15px] font-bold text-text">
          このブラウザーの参加状態
        </h2>
        <p className="text-[14px] font-medium text-text">
          {headline}
          {fileCount > 0 && (
            <span className="tabular text-text-sub">・資料選択 {fileCount}件（未送信）</span>
          )}
        </p>
      </div>
      <p className="text-[12px] leading-[1.7] text-text-muted">{note}</p>
      <ButtonLink href={joinHref} variant="secondary" className="self-start">
        {action}
      </ButtonLink>
    </section>
  );
}
