"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CircleCheck,
  CircleDashed,
  FilePlus2,
  GitCompareArrows,
  Info,
  Link2,
  Lock,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge, Button, ButtonLink, Callout } from "@/components/ui";
import { routes } from "@/lib/routes";
import { TIMESCAR_EVENT_ID } from "@/lib/eventIds";
import { recruitmentsForEvent } from "@/lib/demoRecruitments";
import { useCreateDraft, type LinkMode } from "./draft";
import { AsideCard, AsideItem } from "./form";
import { FormFooter, WizardFrame } from "./WizardFrame";

export function SimilarStep() {
  const router = useRouter();
  const { update } = useCreateDraft();
  const existingRecruitmentCount = recruitmentsForEvent(TIMESCAR_EVENT_ID).length;
  const go = (linkMode: LinkMode) => {
    update({ linkMode, eventId: linkMode === "existing" ? TIMESCAR_EVENT_ID : null });
    router.push(routes.createDetails);
  };

  return (
    <WizardFrame
      step={1}
      stage="似た案件の確認（段階2／4）"
      next="候補は固定のデモ例です。入力内容の検索や同一性の判断はしていません。"
      mobileNext="候補は固定例です。検索・同一性判断はしていません。既存事件を選ぶとタイムズカー事件へ紐付きます。"
      mobileBackHref={routes.create}
      mobileBare
      asideMobileHidden
      aside={
        <>
          <AsideCard title="既存事件のデモ例を選ぶ場合">
            <AsideItem icon={ShieldCheck}>ここまでの入力や資料が、既存の事件へ自動で移ることはありません。</AsideItem>
            <AsideItem icon={Users}>
              事件ページは作成者のものではありません。誰でも同じ事件に別の目的の募集を追加できます。
            </AsideItem>
            <AsideItem icon={CircleCheck}>既存事件の例を選ばず、新しい事件として進むこともできます。</AsideItem>
          </AsideCard>
          <Callout icon={Lock} tone="neutral">
            <p>資金や個人情報を別の事件に統合する場合は、必ず本人の操作と同意が必要です。</p>
          </Callout>
        </>
      }
      mobileCta={
        <div className="flex gap-3">
          <ButtonLink href={routes.create} variant="secondary" icon={ArrowLeft}>
            戻る
          </ButtonLink>
          <Button variant="secondary" className="flex-1 px-4" onClick={() => go("new")}>
            別の事件として次へ
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-bold text-text md:text-[22px]">既存事件・類似候補の表示例</h2>
        <p className="hidden text-base text-text-sub md:block">
          このデモでは入力内容の検索や一致判定をしていません。候補は固定例です。
        </p>
      </div>

      <Callout icon={Info} tone="neutral">
        <p>
          下の候補は固定例です。「この事件に別の募集を追加」を選ぶと、タイムズカーの事件ページに紐付きます。入力した出来事が別の事件なら、「別の事件として次へ」を選んでください。
        </p>
      </Callout>

      {/* 固定の既存事件例 */}
      <section className="flex flex-col gap-3 rounded-xl border border-primary bg-[#FBFEFE] p-4 md:gap-3.5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2.5">
          <h3 className="flex flex-1 items-center gap-2 text-base font-bold text-primary-dark md:gap-2.5 md:text-lg">
            <Link2 className="size-[18px] shrink-0 md:size-5" aria-hidden />
            既存事件の例
          </h3>
          <div>
            <Badge tone="neutral" icon={CircleDashed}>
              タイムズカー事件への紐付け先
            </Badge>
          </div>
        </div>
        <p className="text-lg font-bold text-text md:text-xl">タイムズカーの個人情報漏えいに関する共同相談</p>
        <p className="hidden text-base text-text-sub md:block">
          2026年9月28日に公表された「タイムズカーWebサイト」への不正アクセスによる会員情報の漏えいについて、当事者が集まり共同で相談する事件ページです。
        </p>
        <p className="text-[13px] text-text-muted md:hidden">
          募集中の相談 {existingRecruitmentCount}件・更新 2026年9月29日
        </p>
        <div className="hidden flex-wrap items-center gap-5 md:flex">
          <Badge tone="primary" icon={Users}>
            募集中の相談 {existingRecruitmentCount}件
          </Badge>
          <span className="text-sm text-text-muted">個人会員向け・法人会員向け</span>
          <span className="text-sm text-text-muted">更新 2026年9月29日</span>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <ButtonLink href={routes.event} icon={UserPlus}>
            この案件に参加する
          </ButtonLink>
          <Button variant="secondary" icon={Plus} onClick={() => go("existing")}>
            この事件に別の募集を追加する
          </Button>
        </div>
      </section>

      {/* 固定の類似候補例 */}
      <section className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-4 md:gap-3 md:p-6">
        <div className="md:hidden">
          <Badge tone="neutral" icon={GitCompareArrows}>
            類似候補の表示例
          </Badge>
        </div>
        <div className="hidden items-center gap-2.5 md:flex">
          <Badge tone="neutral" icon={CircleDashed}>
            固定の候補例
          </Badge>
          <span className="text-sm text-text-muted">入力との照合はしていません</span>
        </div>
        <h3 className="text-base font-bold text-text md:text-lg">
          〔架空の例〕カーシェア予約アプリで他の会員情報が表示された件
        </h3>
        <p className="hidden text-sm text-text-sub md:block">
          予約アプリの表示不具合で、一時的に他の会員の予約情報が見えたとされる出来事。漏えいの公表とは別の出来事の可能性があります。
        </p>
        <div className="flex flex-col items-start md:flex-row md:items-center md:gap-3">
          <Button variant="text" onClick={() => go("new")}>
            別の事件として説明する
          </Button>
        </div>
      </section>

      {/* どちらとも違う */}
      <section className="flex flex-col gap-2 rounded-xl bg-[#F1F5F6] p-4 md:gap-3 md:p-6">
        <h3 className="text-base font-bold text-text">どちらとも違う出来事の場合</h3>
        <p className="hidden text-sm text-text-sub md:block">
          既存の事件との違い（対象のサービス・時期・起きたこと）を一言添えると、参加者が迷わずに済みます。
        </p>
        <p className="text-sm text-text-sub md:hidden">
          既存の候補例に当てはまらない場合も、新しい事件として説明できます。
        </p>
        <div className="hidden md:block">
          <Button variant="secondary" icon={FilePlus2} onClick={() => go("new")}>
            別の事件として説明する
          </Button>
        </div>
      </section>

      <Callout icon={ShieldCheck} tone="neutral" className="md:hidden">
        <p>既存の事件に参加しても、入力内容や資料が自動で移ることはありません。</p>
      </Callout>

      <FormFooter
        left={
          <ButtonLink href={routes.create} variant="secondary" icon={ArrowLeft}>
            戻る
          </ButtonLink>
        }
        right={
          <Button variant="secondary" onClick={() => go("new")}>
            別の事件として次へ
          </Button>
        }
      />
    </WizardFrame>
  );
}
