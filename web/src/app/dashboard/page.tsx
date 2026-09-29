import type { Metadata } from "next";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  Clock3,
  Footprints,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";
import { Badge, Button, ButtonLink, Callout, DemoBadge } from "@/components/ui";
import { FactBox, IconWrap, PageBody, PageHeader } from "@/components/groupD/parts";
import { UnreadUpdates } from "@/components/groupD/UnreadUpdates";
import { DashboardDraftCard } from "@/components/groupB/DashboardDraftCard";
import { DashboardJoinCase } from "@/components/groupB/DashboardJoinCase";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "参加状況｜集団訴訟.jp（仮）",
};

function CaseCard({
  eyebrow,
  title,
  updates,
  badges,
  stage,
  contribution,
  moneyHref,
  action,
}: {
  eyebrow: string;
  title: string;
  updates: number;
  badges: ReactNode;
  stage: string;
  contribution: string;
  moneyHref?: string;
  action: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-5 md:p-6">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-[13px] text-text-muted">{eyebrow}</p>
          <h3 className="text-lg font-bold text-text">{title}</h3>
        </div>
        <div className="shrink-0">
          <Badge tone="primary" icon={Bell}>
            更新例 {updates}件
          </Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{badges}</div>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
        <FactBox label="進行段階" value={stage} />
        <FactBox label="あなたの拠出額" value={contribution} />
      </div>
      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        {moneyHref ? (
          <ButtonLink href={moneyHref} variant="text" className="self-center sm:self-auto">
            お金の記録
          </ButtonLink>
        ) : (
          <Button variant="text" disabled className="self-center sm:self-auto">
            お金の記録は未接続
          </Button>
        )}
        {action}
      </div>
    </article>
  );
}

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

            <CaseCard
              eyebrow="〔架空の例〕個人向けの共同相談"
              title="〔架空〕オンライン英会話の自動更新で二重に請求された件"
              updates={1}
              badges={
                <>
                  <Badge tone="primary" icon={Users}>
                    参加希望のみ登録
                  </Badge>
                  <Badge tone="amber" icon={Clock3}>
                    本人確認：未完了
                  </Badge>
                </>
              }
              stage="段階1／5　参加希望の受付"
              contribution="0（拠出は任意）"
              moneyHref={routes.settlement}
              action={
                <ButtonLink href={routes.decision} variant="secondary">
                  相談後の判断画面例を見る
                </ButtonLink>
              }
            />

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
