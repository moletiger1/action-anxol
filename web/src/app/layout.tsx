import type { Metadata } from "next";
import "./globals.css";
import { shipporiMincho, zenKakuGothic } from "./font";

export const metadata: Metadata = {
  title: "集団訴訟.jp（仮）｜出来事から共同相談を探す",
  description:
    "企業やサービスで起きた出来事ごとに、当事者が資料と共同相談費を持ち寄り、弁護士の提案を参加者の審議で選ぶサービスのデモです。",
};

/**
 * ルート直下に`loading.tsx`は置かない（TEST-04の検証記録を参照）。
 * 全ルートが静的（prerender）のため、`loading.tsx`のフォールバックが
 * 初期HTMLに入り、初回表示に読み込みUIが挟まる回帰になる。
 * 動的なセグメントが生まれた時点で、そのセグメント配下に追加する。
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${shipporiMincho.variable} ${zenKakuGothic.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* キーボード利用者向けのスキップリンク。フォーカス時だけ画面上部に現れる。 */}
        <a
          href="#main"
          className="glass-sheet fixed top-4 left-4 z-50 -translate-y-24 border-2 border-primary px-4 py-2.5 text-base font-bold text-primary-dark transition-transform focus:translate-y-0 motion-reduce:transition-none"
        >
          本文へ移動
        </a>
        {children}
      </body>
    </html>
  );
}
