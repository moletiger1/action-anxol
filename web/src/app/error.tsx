"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, StatePanel, StatusPage } from "@/components/ui";

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
          <Button icon={RotateCcw} onClick={() => retry()}>
            もう一度試す
          </Button>
        }
      />
    </StatusPage>
  );
}
