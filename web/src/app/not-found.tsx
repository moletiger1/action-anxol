import type { Metadata } from "next";
import { MapPinOff } from "lucide-react";
import { ButtonLink, StatePanel, StatusPage } from "@/components/ui";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "ページが見つかりません｜集団訴訟.jp（仮）",
};

/** 404。未定義URLと`notFound()`の両方で表示する（共通シェルの外側で描画される）。 */
export default function NotFound() {
  return (
    <StatusPage>
      <StatePanel
        icon={MapPinOff}
        tone="neutral"
        title="ページが見つかりません"
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href={routes.home}>案件を探す</ButtonLink>
            <ButtonLink href={routes.dashboard} variant="secondary">
              参加中の案件へ
            </ButtonLink>
          </div>
        }
      >
        <p>URLが変わったか、ページが削除された可能性があります。</p>
        <p>この画面は固定のデモです。実際の案件・資金・通知には接続していません。</p>
      </StatePanel>
    </StatusPage>
  );
}
