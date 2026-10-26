import { FlaskConical, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "primary" | "amber" | "green" | "red" | "neutral";

/*
 * 状態は「印」として置く。塗りつぶしの丸ピルではなく、
 * 淡い地に同系の枠を回した角版にして、台帳に押された印に見せる。
 */
const tones: Record<BadgeTone, string> = {
  primary: "bg-primary-soft text-primary-dark border-primary-line",
  amber: "bg-amber-soft text-amber border-amber-line",
  green: "bg-green-soft text-green border-green-line",
  red: "bg-red-soft text-red border-red-line",
  neutral: "bg-neutral-soft text-text-sub border-border",
};

/** 状態バッジ・公開範囲ラベル。色だけで区別しないよう必ずアイコン＋文言を渡す */
export function Badge({
  tone = "primary",
  icon: Icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[13px] font-bold leading-[1.6] whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      <Icon className="size-[15px] shrink-0" aria-hidden />
      <span>{children}</span>
    </span>
  );
}

/** 全画面に置くデモの印。目立たせず、しかし必ず読める濃さで */
export function DemoBadge({ short }: { short?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong bg-surface px-2 py-0.5 text-[12px] leading-[1.6] text-text-muted whitespace-nowrap">
      <FlaskConical className="size-3.5 shrink-0" aria-hidden />
      <span>{short ? "デモ" : "デモ表示・数値は架空"}</span>
    </span>
  );
}
