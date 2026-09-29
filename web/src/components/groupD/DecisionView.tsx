"use client";

import { ArrowRight, ChevronRight, CircleCheck, CircleSlash, FilePen, Info } from "lucide-react";
import { useState } from "react";
import { Badge, Button, ButtonLink, Callout, ConfirmDialog, ConsentCheckbox } from "@/components/ui";
import { routes } from "@/lib/routes";
import { BulletItem, KVRow } from "./parts";

type Decision = "undecided" | "reviewing" | "demo-requested" | "skipped";

export function DecisionView() {
  const [decision, setDecision] = useState<Decision>("undecided");
  const [skipOpen, setSkipOpen] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  const statusLabel =
    decision === "skipped"
      ? "見送り状態（デモ）"
      : decision === "reviewing"
        ? "委任条件の確認中（デモ）"
        : decision === "demo-requested"
          ? "依頼意思の表示例（未送信）"
          : "未決定（デモ）";

  return (
    <div className="flex flex-col gap-7 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <Callout icon={Info} tone="neutral" title="相談後の判断画面のデモ">
          <p>案件・相談結果・金額は表示例です。依頼や見送りの操作をしても、委任契約・返金請求・通知は発生しません。</p>
        </Callout>
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone="green" icon={CircleCheck}>
              相談結果を共有済み
            </Badge>
            <span className="text-sm text-text-muted">2027年3月2日</span>
          </div>
          <h2 className="text-lg font-bold text-text">相談結果の要点</h2>
          <ul className="flex flex-col gap-3 text-base text-text">
            <BulletItem>解約後に請求された翌月分は、返金を求められる可能性があると説明されました</BulletItem>
            <BulletItem>返金額は一人ひとりの契約・請求の状況によって異なります</BulletItem>
            <BulletItem>希望する人は、弁護士Aに個別に交渉を依頼できます（訴訟は含まない）</BulletItem>
          </ul>
          <details className="group border-t border-border pt-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-base font-medium text-primary-dark hover:underline [&::-webkit-details-marker]:hidden">
              相談結果の全文を読む
              <ChevronRight className="size-[18px] transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <div className="flex flex-col gap-3 pt-2 text-sm leading-6 text-text-sub">
              <p className="font-bold text-text">相談結果の共有（架空のデモ）</p>
              <p>
                この架空案件では、オンライン英会話の契約を解約した後に翌月分の利用料が請求されたという相談について、弁護士が資料を確認しました。契約時の規約、解約手続きの記録、請求明細を照合し、請求の根拠と解約の成立時期を個別に確認する必要があるとの説明がありました。
              </p>
              <p>
                解約後の請求について返金を求められる可能性はありますが、返金の可否や金額は契約内容、解約日、利用状況、事業者とのやり取りによって異なります。この説明だけで返金が確約されるものではありません。
              </p>
              <p>
                弁護士Aへの個別依頼は事業者との交渉を対象とし、訴訟は含みません。依頼する場合は、下記の条件を確認したうえで本人が別途手続きを行います。共同相談への参加や審議での採択によって、個別の委任契約が成立することはありません。
              </p>
              <p className="text-xs text-text-muted">この文章・案件・日付・人物はすべて表示例です。実際の法律相談や個別の法的助言ではありません。</p>
            </div>
          </details>
        </section>

        <section
          aria-labelledby="engagement-terms"
          className="flex flex-col gap-4 rounded-xl border border-primary bg-surface p-5 md:p-6"
        >
          <h2 id="engagement-terms" className="text-xl font-bold text-text">
            弁護士Aへの個別の依頼条件
          </h2>
          <dl className="flex flex-col">
            <KVRow label="依頼内容">
              事業者への返金請求の交渉（交渉で解決しない場合の訴訟は、別途の依頼）
            </KVRow>
            <KVRow label="依頼先">弁護士A〔架空〕法律事務所</KVRow>
            <KVRow label="着手金">
              <span className="tabular">0円</span>
            </KVRow>
            <KVRow label="報酬（税込）">実際に回収できた金額の20%</KVRow>
            <KVRow label="実費">上限500円。証憑に基づき精算</KVRow>
            <KVRow label="控除の条件" last>
              報酬と未精算の実費は、回収金から差し引いてから振り込まれます。回収がない場合、報酬は発生しません
            </KVRow>
          </dl>
          <Callout icon={FilePen} tone="neutral">
            <p>
              共同相談先の採択と個人の委任は別の判断です。本人が依頼内容・費用を確認し、個別に意思を示します。この画面では委任契約は成立しません。
            </p>
          </Callout>

          {decision === "undecided" && (
            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-4">
              <ButtonLink href={routes.proposals} variant="text" className="self-center sm:self-auto">
                弁護士に質問する
              </ButtonLink>
              <Button variant="secondary" onClick={() => setSkipOpen(true)}>
                今回は見送る
              </Button>
              <Button icon={ArrowRight} onClick={() => setDecision("reviewing")}>
                委任確認のデモへ進む
              </Button>
            </div>
          )}

          {decision === "reviewing" && (
            <div className="flex flex-col gap-3">
              <Callout icon={Info} title="委任条件を確認してください（画面例）">
                <p>
                  このチェックと次の操作は表示例です。電子署名・依頼の送信・委任契約の成立は行われません。
                </p>
              </Callout>
              <ConsentCheckbox
                checked={termsChecked}
                onChange={setTermsChecked}
                description="このデモ操作は、法的な委任への同意や弁護士への申込みになりません。"
              >
                表示された依頼内容・費用を確認しました
              </ConsentCheckbox>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDecision("undecided");
                    setTermsChecked(false);
                  }}
                >
                  依頼の判断に戻る
                </Button>
                <Button disabled={!termsChecked} onClick={() => setDecision("demo-requested")}>
                  依頼意思のデモを表示
                </Button>
              </div>
            </div>
          )}

          {decision === "demo-requested" && (
            <Callout icon={Info} tone="neutral" title="依頼意思の表示例">
              <p>この画面内で確認済み状態を表示しました。内容は保存・送信されず、委任契約や依頼は成立していません。</p>
              <Button variant="text" onClick={() => setDecision("reviewing")}>
                依頼条件の表示に戻る
              </Button>
            </Callout>
          )}

          {decision === "skipped" && (
            <div className="flex flex-col gap-3">
              <Callout icon={CircleSlash} tone="neutral" title="見送り状態のデモ表示">
                <p>
                  相談結果は引き続き閲覧できます。受付期間内（2027年4月30日まで）であれば、あとから依頼することもできます。
                </p>
              </Callout>
              <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                <Button variant="text" className="self-center sm:self-auto" onClick={() => setDecision("undecided")}>
                  依頼を検討し直す
                </Button>
                <ButtonLink href={routes.settlement} variant="secondary">
                  返金の請求を確認する
                </ButtonLink>
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="flex w-full flex-col gap-4 lg:w-[340px] lg:shrink-0">
        <section className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-bold text-text">見送る場合</h2>
          <ul className="flex flex-col gap-2.5 text-sm text-text">
            <BulletItem icon={CircleCheck} iconClassName="text-primary-dark">
              相談結果は引き続き閲覧できます
            </BulletItem>
            <BulletItem icon={CircleCheck} iconClassName="text-primary-dark">
              共同相談費の未使用分は、条件を満たせば返金を請求できる想定です
            </BulletItem>
            <BulletItem icon={CircleCheck} iconClassName="text-primary-dark">
              あとから依頼したくなった場合も、受付期間内なら依頼できます（2027年4月30日まで）
            </BulletItem>
          </ul>
        </section>
        <dl className="flex flex-col rounded-xl border border-border bg-surface px-5 py-4">
          <KVRow label="参加状態" labelClassName="md:w-[110px]">
            当事者・本人確認済み
          </KVRow>
          <KVRow label="既払いの相談費" labelClassName="md:w-[110px]">
            600円（円での拠出・架空）
          </KVRow>
          <KVRow label="依頼の状態" labelClassName="md:w-[110px]" last>
            <span aria-live="polite">{statusLabel}</span>
          </KVRow>
        </dl>
      </aside>

      <ConfirmDialog
        open={skipOpen}
        onClose={() => setSkipOpen(false)}
        onConfirm={() => {
          setDecision("skipped");
          setSkipOpen(false);
        }}
        icon={CircleSlash}
        title="見送り状態のデモを表示しますか"
        description="見送り後の画面を表示します。実際の依頼状態・返金請求・通知は変わりません。"
        confirmLabel="デモを続ける"
        cancelLabel="戻って検討する"
      />
    </div>
  );
}
