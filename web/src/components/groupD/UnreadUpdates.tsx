"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const updates = [
  { title: "弁護士Cが質問に回答しました", meta: "法人会員・利用者の共同相談・12月8日" },
  { title: "弁護士Aの説明資料が追加されました", meta: "法人会員・利用者の共同相談・12月6日" },
  { title: "決定方法の設定案に意見を募集しています", meta: "法人会員・利用者の共同相談・12月5日" },
  { title: "参加希望者が100人を超えました", meta: "〔架空〕オンライン英会話の件・12月3日" },
];

export function UnreadUpdates() {
  const [read, setRead] = useState(false);
  return (
    <section
      aria-labelledby="unread-updates-title"
      className="flex flex-col rounded-xl border border-border bg-surface px-5 pt-5 pb-2"
    >
      <div className="flex items-center justify-between pb-2">
        <h2 id="unread-updates-title" className="text-base font-bold text-text">
          更新（デモ）
        </h2>
        <button
          type="button"
          onClick={() => setRead(true)}
          disabled={read}
          className="inline-flex h-11 items-center gap-1.5 px-1 text-base font-medium text-primary-dark hover:underline disabled:text-text-muted disabled:no-underline"
        >
          {read ? "この画面で既読にしました" : "この画面で既読にする"}
          {!read && <ChevronRight className="size-[18px]" aria-hidden />}
        </button>
      </div>
      <ul>
        {updates.map((u, i) => (
          <li
            key={u.title}
            className={cn("flex gap-2.5 py-3", i < updates.length - 1 && "border-b border-border")}
          >
            <span className="flex h-[22px] w-2 shrink-0 items-center">
              {!read && <span className="size-2 rounded-full bg-primary" aria-label="未読" />}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className={cn("text-sm text-text", read ? "font-medium" : "font-bold")}>
                {u.title}
              </span>
              <span className="text-xs text-text-muted">{u.meta}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
