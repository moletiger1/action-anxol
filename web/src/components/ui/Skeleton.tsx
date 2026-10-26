"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * 200ms 未満で終わる読み込みでは骨組みを出さない（点滅を避ける）。
 * それ以上かかるときだけ true になる。
 */
export function useDelayedFlag(active: boolean, delayMs = 200) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);
  // active が false に戻ったら即座に隠す（effect ではなく描画時に判定する）
  return active && shown;
}

/**
 * 骨組みの一片。最終レイアウトと同じ寸法で置き、
 * 実データ到着時に位置が飛ばないようにする。
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-sm", className)} />;
}

/** 見出し＋本文数行の骨組み */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 && "w-2/3")} />
      ))}
    </div>
  );
}

/**
 * 一覧1件ぶんの骨組み。実物と同じ罫線・余白で組む。
 * 読み込み中であることは読み上げにも伝える。
 */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-3 border-t border-border py-5", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <SkeletonText lines={2} />
    </div>
  );
}

/** 骨組み全体の読み上げ用ラッパー */
export function SkeletonRegion({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-label={label} aria-busy className={className}>
      {children}
    </div>
  );
}
