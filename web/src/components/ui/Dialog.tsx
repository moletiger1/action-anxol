"use client";

import { ShieldCheck, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";

/**
 * 資金移動・採択など取り消しにくい操作の確認ダイアログ。
 * 角を立てた紙片として出し、上端に墨を一本引いて「確定の場」であることを示す。
 */
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
      className="m-auto w-full border border-border-strong bg-surface p-6 text-text backdrop:bg-text/50"
    >
      <div className="flex flex-col gap-5">
        <div className="rule-head flex items-start gap-3">
          <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <h2 className="font-serif text-xl leading-snug font-bold">{title}</h2>
        </div>
        {description && (
          <p className="text-[15px] leading-[1.8] text-text-sub">{description}</p>
        )}
        {children && <div className="flex flex-col border-t border-border">{children}</div>}
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
