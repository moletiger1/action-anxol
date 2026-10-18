import type { Metadata } from "next";
import { AppShell } from "@/components/layout";
import { DemoBadge } from "@/components/ui";
import { PageBody, PageHeader } from "@/components/groupD/parts";
import { WorkflowConsole } from "@/components/workflows/WorkflowConsole";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "辞退・返金・カタログの操作デモ｜集団訴訟.jp（仮）",
  robots: { index: false, follow: false },
};
export default function WorkflowsPage() {
  return <AppShell active="joined" mobileTitle="運用操作デモ" mobileBackHref={routes.dashboard}>
    <PageBody><PageHeader eyebrow="仕様v0.4のアプリ機能" title="辞退・返金・カタログの操作デモ" right={<DemoBadge />} />
      <WorkflowConsole />
    </PageBody>
  </AppShell>;
}
