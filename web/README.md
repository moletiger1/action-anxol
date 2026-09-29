# 集団訴訟.jp（仮）円払いデモ

利用者が日本円で支払う前提のNext.jsアプリ。カード・銀行振込は画面遷移のデモで、実際の決済・入金照合・送金は未接続です。下書き等はブラウザー保存で、サーバーの共有データベースはまだありません。

## ローカル起動

Node.js 24を使用します。認証の試行回数を共有するため、ローカルではFirestoreエミュレーター（Java 21以降）を起動します。

```bash
gcloud components install cloud-firestore-emulator
gcloud emulators firestore start --host-port=127.0.0.1:8787 --project=demo-auth-local
```

別のターミナルで起動します。

```bash
cd web
npm ci
FIRESTORE_EMULATOR_HOST=127.0.0.1:8787 \
AUTH_FIRESTORE_PROJECT_ID=demo-auth-local AUTH_FIRESTORE_DATABASE_ID='(default)' \
AUTH_SESSION_SECRET="$(openssl rand -hex 32)" \
BASIC_AUTH_USERNAME=reviewer BASIC_AUTH_PASSWORD=YOUR_LOCAL_PASSWORD npm run dev
```

`http://localhost:3000` を開きます。拠出画面は `/recruitments/timescar-corporate/contribute` です。
ブラウザーの認証ダイアログに上で設定したID・パスワードを入力します。認証用環境変数が欠ける場合は503でアクセスを拒否します。

## 確認

```bash
node scripts/check-yen.mjs
npx tsc --noEmit
npm run build
FIRESTORE_EMULATOR_HOST=127.0.0.1:8787 npm run test:security
```

`test:security` はローカルの3317〜3320ポートで本番ビルドを起動し、2プロセスでの共有制限、Cookie署名鍵の独立性・改ざん・期限切れ、ヘッダー、設定不足・保存状態異常時の拒否を確認します。エミュレーター内のランダムなテストプロジェクトだけを使用します。

起動中のアプリに対して `BASIC_AUTH_TEST_URL`・`BASIC_AUTH_USERNAME`・`BASIC_AUTH_PASSWORD` を環境変数に設定し、`node scripts/check-basic-auth.mjs` で認証と静的ファイルの保護を確認できます。こちらも新規認証の試行枠を消費します。

## GCP検証環境

検証URLは **https://action.anxol.com** です。ブラウザーのBasic認証ダイアログでID `reviewer` と検証用パスワードを入力します。Googleログインやローカルプロキシは不要です。

パスワードはSecret Managerの `shudan-basic-auth-password` バージョン `1` に保存し、実行サービスアカウントだけに当該シークレットの参照権限を追加しています。ソースコードやビルドには含めません。権限を持つ管理者はGoogle Cloud ConsoleのSecret Managerで値を確認できます。

Cloud Runの入口は外部から呼び出せる設定とし、アプリの `src/proxy.ts` で全リクエストのBasic認証または署名付きCookieを検証します。未認証・誤った認証は401、設定不足は503です。ページ・RSC・静的ファイルにも適用し、認証済みレスポンスを共有キャッシュに保存しません。サービス標準URL `https://shudan-sosho-demo-977136953532.asia-northeast1.run.app` も同じ認証で保護します。

認証後は8時間有効の署名付きCookie（`HttpOnly; Secure; SameSite=Strict`、`__Host-`接頭辞）を使用します。署名鍵はパスワードとは独立したランダム値で、Secret Managerの `shudan-basic-auth-session-secret:1` から `AUTH_SESSION_SECRET` に渡します。鍵は32文字以上が必須で、パスワードと同じ値は拒否します。パスワードまたは署名鍵の変更で既存Cookieも無効になります。新規認証はサービス全体で60秒間に20回まで。Firestoreのトランザクションで、全インスタンス・全ホストの試行を合算します。IPヘッダーの偽装・パス・ユーザー名の変更では枠を増やせません。上限では429と`Retry-After`を返し、既に認証済みの閲覧は継続できます。

少人数の共有アカウント向けの制限です。第三者が枠を使い切ると、新規ログインは次の60秒窓まで待つ必要があります。一般ユーザー向けの本番認証は、ユーザー別に管理できる認証基盤へ移行してください。Firestoreは`auth-security`データベースの`authRateLimits/basic`に件数と終了時刻だけを保存し、パスワード・Cookie・IPは保存しません。Firestore障害時は新規認証を503で拒否します。

全パスに埋め込み防止のCSPと`X-Frame-Options: DENY`、`nosniff`、Referrer-Policyを設定しています。

独自ドメインのCloud Runマッピング、Cloudflare DNS、Google管理のHTTPS証明書は2026-09-29に設定しました。

Cloudflareでは `action` のAレコード4件（`216.239.32.21`、`216.239.34.21`、`216.239.36.21`、`216.239.38.21`）とAAAAレコード4件（`2001:4860:4802:32::15`、`2001:4860:4802:34::15`、`2001:4860:4802:36::15`、`2001:4860:4802:38::15`）をDNS onlyで設定しています。所有権確認用CNAME `3j65ny64wddz.action` → `gv-fxdwvmv7iv3fu4.dv.googlehosted.com` は維持してください。

証明書の発行状態は次で確認できます。

```bash
gcloud --configuration=action-anxol beta run domain-mappings describe \
  --domain=action.anxol.com --project=action-anxol-com --region=asia-northeast1
```

- プロジェクト: `action-anxol-com`
- Cloud Runサービス: `shudan-sosho-demo`
- リージョン: `asia-northeast1`（東京）
- 実行サービスアカウント: `shudan-web@action-anxol-com.iam.gserviceaccount.com`
- ビルドサービスアカウント: `shudan-build@action-anxol-com.iam.gserviceaccount.com`（`roles/run.builder`）
- Basic認証必須、最小0・最大2インスタンス。最大数は料金の上限を保証する設定ではありません。

最初にリポジトリのルートで認証用ストレージと署名鍵を準備します。Firestore APIを有効化し、東京リージョンに専用DBを作成します。実行サービスアカウントだけに当該DBの利用権限と署名鍵の参照権限を付与します。FirestoreとSecret Managerは利用量に応じて課金されます。

```bash
./scripts/setup-auth-storage.sh
```

再配備はリポジトリのルートで実行します。ストレージがない場合は配備前に停止します。

```bash
./scripts/deploy-cloud-run.sh
```

切替前に新しいリビジョンを確認する場合は `./scripts/deploy-cloud-run.sh --no-traffic --tag security-review` を使います。タグURLで確認後、`gcloud run services update-traffic` で対象リビジョンへ切り替えます。

専用のgcloud構成 `action-anxol` を使用します。別端末では `gcloud auth login` 後、構成を作成してこのプロジェクトにアクセスできるアカウントを設定してください。

```bash
gcloud config configurations create action-anxol --no-activate
gcloud --configuration=action-anxol config set account YOUR_GOOGLE_ACCOUNT
gcloud --configuration=action-anxol config set project action-anxol-com
gcloud --configuration=action-anxol config set billing/quota_project action-anxol-com
```

`.gcloudignore` は送信対象をアプリとビルド設定に限定しています。ローカルの認証情報、環境変数ファイル、既存ビルド、コントラクト、調査資料を送信しません。

Google Cloudの[Next.jsデプロイ手順](https://docs.cloud.google.com/run/docs/quickstarts/frameworks/deploy-nextjs-service)に沿ってCloud Build/Buildpacksでビルドします。Node.jsのバージョンは[Buildpacksの指定方法](https://docs.cloud.google.com/docs/buildpacks/nodejs)に従いpackage.jsonのenginesで固定しています。

円払いの現行仕様は [方針書](../docs/2026-09-29-jpy-payments.md) を参照してください。
