import type { Metadata } from "next";
import { AppShell } from "@/components/layout";
import { DemoBadge } from "@/components/ui";
import { DecisionView } from "@/components/groupD/DecisionView";
import { PageBody, PageHeader } from "@/components/groupD/parts";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "相談結果と依頼の判断｜集団訴訟.jp（仮）",
};

export default function DecisionPage() {
  return (
    <AppShell active="joined" mobileTitle="相談結果と依頼の判断" mobileBackHref={routes.dashboard}>
      <PageBody>
        <PageHeader
          eyebrow="参加中の案件"
          title="相談結果と依頼の判断"
          right={<span className="hidden md:inline-flex"><DemoBadge /></span>}
        />
        <DecisionView />
      </PageBody>
    </AppShell>
  );
}
