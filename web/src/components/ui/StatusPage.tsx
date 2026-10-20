import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * 特殊ファイル（`not-found`／`error`／`global-error`）の中央寄せ枠。
 * これらは共通シェル（PublicShell／AppShell）の外側で描画されるため、
 * 自分の`<main id="main">`を持ち、スキップリンクの移動先にもなる。
 */
export function StatusPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className={cn(
        "mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center gap-4 px-4 py-12 md:py-16",
        className,
      )}
    >
      {children}
    </main>
  );
}
