import {
  CircleAlert,
  Clock,
  FileText,
  FlaskConical,
  Info,
  Lock,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import { Badge, ButtonLink, Callout, CostRow, DemoBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { consultationBudget, formatYen, recruitmentStats as st } from "@/lib/demo";
import { routes } from "@/lib/routes";
import {
  ExternalTextLink,
  KV,
  SectionTitle,
  TIMES_SOURCE_TITLE,
  TIMES_SOURCE_URL,
} from "./parts";

function Timeline({ items }: { items: { at: string; text: string }[] }) {
  return (
    <ol className="flex flex-col rounded-xl border border-border bg-surface px-5 py-2 md:px-6">
      {items.map((h, i) => (
        <li
          key={h.at + h.text}
          className={cn(
            "flex flex-col gap-1 py-3.5 sm:flex-row sm:gap-4",
            i < items.length - 1 && "border-b border-border",
          )}
        >
          <span className="flex items-center gap-4 sm:contents">
            <span className="flex h-[26px] shrink-0 items-center">
              <span
                aria-hidden
                className={cn("size-2.5 rounded-full", i === 0 ? "bg-primary" : "bg-border-strong")}
              />
            </span>
            <time className="tabular shrink-0 text-sm leading-[26px] text-text-muted sm:w-[170px]">
              {h.at}
            </time>
          </span>
          <span className="text-[15px] text-text sm:flex-1">{h.text}</span>
        </li>
      ))}
    </ol>
  );
}

/** 資料・更新タブ */
export function MaterialsTab() {
  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="sec-mat-source" className="flex flex-col gap-3.5">
        <SectionTitle
          id="sec-mat-source"
          title="公表資料"
          description="出来事の内容は、事業者の公表資料に基づいて整理しています。"
        />
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 md:p-6">
          <div className="flex gap-3">
            <FileText className="mt-0.5 size-5 shrink-0 text-text-sub" aria-hidden />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-[15px] font-bold text-text">{TIMES_SOURCE_TITLE}</p>
              <p className="text-[13px] break-all text-text-muted">
                share.timescar.jp/news/2026/0928/1815.html
              </p>
              <p className="text-[13px] text-text-muted">公表日 2026年9月28日</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6">
            <ExternalTextLink href={TIMES_SOURCE_URL}>外部サイトで開く</ExternalTextLink>
            <ButtonLink href={routes.event} variant="text">
              事件ページで分かっていること／未確認のことを見る
            </ButtonLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="sec-mat-shared" className="flex flex-col gap-3.5">
        <SectionTitle
          id="sec-mat-shared"
          title="参加者が共有した資料"
          description="資料の中身は公開されません。確認の段階ごとの人数だけを表示します。"
        />
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 md:p-6">
          <dl className="flex flex-col">
            <KV label="資料を確認済み" labelWidth="w-32">
              <span className="tabular">{st.documentsChecked}人</span>
            </KV>
            <KV label="共有先" labelWidth="w-32" last>
              相談先に決まった弁護士（本人が許可した範囲のみ）
            </KV>
          </dl>
          <p className="text-[13px] text-text-muted">人数は固定デモ値です。実際の確認記録や、このブラウザーの個人状態ではありません。</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral" icon={Lock}>
              通知メールの原本
            </Badge>
            <Badge tone="neutral" icon={Lock}>
              参加者の名前・連絡先
            </Badge>
            <Badge tone="neutral" icon={Lock}>
              個人ごとの漏えい項目
            </Badge>
          </div>
          <p className="text-[13px] text-text-muted">
            上記は公開しません。資料は本人の許可がある範囲でのみ、相談先の弁護士に共有されます。
          </p>
          <ButtonLink href={routes.signin} variant="text" className="self-start">
            参加希望を登録して資料を共有する
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="sec-mat-history" className="flex flex-col gap-3.5">
        <SectionTitle
          id="sec-mat-history"
          title="この募集の更新履歴（表示例）"
          description="固定デモ表示です。実際の変更記録とは連動していません。"
        />
        <Timeline
          items={[
            {
              at: "2026年9月29日 18:10",
              text: "固定デモ上の画面例を更新しました。実際の資金募集は未開始です",
            },
            { at: "2026年9月29日 10:30", text: "法人会員・利用者の共同相談が追加されました" },
          ]}
        />
      </section>
    </div>
  );
}

const proposalPreview = [
  { name: "弁護士A", fee: 180000, scope: "共同相談2回・書面での回答", term: "採択から6週間" },
  { name: "弁護士B", fee: 150000, scope: "共同相談1回・質疑への書面回答", term: "採択から4週間" },
  {
    name: "弁護士C",
    fee: 210000,
    scope: "共同相談2回・希望者の個別質問（各30分）",
    term: "採択から8週間",
    over: "予算を30,000円超過",
  },
];

/** 弁護士の提案タブ（提案比較は後段の画面例） */
export function ProposalsTab() {
  return (
    <div className="flex flex-col gap-7">
      <Callout icon={Clock} tone="neutral" title="提案比較は後段の画面例です">
        <p>
          現在は参加希望の受付中で、資金募集は始まっていません。この欄は、条件が確定した後に弁護士の提案を比較する画面例です。
        </p>
      </Callout>

      <section aria-labelledby="sec-prop-preview" className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle
            id="sec-prop-preview"
            title="提案の比較（表示例）"
            description="提案が届いた後の画面の例です。弁護士・事務所はすべて架空です。"
          />
          <DemoBadge />
        </div>
        <ul className="flex flex-col gap-3 lg:flex-row">
          {proposalPreview.map((p) => (
            <li
              key={p.name}
              className="flex flex-1 flex-col gap-2 rounded-xl border border-border bg-surface p-5"
            >
              <div className="flex flex-col">
                <span className="text-base font-bold text-text">{p.name}</span>
                <span className="text-[13px] text-text-muted">〔架空〕法律事務所</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] text-text-muted">今回の相談費用（税込）</span>
                <span className="tabular text-lg font-bold text-text">{formatYen(p.fee)}</span>
                
              </div>
              {p.over && (
                <Badge tone="amber" icon={CircleAlert} className="self-start">
                  {p.over}
                </Badge>
              )}
              <p className="text-sm text-text-sub">{p.scope}</p>
              <p className="text-sm text-text-sub">{p.term}</p>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-text-muted">
          AIによる勝率の推定や、提案の自動順位付けは行いません。費用は日本円の表示例です。
        </p>
        <ButtonLink href={routes.proposals} variant="secondary" className="self-start">
          提案の比較・審議の画面を見る（別時点のデモ）
        </ButtonLink>
      </section>

      <section aria-labelledby="sec-prop-who" className="flex flex-col gap-3.5">
        <SectionTitle
          id="sec-prop-who"
          title="誰が相談先を決めるか"
          description="設定案は参加者に公開され、意見を募ってから確定します。"
        />
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 md:p-6">
          <dl className="flex flex-col">
            <KV label="母集団" labelWidth="w-36">
              この募集で本人・関係性の確認が済んだ参加者（現在{st.identityChecked}人）
            </KV>
            <KV label="審議役の選任方法" labelWidth="w-36">
              <Badge tone="amber" icon={CircleAlert}>
                未設定
              </Badge>
            </KV>
            <KV label="審議役の人数・定足数" labelWidth="w-36">
              <Badge tone="amber" icon={CircleAlert}>
                未設定
              </Badge>
            </KV>
            <KV label="利益相反の確認" labelWidth="w-36">
              審議役は、就任前に各弁護士との関係がないことを申告・確認します
            </KV>
            <KV label="決定条件" labelWidth="w-36" last>
              <Badge tone="amber" icon={CircleAlert}>
                未設定
              </Badge>
            </KV>
          </dl>
          <p className="text-[13px] text-text-muted">人数は固定デモ値です。実際の本人確認結果ではありません。</p>
          <Callout icon={ShieldCheck} tone="amber" title="条件がそろうまで採択できません">
            <p>選任方法と決定条件が未設定のため、誰も相談先を決定できません。</p>
          </Callout>
          <Callout icon={Info} title="ここで選ぶのは「共同相談の相談先」です">
            <p>
              訴訟の委任ではありません。訴訟などの正式な依頼は、相談結果を見たうえで、希望する人が本人として個別に決めます。
            </p>
          </Callout>
        </div>
      </section>
    </div>
  );
}

/** お金の記録タブ（固定デモ。実際の拠出・支出記録はない） */
export function MoneyTab() {
  const unallocated = st.currentYen;
  const tiles = [
    { label: "入金合計の例", value: st.currentYen, note: "日本円" },
    { label: "支払済みの例", value: 0, note: "実際の支出なし" },
    { label: "契約済み・未払いの例", value: 0, note: "架空の表示例" },
    { label: "未拘束残高の例", value: unallocated, note: "日本円" },
  ];
  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="sec-money-now" className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle
            id="sec-money-now"
            title="共同相談費の会計"
            description="固定デモ上の表示例（2026年9月29日）。実際の入出金記録ではありません。"
          />
          <DemoBadge />
        </div>
        <dl className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface px-3.5 py-3 md:px-[18px] md:py-4"
            >
              <dt className="text-[13px] font-bold text-text-sub md:text-sm">{t.label}</dt>
              <dd className="tabular text-lg font-bold text-text md:text-xl">{formatYen(t.value)}</dd>
              <dd className="tabular text-[13px] text-text-muted">{t.note}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[13px] text-text-muted">
          デモ上の拠出例 {st.contributors}人相当・目標 {formatYen(st.goalYen)}
        </p>
      </section>

      <section aria-labelledby="sec-money-budget" className="flex flex-col gap-3.5">
        <SectionTitle
          id="sec-money-budget"
          title="費目ごとの上限と支出"
          description="以下は円建ての固定デモです。費目ごとの上限と支払条件を確認する設計で、実際の決済基盤は未接続です。"
        />
        <div className="flex flex-col rounded-xl border border-border bg-surface px-5 py-1 md:px-6">
          {consultationBudget.map((b) => (
            <CostRow
              key={b.label}
              label={b.label}
              note="未契約・支払いなし"
              value={`上限 ${formatYen(b.yen)}`}
              sub="支払済み 0円"
            />
          ))}
          <CostRow
            label="合計（目標額）"
            total
            value={formatYen(st.goalYen)}
            last
          />
        </div>
      </section>

      <section aria-labelledby="sec-money-refund" className="flex flex-col gap-3.5">
        <SectionTitle id="sec-money-refund" title="想定する返金条件（案）" />
        <Callout icon={Undo2}>
          <p>
            募集不成立時は返金。終了後は支払済み・契約拘束中を除いた残額を拠出額に応じて按分する案です。返金方法・時期・手数料・円未満の端数処理は募集開始前に確定して表示します。実際の拠出・返金は行っていません。
          </p>
        </Callout>
      </section>

      <section aria-labelledby="sec-verify" className="flex flex-col gap-3.5">
        <SectionTitle
          id="sec-verify"
          title="検証用情報"
          description="円の決済基盤は未接続です。既存のトークン用コントラクト試作は、日本円を保管・送金する実装ではありません。"
        />
        <dl className="flex flex-col rounded-xl border border-border bg-surface px-5 py-2 md:px-6">
          <KV label="円の決済基盤" labelWidth="w-40">
            <span className="flex flex-wrap items-center gap-2">
              <span>事業者選定中</span>
              <Badge tone="neutral" icon={FlaskConical}>
                未接続
              </Badge>
            </span>
          </KV>
          <KV label="支払ルールの設計案" labelWidth="w-40">
            支払先の条件・費目の上限・確認前の支払い禁止・返金計算
          </KV>
          <KV label="取引履歴" labelWidth="w-40" last>
            デモ値：拠出 {st.contributors}人相当（実際の取引なし）
          </KV>
        </dl>
        <ButtonLink href={routes.budget} variant="text" className="self-start">
          予算・支出の画面を見る（別時点のデモ）
        </ButtonLink>
      </section>
    </div>
  );
}
