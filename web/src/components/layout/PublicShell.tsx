import Link from "next/link";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { DemoBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { Logo } from "./Logo";
import { MobileBottomNav, MobileHeader } from "./MobileNav";

const nav = [
  { href: routes.home, label: "案件を探す" },
  { href: routes.howItWorks, label: "使い方" },
  { href: routes.moneyRules, label: "お金の仕組み" },
  { href: routes.lawyerProposal, label: "弁護士の方へ" },
];

export function PublicHeader({ active = "案件を探す" }: { active?: string }) {
  return (
    <header className="hidden h-[72px] items-center justify-between border-b border-border bg-surface px-6 md:flex lg:px-[120px]">
      <div className="flex items-center gap-12">
        <Logo />
        <nav aria-label="メインメニュー" className="flex items-center gap-8">
          {nav.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              aria-current={n.label === active ? "page" : undefined}
              className={cn(
                "text-[15px]",
                n.label === active ? "font-bold text-primary-dark" : "font-medium text-text-sub hover:text-text",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <DemoBadge />
        <ButtonLink href={routes.signin} variant="text">
          ログイン
        </ButtonLink>
        <ButtonLink href={routes.create} variant="secondary" icon={Plus} size="sm">
          案件を作る
        </ButtonLink>
      </div>
    </header>
  );
}

/**
 * 公開ページ（ヘッダー）。モバイルではモバイルヘッダー＋下部ナビ。
 * hasCtaBar=true のときは MobileCtaBar の高さ分だけ下余白を足す。
 */
export function PublicShell({
  children,
  mobileTitle,
  mobileBackHref,
  hasCtaBar,
  active,
}: {
  children: ReactNode;
  mobileTitle?: string;
  mobileBackHref?: string;
  hasCtaBar?: boolean;
  active?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader active={active} />
      {mobileTitle ? (
        <MobileHeader title={mobileTitle} backHref={mobileBackHref} />
      ) : (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
          <Logo />
          <DemoBadge short />
        </header>
      )}
      <main className={cn("flex-1 md:pb-0", hasCtaBar ? "pb-[176px]" : "pb-[84px]")}>{children}</main>
      <MobileBottomNav />
    </div>
  );
}

/** 本文の最大幅 1200px（左右余白 120px @1440） */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-4 md:px-6", className)}>{children}</div>;
}
