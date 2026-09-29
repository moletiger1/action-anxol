import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Callout, DemoBadge } from "@/components/ui";
import { UnreadUpdates } from "@/components/groupD/UnreadUpdates";
import { PageBody, PageHeader } from "@/components/groupD/parts";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "通知｜集団訴訟.jp（仮）",
};

export default function NotificationsPage() {
  return (
    <AppShell active="notifications" mobileTitle="通知" mobileBackHref={routes.dashboard}>
      <PageBody>
        <PageHeader
          eyebrow="ダッシュボード"
          title="通知"
          right={<span className="hidden md:inline-flex"><DemoBadge /></span>}
        />
        <Callout icon={Bell}>
          表示内容は固定のデモです。既読状態はこの画面内だけで、保存や実際の通知配信は行いません。
        </Callout>
        <UnreadUpdates />
      </PageBody>
    </AppShell>
  );
}
