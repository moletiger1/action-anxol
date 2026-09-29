"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowLeft, CircleCheck, Clock3, Globe, Info, Lock } from "lucide-react";
import { Badge, Button, ButtonLink, Callout } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatYen, parseYenAmount } from "@/lib/demo";
import { TIMESCAR_EVENT_ID } from "@/lib/eventIds";
import { savePublishedPreview } from "@/lib/publishedPreview";
import { routes } from "@/lib/routes";
import {
  DEMO_DRAFT,
  purposeOptions,
  relationLabels,
  targetOptions,
  useCreateDraft,
  type CreateDraft,
} from "./draft";
import { AsideCard, AsideItem, CheckRow, FieldError } from "./form";
import { ErrorSummary, focusFirstError } from "./ErrorSummary";
import { FormFooter, WizardFrame } from "./WizardFrame";
import { validateCreateEventDraft, validateDetailsDraft, validateFundingDraft } from "./validation";

const DEMO_EVENT = "タイムズカーの個人情報漏えいに関する共同相談";

/** 入力内容から公開される表示を組み立てる */
function publicRows(d: CreateDraft): [string, string][] {
  const company = d.company.trim();
  const eventName = d.eventId === TIMESCAR_EVENT_ID ? DEMO_EVENT : `${company || "名称未入力"}の出来事に関する共同相談`;
  const recruitName = d.targets.includes("corporate")
    ? "法人会員・利用者の共同相談"
    : d.targets.includes("individual")
      ? "個人会員の共同相談"
      : "当事者の共同相談";
  const period = d.timeUnknown ? "分からない（後から追記できます）" : `${d.year || "未入力"}年${d.month || "未入力"}月`;
  const what = d.what.trim();
  const url = d.sourceUrl.trim();
  const source =
    url === DEMO_DRAFT.sourceUrl
      ? "タイムズカー公表資料（2026年9月28日）"
      : url
        ? "入力した公表資料"
        : "なし（公表資料は後から追加できます）";
  const targets = targetOptions.filter((o) => d.targets.includes(o.key)).map((o) => o.short);
  const purposes = purposeOptions
    .filter((o) => d.purposes.includes(o.key))
    .map((o) => (o.key === "other" ? d.purposeOther.trim() || o.short : o.short));
  const fundingAmount = parseYenAmount(d.goalYen);
  const fundingRows: [string, string][] =
    d.funding === "now"
      ? [
          ["相談費の目標額・期限", `${fundingAmount === null ? "未入力" : formatYen(fundingAmount)}・${d.deadline || "未入力"}`],
          ["相談費の使い道", d.usage.trim()],
          ["支出の確認方法", d.approver.trim()],
          ["返金条件", d.refund.trim()],
        ]
      : [["相談費の募集", "条件未設定（参加希望の登録のみ。拠出受付なし）"]];
  return [
    ["事件名", eventName],
    ["募集名", recruitName],
    ["時期", period],
    ["起きたこと", what || "未入力"],
    ["根拠", source],
    ["公表資料URL", url || "なし"],
    ["対象者", targets.length ? targets.join("／") : "未選択"],
    ["相談したいこと", purposes.length ? purposes.join("、") : "未選択"],
    ...fundingRows,
  ];
}

function KvList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="flex flex-col">
      {rows.map(([k, v], i) => (
        <div
          key={k}
          className={cn(
            "flex flex-col gap-1 py-2.5 sm:flex-row sm:gap-4",
            i < rows.length - 1 && "border-b border-border",
          )}
        >
          <dt className="shrink-0 text-sm text-text-muted sm:w-[120px]">{k}</dt>
          <dd className="min-w-0 flex-1 text-[15px] break-words text-text">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ReviewStep() {
  const router = useRouter();
  const { draft, update, reset } = useCreateDraft();
  const [submitted, setSubmitted] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<
    "create-fields" | "details-fields" | "history-unreadable" | "preview-missing" | "storage-unavailable" | null
  >(null);
  const [published, setPublished] = useState<CreateDraft | null>(null);

  const missing = [!draft.confirmPii, !draft.confirmFacts].filter(Boolean).length;
  const showErr = submitted && missing > 0;
  const fundingGoal = parseYenAmount(draft.goalYen) ?? 0;
  const fundingIncomplete = draft.funding === "now";
  const fundingSet = fundingIncomplete && Object.keys(validateFundingDraft(draft)).length === 0;

  const publish = () => {
    setPublishError(null);
    if (Object.keys(validateCreateEventDraft(draft)).length > 0) {
      setPublishError("create-fields");
      return;
    }
    if (Object.keys(validateDetailsDraft(draft)).length > 0) {
      setPublishError("details-fields");
      return;
    }
    if (missing > 0) {
      setSubmitted(true);
      focusFirstError();
      return;
    }
    setPublishing(true);
    // デモ：公開用の項目だけをこのブラウザに保存する。
    window.setTimeout(() => {
      const result = savePublishedPreview(publicRows(draft), draft);
      if (result !== "saved") {
        setPublishing(false);
        setPublishError(result);
        return;
      }
      setPublished(draft);
      setPublishing(false);
      reset();
      window.scrollTo({ top: 0 });
    }, 1200);
  };

  if (published) {
    const publishedGoal = parseYenAmount(published.goalYen) ?? 0;
    const fundingDone = published.funding === "now" && publishedGoal > 0;
    return (
      <WizardFrame
        step={4}
        stage="プレビュー作成済み"
        next="このブラウザに保存した公開用の内容を確認できます。実際の公開や参加受付は行われません。"
        mobileBackHref={routes.dashboard}
        aside={
          <AsideCard title="このデモでできること">
            <AsideItem icon={CircleCheck}>一般公開用に入力した内容を確認できます</AsideItem>
            <AsideItem icon={CircleCheck}>非公開の回答や資料はプレビューに含まれません</AsideItem>
            <AsideItem icon={CircleCheck}>保存内容はこのブラウザ内に限られます</AsideItem>
          </AsideCard>
        }
        mobileCta={<ButtonLink href={routes.createPublished}>作成内容のプレビューを見る</ButtonLink>}
      >
        <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex size-13 items-center justify-center rounded-full bg-green-soft text-green">
            <CircleCheck className="size-6" aria-hidden />
          </span>
          <h2 className="text-xl font-bold text-text">
            {published.previewId ? "作成例を更新しました" : "公開内容のプレビューを作成しました"}
          </h2>
          <p className="text-sm text-text-sub">
            {fundingDone
              ? "入力した相談費の条件もプレビューに含まれます。"
              : "相談費の条件は未設定です。"}
            {" "}このデモは実際の公開、参加登録、拠出を行いません。
          </p>
          <div className="mt-2 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <ButtonLink href={routes.createPublished}>作成内容のプレビューを見る</ButtonLink>
          </div>
        </div>
        <KvList rows={publicRows(published)} />
      </WizardFrame>
    );
  }

  return (
    <WizardFrame
      step={3}
      stage="公開内容の確認（段階4／4）"
      next={
        draft.previewId
          ? "内容を確認して保存すると、選択中の作成例だけが更新されます。"
          : "公開用の内容と、非公開の情報を確認してください。作成後はこのブラウザ内のプレビューを開けます。"
      }
      mobileBackHref={routes.createDetails}
      aside={
        <AsideCard title="プレビュー作成後">
          <AsideItem icon={CircleCheck}>一般公開用に入力した内容を確認できます</AsideItem>
          <AsideItem icon={CircleCheck}>非公開の回答や資料はプレビューに含まれません</AsideItem>
          <AsideItem icon={CircleCheck}>プレビューはこのブラウザ内に保存されます</AsideItem>
        </AsideCard>
      }
      mobileCta={
        <div className="flex gap-3">
          <ButtonLink href={routes.createDetails} variant="secondary" icon={ArrowLeft}>
            戻る
          </ButtonLink>
          <Button
            onClick={publish}
            loading={publishing}
            loadingLabel={draft.previewId ? "作成例を更新中…" : "プレビューを作成中…"}
            className="flex-1 px-4"
          >
            {draft.previewId ? "この作成例を更新する" : "公開内容のプレビューを作る"}
          </Button>
        </div>
      }
    >
      <h2 className="text-xl font-bold text-text md:text-[22px]">公開される内容と、公開されない情報</h2>

      <div className="flex flex-col gap-4 md:gap-6 xl:flex-row">
        <section aria-label="一般公開される内容" className="flex-1 rounded-xl border border-primary px-5 py-4">
          <div className="pb-2">
            <Badge tone="primary" icon={Globe}>
              一般公開される内容
            </Badge>
          </div>
          <KvList rows={publicRows(draft)} />
        </section>
        <section aria-label="公開されない情報" className="flex-1 rounded-xl bg-[#F1F5F6] px-5 py-4">
          <div className="pb-2">
            <Badge tone="neutral" icon={Lock}>
              公開されない情報
            </Badge>
          </div>
          <KvList
            rows={[
              ["あなたとの関係", draft.relation ? relationLabels[draft.relation] : relationLabels.corporate],
              ["あなたの名前・連絡先", "募集ページには表示されません"],
              ["通知メールなどの資料", "この作成フローでは収集・公開しません"],
              ["参加者の名前", "公開されません。人数の内訳のみ表示"],
            ]}
          />
        </section>
      </div>

      {fundingSet ? (
        <div className="flex flex-col gap-4 rounded-xl border border-primary bg-primary-soft px-5 py-4 md:flex-row md:items-center">
          <CircleCheck className="size-[22px] shrink-0 text-primary-dark" aria-hidden />
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-base font-bold text-primary-dark">相談費の募集条件：プレビュー用に入力済み</p>
            <p className="text-sm text-text">
              目標 {formatYen(fundingGoal)}・期限 {draft.deadline}
              。使い道：{draft.usage}／支出確認：{draft.approver}／返金条件：{draft.refund}
            </p>
          </div>
          <ButtonLink href={routes.createDetails} variant="secondary">
            支払条件を見直す
          </ButtonLink>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-amber-line bg-amber-soft px-5 py-4 md:flex-row md:items-center">
          <Clock3 className="size-[22px] shrink-0 text-amber" aria-hidden />
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-base font-bold text-amber">
              {fundingIncomplete ? "相談費の募集条件：未入力項目があります" : "相談費の募集条件：未設定"}
            </p>
            <p className="text-sm text-text">
              {fundingIncomplete
                ? "目標額・期限・使い道・支出確認方法・返金条件を入力するとプレビューに含まれます。実際の募集・拠出は行いません。"
                : "条件未設定の状態を公開用プレビューに表示します。このデモでは参加希望の受付・相談費の拠出は行いません。"}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              update({ funding: "now" });
              router.push(routes.createDetails);
            }}
          >
            {fundingIncomplete ? "入力を続ける" : "条件をプレビューに設定する"}
          </Button>
        </div>
      )}

      <fieldset className="flex flex-col">
        <legend className="text-base font-bold text-text">プレビュー作成前の確認（必須）</legend>
        <CheckRow
          checked={draft.confirmPii}
          onChange={(v) => update({ confirmPii: v })}
          label="個人を特定できる情報（氏名・電話番号・会員番号など）が含まれていないことを確認しました"
          invalid={showErr && !draft.confirmPii}
        />
        <CheckRow
          checked={draft.confirmFacts}
          onChange={(v) => update({ confirmFacts: v })}
          label="公表資料で確認できる事実と、自分の経験・推測を区別して書きました"
          invalid={showErr && !draft.confirmFacts}
        />
        {showErr && (
          <FieldError>プレビューを作る前に、上の内容を確認してチェックを入れてください（{missing}件未確認）</FieldError>
        )}
      </fieldset>

      <Callout icon={Info} tone="primary">
        <p>
          公開の前に、運営者による一律の承認はありません。公開後は、他の参加者も同じ事件に別の目的の募集を追加できます。
        </p>
      </Callout>

      {publishError && (
        <Callout icon={Info} tone="neutral">
          {publishError === "create-fields" ? (
            <>
              <p>出来事の必須項目が未入力です。入力を確認してからプレビューを作成してください。</p>
              <ButtonLink href={routes.create} variant="text">出来事の入力へ戻る</ButtonLink>
            </>
          ) : publishError === "details-fields" ? (
            <>
              <p>募集内容の必須項目が未入力、または形式が正しくありません。入力を確認してからプレビューを作成してください。</p>
              <ButtonLink href={routes.createDetails} variant="text">募集内容の入力へ戻る</ButtonLink>
            </>
          ) : (
            <p>
              {publishError === "history-unreadable"
                ? "保存済みプレビューの履歴を読み取れなかったため、上書きを避けて保存を止めました。既存データはそのままです。"
                : publishError === "preview-missing"
                  ? "更新対象の作成例が履歴に見つからなかったため、重複作成を避けて保存を止めました。新しい作成例として作る場合は、案件作成から始めてください。"
                  : "ブラウザーの保存領域を利用できず、プレビューを保存できませんでした。既存データはそのままです。保存領域を確認して、もう一度お試しください。"}
            </p>
          )}
        </Callout>
      )}

      <ErrorSummary count={showErr ? missing : 0} message="公開前の確認欄にチェックを入れてください。" />

      <FormFooter
        left={
          <ButtonLink href={routes.createDetails} variant="secondary" icon={ArrowLeft}>
            戻る
          </ButtonLink>
        }
        right={
          <Button onClick={publish} loading={publishing} loadingLabel={draft.previewId ? "更新中…" : "作成中…"}>
            {draft.previewId ? "この作成例を更新する" : "公開内容のプレビューを作る"}
          </Button>
        }
      />
    </WizardFrame>
  );
}
