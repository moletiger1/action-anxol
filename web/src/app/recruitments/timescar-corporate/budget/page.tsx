import type { Metadata } from "next";
import { AppShell } from "@/components/layout";
import { BudgetView } from "@/components/groupD/BudgetView";

export const metadata: Metadata = {
  title: "共同資金の予算・支出｜集団訴訟.jp（仮）",
};

export default function BudgetPage() {
  return (
    <AppShell active="money" mobileTitle="共同資金の予算・支出">
      <BudgetView />
    </AppShell>
  );
}
