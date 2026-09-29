// 円建ての固定デモ値。実際の募集・入出金・決済手数料を示すものではない。
export const recruitmentStats = {
  registered: 248,
  identityChecked: 176,
  documentsChecked: 124,
  contributors: 112,
  goalYen: 300_000,
  currentYen: 168_000,
  deadline: "2026年11月30日",
};

export const consultationBudget = [
  { label: "法律相談", yen: 180_000 },
  { label: "初期調査", yen: 75_000 },
  { label: "資料整理", yen: 30_000 },
  { label: "決済等の予備費", yen: 15_000 },
];

/** 円は整数のみ。空欄・小数・指数表記・不正な桁区切り・安全整数外を拒否。 */
export function parseYenAmount(value: string): number | null {
  const text = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(text)) return null;
  const amount = Number(text.replace(/,/g, ""));
  return Number.isSafeInteger(amount) ? amount : null;
}

export function formatYen(amount: number) {
  return `${amount.toLocaleString("ja-JP")}円`;
}
