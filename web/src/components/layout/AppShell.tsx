"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  FilePenLine,
  FolderOpen,
  IdCard,
  Inbox,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { DemoBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { Logo } from "./Logo";
import { MobileBottomNav, MobileHeader } from "./MobileNav";

type NavItem = { href: string; label: string; icon: LucideIcon; count?: number; key: string };

const participantNav: NavItem[] = [
  { key: "search", href: routes.home, label: "案件を探す", icon: Search },
  { key: "joined", href: routes.dashboard, label: "参加中の案件", icon: FolderOpen },
  { key: "money", href: routes.settlement, label: "お金の記録", icon: ReceiptText },
  { key: "notifications", href: routes.notifications, label: "通知", icon: Bell, count: 3 },
];

const lawyerNav: NavItem[] = [
  { key: "open", href: routes.lawyerProposal, label: "提案できる募集", icon: Inbox },
  { key: "drafts", href: routes.lawyerProposal, label: "提案の下書き", icon: FilePenLine },
  { key: "sent", href: routes.lawyerProposal, label: "送信済みの提案", icon: Send },
  { key: "conflict", href: routes.lawyerProposal, label: "利益相反の確認", icon: ShieldCheck },
  { key: "license", href: routes.lawyerProposal, label: "資格・本人確認", icon: IdCard },
];

/*
 * 目次としてのナビ。選択中の項目だけ藍の面と左端の墨で示し、
 * 未選択は面を持たない。件数は藍の角版に白字で置く。
 */
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-11 items-center gap-3 rounded-sm pr-3 pl-3.5 text-[15px] transition-surface",
        active
          ? "bg-primary-soft font-bold text-primary-dark"
          : "text-text-sub hover:bg-neutral-soft hover:text-text",
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 bg-primary" />}
      <Icon className="size-[19px] shrink-0" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.count !== undefined && (
        <span className="tabular rounded-sm bg-primary px-1.5 text-[12px] leading-[1.5] font-bold text-white">
          {item.count}
        </span>
      )}
    </Link>
  );
}

function Account({ title, sub, lawyer }: { title: string; sub: string; lawyer?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-border pt-4">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-sm",
          lawyer ? "border border-primary-line bg-primary-soft" : "bg-neutral-soft",
        )}
      >
        <User className="size-[17px] text-text-sub" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col leading-snug">
        <span className="truncate text-[13px] font-bold text-text">{title}</span>
        <span className="truncate text-[12px] text-text-muted">{sub}</span>
      </span>
    </div>
  );
}

function Sidebar({ active, lawyer }: { active?: string; lawyer?: boolean }) {
  const items = lawyer ? lawyerNav : participantNav;
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh w-[252px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-border px-3.5 py-5 md:flex",
        lawyer ? "bg-primary-soft" : "bg-surface",
      )}
    >
      <div className="px-1">
        <Logo />
      </div>
      {lawyer ? (
        <div className="flex items-center gap-2 border-l-2 border-primary bg-surface px-3 py-2.5 text-[13px] font-bold text-primary-dark">
          <BriefcaseBusiness className="size-[17px] shrink-0" aria-hidden />
          弁護士用ワークスペース
        </div>
      ) : (
        <ButtonLink href={routes.create} variant="secondary" icon={Plus} size="sm" className="w-full">
          案件を作る
        </ButtonLink>
      )}
      <nav
        aria-label={lawyer ? "弁護士用メニュー" : "メインメニュー"}
        className="flex flex-col gap-0.5"
      >
        {items.map((it) => (
          <NavLink key={it.key} item={it} active={it.key === active} />
        ))}
      </nav>
      <div className="flex-1" />
      {lawyer ? (
        <ButtonLink href={routes.dashboard} variant="text" className="px-1">
          参加者用の画面へ戻る
        </ButtonLink>
      ) : (
        <Link
          href={routes.lawyerProposal}
          className="flex items-start gap-2.5 border border-border bg-surface px-3 py-3 transition-surface hover:border-primary-line hover:bg-primary-soft"
        >
          <BriefcaseBusiness className="mt-0.5 size-[19px] shrink-0 text-text-sub" aria-hidden />
          <span className="flex min-w-0 flex-col leading-snug">
            <span className="text-[13px] font-bold text-text">弁護士用ワークスペース</span>
            <span className="text-[12px] text-text-muted">提案の作成・送信はこちら</span>
          </span>
        </Link>
      )}
      {lawyer ? (
        <Account title="弁護士アカウント" sub="デモ用の架空アカウント" lawyer />
      ) : (
        <Account title="あなたのアカウント" sub="メールでサインイン中" />
      )}
      <div className="pb-1">
        <DemoBadge />
      </div>
    </aside>
  );
}

/**
 * ログイン後の作業画面。デスクトップは共通サイドバー、モバイルはヘッダー＋下部ナビ。
 * active: participant は search/joined/money/notifications、lawyer は open/drafts/sent/conflict/license
 */
export function AppShell({
  children,
  active,
  lawyer,
  mobileTitle,
  mobileBackHref,
  hasCtaBar,
}: {
  children: ReactNode;
  active?: string;
  lawyer?: boolean;
  mobileTitle: string;
  mobileBackHref?: string;
  hasCtaBar?: boolean;
}) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-dvh">
      <Sidebar active={active} lawyer={lawyer} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader title={mobileTitle} backHref={mobileBackHref} />
        <main
          id="main"
          tabIndex={-1}
          key={pathname}
          className={cn("flex-1 md:pb-0", hasCtaBar ? "pb-[calc(176px+env(safe-area-inset-bottom))]" : "pb-[calc(84px+env(safe-area-inset-bottom))]")}
        >
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
