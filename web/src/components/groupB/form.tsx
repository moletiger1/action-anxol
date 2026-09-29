"use client";

import { Check, CircleAlert, Globe, Lock, type LucideIcon } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

/** 入力エラー：赤＋アイコン＋理由と直し方 */
export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm text-red">
      <CircleAlert className="mt-[3px] size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function ScopeBadge({ scope, label }: { scope: "public" | "private"; label?: string }) {
  return scope === "public" ? (
    <Badge tone="primary" icon={Globe}>
      {label ?? "一般公開"}
    </Badge>
  ) : (
    <Badge tone="neutral" icon={Lock}>
      {label ?? "非公開"}
    </Badge>
  );
}

/** 番号付きの質問ブロック */
export function Question({
  num,
  title,
  hint,
  badge,
  children,
  id,
}: {
  num: number;
  title: string;
  hint?: ReactNode;
  badge: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <fieldset id={id} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-dark"
          >
            {num}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <legend className="text-lg font-bold text-text">
              <span className="sr-only">質問{num}：</span>
              {title}
            </legend>
            {hint && <p className="text-sm text-text-muted">{hint}</p>}
          </div>
        </div>
        <div className="shrink-0 pl-10 sm:pl-0">{badge}</div>
      </div>
      <div className="flex flex-col gap-2.5 sm:pl-10">{children}</div>
    </fieldset>
  );
}

const fieldBase =
  "h-12 w-full rounded-[10px] border bg-surface pr-4 pl-11 text-base text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-focus/60";

function FieldIcon({ icon: Icon, error }: { icon: LucideIcon; error?: boolean }) {
  const I = error ? CircleAlert : Icon;
  return (
    <I
      className={cn(
        "pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2",
        error ? "text-red" : "text-text-muted",
      )}
      aria-hidden
    />
  );
}

/** 先頭アイコン付きの入力欄（デザインの Input。エラー時はアイコンが警告に変わる） */
export function IconField({
  label,
  icon,
  hint,
  error,
  className,
  ...rest
}: {
  label: string;
  icon: LucideIcon;
  hint?: ReactNode;
  error?: string;
  className?: string;
} & Omit<ComponentProps<"input">, "className">) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-bold text-text">
        {label}
      </label>
      <div className="relative">
        <FieldIcon icon={icon} error={!!error} />
        <input
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={`${id}-help`}
          className={cn(fieldBase, error ? "border-red bg-red-soft" : "border-border-strong")}
          {...rest}
        />
      </div>
      {error ? (
        <FieldError id={`${id}-help`}>{error}</FieldError>
      ) : (
        hint && (
          <p id={`${id}-help`} className="text-sm text-text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function IconSelect({
  label,
  icon,
  error,
  options,
  className,
  ...rest
}: {
  label: string;
  icon: LucideIcon;
  error?: string;
  options: { value: string; label: string }[];
  className?: string;
} & Omit<ComponentProps<"select">, "className">) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-2", className)}>
      <label htmlFor={id} className={cn("text-sm font-bold", rest.disabled ? "text-disabled-text" : "text-text")}>
        {label}
      </label>
      <div className="relative">
        <FieldIcon icon={icon} error={!!error} />
        <select
          id={id}
          aria-invalid={!!error || undefined}
          className={cn(
            fieldBase,
            "appearance-none",
            error ? "border-red bg-red-soft" : "border-border-strong",
            rest.disabled && "border-border bg-[#F1F3F6] text-disabled-text",
          )}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** カード型のラジオ選択肢 */
export function OptionCard({
  name,
  checked,
  onChange,
  title,
  note,
  invalid,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  note?: string;
  invalid?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-[10px] border px-4 py-3.5 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-focus/60",
        checked
          ? "border-primary bg-primary-soft"
          : invalid
            ? "border-red bg-surface"
            : "border-border-strong bg-surface hover:bg-bg",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full border bg-surface",
          checked ? "border-primary" : "border-border-strong",
        )}
      >
        {checked && <span className="size-2.5 rounded-full bg-primary" />}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-base text-text", checked ? "font-bold" : "font-medium")}>{title}</span>
        {note && <span className="text-sm text-text-muted">{note}</span>}
      </span>
    </label>
  );
}

/** チェックボックスの行（デザインの Check） */
export function CheckRow({
  checked,
  onChange,
  label,
  note,
  invalid,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  note?: ReactNode;
  invalid?: boolean;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-md py-2.5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-focus/60">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={invalid || undefined}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-md border",
          checked
            ? "border-primary bg-primary"
            : invalid
              ? "border-red bg-red-soft"
              : "border-border-strong bg-surface",
        )}
      >
        {checked && <Check className="size-4 text-white" aria-hidden />}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-base text-text">{label}</span>
        {note && <span className="text-sm text-text-muted">{note}</span>}
      </span>
    </label>
  );
}

/** 右側の補足カード */
export function AsideCard({
  title,
  children,
  muted,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border p-5",
        muted ? "bg-[#F1F5F6]" : "bg-surface",
        className,
      )}
    >
      {title && <h2 className="text-base font-bold text-text">{title}</h2>}
      {children}
    </section>
  );
}

export function AsideItem({
  icon: Icon,
  children,
  muted,
}: {
  icon: LucideIcon;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="flex h-[26px] shrink-0 items-center">
        <Icon className={cn("size-[18px]", muted ? "text-text-muted" : "text-primary-dark")} aria-hidden />
      </span>
      <p className={cn("text-sm", muted ? "text-text-sub" : "text-text")}>{children}</p>
    </div>
  );
}

/** トグル（弁護士への共有許可など） */
export function Toggle({
  checked,
  onChange,
  onLabel,
  offLabel,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  onLabel: string;
  offLabel: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="flex h-11 items-center gap-2.5 self-start rounded-md"
    >
      <span
        aria-hidden
        className={cn(
          "flex h-[26px] w-11 shrink-0 rounded-full p-[3px] transition-colors",
          checked ? "justify-end bg-primary" : "justify-start bg-[#C9D3DE]",
        )}
      >
        <span className="size-5 rounded-full bg-white shadow-sm" />
      </span>
      <span className={cn("text-left text-sm font-medium", checked ? "text-primary-dark" : "text-text-sub")}>
        {checked ? onLabel : offLabel}
      </span>
    </button>
  );
}
