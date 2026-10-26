import { Check } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/cn";

/**
 * 段階表示。current は 0 始まりの現在の段階。
 *
 * 丸いノードではなく、地に引いた一本の線上に段階を並べる。
 * 通過済みは藍で塗り、現在地は墨の枠で囲み、これからは淡く残す。
 * 「完了・現在・これから」は色だけでなく文言でも示す。
 */
export function Stepper({
  steps,
  current,
  className,
  compact,
}: {
  steps: string[];
  current: number;
  className?: string;
  /** モバイル向け：現在の段階だけ文言を出す */
  compact?: boolean;
}) {
  return (
    <ol className={cn("flex w-full items-start gap-2", className)}>
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <Fragment key={label}>
            {i > 0 && (
              <li
                aria-hidden
                className={cn(
                  "mt-4 h-px min-w-3 flex-1",
                  i <= current ? "bg-primary" : "bg-border-strong",
                )}
              />
            )}
            <li className="flex min-w-0 shrink-0 flex-col items-start gap-1.5">
              <span
                className={cn(
                  "tabular flex size-8 items-center justify-center rounded-sm border font-serif text-sm font-bold",
                  state === "done" && "border-primary bg-primary text-white",
                  state === "current" && "border-2 border-text bg-surface text-text",
                  state === "todo" && "border-border-strong bg-surface text-text-muted",
                )}
              >
                {state === "done" ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              {(!compact || state === "current") && (
                <span className="flex min-w-0 flex-col leading-snug">
                  <span
                    className={cn(
                      "text-[11px]",
                      state === "current" ? "font-bold text-text" : "text-text-muted",
                    )}
                  >
                    {state === "done" ? "完了" : state === "current" ? "現在" : "これから"}
                  </span>
                  <span
                    className={cn(
                      "max-w-[9em] text-[13px]",
                      state === "todo" ? "font-medium text-text-sub" : "font-bold text-text",
                    )}
                  >
                    {label}
                  </span>
                </span>
              )}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
