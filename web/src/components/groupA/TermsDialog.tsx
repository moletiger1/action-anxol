"use client";

import { ChevronRight, ScrollText, X } from "lucide-react";
import { useId, useRef } from "react";
import { Button } from "@/components/ui";
import { consultationBudget, formatYen, recruitmentStats } from "@/lib/demo";

const terms = [
  {
    title: "使い道と上限",
    body: `${consultationBudget
      .map((b) => `${b.label} ${formatYen(b.yen)}`)
      .join("・")}（計 ${formatYen(recruitmentStats.goalYen)}）。円での支払いを前提とした予算案です。`,
  },
  {
    title: "支払先",
    body: "採択された契約の支払先と上限を確認して支払う設計です。円の資金保管・送金を担う事業者は選定中で、決済基盤は未接続です。",
  },
  {
    title: "誰が確認するか",
    body: "選任された支出確認担当が契約条件と請求内容を確認します。確認数・待機期間・異議対応・精算期限は、円の決済基盤に合わせて募集開始前に確定します。",
  },
  {
    title: "誰が相談先を決めるか",
    body: "弁護士の提案を比較し、参加者による審議で決定します。審議役の選任方法・人数・決定条件は現在「未設定」で、条件がそろうまで採択はできません。",
  },
  {
    title: "返金条件の案",
    body: "募集不成立時は返金。終了後は支払済み・契約拘束中を除く残額を拠出額に応じて按分する案です。返金方法・時期・手数料・円未満の端数処理は募集開始前に確定して表示します。実際の返金は行いません。",
  },
  {
    title: "拠出の性質",
    body: "拠出しても議決権や賠償金の取り分は増えません。実際の募集は未開始です。",
  },
  {
    title: "支払通貨・方法",
    body: "利用者は日本円で支払う前提です。カード・銀行振込の流れをデモ表示し、実際の提供方法と手数料は決済事業者の選定後に確定します。暗号資産の購入やウォレット作成は不要です。",
  },
];

/** 「支払条件案の全文を見る」 */
export function TermsDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex h-11 items-center gap-1.5 self-start px-1 text-left text-base font-medium text-primary-dark hover:underline"
      >
        支払条件案の全文を見る
        <ChevronRight className="size-[18px] shrink-0" aria-hidden />
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-auto w-full max-w-[min(640px,calc(100vw-32px))] rounded-2xl bg-surface p-0 text-text backdrop:bg-[#172B4D]/40"
      >
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center gap-3.5 border-b border-border px-6 py-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
              <ScrollText className="size-[22px]" aria-hidden />
            </span>
            <h2 id={titleId} className="flex-1 text-xl font-bold">
              この募集の支払条件案（全文）
            </h2>
            <button
              type="button"
              aria-label="閉じる"
              onClick={() => ref.current?.close()}
              className="flex size-11 items-center justify-center rounded-[10px] hover:bg-bg"
            >
              <X className="size-5 text-text-sub" aria-hidden />
            </button>
          </div>
          <ol className="flex flex-col overflow-y-auto px-6 py-2">
            <li className="border-b border-border py-3.5 text-sm text-text-sub">
              以下は円払いを前提にした条件案です。決済基盤・担当者の選任・募集条件は未確定で、資金募集は行われていません。
            </li>
            {terms.map((t, i) => (
              <li
                key={t.title}
                className="flex gap-3 border-b border-border py-3.5 last:border-b-0"
              >
                <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-soft text-sm font-bold text-text-sub">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[15px] font-bold">{t.title}</p>
                  <p className="text-sm text-text-sub">{t.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex justify-end border-t border-border px-6 py-4">
            <Button variant="secondary" onClick={() => ref.current?.close()}>
              閉じる
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
