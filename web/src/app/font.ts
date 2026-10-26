import { Noto_Sans_JP } from "next/font/google";

/**
 * UI全体で1つのゴシック体を使う。
 *
 * 見出しに明朝を使う案は採用しない。法律・行政の手続きを扱う画面で
 * 明朝の見出しは届出書や公告に近い印象を与え、操作画面としては古く硬く読める。
 * 階層は書体の切替ではなく、
 *   太さ（400 / 500 / 700 / 900）・字サイズの段差・字間・罫線
 * で作る（`globals.css` の `--font-display` と各見出しの指定を参照）。
 *
 * 読みやすさを優先し、`pencil-ui-prompt.md` が指定した Noto Sans JP を使う。
 */
export const notoSansJp = Noto_Sans_JP({
  variable: "--font-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});
