import type { Metadata } from "next";
import { ArrowRight, FolderOpen, Info, UserRound, Users } from "lucide-react";
import { PublicShell } from "@/components/layout";
import { Badge, ButtonLink, Callout, StageBanner } from "@/components/ui";
import { Breadcrumb, KV, SectionTitle, Wrap } from "@/components/groupA/parts";
import { MyJoinStatus } from "@/components/groupA/MyJoinStatus";
import { demoRecruitments } from "@/lib/demoRecruitments";
import { routes } from "@/lib/routes";

const recruitment = demoRecruitments.find((item) => item.id === "timescar-individual")!;

export const metadata: Metadata = {
  title: "個人会員向けの共同相談｜集団訴訟.jp（仮）",
};

export default function Page() {
  return (
    <PublicShell active="案件を探す" mobileTitle="募集詳細" mobileBackHref={routes.event}>
      <Wrap className="flex flex-col gap-6 pt-5 pb-12 md:pt-6 md:pb-24">
        <Breadcrumb
          className="hidden md:block"
          items={[
            { label: "案件を探す", href: routes.home },
            { label: "タイムズカーの個人情報漏えいに関する共同相談", href: routes.event },
            { label: "個人会員向けの共同相談" },
          ]}
        />
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge icon={Users}>参加希望を受付中</Badge>
            <Badge tone="neutral" icon={FolderOpen}>タイムズカーの事件ページに掲載</Badge>
          </div>
          <h1 className="text-2xl font-bold text-text md:text-[32px]">{recruitment.title}</h1>
          <p className="flex items-center gap-2 text-sm text-primary-dark"><UserRound className="size-4" aria-hidden />タイムズカーの個人情報漏えいに関する共同相談</p>
        </div>
        <StageBanner
          stage="参加希望の受付（資金募集前）"
          next="対象に当てはまるか確認し、参加希望を登録してください。参加登録だけで弁護士への依頼や資金の拠出にはなりません。"
        />
        <Callout icon={Info} tone="neutral">
          <p>固定デモの画面例です。表示人数は架空で、本人確認・資料送信・資金募集は行いません。</p>
        </Callout>
        <section className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-5 md:p-7">
          <SectionTitle title="募集内容" />
          <dl className="flex flex-col">
            <KV label="対象">{recruitment.target}</KV>
            <KV label="目的">{recruitment.purpose}</KV>
            <KV label="状況" last>{recruitment.status}</KV>
          </dl>
          <p className="text-sm text-text-sub">対象かどうか分からない場合も、参加希望を登録できます。個別の対象確認はこのデモでは行いません。</p>
        </section>
        <MyJoinStatus recruitmentId="timescar-individual" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={routes.individualSignin} icon={ArrowRight}>個人会員として参加希望を登録</ButtonLink>
          <ButtonLink href={routes.event} variant="secondary">事件ページへ戻る</ButtonLink>
        </div>
      </Wrap>
    </PublicShell>
  );
}
