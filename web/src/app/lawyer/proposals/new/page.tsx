import type { Metadata } from "next";
import { AppShell } from "@/components/layout";
import { ProposalForm } from "@/components/groupC/ProposalForm";

export const metadata: Metadata = {
  title: "提案を作成する｜弁護士用ワークスペース｜集団訴訟.jp（仮）",
};

export default function LawyerProposalNewPage() {
  return (
    <AppShell lawyer active="drafts" mobileTitle="提案を作成する">
      <ProposalForm />
    </AppShell>
  );
}
