import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DemoBadge } from "./Badge";

/**
 * 特殊ファイル（`not-found`／`error`／`global-error`）の枠。
 * これらは共通シェル（PublicShell／AppShell）の外側で描画されるため、
 * `<main id="main">`とデモ表示の印はこの枠が持つ。
 */
export function StatusPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className={cn("mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-4 px-4 py-6 md:py-8", className)}
    >
      <div className="flex justify-end">
        <DemoBadge short />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4 pb-12 md:pb-16">{children}</div>
    </main>
  );
}
