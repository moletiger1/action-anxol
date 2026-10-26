"use client";

import { FlaskConical } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * 番号付き見出し。段取りに番号が要る場所だけに使う。
 * 丸バッジではなく、墨の枠に数字を置く。
 */
export function NumHead({
  num,
  title,
  description,
  as: As = "h2",
  size = "lg",
}: {
  num: number;
  title: ReactNode;
  description?: ReactNode;
  as?: "h2" | "h3";
  size?: "lg" | "md";
}) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className="tabular mt-0.5 flex size-7 shrink-0 items-center justify-center border border-text font-display text-sm font-bold text-text"
      >
        {num}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <As
          className={cn(
            "font-display leading-snug font-bold text-text",
            size === "lg" ? "text-lg" : "text-base",
          )}
        >
          {title}
        </As>
        {description && <p className="text-[13px] leading-[1.7] text-text-muted">{description}</p>}
      </div>
    </div>
  );
}

/** ラベル＋値の1行（ラベル幅固定・罫線区切り） */
export function KvRow({
  label,
  children,
  last,
  labelWidth = 128,
}: {
  label: ReactNode;
  children: ReactNode;
  last?: boolean;
  labelWidth?: number;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4",
        !last && "border-b border-border",
      )}
    >
      <dt className="shrink-0 text-[13px] leading-[1.8] text-text-muted" style={{ width: labelWidth }}>
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[15px] leading-[1.8] text-text">{children}</dd>
    </div>
  );
}

export type DemoOption<T extends string> = { value: T; label: string };

/**
 * デモ用の表示切り替え。
 * 破線の囲みは「これは紙面の一部ではなく操作盤である」ことを示すために残す。
 */
export function DemoSwitch<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: DemoOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 border border-dashed border-border-strong bg-neutral-soft px-3 py-2.5",
        className,
      )}
    >
      <span id={id} className="flex items-center gap-1.5 text-[12px] font-bold text-text-sub">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        デモ：{label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "min-h-9 rounded-sm border px-3 text-[13px] transition-surface",
                active
                  ? "border-primary bg-primary font-bold text-white"
                  : "border-border-strong bg-surface text-text-sub hover:bg-primary-soft",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** ラジオの選択肢。選ばれているものを墨の枠と太字で示す */
export function OptionCard({
  name,
  checked,
  onChange,
  title,
  description,
  disabled,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 border px-4 py-3 transition-surface",
        checked ? "border-primary bg-primary-soft" : "border-border-strong bg-surface hover:bg-neutral-soft",
        disabled && "cursor-default opacity-70",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-1 flex size-[20px] shrink-0 items-center justify-center rounded-full border-2 bg-surface peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-1",
          checked ? "border-primary" : "border-border-strong",
        )}
      >
        {checked && <span className="size-2.5 rounded-full bg-primary" />}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-[15px] text-text", checked ? "font-bold" : "font-medium")}>
          {title}
        </span>
        {description && (
          <span className="text-[13px] leading-[1.7] text-text-muted">{description}</span>
        )}
      </span>
    </label>
  );
}
