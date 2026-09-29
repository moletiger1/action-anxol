"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabItem = { key: string; label: string; content: ReactNode };

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
    <div className={cn("flex flex-col gap-7", className)}>
      <div role="tablist" className="flex gap-7 overflow-x-auto border-b border-border">
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
                "-mb-px shrink-0 border-b-2 px-1 pt-3 pb-2.5 text-base whitespace-nowrap",
                selected
                  ? "border-primary font-bold text-primary-dark"
                  : "border-transparent font-medium text-text-sub hover:text-text",
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
