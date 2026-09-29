"use client";

import { cn } from "@/lib/cn";

export type SegmentOption<K extends string> = { key: K; label: string; sub?: string };

/** 会計・タブの切替（背景グレーの枠に白い選択セグメント） */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
  fill,
  size = "md",
  className,
}: {
  options: SegmentOption<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  /** 各セグメントを等幅で横いっぱいに広げる */
  fill?: boolean;
  size?: "md" | "sm";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex gap-1 rounded-xl bg-[#E9EDF2] p-1",
        fill ? "w-full" : "w-fit max-w-full flex-wrap",
        className,
      )}
    >
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(o.key)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-[9px] px-[18px] text-left",
              fill && "flex-1 px-2",
              size === "sm" ? "text-sm" : "text-[15px]",
              selected
                ? "bg-surface font-bold text-text shadow-[0_1px_2px_rgba(23,43,77,0.08)]"
                : "font-medium text-text-sub hover:bg-white/60",
            )}
          >
            <span>{o.label}</span>
            {o.sub && <span className="text-[13px] font-normal text-text-muted">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}
