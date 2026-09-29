import { FlaskConical, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "primary" | "amber" | "green" | "red" | "neutral";

const tones: Record<BadgeTone, string> = {
  primary: "bg-primary-soft text-primary-dark",
  amber: "bg-amber-soft text-amber",
  green: "bg-green-soft text-green",
  red: "bg-red-soft text-red",
  neutral: "bg-neutral-soft text-text-sub",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium leading-none whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="leading-[1.4]">{children}</span>
    </span>
  );
}

export function DemoBadge({ short }: { short?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-neutral-soft px-2.5 py-1 text-[13px] leading-none text-text-sub whitespace-nowrap">
      <FlaskConical className="size-3.5" aria-hidden />
      <span className="leading-[1.4]">{short ? "デモ" : "デモ表示・数値は架空"}</span>
    </span>
  );
}
