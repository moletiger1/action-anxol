"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronLeft, CirclePlus, FolderOpen, ReceiptText, Search } from "lucide-react";
import type { ReactNode } from "react";
import { DemoBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";

export function MobileHeader({ title, backHref }: { title: string; backHref?: string }) {
  const router = useRouter();
  const backClass =
    "flex size-11 shrink-0 items-center justify-center text-text transition-surface hover:bg-neutral-soft";
  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-1 pr-3 pl-1 md:hidden"
      style={{ paddingLeft: "calc(0.25rem + env(safe-area-inset-left))", paddingRight: "calc(0.75rem + env(safe-area-inset-right))" }}>
      {backHref !== undefined ? (
        <Link href={backHref} aria-label="戻る" className={backClass}>
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
      ) : (
        <button type="button" aria-label="戻る" onClick={() => router.back()} className={backClass}>
          <ChevronLeft className="size-6" aria-hidden />
        </button>
      )}
      <span className="min-w-0 flex-1 truncate font-serif text-[15px] font-bold text-text">
        {title}
      </span>
      <DemoBadge short />
    </header>
  );
}

const tabs = [
  {
    href: routes.home,
    label: "探す",
    icon: Search,
    match: (p: string) =>
      p === "/" || p.startsWith("/events") || (p.startsWith("/recruitments") && !p.endsWith("/budget")),
  },
  {
    href: routes.dashboard,
    label: "参加中",
    icon: FolderOpen,
    match: (p: string) => p.startsWith("/dashboard") && !p.startsWith(routes.notifications),
  },
  { href: routes.create, label: "作る", icon: CirclePlus, match: (p: string) => p.startsWith("/create") },
  {
    href: routes.settlement,
    label: "お金の記録",
    icon: ReceiptText,
    match: (p: string) => p.startsWith("/me") || p.endsWith("/budget"),
  },
  {
    href: routes.notifications,
    label: "通知",
    icon: Bell,
    match: (p: string) => p.startsWith(routes.notifications),
  },
];

/*
 * 下部ナビ。選択中の項目は藍の文字と上端の墨で示す。
 * ラベルは折り返さず、1行に収める（「お金の記録」は短く組む）。
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="メインメニュー"
      className="glass-bar fixed inset-x-0 bottom-0 z-30 flex px-1 pt-1.5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:hidden"
      style={{ minHeight: "calc(84px + env(safe-area-inset-bottom))" }}
    >
      {tabs.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] whitespace-nowrap",
              active ? "font-bold text-primary-dark" : "font-medium text-text-muted",
            )}
          >
            {active && (
              <span aria-hidden className="absolute inset-x-3 top-0 h-0.5 bg-primary" />
            )}
            <Icon className="size-[22px]" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * モバイルの主要CTAバー。下部ナビの上に固定し、本文には重ねない
 * （MobileShell が本文下に同じ高さの余白を確保する）。
 */
export function MobileCtaBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="glass-bar fixed inset-x-0 z-20 flex flex-col items-stretch gap-2 px-4 py-3 md:hidden"
      style={{ bottom: "calc(84px + env(safe-area-inset-bottom))" }}
    >
      {children}
    </div>
  );
}
