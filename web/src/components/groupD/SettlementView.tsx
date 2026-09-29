"use client";

import {
  Check,
  CircleArrowRight,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  Clock3,
  Info,
  Landmark,
  Lock,
  MessageSquareWarning,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Callout,
  ConfirmDialog,
  CostRow,
  DemoBadge,
  StageBanner,
  TextArea,
} from "@/components/ui";
import { MobileCtaBar } from "@/components/layout";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { IconWrap, KVRow, PageBody, PageHeader } from "./parts";
import { Segmented } from "./Segmented";

type Tab = "refund" | "recovery";
type Claim = "ready" | "claimed";
type Objection = "closed" | "open" | "sent";

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
          "flex flex-col gap-2 rounded-[10px] bg-primary-soft sm:flex-row sm:items-center sm:gap-3",
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
        "flex items-center rounded-[10px] bg-green-soft",
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

/* ---------- 回収金 ---------- */

type StageState = "done" | "none" | "current" | "todo";
const recoveryStages: { label: string; state: StageState; date: string }[] = [
  { label: "和解が成立", state: "done", date: "2027年5月20日" },
  { label: "入金待ち", state: "done", date: "2027年6月10日 入金" },
  { label: "一部入金", state: "none", date: "該当なし（全額入金）" },
  { label: "精算中", state: "current", date: "振込前の確認期間：6月23日まで" },
  { label: "送金済み", state: "todo", date: "振込予定 2027年6月24日" },
];

const stageIcon: Record<StageState, LucideIcon> = {
  done: CircleCheck,
  none: CircleMinus,
  current: Clock3,
  todo: CircleDashed,
};

function StageStrip({ transferred }: { transferred: boolean }) {
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="回収金の段階">
      {recoveryStages.map((s) => {
        const Icon = stageIcon[s.state];
        return (
          <li
            key={s.label}
            aria-current={s.state === "current" ? "step" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs",
              s.state === "done" && "border-transparent bg-green-soft font-medium text-green",
              (s.state === "none" || s.state === "todo") &&
                "border-transparent bg-[#F4F6F9] font-medium text-text-muted",
              s.state === "current" && "border-amber-line bg-amber-soft font-bold text-amber",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span>{s.label}</span>
            <span className="sr-only">
              {s.state === "done" ? "（完了）" : s.state === "current" ? "（現在）" : s.state === "none" ? "（該当なし）" : "（これから）"}
            </span>
          </li>
        );
      })}
      {transferred && <li className="sr-only">振込確認のデモ操作済み</li>}
    </ol>
  );
}

function StageList() {
  return (
    <ol className="flex flex-col rounded-xl border border-border bg-surface px-4 py-1" aria-label="回収金の段階">
      {recoveryStages.map((s, i) => {
        const Icon = stageIcon[s.state];
        return (
          <li
            key={s.label}
            aria-current={s.state === "current" ? "step" : undefined}
            className={cn(
              "flex items-center gap-2.5 py-2.5",
              i < recoveryStages.length - 1 && "border-b border-border",
            )}
          >
            <Icon
              className={cn(
                "size-[18px] shrink-0",
                s.state === "done" ? "text-green" : s.state === "current" ? "text-amber" : "text-text-muted",
              )}
              aria-hidden
            />
            <span
              className={cn(
                "w-20 shrink-0 text-sm",
                s.state === "current" ? "font-bold text-amber" : "font-medium text-text",
              )}
            >
              {s.label}
            </span>
            <span className="min-w-0 flex-1 text-[13px] text-text-muted">{s.date}</span>
          </li>
        );
      })}
    </ol>
  );
}

function RecoveryRows({ compact }: { compact?: boolean }) {
  return (
    <div className="flex flex-col">
      <CostRow label={compact ? "実回収額（あなた分）" : "あなた分の実回収額"} value="5,000円" />
      <CostRow
        label={compact ? "報酬（税込・20%）" : "契約済みの報酬（税込・回収額の20%）"}
        value="− 1,000円"
      />
      <CostRow
        label="未精算の実費"
        note={compact ? undefined : "郵送費・通信費（証憑あり）"}
        value="− 100円"
      />
      <CostRow label="既払額" note={compact ? undefined : "これまでに受け取った回収金"} value="0円" />
      <CostRow label="今回の振込額" total value={<span className="text-xl">3,900円</span>} last />
    </div>
  );
}

function ObjectionForm({
  text,
  setText,
  error,
  onCancel,
  onSubmit,
}: {
  text: string;
  setText: (v: string) => void;
  error?: string;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-3 rounded-[10px] border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <TextArea
        label="異議の内容"
        required
        hint="金額・控除・振込先など、誤りと思われる点を書く操作例です。このデモでは内容を送信しません。"
        value={text}
        maxLength={400}
        error={error}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          やめる
        </Button>
        <Button type="submit" icon={MessageSquareWarning}>
          異議を送信する（デモ）
        </Button>
      </div>
    </form>
  );
}

/* ---------- 画面本体 ---------- */

export function SettlementView() {
  const [tab, setTab] = useState<Tab>("refund");
  const [claim, setClaim] = useState<Claim>("ready");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [transferConfirmed, setTransferConfirmed] = useState(false);
  const [objection, setObjection] = useState<Objection>("closed");
  const [objectionText, setObjectionText] = useState("");
  const [objectionError, setObjectionError] = useState<string>();

  const openClaim = () => setDialogOpen(true);

  const submitObjection = () => {
    if (!objectionText.trim()) {
      setObjectionError("異議の内容を入力してください");
      return;
    }
    setObjectionError(undefined);
    setObjection("sent");
  };

  const objectionForm =
    objection === "open" ? (
      <ObjectionForm
        text={objectionText}
        setText={setObjectionText}
        error={objectionError}
        onCancel={() => setObjection("closed")}
        onSubmit={submitObjection}
      />
    ) : objection === "sent" ? (
      <Callout icon={MessageSquareWarning} tone="amber" title="異議のデモ操作を記録しました">
        <p>入力内容は送信されず、弁護士からの回答や通知もありません。</p>
      </Callout>
    ) : null;

  const transferNote = transferConfirmed ? (
    <Callout icon={CircleCheck} tone="green">
      <p>振込確認のデモ操作を記録しました。実際の入金確認や振込予定日の変更はありません。</p>
    </Callout>
  ) : null;

  const nextDesktop =
    claim === "claimed"
      ? "返金請求のデモ操作済みです。回収金の精算表示例を確認できます。"
      : "返金請求の操作例を確認できます。回収金の精算表示例もあります。";

  return (
    <>
      <PageBody>
        {/* デスクトップの見出し */}
        <div className="hidden md:block">
          <PageHeader
            eyebrow="お金の記録"
            title="あなたの返金・受取りの精算"
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
          <p>金額・日付・口座情報は表示例です。返金請求・異議送信・振込確認を操作しても、実際の送金や通知は行われません。</p>
        </Callout>

        <div className="hidden md:block">
          <StageBanner stage="返金請求・回収金の精算（表示例）" next={nextDesktop} />
        </div>

        {/* ===== モバイル（M_D03 / M_D03b） ===== */}
        <div className="flex flex-col gap-4 md:hidden">
          {tab === "refund" && (
            <section className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4" aria-label="現在の段階と次にすること">
              <p className="text-xs text-text-muted">現在の段階</p>
              <p className="text-base font-bold text-text">返金請求・回収金の精算（表示例）</p>
              <p className="flex items-center gap-1.5 pt-1 text-xs font-bold text-primary-dark">
                <CircleArrowRight className="size-4" aria-hidden />
                次にすること
              </p>
              <p className="text-sm text-text">
                {claim === "claimed"
                  ? "返金請求のデモ操作済みです。"
                  : "返金請求の操作例を確認できます。"}
              </p>
            </section>
          )}

          <Segmented<Tab>
            label="精算の種類"
            fill
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { key: "refund", label: "相談費などの返金" },
              { key: "recovery", label: "回収金の受取り" },
            ]}
          />

          {tab === "refund" ? (
            <>
              <section className="flex flex-col gap-1 rounded-xl border border-border bg-surface px-4 pt-4 pb-2">
                <h2 className="text-lg font-bold text-text">相談費などの返金</h2>
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
              <section className="flex flex-col gap-2 rounded-xl border border-border bg-[#F4F6F9] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-text">回収金の受取り</h2>
                  <Badge tone="amber" icon={Clock3}>
                    精算中
                  </Badge>
                </div>
                <p className="text-sm text-text-sub">
                  〔架空の別シナリオ〕今回の振込額 3,900円・最終的な収支 ＋3,300円。振込前に内容を確認できます。
                </p>
                <div>
                  <Button
                    variant="text"
                    onClick={() => {
                      setTab("recovery");
                      window.scrollTo({ top: 0 });
                    }}
                  >
                    回収金の内訳を見る
                  </Button>
                </div>
              </section>
              <MobileCtaBar>
                <ClaimButton claim={claim} onClick={openClaim} label="返金請求のデモを試す" />
              </MobileCtaBar>
            </>
          ) : (
            <>
              <p className="text-xs text-text-muted">
                対象：〔架空〕オンライン英会話の件（架空の別シナリオ・円での精算）
              </p>
              <StageList />
              <section className="rounded-xl border border-border bg-surface px-4 py-2" aria-label="回収金の内訳">
                <RecoveryRows compact />
              </section>
              <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#F4F6F9] px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-text">最終的な収支</span>
                  <span className="text-xs text-text-muted">既払い相談費600円を差し引き</span>
                </div>
                <span className="tabular text-[22px] font-bold text-green">＋3,300円</span>
              </div>
              <dl className="flex flex-col rounded-xl border border-border bg-surface px-4 py-1">
                <KVRow label="振込先" labelClassName="sm:w-[84px]">
                  〇〇銀行 普通 ****1234
                </KVRow>
                <KVRow label="送金の担当" labelClassName="sm:w-[84px]" last>
                  弁護士A〔架空〕（預り金口座から円で振込）
                </KVRow>
              </dl>
              <p className="text-[13px] text-text-muted">
                銀行振込は依頼先の弁護士が行います。ブロックチェーン上の仕組みが銀行口座を操作することはありません。
              </p>
              {transferNote}
              {objectionForm}
              <MobileCtaBar>
                <Button
                  variant="secondary"
                  icon={transferConfirmed ? CircleCheck : Check}
                  disabled={transferConfirmed}
                  onClick={() => setTransferConfirmed(true)}
                  className="w-full"
                >
                  {transferConfirmed ? "振込確認のデモ操作済み" : "振込確認を試す（デモ）"}
                </Button>
                <Button
                  variant="text"
                  className="self-center"
                  disabled={objection === "sent"}
                  onClick={() => setObjection("open")}
                >
                  {objection === "sent" ? "異議のデモ操作済み" : "異議送信を試す（デモ）"}
                </Button>
              </MobileCtaBar>
            </>
          )}
        </div>

        {/* ===== デスクトップ（D03） ===== */}
        <div className="hidden gap-6 md:grid xl:grid-cols-2 xl:items-start">
          <section
            aria-labelledby="refund-title"
            className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-7"
          >
            <div className="flex items-center gap-3">
              <IconWrap icon={Undo2} />
              <div className="flex min-w-0 flex-col">
                <h2 id="refund-title" className="text-xl font-bold text-text">
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

          <section
            aria-labelledby="recovery-title"
            className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-7"
          >
            <div className="flex items-center gap-3">
              <IconWrap icon={Landmark} className="bg-neutral-soft text-text-sub" />
              <div className="flex min-w-0 flex-col">
                <h2 id="recovery-title" className="text-xl font-bold text-text">
                  賠償金・和解金の受取り
                </h2>
                <p className="text-[13px] text-text-muted">
                  対象：〔架空〕オンライン英会話の件（架空の別シナリオ・円での精算）
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <StageStrip transferred={transferConfirmed} />
              <p className="text-[13px] text-text-muted">
                和解金は2027年6月10日に全額入金されたため、「一部入金」はありません。和解の成立だけでは、受取済みにはなりません。
              </p>
            </div>
            <RecoveryRows />
            <div className="flex flex-col gap-1.5 rounded-[10px] bg-[#F4F6F9] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-bold text-text">最終的な収支</span>
                <span className="tabular text-[22px] font-bold text-green">＋3,300円</span>
              </div>
              <p className="text-[13px] text-text-muted">
                今回の振込額 3,900円 − 既払いの相談費 600円（その他の費用・返金なし）
              </p>
            </div>
            <dl className="flex flex-col">
              <KVRow label="振込先" labelClassName="md:w-[120px]">
                〇〇銀行 △△支店 普通 ****1234（マスク表示）
              </KVRow>
              <KVRow label="振込予定日" labelClassName="md:w-[120px]">
                2027年6月24日（確認期間の終了後）
              </KVRow>
              <KVRow label="精算・送金の担当" labelClassName="md:w-[120px]" last>
                弁護士A〔架空〕法律事務所（預り金口座から円で振込）
              </KVRow>
            </dl>
            <Callout icon={Info} tone="neutral">
              <p>
                円での回収と銀行振込は、依頼先の弁護士が行います。ブロックチェーン上の仕組みが銀行口座を操作することはありません。
              </p>
            </Callout>
            {transferNote}
            {objectionForm}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                icon={transferConfirmed ? CircleCheck : Check}
                disabled={transferConfirmed}
                onClick={() => setTransferConfirmed(true)}
              >
                {transferConfirmed ? "振込確認のデモ操作済み" : "振込確認を試す（デモ）"}
              </Button>
              <Button variant="text" disabled={objection === "sent"} onClick={() => setObjection("open")}>
                {objection === "sent" ? "異議のデモ操作済み" : "異議送信を試す（デモ）"}
              </Button>
            </div>
          </section>
        </div>
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
        <CostRow label="返金額の例（手数料未反映）" total value={RECEIVE}  last />
      </ConfirmDialog>
    </>
  );
}
