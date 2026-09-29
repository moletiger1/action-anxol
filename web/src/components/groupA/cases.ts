import { TIMESCAR_EVENT_ID } from "@/lib/eventIds";

// A01 案件一覧のデモ用データ。タイムズ案件以外は明示的な架空の例。
export const categories = [
  "個人情報・プライバシー",
  "契約・料金",
  "製品の不具合・安全",
  "サービスの停止・障害",
] as const;

export const stages = [
  "参加希望を受付中",
  "相談費を募集中",
  "弁護士の提案・審議中",
  "相談結果を共有済み",
] as const;

export type Category = (typeof categories)[number];
export type Stage = (typeof stages)[number];

export type CaseItem = {
  id: string;
  eventId?: string;
  featured?: boolean;
  fictional?: boolean;
  title: string;
  summary: string;
  category: Category;
  stages: Stage[];
  recruitmentCount?: number;
  /** ISO 日付（並べ替え用） */
  updatedAt: string;
  updatedLabel: string;
  /** 検索用の追加語 */
  keywords: string;
};

export const cases: CaseItem[] = [
  {
    id: "timescar-leak",
    eventId: TIMESCAR_EVENT_ID,
    featured: true,
    title: "タイムズカーの個人情報漏えいに関する共同相談",
    summary:
      "2026年9月28日、運営会社が「タイムズカーWebサイト」への不正アクセスに関する調査結果（第2報）を公表しました。自分の情報の対象範囲や影響を知りたい当事者が集まり、共同で弁護士に相談する準備をしています。",
    category: "個人情報・プライバシー",
    stages: ["参加希望を受付中"],
    updatedAt: "2026-09-29",
    updatedLabel: "更新 2026年9月29日",
    keywords:
      "タイムズ タイムズカー times timescar パーク24 個人情報 漏えい 漏洩 不正アクセス 法人会員 個人会員 カーシェア 運転免許",
  },
  {
    id: "eikaiwa",
    fictional: true,
    title: "〔架空〕オンライン英会話の自動更新で二重に請求された件",
    summary:
      "解約手続き後も翌月分が請求されたという利用者が、請求の経緯と返金の求め方を相談するために集まっています。",
    category: "契約・料金",
    stages: ["参加希望を受付中"],
    recruitmentCount: 1,
    updatedAt: "2026-09-20",
    updatedLabel: "更新 2026年9月20日",
    keywords: "架空 英会話 オンライン 自動更新 二重請求 解約 サブスク 返金 料金 契約",
  },
  {
    id: "kettle",
    fictional: true,
    title: "〔架空〕電気ケトルのふたの部品が外れる不具合の件",
    summary:
      "使用中に部品が外れたという購入者が、事業者への報告方法と今後の対応を確認するために集まっています。",
    category: "製品の不具合・安全",
    stages: ["参加希望を受付中"],
    recruitmentCount: 1,
    updatedAt: "2026-09-12",
    updatedLabel: "更新 2026年9月12日",
    keywords: "架空 電気ケトル ケトル 家電 部品 ふた 不具合 安全 製品",
  },
];

function normalize(s: string) {
  return s.normalize("NFKC").toLowerCase();
}

/** 空白区切りの語をすべて含む案件だけを残す */
export function matchesQuery(c: CaseItem, q: string) {
  const words = normalize(q).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = normalize([c.title, c.summary, c.category, c.keywords].join(" "));
  return words.every((w) => hay.includes(w));
}
