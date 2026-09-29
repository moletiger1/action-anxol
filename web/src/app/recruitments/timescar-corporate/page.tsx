import type { Metadata } from "next";
import Link from "next/link";
import { Building2, FolderOpen, HandCoins, Info, UserPlus, Users } from "lucide-react";
import { MobileCtaBar, PublicShell } from "@/components/layout";
import { Badge, ButtonLink, Callout, StageBanner, Stepper } from "@/components/ui";
import { Breadcrumb, Wrap } from "@/components/groupA/parts";
import { MobileTop, OverviewTab, SummaryAside } from "@/components/groupA/RecruitmentOverview";
import { MaterialsTab, MoneyTab, ProposalsTab } from "@/components/groupA/RecruitmentOtherTabs";
import { RecruitmentTabs } from "@/components/groupA/RecruitmentTabs";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "法人会員・利用者の共同相談｜集団訴訟.jp（仮）",
};

const steps = ["参加希望の受付", "拠出条件の確定", "弁護士の提案・審議", "共同相談", "相談結果の共有"];

// A03 募集詳細（M_A03 モバイル）
export default function Page() {
  return (
    <PublicShell active="案件を探す" mobileTitle="募集詳細" mobileBackHref={routes.event} hasCtaBar>
      <Wrap className="flex flex-col gap-4 pt-4 pb-6 md:gap-6 md:pt-6 md:pb-24">
        <Breadcrumb
          className="hidden md:block"
          items={[
            { label: "案件を探す", href: routes.home },
            { label: "タイムズカーの個人情報漏えいに関する共同相談", href: routes.event },
            { label: "法人会員・利用者の共同相談" },
          ]}
        />

        <div className="flex flex-col gap-4 md:gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <Badge icon={Users}>参加希望を受付中</Badge>
            <Badge tone="neutral" icon={HandCoins}>拠出条件の確認前</Badge>
            <span className="hidden md:inline-flex">
              <Badge tone="neutral" icon={Building2}>
                法人会員向けの募集
              </Badge>
            </span>
          </div>
          <h1 className="text-2xl leading-snug font-bold text-text md:text-[32px]">
            法人会員・利用者の共同相談
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <Link
              href={routes.event}
              className="flex items-center gap-1.5 text-primary-dark hover:underline"
            >
              <FolderOpen className="size-4" aria-hidden />
              事件：タイムズカーの個人情報漏えい
            </Link>
            <span className="hidden text-text-muted md:inline">募集開始 2026年9月29日</span>
            <span className="hidden text-text-muted md:inline">最終更新 2026年9月29日 18:10</span>
          </div>
        </div>

        <div className="hidden md:block">
          <StageBanner
            stage="参加希望の受付（段階1／5）"
            next="対象に当てはまるか確認して、当事者として参加希望を登録してください。資金募集は、審議・決済・返金条件が確定するまで開始しません。"
          />
        </div>
        <Callout icon={Info} tone="neutral">
          <p>このページは固定デモです。表示金額・人数は架空の画面例で、実際の資金募集・拠出・送金は行っていません。</p>
        </Callout>
        <div className="hidden py-1 lg:block">
            <Stepper steps={steps} current={0} />
        </div>
        <div className="hidden py-1 md:block lg:hidden">
          <Stepper steps={steps} current={0} compact />
        </div>

        <MobileTop />

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="hidden md:block lg:order-last lg:w-[384px] lg:shrink-0">
            <SummaryAside />
          </aside>
          <div className="min-w-0 flex-1">
            <RecruitmentTabs
              items={[
                { key: "overview", label: "概要", content: <OverviewTab /> },
                { key: "materials", label: "資料・更新", content: <MaterialsTab /> },
                { key: "proposals", label: "弁護士の提案", mobileLabel: "提案", content: <ProposalsTab /> },
                { key: "money", label: "お金の記録", content: <MoneyTab /> },
              ]}
            />
          </div>
        </div>
      </Wrap>

      <MobileCtaBar>
        <ButtonLink href={routes.signin} icon={UserPlus} className="w-full">
          当事者として参加する
        </ButtonLink>
        <ButtonLink href={routes.contribute} variant="text" className="self-center">
          拠出手順のデモを見る
        </ButtonLink>
      </MobileCtaBar>
    </PublicShell>
  );
}
