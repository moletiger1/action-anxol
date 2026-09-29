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
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-border bg-surface pr-3 pl-1 md:hidden">
      {backHref !== undefined ? (
        <Link
          href={backHref}
          aria-label="戻る"
          className="flex size-11 items-center justify-center"
        >
          <ChevronLeft className="size-6 text-text" aria-hidden />
        </Link>
      ) : (
        <button
          type="button"
          aria-label="戻る"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center"
        >
          <ChevronLeft className="size-6 text-text" aria-hidden />
        </button>
      )}
      <span className="flex-1 truncate text-base font-bold text-text">{title}</span>
      <DemoBadge short />
    </header>
  );
}

const tabs = [
  { href: routes.home, label: "探す", icon: Search, match: (p: string) => p === "/" || p.startsWith("/events") || p.startsWith("/recruitments") && !p.endsWith("/budget") },
  { href: routes.dashboard, label: "参加中", icon: FolderOpen, match: (p: string) => p.startsWith("/dashboard") && !p.startsWith(routes.notifications) },
  { href: routes.create, label: "作る", icon: CirclePlus, match: (p: string) => p.startsWith("/create") },
  { href: routes.settlement, label: "お金の記録", icon: ReceiptText, match: (p: string) => p.startsWith("/me") || p.endsWith("/budget") },
  { href: routes.notifications, label: "通知", icon: Bell, match: (p: string) => p.startsWith(routes.notifications) },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="メインメニュー"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[84px] border-t border-border bg-surface px-2 pt-2 pb-5 md:hidden"
    >
      {tabs.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
              active ? "text-primary-dark" : "text-text-muted",
            )}
          >
            <Icon className="size-6" aria-hidden />
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
    <div className="fixed inset-x-0 bottom-[84px] z-20 flex flex-col items-stretch gap-2 border-t border-border bg-surface px-4 py-3 md:hidden">
      {children}
    </div>
  );
}
