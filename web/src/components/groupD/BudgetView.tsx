"use client";

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CirclePause,
  Clock3,
  FileClock,
  Info,
  Lock,
  LockKeyhole,
  MessageSquareWarning,
  Scale,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Callout,
  ConfirmDialog,
  CostRow,
  StageBanner,
  StatePanel,
  TextArea,
  type BadgeTone,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { consultationBudget, formatYen, recruitmentStats } from "@/lib/demo";
import { BulletItem, IconWrap, PageBody, PageHeader } from "./parts";
import { Segmented } from "./Segmented";

type Ledger = "consult" | "litigation";
type Role = "reviewer" | "participant";
/** 初期調査の支払いの状態（デモ切替） */
type PayState = "normal" | "unmet" | "dispute" | "paused" | "expired";

type BadgeSpec = { tone: BadgeTone; icon: LucideIcon; label: string };
type FlowStep = {
  title: string;
  badge: BadgeSpec;
  lines: string[];
  highlight?: "amber" | "red";
};

const GOAL = recruitmentStats.goalYen;
const CONSULTATION = consultationBudget[0].yen;
const RESEARCH = consultationBudget[1].yen;
const MATERIALS = consultationBudget[2].yen;
const RESERVE = consultationBudget[3].yen;

const stopStates: {
  key: Exclude<PayState, "normal" | "expired">;
  badge: BadgeSpec;
  body: string;
  link: string;
}[] = [
  {
    key: "unmet",
    badge: { tone: "red", icon: CircleAlert, label: "条件未達" },
    body: "報告書が未提出のため、初期調査の支払条件を満たしていません。受取先に提出を依頼しています。",
    link: "不足している条件を見る",
  },
  {
    key: "dispute",
    badge: { tone: "amber", icon: Clock3, label: "異議確認中" },
    body: "拠出者から「調査範囲が契約と異なる」との異議が出ています。裁定担当の裁定が確定するまで支払いは保留されます。",
    link: "異議の内容と回答を見る",
  },
  {
    key: "paused",
    badge: { tone: "red", icon: CirclePause, label: "期限付き停止" },
    body: "この表示例では、異議確認のため2027年2月3日から7日間停止します。停止で精算期限は延長されません。",
    link: "停止の理由と期限を見る",
  },
];

function SpecBadge({ spec }: { spec: BadgeSpec }) {
  return (
    <Badge tone={spec.tone} icon={spec.icon}>
      {spec.label}
    </Badge>
  );
}

/* ---------- 支払いの根拠：契約条件 → 請求 → 確認 → 支払い ---------- */

function Flow({ steps }: { steps: FlowStep[] }) {
  return (
    <ol className="flex flex-col items-stretch gap-2 xl:flex-row xl:items-center">
      {steps.map((s, i) => (
        <Fragment key={s.title}>
          {i > 0 && (
            <li aria-hidden className="flex justify-center text-text-muted">
              <ArrowDown className="size-[18px] xl:hidden" />
              <ArrowRight className="hidden size-[18px] xl:block" />
            </li>
          )}
          <li
            className={cn(
              "flex flex-1 flex-col items-start gap-1.5 self-stretch rounded-[10px] border bg-surface p-4",
              s.highlight === "amber"
                ? "border-amber-line"
                : s.highlight === "red"
                  ? "border-red"
                  : "border-border",
            )}
          >
            <div className="flex w-full items-center gap-2">
              <span className="text-[13px] font-bold text-text-muted">{i + 1}</span>
              <span className="text-base font-bold text-text">{s.title}</span>
            </div>
            <SpecBadge spec={s.badge} />
            {s.lines.map((l) => (
              <p key={l} className="text-[13px] text-text-sub">
                {l}
              </p>
            ))}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

/* ---------- 支出の一覧の1行（xl以上は表、未満はカード） ---------- */

type SpendRow = {
  key: string;
  title: string;
  desc: string;
  payee: string;
  payeeSub: string;
  limit: string;
  amount: string;
  amountSub: string;
  condition: string;
  status: BadgeSpec;
  statusSub?: string;
  /** 行の詳細を開く操作の見た目 */
  toggle: "icon" | "history";
  highlight?: boolean;
  detail: ReactNode;
};

const gridCols =
  "xl:grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.5fr)_minmax(0,0.5fr)_minmax(0,1.1fr)_minmax(0,1fr)_72px] xl:items-center xl:gap-4";

function Money({ value, sub }: { value: string; sub: string }) {
  return (
    <span className="flex flex-col xl:items-end">
      <span className="tabular text-[15px] text-text">{value}</span>
      <span className="text-[13px] text-text-muted">{sub}</span>
    </span>
  );
}

function RowToggle({
  row,
  open,
  onToggle,
  controls,
}: {
  row: SpendRow;
  open: boolean;
  onToggle: () => void;
  controls: string;
}) {
  if (row.toggle === "icon") {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={controls}
        aria-label={open ? `${row.title}の支払いの根拠を閉じる` : `${row.title}の支払いの根拠を開く`}
        className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary-dark hover:bg-[#d4ebed]"
      >
        {open ? <ChevronUp className="size-5" aria-hidden /> : <ChevronDown className="size-5" aria-hidden />}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`${row.title}の履歴${open ? "を閉じる" : "を開く"}`}
      className="inline-flex h-11 shrink-0 items-center gap-1.5 text-base font-medium text-primary-dark hover:underline"
    >
      履歴
      <ChevronRight className={cn("size-[18px] transition-transform", open && "rotate-90")} aria-hidden />
    </button>
  );
}

function LedgerRow({
  row,
  open,
  onToggle,
  last,
}: {
  row: SpendRow;
  open: boolean;
  onToggle: () => void;
  last: boolean;
}) {
  const detailId = `spend-detail-${row.key}`;
  return (
    <div
      id={`spend-row-${row.key}`}
      className={cn(
        "scroll-mt-20",
        !last && "border-b border-border",
        (row.highlight || open) && "bg-[#FBFEFE]",
      )}
    >
      {/* xl 以上：表の行 */}
      <div className={cn("hidden px-5 py-4", gridCols)}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-bold text-text">{row.title}</span>
          <span className="text-[13px] text-text-muted">{row.desc}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] text-text">{row.payee}</span>
          <span className="text-[13px] text-text-muted">{row.payeeSub}</span>
        </div>
        <Money value={row.limit} sub="円" />
        <Money value={row.amount} sub={row.amountSub} />
        <span className="text-[15px] text-text">{row.condition}</span>
        <div className="flex min-w-0 flex-col items-start gap-0.5">
          <SpecBadge spec={row.status} />
          {row.statusSub && <span className="text-[13px] text-text-muted">{row.statusSub}</span>}
        </div>
        <div>
          <RowToggle row={row} open={open} onToggle={onToggle} controls={detailId} />
        </div>
      </div>

      {/* xl 未満：カード */}
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 xl:hidden">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-base font-bold text-text">{row.title}</span>
            <span className="text-[13px] text-text-muted">{row.desc}</span>
          </div>
          <RowToggle row={row} open={open} onToggle={onToggle} controls={detailId} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <SpecBadge spec={row.status} />
          {row.statusSub && <span className="text-[13px] text-text-muted">{row.statusSub}</span>}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-[10px] bg-[#F4F6F9] px-3.5 py-3">
          <div className="col-span-2 flex flex-col">
            <dt className="text-xs font-bold text-text-sub">受取先</dt>
            <dd className="text-[15px] text-text">
              {row.payee}
              <span className="ml-2 text-[13px] text-text-muted">{row.payeeSub}</span>
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs font-bold text-text-sub">上限</dt>
            <dd className="tabular text-[15px] text-text">{row.limit} 円</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs font-bold text-text-sub">金額</dt>
            <dd className="tabular text-[15px] text-text">
              {row.amount}
              <span className="ml-1 text-[13px] text-text-muted">{row.amountSub}</span>
            </dd>
          </div>
          <div className="col-span-2 flex flex-col">
            <dt className="text-xs font-bold text-text-sub">支払条件</dt>
            <dd className="text-[15px] text-text">{row.condition}</dd>
          </div>
        </dl>
      </div>

      <div id={detailId} hidden={!open} className="border-t border-border px-4 pt-4 pb-5 sm:px-5 xl:border-t-0 xl:pt-1 xl:pb-6">
        {row.detail}
      </div>
    </div>
  );
}

/* ---------- 画面本体 ---------- */

export function BudgetView() {
  const [ledger, setLedger] = useState<Ledger>("consult");
  const [role, setRole] = useState<Role>("reviewer");
  const [payState, setPayState] = useState<PayState>("normal");
  const [paid, setPaid] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ research: true });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [objectionOpen, setObjectionOpen] = useState(false);
  const [objection, setObjection] = useState("");
  const [objectionError, setObjectionError] = useState<string>();

  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  const expired = !paid && payState === "expired";
  const paidTotal = CONSULTATION + (paid ? RESEARCH : 0);
  const committed = paid || expired ? 0 : RESEARCH;
  const free = GOAL - paidTotal - committed;
  const pct = (n: number) => Math.round((n / GOAL) * 100);
  const n = (v: number) => v.toLocaleString("ja-JP");

  const stateActive = !paid && payState !== "normal";

  /* 次にすること */
  let next: string;
  if (paid) {
    next = "支払い完了状態のデモ表示です。実際の送金や取引記録はありません。";
  } else if (expired) {
    next = `精算期限（2027年2月17日）後の期限切れ処理が完了した表示例です。初期調査の上限 ${formatYen(RESEARCH)}の拘束を解除し、返金原資は合計 ${formatYen(free)}です。返金は各拠出者が別途請求します。`;
  } else if (payState === "unmet") {
    next = "初期調査の報告書が未提出のため、支払条件を満たしていません。報告書が提出されるまで支払いは行われません。";
  } else if (payState === "dispute") {
    next = "初期調査の請求に拠出者から異議が出ています。裁定担当の結論が確定するまで支払いは保留されます。2月17日の精算期限後、期限切れ処理が完了すると未払い上限が返金原資へ戻り、拠出者は別途返金を請求できます。";
  } else if (payState === "paused") {
    next = "この表示例では、異議確認のため2027年2月3日から7日間、初期調査の支払いを停止します。停止で精算期限は延長されません。";
  } else if (role === "reviewer") {
    next =
      `初期調査の請求（${formatYen(RESEARCH)}）が届いています。報告書を確認し、履行を確認してください。確認が揃うまで支払いは行われません。`;
  } else {
    next =
      `初期調査の請求（${formatYen(RESEARCH)}）が届き、支出確認担当が報告書を確認しています。確認が揃うまで支払いは行われません。`;
  }

  /* 初期調査の行の状態 */
  const researchStatus: { badge: BadgeSpec; sub: string } = paid
    ? { badge: { tone: "green", icon: CircleCheck, label: "支払済み" }, sub: "確認 2／2" }
    : expired
      ? { badge: { tone: "neutral", icon: CalendarClock, label: "期限切れ" }, sub: `上限 ${formatYen(RESEARCH)}の拘束を解除済み` }
    : payState === "unmet"
      ? { badge: { tone: "red", icon: CircleAlert, label: "条件未達" }, sub: "報告書が未提出" }
      : payState === "dispute"
        ? { badge: { tone: "amber", icon: Clock3, label: "異議確認中" }, sub: "履行確認 1／2・支払い停止中" }
        : payState === "paused"
          ? { badge: { tone: "red", icon: CirclePause, label: "期限付き停止" }, sub: "2月3日〜10日（7日間）" }
          : { badge: { tone: "amber", icon: Clock3, label: "確認待ち" }, sub: "履行確認 1／2" };

  const researchSteps: FlowStep[] = [
    {
      title: "契約条件",
      badge: { tone: "green", icon: CircleCheck, label: "確認済み" },
      lines: ["2027年1月10日 契約", `上限 ${formatYen(RESEARCH)}・報告書の提出後に支払い`],
    },
    payState === "unmet" && !paid
      ? {
          title: "請求",
          badge: { tone: "red", icon: CircleAlert, label: "報告書が未提出" },
          lines: [`2027年2月3日 請求 ${formatYen(RESEARCH)}`, "調査報告書の提出待ち"],
          highlight: "red",
        }
      : {
          title: "請求",
          badge: { tone: "green", icon: CircleCheck, label: "受領" },
          lines: [`2027年2月3日 請求 ${formatYen(RESEARCH)}`, "調査報告書を添付"],
        },
    paid
      ? {
          title: "確認",
          badge: { tone: "green", icon: CircleCheck, label: "確認済み 2／2" },
          lines: ["支出確認担当2名が確認"],
        }
      : expired
        ? {
            title: "確認",
            badge: { tone: "neutral", icon: CalendarClock, label: "受付終了" },
            lines: ["精算期限までに確認が揃わず終了", "この請求の履行確認・支払いはできません"],
          }
      : payState === "unmet"
        ? {
            title: "確認",
            badge: { tone: "neutral", icon: CircleDashed, label: "確認できません" },
            lines: ["報告書の提出後に確認できます"],
          }
        : payState === "dispute"
          ? {
              title: "確認",
              badge: { tone: "amber", icon: Clock3, label: "異議確認中" },
              lines: ["支出確認担当2名のうち1名が確認", "裁定担当の結論が確定するまで確認・支払いは保留"],
              highlight: "amber",
            }
          : payState === "paused"
            ? {
                title: "確認",
                badge: { tone: "red", icon: CirclePause, label: "期限付き停止" },
                lines: ["支出確認担当2名のうち1名が確認", "2月3日〜10日停止（7日間、精算期限は延長されません）"],
                highlight: "red",
              }
            : {
                title: "確認",
                badge: { tone: "amber", icon: Clock3, label: "確認待ち 1／2" },
                lines: [
                  "支出確認担当2名のうち1名が確認",
                  role === "reviewer" ? "あなたの確認が未了です" : "残り1名の確認を待っています",
                ],
                highlight: "amber",
              },
    paid
      ? {
          title: "支払い",
          badge: { tone: "green", icon: CircleCheck, label: "支払済み" },
          lines: ["確認が揃った後の支払い状態（デモ）", `弁護士A〔架空〕法律事務所へ ${formatYen(RESEARCH)}`],
        }
      : expired
        ? {
            title: "期限切れ処理",
            badge: { tone: "neutral", icon: CalendarClock, label: "拘束解除済み" },
            lines: ["精算期限後の処理完了（デモ）", `未払い上限 ${formatYen(RESEARCH)}を返金原資へ戻しました`, "返金の送金は各拠出者の請求後に行われます"],
          }
      : {
          title: "支払い",
          badge: { tone: "neutral", icon: CircleDashed, label: "未実行" },
          lines:
            payState === "normal"
              ? ["2名の確認後、3日間の支払待機期間を経て実行可能（デモ設定）", "未払い請求は精算期限まで異議申立て可能。支払実行には別途決済処理が必要", "精算期限：2027年2月17日（表示例）"]
              : ["条件未達・異議・停止中は実行できません", "精算期限：2027年2月17日（表示例）。期限後、期限切れ処理が完了すると未払い上限が返金原資へ戻り、返金は本人が別途請求します"],
        },
  ];

  const lawSteps: FlowStep[] = [
    {
      title: "契約条件",
      badge: { tone: "green", icon: CircleCheck, label: "確認済み" },
      lines: ["2027年1月10日 契約", `上限 ${formatYen(CONSULTATION)}・相談の実施と結果の共有後に支払い`],
    },
    {
      title: "請求",
      badge: { tone: "green", icon: CircleCheck, label: "受領" },
      lines: [`2027年1月21日 請求 ${formatYen(CONSULTATION)}`, "相談の実施記録・結果の共有を添付"],
    },
    {
      title: "確認",
      badge: { tone: "green", icon: CircleCheck, label: "確認済み 2／2" },
      lines: ["支出確認担当2名が確認"],
    },
    {
      title: "支払い",
      badge: { tone: "green", icon: CircleCheck, label: "支払済み" },
      lines: ["2027年1月28日 支払い状態（デモ）"],
    },
  ];

  const noRecord = (
    <p className="text-sm text-text-sub">
      {expired
        ? "契約・請求がないまま終了しました。未使用額は返金原資に含まれます。新たな契約登録・支払いはできません。"
        : "まだ契約・請求がないため、支払いの記録はありません。支払いは、契約後に設定される条件と費目の上限の範囲でのみ行われます。"}
    </p>
  );

  const canConfirm = !paid && payState === "normal";

  const reviewerPanel =
    expired ? (
      <Callout icon={CalendarClock} tone="neutral" title="期限切れ処理済み（デモ）">
        <p>この請求の履行確認・異議申立て・支払いは終了しました。拘束の解除だけでは返金は送金されません。各拠出者が本人の返金を別途請求します。</p>
      </Callout>
    ) : role === "reviewer" ? (
      <div className="flex flex-col gap-4 rounded-[10px] bg-primary-soft p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 text-base font-bold text-primary-dark">
            <UserCheck className="size-[18px]" aria-hidden />
            支出確認担当の操作
          </p>
          <p className="text-sm text-text">
            この操作は、この募集で選任された支出確認担当にだけ表示されます（このデモでは2名の確認が必要な設定）。報告書が契約条件を満たすかを確認してください。
          </p>
        </div>
        {paid ? (
          <Callout icon={CircleCheck} tone="green" title="履行確認済み状態のデモ" className="bg-surface">
            <p>支払済み状態のデモ表示です。実際の送金や取引記録はありません。</p>
          </Callout>
        ) : (
          <>
            {!canConfirm && (
              <Callout icon={CircleAlert} tone="amber" className="bg-surface">
                <p>
                  {payState === "unmet"
                    ? "報告書が未提出のため、履行を確認できません。"
                    : payState === "dispute"
                      ? "裁定担当の結論が確定するまで、履行確認と支払いは保留されています。"
                      : "この表示例では、異議確認のため2月3日から7日間停止します。精算期限は延長されません。"}
                </p>
              </Callout>
            )}
            {objectionOpen && (
              <form
                className="flex flex-col gap-3 rounded-[10px] bg-surface p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!objection.trim()) {
                    setObjectionError("不明点・異議の内容を入力してください");
                    return;
                  }
                  setObjectionError(undefined);
                  setObjectionOpen(false);
                  setObjection("");
                  setPayState("dispute");
                }}
              >
                <TextArea
                  label="不明点・異議の内容"
                  required
                  hint="異議状態のデモ表示です。実際の通知や審議記録への保存は行われません。"
                  value={objection}
                  maxLength={400}
                  error={objectionError}
                  onChange={(e) => setObjection(e.target.value)}
                />
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={() => setObjectionOpen(false)}>
                    やめる
                  </Button>
                  <Button type="submit" icon={MessageSquareWarning}>
                    デモで異議を記録
                  </Button>
                </div>
              </form>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              {!objectionOpen && payState === "normal" && (
                <Button variant="secondary" icon={MessageSquareWarning} onClick={() => setObjectionOpen(true)}>
                  不明点・異議のデモを試す
                </Button>
              )}
              <Button icon={Check} disabled={!canConfirm} onClick={() => setDialogOpen(true)}>
                履行確認のデモを試す
              </Button>
            </div>
          </>
        )}
      </div>
    ) : (
      <Callout icon={Users} tone="neutral">
        <p>
          支出確認の操作は、この募集で選任された支出確認担当にだけ表示されます。気になる点は、審議記録から質問・意見を投稿できます。
        </p>
      </Callout>
    );

  const rows: SpendRow[] = [
    {
      key: "law",
      title: "法律相談",
      desc: "共同相談 2回・結果の共有",
      payee: "弁護士A",
      payeeSub: "〔架空〕法律事務所",
      limit: n(CONSULTATION),
      amount: n(CONSULTATION),
      amountSub: "円",
      condition: "相談の実施と結果の共有後",
      status: { tone: "green", icon: CircleCheck, label: "支払済み" },
      statusSub: "確認 2／2・2027年1月28日",
      toggle: "history",
      detail: (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] font-bold text-text">支払いの根拠：契約条件 → 請求 → 確認 → 支払い</p>
          <Flow steps={lawSteps} />
        </div>
      ),
    },
    {
      key: "research",
      title: "初期調査",
      desc: "公表資料・通知内容の調査",
      payee: "弁護士A",
      payeeSub: "〔架空〕法律事務所",
      limit: n(RESEARCH),
      amount: n(RESEARCH),
      amountSub: expired ? "円（旧請求額）" : "円",
      condition: "調査報告書の提出後",
      status: researchStatus.badge,
      statusSub: researchStatus.sub,
      toggle: "icon",
      highlight: true,
      detail: (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] font-bold text-text">支払いの根拠：契約条件 → 請求 → 確認 → 支払い</p>
          <Flow steps={researchSteps} />
          {reviewerPanel}
        </div>
      ),
    },
    {
      key: "docs",
      title: "資料整理",
      desc: "参加者資料の整理・匿名化",
      payee: "未契約",
      payeeSub: "提案の採択後に決定",
      limit: n(MATERIALS),
      amount: "—",
      amountSub: "未拘束",
      condition: "契約後に設定",
      status: { tone: "neutral", icon: CircleDashed, label: "未契約" },
      toggle: "history",
      detail: noRecord,
    },
    {
      key: "reserve",
      title: "決済等の予備費",
      desc: "送金手数料などの実費",
      payee: "手数料の支払先",
      payeeSub: "決済・振込手数料等",
      limit: n(RESERVE),
      amount: "0",
      amountSub: "未拘束",
      condition: "実費のみ・上限内",
      status: { tone: "neutral", icon: CircleDashed, label: "未使用" },
      toggle: "history",
      detail: noRecord,
    },
  ];

  const showState = (key: PayState) => {
    setPaid(false);
    setPayState(key);
    setObjectionOpen(false);
    setObjection("");
    setObjectionError(undefined);
    setOpen((o) => ({ ...o, research: true }));
    requestAnimationFrame(() =>
      document.getElementById("spend-row-research")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  return (
    <PageBody>
      <PageHeader
        eyebrow="お金の記録 ／ 法人会員・利用者の共同相談"
        title="共同資金の予算・支出"
        right={
          <>
            <Badge tone="neutral" icon={CalendarClock}>
              別時点のデモ（相談実施後の想定）
            </Badge>
            {role === "reviewer" ? (
              <Badge tone="primary" icon={UserCheck}>
                あなたの役割：支出確認担当
              </Badge>
            ) : (
              <Badge tone="neutral" icon={Users}>
                あなたの役割：参加者（確認担当ではない）
              </Badge>
            )}
          </>
        }
      />

      <Callout icon={Info} tone="neutral" title="予算・支出画面のデモ">
        <p>金額・契約・請求は固定シナリオです。役割や状態の切替、履行確認を操作しても、実際の送金・取引記録・異議通知は発生しません。</p>
        <p>円建ての表示例です。資金を保管・送金する事業者、担当者の選任、決定条件は募集開始前に確定します。</p>
      </Callout>

      {/* デモ用の切替（実際のサービスには表示しない） */}
      <section
        aria-label="デモ用の表示切替"
        className="flex flex-col gap-3 rounded-xl border border-dashed border-border-strong bg-neutral-soft px-4 py-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6"
      >
        <p className="text-[13px] font-bold text-text-sub">デモ用の表示切替</p>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-[13px] text-text-muted">あなたの役割</span>
          <Segmented<Role>
            label="あなたの役割"
            size="sm"
            value={role}
            onChange={setRole}
            options={[
              { key: "reviewer", label: "支出確認担当" },
              { key: "participant", label: "一般の参加者" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-[13px] text-text-muted">初期調査の状態</span>
          <Segmented<PayState>
            label="初期調査の状態"
            size="sm"
            value={paid ? "normal" : payState}
            onChange={(k) => {
              setPaid(false);
              setPayState(k);
              setObjectionOpen(false);
              setObjection("");
              setObjectionError(undefined);
            }}
            options={[
              { key: "normal", label: "確認待ち" },
              { key: "unmet", label: "条件未達" },
              { key: "dispute", label: "異議確認中" },
              { key: "paused", label: "期限付き停止" },
              { key: "expired", label: "期限切れ" },
            ]}
          />
        </div>
      </section>

      <StageBanner stage={expired ? "共同相談を終了・返金受付（段階5／5）" : "共同相談を実施中（段階4／5）"} next={<span aria-live="polite">{next}</span>} />

      <Segmented<Ledger>
        label="会計の切替"
        value={ledger}
        onChange={setLedger}
        className="max-sm:w-full"
        options={[
          { key: "consult", label: "共同相談費の会計" },
          { key: "litigation", label: "訴訟費用の会計", sub: "未開始・別会計" },
        ]}
      />

      {ledger === "litigation" ? (
        <StatePanel
          icon={Scale}
          tone="neutral"
          title="訴訟費用の会計は、まだ開始していません"
          action={
            <Button variant="secondary" onClick={() => setLedger("consult")}>
              共同相談費の会計に戻る
            </Button>
          }
        >
          <p>
            訴訟費用は、共同相談費とは別の会計で管理します。訴訟への正式依頼は相談後に本人が決め、依頼した人の間で支払条件（使途・確認者・返金条件）が設定されるまで、入金は受け付けません。
          </p>
        </StatePanel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <Metric icon={ArrowDownToLine} iconClass="text-text" label="入金合計" yen={GOAL} />
            <Metric icon={CircleCheck} iconClass="text-green" label="支払済み" yen={paidTotal} />
            <Metric
              icon={FileClock}
              iconClass="text-amber"
              label="未払いの契約済み費用"
              yen={committed}
              suffix={committed > 0 ? "・支払条件待ち" : undefined}
            />
            <Metric icon={Wallet} iconClass="text-primary-dark" label={expired ? "返金原資（未請求）" : "未拘束残高"} yen={free} />
          </div>

          <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-5 md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:justify-between md:gap-4">
              <h2 className="text-[15px] font-bold text-text">予算の使われ方（目標 300,000円 に対する割合）</h2>
              <p className="text-[13px] text-text-muted">{expired ? "返金原資は拠出額に応じて按分。返金は本人が別途請求します" : "未拘束残高の全額が、すぐに返金できるとは限りません"}</p>
            </div>
            <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-lg" aria-hidden>
              <div className="h-full bg-primary transition-all" style={{ width: `${pct(paidTotal)}%` }} />
              {committed > 0 && (
                <div className="h-full bg-amber-line transition-all" style={{ width: `${pct(committed)}%` }} />
              )}
              <div className="h-full flex-1 bg-[#C9D3DE]" />
            </div>
            <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-7">
              <Legend swatch="bg-primary" label={`支払済み ${n(paidTotal)}（${pct(paidTotal)}%）`} />
              <Legend swatch="bg-amber-line" label={`契約済み・未払い ${n(committed)}（${pct(committed)}%）`} />
              <Legend swatch="bg-[#C9D3DE]" label={`${expired ? "返金原資" : "未拘束"} ${n(free)}（${pct(free)}%）`} />
            </ul>
          </section>

          <section aria-labelledby="spend-list" className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-0.5">
              <h2 id="spend-list" className="text-xl font-bold text-text">
                支出の一覧
              </h2>
              <p className="text-sm text-text-muted">
                支払いは、契約済みの受取先と費目の上限の範囲でのみ行われます。円の決済基盤との接続時にも、採択した支払先と条件を確認する設計です。
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div
                className={cn(
                  "hidden border-b border-border bg-[#F4F6F9] px-5 py-3 text-[13px] font-bold text-text-sub",
                  gridCols,
                )}
                aria-hidden
              >
                <span>用途</span>
                <span>受取先</span>
                <span className="text-right">上限</span>
                <span className="text-right">金額</span>
                <span>支払条件</span>
                <span>承認・履行確認</span>
                <span>履歴</span>
              </div>
              {rows.map((r, i) => (
                <LedgerRow
                  key={r.key}
                  row={r}
                  open={!!open[r.key]}
                  onToggle={() => toggle(r.key)}
                  last={i === rows.length - 1}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <section id="budget-contract-rules" className="flex flex-col gap-[18px] rounded-xl border border-border bg-surface p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 gap-3">
            <IconWrap icon={LockKeyhole} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="text-lg font-bold text-text">円払いでも、使い道と支払条件を確認できます</h2>
              <p className="text-sm text-text-sub">
                以下は支払ルールの設計案です。円の保管・送金を担う決済基盤と、ルールを強制する仕組みは未接続です。
              </p>
            </div>
          </div>
          <ButtonLink href="#budget-contract-rules-detail" variant="text" className="self-start sm:self-auto">
            検証用情報を見る
          </ButtonLink>
        </div>
        <div id="budget-contract-rules-detail" className="flex flex-col gap-4 md:flex-row md:gap-5">
          <div className="flex flex-1 flex-col gap-2.5 rounded-[10px] bg-primary-soft p-5">
            <p className="flex items-center gap-2 text-base font-bold text-primary-dark">
              <Lock className="size-[18px]" aria-hidden />
              募集開始前に確定する支払ルール
            </p>
            <ul className="flex flex-col gap-2.5 text-sm text-text">
              <BulletItem iconClassName="text-primary-dark">支払先は、契約済みとして登録された受取先に限られる</BulletItem>
              <BulletItem iconClassName="text-primary-dark">費目ごとの上限額を超えて支払えない</BulletItem>
              <BulletItem iconClassName="text-primary-dark">所定の確認が揃う前に支払われない</BulletItem>
              <BulletItem iconClassName="text-primary-dark">返金額の計算方法と、請求できる条件</BulletItem>
            </ul>
          </div>
          <div className="flex flex-1 flex-col gap-2.5 rounded-[10px] bg-[#F1F5F6] p-5">
            <p className="flex items-center gap-2 text-base font-bold text-text-sub">
              <Users className="size-[18px]" aria-hidden />
              人が確認・実行する範囲
            </p>
            <ul className="flex flex-col gap-2.5 text-sm text-text">
              <BulletItem>弁護士業務の内容・品質の評価、契約内容の交渉</BulletItem>
              <BulletItem>請求書・報告書が実態に合っているかの確認</BulletItem>
              <BulletItem>本人確認・利益相反の確認</BulletItem>
              <BulletItem>銀行口座への円での送金・受取り（担当：精算を依頼された弁護士または決済事業者）</BulletItem>
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="stop-states" className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-0.5">
          <h2 id="stop-states" className="text-xl font-bold text-text">
            支払いが止まる状態
          </h2>
          <p className="text-sm text-text-muted">
            次の状態では、確認や期限の条件が満たされるまで支払いは実行されません。
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {stopStates.map((s) => {
            const active = stateActive && payState === s.key;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex flex-col items-start gap-2.5 rounded-xl border bg-surface p-5",
                  active
                    ? s.badge.tone === "red"
                      ? "border-red"
                      : "border-amber-line"
                    : "border-border",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SpecBadge spec={s.badge} />
                  {active && <span className="text-[13px] font-bold text-text-sub">初期調査で発生中</span>}
                </div>
                <p className="text-sm text-text-sub">{s.body}</p>
                <Button variant="text" className="h-10" onClick={() => showState(s.key)}>
                  {s.link}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <ConfirmDialog
        open={dialogOpen}
        onClose={() => !confirming && setDialogOpen(false)}
        onConfirm={() => {
          setConfirming(true);
          window.setTimeout(() => {
            setConfirming(false);
            setDialogOpen(false);
            setPaid(true);
          }, 1200);
        }}
        confirming={confirming}
        icon={UserCheck}
        title="初期調査の履行確認デモを行いますか"
        description="確認済み状態を画面上で再現します。実際の報告書確認・支払い・取引記録の保存はありません。"
        confirmLabel="デモ状態を切り替える"
      >
        <CostRow label="支払い状態の表示額" value={formatYen(RESEARCH)} />
        <CostRow label="受取先（契約済み）" value="弁護士A" sub="〔架空〕法律事務所" />
        <CostRow label="確認の状況" value="1／2 → 2／2" last />
      </ConfirmDialog>
    </PageBody>
  );
}

function Metric({
  icon: Icon,
  iconClass,
  label,
  yen,
  suffix,
}: {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  yen: number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 md:p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-text-sub">
        <Icon className={cn("size-[18px] shrink-0", iconClass)} aria-hidden />
        {label}
      </p>
      <p className="tabular text-xl font-bold text-text md:text-[26px] md:leading-[1.4]">{formatYen(yen)}</p>
      <p className="tabular text-[13px] text-text-muted">
        {"日本円"}
        {suffix}
      </p>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-text-sub">
      <span className={cn("size-3 shrink-0 rounded-[3px]", swatch)} aria-hidden />
      <span className="tabular">{label}</span>
    </li>
  );
}
