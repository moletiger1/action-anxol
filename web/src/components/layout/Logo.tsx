import Link from "next/link";
import { UsersRound } from "lucide-react";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap" aria-label="集団訴訟.jp（仮） トップへ">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-white">
        <UsersRound className="size-5" aria-hidden />
      </span>
      <span className="text-xl font-bold text-text">集団訴訟.jp</span>
      <span className="text-[13px] text-text-muted">（仮）</span>
    </Link>
  );
}
