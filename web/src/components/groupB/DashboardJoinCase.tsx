"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Building2, CircleDashed, CircleX, FileText, FlaskConical, UserRound } from "lucide-react";
import { Badge, Button, ButtonLink, ConfirmDialog } from "@/components/ui";
import { cancelJoinDemoState, loadJoinDemoState, type JoinDemoReadResult } from "@/lib/joinDemo";
import { routes } from "@/lib/routes";
import { demoRecruitments } from "@/lib/demoRecruitments";

export function DashboardJoinCase({ recruitmentId = "timescar-corporate" }: { recruitmentId?: "timescar-corporate" | "timescar-individual" }) {
  const recruitment = demoRecruitments.find((item) => item.id === recruitmentId)!;
  const joinHref = recruitmentId === "timescar-individual" ? routes.individualJoin : routes.join;
  const [state, setState] = useState<JoinDemoReadResult | undefined>(undefined);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState(false);

  useEffect(() => setState(loadJoinDemoState(recruitmentId)), [recruitmentId]);

  const registered = typeof state !== "string" && state?.status === "registered";
  const cancelled = typeof state !== "string" && state?.status === "cancelled";
  const shownDate =
    typeof state !== "string" && state
      ? cancelled
        ? state.cancelledAt ?? state.submittedAt
        : state.submittedAt
      : undefined;

  function cancel() {
    const next = cancelJoinDemoState(recruitmentId);
    setConfirmCancel(false);
    if (!next || typeof next === "string") {
      setCancelError(true);
      return;
    }
    setState(next);
    setCancelError(false);
  }

  return (
    <article className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-5 md:p-6">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-[13px] text-text-muted">タイムズカーの個人情報漏えいに関する共同相談</p>
          <h3 className="text-lg font-bold text-text">{recruitment.title}</h3>
        </div>
        <Badge tone="neutral" icon={FlaskConical}>このブラウザのデモ状態</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {registered ? (
          <Badge tone="green" icon={BadgeCheck}>参加希望登録済み</Badge>
        ) : cancelled ? (
          <Badge tone="neutral" icon={CircleDashed}>参加希望取り消し済み</Badge>
        ) : state === undefined ? (
          <Badge tone="neutral" icon={CircleDashed}>参加状態を確認中</Badge>
        ) : typeof state === "string" ? (
          <Badge tone="neutral" icon={CircleDashed}>参加状態を確認できません</Badge>
        ) : (
          <Badge tone="neutral" icon={CircleDashed}>参加希望は未登録</Badge>
        )}
        <Badge tone="neutral" icon={recruitment.audience === "corporate" ? Building2 : UserRound}>本人・対象確認は未実施</Badge>
        {registered && typeof state !== "string" && state && state.selectedFileCount > 0 && (
          <Badge tone="neutral" icon={FileText}>資料選択 {state.selectedFileCount}件・未送信</Badge>
        )}
      </div>

      <dl className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-[10px] bg-[#F4F6F9] px-4 py-3">
          <dt className="text-[13px] font-bold text-text-muted">進行段階</dt>
          <dd className="text-[15px] text-text">
            {state === undefined ? "参加状態を確認中" : typeof state === "string" ? "参加状態を確認できません" : registered ? "参加希望の受付（デモ）" : cancelled ? "参加希望を取り消し済み" : "参加希望登録前（デモ）"}
          </dd>
        </div>
        <div className="rounded-[10px] bg-[#F4F6F9] px-4 py-3">
          <dt className="text-[13px] font-bold text-text-muted">あなたの拠出額</dt>
          <dd className="text-[15px] text-text">0（拠出操作なし）</dd>
        </div>
      </dl>

      {shownDate && (
        <p className="text-[13px] text-text-muted">
          {cancelled ? "取り消し日時" : "登録日時"}：{new Date(shownDate).toLocaleString("ja-JP")}
        </p>
      )}
      <p className="text-sm text-text-sub">
        {typeof state === "string"
          ? state === "invalid"
            ? "保存データが壊れているため、未登録とは判断できません。元データを残してあります。"
            : "ブラウザーの保存領域を利用できず、登録状態を確認できません。"
          : "この状態はこのブラウザだけに保存されています。実際の募集状態・本人確認・資料共有・資金には影響しません。"}
      </p>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={joinHref} variant="secondary" icon={registered ? FileText : ArrowRight}>
          {state === undefined ? "参加状態を確認中…" : typeof state === "string" ? "保存状態を確認できません" : registered ? "登録内容を変更" : cancelled ? "再登録する" : "参加希望を登録"}
        </ButtonLink>
        {registered && (
          <Button variant="text" onClick={() => setConfirmCancel(true)}>
            参加希望を取り消す
          </Button>
        )}
      </div>
      {cancelError && (
        <p role="alert" className="text-sm text-red">
          取り消し状態を保存できませんでした。ブラウザーの保存領域を確認してください。
        </p>
      )}
      {typeof state === "string" && <p role="alert" className="text-sm text-red">保存状態が確認できるまで、この画面から登録状態を変更できません。</p>}

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancel}
        icon={CircleX}
        title="参加希望を取り消しますか？"
        description="このブラウザに保存したデモ記録だけを取り消します。実際の募集やサービスへの登録状態は変わりません。"
        confirmLabel="デモ記録を取り消す"
        cancelLabel="戻る"
      />
    </article>
  );
}
