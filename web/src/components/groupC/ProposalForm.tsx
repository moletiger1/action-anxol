"use client";

import {
  Calendar,
  CircleCheck,
  CircleDashed,
  Clock3,
  Eye,
  Info,
  Lock,
  PencilLine,
  Receipt,
  ReceiptText,
  Save,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useState, type ComponentProps, type ReactNode } from "react";
import { Badge, Button, Callout, ConfirmDialog, StageBanner, StatePanel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { parseYenAmount, recruitmentStats, formatYen } from "@/lib/demo";
import { NumHead, OptionCard } from "./parts";

const SCOPE_DEFAULT =
  "共同相談を2回（各90分・オンライン）実施し、漏えいした情報の範囲と法人・利用者への影響、事業者への説明の求め方、損害賠償を求める場合の選択肢と費用の目安を説明します。個別の代理交渉は含みません。";
const SCOPE_MAX = 1000;
const DRAFT_KEY = "groupC.lawyerProposal.v1";

const DOCS = [
  { key: "mail", label: "運営会社からの通知メールの写し" },
  { key: "corp", label: "法人契約の利用者であることが分かる書類" },
  { key: "log", label: "事業者とのやり取りの記録" },
];

const PAY_OPTIONS = [
  {
    key: "lump",
    title: "相談の実施と結果の共有後に一括で受け取る",
    description: "支出確認担当が履行を確認した後に支払われます",
  },
  {
    key: "split",
    title: "調査報告書の提出後と、相談の実施後に分けて受け取る",
    description: "それぞれの時点で履行確認が必要です",
  },
];

const FUTURE_OPTIONS = [
  { key: "estimate", title: "概算を提示する", description: "着手金・報酬金の考え方と概算" },
  { key: "later", title: "相談後に提示する" },
];

type Status = "editing" | "preview" | "sent";
type ProposalDraft = {
  legacyAmounts?: boolean;
  scope: string;
  fee: string;
  expense: string;
  pay: string;
  due: string;
  team: string;
  docs: Record<string, boolean>;
  future: string;
};

function readProposalDraft(): ProposalDraft | null | "unreadable" {
  let raw: string | null;
  try {
    raw = localStorage.getItem(DRAFT_KEY);
  } catch {
    return "unreadable";
  }
  if (raw === null) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return "unreadable";
    const record = value as Record<string, unknown>;
    if (typeof record.docs !== "object" || record.docs === null || Array.isArray(record.docs)) return "unreadable";
    const docs = record.docs as Record<string, unknown>;
    if (
      typeof record.scope !== "string" || record.scope.length > SCOPE_MAX ||
      typeof record.fee !== "string" || record.fee.length > 64 ||
      typeof record.expense !== "string" || record.expense.length > 64 ||
      (record.pay !== "lump" && record.pay !== "split") ||
      typeof record.due !== "string" || record.due.length > 160 ||
      typeof record.team !== "string" || record.team.length > 160 ||
      (record.future !== "estimate" && record.future !== "later") ||
      typeof docs.mail !== "boolean" || typeof docs.corp !== "boolean" || typeof docs.log !== "boolean"
    ) return "unreadable";
    if (record.currency !== undefined && record.currency !== "JPY") return "unreadable";
    return {
      legacyAmounts: record.currency !== "JPY",
      scope: record.scope,
      fee: record.currency === "JPY" ? record.fee : "",
      expense: record.currency === "JPY" ? record.expense : "",
      pay: record.pay,
      due: record.due,
      team: record.team,
      docs: { mail: docs.mail, corp: docs.corp, log: docs.log },
      future: record.future,
    };
  } catch {
    return "unreadable";
  }
}

function nowHm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}



function IconField({
  label,
  icon: Icon,
  hint,
  error,
  className,
  ...rest
}: {
  label: string;
  icon: LucideIcon;
  hint?: ReactNode;
  error?: string;
  className?: string;
} & Omit<ComponentProps<"input">, "className">) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-bold text-text">
        {label}
      </label>
      <div
        className={cn(
          "flex h-12 items-center gap-2.5 rounded-[10px] border px-4 focus-within:border-primary focus-within:ring-3 focus-within:ring-focus/60",
          error ? "border-red bg-red-soft" : "border-border-strong bg-surface",
        )}
      >
        <Icon className={cn("size-[18px] shrink-0", error ? "text-red" : "text-text-muted")} aria-hidden />
        <input
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={`${id}-help`}
          className="min-w-0 flex-1 bg-transparent text-base text-text placeholder:text-text-muted focus:outline-none"
          {...rest}
        />
      </div>
      <p id={`${id}-help`} className={cn("text-sm", error ? "text-red" : "text-text-muted")}>
        {error ?? hint}
      </p>
    </div>
  );
}

export function ProposalForm() {
  const [scope, setScope] = useState(SCOPE_DEFAULT);
  const [fee, setFee] = useState("180,000");
  const [expense, setExpense] = useState("7,500");
  const [pay, setPay] = useState("lump");
  const [due, setDue] = useState("採択から6週間");
  const [team, setTeam] = useState("弁護士2名");
  const [docs, setDocs] = useState<Record<string, boolean>>({ mail: true, corp: true, log: false });
  const [future, setFuture] = useState("estimate");
  const [savedLabel, setSavedLabel] = useState("このブラウザーに未保存");
  const [status, setStatus] = useState<Status>("editing");
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [conflict, setConflict] = useState<"none" | "declared">("none");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const draft = readProposalDraft();
    if (draft === "unreadable") {
      setSavedLabel("このブラウザーの保存データを読み込めませんでした");
    } else if (draft) {
      setScope(draft.scope);
      setFee(draft.fee);
      setExpense(draft.expense);
      setPay(draft.pay);
      setDue(draft.due);
      setTeam(draft.team);
      setDocs(draft.docs);
      setFuture(draft.future);
      setSavedLabel(draft.legacyAmounts ? "旧USDC下書きの文章を復元しました。報酬・実費は円で入力し直してください。" : "このブラウザーから円建ての下書きを復元しました");
    }
  }, []);

  const feeNum = parseYenAmount(fee);
  const expenseNum = parseYenAmount(expense);
  const readOnly = status !== "editing";

  function validate() {
    const e: Record<string, string> = {};
    if (!scope.trim()) e.scope = "相談範囲を入力してください";
    if (feeNum === null || feeNum === 0) e.fee = "税込報酬を円で入力してください（整数）";
    if (expenseNum === null) e.expense = "実費の上限を円で入力してください（整数。なしの場合は0）";
    if (!due.trim()) e.due = "納期を入力してください";
    if (!team.trim()) e.team = "担当体制を入力してください";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ currency: "JPY", scope, fee, expense, pay, due, team, docs, future }));
      setSavedLabel(`このブラウザーに保存しました（${nowHm()}）`);
    } catch {
      setSavedLabel("保存できませんでした。ブラウザーの保存領域を確認してください");
    }
  }

  function openSend() {
    if (!validate()) {
      setStatus("editing");
      setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(), 0);
      return;
    }
    setSendOpen(true);
  }

  function confirmSend() {
    if (sending) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSendOpen(false);
      setStatus("sent");
      setSavedLabel(`送信デモを完了しました（${nowHm()}）`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1200);
  }

  const payTitle = PAY_OPTIONS.find((o) => o.key === pay)?.title;
  const futureTitle = FUTURE_OPTIONS.find((o) => o.key === future)?.title;
  const docList = DOCS.filter((d) => docs[d.key]).map((d) => d.label);

  const preview = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-primary-dark">
          <Eye className="size-4" aria-hidden />
          {status === "sent" ? "送信デモした内容" : "プレビュー：参加者に表示される内容"}
        </span>
        <p className="text-sm text-text-muted">
          参加者向け表示の例です。このデモでは弁護士資格の確認や参加者への公開は行いません。
        </p>
      </div>
      <dl className="flex flex-col rounded-[10px] border border-border">
        {[
          { k: "相談範囲", v: <span className="whitespace-pre-wrap">{scope}</span> },
          {
            k: "今回の相談費用（税込）",
            v: feeNum !== null ? formatYen(feeNum) : "—",
          },
          {
            k: "実費",
            v: expenseNum ? `上限 ${formatYen(expenseNum)}` : "なし",
          },
          { k: "支払条件", v: payTitle },
          { k: "納期", v: due },
          { k: "担当体制", v: team },
          { k: "必要な資料", v: docList.length ? docList.join("、") : "なし" },
          { k: "将来の訴訟費用", v: futureTitle },
        ].map((r, i, arr) => (
          <div
            key={r.k}
            className={cn("flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4", i < arr.length - 1 && "border-b border-border")}
          >
            <dt className="shrink-0 text-sm font-bold text-text-sub sm:w-[160px]">{r.k}</dt>
            <dd className="min-w-0 flex-1 text-[15px] text-text">{r.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-10 md:px-9 md:pt-7 md:pb-[72px]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-text-muted">弁護士用ワークスペース ／ 提案の下書き</p>
          <h1 className="text-2xl font-bold text-text md:text-[28px]">提案を作成する：法人会員・利用者の共同相談</h1>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-text-sub" aria-live="polite">
          <Save className="size-[18px] text-green" aria-hidden />
          {savedLabel}
        </p>
      </div>

      <Callout icon={Info} tone="neutral" title="提案作成の固定デモ">
        下書きはこのブラウザーに保存できます。提案送信・弁護士資格の確認・参加者への公開は行われません。
      </Callout>

      <StageBanner
        stage="提案受付の表示例（締切 2026年12月15日）"
        next="匿名の集計を参考に、相談範囲と費用を入力するデモです。原本資料へのアクセスや利益相反の確認は行いません。"
      />

      {status === "sent" && (
        <StatePanel icon={CircleCheck} tone="green" title="提案送信のデモを完了しました">
          この画面の表示だけが切り替わりました。提案の保存・事務所への送信・資格確認・比較画面への掲載は行われません。
        </StatePanel>
      )}

      <div className="flex flex-col gap-8 xl:flex-row">
        <section className="flex min-w-0 flex-1 flex-col gap-7 rounded-xl border border-border bg-surface p-5 md:p-8">
          {readOnly ? (
            preview
          ) : (
            <>
              {/* 1 相談範囲 */}
              <div className="flex flex-col gap-3">
                <NumHead
                  num={1}
                  size="md"
                  title="相談範囲"
                  description="共同相談で何を扱い、何を扱わないかを具体的に書いてください。"
                />
                <div className="flex flex-col gap-2 md:pl-10">
                  <label htmlFor="scope" className="text-sm font-bold text-text">
                    相談範囲
                  </label>
                  <textarea
                    id="scope"
                    value={scope}
                    maxLength={SCOPE_MAX}
                    onChange={(e) => setScope(e.target.value)}
                    aria-invalid={!!errors.scope || undefined}
                    aria-describedby="scope-help"
                    className={cn(
                      "min-h-32 w-full rounded-[10px] border px-4 py-3 text-base text-text focus:border-primary focus:ring-3 focus:ring-focus/60 focus:outline-none",
                      errors.scope ? "border-red bg-red-soft" : "border-border-strong bg-surface",
                    )}
                  />
                  <div className="flex justify-between gap-4">
                    <p id="scope-help" className={cn("text-sm", errors.scope ? "text-red" : "sr-only")}>
                      {errors.scope ?? "共同相談で扱う範囲"}
                    </p>
                    <span className="tabular shrink-0 text-sm text-text-muted">
                      {scope.length.toLocaleString("ja-JP")} / {SCOPE_MAX.toLocaleString("ja-JP")}字
                    </span>
                  </div>
                </div>
              </div>

              {/* 2 費用と支払条件 */}
              <div className="flex flex-col gap-3">
                <NumHead
                  num={2}
                  size="md"
                  title="費用と支払条件"
                  description="税込報酬・実費の上限を、日本円の整数で入力します。"
                />
                <div className="flex flex-col gap-2.5 md:pl-10">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <IconField
                      label="税込報酬（円）"
                      icon={ReceiptText}
                      inputMode="numeric"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                      error={errors.fee}
                      hint={feeNum !== null ? formatYen(feeNum) : "円（整数）"}
                    />
                    <IconField
                      label="実費の上限（円）"
                      icon={Receipt}
                      inputMode="numeric"
                      value={expense}
                      onChange={(e) => setExpense(e.target.value)}
                      error={errors.expense}
                      hint={expenseNum !== null ? `${formatYen(expenseNum)}・証憑を添えて請求` : "円（整数）"}
                    />
                  </div>
                  <fieldset className="flex flex-col gap-2.5">
                    <legend className="mb-2.5 text-sm font-bold text-text">支払条件</legend>
                    {PAY_OPTIONS.map((o) => (
                      <OptionCard
                        key={o.key}
                        name="pay"
                        checked={pay === o.key}
                        onChange={() => setPay(o.key)}
                        title={o.title}
                        description={o.description}
                      />
                    ))}
                  </fieldset>
                </div>
              </div>

              {/* 3 納期と担当体制 */}
              <div className="flex flex-col gap-3">
                <NumHead num={3} size="md" title="納期と担当体制" />
                <div className="flex flex-col gap-4 sm:flex-row md:pl-10">
                  <IconField label="納期" icon={Calendar} value={due} onChange={(e) => setDue(e.target.value)} error={errors.due} />
                  <IconField
                    label="担当体制"
                    icon={Users}
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    error={errors.team}
                  />
                </div>
              </div>

              {/* 4 必要な資料 */}
              <div className="flex flex-col gap-3">
                <NumHead
                  num={4}
                  size="md"
                  title="必要な資料"
                  description="採択後、本人が共有を許可した資料だけが届きます。"
                />
                <fieldset className="flex flex-col md:pl-10">
                  <legend className="sr-only">必要な資料</legend>
                  {DOCS.map((d) => (
                    <label key={d.key} className="flex cursor-pointer items-center gap-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={!!docs[d.key]}
                        onChange={(e) => setDocs((s) => ({ ...s, [d.key]: e.target.checked }))}
                        className="size-[22px] shrink-0 accent-primary"
                      />
                      <span className="text-base text-text">{d.label}</span>
                    </label>
                  ))}
                </fieldset>
              </div>

              {/* 5 将来の訴訟費用 */}
              <div className="flex flex-col gap-3">
                <NumHead
                  num={5}
                  size="md"
                  title="将来の訴訟費用（任意）"
                  description="提示する場合は概算であることを明記してください。参加者は相談後に個別に判断します。"
                />
                <fieldset className="flex flex-col gap-2.5 md:pl-10">
                  <legend className="sr-only">将来の訴訟費用</legend>
                  {FUTURE_OPTIONS.map((o) => (
                    <OptionCard
                      key={o.key}
                      name="future"
                      checked={future === o.key}
                      onChange={() => setFuture(o.key)}
                      title={o.title}
                      description={o.description}
                    />
                  ))}
                </fieldset>
              </div>
            </>
          )}

          {/* フッター */}
          {status !== "sent" && (
            <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="secondary" icon={Save} onClick={saveDraft}>
                下書き保存
              </Button>
              <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
                {status === "editing" ? (
                  <Button variant="text" onClick={() => setStatus("preview")}>
                    プレビュー
                  </Button>
                ) : (
                  <Button variant="secondary" icon={PencilLine} onClick={() => setStatus("editing")}>
                    編集に戻る
                  </Button>
                )}
                <Button icon={Send} onClick={openSend}>
                  提案送信を試す（デモ）
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
          <section className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-bold text-text">あなたの確認状況</h2>
            <div className="flex flex-col gap-1 border-b border-border py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-text-sub">本人確認</span>
                <Badge tone="green" icon={CircleCheck}>
                  表示例
                </Badge>
              </div>
            </div>
            <div className="flex flex-col gap-1 border-b border-border py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-text-sub">弁護士資格の確認</span>
                <Badge tone="amber" icon={Clock3}>
                  確認中（表示例）
                </Badge>
              </div>
              <p className="text-[13px] text-text-muted">
                確認が完了するまで、提案は参加者に公開されません。登録番号などは確認後に表示します。
              </p>
            </div>
            <div className="flex flex-col gap-1 border-b border-border py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-text-sub">利益相反の確認</span>
                {conflict === "none" ? (
                  <Badge tone="neutral" icon={CircleDashed}>
                    未申告
                  </Badge>
                ) : (
                  <Badge tone="amber" icon={Clock3}>
                申告デモ済み
                  </Badge>
                )}
              </div>
              <p className="text-[13px] text-text-muted">
                {conflict === "none"
                  ? "事業者・参加者との関係を申告する表示デモです。入力内容は保存・送信されません。"
                  : "申告済みの表示に切り替わりました。内容の保存や確認依頼は送信されません。"}
              </p>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              disabled={conflict === "declared"}
              onClick={() => setConflict("declared")}
            >
              {conflict === "none" ? "申告を試す（デモ）" : "申告済み表示（デモ）"}
            </Button>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-bold text-text">募集の概要（匿名の集計）</h2>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold text-text-muted">対象者</span>
              <span className="text-sm text-text">法人会員の担当者・法人契約で利用した個人</span>
            </div>
            <dl className="flex flex-col rounded-[10px] border border-border">
              {[
                ["登録", recruitmentStats.registered],
                ["本人・関係性の確認", recruitmentStats.identityChecked],
                ["資料確認", recruitmentStats.documentsChecked],
                ["拠出", recruitmentStats.contributors],
              ].map(([k, v], i) => (
                <div key={k} className={cn("flex justify-between px-3 py-2", i < 3 && "border-b border-border")}>
                  <dt className="text-sm text-text-sub">{k}</dt>
                  <dd className="tabular text-sm font-bold text-text">{v}人</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-text-muted">段階ごとの別の数です（合計ではありません）</p>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold text-text-muted">資料の種類</span>
              <span className="text-sm text-text">通知メールの写し、法人利用の分かる書類</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold text-text-muted">相談目的</span>
              <span className="text-sm text-text">情報の範囲と影響、説明の求め方、損害賠償の可能性と費用</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold text-text-muted">予算</span>
              <span className="text-sm text-text">
                法律相談 180,000円・初期調査 75,000円
              </span>
            </div>
          </section>

          <div className="flex gap-3 rounded-[10px] bg-neutral-soft px-4 py-3.5">
            <Lock className="mt-0.5 size-5 shrink-0 text-text-sub" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <p className="text-base font-bold text-text">原本資料はまだ閲覧できません</p>
              <p className="text-sm text-text">
                利益相反の確認と採択の後に、本人が共有を許可した資料だけが届きます。応募中の段階では、匿名の集計のみ表示します。
              </p>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={sendOpen}
        onClose={() => !sending && setSendOpen(false)}
        onConfirm={confirmSend}
        confirming={sending}
        icon={Send}
        title="提案送信のデモを行いますか？"
        description="この画面の状態だけを切り替えます。提案の保存・送信・資格確認・比較画面への掲載は行われません。"
        confirmLabel="送信デモを進める"
      >
        <div className="flex flex-col gap-1 rounded-[10px] bg-[#F4F6F9] px-4 py-3 text-sm text-text">
          <span>
            今回の相談費用（税込）：{feeNum !== null ? formatYen(feeNum) : "—"}
          </span>
          <span>実費：{expenseNum ? `上限 ${formatYen(expenseNum)}` : "なし"}</span>
          <span>納期：{due}</span>
        </div>
      </ConfirmDialog>
    </div>
  );
}
