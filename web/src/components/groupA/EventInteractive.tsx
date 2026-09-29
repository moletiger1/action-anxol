"use client";

import { useState } from "react";
import { FilePenLine } from "lucide-react";
import { Button, ConfirmDialog, TextArea, TextField } from "@/components/ui";
import { cn } from "@/lib/cn";

export type HistoryItem = { at: string; text: string };

/** 更新履歴。最新だけ強調し、「すべての履歴を見る」で全件を表示 */
export function EventHistory({ items, initial = 3 }: { items: HistoryItem[]; initial?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, initial);
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface px-5 py-2 md:px-6">
      <ol>
        {shown.map((h, i) => (
          <li
            key={h.at}
            className={cn(
              "flex flex-col gap-1 py-3.5 sm:flex-row sm:gap-4",
              i < shown.length - 1 && "border-b border-border",
            )}
          >
            <span className="flex items-center gap-4 sm:contents">
              <span className="flex h-[26px] shrink-0 items-center">
                <span
                  aria-hidden
                  className={cn("size-2.5 rounded-full", i === 0 ? "bg-primary" : "bg-border-strong")}
                />
              </span>
              <time className="tabular shrink-0 text-sm leading-[26px] text-text-muted sm:w-[170px]">
                {h.at}
              </time>
            </span>
            <span className="text-[15px] text-text sm:flex-1">{h.text}</span>
          </li>
        ))}
      </ol>
      {all && items.length <= initial && (
        <p className="pb-2 text-[13px] text-text-muted">これ以前の履歴はありません。</p>
      )}
      {!all && (
        <Button variant="text" className="self-start" onClick={() => setAll(true)}>
          すべての履歴を見る
        </Button>
      )}
    </div>
  );
}

/** 更新提案（デモでは送信しない） */
export function SuggestUpdate() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string>();

  return (
    <>
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        更新を提案する
      </Button>
      {sent && (
        <p role="status" className="text-[13px] text-green">
          更新の提案を受け付けました（デモのため送信はされていません）。
        </p>
      )}
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          if (!text.trim()) {
            setError("修正したい内容を入力してください。");
            return;
          }
          setOpen(false);
          setSent(true);
          setText("");
          setSource("");
          setError(undefined);
        }}
        icon={FilePenLine}
        title="更新を提案する"
        description="このデモでは提案内容を送信・保存しません。ページや更新履歴にも反映されません。"
        confirmLabel="提案を送る"
        cancelLabel="やめる"
      >
        <div className="flex flex-col gap-4">
          <TextArea
            label="修正したい内容"
            required
            maxLength={400}
            value={text}
            error={error}
            onChange={(e) => {
              setText(e.target.value);
              setError(undefined);
            }}
          />
          <TextField
            label="根拠となる公表資料のURL"
            hint="企業の公表資料・公的機関の発表など"
            type="url"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
