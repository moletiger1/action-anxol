import { TIMESCAR_EVENT_ID } from "./eventIds";
import { routes } from "./routes";

export type DemoRecruitment = {
  id: string;
  href: string;
  eventId: string;
  title: string;
  audience: "individual" | "corporate";
  badge: string;
  target: string;
  purpose: string;
  status: string;
};

export const demoRecruitments: DemoRecruitment[] = [
  {
    id: "timescar-individual",
    href: routes.individualRecruitment,
    eventId: TIMESCAR_EVENT_ID,
    title: "個人会員向けの共同相談",
    audience: "individual",
    badge: "参加希望を受付中",
    target: "個人会員として通知を受け取った方・心当たりのある方",
    purpose: "漏えいした情報の範囲の確認と、個人としての対応の相談",
    status: "登録 61人・相談費は条件設定前（拠出は未開始）",
  },
  {
    id: "timescar-corporate",
    href: routes.recruitment,
    eventId: TIMESCAR_EVENT_ID,
    title: "法人会員・利用者の共同相談",
    audience: "corporate",
    badge: "拠出前・条件確認中",
    target: "法人会員の担当者、法人契約で利用した個人",
    purpose: "法人・利用者への影響の確認と、説明の求め方・賠償の可能性の相談",
    status: "参加希望 248人・拠出条件の確定前",
  },
];

export function recruitmentsForEvent(eventId: string) {
  return demoRecruitments.filter((recruitment) => recruitment.eventId === eventId);
}
