import { CircleArrowRight, Flag, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 作業画面上部の「現在の段階」「次にすること」 */
export function StageBanner({
  stage,
  next,
  action,
  className,
}: {
  stage: ReactNode;
  next: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label="現在の段階と次にすること"
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-surface px-6 py-5 md:flex-row md:items-center md:gap-6",
        className,
      )}
    >
      <div className="flex flex-col gap-1 md:w-[340px] md:shrink-0">
        <span className="flex items-center gap-1.5 text-[13px] text-text-muted">
          <Flag className="size-4" aria-hidden />
          現在の段階
        </span>
        <span className="text-lg font-bold text-text">{stage}</span>
      </div>
      <div aria-hidden className="hidden h-14 w-px bg-border md:block" />
      <div className="flex flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-primary-dark">
          <CircleArrowRight className="size-4" aria-hidden />
          次にすること
        </span>
        <span className="text-base text-text">{next}</span>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  );
}

export type PanelTone = "primary" | "neutral" | "red" | "amber" | "green";

const iconTones: Record<PanelTone, string> = {
  primary: "bg-primary-soft text-primary-dark",
  neutral: "bg-neutral-soft text-text-sub",
  red: "bg-red-soft text-red",
  amber: "bg-amber-soft text-amber",
  green: "bg-green-soft text-green",
};

/** 読み込み・空・エラー・権限なし・処理失敗。理由と次の行動を必ず添える */
export function StatePanel({
  icon: Icon,
  tone = "primary",
  title,
  children,
  action,
  className,
  spin,
}: {
  icon: LucideIcon;
  tone?: PanelTone;
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  spin?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-7 text-center",
        className,
      )}
    >
      <span className={cn("flex size-13 items-center justify-center rounded-full", iconTones[tone])}>
        <Icon className={cn("size-6", spin && "animate-spin")} aria-hidden />
      </span>
      <p className="text-lg font-bold text-text">{title}</p>
      <div className="text-sm text-text-sub">{children}</div>
      {action}
    </div>
  );
}

const calloutTones: Record<PanelTone, string> = {
  primary: "bg-primary-soft",
  neutral: "bg-neutral-soft",
  red: "bg-red-soft",
  amber: "bg-amber-soft",
  green: "bg-green-soft",
};
const calloutIcon: Record<PanelTone, string> = {
  primary: "text-primary-dark",
  neutral: "text-text-sub",
  red: "text-red",
  amber: "text-amber",
  green: "text-green",
};

/** 本文中の注意・補足ボックス */
export function Callout({
  icon: Icon,
  tone = "primary",
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  tone?: PanelTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-3 rounded-[10px] px-4 py-3.5", calloutTones[tone], className)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", calloutIcon[tone])} aria-hidden />
      <div className="flex min-w-0 flex-col gap-0.5 text-sm text-text">
        {title && <p className="font-bold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

/** 白背景・境界線・角丸12pxのカード */
export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <As className={cn("rounded-xl border border-border bg-surface p-6", className)}>{children}</As>
  );
}

/** セクション見出し（20px 太字＋補足） */
export function SectionHead({
  title,
  description,
  action,
  as: As = "h2",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <As className="text-xl font-bold text-text">{title}</As>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
