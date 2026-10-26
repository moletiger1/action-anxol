"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Save } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";
import { Button, ButtonLink, Callout, ConfirmDialog, StageBanner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { useCreateDraft } from "./draft";
import { FlowStepper, MobileStageCard } from "./FlowStepper";

export const createSteps = ["出来事", "似た案件の確認", "募集内容", "公開内容の確認"];

/**
 * 自動保存の状態。`shortOnMobile` のときは、狭い幅で時刻を省いて1行に収める
 * （文言は両方とも DOM に置き、CSS で出し分ける）。
 */
export function AutosaveStatus({
  time,
  short,
  shortOnMobile,
  failed,
  invalid,
}: {
  time?: string | null;
  short?: boolean;
  shortOnMobile?: boolean;
  failed?: boolean;
  invalid?: boolean;
}) {
  const icon = cn(
    "size-[18px] shrink-0",
    failed || invalid ? "text-red" : time ? "text-green" : "text-text-muted",
  );
  const label = invalid
    ? "保存データを確認してください"
    : failed
      ? "ブラウザーに保存できません"
      : time
        ? `自動保存済み（${time}）`
        : "入力すると自動保存";

  if (shortOnMobile && time && !failed && !invalid) {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-text-sub" role="status">
        <Save className={icon} aria-hidden />
        <span className="truncate md:hidden">自動保存済み</span>
        <span className="hidden truncate md:inline">自動保存済み（{time}）</span>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-text-sub" role="status">
      <Save className={icon} aria-hidden />
      <span className="truncate">{short && time ? "自動保存済み" : label}</span>
    </span>
  );
}

/** モバイルの作成中CTAバー。作成中は下部ナビを隠し、戻る・次へをここに置く */
export function FlowCtaBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="glass-bar fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 px-4 py-3 md:hidden"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      {children}
    </div>
  );
}

/**
 * 案件作成ウィザード（B01〜B01d）共通の枠。
 * デスクトップ：サイドバー＋上部バー＋段階表示＋本文カード＋右側補足。
 * モバイル：ヘッダー＋段階バー＋段階カード＋縦積み＋下部CTAバー（下部ナビは隠す）。
 */
export function WizardFrame({
  step,
  stage,
  next,
  mobileNext,
  mobileBackHref,
  aside,
  asideMobileHidden,
  mobileCta,
  mobileBare,
  children,
}: {
  step: number;
  stage: string;
  next: string;
  mobileNext?: string;
  mobileBackHref: string;
  aside: ReactNode;
  asideMobileHidden?: boolean;
  mobileCta: ReactNode;
  /** モバイルでは本文をカードで囲まない（M_B01） */
  mobileBare?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { draft, persistenceFailed, draftInvalid, reset } = useCreateDraft();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discardFailed, setDiscardFailed] = useState(false);
  return (
    <div className="[&_nav.fixed]:hidden">
      <AppShell mobileTitle="案件を作る" mobileBackHref={mobileBackHref}>
        <div className="mx-auto flex w-full max-w-[1192px] flex-col gap-4 px-4 pt-4 pb-6 md:gap-6 md:px-9 md:pt-7 md:pb-18">
          {/* 見出しは1つだけ置き、幅によって周辺の要素だけを差し替える */}
          <div className="flex flex-col gap-3 border-b-2 border-text pb-4 md:flex-row md:items-end md:justify-between md:gap-4">
            <h1 className="font-display text-[26px] leading-snug text-text md:text-[28px]">
              新しい案件を作る
            </h1>
            <div className="flex items-center justify-between gap-4 md:justify-end">
              <AutosaveStatus
                time={draft.savedAt}
                shortOnMobile
                failed={persistenceFailed}
                invalid={draftInvalid}
              />
              <ButtonLink href={routes.dashboard} variant="text">
                保存して閉じる
              </ButtonLink>
            </div>
          </div>

          <FlowStepper steps={createSteps} current={step} />
          <Callout icon={Info} tone="neutral" title="案件作成のデモ">
            <p>
              完了しても、このブラウザー内のプレビューを保存するだけです。実際の公開・参加受付・通知は行いません。
            </p>
          </Callout>
          {!draftInvalid && (
            <>
              <div className="hidden md:block">
                <StageBanner stage={stage} next={next} />
              </div>
              <MobileStageCard stage={stage} next={mobileNext ?? next} />
            </>
          )}

          <div className="flex flex-col gap-4 md:gap-8 lg:flex-row lg:items-start">
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col md:gap-8",
                /* モバイルだけ面を持たせる（画面が狭く、地と本文の区別が要るため） */
                mobileBare ? "gap-4" : "gap-6 rounded-sm border border-border bg-surface p-5 md:border-0 md:bg-transparent md:p-0",
              )}
            >
              {draftInvalid ? (
                <Callout icon={Info} tone="red" title="保存した下書きを読み取れません">
                  <p>必須項目が欠けているか、保存形式が壊れています。元のデータはまだ残しています。初期の記入例からやり直す場合だけ、下書きを破棄してください。</p>
                  {discardFailed && <p role="alert">保存データを削除できませんでした。ブラウザーの保存領域を確認してください。</p>}
                  <Button variant="secondary" onClick={() => setConfirmDiscard(true)}>
                    下書きを破棄して最初から始める
                  </Button>
                </Callout>
              ) : children}
            </div>
            <aside
              className={
                asideMobileHidden
                  ? "hidden w-full shrink-0 flex-col gap-4 md:flex lg:w-80"
                  : "flex w-full shrink-0 flex-col gap-4 lg:w-80"
              }
            >
              {aside}
            </aside>
          </div>
        </div>
        <FlowCtaBar>
          {draftInvalid ? <Button disabled>保存データの確認が必要です</Button> : mobileCta}
        </FlowCtaBar>
        <ConfirmDialog
          open={confirmDiscard}
          onClose={() => setConfirmDiscard(false)}
          onConfirm={() => {
            const removed = reset();
            setConfirmDiscard(false);
            setDiscardFailed(!removed);
            if (removed) router.push(routes.create);
          }}
          icon={Info}
          title="保存した下書きを破棄しますか？"
          description="不完全な保存データを削除し、初期の記入例から始めます。保存データは復元できません。"
          confirmLabel="破棄して最初から始める"
          cancelLabel="戻って確認する"
        />
      </AppShell>
    </div>
  );
}

/** カード下部の操作列（デスクトップ） */
export function FormFooter({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="hidden items-center justify-between gap-4 border-t border-border pt-6 md:flex">
      {left}
      <div className="flex items-center gap-4">{right}</div>
    </div>
  );
}
