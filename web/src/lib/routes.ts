// 画面とURLの対応。フレーム名（A01 など）はデザインファイルと同じ。
export const routes = {
  home: "/", // A01 案件一覧
  event: "/events/timescar-leak", // A02 共通事件ページ
  recruitment: "/recruitments/timescar-corporate", // A03 募集詳細
  join: "/recruitments/timescar-corporate/join", // B02 当事者登録・資料共有
  individualRecruitment: "/recruitments/timescar-individual",
  individualSignin: "/recruitments/timescar-individual/signin",
  individualJoin: "/recruitments/timescar-individual/join",
  signin: "/signin", // B02b サインイン
  contribute: "/recruitments/timescar-corporate/contribute", // C01 拠出確認（C01b 状態）
  proposals: "/recruitments/timescar-corporate/proposals", // C02 提案比較・審議（C02b 採択確認）
  budget: "/recruitments/timescar-corporate/budget", // D02 共同資金の予算・支出
  create: "/create", // B01 出来事
  createSimilar: "/create/similar", // B01b 似た案件の確認
  createDetails: "/create/details", // B01c 募集内容
  createReview: "/create/review", // B01d 公開内容の確認
  createPublished: "/create/published", // B01e 作成内容のデモプレビュー
  dashboard: "/dashboard", // D01 参加中の案件
  decision: "/dashboard/decision", // D01b 相談後・依頼の判断
  settlement: "/me/settlement", // D03 本人の返金・回収金の精算
  lawyerProposal: "/lawyer/proposals/new", // C03 弁護士向け提案作成
  money: "/recruitments/timescar-corporate/budget",
  notifications: "/dashboard/notifications",
  howItWorks: "/#how",
  moneyRules: "/recruitments/timescar-corporate/budget",
} as const;
