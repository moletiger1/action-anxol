import type { Metadata } from "next";
import SigninFlow from "@/components/groupB/SigninFlow";

export const metadata: Metadata = {
  title: "サインイン｜集団訴訟.jp（仮）",
};

// B02b サインイン
export default function Page() {
  return <SigninFlow />;
}
