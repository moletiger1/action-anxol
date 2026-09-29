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

function Label({ htmlFor, label, required, disabled }: { htmlFor: string } & FieldShellProps) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-2">
      <span className={cn("text-sm font-bold", disabled ? "text-disabled-text" : "text-text")}>
        {label}
      </span>
      {required && <span className="text-xs font-bold text-amber">必須</span>}
    </label>
  );
}

function Help({ id, hint, error }: { id: string; hint?: ReactNode; error?: string }) {
  if (error)
    return (
      <p id={id} className="text-sm text-red">
        {error}
      </p>
    );
  if (!hint) return null;
  return (
    <p id={id} className="text-sm text-text-muted">
      {hint}
    </p>
  );
}

const fieldBox =
  "w-full rounded-[10px] border bg-surface px-4 text-base text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-focus/60";

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
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} label={label} required={required} disabled={disabled} />
      <div className="relative">
        {error && (
          <CircleAlert
            className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-red"
            aria-hidden
          />
        )}
        <input
          id={id}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          aria-describedby={helpId}
          className={cn(
            fieldBox,
            "h-12",
            error ? "border-red bg-red-soft pl-11" : "border-border-strong",
            disabled && "border-border bg-[#F1F3F6] text-disabled-text placeholder:text-disabled-text",
          )}
          {...rest}
        />
      </div>
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
    <div className={cn("flex flex-col gap-2", className)}>
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
          "min-h-32 py-3",
          error ? "border-red bg-red-soft" : "border-border-strong",
        )}
        {...rest}
      />
      <div className="flex justify-between gap-4">
        <Help id={helpId} hint={hint} error={error} />
        {maxLength && (
          <span className="tabular shrink-0 text-sm text-text-muted">
            {count} / {maxLength}字
          </span>
        )}
      </div>
    </div>
  );
}

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
        "flex h-15 items-center gap-3 rounded-xl border border-border-strong bg-surface py-1.5 pr-1.5 pl-5 focus-within:border-primary",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q");
        onSearch?.(String(q ?? ""));
      }}
    >
      <Search className="size-[22px] shrink-0 text-text-sub" aria-hidden />
      <input
        name="q"
        aria-label="案件を探す"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-base text-text placeholder:text-text-muted focus:outline-none"
      />
      <Button type="submit">探す</Button>
    </form>
  );
}

/** 事前チェック済みにしない同意欄 */
export function ConsentCheckbox({
  checked,
  onChange,
  children,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer gap-3 rounded-[10px] border p-4 transition-colors",
        checked ? "border-primary bg-primary-soft" : "border-border-strong bg-surface",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 shrink-0 accent-primary"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-base text-text">{children}</span>
        {description && <span className="text-sm text-text-muted">{description}</span>}
      </span>
    </label>
  );
}
