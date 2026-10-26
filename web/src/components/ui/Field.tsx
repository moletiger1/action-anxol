"use client";

import { CircleAlert, Search } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

type FieldShellProps = {
  label: string;
  required?: boolean;
  /** 収集する理由・補足。常に表示する */
  hint?: ReactNode;
  error?: string;
  disabled?: boolean;
  className?: string;
};

/** 記入欄のラベル。必須は朱で示す（色だけでなく文字でも示す） */
function Label({ htmlFor, label, required, disabled }: { htmlFor: string } & FieldShellProps) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline gap-2">
      <span className={cn("text-sm font-bold", disabled ? "text-disabled-text" : "text-text")}>
        {label}
      </span>
      {required && <span className="text-[12px] font-bold text-amber">必須</span>}
    </label>
  );
}

function Help({ id, hint, error }: { id: string; hint?: ReactNode; error?: string }) {
  if (error)
    return (
      <p id={id} className="flex items-start gap-1.5 text-sm text-red">
        <CircleAlert className="mt-1 size-4 shrink-0" aria-hidden />
        {error}
      </p>
    );
  if (!hint) return null;
  return (
    <p id={id} className="text-[13px] leading-[1.7] text-text-muted">
      {hint}
    </p>
  );
}

/*
 * 記入欄。角丸の箱ではなく、下線を引いた記入欄として組む。
 * 台帳に書き込む見え方に揃え、エラーは地の色と枠の二重で示す。
 */
const fieldBox =
  "w-full rounded-sm border bg-surface px-3 text-base text-text placeholder:text-text-muted transition-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-focus/25";

export function TextField({
  label,
  required,
  hint,
  error,
  disabled,
  className,
  ...rest
}: FieldShellProps & Omit<ComponentProps<"input">, "className">) {
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} label={label} required={required} disabled={disabled} />
      <input
        id={id}
        disabled={disabled}
        aria-invalid={!!error || undefined}
        aria-describedby={helpId}
        className={cn(
          fieldBox,
          "h-12",
          error ? "border-red bg-red-soft" : "border-border-strong",
          disabled && "border-border bg-neutral-soft text-disabled-text placeholder:text-disabled-text",
        )}
        {...rest}
      />
      <Help id={helpId} hint={hint} error={error} />
    </div>
  );
}

export function TextArea({
  label,
  required,
  hint,
  error,
  disabled,
  className,
  maxLength,
  value,
  ...rest
}: FieldShellProps & Omit<ComponentProps<"textarea">, "className">) {
  const id = useId();
  const helpId = `${id}-help`;
  const count = typeof value === "string" ? value.length : 0;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} label={label} required={required} disabled={disabled} />
      <textarea
        id={id}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        aria-invalid={!!error || undefined}
        aria-describedby={helpId}
        className={cn(
          fieldBox,
          "min-h-32 py-3 leading-[1.8]",
          error ? "border-red bg-red-soft" : "border-border-strong",
          disabled && "border-border bg-neutral-soft text-disabled-text",
        )}
        {...rest}
      />
      <div className="flex justify-between gap-4">
        <Help id={helpId} hint={hint} error={error} />
        {maxLength && (
          <span className="tabular shrink-0 text-[13px] text-text-muted">
            {count} / {maxLength}字
          </span>
        )}
      </div>
    </div>
  );
}

/** 検索。ページの主役なので、罫線2pxの太い一本で組む */
export function SearchBar({
  placeholder = "企業・サービス・出来事で探す（例：タイムズカー 個人情報）",
  defaultValue,
  onSearch,
  className,
}: {
  placeholder?: string;
  defaultValue?: string;
  onSearch?: (q: string) => void;
  className?: string;
}) {
  return (
    <form
      role="search"
      className={cn(
        "flex items-center gap-3 border-b-2 border-text bg-surface py-2 pr-2 pl-4 transition-surface focus-within:border-primary",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q");
        onSearch?.(String(q ?? ""));
      }}
    >
      <Search className="size-5 shrink-0 text-text-sub" aria-hidden />
      <input
        name="q"
        aria-label="案件を探す"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 min-w-0 flex-1 bg-transparent text-base text-text placeholder:text-text-muted focus:outline-none"
      />
      <Button type="submit" size="sm">
        探す
      </Button>
    </form>
  );
}

/** 事前チェック済みにしない同意欄 */
export function ConsentCheckbox({
  checked,
  onChange,
  children,
  description,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer gap-3 border px-4 py-3 transition-surface",
        checked ? "border-primary bg-primary-soft" : "border-border-strong bg-surface hover:bg-neutral-soft",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1.5 size-5 shrink-0 accent-primary"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-medium text-text">{children}</span>
        {description && (
          <span className="text-[13px] leading-[1.7] text-text-muted">{description}</span>
        )}
      </span>
    </label>
  );
}
