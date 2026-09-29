import type { Metadata } from "next";
import { AppShell } from "@/components/layout";
import { SettlementView } from "@/components/groupD/SettlementView";

export const metadata: Metadata = {
  title: "あなたの返金・受取りの精算｜集団訴訟.jp（仮）",
};

// D03 本人の返金・回収金の精算（M_D03 / M_D03b モバイル対応は SettlementView 内）
export default function Page() {
  return (
    <AppShell active="money" mobileTitle="お金の記録">
      <SettlementView />
    </AppShell>
  );
}
