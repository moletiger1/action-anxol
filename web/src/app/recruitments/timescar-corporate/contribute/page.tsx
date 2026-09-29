import type { Metadata } from "next";
import { ContributeFlow } from "@/components/groupC/ContributeFlow";

export const metadata: Metadata = {
  title: "共同相談費の拠出確認｜集団訴訟.jp（仮）",
};

export default function ContributePage() {
  return <ContributeFlow />;
}
