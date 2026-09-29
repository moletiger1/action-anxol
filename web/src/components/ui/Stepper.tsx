import { Check } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/cn";

/**
 * 段階表示。current は 0 始まりの現在の段階。
 * 「完了・現在・これから」をアイコンと文言で区別する。
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
    <ol className={cn("flex w-full items-center gap-3", className)}>
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <Fragment key={label}>
            {i > 0 && (
              <li
                aria-hidden
                className={cn("h-0.5 min-w-4 flex-1", i <= current ? "bg-primary" : "bg-border-strong")}
              />
            )}
            <li className="flex shrink-0 items-center gap-2.5">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm font-bold",
                  state === "done" && "bg-primary text-white",
                  state === "current" && "border-2 border-primary bg-surface text-primary-dark",
                  state === "todo" && "border border-border-strong bg-surface text-text-muted",
                )}
              >
                {state === "done" ? <Check className="size-[18px]" aria-hidden /> : i + 1}
              </span>
              {(!compact || state === "current") && (
                <span className="flex flex-col leading-snug">
                  <span
                    className={cn(
                      "text-xs",
                      state === "current" ? "font-bold text-primary-dark" : "text-text-muted",
                    )}
                  >
                    {state === "done" ? "完了" : state === "current" ? "現在" : "これから"}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
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
