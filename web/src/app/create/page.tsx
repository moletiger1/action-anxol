import type { Metadata } from "next";
import { CreateEventStep } from "@/components/groupB/CreateEventStep";

export const metadata: Metadata = {
  title: "案件を作る｜出来事｜集団訴訟.jp（仮）",
};

// B01 案件作成ウィザード 1/4 出来事
export default function Page() {
  return <CreateEventStep />;
}
