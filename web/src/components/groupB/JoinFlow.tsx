"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  ArrowLeft,
  Ban,
  CircleCheck,
  CircleDashed,
  FileText,
  Image as ImageIcon,
  Info,
  Lock,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge, Button, ButtonLink, Callout, ConfirmDialog, StageBanner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { loadJoinDemoState, saveJoinDemoState, type JoinDemoReadResult } from "@/lib/joinDemo";
import { routes } from "@/lib/routes";
import { demoRecruitments } from "@/lib/demoRecruitments";
import { FlowStepper, MobileStageCard } from "./FlowStepper";
import { FieldError, Toggle } from "./form";
import { JoinShell, joinSteps } from "./JoinShell";
import { FlowCtaBar } from "./WizardFrame";

type SharedFile = {
  id: string;
  name: string;
  meta: string;
  kind: "image" | "pdf";
  /** 内容確認担当が閲覧できるか */
  reviewerAccess: boolean;
  /** 採択された相談先の弁護士への共有許可 */
  lawyerShare: boolean;
};

const ACCEPT = ["image/png", "image/jpeg", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function nowLabel() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
}

function viewersText(f: SharedFile) {
  return f.reviewerAccess ? "内容確認担当への共有を選択中（表示のみ）" : "本人のみの設定（表示のみ）";
}

function StatusRow({
  label,
  badge,
  note,
  last,
}: {
  label: string;
  badge: React.ReactNode;
  note?: string;
  last?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 py-3.5", !last && "border-b border-border")}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-text-sub">{label}</span>
        {badge}
      </div>
      {note && <p className="text-[13px] text-text-muted">{note}</p>}
    </div>
  );
}

function RegistrationStatus({ submission, audienceLabel }: { submission: JoinDemoReadResult | undefined; audienceLabel: string }) {
  const statusLabel =
    submission === undefined
      ? "状態を確認中…"
      : typeof submission === "string"
        ? "保存状態を確認できません"
      : submission?.status === "registered"
        ? "登録済み（デモ）"
        : submission?.status === "cancelled"
          ? "取り消し済み"
          : "登録前（デモ）";

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[340px]">
      <section className="flex flex-col rounded-xl border border-border bg-surface px-5 pt-5 pb-2">
        <h2 className="text-base font-bold text-text">登録状況（デモ）</h2>
        <StatusRow
          label="参加希望"
          badge={
            <Badge tone={typeof submission !== "string" && submission?.status === "registered" ? "green" : "neutral"} icon={typeof submission !== "string" && submission?.status === "registered" ? CircleCheck : CircleDashed}>
              {statusLabel}
            </Badge>
          }
          note={submission === undefined ? "保存状態を読み込んでいます。" : typeof submission === "string" ? "保存データを確認できるまで登録を停止しています。" : submission?.status === "registered" ? "このブラウザに登録記録があります。" : "確認画面からデモ登録できます。"}
        />
        <StatusRow
          label="対象条件"
          badge={
            <Badge tone="green" icon={CircleCheck}>
              自己申告（デモ）
            </Badge>
          }
          note="本人確認・対象確認はこのデモでは行いません。"
        />
        <StatusRow
          label="利用区分"
          badge={
            <Badge tone="primary" icon={Info}>
              {audienceLabel}（例）
            </Badge>
          }
        />
        <StatusRow
          label="本人確認"
          badge={
            <Badge tone="neutral" icon={CircleDashed}>
              未実施
            </Badge>
          }
          note="このデモではメール認証・本人確認・結果通知を行いません。"
        />
        <StatusRow
          label="関係性の確認"
          badge={
            <Badge tone="neutral" icon={CircleDashed}>
              未完了
            </Badge>
          }
          note="資料本体は送信されないため、関係性の確認は行われません。"
          last
        />
      </section>
      <Callout icon={Info} tone="primary">
        <p>
          登録だけで、訴訟を依頼したことにはなりません。弁護士への正式な依頼は、相談結果を見たあとに本人が決めます。
        </p>
      </Callout>
    </aside>
  );
}

function FileCard({
  file,
  onChange,
  onDelete,
}: {
  file: SharedFile;
  onChange: (patch: Partial<SharedFile>) => void;
  onDelete: () => void;
}) {
  const Icon = file.kind === "image" ? ImageIcon : FileText;
  return (
    <li className="flex flex-col gap-3.5 rounded-xl border border-border p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-neutral-soft">
          <Icon className="size-5 text-text-sub" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-bold break-all text-text">{file.name}</span>
          <span className="text-[13px] text-text-muted">{file.meta}</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="neutral" icon={CircleDashed}>ファイル未送信</Badge>
          <Button variant="text" onClick={onDelete} aria-label={`${file.name}を削除`}>
            削除
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
        <div className="flex flex-1 flex-col gap-1.5 rounded-[10px] bg-[#F4F6F9] p-3.5">
          <span className="text-[13px] font-bold text-text-sub">閲覧設定（デモ表示）</span>
          <p className="text-sm text-text">{viewersText(file)}</p>
          <Toggle
            checked={file.reviewerAccess}
            onChange={(v) => onChange({ reviewerAccess: v })}
            onLabel="内容確認担当へ共有する設定（表示のみ）"
            offLabel="本人のみの設定（表示のみ）"
            ariaLabel={`${file.name}：内容確認担当の閲覧`}
          />
        </div>
        <div className="flex flex-1 flex-col gap-0.5 rounded-[10px] bg-[#F4F6F9] px-3.5 py-2">
          <span className="text-[13px] font-bold text-text-sub">相談先への共有設定（デモ表示）</span>
          <Toggle
            checked={file.lawyerShare}
            onChange={(v) => onChange({ lawyerShare: v })}
            onLabel="採択された相談先へ共有する設定（表示のみ）"
            offLabel="共有しない設定（表示のみ）"
            ariaLabel={`${file.name}：弁護士への共有`}
          />
          <p className="text-[13px] text-text-muted">
            {file.lawyerShare
              ? "ファイル本体は送信されず、実際の共有先も変わりません。"
              : "この切替は画面表示のみで、相談の内容には影響しません。"}
          </p>
        </div>
      </div>
    </li>
  );
}

export function JoinFlow({ recruitmentId = "timescar-corporate" }: { recruitmentId?: "timescar-corporate" | "timescar-individual" }) {
  const router = useRouter();
  const recruitment = demoRecruitments.find((item) => item.id === recruitmentId)!;
  const recruitmentTitle = recruitment.title;
  const recruitmentHref = recruitment.href;
  const joinHref = recruitmentId === "timescar-individual" ? routes.individualJoin : routes.join;
  const audienceLabel = recruitmentId === "timescar-individual" ? "個人会員" : "法人会員の利用者";
  const [phase, setPhase] = useState<"share" | "confirm">("share");
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [priorSubmission, setPriorSubmission] = useState<JoinDemoReadResult | undefined>(undefined);
  const [skipped, setSkipped] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState<SharedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setPriorSubmission(loadJoinDemoState(recruitmentId)), [recruitmentId]);

  const shareStage =
    priorSubmission === undefined
      ? "参加状態を確認中"
      : typeof priorSubmission === "string"
        ? "参加状態の保存データを確認できません"
      : priorSubmission?.status === "registered"
        ? "参加希望は登録済み・資料の共有（任意）"
        : "参加希望の登録・資料選択（任意）";

  const patch = (id: string, p: Partial<SharedFile>) =>
    setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, ...p } : f)));

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const accepted: SharedFile[] = [];
    const rejected: string[] = [];
    Array.from(list).forEach((file, i) => {
      if (!ACCEPT.includes(file.type) || file.size > MAX_BYTES) {
        rejected.push(file.name);
        return;
      }
      accepted.push({
        id: `u${Date.now()}-${i}`,
        name: file.name,
        meta: `${formatSize(file.size)}・${nowLabel()} 選択`,
        kind: file.type === "application/pdf" ? "pdf" : "image",
        reviewerAccess: true,
        lawyerShare: false,
      });
    });
    setFiles((fs) => [...fs, ...accepted]);
    setUploadError(
      rejected.length
        ? `「${rejected.join("」「")}」は選択できませんでした。PNG・JPEG・PDFで、1ファイル10MBまでのものを選んでください`
        : null,
    );
    if (accepted.length) setSkipped(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const toConfirm = (skip: boolean) => {
    setSkipped(skip);
    setPhase("confirm");
    window.scrollTo({ top: 0 });
  };

  const submit = () => {
    if (priorSubmission === undefined || typeof priorSubmission === "string") return;
    setSubmitting(true);
    setSubmissionError(false);
    window.setTimeout(() => {
      if (!saveJoinDemoState(sharedFiles.length, skipped, recruitmentId)) {
        setSubmitting(false);
        setSubmissionError(true);
        return;
      }
      router.push(routes.dashboard);
    }, 900);
  };

  const sharedFiles = skipped ? [] : files;

  return (
    <JoinShell
      mobileTitle="参加の登録"
      mobileBackHref={phase === "share" ? recruitmentHref : joinHref}
      hasCtaBar
      recruitmentTitle={recruitmentTitle}
      recruitmentHref={recruitmentHref}
    >
      <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-4 px-4 pt-4 pb-6 md:gap-6 md:px-6 md:pt-7 md:pb-20">
        <FlowStepper steps={joinSteps} current={phase === "share" ? 4 : 5} />
        {priorSubmission && (
          typeof priorSubmission === "string" ? (
            <Callout icon={Info} tone="red">
              <p>{priorSubmission === "invalid" ? "参加状態の保存データが壊れています。元データを残し、未登録扱いや上書きを停止しました。" : "ブラウザーの保存領域を利用できず、参加状態を確認できません。"}</p>
            </Callout>
          ) : (
            <Callout icon={Info} tone="neutral">
              <p>
                {priorSubmission.status === "cancelled"
                  ? "このブラウザでは以前の参加希望を取り消しています。"
                  : "このブラウザでは以前に参加希望を登録しています。"}
                {priorSubmission.skippedFiles || priorSubmission.selectedFileCount === 0
                  ? "前回は資料を選択せずに登録しました。"
                  : `前回は資料${priorSubmission.selectedFileCount}件を選択しました。`}
                ファイル本体とファイル名は保存していません。実際の資料共有はこのデモでは行われません。
              </p>
            </Callout>
          )
        )}
        {phase === "share" ? (
          <>
            <div className="hidden md:block">
              <StageBanner
                stage={shareStage}
                next="実際の資料共有はこのデモでは行われません。共有しなくても参加希望のデモ登録を進められます。"
              />
            </div>
            <MobileStageCard
              stage={shareStage}
              next="実際の資料共有はこのデモでは行われません。共有しなくても参加希望のデモ登録を進められます。"
            />
          </>
        ) : (
          <>
            <div className="hidden md:block">
              <StageBanner
                stage="内容の確認"
                next="このデモで記録する内容を確認してください。実際の本人確認や資料共有は行われません。"
              />
            </div>
            <MobileStageCard
              stage="内容の確認"
              next="このデモで記録する内容を確認してください。実際の本人確認や資料共有は行われません。"
            />
          </>
        )}

        <div className="flex flex-col-reverse gap-4 md:gap-8 lg:flex-row lg:items-start">
          <RegistrationStatus submission={priorSubmission} audienceLabel={audienceLabel} />

          {phase === "share" ? (
            <section className="flex min-w-0 flex-1 flex-col gap-6 rounded-xl border border-border bg-surface p-5 md:p-8">
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-bold text-text md:text-[22px]">資料共有のデモ（任意）</h1>
                  <Badge tone="neutral" icon={Lock}>
                    ファイル本体は未送信
                  </Badge>
                </div>
                <p className="text-base text-text-sub">
                  選択したファイルは送信・保管されません。共有範囲の切替は画面表示だけのデモです。
                </p>
              </div>

              <div className="overflow-hidden rounded-[10px] border border-border">
                <div className="hidden gap-4 bg-[#F4F6F9] px-4 py-2.5 text-[13px] font-bold text-text-sub md:flex">
                  <span className="w-[260px] shrink-0">お願いする資料</span>
                  <span>使う目的</span>
                </div>
                {[
                  [
                    "運営会社からの通知メール（画面の写しで可）",
                    "対象であることの確認。確認後は、内容確認担当以外は閲覧しません",
                  ],
                    [recruitmentId === "timescar-individual" ? "会員として通知を受け取ったことが分かるもの" : "法人契約の利用者であることが分かるもの", `${audienceLabel}向けの募集の対象かどうかの確認`],
                ].map(([doc, purpose]) => (
                  <div
                    key={doc}
                    className="flex flex-col gap-1 border-t border-border px-4 py-3 first:border-t-0 md:flex-row md:gap-4 md:first:border-t"
                  >
                    <span className="text-[15px] font-medium text-text md:w-[260px] md:shrink-0">{doc}</span>
                    <span className="text-sm text-text-sub">
                      <span className="font-bold md:hidden">使う目的：</span>
                      {purpose}
                    </span>
                  </div>
                ))}
                <div className="flex items-start gap-3 border-t border-border bg-red-soft px-4 py-3 md:items-center">
                  <Ban className="mt-0.5 size-[18px] shrink-0 text-red md:mt-0" aria-hidden />
                  <span className="text-sm font-medium text-red">
                    送らないでください：マイナンバー、クレジットカード番号、パスワード、運転免許証の画像
                  </span>
                </div>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex flex-col items-center gap-2.5 rounded-xl border border-dashed p-6 text-center md:p-7",
                  dragging ? "border-primary bg-primary-soft" : "border-border-strong bg-[#FAFBFC]",
                )}
              >
                <Upload className="size-7 text-primary-dark" aria-hidden />
                <p className="text-base font-bold text-text">
                  <span className="hidden md:inline">ファイルをここにドラッグ、または選択</span>
                  <span className="md:hidden">ファイルを選択</span>
                </p>
                <p className="text-[13px] text-text-muted">
                  PNG・JPEG・PDF、1ファイル10MBまで。ファイル名などの情報だけを一時表示し、内容は読み込みません。
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                  multiple
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                  ファイルを選ぶ
                </Button>
              </div>
              <FieldError>{uploadError}</FieldError>

              <div className="flex flex-col gap-3">
                <h2 className="text-base font-bold text-text">この画面で選択した資料（{files.length}件）</h2>
                {files.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-text-muted">
                    まだ資料は選択されていません。選択しなくても参加希望のデモ登録は進められます。
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {files.map((f) => (
                      <FileCard
                        key={f.id}
                        file={f}
                        onChange={(p) => patch(f.id, p)}
                        onDelete={() => setDeleting(f)}
                      />
                    ))}
                  </ul>
                )}
              </div>

              <div className="hidden items-center justify-between gap-4 border-t border-border pt-6 md:flex">
                <ButtonLink href={recruitmentHref} variant="secondary" icon={ArrowLeft}>
                  戻る
                </ButtonLink>
                <div className="flex items-center gap-4">
                  <Button variant="text" onClick={() => toConfirm(true)}>
                    資料を共有せずに進む
                  </Button>
                  <Button onClick={() => toConfirm(false)}>次へ：内容の確認</Button>
                </div>
              </div>
            </section>
          ) : (
            <section className="flex min-w-0 flex-1 flex-col gap-6 rounded-xl border border-border bg-surface p-5 md:p-8">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-xl font-bold text-text md:text-[22px]">登録内容の確認</h1>
                <p className="text-base text-text-sub">
                  参加する募集：{recruitmentTitle}（タイムズカーの個人情報漏えいに関する共同相談）
                </p>
              </div>
              <dl className="flex flex-col">
                {[
                  ["参加希望", "登録済み"],
                  ["利用区分", audienceLabel],
                  ["本人確認", "未実施（このデモでは確認しません）"],
                  [
                    "選択した資料",
                    sharedFiles.length ? `${sharedFiles.length}件を選択（本体は未送信）` : "選択しない",
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-1 border-b border-border py-2.5 sm:flex-row sm:gap-4">
                    <dt className="shrink-0 text-sm text-text-muted sm:w-[140px]">{k}</dt>
                    <dd className="text-[15px] text-text">{v}</dd>
                  </div>
                ))}
              </dl>
              {sharedFiles.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {sharedFiles.map((f) => (
                    <li key={f.id} className="flex flex-col gap-1 rounded-[10px] bg-[#F4F6F9] px-4 py-3">
                      <span className="text-[15px] font-bold break-all text-text">{f.name}</span>
                      <span className="text-sm text-text-sub">閲覧設定：{viewersText(f)}</span>
                      <span className="text-sm text-text-sub">
                        相談先への共有設定：{f.lawyerShare ? "共有を選択（表示のみ）" : "共有しない（表示のみ）"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Callout icon={Lock} tone="neutral">
                <p>閲覧者や弁護士への共有設定は表示用です。このデモではファイル送信もアクセス権の変更も行われません。</p>
              </Callout>
              {submissionError && (
                <Callout icon={Info} tone="neutral">
                  <p>登録状態をこのブラウザに保存できませんでした。保存領域を確認して、もう一度お試しください。</p>
                </Callout>
              )}
              <div className="hidden items-center justify-between gap-4 border-t border-border pt-6 md:flex">
                <Button variant="secondary" icon={ArrowLeft} onClick={() => setPhase("share")}>
                  戻る
                </Button>
                <Button onClick={submit} disabled={priorSubmission === undefined || typeof priorSubmission === "string"} loading={submitting} loadingLabel="登録しています…">
                  この内容で登録する
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>

      <FlowCtaBar>
        {phase === "share" ? (
          <>
            <Button onClick={() => toConfirm(false)}>次へ：内容の確認</Button>
            <Button variant="text" className="self-center" onClick={() => toConfirm(true)}>
              資料を共有せずに進む
            </Button>
          </>
        ) : (
          <div className="flex gap-3">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setPhase("share")}>
              戻る
            </Button>
            <Button onClick={submit} disabled={priorSubmission === undefined || typeof priorSubmission === "string"} loading={submitting} loadingLabel="登録しています…" className="flex-1 px-4">
              この内容で登録する
            </Button>
          </div>
        )}
      </FlowCtaBar>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) setFiles((fs) => fs.filter((f) => f.id !== deleting.id));
          setDeleting(null);
        }}
        icon={Trash2}
        title="この資料を削除しますか？"
        description={
          deleting
            ? `「${deleting.name}」をこの画面の選択一覧から外します。ファイル本体は送信・保存されていません。`
            : undefined
        }
        confirmLabel="削除する"
        cancelLabel="削除しない"
      />
    </JoinShell>
  );
}
