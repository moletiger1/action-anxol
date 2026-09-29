"use client";

import { CircleAlert } from "lucide-react";

/** 次へ・公開を押したときの未入力の件数。理由は各項目の下に表示する */
export function ErrorSummary({ count, message }: { count: number; message?: string }) {
  if (count === 0) return null;
  return (
    <div role="alert" className="flex gap-3 rounded-[10px] border border-red bg-red-soft px-4 py-3.5">
      <CircleAlert className="mt-0.5 size-5 shrink-0 text-red" aria-hidden />
      <p className="text-sm text-text">
        <span className="font-bold text-red">入力が必要な項目が{count}件あります。</span>
        {message ?? "赤く表示された項目の説明に沿って入力してください。"}
      </p>
    </div>
  );
}

/** 描画後、最初のエラー項目までスクロールして入力欄にフォーカスする */
export function focusFirstError() {
  requestAnimationFrame(() => {
    const first = document.querySelector<HTMLElement>("main [role=alert]");
    if (!first) return;
    const group = first.closest("fieldset") ?? first.parentElement;
    const control = group?.querySelector<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    );
    first.scrollIntoView({ block: "center", behavior: "smooth" });
    control?.focus({ preventScroll: true });
  });
}
