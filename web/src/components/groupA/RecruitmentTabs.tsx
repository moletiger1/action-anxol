"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type RecruitmentTab = {
  key: string;
  label: string;
  /** モバイルで短くする場合の表示名 */
  mobileLabel?: string;
  content: ReactNode;
};

const EVENT = "groupA:show-tab";
type ShowTabDetail = { key: string; target?: string };

/** 別の場所からタブを切り替えて、指定要素までスクロールする */
export function showTab(key: string, target?: string) {
  window.dispatchEvent(new CustomEvent<ShowTabDetail>(EVENT, { detail: { key, target } }));
}

/** A03 のタブ。モバイルでは短い表示名と狭い間隔を使う */
export function RecruitmentTabs({ items }: { items: RecruitmentTab[] }) {
  const [active, setActive] = useState(items[0]?.key);
  const id = useId();

  useEffect(() => {
    function onShow(e: Event) {
      const { key, target } = (e as CustomEvent<ShowTabDetail>).detail;
      setActive(key);
      if (target) {
        requestAnimationFrame(() => {
          const el = document.getElementById(target);
          // 動きを減らす設定では即座に移動する
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
          el?.focus({ preventScroll: true });
        });
      }
    }
    window.addEventListener(EVENT, onShow);
    return () => window.removeEventListener(EVENT, onShow);
  }, []);

  /* 左右キーで移動できるようにする（タブの期待動作） */
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!forward && !back && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const last = items.length - 1;
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? last : forward ? (index + 1) % items.length : (index - 1 + last + 1) % items.length;
    setActive(items[next].key);
    document.getElementById(`${id}-tab-${items[next].key}`)?.focus();
  }

  return (
    <div className="flex flex-col gap-5 md:gap-7">
      <div
        role="tablist"
        className="flex gap-5 overflow-x-auto border-b border-border-strong md:gap-7"
      >
        {items.map((t, i) => {
          const selected = t.key === active;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              id={`${id}-tab-${t.key}`}
              tabIndex={selected ? 0 : -1}
              aria-selected={selected}
              aria-controls={`${id}-panel-${t.key}`}
              onClick={() => setActive(t.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-0.5 pt-2 pb-2.5 text-[15px] whitespace-nowrap transition-surface",
                selected
                  ? "border-primary font-bold text-primary-dark"
                  : "border-transparent font-medium text-text-sub hover:border-border-strong hover:text-text",
              )}
            >
              {t.mobileLabel ? (
                <>
                  <span className="md:hidden">{t.mobileLabel}</span>
                  <span className="hidden md:inline">{t.label}</span>
                </>
              ) : (
                t.label
              )}
            </button>
          );
        })}
      </div>
      {items.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`${id}-panel-${t.key}`}
          aria-labelledby={`${id}-tab-${t.key}`}
          hidden={t.key !== active}
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}

/** 「入金前に使途・決め方・返金条件を確認」など、概要タブ内の見出しへ移動するテキストボタン */
export function JumpButton({
  tab,
  target,
  children,
  className,
}: {
  tab: string;
  target: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => showTab(tab, target)}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 self-start px-0.5 text-left text-[15px] font-medium text-primary-dark hover:underline",
        className,
      )}
    >
      {children}
      <ChevronRight className="size-[18px] shrink-0" aria-hidden />
    </button>
  );
}
