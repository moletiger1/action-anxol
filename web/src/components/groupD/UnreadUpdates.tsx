"use client";

import { BellRing, CircleCheck, ChevronRight, Dot } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const updates = [
  {
    title: "弁護士Cが質問に回答しました",
    date: "12月8日",
    kind: "回答",
    body: "法人会員・利用者の共同相談",
  },
  {
    title: "弁護士Aの説明資料が追加されました",
    date: "12月6日",
    kind: "資料",
    body: "法人会員・利用者の共同相談",
  },
  {
    title: "決定方法の設定案に意見を募集しています",
    date: "12月5日",
    kind: "募集",
    body: "法人会員・利用者の共同相談",
  },
];

/**
 * 更新の一覧。面を持たず、罫線と行の並びだけで台帳として見せる。
 * 未読は色だけに頼らず、印と文言の両方で示す。
 */
export function UnreadUpdates() {
  const [read, setRead] = useState(false);

  return (
    <section aria-labelledby="unread-updates-title" className="flex flex-col">
      <div className="rule-head flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2
            id="unread-updates-title"
            className="font-serif text-lg leading-snug font-bold text-text"
          >
            更新
          </h2>
          <p className="tabular text-[13px] text-text-muted">
            {read ? `3件・すべて既読（この画面内）` : `未読3件 ／ 全3件`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRead(true)}
          disabled={read}
          className="inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-primary-dark hover:underline disabled:text-text-muted disabled:no-underline"
        >
          {read ? "この画面で既読にしました" : "この画面で既読にする"}
          {!read && <ChevronRight className="size-[18px]" aria-hidden />}
        </button>
      </div>

      <ul className="flex flex-col">
        {updates.map((u, i) => (
          <li
            key={u.title}
            className={cn(
              "flex gap-3 py-3",
              i < updates.length - 1 && "border-b border-border",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border",
                read
                  ? "border-border text-text-muted"
                  : "border-primary-line bg-primary-soft text-primary-dark",
              )}
            >
              {read ? <CircleCheck className="size-3.5" /> : <BellRing className="size-3.5" />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  "text-[15px] leading-[1.7] text-text",
                  read ? "font-medium" : "font-bold",
                )}
              >
                {u.title}
              </span>
              <span className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-text-muted">
                <span className="tabular">{u.date}</span>
                <Dot className="size-3 shrink-0" aria-hidden />
                <span>{u.kind}</span>
                <Dot className="size-3 shrink-0" aria-hidden />
                <span>{u.body}</span>
                <span className={cn("ml-1", read ? "text-text-muted" : "font-bold text-primary-dark")}>
                  {read ? "既読" : "未読"}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
