import Link from "next/link";
import { ChevronRight, LoaderCircle, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "text";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[10px] text-base font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "h-12 px-6 bg-primary text-white hover:bg-primary-dark disabled:bg-disabled disabled:text-white",
  secondary:
    "h-12 px-6 bg-surface text-primary-dark border border-primary hover:bg-primary-soft disabled:border-border disabled:text-disabled-text",
  text: "h-11 px-1 gap-1.5 font-medium text-primary-dark hover:underline",
};

type CommonProps = {
  variant?: Variant;
  icon?: LucideIcon;
  /** 処理中は二重送信を防ぐため押せなくする */
  loading?: boolean;
  loadingLabel?: string;
  size?: "md" | "sm";
  className?: string;
  children: ReactNode;
};

function Inner({ variant = "primary", icon: Icon, loading, loadingLabel, children }: CommonProps) {
  if (loading) {
    return (
      <>
        <LoaderCircle className="size-5 animate-spin" aria-hidden />
        {loadingLabel ?? "処理中…再送信できません"}
      </>
    );
  }
  return (
    <>
      {Icon && <Icon className="size-5" aria-hidden />}
      {children}
      {variant === "text" && <ChevronRight className="size-[18px]" aria-hidden />}
    </>
  );
}

function classes({ variant = "primary", size = "md", loading, className }: CommonProps) {
  return cn(
    base,
    variants[variant],
    size === "sm" && variant !== "text" && "h-11",
    loading && "bg-primary-dark opacity-85 cursor-wait",
    className,
  );
}

export function Button({
  variant,
  icon,
  loading,
  loadingLabel,
  size,
  className,
  children,
  disabled,
  ...rest
}: CommonProps & Omit<ComponentProps<"button">, "children">) {
  const p = { variant, icon, loading, loadingLabel, size, className, children };
  return (
    <button
      type="button"
      className={classes(p)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Inner {...p} />
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  icon,
  size,
  className,
  children,
}: CommonProps & { href: string }) {
  const p = { variant, icon, size, className, children };
  return (
    <Link href={href} className={classes(p)}>
      <Inner {...p} />
    </Link>
  );
}
