import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Badge, DemoBadge, StageBanner } from "@/components/ui";
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
          eyebrow="参加中の案件 ／ 〔架空の例〕オンライン英会話の自動更新で二重に請求された件"
          title="相談結果が共有されました"
          right={
            <>
              <Badge tone="neutral" icon={FlaskConical}>
                架空案件の別シナリオ
              </Badge>
              <span className="hidden md:inline-flex">
                <DemoBadge />
              </span>
            </>
          }
        />
        <StageBanner
          stage="相談結果の共有（段階5／5）"
          next="相談結果を読み、弁護士に個別に依頼するかを決めてください。依頼しなくても、結果は引き続き閲覧できます。"
        />
        <DecisionView />
      </PageBody>
    </AppShell>
  );
}
