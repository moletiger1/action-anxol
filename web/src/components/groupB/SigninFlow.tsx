"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Mail, Wallet } from "lucide-react";
import { JoinShell, joinSteps } from "@/components/groupB/JoinShell";
import { FlowStepper } from "@/components/groupB/FlowStepper";
import { Button, ButtonLink, Callout, TextField } from "@/components/ui";
import { routes } from "@/lib/routes";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// B02b サインイン（B02の段階違い）。閲覧段階でウォレット接続は要求しない。
function SigninFlow({ individual = false }: { individual?: boolean }) {
  const router = useRouter();
  const recruitmentHref = individual ? routes.individualRecruitment : routes.recruitment;
  const joinHref = individual ? routes.individualJoin : routes.join;
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const error = touched && !isEmail(email) ? "メールアドレスの形式が正しくありません" : undefined;

  const sendLink = () => {
    setTouched(true);
    if (!isEmail(email)) return;
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 900);
  };

  const goJoin = () => router.push(joinHref);

  return (
    <JoinShell
      mobileTitle="参加の登録"
      mobileBackHref={recruitmentHref}
      recruitmentTitle={individual ? "個人会員向けの共同相談" : "法人会員・利用者の共同相談"}
      recruitmentHref={recruitmentHref}
    >
      <div className="mx-auto flex w-full max-w-[1248px] flex-col items-center gap-6 px-4 pt-4 pb-6 md:gap-10 md:px-6 md:pt-7 md:pb-20">
        <div className="w-full">
          <FlowStepper steps={joinSteps} current={1} />
        </div>

        <section
          aria-labelledby="signin-title"
          className="flex w-full max-w-[520px] flex-col gap-5 rounded-2xl border border-border bg-surface p-6 md:p-9"
        >
          <div className="flex flex-col gap-2">
            <h1 id="signin-title" className="text-xl font-bold text-text md:text-[22px]">
              参加を続けるにはサインインしてください
            </h1>
            <p className="text-[15px] text-text-sub">
              参加希望の状況や、相談の進み具合をお知らせするために使います。閲覧だけならサインインは不要です。
            </p>
          </div>

          <Callout icon={KeyRound} tone="neutral" title="サインイン画面のデモ">
            <p>パスキー確認・メール送信・アカウント作成は行いません。下の操作から参加登録の画面例へ進めます。</p>
          </Callout>

          <Button icon={KeyRound} onClick={goJoin} className="h-[52px] w-full">
            認証を省略して参加登録の画面例を見る
          </Button>

          <div className="flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="text-[13px] text-text-muted">または</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {sent ? (
            <div role="status" className="flex flex-col gap-3 rounded-[10px] bg-[#F4F6F9] p-4">
              <p className="text-base font-bold text-text">送信状態の表示例</p>
              <p className="text-sm text-text">
                {email.trim()} 宛に送る想定の画面です。実際のメール送信・認証・有効期限の発行はありません。
              </p>
              <Button variant="secondary" icon={Mail} onClick={goJoin}>
                参加登録の画面例へ進む
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <TextField
                label="メールアドレス"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.jp"
                hint="メールは実際には送信されません。目的：通知・本人確認の連絡"
                error={error}
              />
              <Button variant="secondary" onClick={sendLink} loading={sending} loadingLabel="表示を切り替えています…">
                送信状態を表示する（デモ）
              </Button>
            </div>
          )}

          <Callout icon={Wallet} tone="neutral">
            <p>このデモではウォレット接続・支払い方法の選択・相談費の拠出を行いません。</p>
          </Callout>

          <div className="flex flex-wrap gap-2">
            <ButtonLink href={recruitmentHref} variant="text">
              パスキーとは
            </ButtonLink>
            <ButtonLink href={recruitmentHref} variant="text">
              集める情報と利用目的
            </ButtonLink>
          </div>
        </section>
      </div>
    </JoinShell>
  );
}

export default SigninFlow;
