"use client";

import { FlaskConical } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 「1」「2」などの番号付き見出し */
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
    <div className="flex gap-2.5 md:gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-dark">
        {num}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <As className={cn("font-bold text-text", size === "lg" ? "text-xl" : "text-lg")}>{title}</As>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
    </div>
  );
}

/** ラベル＋値の1行（ラベル幅固定） */
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
        "flex flex-col gap-1 py-2.5 sm:flex-row sm:gap-4",
        !last && "border-b border-border",
      )}
    >
      <dt className="shrink-0 text-sm text-text-muted" style={{ width: labelWidth }}>
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[15px] text-text">{children}</dd>
    </div>
  );
}

export type DemoOption<T extends string> = { value: T; label: string };

/** デモ用の表示切り替え（実際の画面には出ない操作であることを明示） */
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
        "flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border-strong bg-neutral-soft px-3 py-2",
        className,
      )}
    >
      <span id={id} className="flex items-center gap-1.5 text-[13px] font-bold text-text-sub">
        <FlaskConical className="size-3.5" aria-hidden />
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
                "h-9 rounded-lg border px-3 text-[13px] font-medium",
                active
                  ? "border-primary bg-surface font-bold text-primary-dark"
                  : "border-border-strong bg-surface/60 text-text-sub hover:bg-surface",
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

/** ラジオの選択肢カード */
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
        "flex cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3.5 transition-colors",
        checked ? "border-primary bg-primary-soft" : "border-border-strong bg-surface",
        disabled && "cursor-default",
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
          "flex size-[22px] shrink-0 items-center justify-center rounded-full border bg-surface peer-focus-visible:ring-3 peer-focus-visible:ring-focus",
          checked ? "border-primary" : "border-border-strong",
        )}
      >
        {checked && <span className="size-2.5 rounded-full bg-primary" />}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-base text-text", checked ? "font-bold" : "font-medium")}>{title}</span>
        {description && <span className="text-sm text-text-muted">{description}</span>}
      </span>
    </label>
  );
}
