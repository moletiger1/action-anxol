"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDashed, Info } from "lucide-react";
import { Badge, Button, ButtonLink, Callout, ConfirmDialog } from "@/components/ui";
import { PublicShell } from "@/components/layout";
import { Breadcrumb, SectionTitle, Wrap } from "@/components/groupA/parts";
import { restoreCreateDraft, useCreateDraft, type RestoreCreateDraftResult } from "./draft";
import { readPublishedPreviews, type PreviewReadError, type PublishedPreview } from "@/lib/publishedPreview";
import { routes } from "@/lib/routes";

export function CreatedPreview() {
  const router = useRouter();
  const { draft, reset, draftInvalid } = useCreateDraft();
  const [previews, setPreviews] = useState<PublishedPreview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editError, setEditError] = useState<Exclude<RestoreCreateDraftResult, "restored"> | null>(null);
  const [actionError, setActionError] = useState(false);
  const [loadError, setLoadError] = useState<PreviewReadError | null>(null);
  const [pendingAction, setPendingAction] = useState<"edit" | "new" | null>(null);

  useEffect(() => {
    const result = readPublishedPreviews();
    if ("error" in result) setLoadError(result.error);
    else setPreviews(result.previews);
    setSelectedId(new URLSearchParams(window.location.search).get("preview"));
  }, []);

  const preview = loadError
    ? null
    : selectedId
      ? previews.find((item) => item.id === selectedId) ?? null
      : previews[0] ?? null;
  const selectionMissing = selectedId !== null && !loadError && preview === null;

  function editPreview() {
    if (!preview) return;
    const result = restoreCreateDraft(preview.draft, preview.id);
    if (result !== "restored") return setEditError(result);
    setEditError(null);
    router.push(routes.createReview);
  }

  function requestEdit() {
    if (draftInvalid || draft.savedAt !== null || draft.previewId !== null) setPendingAction("edit");
    else editPreview();
  }

  function startNewExample() {
    if (draftInvalid || draft.savedAt !== null || draft.previewId !== null) setPendingAction("new");
    else {
      reset();
      router.push(routes.create);
    }
  }

  return (
    <PublicShell active="案件を探す" mobileTitle="作成内容のプレビュー" mobileBackHref={routes.createReview}>
      <Wrap className="flex flex-col gap-6 pt-5 pb-12 md:pt-6 md:pb-24">
        <Breadcrumb
          className="hidden md:block"
          items={[{ label: "案件を作る", href: routes.create }, { label: "作成内容のプレビュー" }]}
        />

        <div className="flex flex-col gap-3">
          <Badge tone="neutral" icon={CircleDashed}>このブラウザ内のデモ保存</Badge>
          <h1 className="text-2xl font-bold text-text md:text-[32px]">作成内容のプレビュー</h1>
          <Callout icon={Info} tone="neutral">
            <p>この内容はこのブラウザだけに保存されています。実際の公開、参加登録、通知は行われません。</p>
          </Callout>
        </div>

        {loadError && (
          <Callout icon={Info} tone="red">
            <p>
              {loadError === "history-unreadable"
                ? "保存済みプレビューの履歴を読み取れませんでした。データは変更していません。"
                : "ブラウザーの保存領域を利用できず、プレビューを読み込めませんでした。保存領域を確認してください。"}
            </p>
          </Callout>
        )}

        {previews.length > 1 && (
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 md:p-6">
            <SectionTitle title="保存した作成例" description="どのブラウザ内プレビューを表示するか選べます。" />
            <ul className="flex flex-col divide-y divide-border">
              {previews.map((item) => {
                const title = item.rows.find(([label]) => label === "事件名")?.[1] ?? "作成した事件";
                return (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text">{title}</p>
                      <time dateTime={item.updatedAt ?? item.createdAt} className="text-xs text-text-muted">
                        {item.updatedAt ? "更新 " : "作成 "}
                        {new Date(item.updatedAt ?? item.createdAt).toLocaleString("ja-JP")}
                      </time>
                    </div>
                    <Button
                      variant="text"
                      aria-pressed={preview?.id === item.id}
                      onClick={() => setSelectedId(item.id)}
                    >
                      {preview?.id === item.id ? "表示中" : "表示する"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {preview ? (
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 md:p-6">
            <SectionTitle title="一般公開する内容" description="非公開の回答や資料はこのプレビューに含めていません。" />
            <dl className="flex flex-col">
              {preview.rows.map(([label, value], index) => (
                <div key={label} className={`flex flex-col gap-1 py-3 sm:flex-row sm:gap-4 ${index < preview.rows.length - 1 ? "border-b border-border" : ""}`}>
                  <dt className="shrink-0 text-sm text-text-muted sm:w-[120px]">{label}</dt>
                  <dd className="min-w-0 flex-1 break-words text-[15px] text-text">{value}</dd>
                </div>
              ))}
            </dl>
            <Button variant="secondary" onClick={requestEdit} className="self-start">
              内容を編集する
            </Button>
            {editError && (
              <p role="alert" className="text-sm text-red">
                {editError === "invalid-draft"
                  ? "編集用データが不完全なため復元できませんでした。保存済みプレビューはそのまま残っています。"
                  : "ブラウザーの保存領域を利用できず、編集用の下書きを保存できませんでした。"}
              </p>
            )}
          </section>
        ) : (
          <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 md:p-6">
            <h2 className="text-lg font-bold text-text">
              {loadError ? "保存済みプレビューを読み込めません" : selectionMissing ? "指定されたプレビューが見つかりません" : "保存されたプレビューがありません"}
            </h2>
            <p className="text-sm text-text-sub">
              {loadError
                ? "保存内容の破損またはブラウザー保存領域のエラーを確認してください。"
                : selectionMissing
                  ? "URLで指定された作成例は履歴にありません。保存一覧から選び直してください。"
                  : "このブラウザーで案件作成を完了すると、公開内容をここで確認できます。"}
            </p>
            {selectionMissing && <ButtonLink href={routes.createPublished} variant="secondary" className="self-start">保存一覧を開く</ButtonLink>}
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={startNewExample}>
            新しい作成例を作る
          </Button>
          <ButtonLink href={routes.home} variant="secondary">案件一覧を見る</ButtonLink>
        </div>
        {actionError && <p role="alert" className="text-sm text-red">保存領域を利用できず、下書きを置き換えられませんでした。保存データは残っています。</p>}
        <ConfirmDialog
          open={pendingAction !== null}
          onClose={() => setPendingAction(null)}
          onConfirm={() => {
            const action = pendingAction;
            setPendingAction(null);
            if (action === "edit") {
              if (draftInvalid && !reset()) {
                setActionError(true);
                return;
              }
              editPreview();
            }
            if (action === "new") {
              if (!reset()) {
                setActionError(true);
                return;
              }
              router.push(routes.create);
            }
          }}
          icon={Info}
          title={pendingAction === "edit" ? "下書きを置き換えますか？" : "新しい作成例を始めますか？"}
          description={
            pendingAction === "edit"
              ? "現在の下書きを選択した保存済み作成例で置き換えます。保存済みプレビュー自体は残ります。"
              : "現在の下書きを消して初期状態に戻します。保存済みプレビューは残ります。"
          }
          confirmLabel={pendingAction === "edit" ? "下書きを置き換える" : "下書きをリセットする"}
          cancelLabel="戻って確認する"
        />
      </Wrap>
    </PublicShell>
  );
}
