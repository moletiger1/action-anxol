"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import "./globals.css";
import { Button, StatePanel, StatusPage } from "@/components/ui";
import { notoSansJp } from "./font";

/**
 * ルートレイアウト自体の失敗用の境界。ルートレイアウトを置き換えるため、
 * `html`／`body`・グローバルスタイル・フォントを自分で読み込む。
 * クライアントコンポーネントのため`metadata`は使えず、`<title>`を直接置く。
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full antialiased`}>
      <head>
        <title>画面を表示できませんでした｜集団訴訟.jp（仮）</title>
      </head>
      <body className="min-h-full flex flex-col">
        <StatusPage>
          <StatePanel
            icon={TriangleAlert}
            tone="red"
            title="サービスを表示できません"
            action={
              <Button icon={RotateCcw} onClick={() => retry()}>
                もう一度試す
              </Button>
            }
          >
            <p>アプリ全体で問題が発生しました。再読み込みしても解決しない場合は、時間をおいてアクセスしてください。</p>
            {error.digest && <p className="text-xs text-text-muted">識別子: {error.digest}</p>}
          </StatePanel>
        </StatusPage>
      </body>
    </html>
  );
}
