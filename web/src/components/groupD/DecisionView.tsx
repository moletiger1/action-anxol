import { Inbox } from "lucide-react";
import { ButtonLink, StatePanel } from "@/components/ui";
import { routes } from "@/lib/routes";
import { KVRow } from "./parts";

export function DecisionView() {
  return (
    <div className="flex flex-col gap-6">
      <StatePanel
        icon={Inbox}
        tone="neutral"
        title="相談結果はまだありません"
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href={routes.dashboard} variant="secondary">
              参加状況を見る
            </ButtonLink>
            <ButtonLink href={`${routes.workflows}#election`} variant="text">
              選任後の辞退・契約の操作デモ
            </ButtonLink>
          </div>
        }
      >
        このサイトに掲載された相談結果はありません。相談結果が共有された後、依頼の判断に進めます。
      </StatePanel>

      {/* 採択と正式な依頼は別の手続きであることを、判断の前に示す */}
      <section aria-labelledby="decision-rules" className="flex flex-col">
        <h2
          id="decision-rules"
          className="rule-head font-display text-lg leading-snug font-bold text-text"
        >
          相談結果が出た後に決めること
        </h2>
        <dl className="flex flex-col">
          <KVRow label="相談先の採択">
            共同相談の相談先は、選任された審議役が決定条件に沿って選びます。管理者だけでは変更できません。
          </KVRow>
          <KVRow label="正式な依頼">
            訴訟などの正式な依頼は、採択とは別の手続きです。相談結果を見たうえで、希望する人が本人として個別に判断します。
          </KVRow>
          <KVRow label="支払条件">
            費用の使途・確認者・返金条件は、依頼する人の間で設定されるまで確定しません。
          </KVRow>
          <KVRow label="表示している内容" last>
            この画面はデモ表示です。実際の相談結果・依頼・支払いは発生しません。
          </KVRow>
        </dl>
      </section>
    </div>
  );
}
