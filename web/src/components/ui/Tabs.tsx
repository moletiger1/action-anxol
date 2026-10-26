"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabItem = { key: string; label: string; content: ReactNode };

/**
 * 見出しの下に引いた一本の罫線を、選択中の項目だけ藍の太線で塗り替える。
 * 選択は下線の太さと文字の濃さで示す。
 */
export function Tabs({
  items,
  defaultKey,
  className,
}: {
  items: TabItem[];
  defaultKey?: string;
  className?: string;
}) {
  const [active, setActive] = useState(defaultKey ?? items[0]?.key);
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div
        role="tablist"
        className="flex gap-6 overflow-x-auto border-b border-border-strong"
      >
        {items.map((t) => {
          const selected = t.key === active;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              id={`${id}-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`${id}-panel-${t.key}`}
              onClick={() => setActive(t.key)}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-0.5 pt-2 pb-2 text-[15px] whitespace-nowrap transition-surface",
                selected
                  ? "border-primary font-bold text-primary-dark"
                  : "border-transparent font-medium text-text-sub hover:border-border-strong hover:text-text",
              )}
            >
              {t.label}
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
