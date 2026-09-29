import type { Metadata } from "next";
import { ReviewStep } from "@/components/groupB/ReviewStep";

export const metadata: Metadata = {
  title: "公開内容の確認｜集団訴訟.jp（仮）",
};

// B01d 4/4 公開内容の確認
export default function Page() {
  return <ReviewStep />;
}
