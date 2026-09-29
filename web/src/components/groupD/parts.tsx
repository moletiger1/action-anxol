import { Dot, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** グループD（参加後の進捗とお金）の作業画面の本文ラッパー */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 pt-4 pb-10 md:gap-6 md:px-9 md:pt-7 md:pb-18",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 画面上部のパンくず＋見出し＋右側のバッジ */
export function PageHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm text-text-muted">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-text md:text-[28px] md:leading-[1.4]">{title}</h1>
      </div>
      {right && <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:gap-4">{right}</div>}
    </div>
  );
}

/** ラベル：値 の1行（下線区切り） */
export function KVRow({
  label,
  children,
  labelClassName = "md:w-40",
  last,
}: {
  label: ReactNode;
  children: ReactNode;
  labelClassName?: string;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4",
        !last && "border-b border-border",
      )}
    >
      <dt className={cn("shrink-0 text-sm text-text-muted sm:w-28", labelClassName)}>{label}</dt>
      <dd className="min-w-0 flex-1 text-[15px] text-text">{children}</dd>
    </div>
  );
}

/** 箇条書きの1項目（アイコン＋本文） */
export function BulletItem({
  children,
  icon: Icon = Dot,
  iconClassName = "text-text-sub",
  className,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <li className={cn("flex gap-2.5", className)}>
      <span className="flex h-[1.6em] shrink-0 items-center">
        <Icon className={cn("size-[18px]", iconClassName)} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

/** 事実の小さなボックス（進行段階・拠出額など） */
export function FactBox({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-[10px] bg-[#F4F6F9] px-3.5 py-2.5">
      <span className="text-[13px] text-text-muted">{label}</span>
      <span className="text-[15px] font-bold text-text">{value}</span>
    </div>
  );
}

/** 角丸10pxのアイコン枠 */
export function IconWrap({
  icon: Icon,
  size = 40,
  className,
}: {
  icon: LucideIcon;
  size?: 40 | 56;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === 56 ? "size-14 rounded-[14px]" : "size-10 rounded-[10px]",
        className ?? "bg-primary-soft text-primary-dark",
      )}
    >
      <Icon className={size === 56 ? "size-7" : "size-5"} aria-hidden />
    </span>
  );
}
