"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, ButtonLink, StatePanel, StatusPage } from "@/components/ui";
import { routes } from "@/lib/routes";

/**
 * ルート直下のエラー境界（`retry()`で再取得・再描画を試みる）。
 * ルートレイアウト自体の失敗は`global-error`が扱う。
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // 収集先は未接続。開発時の確認用にコンソールへ出すだけ。
    console.error(error);
  }, [error]);

  return (
    <StatusPage>
      <StatePanel
        icon={TriangleAlert}
        tone="red"
        title="画面を表示できませんでした"
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button icon={RotateCcw} onClick={() => retry()}>
              もう一度試す
            </Button>
            <ButtonLink href={routes.home} variant="secondary">
              案件を探す
            </ButtonLink>
          </div>
        }
      >
        <p>一時的な問題の可能性があります。もう一度お試しください。</p>
        <p>繰り返す場合は、時間をおいてからアクセスしてください。</p>
        {error.digest && <p className="text-xs text-text-muted">識別子: {error.digest}</p>}
      </StatePanel>
    </StatusPage>
  );
}
