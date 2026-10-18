"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button, Callout } from "@/components/ui";
import { Info } from "lucide-react";
import { DEMO_SIGNERS, type Command, type WorkflowResult, type WorkflowState } from "@/lib/workflow/common";
import { applyElection, createDemoElection, type ElectionAction, type ElectionState } from "@/lib/workflow/election";
import { applyRefund, createDemoRefund, refundTotals, refundIntent, type RefundAction, type RefundState } from "@/lib/workflow/refund";
import { applyCatalog, createDemoCatalog, type CatalogAction, type CatalogState } from "@/lib/workflow/catalog";
import { catalogReconciliation } from "@/lib/workflow/presentation";

type Payload<A> = A extends Command ? Omit<A, "id" | "expectedRevision"> : never;
const errors: Record<string, string> = {
  PRODUCTION_GATE_CLOSED: "実運用の本番ゲートは未解除です。操作を拒否しました。",
  STATE_CONFLICT: "表示後に状態が更新されました。最新の状態から操作してください。",
  CATALOG_CONFLICT: "カタログが更新されています。再照合を開始してください。",
  CATALOG_UP_TO_DATE: "この提案は最新カタログに照合済みです。",
  LATEST_SIGNATURE_REQUIRED: "最新版に対する3人の再署名が必要です。",
  LATEST_THREE_SIGNATURES_REQUIRED: "最新版に対する3人の再署名が必要です。",
  FINALIZATION_ORDER: "先に確定準備が整った提案を確定してください。",
  REVIEW_EXPIRED: "審査・署名の期限に達しています。旧承認では確定できません。",
  NEW_REVIEW_REQUIRED: "関連変更のため新提案・新審査が必要です。",
  INSTRUCTION_VERSION_CONFLICT: "指示または権利の版が古いため拒否しました。",
  EXECUTION_INTENT_CONFLICT: "同じ実行版の原送金intentを変更できません。",
  WAIT_ORDER: "先に確定準備が整った提案を確定してください。",
  WAITING_ORDER: "先に確定準備が整った提案を確定してください。",
  NO_OFFSET_REQUIRED: "最新の権利が予約額以上のため、相殺は不要です。",
  EXTERNAL_RECONCILIATION_REQUIRED: "結果不明・処理中の予約です。外部照合のデモを先に行ってください。",
  INSUFFICIENT_REFUND_CASH: "追加予約に足りる原資がありません。先の予約と債務を維持します。",
  LATEST_RIGHT_MISMATCH: "取消後の最新権利が予約額を下回っています。送金指示を拒否しました。",
  CONTRACT_ON_HOLD: "選任条件の喪失または有効性の異議により、新規契約は保留中です。",
  SPENDING_ON_HOLD: "新規支出の予約は保留中です。",
  BANK_EXECUTION_ON_HOLD: "銀行実行は保留中です。既に出した指示の照合は続けられます。",
};
function useWorkflow<S extends WorkflowState, A extends Command>(factory: () => S, apply: (state: S, action: A) => WorkflowResult<S>) {
  const [view, setView] = useState(() => ({ state: factory(), feedback: "初期例を読み込みました。以下の操作はすべてデモです。" }));
  const sequence = useRef(0);
  const dispatch = (payload: Payload<A>) => {
    const id = `ui-${++sequence.current}`;
    const expectedRevision = view.state.revision;
    setView(previous => {
      const action = { ...payload, id, expectedRevision } as A;
      const result = apply(previous.state, action);
      return { state: result.state, feedback: result.ok ? result.message : (errors[result.error] ?? `操作できませんでした（${result.error}）。状態は変更していません。`) };
    });
  };
  const reset = () => setView({ state: factory(), feedback: "この画面内のデモ状態を初期例に戻しました。実データは変更していません。" });
  return { ...view, dispatch, reset };
}
function Panel({ id, title, feedback, state, reset, children }: {
  id: string; title: string; feedback: string; state: WorkflowState; reset: () => void; children: ReactNode;
}) {
  return <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={`${id}-title`} className="text-xl font-bold text-text">{title}</h2>
      <Button variant="text" onClick={reset}>このデモを初期状態に戻す</Button>
    </div>
    {children}
    <p role="status" aria-live="polite" className="rounded-lg bg-primary-soft p-3 text-sm text-primary-dark">{feedback}</p>
    <details className="text-sm text-text-sub"><summary className="cursor-pointer">この画面の操作履歴（状態版 {state.revision}）</summary>
      <ol className="mt-2 flex flex-col gap-2">{state.audit.length === 0 ? <li>まだ操作していません。</li> : state.audit.map(entry => <li key={entry.revision}>版{entry.revision}：{entry.summary}</li>)}</ol>
    </details>
  </section>;
}
const buttonRow = "flex flex-wrap gap-2";
const numberFormat = new Intl.NumberFormat("ja-JP");
const money = (amount: number) => `${numberFormat.format(amount)}円`;

function ElectionPanel() {
  const { state, feedback, dispatch, reset } = useWorkflow<ElectionState, ElectionAction>(createDemoElection, applyElection);
  const pending = state.bankStatus === "SUBMITTED" || state.bankStatus === "UNKNOWN";
  return <Panel id="election" title="1. 選任後の候補辞退・資格失効" {...{ feedback, state, reset }}>
    <p className="text-sm text-text-sub">D+21に架空候補Aを選任、Bは落選した例です。敗者の辞退は勝者の契約を停止しません。</p>
    <dl className="grid gap-2 rounded-lg bg-background p-3 sm:grid-cols-2">
      <div><dt>選任結果</dt><dd className="font-bold">FINAL・候補{state.selectedCandidateId}（履歴不変）</dd></div>
      <div><dt>新規契約・支出</dt><dd className="font-bold">{state.held ? "保留中" : "候補条件に問題なし"}</dd></div>
      <div><dt>契約・予約</dt><dd>{state.contracted ? "契約のデモ済み" : "未契約"}／{state.reserved ? "予約を維持" : "予約なし"}</dd></div>
      <div><dt>銀行処理のデモ</dt><dd>{state.bankStatus}（実送金なし）</dd></div>
    </dl>
    <div className={buttonRow}>{(["A", "B"] as const).map(candidateId => <div key={candidateId} className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" disabled={!state.candidates[candidateId].active} onClick={() => dispatch({ type: "candidate-withdraw", candidateId, day: state.day + 1 })}>候補{candidateId}が辞退</Button>
      <Button size="sm" variant="secondary" disabled={!state.candidates[candidateId].active} onClick={() => dispatch({ type: "candidate-revoke", candidateId, day: state.day + 1 })}>候補{candidateId}が資格失効</Button>
    </div>)}</div>
    <div className={buttonRow}>
      <Button size="sm" disabled={state.held || state.contracted} onClick={() => dispatch({ type: "contract" })}>契約のデモ</Button>
      <Button size="sm" disabled={state.held || !state.contracted || state.reserved || state.paid} onClick={() => dispatch({ type: "reserve" })}>支出を予約</Button>
      <Button size="sm" disabled={state.held || !["RESERVED", "NOT_SENT"].includes(state.bankStatus)} onClick={() => dispatch({ type: "bank-submit" })}>銀行指示のデモ</Button>
      <Button size="sm" variant="secondary" disabled={state.bankStatus !== "SUBMITTED"} onClick={() => dispatch({ type: "bank-unknown" })}>結果不明にする</Button>
      <Button size="sm" variant="secondary" disabled={!pending} onClick={() => dispatch({ type: "bank-confirm", result: "completed" })}>既存指示を完了照合</Button>
      <Button size="sm" variant="secondary" disabled={!pending} onClick={() => dispatch({ type: "bank-confirm", result: "not-sent" })}>既存指示を未送金照合</Button>
    </div>
    <Button size="sm" variant="secondary" className="self-start text-left whitespace-normal!" disabled={state.held} onClick={() => dispatch({ type: "objection", evidenceHash: "a".repeat(64), reason: "election-invalid", signers: DEMO_SIGNERS, proof: "demo-bound-evidence" })}>証拠に基づく異議を3/5承認の例で受理</Button>
    <p className="text-xs text-text-muted">異議の証拠・3人承認は固定の仮定です。辞退とは別経路です。実契約・実投票・資格検証は行いません。</p>
  </Panel>;
}

const refundStatuses: Record<string, string> = { RESERVED: "未送金予約", SUBMITTED: "指示中", UNKNOWN: "結果不明", FAILED: "未送金照合済み", COMPLETED: "デモ完了", OFFSET_CLOSED: "全額相殺" };
function RefundPanel() {
  const { state, feedback, dispatch, reset } = useWorkflow<RefundState, RefundAction>(createDemoRefund, applyRefund);
  const [amount, setAmount] = useState(100);
  const totals = refundTotals(state);
  const latestCancellation = Object.entries(state.cancellations).filter(([, entry]) => entry.ownerId === "A").at(-1)?.[0];
  return <Panel id="refund" title="2. 入金取消と返金予約の追記相殺" {...{ feedback, state, reset }}>
    <p className="text-sm text-text-sub">架空のA/B各100円、最初の返金予約は各50円。A取消→未送金予約相殺→Bの返金照合→残余バッチ追加の順で操作できます。</p>
    <dl className="grid grid-cols-2 gap-3 rounded-lg bg-background p-3 sm:grid-cols-4">
      <div><dt>デモ現金</dt><dd className="font-bold">{money(state.cash)}</dd></div>
      <div><dt>予約・債務</dt><dd className="font-bold">{money(totals.obligations)}</dd></div>
      <div><dt>追加返金原資</dt><dd className="font-bold">{money(totals.refundAvailable)}</dd></div>
      <div><dt>原資不足</dt><dd className="font-bold">{money(totals.shortfall)}</dd></div>
    </dl>
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">Aの取消額（円）<input className="w-32 rounded-lg border border-border bg-surface p-2" type="number" min={1} max={100 - state.owners.A.reversed} step={1} value={amount} onChange={event => setAmount(Number(event.target.value))} /></label>
      <Button size="sm" variant="secondary" disabled={state.owners.A.reversed === 100} onClick={() => dispatch({ type: "cancel", ownerId: "A", amount, transactionVersion: state.owners.A.transactionVersion + 1, proof: "demo-payment-cancelled" })}>入金取消を記録</Button>
      <Button size="sm" variant="secondary" className="whitespace-normal!" disabled={!latestCancellation || !["RESERVED", "FAILED"].includes(state.instructions["batch-1:A"].status)} onClick={() => dispatch({ type: "offset", key: "batch-1:A", eventId: latestCancellation!, signers: DEMO_SIGNERS,
        instructionVersion: state.instructions["batch-1:A"].instructionVersion, transactionVersion: state.owners.A.transactionVersion,
        proof: { kind: "demo-unsent", key: "batch-1:A", executionVersion: state.instructions["batch-1:A"].executionVersion, futureExecutionImpossible: true } })}>Aの必要予約だけを3人承認で相殺</Button>
      <Button size="sm" className="whitespace-normal!" disabled={totals.refundAvailable <= 0 || totals.shortfall > 0 || totals.owners.A.cap + totals.owners.B.cap === 0} onClick={() => dispatch({ type: "reserve-remaining", batchId: `batch-${state.batches.length + 1}`, signers: DEMO_SIGNERS })}>残余権利を追加バッチへ予約</Button>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
      <caption className="pb-2 text-left font-bold">固定バッチと追記履歴（架空参加者のみ）</caption>
      <thead><tr>{["指示", "原割当", "デモ完了", "相殺", "残予約", "状態・実行版", "操作"].map(label => <th key={label} scope="col" className="border-b border-border p-2">{label}</th>)}</tr></thead>
      <tbody>{Object.values(state.instructions).map(i => <tr key={i.key}>
        <th scope="row" className="border-b border-border p-2 font-medium">{i.key}</th>
        {[i.originalAmount, i.completedAmount, i.offsetAmount, i.reservedRemaining].map((value, index) => <td key={index} className="border-b border-border p-2">{money(value)}</td>)}
        <td className="border-b border-border p-2">{refundStatuses[i.status]}・版{i.executionVersion}</td>
        <td className="border-b border-border p-2"><div className="flex flex-wrap gap-1">
          <Button size="sm" variant="text" disabled={!["RESERVED", "FAILED"].includes(i.status)} onClick={() => dispatch({ type: i.status === "FAILED" ? "retry" : "submit", key: i.key, instructionVersion: i.instructionVersion, executionVersion: i.executionVersion, transactionVersion: state.owners[i.ownerId].transactionVersion, holder: { ownerId: i.ownerId, proof: "demo-owner-bound" }, intent: refundIntent(state, i.key) })}>指示</Button>
          <Button size="sm" variant="text" disabled={i.status !== "SUBMITTED"} onClick={() => dispatch({ type: "unknown", key: i.key })}>不明</Button>
          <Button size="sm" variant="text" disabled={!["SUBMITTED", "UNKNOWN"].includes(i.status)} onClick={() => dispatch({ type: "confirm", key: i.key, executionVersion: i.executionVersion, result: "completed", proof: "demo-bank-final" })}>完了照合</Button>
          <Button size="sm" variant="text" disabled={!["SUBMITTED", "UNKNOWN"].includes(i.status)} onClick={() => dispatch({ type: "confirm", key: i.key, executionVersion: i.executionVersion, result: "not-sent", proof: "demo-bank-final" })}>未送金照合</Button>
        </div></td>
      </tr>)}</tbody>
    </table></div>
    <p className="text-sm text-text-sub">A：返金権利残余 {money(totals.owners.A.cap)}・既払い超過 {money(totals.owners.A.overpaid)}／B：返金権利残余 {money(totals.owners.B.cap)}。外部立替の仮定額：{money(state.externalAdvance)}。</p>
    <p className="text-xs text-text-muted">外部証明・承認者・所持者は固定デモ。UNKNOWNは相殺・再試行不可です。残余全額を賄えない部分原資の比例配分、実決済、実補填保証は未実装です。</p>
  </Panel>;
}

const catalogStatuses: Record<string, string> = { FINALIZATION_WAIT: "確定待ち", RECONCILING: "再照合中", NEEDS_CHANGE: "新提案・新審査が必要", REVIEW_EXPIRED: "審査失効", FINAL: "デモ確定" };
type Relation = "unrelated" | "duplicate" | "changed" | "unknown";
function CatalogPanel() {
  const { state, feedback, dispatch, reset } = useWorkflow<CatalogState, CatalogAction>(createDemoCatalog, applyCatalog);
  const [relations, setRelations] = useState<Record<"P" | "Q" | "R" | "S", Relation>>({ P: "unrelated", Q: "unrelated", R: "unrelated", S: "unrelated" });
  return <Panel id="catalog" title="3. カタログ競合と最新版への再署名" {...{ feedback, state, reset }}>
    <p className="text-sm text-text-sub">P/Q/R/Sは同時刻の確定待ち例。P→Q→Rを確定しながらSを再照合しても、無関係な競合回数だけではSを失効させません。</p>
    <p className="font-bold text-primary-dark">カタログ版 {state.catalogVersion}／基盤時刻の例 D+{(state.now / 86400).toFixed(3)}／確定：{state.history.map(entry => entry.proposalId).join(" → ") || "まだありません"}</p>
    <div className="grid gap-3 md:grid-cols-2">{(["P", "Q", "R", "S"] as const).map(proposalId => {
      const p = state.proposals[proposalId];
      const terminal = ["FINAL", "NEEDS_CHANGE", "REVIEW_EXPIRED"].includes(p.status);
      return <article key={proposalId} className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-3">
        <h3 className="font-bold">提案{proposalId}：{catalogStatuses[p.status]}</h3>
        <p className="text-sm text-text-sub">署名カタログ版 {p.signedVersion}／期限 D+{(p.signatureExpiresAt / 86400).toFixed(3)}／元12日上限は不変</p>
        <div className={buttonRow}>
          <Button size="sm" disabled={terminal || p.status !== "FINALIZATION_WAIT"} onClick={() => dispatch({ type: "finalize", proposalId, expectedCatalogVersion: state.catalogVersion, now: state.now + 1 })}>確定のデモ</Button>
          <Button size="sm" variant="secondary" disabled={terminal} onClick={() => dispatch({ type: "begin-reconcile", proposalId, now: state.now + 1 })}>再照合を開始</Button>
        </div>
        <label className="flex flex-col gap-1 text-sm">差分の分類例（AI判定ではありません）
          <select className="w-full min-w-0 rounded-lg border border-border bg-surface p-2" value={relations[proposalId]} disabled={terminal} onChange={event => setRelations(previous => ({ ...previous, [proposalId]: event.target.value as Relation }))}>
            <option value="unrelated">無関係</option><option value="unknown">未分類</option><option value="duplicate">真の重複</option><option value="changed">候補・比較条件が変化</option>
          </select>
        </label>
        <Button size="sm" variant="secondary" className="whitespace-normal!" disabled={terminal || p.status !== "RECONCILING"} onClick={() => dispatch(catalogReconciliation(state, proposalId, relations[proposalId]))}>差分を3人で照合（未分類は保留）</Button>
      </article>;
    })}</div>
    <p className="text-xs text-text-muted">分類、暫定承認、異議終了、3人独立性は固定の仮定です。未分類は保留、関連変更は新審査が必要。実際の公開カタログへ登録せず、新審査・AI・暗号・共有DBの実装は未接続です。</p>
  </Panel>;
}

export function WorkflowConsole() {
  return <>
    <Callout icon={Info} tone="neutral"><p className="font-bold">実アプリの操作デモです。本番の投票・契約・決済機能ではありません。</p>
      <p>架空データをこの画面のメモリー内だけで処理します。再読み込み・移動で状態は消え、既存の参加登録・作成プレビュー・実カタログとは連動しません。実送金・外部署名・共有DBは未接続、本番ゲートG-01〜05は未解除です。</p>
    </Callout>
    <ElectionPanel /><RefundPanel /><CatalogPanel />
  </>;
}
