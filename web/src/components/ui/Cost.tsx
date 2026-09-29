import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatYen } from "@/lib/demo";

/** 費用明細の1行。金額は右揃え、補足は別の行・別の色 */
export function CostRow({
  label,
  note,
  value,
  sub,
  total,
  last,
  className,
}: {
  label: ReactNode;
  note?: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  total?: boolean;
  last?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 py-3",
        !last && "border-b border-border",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-base", total ? "font-bold text-text" : "text-text-sub")}>{label}</span>
        {note && <span className="text-[13px] text-text-muted">{note}</span>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span className={cn("tabular font-bold text-text", total ? "text-lg" : "text-base")}>{value}</span>
        {sub && <span className="tabular text-[13px] text-text-muted">{sub}</span>}
      </div>
    </div>
  );
}

export function BudgetProgress({
  current,
  goal,
  className,
}: {
  current: number;
  goal: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="tabular text-xl font-bold text-text">現在 {formatYen(current)}</span>

        </div>
        <span className="tabular text-xl font-bold text-primary-dark">{pct}%</span>
      </div>
      <div
        className="h-2.5 w-full rounded-full bg-border"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="共同相談費の集まり具合"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular text-[13px] text-text-muted">
        目標 {formatYen(goal)}
      </span>
    </div>
  );
}
