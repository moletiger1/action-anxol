import { Noto_Sans_JP } from "next/font/google";

/**
 * 日本語フォント。ルートレイアウトと`global-error`の両方から使うため、
 * ここに1つだけ定義する（`global-error`はルートレイアウトを置き換えるため、
 * フォントを自分で読み込む必要がある）。
 */
export const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});
