import type { Metadata } from "next";
import { JoinFlow } from "@/components/groupB/JoinFlow";

export const metadata: Metadata = {
  title: "当事者として参加する｜集団訴訟.jp（仮）",
};

// B02 当事者登録・資料共有
export default function Page() {
  return <JoinFlow />;
}
