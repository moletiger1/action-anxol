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
    <div className="flex min-h-screen flex-col">
      <header className="hidden h-[72px] items-center justify-between border-b border-border bg-surface px-6 md:flex lg:px-[120px]">
        <Link href={recruitmentHref} className="flex items-center gap-4">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary text-white">
            <UsersRound className="size-5" aria-hidden />
          </span>
          <span className="flex flex-col leading-snug">
            <span className="text-[13px] text-text-muted">集団訴訟.jp（仮）</span>
            <span className="text-base font-bold text-text">{recruitmentTitle}に参加</span>
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
      <main className={cn("flex-1 md:pb-0", hasCtaBar ? "pb-[140px]" : "pb-6")}>{children}</main>
    </div>
  );
}
