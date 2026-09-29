import type { Metadata } from "next";
import { JoinFlow } from "@/components/groupB/JoinFlow";

export const metadata: Metadata = {
  title: "個人会員として参加する｜集団訴訟.jp（仮）",
};

export default function Page() {
  return <JoinFlow recruitmentId="timescar-individual" />;
}
