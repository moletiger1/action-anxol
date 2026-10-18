import { TIMESCAR_EVENT_ID } from "@/lib/eventIds";

// A01 案件一覧。タイムズカーの個人情報漏えい事件。
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
  title: string;
  summary: string;
  category: Category;
  stages: Stage[];
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
