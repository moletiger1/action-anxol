import { PublicShell } from "@/components/layout";
import { CaseBrowser } from "@/components/groupA/CaseBrowser";

// A01 案件一覧
export default function Page() {
  return (
    <PublicShell active="案件を探す">
      <CaseBrowser />
    </PublicShell>
  );
}
