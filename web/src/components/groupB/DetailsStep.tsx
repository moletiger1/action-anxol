"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CircleMinus, Clock3, Info, Link as LinkIcon, Link2 } from "lucide-react";
import { Button, ButtonLink, Callout, TextArea, TextField } from "@/components/ui";
import { parseYenAmount, formatYen } from "@/lib/demo";
import { routes } from "@/lib/routes";
import { purposeOptions, targetOptions, useCreateDraft } from "./draft";
import { todayDateKey, validateDetailsDraft } from "./validation";
import { AsideCard, AsideItem, CheckRow, FieldError, IconField, OptionCard, Question, ScopeBadge } from "./form";
import { ErrorSummary, focusFirstError } from "./ErrorSummary";
import { FormFooter, WizardFrame } from "./WizardFrame";

function toggle(list: string[], key: string, on: boolean) {
  return on ? [...list.filter((k) => k !== key), key] : list.filter((k) => k !== key);
}

export function DetailsStep() {
  const router = useRouter();
  const { draft, update } = useCreateDraft();
  const [submitted, setSubmitted] = useState(false);
  const all = validateDetailsDraft(draft);
  const errors = submitted ? all : {};
  const count = Object.keys(errors).length;
  const goal = parseYenAmount(draft.goalYen) ?? 0;

  const goNext = () => {
    if (Object.keys(all).length > 0) {
      setSubmitted(true);
      focusFirstError();
      return;
    }
    update({});
    router.push(routes.createReview);
  };

  return (
    <WizardFrame
      step={2}
      stage="募集内容（段階3／4）"
      next="誰に参加を呼びかけ、何を相談したいかを決めます。相談費の条件は後から設定できます。"
      mobileBackHref={routes.createSimilar}
      aside={
        <AsideCard title="入力しないこと">
          <AsideItem icon={CircleMinus} muted>
            違反している法律・条文
          </AsideItem>
          <AsideItem icon={CircleMinus} muted>
            勝訴の見込みや勝率
          </AsideItem>
          <AsideItem icon={CircleMinus} muted>
            参加者に約束する受取額
          </AsideItem>
          <p className="text-sm text-text-muted">これらは相談先の弁護士が、資料を見て説明します。</p>
        </AsideCard>
      }
      mobileCta={
        <div className="flex gap-3">
          <ButtonLink href={routes.createSimilar} variant="secondary" icon={ArrowLeft}>
            戻る
          </ButtonLink>
          <Button onClick={goNext} className="flex-1 px-4">
            次へ：公開内容の確認
          </Button>
        </div>
      }
    >
      {draft.linkMode === "existing" && (
        <Callout icon={Link2} tone="primary" title="既存の事件に募集を追加します">
          <p>
            「タイムズカーの個人情報漏えいに関する共同相談」の中に、新しい募集として公開します。ここまでの入力や資料が既存の募集へ自動で移ることはありません。
          </p>
        </Callout>
      )}

      <Question
        num={1}
        title="誰に参加を呼びかけますか？"
        hint="複数選べます。対象の書き方は公開前に確認できます。"
        badge={<ScopeBadge scope="public" />}
      >
        <div className="flex flex-col">
          {targetOptions.map((o) => (
            <CheckRow
              key={o.key}
              checked={draft.targets.includes(o.key)}
              onChange={(v) => update({ targets: toggle(draft.targets, o.key, v) })}
              label={o.label}
              note={"note" in o ? o.note : undefined}
              invalid={!!errors.targets}
            />
          ))}
        </div>
        <FieldError>{errors.targets}</FieldError>
      </Question>

      <Question
        num={2}
        title="誰でも確認できる根拠はありますか？"
        hint="企業の公表資料や報道など、公開できるものを入力します。通知メールの原本は公開しません。"
        badge={<ScopeBadge scope="public" />}
      >
        <IconField
          label="公表資料のURL"
          icon={LinkIcon}
          type="url"
          inputMode="url"
          value={draft.sourceUrl}
          onChange={(e) => update({ sourceUrl: e.target.value })}
          placeholder="https://"
          hint="公開日・タイトルをリンク先で確認してください。プレビューには入力したURLを表示します。"
          error={errors.sourceUrl}
        />
      </Question>

      <Question
        num={3}
        title="弁護士に相談したいことは何ですか？"
        hint="複数選べます。結論や法的な評価を書く必要はありません。"
        badge={<ScopeBadge scope="public" />}
      >
        <div className="flex flex-col">
          {purposeOptions.map((o) => (
            <CheckRow
              key={o.key}
              checked={draft.purposes.includes(o.key)}
              onChange={(v) => update({ purposes: toggle(draft.purposes, o.key, v) })}
              label={o.label}
              invalid={!!errors.purposes}
            />
          ))}
        </div>
        <FieldError>{errors.purposes}</FieldError>
        {draft.purposes.includes("other") && (
          <TextArea
            label="その他に相談したいこと"
            value={draft.purposeOther}
            maxLength={200}
            onChange={(e) => update({ purposeOther: e.target.value })}
            hint="結論や法的な評価を書く必要はありません"
            error={errors.purposeOther}
          />
        )}
      </Question>

      <Question
        num={4}
        title="相談費の募集条件"
        hint="使い道・確認方法・返金条件を入力して、相談費募集の公開用条件をプレビューできます。このデモでは実際の募集・拠出受付は行いません。"
        badge={<ScopeBadge scope="private" label="設定するまで非公開" />}
      >
        <div role="radiogroup" aria-label="相談費の募集条件" className="flex flex-col gap-2.5">
          <OptionCard
            name="funding"
            checked={draft.funding === "interest"}
            onChange={() => update({ funding: "interest" })}
            title="相談費の募集条件は未設定にする"
            note="プレビュー上は参加希望のみの扱いです。実際の受付は行われません"
          />
          <OptionCard
            name="funding"
            checked={draft.funding === "now"}
            onChange={() => update({ funding: "now" })}
            title="相談費の募集条件をプレビューに設定する"
            note="目標額・期限・使い道・支出確認の方法・返金条件を入力します"
          />
        </div>

        {draft.funding === "now" ? (
          <div className="flex flex-col gap-5 rounded-[10px] border border-border p-4 md:p-5">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="目標額（円）"
                required
                inputMode="numeric"
                value={draft.goalYen}
                onChange={(e) => update({ goalYen: e.target.value })}
                placeholder="例：300000"
                hint={draft.legacyGoalUsdc && !draft.goalYen ? `旧下書きの目標は ${draft.legacyGoalUsdc} USDCでした。円の目標額を入力し直してください。` : goal > 0 ? formatYen(goal) : "1円単位の整数で入力してください"}
                error={errors.goalYen}
              />
              <TextField
                label="募集の期限"
                required
                type="date"
                min={todayDateKey()}
                value={draft.deadline}
                onChange={(e) => update({ deadline: e.target.value })}
                error={errors.deadline}
              />
            </div>
            <TextField
              label="使い道"
              required
              value={draft.usage}
              onChange={(e) => update({ usage: e.target.value })}
              placeholder="例：法律相談、初期調査、資料整理、決済等の予備費"
              hint="費目ごとの上限は、確認画面の後に設定します"
              error={errors.usage}
            />
            <TextField
              label="支出を確認する人・方法"
              required
              value={draft.approver}
              onChange={(e) => update({ approver: e.target.value })}
              placeholder="例：参加者から選ばれた支出確認担当が請求内容を確認"
              error={errors.approver}
            />
            <TextField
              label="返金できる条件"
              required
              value={draft.refund}
              onChange={(e) => update({ refund: e.target.value })}
              placeholder="例：期限までに目標額に届かなかった場合、未使用分を返金"
              error={errors.refund}
            />
            <Callout icon={Info} tone="primary">
              <p>入力した条件は公開用プレビューに保存されます。このデモでは条件がそろっても、実際の相談費募集・拠出受付は行いません。</p>
            </Callout>
          </div>
        ) : (
          <Callout icon={Clock3} tone="amber" title={<span className="text-base text-amber">支払条件が未設定です</span>}>
            <p>条件未設定の状態を公開用プレビューに表示します。このデモでは参加希望の受付・相談費の拠出を行いません。</p>
          </Callout>
        )}
      </Question>

      <ErrorSummary count={count} />

      <FormFooter
        left={
          <ButtonLink href={routes.createSimilar} variant="secondary" icon={ArrowLeft}>
            戻る
          </ButtonLink>
        }
        right={<Button onClick={goNext}>次へ：公開内容の確認</Button>}
      />
    </WizardFrame>
  );
}
