import type { Metadata } from "next";
import { AppShell } from "@/components/layout";
import { ProposalsView } from "@/components/groupC/ProposalsView";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "弁護士の提案を比較する｜集団訴訟.jp（仮）",
};

export default function ProposalsPage() {
  return (
    <AppShell active="joined" mobileTitle="弁護士の提案を比較" mobileBackHref={routes.dashboard}>
      <ProposalsView />
    </AppShell>
  );
}
