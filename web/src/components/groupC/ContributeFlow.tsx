"use client";

import { ArrowLeft, CircleAlert, CircleCheck, Clock3, CreditCard, Info, Landmark, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, ButtonLink, Callout, ConfirmDialog, ConsentCheckbox, CostRow, StatePanel } from "@/components/ui";
import { AppShell } from "@/components/layout";
import { consultationBudget, formatYen, parseYenAmount, recruitmentStats } from "@/lib/demo";
import { routes } from "@/lib/routes";
import { DemoSwitch, OptionCard } from "./parts";

type Method = "card" | "bank";
type Phase = "review" | "pending" | "processing" | "done" | "cancelled" | "failed";
const METHODS = { card: "クレジットカード", bank: "銀行振込" } as const;
const OPTIONS: { value: Phase; label: string }[] = [
  { value: "review", label: "支払前の確認" },
  { value: "pending", label: "受付・入金待ち" },
  { value: "processing", label: "確認中" },
  { value: "done", label: "完了" },
  { value: "cancelled", label: "取消" },
  { value: "failed", label: "支払失敗" },
];

export function ContributeFlow() {
  const [amountText, setAmountText] = useState("1500");
  const [method, setMethod] = useState<Method>("card");
  const [rulesChecked, setRulesChecked] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("review");
  const amount = parseYenAmount(amountText);
  const remaining = recruitmentStats.goalYen - recruitmentStats.currentYen;
  const valid = amount !== null && amount > 0 && amount <= remaining;
  const amountLabel = valid ? formatYen(amount) : "—";

  // 確認中の表示だけを再現する。銀行振込の入金待ちは自動で完了させない。
  useEffect(() => {
    if (phase !== "processing") return;
    const timer = window.setTimeout(() => setPhase("done"), 1500);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function showPhase(next: Phase) {
    setDialogOpen(false);
    setPhase(next);
  }

  return (
    <AppShell mobileTitle="共同相談費の支払い" mobileBackHref={routes.recruitment}>
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 p-4 md:gap-6 md:p-8">
        <ButtonLink href={routes.recruitment} variant="text" icon={ArrowLeft} className="self-start">募集の詳細へ戻る</ButtonLink>
        <div>
          <h1 className="text-2xl font-bold text-text">共同相談費を円で支払う</h1>
          <p className="mt-2 text-text-sub">法人会員・利用者の共同相談</p>
        </div>
        <Callout icon={Info} tone="neutral" title="円払いのデモ">
          <p>カードまたは銀行振込で支払う流れを確認できます。暗号資産の購入やウォレットの作成は不要です。</p>
          <p>決済サービスは未接続です。カード情報・口座情報は入力せず、実際の請求・振込・入金確認は行いません。</p>
        </Callout>
        <DemoSwitch label="支払状態" options={OPTIONS} value={phase} onChange={showPhase} />

        {phase === "review" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 md:p-6">
              <h2 className="text-xl font-bold text-text">支払金額と方法</h2>
              <div className="flex flex-col gap-2">
                <label htmlFor="contribution-yen" className="font-bold text-text">拠出額（円）</label>
                <input
                  id="contribution-yen" inputMode="numeric" value={amountText}
                  onChange={(e) => { setAmountText(e.target.value); setRulesChecked(false); }}
                  aria-invalid={!valid || undefined} aria-describedby="contribution-yen-help"
                  className="h-14 min-w-0 rounded-lg border border-border-strong px-4 text-2xl font-bold focus:outline-primary"
                />
                <p id="contribution-yen-help" className={valid ? "text-sm text-text-muted" : "text-sm text-red"}>
                  {valid ? `1円単位で入力できます。募集残額は${formatYen(remaining)}です。` : `1円以上、${formatYen(remaining)}以下の整数を入力してください。`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[1500, 3000, 7500].map((value) => (
                    <button key={value} type="button" aria-pressed={amount === value}
                      onClick={() => { setAmountText(String(value)); setRulesChecked(false); }}
                      className="min-h-11 rounded-lg border border-border-strong px-4 font-medium text-primary-dark aria-pressed:border-primary aria-pressed:bg-primary-soft">
                      {formatYen(value)}
                    </button>
                  ))}
                </div>
              </div>
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-2 font-bold text-text">支払方法</legend>
                <OptionCard name="payment-method" checked={method === "card"}
                  onChange={() => { setMethod("card"); setRulesChecked(false); }}
                  title={METHODS.card} description="円建てで支払う流れのデモ。カード情報の入力はありません。" />
                <OptionCard name="payment-method" checked={method === "bank"}
                  onChange={() => { setMethod("bank"); setRulesChecked(false); }}
                  title={METHODS.bank} description="振込受付・入金待ちの流れのデモ。振込先口座はまだ発行されません。" />
              </fieldset>
              <div>
                <CostRow label="共同相談費への拠出額" value={amountLabel} />
                <CostRow label="支払通貨" value="日本円（JPY）" />
                <CostRow label="手数料" value="未確定" note="決済サービスの選定後、支払確定前に表示します" />
                <CostRow label="デモの支払額" value={amountLabel} note="実際の総額ではありません。手数料を含みません" total last />
              </div>
            </section>
            <section className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 md:p-6">
              <h2 className="text-xl font-bold text-text">募集のルール</h2>
              <dl className="space-y-4 text-sm text-text-sub">
                <div><dt className="font-bold text-text">使い道</dt><dd>{consultationBudget.map((item) => `${item.label} ${formatYen(item.yen)}`).join("／")}</dd></div>
                <div><dt className="font-bold text-text">募集期限・目標</dt><dd>{recruitmentStats.deadline} 23:59・{formatYen(recruitmentStats.goalYen)}</dd></div>
                <div><dt className="font-bold text-text">支払いの確認</dt><dd>採択された契約と請求内容を、選任された支出確認担当が確認します。円の資金保管・送金を担う事業者は選定中です。</dd></div>
                <div><dt className="font-bold text-text">返金条件の案</dt><dd>募集不成立時は返金。終了後は支払済み・契約拘束中の額を除いた残額を拠出額に応じて按分します。返金方法・時期・手数料・円未満の端数処理は募集開始前に確定して表示します。</dd></div>
                <div><dt className="font-bold text-text">拠出の意味</dt><dd>共同相談費への拠出です。訴訟の依頼ではなく、議決権や賠償金の取り分は増えません。</dd></div>
              </dl>
              <ButtonLink href={routes.moneyRules} variant="text" className="self-start">予算・支払条件の表示例を見る</ButtonLink>
              <ConsentCheckbox checked={rulesChecked} onChange={setRulesChecked} description="この確認はデモ用です。決済や契約への同意にはなりません。">金額・支払方法・ルールを確認しました</ConsentCheckbox>
              <Button icon={method === "card" ? CreditCard : Landmark} disabled={!valid || !rulesChecked} onClick={() => setDialogOpen(true)}>
                {amountLabel}の支払いデモへ
              </Button>
            </section>
          </div>
        ) : (
          <section aria-live="polite" className="mx-auto w-full max-w-[600px]">
            <StatePanel
              icon={phase === "done" ? CircleCheck : phase === "failed" ? CircleAlert : phase === "processing" ? LoaderCircle : Clock3}
              tone={phase === "done" ? "green" : phase === "failed" ? "red" : "neutral"}
              title={phase === "done" ? "支払い完了（デモ）" : phase === "failed" ? "支払いを確認できません（デモ）" : phase === "cancelled" ? "支払手続きを取り消しました（デモ）" : phase === "processing" ? "支払いを確認中（デモ）" : method === "bank" ? "銀行振込の入金待ち（デモ）" : "カード決済の受付待ち（デモ）"}
              spin={phase === "processing"}
            >
              <p>{METHODS[method]}・{amountLabel}</p>
              <p className="mt-2">{phase === "pending" && method === "bank" ? "実際の振込先口座は発行されていません。入金待ちから完了への切替は、下のデモ操作で確認できます。" : phase === "failed" ? "手続きが完了しなかった場合の表示例です。実際の決済・引き落としはありません。" : "画面上の表示例です。実際の決済・資金移動・記録の保存はありません。"}</p>
              <div className="mt-5 flex flex-col gap-3">
                {phase === "pending" && <Button onClick={() => setPhase("processing")}>{method === "bank" ? "入金確認後のデモを表示" : "カード決済後のデモを表示"}</Button>}
                {phase === "pending" && <Button variant="secondary" onClick={() => setPhase("cancelled")}>デモを取り消す</Button>}
                {phase !== "processing" && <Button variant="secondary" onClick={() => showPhase("review")}>金額・支払方法に戻る</Button>}
                {phase === "done" && <ButtonLink href={routes.settlement} variant="text">返金の表示例を見る</ButtonLink>}
              </div>
            </StatePanel>
          </section>
        )}
        <ConfirmDialog open={dialogOpen} onClose={() => setDialogOpen(false)}
          onConfirm={() => { if (valid && rulesChecked) showPhase("pending"); }}
          icon={method === "card" ? CreditCard : Landmark} title={`${amountLabel}の円払いデモを開始しますか`}
          description="支払いの画面遷移のみを再現します。実際の決済や銀行振込は行いません。" confirmLabel="デモを開始する">
          <CostRow label="支払方法" value={METHODS[method]} />
          <CostRow label="デモの支払額" value={amountLabel} note="手数料は未確定・含まれません" total last />
        </ConfirmDialog>
      </div>
    </AppShell>
  );
}
