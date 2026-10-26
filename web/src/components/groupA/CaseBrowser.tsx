"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import {
  Badge,
  Button,
  ButtonLink,
  Callout,
  DemoBadge,
  SearchBar,
  SkeletonRegion,
  SkeletonRow,
  StatePanel,
  useDelayedFlag,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { readPublishedPreviews, type PreviewReadError, type PublishedPreview } from "@/lib/publishedPreview";
import { createClientSnapshotStore, useClientSnapshot } from "@/lib/clientSnapshot";
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
        "transition-surface flex min-h-11 cursor-pointer items-center gap-2.5 rounded-sm px-2.5",
        checked ? "bg-primary-soft" : "hover:bg-neutral-soft",
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
          "flex size-[18px] shrink-0 items-center justify-center rounded-sm border peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-1",
          checked ? "border-primary bg-primary" : "border-border-strong bg-surface",
        )}
      >
        {checked && <Check className="size-3.5 text-white" />}
      </span>
      <span
        className={cn(
          "flex-1 text-[14px]",
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
    <fieldset className="flex flex-col gap-0.5">
      <legend className="mb-2 font-display text-[15px] font-bold text-text">{title}</legend>
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
    <article className="flex flex-col gap-5 border-t-2 border-text bg-surface px-5 py-6 md:px-7 md:py-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {c.stages.map((s) => (
          <Badge key={s} icon={stageIcon[s as keyof typeof stageIcon] ?? Users}>
            {s}
          </Badge>
        ))}
        <span className="text-[13px] text-text-muted">{c.category}</span>
      </div>
      <h3 className="font-display text-xl leading-[1.4] font-bold text-text md:text-2xl">
        {c.title}
      </h3>
      <p className="measure text-[15px] leading-[1.9] text-text-sub">{c.summary}</p>
      <section className="border border-border">
        <h4 className="border-b border-border bg-neutral-soft px-4 py-2.5 text-[13px] font-bold text-text-sub">
          この出来事について募集中の相談（{eventRecruitments.length}件）
        </h4>
        <ul>
          {eventRecruitments.map((recruitment, index) => {
            const Icon = recruitment.audience === "individual" ? User : Building2;
            const StatusIcon = recruitment.audience === "individual" ? Users : HandCoins;
            return (
              <li
                key={recruitment.id}
                className={`transition-surface flex flex-col gap-2.5 px-4 py-4 hover:bg-neutral-soft sm:flex-row sm:items-center sm:gap-4 ${
                  index < eventRecruitments.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 gap-3.5">
                  <Icon className="mt-0.5 size-[18px] shrink-0 text-text-muted" aria-hidden />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    {recruitment.audience === "corporate" ? (
                      <Link
                        href={recruitment.href}
                        className="text-[15px] font-bold text-text hover:text-primary-dark hover:underline"
                      >
                        {recruitment.title}
                      </Link>
                    ) : (
                      <span className="text-[15px] font-bold text-text">{recruitment.title}</span>
                    )}
                    <span className="text-[13px] leading-[1.7] text-text-muted">
                      対象：{recruitment.target}
                    </span>
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
      </section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <FileText className="size-4" aria-hidden />
            公表資料あり
          </span>
          <span className="tabular">{c.updatedLabel}</span>
        </div>
        <ButtonLink href={routes.event} variant="secondary" icon={ArrowRight}>
          事件ページを見る
        </ButtonLink>
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
    <article className="flex flex-col gap-3 border-t border-border bg-surface px-5 py-5 md:px-6">
      <Badge tone="neutral" icon={FlaskConical}>このブラウザ内のプレビュー</Badge>
      <h3 className="font-display text-lg leading-snug font-bold text-text">{title}</h3>
      {summary && <p className="text-[14px] leading-[1.8] text-text-sub">{summary}</p>}
      <p className="tabular text-[12px] text-text-muted">
        {preview.updatedAt ? "更新" : "作成"}{" "}
        {new Date(preview.updatedAt ?? preview.createdAt).toLocaleString("ja-JP")}
      </p>
      {linkedToTimescar && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-[1.7] text-text-sub">
          <span>紐付け先：タイムズカーの事件ページ。募集一覧には掲載されていません。</span>
          <Link href={routes.event} className="font-medium text-primary-dark hover:underline">
            事件ページを見る
          </Link>
        </div>
      )}
      <div className="pt-1">
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
  loading,
}: {
  previews: PublishedPreview[];
  loadError: PreviewReadError | null;
  className: string;
  titleId: string;
  loading: boolean;
}) {
  /*
   * ブラウザー保存の読み取り中。SSR とハイドレーションの間だけ通る。
   * 実物と同じ罫線・余白で置き、差し替えで位置が飛ばないようにする。
   */
  if (loading) {
    return (
      <section aria-labelledby={titleId} className={className}>
        <h2 id={titleId} className="rule-head mb-1 font-display text-lg font-bold text-text">
          作成したプレビュー
        </h2>
        <SkeletonRegion label="保存したプレビューを読み込み中">
          <div className="flex flex-col">
            <SkeletonRow />
          </div>
        </SkeletonRegion>
      </section>
    );
  }
  if (loadError) {
    return (
      <section aria-labelledby={titleId} className={className}>
        <h2 id={titleId} className="rule-head mb-3 font-display text-lg font-bold text-text">
          作成したプレビュー
        </h2>
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
      <h2 id={titleId} className="rule-head mb-1 font-display text-lg font-bold text-text">
        作成したプレビュー
      </h2>
      <div className="flex flex-col">
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
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [stgs, setStgs] = useState<Stage[]>(DEFAULT_STAGES);
  const [sort, setSort] = useState<Sort>("new");
  const [searchKey, setSearchKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const previewsStore = useMemo(() => createClientSnapshotStore(readPublishedPreviews), []);
  const previewResult = useClientSnapshot(previewsStore);
  const createdPreviews = previewResult && !("error" in previewResult) ? previewResult.previews : [];
  const previewLoadError = previewResult && "error" in previewResult ? previewResult.error : null;
  // 200ms 未満で終わるなら骨組みを出さない（点滅を避ける）
  const previewLoading = useDelayedFlag(previewResult === undefined);

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
        <Wrap className="flex flex-col gap-5 pt-9 pb-7 md:pt-14 md:pb-10">
          <h1 className="measure-head font-display text-[30px] leading-[1.3] text-text md:text-[42px]">
            出来事から、共同相談を探す
          </h1>
          <p className="measure text-[15px] leading-[1.85] text-text-sub">
            同じ出来事の当事者どうしで資料と共同相談費を用意し、弁護士の提案を参加者の審議で選びます。閲覧にアカウント登録は不要です。
          </p>
          <SearchBar key={searchKey} onSearch={setQuery} className="mt-1 w-full max-w-[880px]" />
          <dl className="flex flex-wrap items-start gap-x-10 gap-y-4 pt-1">
            {[
              { icon: Users, term: "参加のしかた", desc: "参加希望の登録は無料です" },
              { icon: ListChecks, term: "決めかた", desc: "弁護士の提案は参加者の審議で選びます" },
              { icon: ReceiptText, term: "お金", desc: "使い道と返金条件は募集ごとに公開します" },
            ].map(({ icon: Icon, term, desc }) => (
              <div key={term} className="flex min-w-0 flex-col gap-0.5">
                <dt className="flex items-center gap-1.5 text-[13px] font-bold text-text">
                  <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                  {term}
                </dt>
                <dd className="text-[13px] leading-[1.7] text-text-muted">{desc}</dd>
              </div>
            ))}
          </dl>
        </Wrap>
      </section>

      <Wrap className="flex flex-col gap-6 pt-6 pb-12 md:flex-row md:gap-8 md:pt-8 md:pb-24">
        <CreatedPreviewsSection
          previews={createdPreviews}
          loadError={previewLoadError}
          loading={previewLoading}
          titleId="created-preview-title"
          className="md:hidden"
        />
        <aside aria-label="絞り込み" className="flex flex-col gap-2 md:w-[248px] md:shrink-0">
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="case-filters"
            onClick={() => setFiltersOpen((v) => !v)}
            className="transition-surface flex min-h-11 items-center gap-2 self-start rounded-sm border border-border-strong bg-surface px-3.5 text-[14px] text-text hover:bg-neutral-soft md:hidden"
          >
            <SlidersHorizontal className="size-4 text-text-sub" aria-hidden />
            条件で絞り込む
            {activeFilterCount > 0 && (
              <span className="tabular rounded-sm bg-primary px-1.5 text-[12px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={cn(
                "size-4 text-text-sub transition-transform duration-200",
                filtersOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          <div
            id="case-filters"
            className={cn("flex-col gap-7 md:border-t-2 md:border-text md:pt-4", filtersOpen ? "flex" : "hidden md:flex")}
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
            loading={previewLoading}
            titleId="created-preview-title-desktop"
            className="hidden md:block"
          />
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border pb-2">
            <div className="flex items-center gap-3">
              <h2 className="tabular font-display text-lg font-bold text-text" aria-live="polite">
                {results.length}件の事件
              </h2>
              <DemoBadge />
            </div>
            <label className="transition-surface relative flex min-h-11 items-center gap-2 rounded-sm border border-border-strong bg-surface pr-3.5 pl-3.5 focus-within:border-primary">
              <ArrowDownUp className="size-4 text-text-muted" aria-hidden />
              <span className="sr-only">並べ替え</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="appearance-none bg-transparent pr-6 text-[14px] text-text focus:outline-none"
              >
                <option value="new">更新が新しい順</option>
                <option value="old">更新が古い順</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3.5 size-4 text-text-muted"
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
              検索語を短くするか、募集段階の絞り込みを外してください。
            </StatePanel>
          ) : (
            <div className="enter flex flex-col gap-6">
              {results.map((c) => (
                <FeaturedCard key={c.id} c={c} />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4 border-t-2 border-text pt-5 sm:flex-row sm:items-center">
            <SearchX className="size-5 shrink-0 text-text-muted" aria-hidden />
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="font-display text-base font-bold text-text">出来事が見つからないとき</p>
              <p className="text-[13px] leading-[1.7] text-text-muted">
                質問に答える形で、新しい出来事の募集を作れます。
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
