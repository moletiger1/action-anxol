import {
  CircleArrowRight,
  CircleCheck,
  CircleDashed,
  FileSearch,
  Globe,
  Info,
  Lock,
  MessageSquareText,
  ShieldAlert,
  Undo2,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge, BudgetProgress, ButtonLink, Callout, CostRow } from "@/components/ui";
import { cn } from "@/lib/cn";
import { consultationBudget, formatYen, recruitmentStats as st } from "@/lib/demo";
import { routes } from "@/lib/routes";
import { MyJoinStatus } from "./MyJoinStatus";
import { IconItem, KV, SectionTitle, TIMES_SOURCE_TITLE } from "./parts";
import { JumpButton } from "./RecruitmentTabs";
import { TermsDialog } from "./TermsDialog";

export const TERMS_ID = "payment-terms";
export const TERMS_ID_MOBILE = "payment-terms-m";

const metrics = [
  { label: "登録", value: st.registered, note: "参加希望を登録" },
  { label: "本人・関係性の確認", value: st.identityChecked, note: "本人確認と対象との関係を確認済み" },
  { label: "資料確認", value: st.documentsChecked, note: "共有資料の内容確認済み" },
  { label: "拠出", value: st.contributors, note: "共同相談費を拠出" },
];
const REFUND_SUMMARY = "募集不成立時は返金。成立後は支払済み・契約拘束中を除く残額を按分請求できます。相談先未決だけでは返金されません。";

/** 参加の状況。段階ごとの別の数として並べ、合算しない */
function Participation({ id }: { id: string }) {
  return (
    <section aria-labelledby="sec-participation" className="flex flex-col gap-3.5">
      <SectionTitle
        id={id}
        title="参加の状況"
        description={
          <>
            <span className="md:hidden">段階ごとの別の数です。確認済み被害者数ではありません。</span>
            <span className="hidden md:inline">
              人数は段階ごとの別の数です。合計や「確認済み被害者数」ではありません。
            </span>
          </>
        }
      />
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface px-3.5 py-3 md:gap-1 md:px-[18px] md:py-4"
          >
            <dt className="text-[13px] font-bold text-text-sub md:text-sm">{m.label}</dt>
            <dd className="tabular text-[22px] leading-snug font-bold text-text md:text-[28px]">
              {m.value}人
            </dd>
            <dd className="hidden text-[13px] text-text-muted md:block">{m.note}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[13px] text-text-muted">固定デモ値です。下の個人状態は集計に含まれません（2026年9月29日 18:00時点）。</p>
    </section>
  );
}

function Rule({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft">
        <Icon className="size-[18px] text-primary-dark" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h4 className="text-[15px] font-bold text-text">{title}</h4>
        <p className="text-sm text-text-sub">{children}</p>
      </div>
    </div>
  );
}

/** A03 概要タブ（デスクトップ） */
function OverviewDesktop() {
  return (
    <div className="hidden flex-col gap-7 md:flex">
      <section aria-labelledby="sec-target" className="flex flex-col gap-3.5">
        <SectionTitle id="sec-target" title="参加対象" description="次のいずれかに当てはまる方が対象です。" />
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6">
          <ul className="flex flex-col gap-3">
            <IconItem icon={CircleCheck}>タイムズカーの法人会員として契約している企業・団体の担当者</IconItem>
            <IconItem icon={CircleCheck}>法人会員の契約のもとで車両を利用した個人（利用者）</IconItem>
            <IconItem icon={CircleCheck}>
              2026年9月28日に公表された個人情報漏えいについて、通知を受け取った方、または対象か分からない方
            </IconItem>
          </ul>
          <Callout icon={Info}>
            <p>対象か分からない場合も参加希望を登録できます。対象かどうかの確認は、登録後に個別に行います。</p>
          </Callout>
        </div>
      </section>

      <section aria-labelledby="sec-consult" className="flex flex-col gap-3.5">
        <SectionTitle
          id="sec-consult"
          title="相談したいこと"
          description="共同で弁護士に相談し、結果を参加者に共有します。"
        />
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6">
          <ul className="flex flex-col gap-3">
            <IconItem icon={ShieldAlert} iconClass="text-primary-dark">
              漏えいした可能性のある情報の範囲と、法人・利用者それぞれへの影響
            </IconItem>
            <IconItem icon={MessageSquareText} iconClass="text-primary-dark">
              事業者に求める説明・再発防止策と、問い合わせの進め方
            </IconItem>
            <IconItem icon={FileSearch} iconClass="text-primary-dark">
              損害賠償などを求められる可能性があるか、その場合の費用・期間・進め方
            </IconItem>
          </ul>
          <Callout icon={CircleDashed} tone="neutral">
            <p>個人ごとの漏えい項目・被害額・賠償見込みは、現時点で未確定です。</p>
          </Callout>
        </div>
      </section>

      <Participation id="sec-participation-desktop" />
      <MyJoinStatus />

      <section aria-labelledby={TERMS_ID} className="flex flex-col gap-3.5">
        <SectionTitle
          id={TERMS_ID}
          title="この募集の支払条件"
          description="以下は検討中の条件案です。審議・決済・返金の仕組みが確定するまで、資金募集は開始しません。"
        />
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex flex-1 flex-col">
              <h3 className="text-sm font-bold text-text-sub">使い道（相談予算の内訳）</h3>
              {consultationBudget.map((b) => (
                <CostRow key={b.label} label={b.label} value={formatYen(b.yen)} />
              ))}
              <CostRow
                label="合計（目標額）"
                value={formatYen(st.goalYen)}
                last
              />
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <Rule icon={UserCheck} title="誰が確認するか">
                条件案では、参加者から選ばれた支出確認担当が、契約条件と請求内容を確認してから支払う想定です。
              </Rule>
              <Rule icon={Users} title="誰が相談先を決めるか">
                弁護士の提案を比較し、参加者による審議で決定します。選任方法と決定条件は「弁護士の提案」タブに掲載します。
              </Rule>
              <Rule icon={Undo2} title="返金条件の案">
                {`${REFUND_SUMMARY} 実資金での募集条件は未確定です。`}
              </Rule>
            </div>
          </div>
          <Callout icon={Info} tone="neutral">
            <p className="text-base font-bold text-primary-dark">資金募集は未開始です</p>
            <p>
              予算・金額・返金条件は固定デモの表示例です。訴訟への正式依頼は、相談結果を見たうえで本人が個別に決める想定です。
            </p>
          </Callout>
          <div className="flex flex-wrap items-center gap-x-6">
            <TermsDialog />
            <JumpButton tab="money" target="sec-verify">
              支払ルール・入出金の情報
            </JumpButton>
          </div>
        </div>
      </section>

      <section aria-labelledby="sec-sources" className="flex flex-col gap-3.5">
        <SectionTitle
          id="sec-sources"
          title="公表資料・更新"
          description={
            <>
              最新の公表内容を
              <Link href={routes.event} className="text-primary-dark underline-offset-2 hover:underline">
                事件ページ
              </Link>
              で確認できます。
            </>
          }
        />
        <dl className="flex flex-col rounded-xl border border-border bg-surface px-6 py-2">
          <KV label="公表資料" labelWidth="w-40">
            タイムズカー{TIMES_SOURCE_TITLE}2026年9月28日
          </KV>
          <KV label="最新の更新" labelWidth="w-40" last>
            2026年9月29日：固定デモの画面例。実際の資金募集は開始していません
          </KV>
        </dl>
      </section>
    </div>
  );
}

/** A03 概要タブ（モバイル：M_A03 に合わせた短い構成） */
function OverviewMobile() {
  return (
    <div className="flex flex-col gap-4 md:hidden">
      <section aria-labelledby="sec-target-m" className="flex flex-col gap-3.5">
        <SectionTitle id="sec-target-m" title="参加対象" />
        <ul className="flex flex-col gap-3.5">
          <IconItem icon={CircleCheck} className="text-[15px]">
            法人会員として契約している企業・団体の担当者
          </IconItem>
          <IconItem icon={CircleCheck} className="text-[15px]">
            法人会員の契約で車両を利用した個人
          </IconItem>
          <IconItem icon={Info} className="text-[15px]">
            対象か分からない方も登録できます
          </IconItem>
        </ul>
      </section>

      <Participation id="sec-participation-mobile" />
      <MyJoinStatus />

      <section aria-labelledby={TERMS_ID_MOBILE} className="flex flex-col gap-3.5">
        <SectionTitle id={TERMS_ID_MOBILE} title="この募集の支払条件" />
        <dl className="flex flex-col rounded-xl border border-border bg-surface px-4 py-1">
          {[
            { k: "使い道", v: "法律相談・初期調査・資料整理・予備費（計300,000円）" },
            { k: "誰が確認するか", v: "参加者から選ばれた支出確認担当" },
            { k: "返金条件の案", v: REFUND_SUMMARY },
          ].map((r, i, a) => (
            <div
              key={r.k}
              className={cn("flex flex-col gap-0.5 py-3", i < a.length - 1 && "border-b border-border")}
            >
              <dt className="text-[13px] font-bold text-text-muted">{r.k}</dt>
              <dd className="text-[15px] text-text">{r.v}</dd>
            </div>
          ))}
        </dl>
        <TermsDialog />
      </section>
    </div>
  );
}

export function OverviewTab() {
  return (
    <>
      <OverviewDesktop />
      <OverviewMobile />
    </>
  );
}

/** デスクトップ右列の参加サマリー */
export function SummaryAside() {
  return (
    <div className="flex flex-col gap-4">
      <section
        aria-labelledby="sec-summary-card"
        className="flex flex-col gap-[18px] rounded-xl border border-border bg-surface p-6"
      >
        <h2 id="sec-summary-card" className="text-lg font-bold text-text">
          参加サマリー
        </h2>
        <BudgetProgress current={st.currentYen} goal={st.goalYen} />
        <p className="text-[13px] text-text-muted">金額・人数は固定デモ値です。</p>
        <dl className="flex flex-col">
          <KV label="期限の表示例" labelWidth="w-28">
            {st.deadline} 23:59
          </KV>
          <KV label="登録の表示例" labelWidth="w-28">
            {st.registered}人
          </KV>
          <KV label="拠出の表示例" labelWidth="w-28" last>
            {st.contributors}人相当
          </KV>
        </dl>
        <Callout icon={Info}>
          <p>資金募集は未開始です。円建ての固定デモ値で、決済基盤は未接続です。訴訟への正式依頼は相談後に本人が決めます。</p>
        </Callout>
        <div className="flex flex-col gap-3">
          <ButtonLink href={routes.signin} icon={UserPlus} className="w-full">
            当事者として参加する
          </ButtonLink>
          <ButtonLink href={routes.contribute} variant="secondary" className="w-full">
            拠出手順のデモを見る
          </ButtonLink>
        </div>
        <div className="flex flex-col gap-1 pt-1">
          <JumpButton tab="overview" target={TERMS_ID}>
            入金前に使途・決め方・返金条件を確認
          </JumpButton>
          <p className="text-[13px] text-text-muted">
            参加希望の登録は無料です。拠出時は日本円で支払う前提です。
          </p>
        </div>
      </section>

      <section
        aria-labelledby="sec-public-info"
        className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-5"
      >
        <h2 id="sec-public-info" className="text-[15px] font-bold text-text">
          公開される情報
        </h2>
        <div className="flex flex-col items-start gap-2.5">
          <Badge icon={Globe}>人数の内訳・募集条件・更新履歴</Badge>
          <Badge tone="neutral" icon={Lock}>
            参加者名・原本メールは非公開
          </Badge>
        </div>
        <p className="text-[13px] text-text-muted">
          資料は本人の許可がある範囲でのみ、相談先の弁護士に共有されます。
        </p>
      </section>
    </div>
  );
}

/** モバイルの段階カード・段階バー・サマリー（M_A03） */
export function MobileTop() {
  const steps = 5;
  const current = 1;
  return (
    <div className="flex flex-col gap-4 md:hidden">
      <section
        aria-label="現在の段階と次にすること"
        className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4"
      >
        <span className="text-xs text-text-muted">現在の段階</span>
        <span className="text-base font-bold text-text">参加希望の受付中・資金募集前</span>
        <span className="flex items-center gap-1.5 pt-1 text-xs font-bold text-primary-dark">
          <CircleArrowRight className="size-4" aria-hidden />
          次にすること
        </span>
        <p className="text-sm text-text">
          対象に当てはまるか確認して、参加希望を登録してください。資金募集は条件確定後に開始します。
        </p>
      </section>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[13px] font-bold">
          <span className="text-primary-dark">
            段階 {current}／{steps}
          </span>
          <span className="text-text">拠出条件の確定前</span>
        </div>
        <div
          className="flex gap-1"
          role="img"
          aria-label={`全${steps}段階のうち${current}段階目：参加希望の受付`}
        >
          {Array.from({ length: steps }, (_, i) => (
            <span
              key={i}
              className={cn("h-1.5 flex-1 rounded-[3px]", i < current ? "bg-primary" : "bg-border")}
            />
          ))}
        </div>
      </div>

      <section
        aria-label="参加サマリー"
        className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-4"
      >
        <BudgetProgress current={st.currentYen} goal={st.goalYen} />
        <p className="text-[13px] text-text-muted">金額・人数は固定デモ値です。</p>
        <dl className="flex flex-col">
          <KV label="期限の表示例" labelWidth="w-[88px]">
            {st.deadline}
          </KV>
          <KV label="登録の表示例" labelWidth="w-[88px]" last>
            {st.registered}人
          </KV>
        </dl>
        <Callout icon={Info}>
          <p>資金募集は未開始です。円建ての固定デモ値で、決済基盤は未接続です。訴訟への正式依頼は相談後に本人が決めます。</p>
        </Callout>
        <JumpButton tab="overview" target={TERMS_ID_MOBILE}>
          入金前に使途・決め方・返金条件を確認
        </JumpButton>
      </section>
    </div>
  );
}
