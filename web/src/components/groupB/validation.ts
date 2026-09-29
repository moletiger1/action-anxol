import { parseYenAmount } from "@/lib/demo";
import type { CreateDraft } from "./draft";

export function todayDateKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function validateCreateEventDraft(d: CreateDraft) {
  const e: Record<string, string> = {};
  if (!d.company.trim()) e.company = "企業・サービス名を入力してください。正式名称でなくても構いません（例：タイムズカー）";
  if (!d.timeUnknown && (!d.year || !d.month)) e.time = "年と月を選んでください。分からない場合は「時期が分からない」を選べます";
  if (!d.what.trim()) e.what = "何が起きたかを入力してください。分かっている範囲の一言でも構いません";
  if (!d.relation) e.relation = "あなたとの関係を1つ選んでください。分からない場合は「まだ分からない」を選べます";
  return e;
}

export function validateDetailsDraft(d: CreateDraft) {
  const e: Record<string, string> = {};
  if (d.targets.length === 0) e.targets = "呼びかける対象を1つ以上選んでください";
  const url = d.sourceUrl.trim();
  if (url && !/^https?:\/\/[^\s/]+\.[^\s]+$/.test(url))
    e.sourceUrl = "URLの形式が正しくありません。「https://」から始まるURLを入力してください";
  if (d.purposes.length === 0) e.purposes = "相談したいことを1つ以上選んでください";
  if (d.purposes.includes("other") && !d.purposeOther.trim())
    e.purposeOther = "「その他」を選んだ場合は、相談したいことを入力してください";
  return { ...e, ...validateFundingDraft(d) };
}

export function validateFundingDraft(d: CreateDraft) {
  const e: Record<string, string> = {};
  if (d.funding !== "now") return e;
  const goal = parseYenAmount(d.goalYen);
  if (goal === null || goal <= 0) e.goalYen = "目標額を1円以上の整数で入力してください";
  if (!d.deadline || d.deadline < todayDateKey()) e.deadline = "今日以降の募集期限を選んでください";
  if (!d.usage.trim()) e.usage = "相談費の使い道を入力してください（例：法律相談、初期調査）";
  if (!d.approver.trim()) e.approver = "支出を誰がどう確認するかを入力してください";
  if (!d.refund.trim()) e.refund = "返金できる条件を入力してください（例：目標額に届かなかった場合）";
  return e;
}
