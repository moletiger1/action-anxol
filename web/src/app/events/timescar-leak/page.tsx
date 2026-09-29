import type { Metadata } from "next";
import {
  ArrowRight,
  Building2,
  Check,
  CircleCheck,
  CircleDashed,
  FolderOpen,
  HandCoins,
  Lock,
  User,
  Users,
} from "lucide-react";
import { PublicShell } from "@/components/layout";
import { Badge, ButtonLink, Callout, StageBanner } from "@/components/ui";
import { EventHistory, SuggestUpdate } from "@/components/groupA/EventInteractive";
import {
  Breadcrumb,
  ExternalTextLink,
  IconItem,
  KV,
  SectionTitle,
  TIMES_SOURCE_TITLE,
  TIMES_SOURCE_URL,
  Wrap,
} from "@/components/groupA/parts";
import { routes } from "@/lib/routes";
import { TIMESCAR_EVENT_ID } from "@/lib/eventIds";
import { recruitmentsForEvent } from "@/lib/demoRecruitments";

export const metadata: Metadata = {
  title: "タイムズカーの個人情報漏えいに関する共同相談｜集団訴訟.jp（仮）",
};

const EVENT_TITLE = "タイムズカーの個人情報漏えいに関する共同相談";
const EVENT_ID = TIMESCAR_EVENT_ID;

const eventRecruitments = recruitmentsForEvent(EVENT_ID);

const known = [
  "「タイムズカーWebサイト」への不正アクセスについて、調査結果（第2報）が公表された（2026年9月28日）",
  "公表資料では、氏名・住所・生年月日・連絡先・運転免許情報などが対象とされ、クレジットカード情報は含まれないとされている",
  "対象者への個別通知を順次行うとされ、問い合わせ窓口が案内されている",
];

const unknown = [
  "一人ひとりについて、どの項目が漏えいしたか",
  "法人契約の利用者一人ひとりが、どの範囲で対象になるか",
  "被害の有無・金額と、賠償が受けられるかどうか",
];

const history = [
  {
    at: "2026年9月29日 18:10",
    text: "法人会員・利用者の共同相談で、拠出条件を確認中です（資金募集は未開始）",
  },
  { at: "2026年9月29日 10:30", text: "法人会員・利用者の共同相談が追加されました" },
  { at: "2026年9月28日 21:05", text: "事件ページが作成され、個人会員向けの共同相談が始まりました" },
];

// A02 共通事件ページ
export default function Page() {
  return (
    <PublicShell active="案件を探す" mobileTitle="事件ページ" mobileBackHref={routes.home}>
      <Wrap className="flex flex-col gap-6 pt-5 pb-12 md:pt-6 md:pb-24">
        <Breadcrumb
          className="hidden md:block"
          items={[{ label: "案件を探す", href: routes.home }, { label: EVENT_TITLE }]}
        />

        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral" icon={FolderOpen}>
              共通の事件ページ
            </Badge>
            <Badge icon={Users}>募集中の相談 {eventRecruitments.length}件</Badge>
            <span className="text-[13px] text-text-muted">個人情報・プライバシー</span>
          </div>
          <h1 className="text-2xl leading-snug font-bold text-text md:text-[32px]">{EVENT_TITLE}</h1>
          <p className="max-w-[800px] text-sm text-text-muted">
            同じ出来事のページは一つです。最初の作成者だけのページではなく、誰でも別の目的の募集を追加できます。
          </p>
        </div>

        <StageBanner
          stage={`募集中の相談が${eventRecruitments.length}件あります`}
          next="あなたの立場（個人会員／法人会員・利用者）と相談したいことに合う募集を選び、参加希望を登録してください。"
        />
        <Callout icon={Lock} tone="neutral">
          <p>人数・募集状況は固定デモの例です。実際の資金募集・拠出・送金は行っていません。</p>
        </Callout>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-8">
            <section aria-labelledby="sec-recruitments" className="flex flex-col gap-3.5">
              <SectionTitle
                id="sec-recruitments"
                title="この出来事について募集中の相談"
                description="対象と目的から選んでください。人数や資金は募集ごとに管理され、合算されません。"
              />
              <div className="flex flex-col gap-4 md:flex-row">
                {eventRecruitments.map((r) => {
                  const Icon = r.audience === "individual" ? User : Building2;
                  const BadgeIcon = r.audience === "individual" ? Users : HandCoins;
                  return (
                    <article
                      key={r.title}
                      className="flex flex-1 flex-col gap-3.5 rounded-xl border border-border bg-surface p-6"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft">
                          <Icon className="size-5 text-primary-dark" aria-hidden />
                        </span>
                        <h3 className="text-lg font-bold text-text">{r.title}</h3>
                      </div>
                      <Badge icon={BadgeIcon} className="self-start">
                        {r.badge}
                      </Badge>
                      <dl className="flex flex-col">
                        <KV label="対象">{r.target}</KV>
                        <KV label="目的">{r.purpose}</KV>
                        <KV label="状況" last>
                          <span className="tabular">{r.status}</span>
                        </KV>
                      </dl>
                      <ButtonLink
                        href={r.href}
                        variant="secondary"
                        icon={ArrowRight}
                        className="mt-auto w-full"
                      >
                        この募集を見る
                      </ButtonLink>
                    </article>
                  );
                })}
              </div>
              <div className="flex flex-col gap-x-3 sm:flex-row sm:items-center">
                <ButtonLink href={routes.create} variant="text" className="self-start">
                  別の相談目的で募集する
                </ButtonLink>
                <span className="text-[13px] text-text-muted">
                  例：再発防止の要望、クレジットカード情報の確認など
                </span>
              </div>
            </section>

            <section aria-labelledby="sec-summary" className="flex flex-col gap-3.5">
              <SectionTitle id="sec-summary" title="出来事の概要" />
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6">
                <p className="text-base text-text">
                  2026年9月28日、タイムズカーの運営会社は「タイムズカーWebサイト」への不正アクセスに関する調査結果（第2報）を公表しました。公表資料では、会員等の氏名・住所・連絡先・運転免許情報などが対象とされ、対象者には個別の通知を順次行うとしています。
                </p>
                <p className="text-[15px] text-text-sub">
                  このページでは、公表資料で確認できることと、まだ分かっていないことを分けて整理しています。記載は公表資料と参加者からの更新提案に基づき、更新のたびに履歴を残します。
                </p>
              </div>
            </section>

            <section aria-labelledby="sec-known" className="flex flex-col gap-3.5">
              <SectionTitle id="sec-known" title="分かっていること／未確認のこと" />
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex flex-1 flex-col gap-2.5 rounded-xl border border-border bg-surface p-5">
                  <h3 className="flex items-center gap-2 text-base font-bold text-green">
                    <CircleCheck className="size-[18px]" aria-hidden />
                    分かっていること（公表資料より）
                  </h3>
                  <ul className="flex flex-col gap-2.5">
                    {known.map((t) => (
                      <IconItem key={t} icon={Check} iconClass="text-green" className="text-[15px]">
                        {t}
                      </IconItem>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-1 flex-col gap-2.5 rounded-xl border border-border bg-[#F4F6F9] p-5">
                  <h3 className="flex items-center gap-2 text-base font-bold text-text-sub">
                    <CircleDashed className="size-[18px]" aria-hidden />
                    未確認のこと
                  </h3>
                  <ul className="flex flex-col gap-2.5">
                    {unknown.map((t) => (
                      <IconItem
                        key={t}
                        icon={CircleDashed}
                        iconClass="text-text-sub"
                        className="text-[15px]"
                      >
                        {t}
                      </IconItem>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section aria-labelledby="sec-history" className="flex flex-col gap-3.5">
              <SectionTitle
                id="sec-history"
                title="更新履歴（表示例）"
                description="この履歴は固定デモ表示です。実際の変更記録とは連動していません。"
              />
              <EventHistory items={history} />
            </section>
          </div>

          <aside className="flex flex-col gap-4 lg:w-[352px] lg:shrink-0">
            <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
              <h2 className="text-base font-bold text-text">公表資料</h2>
              <div className="flex flex-col gap-1 rounded-[10px] bg-[#F4F6F9] p-3.5">
                <p className="text-[15px] font-bold text-text">{TIMES_SOURCE_TITLE}</p>
                <p className="text-[13px] break-all text-text-muted">
                  share.timescar.jp/news/2026/0928/1815.html
                </p>
                <p className="text-[13px] text-text-muted">公表日 2026年9月28日</p>
              </div>
              <ExternalTextLink href={TIMES_SOURCE_URL}>外部サイトで開く</ExternalTextLink>
            </section>

            <section className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-5">
              <h2 className="text-base font-bold text-text">このページで公開しないもの</h2>
              <div className="flex flex-col items-start gap-2.5">
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
                資料は各募集の中で、本人が許可した範囲にだけ共有されます。
              </p>
            </section>

            <section className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-5">
              <h2 className="text-base font-bold text-text">内容の誤りに気づいたら</h2>
              <p className="text-sm text-text-sub">
                更新提案フォームの操作例です。入力内容は送信・保存されず、ページにも反映されません。
              </p>
              <SuggestUpdate />
            </section>
          </aside>
        </div>
      </Wrap>
    </PublicShell>
  );
}
