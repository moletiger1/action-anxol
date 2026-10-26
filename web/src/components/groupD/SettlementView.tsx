"use client";

import { CircleArrowRight, CircleCheck, Info, Lock, Undo2 } from "lucide-react";
import { useState } from "react";
import { Badge, Button, ButtonLink, Callout, ConfirmDialog, CostRow, DemoBadge, StageBanner } from "@/components/ui";
import { MobileCtaBar } from "@/components/layout";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { IconWrap, PageBody, PageHeader } from "./parts";

type Claim = "ready" | "claimed";

const RECEIVE = "225円";

/* ---------- 返金 ---------- */

function RefundRows({ compact }: { compact?: boolean }) {
  return (
    <div className="flex flex-col">
      <CostRow label="拠出額" value="1,500円" />
      <CostRow
        label={compact ? "確定費用（按分）" : "確定費用（あなたの按分）"}
        note={compact ? undefined : "支払済み・契約済み費用 255,000円 × 拠出割合 0.5%"}
        value="− 1,275円"
      />
      <CostRow label="返金可能額" value="225円" />
      <CostRow
        label="返金額の例（手数料未反映）"
        total
        value={<span className="text-xl">{RECEIVE}</span>}
        last
      />
    </div>
  );
}

function ClaimStatus({ claim, compact }: { claim: Claim; compact?: boolean }) {
  if (claim === "claimed") {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-col gap-2 rounded-sm bg-primary-soft sm:flex-row sm:items-center sm:gap-3",
          compact ? "px-3.5 py-3" : "px-4 py-3",
        )}
      >
        <Badge tone="primary" icon={CircleCheck} className="self-start bg-surface sm:self-auto">
          デモ操作済み
        </Badge>
        <span className="text-sm font-medium text-primary-dark">
          返金請求のデモ操作を記録しました。実際の返金は行われません。
        </span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center rounded-sm bg-green-soft",
        compact ? "gap-2.5 px-3.5 py-3" : "gap-3 px-4 py-3",
      )}
    >
      <Badge tone="green" icon={CircleCheck} className="bg-surface">
        請求操作のデモ
      </Badge>
      <span className={cn("font-medium text-green", compact ? "text-[13px]" : "text-sm")}>
        {compact ? "返金条件成立" : "返金条件成立・請求可能"}
      </span>
    </div>
  );
}

function ClaimButton({
  claim,
  onClick,
  label,
  className,
}: {
  claim: Claim;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return claim === "claimed" ? (
    <Button icon={CircleCheck} disabled className={cn("h-[52px] w-full", className)}>
      返金請求のデモ操作済み
    </Button>
  ) : (
    <Button icon={Undo2} onClick={onClick} className={cn("h-[52px] w-full", className)}>
      {label}
    </Button>
  );
}

export function SettlementView() {
  const [claim, setClaim] = useState<Claim>("ready");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const openClaim = () => setDialogOpen(true);
  const nextDesktop = claim === "claimed"
    ? "返金請求のデモ操作済みです。"
    : "相談費の返金請求の操作例を確認できます。";

  return (
    <>
      <PageBody>
        {/* デスクトップの見出し */}
        <div className="hidden md:block">
          <PageHeader
            eyebrow="お金の記録"
            title="あなたの相談費の返金"
            right={
              <>
                <Badge tone="neutral" icon={Lock}>
                  本人だけが閲覧できます
                </Badge>
                <DemoBadge />
              </>
            }
          />
        </div>
        <div className="md:hidden">
          <Badge tone="neutral" icon={Lock}>
            本人だけが閲覧できます
          </Badge>
        </div>

        <Callout icon={Info} tone="neutral" title="精算画面のデモ">
          <p>金額・日付・口座情報は表示例です。返金請求を操作しても、実際の送金や通知は行われません。</p>
        </Callout>

        <div className="hidden md:block">
          <StageBanner stage="相談費の返金（表示例）" next={nextDesktop} />
        </div>

        {/* ===== モバイル（M_D03 / M_D03b） ===== */}
        <div className="flex flex-col gap-4 md:hidden">

          <section
            className="flex flex-col gap-1.5 border-l-2 border-primary bg-primary-soft px-4 py-3.5"
            aria-label="現在の段階と次にすること"
          >
            <p className="text-[12px] font-bold text-primary-dark">現在の段階</p>
            <p className="font-serif text-[15px] font-bold text-text">相談費の返金（表示例）</p>
            <p className="flex items-center gap-1.5 pt-1 text-[12px] font-bold text-primary-dark">
              <CircleArrowRight className="size-4" aria-hidden />
              次にすること
            </p>
            <p className="text-[13px] leading-[1.75] text-text">
              {claim === "claimed"
                ? "返金請求のデモ操作済みです。"
                : "返金請求の操作例を確認できます。"}
            </p>
          </section>

            <section className="rule-head flex flex-col gap-1">
              <h2 className="font-serif text-lg font-bold text-text">相談費などの返金</h2>
              <p className="text-xs text-text-muted">対象：法人会員・利用者の共同相談（精算確定後の想定）</p>
              <RefundRows compact />
            </section>
            <ClaimStatus claim={claim} compact />
            <p className="text-sm text-text-sub">
              円での返金額の表示例です。返金方法・時期・手数料・端数処理は募集開始前に確定します。実際の返金請求は行いません。
            </p>
            <ButtonLink href={`${routes.budget}#budget-contract-rules`} variant="text">
              共同資金の支払条件の表示例を見る
            </ButtonLink>
          <MobileCtaBar>
            <ClaimButton claim={claim} onClick={openClaim} label="返金請求のデモを試す" />
          </MobileCtaBar>
        </div>
        <div className="hidden md:block">
          <section aria-labelledby="refund-title" className="rule-head flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <IconWrap icon={Undo2} />
              <div className="flex min-w-0 flex-col">
                <h2 id="refund-title" className="font-serif text-lg font-bold text-text">
                  相談費などの返金
                </h2>
                <p className="text-[13px] text-text-muted">対象：法人会員・利用者の共同相談（精算確定後の想定）</p>
              </div>
            </div>
            <RefundRows />
            <ClaimStatus claim={claim} />
            <p className="text-sm text-text-sub">
                円での返金額の表示例です。返金方法・時期・手数料・端数処理は募集開始前に確定します。実際の返金請求は行いません。
            </p>
            <ClaimButton claim={claim} onClick={openClaim} label="返金請求のデモを試す" />
            <ButtonLink href={`${routes.budget}#budget-contract-rules`} variant="text">
              共同資金の支払条件の表示例を見る
            </ButtonLink>
          </section>

        </div>
        <Callout icon={Info} tone="neutral">
          <p>入金取消と未送金予約の相殺は、別の架空データで操作できます。この返金表示例とは連動しません。</p>
          <ButtonLink href={`${routes.workflows}#refund`} variant="text">取消・返金予約の操作デモへ</ButtonLink>
        </Callout>
      </PageBody>

      <ConfirmDialog
        open={dialogOpen}
        onClose={() => !confirming && setDialogOpen(false)}
        onConfirm={() => {
          setConfirming(true);
          window.setTimeout(() => {
            setConfirming(false);
            setDialogOpen(false);
            setClaim("claimed");
          }, 1200);
        }}
        confirming={confirming}
        icon={Undo2}
        title={`${RECEIVE}の返金請求のデモを行いますか`}
        description="この画面上の状態だけを切り替えます。実際の返金請求や送金は行われません。"
        confirmLabel="デモ請求を記録する"
      >
        <CostRow label="返金可能額" value="225円" />
        <CostRow label="返金額の例（手数料未反映）" total value={RECEIVE} last />
      </ConfirmDialog>
    </>
  );
}
