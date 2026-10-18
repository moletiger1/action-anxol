import { Inbox } from "lucide-react";
import { ButtonLink, StatePanel } from "@/components/ui";
import { routes } from "@/lib/routes";

export function DecisionView() {
  return (
    <StatePanel
      icon={Inbox}
      tone="neutral"
      title="相談結果はまだありません"
      action={<div className="flex flex-wrap gap-3">
        <ButtonLink href={routes.dashboard} variant="secondary">参加状況を見る</ButtonLink>
        <ButtonLink href={`${routes.workflows}#election`} variant="text">選任後の辞退・契約の操作デモ</ButtonLink>
      </div>}
    >
      このサイトに掲載された相談結果はありません。相談結果が共有された後、依頼の判断に進めます。
    </StatePanel>
  );
}
