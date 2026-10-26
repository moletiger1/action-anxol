"use client";

import { cn } from "@/lib/cn";

export type SegmentOption<K extends string> = { key: K; label: string; sub?: string };

/**
 * 会計・状態の切替。台帳の見出し行と同じく、一本の罫線を選択中の藍で塗り替える。
 * 影も面も持たず、選択は「罫線の太さ＋文字の濃さ」で示すので、
 * 色が見分けられない場合でも現在地が分かる。
 */
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
        "flex max-w-full gap-5 overflow-x-auto border-b border-border-strong",
        fill ? "w-full" : "w-fit",
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
              "-mb-px flex min-h-11 shrink-0 items-center justify-center gap-1.5 border-b-2 px-0.5 pt-1.5 pb-2 whitespace-nowrap transition-surface",
              fill && "flex-1 px-2",
              size === "sm" ? "text-[13px]" : "text-[15px]",
              selected
                ? "border-primary font-bold text-primary-dark"
                : "border-transparent font-medium text-text-sub hover:border-border-strong hover:text-text",
            )}
          >
            <span>{o.label}</span>
            {o.sub && (
              <span
                className={cn(
                  "font-normal whitespace-nowrap",
                  selected ? "text-primary-dark/80" : "text-text-muted",
                  size === "sm" ? "text-[12px]" : "text-[13px]",
                )}
              >
                {o.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
