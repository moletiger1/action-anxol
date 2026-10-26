"use client";

import { UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { MobileHeader } from "@/components/layout";
import { ButtonLink, DemoBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";

export const joinSteps = ["対象の確認", "サインイン", "利用区分", "本人確認", "資料の共有", "内容の確認"];

/**
 * 参加登録フロー（B02・B02b）の枠。共通ナビを出さず、閉じる導線だけを置く。
 * モバイルはヘッダー＋本文＋（必要なら）下部CTAバー。
 */
export function JoinShell({
  children,
  mobileTitle,
  mobileBackHref,
  hasCtaBar,
  recruitmentTitle = "法人会員・利用者の共同相談",
  recruitmentHref = routes.recruitment,
}: {
  children: ReactNode;
  mobileTitle: string;
  mobileBackHref: string;
  hasCtaBar?: boolean;
  recruitmentTitle?: string;
  recruitmentHref?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="glass sticky top-0 z-30 hidden h-[68px] items-center justify-between px-6 md:flex lg:px-[120px]">
        <Link href={recruitmentHref} className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
            <UsersRound className="size-[18px]" aria-hidden />
          </span>
          <span className="flex flex-col leading-snug">
            <span className="text-[12px] text-text-muted">集団訴訟.jp（仮）</span>
            <span className="font-display text-[15px] font-bold text-text">
              {recruitmentTitle}に参加
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <DemoBadge />
          <ButtonLink href={recruitmentHref} variant="text">
            閉じる
          </ButtonLink>
        </div>
      </header>
      <MobileHeader title={mobileTitle} backHref={mobileBackHref} />
      <main
        id="main"
        tabIndex={-1}
        className={cn(
          "flex-1 md:pb-0",
          hasCtaBar ? "pb-[calc(140px+env(safe-area-inset-bottom))]" : "pb-6",
        )}
      >
        {children}
      </main>
    </div>
  );
}
