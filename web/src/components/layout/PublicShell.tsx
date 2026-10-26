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

/*
 * ヘッダーは一行に組む。二段に折り返すと紙面の骨格が崩れるため、
 * 幅が足りないときは左右の余白を詰め、それでも入らないときだけ縮める。
 * 選択中の項目は藍の下線で示す。
 */
export function PublicHeader({ active = "案件を探す" }: { active?: string }) {
  return (
    <header className="glass sticky top-0 z-30 hidden md:block">
      <div className="mx-auto flex h-[68px] w-full max-w-[1280px] items-center gap-6 px-6 xl:px-8">
        <Logo />
        <nav aria-label="メインメニュー" className="flex min-w-0 items-center gap-1">
          {nav.map((n) => {
            const selected = n.label === active;
            return (
              <Link
                key={n.label}
                href={n.href}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex h-[68px] shrink-0 items-center border-b-2 px-3 text-[15px] transition-surface",
                  selected
                    ? "border-primary font-bold text-primary-dark"
                    : "border-transparent font-medium text-text-sub hover:border-border-strong hover:text-text",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-1">
          <DemoBadge />
          <ButtonLink href={routes.signin} variant="text" className="ml-2">
            ログイン
          </ButtonLink>
          <ButtonLink href={routes.create} variant="secondary" icon={Plus} size="sm" className="ml-1">
            案件を作る
          </ButtonLink>
        </div>
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
    <div className="flex min-h-dvh flex-col">
      <PublicHeader active={active} />
      {mobileTitle ? (
        <MobileHeader title={mobileTitle} backHref={mobileBackHref} />
      ) : (
        <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between px-4 md:hidden">
          <Logo />
          <DemoBadge short />
        </header>
      )}
      <main
        id="main"
        tabIndex={-1}
        className={cn("flex-1 md:pb-0", hasCtaBar ? "pb-[calc(176px+env(safe-area-inset-bottom))]" : "pb-[calc(84px+env(safe-area-inset-bottom))]")}
      >
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}

/** 本文の最大幅 1200px（左右余白 120px @1440） */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-4 md:px-6", className)}>{children}</div>;
}
