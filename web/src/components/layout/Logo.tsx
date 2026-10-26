import Link from "next/link";
import { UsersRound } from "lucide-react";

/**
 * 社名は明朝で組む。頭の印は藍の角版で、丸ピルにはしない。
 * 「（仮）」は社名の一部ではなく注記なので、小さく淡く置く。
 */
export function Logo() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2.5 whitespace-nowrap"
      aria-label="集団訴訟.jp（仮） トップへ"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
        <UsersRound className="size-[18px]" aria-hidden />
      </span>
      <span className="flex items-baseline gap-1">
        <span className="font-serif text-[19px] leading-none font-bold text-text">集団訴訟.jp</span>
        <span className="text-[12px] leading-none text-text-muted">（仮）</span>
      </span>
    </Link>
  );
}
