import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 1440px で左右120px・本文1200px（公開ヘッダーの左右端と揃える） */
export function Wrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1248px] px-4 md:px-6", className)}>{children}</div>;
}

export function Breadcrumb({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="パンくずリスト" className={className}>
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="size-3.5 text-text-muted" aria-hidden />}
            {it.href ? (
              <Link href={it.href} className="text-primary-dark hover:underline">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-text-muted">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** アイコン付きの箇条書き1行 */
export function IconItem({
  icon: Icon,
  iconClass = "text-primary",
  children,
  className,
}: {
  icon: LucideIcon;
  iconClass?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <li className={cn("flex gap-2.5 text-base text-text", className)}>
      <span className="flex h-[26px] shrink-0 items-center">
        <Icon className={cn("size-[18px]", iconClass)} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

/** ラベルと値の1行（境界線区切り） */
export function KV({
  label,
  children,
  labelWidth = "w-14",
  last,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  labelWidth?: string;
  last?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-4 py-2.5", !last && "border-b border-border", className)}>
      <dt className={cn("shrink-0 text-sm leading-[1.7] text-text-muted", labelWidth)}>{label}</dt>
      <dd className="min-w-0 flex-1 text-[15px] text-text">{children}</dd>
    </div>
  );
}

/** 見出し（20px 太字）＋補足。セクションの上に置く */
export function SectionTitle({
  title,
  description,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 id={id} tabIndex={id ? -1 : undefined} className="scroll-mt-20 text-xl font-bold text-text">
        {title}
      </h2>
      {description && <p className="text-sm text-text-muted">{description}</p>}
    </div>
  );
}

/** 外部リンク（テキストボタンの見た目） */
export function ExternalTextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 items-center gap-1.5 self-start px-1 text-base font-medium text-primary-dark hover:underline"
    >
      {children}
      <ChevronRight className="size-[18px]" aria-hidden />
      <span className="sr-only">（新しいタブで開きます）</span>
    </a>
  );
}

export const TIMES_SOURCE_URL = "https://share.timescar.jp/news/2026/0928/1815.html";
export const TIMES_SOURCE_TITLE =
  "「タイムズカーWebサイト」への不正アクセスに関する調査結果および今後の対応について（第2報）";
