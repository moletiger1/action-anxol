import { type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** グループD（参加後の進捗とお金）の作業画面の本文ラッパー */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1160px] flex-col gap-6 px-4 pt-5 pb-14 md:gap-8 md:px-8 md:pt-8 md:pb-20",
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
    <div className="flex flex-col gap-3 border-b-2 border-text pb-4 md:flex-row md:items-end md:justify-between md:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[13px] text-text-muted">{eyebrow}</p>
        <h1 className="font-display text-2xl leading-snug text-text md:text-[30px]">
          {title}
        </h1>
      </div>
      {right && (
        <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:gap-3">{right}</div>
      )}
    </div>
  );
}

/** ラベル：値 の1行（罫線区切り） */
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
      <dt className={cn("shrink-0 text-[13px] leading-[1.8] text-text-muted sm:w-28", labelClassName)}>
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[15px] leading-[1.8] text-text">{children}</dd>
    </div>
  );
}

/** 箇条書きの1項目（アイコン＋本文） */
export function BulletItem({
  children,
  icon: Icon,
  iconClassName = "text-text-muted",
  className,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
}) {
  /* アイコンを渡されない場合は、小さな墨の四角を打って箇条書きにする */
  if (!Icon) {
    return (
      <li className={cn("flex gap-2.5 text-[15px] leading-[1.8]", className)}>
        <span aria-hidden className="mt-[0.65em] size-1.5 shrink-0 bg-text-muted" />
        <span className="min-w-0 flex-1">{children}</span>
      </li>
    );
  }
  return (
    <li className={cn("flex gap-2.5 text-[15px] leading-[1.8]", className)}>
      <Icon className={cn("mt-1 size-[17px] shrink-0", iconClassName)} aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

/** 事実の一行（進行段階・拠出額など）。面ではなく罫線で区切る */
export function FactBox({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 border-l-2 border-border-strong pl-3">
      <span className="text-[12px] text-text-muted">{label}</span>
      <span className="font-display text-[15px] font-bold text-text">{value}</span>
    </div>
  );
}

/** 見出しの左に置く小さな墨の印 */
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
        "flex shrink-0 items-center justify-center rounded-sm",
        size === 56 ? "size-12" : "size-9",
        className ?? "bg-primary text-white",
      )}
    >
      <Icon className={size === 56 ? "size-6" : "size-[18px]"} aria-hidden />
    </span>
  );
}
