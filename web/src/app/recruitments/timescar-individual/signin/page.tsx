import type { Metadata } from "next";
import SigninFlow from "@/components/groupB/SigninFlow";

export const metadata: Metadata = {
  title: "個人会員としてサインイン｜集団訴訟.jp（仮）",
};

export default function Page() {
  return <SigninFlow individual />;
}
