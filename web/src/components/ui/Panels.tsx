import { CircleArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * 面の作り方（この世界の唯一の規則）
 *
 * 1. 既定は「面を持たない」。地の上に罫線だけで組む。
 * 2. 面を持つのは、操作を求めるとき（StageBanner）と状態を示すとき（StatePanel）だけ。
 * 3. 影は使わない。区切りは罫線の太さで表す。
 */

/** 作業画面上部の「現在の段階」「次にすること」。藍の面で唯一強調する */
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
        "flex flex-col gap-4 border-l-2 border-primary bg-primary-soft px-5 py-4 md:flex-row md:items-center md:gap-6",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5 md:w-[300px] md:shrink-0">
        <span className="text-[13px] font-bold text-primary-dark">現在の段階</span>
        <span className="font-display text-lg font-bold text-text">{stage}</span>
      </div>
      <div aria-hidden className="hidden h-12 w-px bg-primary-line md:block" />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-primary-dark">
          <CircleArrowRight className="size-4" aria-hidden />
          次にすること
        </span>
        <span className="text-[15px] text-text">{next}</span>
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

/** 読み込み・空・エラー・権限なし・処理失敗。見出しと操作で用が足りるなら本文は足さない */
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
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  spin?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 border border-border bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      <span className={cn("flex size-12 items-center justify-center rounded-sm", iconTones[tone])}>
        <Icon className={cn("size-6", spin && "animate-spin")} aria-hidden />
      </span>
      <p className="font-display text-lg font-bold text-text">{title}</p>
      {children ? (
        <div className="max-w-[26em] text-[14px] leading-[1.8] text-text-sub">{children}</div>
      ) : null}
      {action}
    </div>
  );
}

const calloutTones: Record<PanelTone, string> = {
  primary: "bg-primary-soft text-primary-dark",
  neutral: "bg-neutral-soft text-text-sub",
  red: "bg-red-soft text-red",
  amber: "bg-amber-soft text-amber",
  green: "bg-green-soft text-green",
};

/*
 * 注意・補足。左端の 2px 罫線が色を運ぶので、地は淡くてよい。
 * 枠で囲わないことで、本文と注意書きが同じ紙面に載って見える。
 */
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
    <div className={cn("flex gap-3 border-l-2 px-4 py-3", calloutTones[tone], className)}>
      <Icon className="mt-1 size-[18px] shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-col gap-1 text-sm leading-[1.8] text-text">
        {title && <p className="font-bold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

/**
 * 台帳の一枚。既定では面を持たず、罫線と余白だけで内容を包む。
 * `boxed` を渡したときだけ白地と枠を与える（本当に独立した紙片のときだけ）。
 */
export function Card({
  children,
  className,
  as: As = "div",
  boxed,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
  boxed?: boolean;
}) {
  return (
    <As
      className={cn(
        boxed ? "border border-border bg-surface p-6" : "border-t border-border pt-5",
        className,
      )}
    >
      {children}
    </As>
  );
}

/** 節の見出し。上端に墨の一本を引き、見出しが節の始まりを示す */
export function SectionHead({
  title,
  description,
  action,
  as: As = "h2",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <As className="font-display text-xl leading-snug font-bold text-text">{title}</As>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** 墨の一本を上端に引いた節見出し（台帳の見出し行） */
export function RuleHead({
  title,
  description,
  action,
  as: As = "h2",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("rule-head flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <As className="font-display text-lg leading-snug font-bold text-text">{title}</As>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
