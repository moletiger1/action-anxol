import { Check, CircleArrowRight } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/cn";

/**
 * 作成・参加フローの段階表示（デザインの Stepper）。
 * デスクトップは「完了／現在の段階／これから」付きの横並び、モバイルは段階バー。
 */
export function FlowStepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <>
      <ol aria-label="段階" className="hidden w-full items-start gap-2 md:flex">
        {steps.map((label, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <Fragment key={label}>
              {i > 0 && (
                <li
                  aria-hidden
                  className={cn("mt-4 h-px min-w-3 flex-1", i <= current ? "bg-primary" : "bg-border-strong")}
                />
              )}
              <li
                className="flex min-w-0 shrink-0 flex-col items-start gap-1.5"
                aria-current={state === "current" ? "step" : undefined}
              >
                <span
                  className={cn(
                    "tabular flex size-8 items-center justify-center border font-serif text-sm font-bold",
                    state === "done" && "border-primary bg-primary text-white",
                    state === "current" && "border-2 border-text bg-surface text-text",
                    state === "todo" && "border-border-strong bg-surface text-text-muted",
                  )}
                >
                  {state === "done" ? <Check className="size-4" aria-hidden /> : i + 1}
                </span>
                <span className="flex min-w-0 flex-col leading-snug">
                  <span
                    className={cn(
                      "text-[11px]",
                      state === "current" ? "font-bold text-text" : "text-text-muted",
                    )}
                  >
                    {state === "done" ? "完了" : state === "current" ? "現在の段階" : "これから"}
                  </span>
                  <span
                    className={cn(
                      "max-w-[10em] text-[13px]",
                      state === "todo" ? "font-medium text-text-sub" : "font-bold text-text",
                    )}
                  >
                    {label}
                  </span>
                </span>
              </li>
            </Fragment>
          );
        })}
      </ol>
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex justify-between text-[13px] font-bold">
          <span className="text-primary-dark">
            {current < steps.length ? `段階 ${current + 1}／${steps.length}` : "すべて完了"}
          </span>
          <span className="text-text">{steps[current] ?? steps[steps.length - 1]}</span>
        </div>
        <div
          className="flex gap-1"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={Math.min(current + 1, steps.length)}
          aria-label="段階の進み具合"
        >
          {steps.map((s, i) => (
            <span key={s} className={cn("h-1.5 flex-1", i <= current ? "bg-primary" : "bg-border")} />
          ))}
        </div>
      </div>
    </>
  );
}

/** モバイル用の段階カード（M_B01 の Stage Card） */
export function MobileStageCard({ stage, next }: { stage: string; next: string }) {
  return (
    <section
      aria-label="現在の段階と次にすること"
      className="flex flex-col gap-2 border-l-2 border-primary bg-primary-soft px-4 py-3.5 md:hidden"
    >
      <span className="text-[12px] font-bold text-primary-dark">現在の段階</span>
      <span className="font-serif text-[15px] font-bold text-text">{stage}</span>
      <span className="flex items-center gap-1.5 pt-1 text-[12px] font-bold text-primary-dark">
        <CircleArrowRight className="size-4" aria-hidden />
        次にすること
      </span>
      <p className="text-[13px] leading-[1.75] text-text">{next}</p>
    </section>
  );
}

