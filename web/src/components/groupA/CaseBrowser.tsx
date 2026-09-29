"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  FileText,
  FlaskConical,
  HandCoins,
  Inbox,
  Info,
  ListChecks,
  Plus,
  ReceiptText,
  SearchX,
  SlidersHorizontal,
  User,
  Users,
} from "lucide-react";
import { Badge, Button, ButtonLink, Callout, DemoBadge, SearchBar, StatePanel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { readPublishedPreviews, type PreviewReadError, type PublishedPreview } from "@/lib/publishedPreview";
import { routes } from "@/lib/routes";
import { recruitmentsForEvent } from "@/lib/demoRecruitments";
import { TIMESCAR_EVENT_ID } from "@/lib/eventIds";
import { Wrap } from "./parts";
import {
  cases,
  categories,
  matchesQuery,
  stages,
  type CaseItem,
  type Category,
  type Stage,
} from "./cases";

const stageIcon = { 参加希望を受付中: Users, 相談費を募集中: HandCoins } as const;

type Sort = "new" | "old";
const DEFAULT_STAGES: Stage[] = ["参加希望を受付中"];

function FilterOption({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5",
        checked ? "bg-primary-soft" : "hover:bg-surface",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-[5px] border peer-focus-visible:ring-3 peer-focus-visible:ring-focus",
          checked ? "border-primary bg-primary" : "border-border-strong bg-surface",
        )}
      >
        {checked && <Check className="size-3.5 text-white" />}
      </span>
      <span
        className={cn(
          "flex-1 text-[15px]",
          checked ? "font-bold text-primary-dark" : "text-text",
        )}
      >
        {label}
      </span>
      <span className="tabular text-[13px] text-text-muted">{count}</span>
    </label>
  );
}

function FilterGroup<T extends string>({
  title,
  options,
  selected,
  counts,
  onToggle,
}: {
  title: string;
  options: readonly T[];
  selected: T[];
  counts: Record<string, number>;
  onToggle: (v: T, on: boolean) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-bold text-text-sub">{title}</legend>
      {options.map((o) => (
        <FilterOption
          key={o}
          label={o}
          count={counts[o] ?? 0}
          checked={selected.includes(o)}
          onChange={(on) => onToggle(o, on)}
        />
      ))}
    </fieldset>
  );
}

function FeaturedCard({ c }: { c: CaseItem }) {
  const eventRecruitments = c.eventId ? recruitmentsForEvent(c.eventId) : [];
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-primary bg-surface p-5 md:p-7">
      <div className="flex flex-wrap items-center gap-2">
        {c.stages.map((s) => (
          <Badge key={s} icon={stageIcon[s as keyof typeof stageIcon] ?? Users}>
            {s}
          </Badge>
        ))}
        <span className="text-[13px] text-text-muted">{c.category}</span>
      </div>
      <h3 className="text-xl font-bold text-text md:text-2xl">{c.title}</h3>
      <p className="text-base text-text-sub">{c.summary}</p>
      <div className="overflow-hidden rounded-[10px] border border-border">
        <p className="border-b border-border bg-[#F4F6F9] px-4 py-2.5 text-[13px] font-bold text-text-muted">
          この出来事について募集中の相談（{eventRecruitments.length}件）
        </p>
        <ul>
          {eventRecruitments.map((recruitment, index) => {
            const Icon = recruitment.audience === "individual" ? User : Building2;
            const StatusIcon = recruitment.audience === "individual" ? Users : HandCoins;
            return (
              <li
                key={recruitment.id}
                className={`flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 ${
                  index < eventRecruitments.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 gap-4">
                  <Icon className="mt-0.5 size-5 shrink-0 text-text-sub" aria-hidden />
                  <div className="flex min-w-0 flex-col">
                    {recruitment.audience === "corporate" ? (
                      <Link
                        href={recruitment.href}
                        className="text-base font-bold text-text hover:text-primary-dark hover:underline"
                      >
                        {recruitment.title}
                      </Link>
                    ) : (
                      <span className="text-base font-bold text-text">{recruitment.title}</span>
                    )}
                    <span className="text-[13px] text-text-muted">対象：{recruitment.target}</span>
                  </div>
                </div>
                <Badge
                  tone={recruitment.audience === "individual" ? "primary" : "neutral"}
                  icon={StatusIcon}
                  className="self-start sm:self-auto"
                >
                  {recruitment.badge}
                </Badge>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-5 text-sm text-text-muted">
          <span className="flex items-center gap-1.5">
            <FileText className="size-4" aria-hidden />
            公表資料あり
          </span>
          <span>{c.updatedLabel}</span>
        </div>
        <ButtonLink href={routes.event} variant="secondary" icon={ArrowRight}>
          事件ページを見る
        </ButtonLink>
      </div>
    </article>
  );
}

function FictionalCard({ c }: { c: CaseItem }) {
  const [noted, setNoted] = useState(false);
  return (
    <article className="flex flex-1 flex-col gap-3 rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge icon={Users}>参加希望を受付中</Badge>
        <Badge tone="neutral" icon={FlaskConical}>
          架空の例
        </Badge>
      </div>
      <h3 className="text-lg font-bold text-text">{c.title}</h3>
      <p className="text-sm text-text-sub">{c.summary}</p>
      <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
        <span>募集中の相談 {c.recruitmentCount ?? 0}件</span>
        <span>{c.updatedLabel}</span>
      </div>
      <div className="mt-auto flex flex-col">
        <Button
          variant="text"
          className="self-start"
          aria-expanded={noted}
          onClick={() => setNoted((v) => !v)}
        >
          事件ページを見る
        </Button>
        {noted && (
          <p role="status" className="text-[13px] text-text-muted">
            架空の例のため、このデモには事件ページがありません。
          </p>
        )}
      </div>
    </article>
  );
}

function CreatedPreviewCard({ preview }: { preview: PublishedPreview }) {
  const title = preview.rows.find(([label]) => label === "事件名")?.[1] ?? "作成した事件";
  const summary = preview.rows.find(([label]) => label === "起きたこと")?.[1] ?? "";
  const draft = typeof preview.draft === "object" && preview.draft !== null ? preview.draft : null;
  const eventId =
    draft && "eventId" in draft && typeof draft.eventId === "string"
      ? draft.eventId
      : null;
  const linkedToTimescar =
    eventId === TIMESCAR_EVENT_ID ||
    (draft !== null && !("eventId" in draft) && "linkMode" in draft && draft.linkMode === "existing");

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 md:p-6">
      <Badge tone="neutral" icon={FlaskConical}>このブラウザ内のプレビュー</Badge>
      <h3 className="text-lg font-bold text-text">{title}</h3>
      {summary && <p className="text-sm text-text-sub">{summary}</p>}
      <p className="text-xs text-text-muted">
        {preview.updatedAt ? "更新" : "作成"} {new Date(preview.updatedAt ?? preview.createdAt).toLocaleString("ja-JP")}
      </p>
      {linkedToTimescar && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-sub">
          <span>紐付け先：タイムズカーの事件ページ。この作成例は募集一覧には掲載されていません。</span>
          <Link href={routes.event} className="font-medium text-primary-dark hover:underline">
            事件ページを見る
          </Link>
        </div>
      )}
      <div>
        <ButtonLink
          href={`${routes.createPublished}?preview=${encodeURIComponent(preview.id)}`}
          variant="secondary"
          icon={ArrowRight}
        >
          プレビューを開く
        </ButtonLink>
      </div>
    </article>
  );
}

function CreatedPreviewsSection({
  previews,
  loadError,
  className,
  titleId,
}: {
  previews: PublishedPreview[];
  loadError: PreviewReadError | null;
  className: string;
  titleId: string;
}) {
  if (loadError) {
    return (
      <section aria-labelledby={titleId} className={className}>
        <h2 id={titleId} className="mb-3 text-lg font-bold text-text">作成したプレビュー</h2>
        <Callout icon={Info} tone="red">
          <p>
            {loadError === "history-unreadable"
              ? "保存済みプレビューの履歴を読み取れませんでした。データは変更していません。"
              : "ブラウザーの保存領域を利用できず、作成例を読み込めませんでした。"}
          </p>
        </Callout>
      </section>
    );
  }
  if (previews.length === 0) return null;
  const visible = previews.slice(0, 3);
  return (
    <section aria-labelledby={titleId} className={className}>
      <h2 id={titleId} className="mb-3 text-lg font-bold text-text">
        作成したプレビュー
      </h2>
      <div className="flex flex-col gap-3">
        {visible.map((preview) => (
          <CreatedPreviewCard key={preview.id} preview={preview} />
        ))}
      </div>
      {previews.length > visible.length && (
        <ButtonLink href={routes.createPublished} variant="text" className="mt-2">
          すべて見る（あと{previews.length - visible.length}件）
        </ButtonLink>
      )}
    </section>
  );
}

export function CaseBrowser() {
  const [createdPreviews, setCreatedPreviews] = useState<PublishedPreview[]>([]);
  const [previewLoadError, setPreviewLoadError] = useState<PreviewReadError | null>(null);
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [stgs, setStgs] = useState<Stage[]>(DEFAULT_STAGES);
  const [sort, setSort] = useState<Sort>("new");
  const [searchKey, setSearchKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const result = readPublishedPreviews();
    if ("error" in result) setPreviewLoadError(result.error);
    else setCreatedPreviews(result.previews);
  }, []);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of cases) {
      m[c.category] = (m[c.category] ?? 0) + 1;
      for (const s of c.stages) m[s] = (m[s] ?? 0) + 1;
    }
    return m;
  }, []);

  const results = useMemo(() => {
    const list = cases.filter(
      (c) =>
        matchesQuery(c, query) &&
        (cats.length === 0 || cats.includes(c.category)) &&
        (stgs.length === 0 || stgs.some((s) => c.stages.includes(s))),
    );
    return list.sort((a, b) =>
      sort === "new" ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt),
    );
  }, [query, cats, stgs, sort]);

  const featured = results.filter((c) => c.featured);
  const others = results.filter((c) => !c.featured);

  function toggle<T>(list: T[], v: T, on: boolean) {
    return on ? [...list, v] : list.filter((x) => x !== v);
  }

  function clearAll() {
    setQuery("");
    setCats([]);
    setStgs([]);
    setSearchKey((k) => k + 1);
  }

  const activeFilterCount = cats.length + stgs.length;

  return (
    <>
      <section className="border-b border-border bg-surface">
        <Wrap className="flex flex-col gap-5 pt-8 pb-6 md:pt-12 md:pb-8">
          <h1 className="text-[28px] leading-tight font-bold text-text md:text-4xl">
            同じ問題を、ひとりで抱えない。
          </h1>
          <p className="max-w-[760px] text-base text-text-sub">
            企業やサービスで起きた出来事ごとに、同じ立場の人と資料を持ち寄り、共同で弁護士に相談できます。閲覧にアカウント登録やウォレット接続は不要です。
          </p>
          <SearchBar key={searchKey} onSearch={setQuery} className="w-full max-w-[880px]" />
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {[
              { icon: Users, label: "仲間が見つかる" },
              { icon: ListChecks, label: "次にすることが分かる" },
              { icon: ReceiptText, label: "お金の使い道と決め方が見える" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm font-medium text-text-sub">
                <Icon className="size-[18px] text-primary-dark" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </Wrap>
      </section>

      <Wrap className="flex flex-col gap-6 pt-6 pb-12 md:flex-row md:gap-8 md:pt-8 md:pb-24">
        <CreatedPreviewsSection previews={createdPreviews} loadError={previewLoadError} titleId="created-preview-title" className="md:hidden" />
        <aside aria-label="絞り込み" className="flex flex-col gap-2 md:w-[264px] md:shrink-0">
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="case-filters"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex h-11 items-center gap-2 self-start rounded-[10px] border border-border-strong bg-surface px-3.5 text-sm text-text md:hidden"
          >
            <SlidersHorizontal className="size-4 text-text-sub" aria-hidden />
            条件で絞り込む
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-px text-xs font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={cn("size-4 text-text-sub transition-transform", filtersOpen && "rotate-180")}
              aria-hidden
            />
          </button>
          <div
            id="case-filters"
            className={cn("flex-col gap-6", filtersOpen ? "flex" : "hidden md:flex")}
          >
            <FilterGroup
              title="カテゴリ"
              options={categories}
              selected={cats}
              counts={counts}
              onToggle={(v, on) => setCats((l) => toggle(l, v, on))}
            />
            <FilterGroup
              title="募集の段階"
              options={stages}
              selected={stgs}
              counts={counts}
              onToggle={(v, on) => setStgs((l) => toggle(l, v, on))}
            />
            <Button variant="text" className="self-start" onClick={clearAll}>
              条件をすべて外す
            </Button>
          </div>
        </aside>

        <section aria-label="検索結果" className="flex min-w-0 flex-1 flex-col gap-4">
          <CreatedPreviewsSection
            previews={createdPreviews}
            loadError={previewLoadError}
            titleId="created-preview-title-desktop"
            className="hidden md:block"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-text" aria-live="polite">
                {results.length}件の事件
              </h2>
              <DemoBadge />
            </div>
            <label className="relative flex h-11 items-center gap-2 rounded-[10px] border border-border-strong bg-surface pr-3.5 pl-3.5 focus-within:border-primary">
              <ArrowDownUp className="size-4 text-text-sub" aria-hidden />
              <span className="sr-only">並べ替え</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="appearance-none bg-transparent pr-6 text-sm text-text focus:outline-none"
              >
                <option value="new">更新が新しい順</option>
                <option value="old">更新が古い順</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3.5 size-4 text-text-sub"
                aria-hidden
              />
            </label>
          </div>

          {results.length === 0 ? (
            <StatePanel
              icon={Inbox}
              tone="neutral"
              title="条件に合う案件がありません"
              action={
                <Button variant="secondary" onClick={clearAll}>
                  条件をすべて外す
                </Button>
              }
            >
              検索語を短くするか、募集段階のフィルターを外してください。見つからない場合は新しく作成できます。
            </StatePanel>
          ) : (
            <>
              {featured.map((c) => (
                <FeaturedCard key={c.id} c={c} />
              ))}
              {others.length > 0 && (
                <div className="flex flex-col gap-4 lg:flex-row">
                  {others.map((c) => (
                    <FictionalCard key={c.id} c={c} />
                  ))}
                </div>
              )}
            </>
          )}

          <div className="flex flex-col gap-4 rounded-xl bg-[#EEF2F5] px-6 py-5 sm:flex-row sm:items-center">
            <SearchX className="size-[22px] shrink-0 text-text-sub" aria-hidden />
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-base font-bold text-text">探している出来事が見つかりませんか？</p>
              <p className="text-sm text-text-sub">
                検索語を短くするか、企業名だけで探してみてください。見つからなければ、質問に答える形で案件を作れます。
              </p>
            </div>
            <ButtonLink href={routes.create} variant="secondary" icon={Plus} className="self-start sm:self-auto">
              案件を作る
            </ButtonLink>
          </div>
        </section>
      </Wrap>
    </>
  );
}
