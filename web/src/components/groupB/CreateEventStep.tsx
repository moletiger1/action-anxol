"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { BookOpenCheck, Building2, Calendar, Globe, History, Info, Lightbulb, Lock } from "lucide-react";
import { Badge, Button, ButtonLink, Callout, ConfirmDialog } from "@/components/ui";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { relationLabels, useCreateDraft, type Relation } from "./draft";
import { validateCreateEventDraft } from "./validation";
import {
  AsideCard,
  AsideItem,
  CheckRow,
  FieldError,
  IconField,
  IconSelect,
  OptionCard,
  Question,
  ScopeBadge,
} from "./form";
import { ErrorSummary, focusFirstError } from "./ErrorSummary";
import { FormFooter, WizardFrame } from "./WizardFrame";

const relationNotes: Record<Exclude<Relation, "">, string> = {
  self: "個人会員として登録している",
  corporate: "勤務先などの法人契約で利用している",
  family: "本人に代わって情報を集めている",
  unknown: "通知は受け取っていないが、心当たりがある",
};

const years = [
  { value: "", label: "選択" },
  ...["2026", "2025", "2024", "2023", "2022", "2021", "2020"].map((y) => ({ value: y, label: `${y}年` })),
];
const months = [
  { value: "", label: "選択" },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}月` })),
];

const MAX_WHAT = 800;

export function CreateEventStep() {
  const router = useRouter();
  const { draft, update, reset } = useCreateDraft();
  const [submitted, setSubmitted] = useState(false);
  const [pendingReset, setPendingReset] = useState<"cancel-edit" | "new" | null>(null);
  const all = validateCreateEventDraft(draft);
  const errors = submitted ? all : {};
  const count = Object.keys(errors).length;
  const whatId = useId();
  const cancel = () => {
    if (draft.previewId) setPendingReset("cancel-edit");
    else router.push(routes.home);
  };
  const cancelButton = () =>
    draft.previewId ? (
      <Button variant="secondary" onClick={cancel}>
        編集を中止
      </Button>
    ) : (
      <ButtonLink href={routes.home} variant="secondary">
        キャンセル
      </ButtonLink>
    );

  const goNext = () => {
    if (Object.keys(all).length > 0) {
      setSubmitted(true);
      focusFirstError();
      return;
    }
    update({});
    router.push(routes.createSimilar);
  };

  return (
    <WizardFrame
      step={0}
      stage="出来事（段階1／4）"
      next="分かっている範囲で、何が起きたかを教えてください。法律用語・違反条文・勝ち目の見込みの入力は不要です。"
      mobileBackHref={routes.home}
      aside={
        <>
          <AsideCard title="入力のヒント">
            <AsideItem icon={BookOpenCheck}>
              法律に詳しくなくても大丈夫です。違反条文や勝ち目の見込みは入力しません。
            </AsideItem>
            <AsideItem icon={Lightbulb}>分からない項目は「分からない」を選べます。後から編集できます。</AsideItem>
            <AsideItem icon={Lock}>通知メールなどの原本は、この作成フローでは受け取りません。公開できる資料のURLだけ入力できます。</AsideItem>
          </AsideCard>
          <AsideCard title="公開される項目" className="gap-2.5">
            <p className="text-sm text-text-sub">
              質問1〜3の回答は、公開内容の確認画面で見直してから公開されます。質問4は公開されません。
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="primary" icon={Globe}>
                質問1〜3：一般公開（確認後）
              </Badge>
              <Badge tone="neutral" icon={Lock}>
                質問4：非公開
              </Badge>
            </div>
          </AsideCard>
          <AsideCard muted className="gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-text">
              <History className="size-[18px] text-text-sub" aria-hidden />
              途中再開
            </h2>
            <p className="text-sm text-text-sub">
              入力はブラウザーへ自動保存されます。保存できない場合は上部に表示されます。
            </p>
          </AsideCard>
        </>
      }
      mobileCta={
        <div className="flex gap-3">
          {cancelButton()}
          <Button onClick={goNext} className="flex-1 px-4">
            次へ：似た案件を確認
          </Button>
        </div>
      }
    >
      <Callout icon={Info} tone="neutral" title="初期入力は記入例です">
        <p>最初に表示されるタイムズカーの内容は、作成画面の記入例です。あなたの経験や被害、対象者であることを確認した記録ではありません。公開資料と照らして必要な箇所を書き換えてください。</p>
      </Callout>
      {draft.previewId && (
        <Callout icon={Info} tone="neutral" title="保存済みの作成例を編集中です">
          <p>保存すると、この作成例だけを更新します。新しい作成例を始めるときは下書きを切り替えてください。</p>
          <Button variant="secondary" className="mt-2 self-start" onClick={() => setPendingReset("new")}>
            新しい作成例を始める
          </Button>
        </Callout>
      )}

      <Question
        num={1}
        title="どの企業・サービスについての出来事ですか？"
        hint="企業名やサービス名から、既に登録されている事件を探します。"
        badge={<ScopeBadge scope="public" />}
      >
        <IconField
          label="企業・サービス名"
          icon={Building2}
          value={draft.company}
          onChange={(e) => update({ company: e.target.value })}
          placeholder="例：タイムズカー"
          list="groupB-company-candidates"
          autoComplete="off"
          hint="入力に合わせて候補が表示されます"
          error={errors.company}
        />
        <datalist id="groupB-company-candidates">
          <option value="タイムズカー（カーシェアリング）" />
          <option value="タイムズ駐車場" />
          <option value="タイムズクラブ" />
        </datalist>
      </Question>

      <Question
        num={2}
        title="いつ頃のことですか？"
        hint="正確な日付でなくても構いません。"
        badge={<ScopeBadge scope="public" />}
      >
        <div className="flex gap-4">
          <IconSelect
            label="年"
            icon={Calendar}
            options={years}
            value={draft.year}
            disabled={draft.timeUnknown}
            onChange={(e) => update({ year: e.target.value })}
            error={errors.time && !draft.year ? errors.time : undefined}
          />
          <IconSelect
            label="月"
            icon={Calendar}
            options={months}
            value={draft.month}
            disabled={draft.timeUnknown}
            onChange={(e) => update({ month: e.target.value })}
            error={errors.time && !draft.month ? errors.time : undefined}
          />
        </div>
        <FieldError>{errors.time}</FieldError>
        <CheckRow
          checked={draft.timeUnknown}
          onChange={(v) => update({ timeUnknown: v })}
          label="時期が分からない"
        />
      </Question>

      <Question
        num={3}
        title="何が起きましたか？"
        hint="公表されている事実と、あなたが知っていることを分けずに書いて構いません。公開前に一緒に整理します。"
        badge={<ScopeBadge scope="public" />}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor={whatId} className="text-sm font-bold text-text">
            起きたこと
          </label>
          <textarea
            id={whatId}
            value={draft.what}
            maxLength={MAX_WHAT}
            onChange={(e) => update({ what: e.target.value })}
            aria-invalid={!!errors.what || undefined}
            aria-describedby={`${whatId}-help`}
            placeholder="例：運営会社から、会員情報が漏えいしたという通知メールが届いた"
            className={cn(
              "min-h-32 w-full rounded-[10px] border bg-surface px-4 py-3 text-base text-text placeholder:text-text-muted focus:border-primary focus:ring-3 focus:ring-focus/60 focus:outline-none focus-visible:outline-none",
              errors.what ? "border-red bg-red-soft" : "border-border-strong",
            )}
          />
          {errors.what && <FieldError>{errors.what}</FieldError>}
          <p id={`${whatId}-help`} className="text-sm text-text-muted">
            <span className="tabular">
              {draft.what.length} / {MAX_WHAT}字
            </span>
            　氏名・電話番号など個人を特定できる情報は書かないでください
          </p>
        </div>
      </Question>

      <Question
        num={4}
        title="この出来事と、あなたの関係を教えてください"
        hint="募集の対象者を決めるために使います。関係は公開されず、人数の集計にだけ使います。"
        badge={<ScopeBadge scope="private" />}
      >
        <div role="radiogroup" aria-label="あなたとの関係" className="flex flex-col gap-2.5">
          {(Object.keys(relationLabels) as Exclude<Relation, "">[]).map((k) => (
            <OptionCard
              key={k}
              name="relation"
              checked={draft.relation === k}
              onChange={() => update({ relation: k })}
              title={relationLabels[k]}
              note={relationNotes[k]}
              invalid={!!errors.relation}
            />
          ))}
        </div>
        <FieldError>{errors.relation}</FieldError>
      </Question>

      <ErrorSummary count={count} />

      <FormFooter
        left={cancelButton()}
        right={<Button onClick={goNext}>次へ：似た案件を確認</Button>}
      />
      <ConfirmDialog
        open={pendingReset !== null}
        onClose={() => setPendingReset(null)}
        onConfirm={() => {
          const action = pendingReset;
          if (!action) return;
          reset();
          setPendingReset(null);
          if (action === "cancel-edit") router.push(routes.home);
        }}
        icon={Info}
        title={pendingReset === "cancel-edit" ? "編集を中止しますか？" : "新しい作成例を始めますか？"}
        description={
          pendingReset === "cancel-edit"
            ? "編集中の変更を下書きから消します。保存済みの作成例はそのまま残ります。"
            : "現在の下書きを消して初期状態に戻します。保存済みの作成例はそのまま残ります。"
        }
        confirmLabel={pendingReset === "cancel-edit" ? "編集を中止する" : "下書きをリセットする"}
        cancelLabel="戻って確認する"
      />
    </WizardFrame>
  );
}
