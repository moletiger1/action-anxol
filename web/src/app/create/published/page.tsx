import type { Metadata } from "next";
import { CreatedPreview } from "@/components/groupB/CreatedPreview";

export const metadata: Metadata = {
  title: "作成内容のプレビュー｜集団訴訟.jp（仮）",
};

export default function Page() {
  return <CreatedPreview />;
}
