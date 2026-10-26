import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatYen } from "@/lib/demo";

/**
 * 費用明細の1行。金額は右揃え・等幅の桁。
 * 合計行だけ上に墨を引いて、他の行と別の重さにする。
 */
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
        "flex items-baseline gap-4 py-2.5",
        total ? "border-t-2 border-text pt-3" : !last && "border-b border-border",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-[15px]", total ? "font-bold text-text" : "text-text-sub")}>
          {label}
        </span>
        {note && <span className="text-[13px] leading-[1.7] text-text-muted">{note}</span>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span
          className={cn(
            "tabular font-serif font-bold text-text",
            total ? "text-xl" : "text-base",
          )}
        >
          {value}
        </span>
        {sub && <span className="tabular text-[13px] text-text-muted">{sub}</span>}
      </div>
    </div>
  );
}

/**
 * 集まり具合。丸いバーではなく、目盛りの付いた一本の帯として示す。
 * 数字（現在・％・目標）が主で、帯は補助。
 */
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
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="tabular font-serif text-2xl font-bold text-text">{formatYen(current)}</span>
        <span className="tabular font-serif text-xl font-bold text-primary">{pct}%</span>
      </div>
      <div
        className="h-3 w-full border border-border bg-neutral-soft"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="共同相談費の集まり具合"
      >
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-baseline justify-between gap-4 text-[13px] text-text-muted">
        <span className="tabular">目標 {formatYen(goal)}</span>
        <span className="tabular">未集計 {formatYen(Math.max(0, goal - current))}</span>
      </div>
    </div>
  );
}
