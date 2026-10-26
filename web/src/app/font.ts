import { Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";

/** 見出し・金額用の明朝。長文本文には使わない */
export const shipporiMincho = Shippori_Mincho({
  variable: "--font-mincho",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

/** UI本文・ラベル用のゴシック */
export const zenKakuGothic = Zen_Kaku_Gothic_New({
  variable: "--font-gothic",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const notoSansJp = zenKakuGothic;
