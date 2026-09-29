import type { Metadata } from "next";
import { SimilarStep } from "@/components/groupB/SimilarStep";

export const metadata: Metadata = {
  title: "似た案件の確認｜集団訴訟.jp（仮）",
};

// B01b 2/4 似た案件の確認（M_B01 モバイル対応は WizardFrame 内）
export default function Page() {
  return <SimilarStep />;
}
