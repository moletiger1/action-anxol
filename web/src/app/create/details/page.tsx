import type { Metadata } from "next";
import { DetailsStep } from "@/components/groupB/DetailsStep";

export const metadata: Metadata = {
  title: "募集内容｜集団訴訟.jp（仮）",
};

// B01c 3/4 募集内容
export default function Page() {
  return <DetailsStep />;
}
