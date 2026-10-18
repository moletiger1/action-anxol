import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarClock,
  Clock3,
  Footprints,
} from "lucide-react";
import { AppShell } from "@/components/layout";
import { Badge, ButtonLink, Callout, DemoBadge } from "@/components/ui";
import { IconWrap, PageBody, PageHeader } from "@/components/groupD/parts";
import { UnreadUpdates } from "@/components/groupD/UnreadUpdates";
import { DashboardDraftCard } from "@/components/groupB/DashboardDraftCard";
import { DashboardJoinCase } from "@/components/groupB/DashboardJoinCase";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "参加状況｜集団訴訟.jp（仮）",
};

export default function DashboardPage() {
  return (
    <AppShell active="joined" mobileTitle="参加状況">
      <PageBody>
        <PageHeader
          eyebrow="ダッシュボード"
          title="参加状況"
          right={
            <span className="hidden md:inline-flex">
              <DemoBadge />
            </span>
          }
        />

        <Callout icon={Footprints} tone="neutral">
          <p>辞退後の契約条件、入金取消後の返金予約、公開カタログの再照合を、架空データで操作できます。</p>
          <ButtonLink href={routes.workflows} variant="text">辞退・返金・カタログの操作デモへ</ButtonLink>
        </Callout>

        {/* 固定デモ：提案・審議段階の画面例 */}
        <section
          aria-labelledby="next-step-title"
          className="flex flex-col gap-5 rounded-[14px] border border-primary bg-surface p-5 md:flex-row md:items-center md:gap-6 md:p-7"
        >
          <IconWrap icon={Footprints} size={56} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="text-sm font-bold text-primary-dark">進行画面の例（段階3／5）</p>
            <h2 id="next-step-title" className="text-xl font-bold text-text md:text-2xl">
              弁護士の提案を比べて、気になる点を質問する
            </h2>
            <p className="text-base text-text-sub">
              提案・審議段階の固定デモです。上のあなたの参加状態とは連動しません。質問への回答は、審議役が相談先を選ぶときの判断材料になります。
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-0.5">
              <Badge tone="amber" icon={Clock3}>
                質問の受付：2026年12月20日まで
              </Badge>
              <span className="text-sm text-text-muted">所要時間の目安：10分</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 md:items-center">
            <ButtonLink href={routes.proposals} icon={ArrowRight}>
              提案を比較する
            </ButtonLink>
            <ButtonLink href="#joined-cases" variant="text" className="self-center">
              あとで行う
            </ButtonLink>
          </div>
        </section>

        <div className="flex flex-col gap-7 lg:flex-row">
          <section aria-labelledby="joined-cases" className="flex min-w-0 flex-1 flex-col gap-4">
            <h2 id="joined-cases" className="scroll-mt-20 text-xl font-bold text-text">
              参加状態（デモ）と画面例
            </h2>

            <DashboardJoinCase recruitmentId="timescar-corporate" />
            <DashboardJoinCase recruitmentId="timescar-individual" />


            <DashboardDraftCard />
          </section>

          <aside className="flex w-full flex-col gap-4 lg:w-[340px] lg:shrink-0">
            <UnreadUpdates />
            <Callout icon={CalendarClock}>
              <p>このページの段階・日付は、A03とは別時点（提案・審議の段階）のデモです。</p>
            </Callout>
          </aside>
        </div>
      </PageBody>
    </AppShell>
  );
}
