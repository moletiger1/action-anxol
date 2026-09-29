"use client";

import {
  ArrowDownUp,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CirclePause,
  Clock3,
  Info,
  Lock,
  Send,
  ShieldCheck,
  User,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Callout,
  ConfirmDialog,
  CostRow,
  StageBanner,
  StatePanel,
  Tabs,
  type BadgeTone,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatYen } from "@/lib/demo";
import { routes } from "@/lib/routes";
import { DemoSwitch } from "./parts";

type Role = "participant" | "deliberator";
type Rule = "unset" | "met";
type LawyerKey = "A" | "B" | "C";

type Cell = { text?: string; sub?: string; badge?: { tone: BadgeTone; icon: LucideIcon; label: string } };

const LAWYERS: { key: LawyerKey; name: string; fee: number; conflictChecked: boolean }[] = [
  { key: "A", name: "弁護士A", fee: 180000, conflictChecked: true },
  { key: "B", name: "弁護士B", fee: 150000, conflictChecked: true },
  { key: "C", name: "弁護士C", fee: 210000, conflictChecked: false },
];

const BUDGET_LEGAL = 180000;

const done = { tone: "green" as const, icon: CircleCheck };

const ROWS: { key: string; label: string; money?: boolean; cells: [Cell, Cell, Cell] }[] = [
  {
    key: "fee",
    label: "今回の相談費用（税込）",
    money: true,
    cells: [
      { text: "180,000円", sub: "税込" },
      { text: "150,000円", sub: "税込" },
      {
        text: "210,000円",
        sub: "税込",
        badge: { tone: "amber", icon: Clock3, label: "予算を30,000円超過" },
      },
    ],
  },
  {
    key: "scope",
    label: "相談範囲",
    cells: [
      { text: "共同相談2回・書面での回答" },
      { text: "共同相談1回・質疑への書面回答" },
      { text: "共同相談2回・希望者の個別質問（各30分）" },
    ],
  },
  {
    key: "research",
    label: "調査内容",
    cells: [
      { text: "公表資料と通知内容の分析、法人利用者への影響の整理" },
      { text: "公表資料の分析" },
      { text: "公表資料・通知の分析、同種事案の整理" },
    ],
  },
  {
    key: "due",
    label: "納期",
    cells: [{ text: "採択から6週間" }, { text: "採択から4週間" }, { text: "採択から8週間" }],
  },
  {
    key: "team",
    label: "担当体制",
    cells: [{ text: "弁護士2名" }, { text: "弁護士1名" }, { text: "弁護士2名・事務1名" }],
  },
  {
    key: "expense",
    label: "実費",
    money: true,
    cells: [{ text: "上限 7,500円" }, { text: "なし" }, { text: "上限 15,000円" }],
  },
  {
    key: "future",
    label: "将来の訴訟費用",
    money: true,
    cells: [
      { text: "提示あり（概算）", badge: { ...done, label: "提示あり" } },
      { text: "相談後に提示", badge: { tone: "neutral", icon: CircleDashed, label: "未提示" } },
      { text: "考え方のみ提示", badge: { tone: "primary", icon: Info, label: "一部提示" } },
    ],
  },
  {
    key: "conflict",
    label: "利益相反の確認",
    cells: [
      { badge: { ...done, label: "確認済み" } },
      { badge: { ...done, label: "確認済み" } },
      { badge: { tone: "amber", icon: Clock3, label: "確認中" } },
    ],
  },
  {
    key: "qa",
    label: "質問と回答",
    cells: [{ text: "回答済み 3件" }, { text: "回答済み 1件" }, { text: "回答待ち 1件・回答済み 1件" }],
  },
];

type SortKey = "standard" | "money";

function CellView({ cell, small }: { cell: Cell; small?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      {cell.text && (
        <span className={cn("text-sm text-text", cell.sub && "tabular font-bold", small && "text-[15px]")}>
          {cell.text}
        </span>
      )}
      {cell.sub && <span className="tabular text-xs text-text-muted">{cell.sub}</span>}
      {cell.badge && (
        <Badge tone={cell.badge.tone} icon={cell.badge.icon}>
          {cell.badge.label}
        </Badge>
      )}
    </div>
  );
}

type Post = { id: number; target: string; body: string };

export function ProposalsView() {
  const [role, setRole] = useState<Role>("participant");
  const [rule, setRule] = useState<Rule>("unset");
  const [sort, setSort] = useState<SortKey>("standard");
  const [adoptTarget, setAdoptTarget] = useState<LawyerKey | null>(null);
  const [adopting, setAdopting] = useState(false);
  const [adopted, setAdopted] = useState<LawyerKey | null>(null);
  const [draft, setDraft] = useState("");
  const [postOpen, setPostOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postError, setPostError] = useState("");
  const askRef = useRef<HTMLInputElement>(null);

  const isDeliberator = role === "deliberator";
  const ruleMet = rule === "met";
  const rows = sort === "standard" ? ROWS : [...ROWS.filter((r) => r.money), ...ROWS.filter((r) => !r.money)];
  const target = LAWYERS.find((l) => l.key === adoptTarget);

  function adoptBlockedReason(l: (typeof LAWYERS)[number]): string | null {
    if (adopted) return adopted === l.key ? "採択操作済み（デモ）" : "採択デモは完了済み";
    if (!ruleMet) return "決定条件が未設定のため採択できません";
    if (!l.conflictChecked) return "利益相反の確認中のため採択できません";
    return null;
  }

  function confirmAdopt() {
    if (!adoptTarget || adopting) return;
    setAdopting(true);
    setTimeout(() => {
      setAdopted(adoptTarget);
      setAdopting(false);
      setAdoptTarget(null);
    }, 1200);
  }

  function openPost() {
    if (!draft.trim()) {
      setPostError("質問・意見を入力してください");
      askRef.current?.focus();
      return;
    }
    setPostError("");
    setPostOpen(true);
  }

  function confirmPost() {
    setPosts((p) => [{ id: Date.now(), target: "提案全体", body: draft.trim() }, ...p]);
    setDraft("");
    setPostOpen(false);
    document.getElementById("discussion")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function askAboutRules() {
    if (!draft.startsWith("【決定方法の設定案への意見】")) setDraft(`【決定方法の設定案への意見】${draft}`);
    askRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => askRef.current?.focus(), 300);
  }

  const qaCount = 6 + posts.length;

  const adoptButton = (l: (typeof LAWYERS)[number], full?: boolean) => {
    const reason = adoptBlockedReason(l);
    return (
      <div className={cn("flex flex-col gap-1", full && "w-full")}>
        <Button
          size="sm"
          icon={adopted === l.key ? CircleCheck : ShieldCheck}
          disabled={!!reason}
          onClick={() => setAdoptTarget(l.key)}
          className={cn("px-4 text-sm", full && "w-full")}
        >
          {adopted === l.key ? `${l.name}の採択操作済み` : `${l.name}の採択デモを試す`}
        </Button>
        {reason && adopted !== l.key && <span className="text-xs text-text-muted">{reason}</span>}
      </div>
    );
  };

  const unsetBadge = (
    <Badge tone="neutral" icon={CircleDashed}>
      未設定
    </Badge>
  );
  const setBadge = (
    <Badge tone="green" icon={CircleCheck}>
      設定済み（この画面内のデモ）
    </Badge>
  );

  const whoRows: { label: string; value: ReactNode }[] = [
    { label: "母集団", value: "この募集で本人・関係性の確認が済んだ参加者（現在176人）" },
    { label: "審議役の選任方法", value: ruleMet ? setBadge : unsetBadge },
    { label: "審議役の人数・定足数", value: ruleMet ? setBadge : unsetBadge },
    { label: "利益相反の確認", value: "審議役は、就任前に各弁護士との関係がないことを申告・確認します" },
    { label: "決定条件", value: ruleMet ? setBadge : unsetBadge },
  ];

  const qaList = (
    <div className="flex flex-col gap-3.5">
      {posts.map((p) => (
        <article key={p.id} className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[13px] font-bold text-text-muted">あなたの投稿 → {p.target}</span>
            <Badge tone="amber" icon={Clock3}>
              回答待ち
            </Badge>
          </div>
          <p className="text-[15px] font-bold whitespace-pre-wrap text-text">{p.body}</p>
        </article>
      ))}
      <article className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] font-bold text-text-muted">参加者の質問 → 弁護士A</span>
          <Badge tone="green" icon={CircleCheck}>
            回答済み
          </Badge>
        </div>
        <p className="text-[15px] font-bold text-text">
          法人会員の利用者として相談に参加した場合、勤務先の担当者にも内容が共有されますか？
        </p>
        <div className="flex flex-col gap-1 rounded-[10px] bg-[#F4F6F9] px-4 py-3">
          <span className="text-[13px] font-bold text-text-sub">弁護士Aの回答（2026年10月20日）</span>
          <p className="text-sm text-text">
            共同相談の内容は参加者全体に共有しますが、個人ごとの資料や質問者の名前は、本人の同意なく勤務先に共有しません。
          </p>
        </div>
      </article>
      <article className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] font-bold text-text-muted">参加者の質問 → 弁護士C</span>
          <Badge tone="amber" icon={Clock3}>
            回答待ち
          </Badge>
        </div>
        <p className="text-[15px] font-bold text-text">予算を超える30,000円分は、どのように扱う想定ですか？</p>
      </article>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-10 md:px-9 md:pt-7 md:pb-[72px]">
      {/* 上部 */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-text-muted">参加中の案件 ／ 法人会員・利用者の共同相談</p>
          <h1 className="text-2xl font-bold text-text md:text-[28px]">弁護士の提案を比較する</h1>
        </div>
        <div>
          {isDeliberator ? (
            <Badge tone="primary" icon={UserCheck} className="whitespace-normal!">
              表示中の役割：審議役（デモ）
            </Badge>
          ) : (
            <Badge tone="neutral" icon={User} className="whitespace-normal!">
              表示中の役割：参加者（デモ）
            </Badge>
          )}
        </div>
      </div>

      <Callout icon={Info} tone="neutral" title="提案・審議画面のデモ">
        <p>弁護士・金額・質問・記録は表示例です。投稿や採択を操作しても、この画面内の表示が変わるだけで、保存・通知・契約・支払いは行われません。</p>
      </Callout>

      <div className="flex flex-col gap-2 lg:flex-row">
        <DemoSwitch
          label="役割"
          value={role}
          onChange={setRole}
          options={[
            { value: "participant", label: "一般参加者" },
            { value: "deliberator", label: "審議役" },
          ]}
        />
        <DemoSwitch
          label="決定方法"
          value={rule}
          onChange={(v) => {
            setRule(v);
            setAdopted(null);
          }}
          options={[
            { value: "unset", label: "未設定・条件未達" },
            { value: "met", label: "決定条件を満たした後" },
          ]}
        />
      </div>

      <StageBanner
        stage="弁護士の提案・審議（段階3／5）"
        next="3件の提案を同じ項目で比べ、気になる点を質問してください。相談先の採択は、選任された審議役が決定条件に沿って行います。"
      />

      <div className="flex gap-3 rounded-[10px] bg-primary-soft px-4 py-3.5">
        <Info className="mt-0.5 size-5 shrink-0 text-primary-dark" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-bold text-primary-dark">ここで選ぶのは「共同相談の相談先」です</p>
          <p className="text-sm text-text">
            訴訟の委任ではありません。訴訟などの正式な依頼は、相談結果を見たうえで、希望する人が本人として個別に決めます。
          </p>
        </div>
      </div>

      {adopted && (
        <Callout icon={CircleCheck} tone="green" title={`弁護士${adopted}の採択デモを完了しました`}>
          <p>
            採択済み表示に切り替わりました。この状態は保存・通知されず、契約条件や支払いにも反映されません。
          </p>
          <div>
            <ButtonLink href={routes.budget} variant="text">
              予算と支払条件を見る
            </ButtonLink>
          </div>
        </Callout>
      )}

      <div className="flex flex-col gap-7 xl:flex-row">
        {/* 比較 */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-text">提案の比較（3件）</h2>
            <label className="relative flex h-11 items-center gap-2 rounded-[10px] border border-border-strong bg-surface pr-3 pl-3.5 focus-within:ring-3 focus-within:ring-focus/60">
              <ArrowDownUp className="size-4 text-text-sub" aria-hidden />
              <span className="sr-only">項目の並び</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="appearance-none bg-transparent pr-6 text-sm text-text focus:outline-none"
              >
                <option value="standard">項目の並び：標準</option>
                <option value="money">項目の並び：費用の項目を先に</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 size-4 text-text-sub" aria-hidden />
            </label>
          </div>

          {/* デスクトップ：表 */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-surface lg:block">
            <table className="w-full table-fixed border-collapse text-left">
              <caption className="sr-only">弁護士A・B・Cの提案を同じ項目で比較した表</caption>
              <thead>
                <tr className="border-b border-border bg-[#F4F6F9]">
                  <th scope="col" className="w-[128px] px-4 py-3.5 text-[13px] font-bold text-text-sub">
                    項目
                  </th>
                  {LAWYERS.map((l) => (
                    <th key={l.key} scope="col" className="px-3 py-3.5 last:pr-4">
                      <span className="flex flex-col">
                        <span className="text-base font-bold text-text">{l.name}</span>
                        <span className="text-xs font-normal text-text-muted">〔架空〕法律事務所</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-border last:border-b-0">
                    <th scope="row" className="px-4 py-3.5 align-top text-[13px] font-bold text-text-sub">
                      {r.label}
                    </th>
                    {r.cells.map((c, i) => (
                      <td key={i} className="px-3 py-3.5 align-top last:pr-4">
                        <CellView cell={c} />
                      </td>
                    ))}
                  </tr>
                ))}
                {isDeliberator && (
                  <tr className="border-t border-border bg-primary-soft/40">
                    <th scope="row" className="px-4 py-3.5 align-top text-[13px] font-bold text-text-sub">
                      採択（審議役のみ）
                    </th>
                    {LAWYERS.map((l) => (
                      <td key={l.key} className="px-3 py-3.5 align-top last:pr-4">
                        {adoptButton(l)}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* モバイル・タブレット：項目ごとに縦積み */}
          <div className="flex flex-col gap-3 lg:hidden">
            {rows.map((r) => (
              <section key={r.key} className="rounded-xl border border-border bg-surface">
                <h3 className="border-b border-border bg-[#F4F6F9] px-4 py-2.5 text-sm font-bold text-text-sub">
                  {r.label}
                </h3>
                <dl className="flex flex-col">
                  {r.cells.map((c, i) => (
                    <div
                      key={i}
                      className={cn("flex gap-3 px-4 py-3", i < 2 && "border-b border-border")}
                    >
                      <dt className="w-[72px] shrink-0 text-sm font-bold text-text">{LAWYERS[i].name}</dt>
                      <dd className="min-w-0 flex-1">
                        <CellView cell={c} small />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            <p className="text-xs text-text-muted">弁護士A・B・Cはいずれも〔架空〕法律事務所です。</p>
            {isDeliberator && (
              <section className="flex flex-col gap-3 rounded-xl border border-primary bg-surface p-4">
                <h3 className="text-sm font-bold text-text">採択（審議役のみ）</h3>
                {LAWYERS.map((l) => (
                  <div key={l.key}>{adoptButton(l, true)}</div>
                ))}
              </section>
            )}
          </div>

          <p className="text-[13px] text-text-muted">
            AIによる勝率の推定や、提案の自動順位付けは行いません。費用は日本円の表示例です。
          </p>

          {/* 説明・質問・審議記録 */}
          <section id="discussion" className="flex scroll-mt-20 flex-col gap-3.5 pt-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xl font-bold text-text">説明・質問・審議記録</h2>
              <p className="text-sm text-text-muted">
                質問・回答・審議記録の表示例です。投稿内容はこの画面内だけで扱います。
              </p>
            </div>
            <Tabs
              className="gap-3.5"
              items={[
                { key: "qa", label: `質問と回答（${qaCount}）`, content: qaList },
                {
                  key: "expert",
                  label: "専門家の説明（3）",
                  content: (
                    <div className="flex flex-col gap-3">
                      {LAWYERS.map((l) => (
                        <article key={l.key} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-5">
                          <Info className="size-5 shrink-0 text-primary-dark" aria-hidden />
                          <span className="flex-1 text-[15px] font-bold text-text">{l.name}による提案の説明</span>
                          <span className="text-[13px] text-text-muted">デモでは本文を省略</span>
                        </article>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "record",
                  label: `審議記録（${adopted ? 3 : 2}）`,
                  content: (
                    <div className="flex flex-col gap-3">
                      {adopted && (
                        <article className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5">
                          <span className="text-[13px] font-bold text-text-muted">審議記録（デモ）</span>
                          <span className="text-[15px] font-bold text-text">
                            弁護士{adopted}を共同相談の相談先として採択
                          </span>
                        </article>
                      )}
                      <article className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5">
                        <span className="text-[13px] font-bold text-text-muted">審議記録（デモ）</span>
                        <span className="text-[15px] font-bold text-text">提案3件の受付を締め切りました</span>
                      </article>
                      <article className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5">
                        <span className="text-[13px] font-bold text-text-muted">審議記録（デモ）</span>
                        <span className="text-[15px] font-bold text-text">決定方法の設定案（表示例）</span>
                      </article>
                    </div>
                  ),
                },
              ]}
            />
            <form
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-start"
              onSubmit={(e) => {
                e.preventDefault();
                openPost();
              }}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label htmlFor="ask" className="sr-only">
                  提案について質問・意見を書く
                </label>
                <input
                  id="ask"
                  ref={askRef}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (postError) setPostError("");
                  }}
                  maxLength={500}
                  aria-invalid={!!postError || undefined}
                  aria-describedby="ask-help"
                  placeholder="提案について質問・意見を書く（名前は表示されません）"
                  className={cn(
                    "h-12 w-full rounded-[10px] border px-4 text-base text-text placeholder:text-text-muted focus:border-primary focus:ring-3 focus:ring-focus/60 focus:outline-none",
                    postError ? "border-red bg-red-soft" : "border-border-strong bg-surface",
                  )}
                />
                <p id="ask-help" className={cn("text-sm", postError ? "text-red" : "sr-only")}>
                  {postError || "名前は表示されません"}
                </p>
              </div>
              <Button type="submit" icon={Send}>
                質問・意見を投稿する
              </Button>
            </form>
          </section>
        </div>

        {/* 誰が選ぶか */}
        <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-[320px]">
          <section className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-text">
              <Users className="size-5 text-primary-dark" aria-hidden />
              誰が選ぶか
            </h2>
            <dl className="flex flex-col">
              {whoRows.map((w, i) => (
                <div
                  key={w.label}
                  className={cn("flex flex-col items-start gap-1 py-2.5", i < whoRows.length - 1 && "border-b border-border")}
                >
                  <dt className="text-[13px] font-bold text-text-muted">{w.label}</dt>
                  <dd className="text-sm text-text">{w.value}</dd>
                </div>
              ))}
            </dl>
            {ruleMet ? (
              <div className="flex flex-col gap-1.5 rounded-[10px] border border-green/40 bg-green-soft p-3.5">
                <p className="flex items-center gap-2 text-base font-bold text-green">
                  <CircleCheck className="size-[18px]" aria-hidden />
                  決定条件を満たしています
                </p>
                <p className="text-sm text-text">
                  このデモ設定では、審議役の採択操作を試せます。実際の審議記録や参加者への通知はありません。
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-[10px] border border-amber-line bg-amber-soft p-3.5">
                <p className="flex items-center gap-2 text-base font-bold text-amber">
                  <CirclePause className="size-[18px]" aria-hidden />
                  まだ採択できません
                </p>
                <p className="text-sm text-text">
                  選任方法と決定条件が未設定のため、誰も相談先を決定できません。設定案は参加者に公開され、意見を募ってから確定します。
                </p>
              </div>
            )}
            <Button variant="secondary" className="w-full" onClick={askAboutRules}>
              決定方法の設定案に意見を送る
            </Button>
          </section>

          {isDeliberator ? (
            <StatePanel
              icon={ruleMet ? ShieldCheck : Lock}
              tone={ruleMet ? "primary" : "neutral"}
              title={ruleMet ? "採択操作のデモができます" : "採択操作はデモ上でも無効です"}
            >
              {ruleMet
                ? "比較表から候補を選び、採択操作のデモを試せます。利益相反確認中の候補は選べません。"
                : "あなたは審議役として表示していますが、選任方法と決定条件が未設定のため、採択の操作は無効になっています。"}
            </StatePanel>
          ) : (
            <StatePanel icon={Lock} tone="neutral" title="採択操作のデモは審議役にだけ表示されます">
              表示中の参加者役では、質問・意見投稿の表示例と審議記録の表示例を確認できます。
            </StatePanel>
          )}

          <nav aria-label="説明・質問・審議記録" className="flex flex-col rounded-xl border border-border bg-surface px-5 py-2">
            {["専門家の説明を読む", "参加者の質問を見る", "弁護士の回答を見る", "審議記録を見る"].map((t) => (
              <div key={t}>
                <ButtonLink href="#discussion" variant="text">
                  {t}
                </ButtonLink>
              </div>
            ))}
          </nav>
        </aside>
      </div>

      {/* C02b 採択の確認（審議役のみ） */}
      <ConfirmDialog
        open={!!target}
        onClose={() => !adopting && setAdoptTarget(null)}
        onConfirm={confirmAdopt}
        confirming={adopting}
        width={600}
        title={target ? `${target.name}を共同相談の相談先として採択しますか？` : ""}
        description="採択状態をこの画面内で再現します。実際の決定・記録保存・参加者への通知は行われません。"
      >
        {target && (
          <>
            <CostRow
              label="相談費用（税込）"
              value={formatYen(target.fee)}
              sub={`${
                target.fee <= BUDGET_LEGAL ? "法律相談の予算内" : `法律相談の予算を${formatYen(target.fee - BUDGET_LEGAL)}超過`
              }`}
            />
            <CostRow
              label="決定条件"
              note="この画面内のデモ設定"
              value="満たしています"
            />
            <CostRow label="利益相反の確認" note={`${target.name}・審議役の双方`} value="確認済み" />
            <CostRow
              label="採択後に起きること"
              note="実際の契約条件・支払条件は変更されません"
              value="登録状態の表示例"
              last
            />
          </>
        )}
      </ConfirmDialog>

      {/* 投稿の確認 */}
      <ConfirmDialog
        open={postOpen}
        onClose={() => setPostOpen(false)}
        onConfirm={confirmPost}
        icon={Send}
        title="この内容で投稿しますか？"
        description="投稿内容はこの画面内に一時表示されます。保存・共有・通知は行われません。"
        confirmLabel="デモ画面に投稿する"
        cancelLabel="戻って直す"
      >
        <p className="rounded-[10px] bg-[#F4F6F9] px-4 py-3 text-[15px] whitespace-pre-wrap text-text">{draft}</p>
      </ConfirmDialog>
    </div>
  );
}
