"use client";

import { ShieldCheck, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

/** 資金移動・採択など取り消しにくい操作の確認ダイアログ */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  icon: Icon = ShieldCheck,
  confirmLabel = "確定する",
  cancelLabel = "戻って確認する",
  confirming,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  icon?: LucideIcon;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  width?: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        if (confirming) e.preventDefault();
      }}
      style={{ maxWidth: `min(${width}px, calc(100vw - 32px))` }}
      className={cn(
        "m-auto w-full rounded-2xl bg-surface p-7 text-text backdrop:bg-[#172B4D]/40",
      )}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
            <Icon className="size-[22px]" aria-hidden />
          </span>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        {description && <p className="text-base text-text-sub">{description}</p>}
        {children && <div className="flex flex-col">{children}</div>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={confirming}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} loading={confirming}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
