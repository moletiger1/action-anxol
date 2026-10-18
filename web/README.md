# 集団訴訟.jp（仮）円払いデモ

利用者が日本円で支払う前提のNext.jsアプリ。カード・銀行振込は画面遷移のデモで、実際の決済・入金照合・送金は未接続です。下書き等の製品データはブラウザー保存で、共有データベースは未接続です。ただし、入口認証の試行回数はFirestoreへ保存するため、ローカル起動にも認証用DBが必要です。

## ローカル起動

Node.js 24を使用します。以下はローカル専用のFirestoreエミュレーターを使う手順です。本番/共有検証環境の秘密・DBを流用せず、実決済・通知のデータを投入しないでください。

### 1. 認証用Firestoreを起動する

Google Cloud CLIとFirestoreエミュレーター、対応するJavaランタイムを事前に用意します。[公式の準備手順](https://cloud.google.com/firestore/native/docs/emulator)に従い、CLIのコンポーネント管理が使える環境では `gcloud components install cloud-firestore-emulator` で導入できます（このアプリのnpm依存には含まれません）。別ターミナルで起動し、待受開始を確認して起動したままにします。

```bash
gcloud beta emulators firestore start \
  --project=demo-action-local --host-port=127.0.0.1:8080
```

ローカルの架空プロジェクトID `demo-action-local` とデフォルトDB `(default)` を使うため、実Firestoreプロジェクト/DBの作成は不要です。エミュレーターはローカル専用・認証なしなので、`0.0.0.0` で公開しないでください。

ただし、現コードはFirestore SDK 9.2.0の `preferRest: true` を使用し、RESTクライアント初期化時にApplication Default Credentials（ADC）を探索します。エミュレーター宛でもSDK用の開発ADCを事前に用意します。未準備の場合は開発専用のGoogleアカウントで、アプリ起動前に以下を実行します（ブラウザーログイン/トークン取得の通信が必要です）。

```bash
gcloud auth application-default login
```

`gcloud auth login` だけではADCの準備になりません。既存ADCを変更する前に現在の開発環境を確認し、本番アカウント/サービスアカウント鍵を流用しないでください。ADCファイルをリポジトリや `.env.local` にコピーしません。認証なしのエミュレーター自体の条件と、SDK初期化の認証探索は別です。ADCを用意しても接続成功の保証ではなく、未準備/照合不能時の503は維持します。

### 2. アプリの認証設定をそろえる

リポジトリルートから別のBashターミナルで実行します。パスワードは手元で決めた開発専用の値を非表示入力し、セッション秘密は独立にランダム生成します。

```bash
cd web
npm ci
export BASIC_AUTH_USERNAME=reviewer
read -r -s -p 'ローカル専用Basicパスワード: ' BASIC_AUTH_PASSWORD
printf '\n'
: "${BASIC_AUTH_PASSWORD:?空のパスワードは使用できません}"
export BASIC_AUTH_PASSWORD
export AUTH_SESSION_SECRET="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
export AUTH_FIRESTORE_PROJECT_ID=demo-action-local
export AUTH_FIRESTORE_DATABASE_ID='(default)'
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
npm run dev
```

| 設定 | 要件 |
|---|---|
| `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD` | 両方必須・空不可。共有デモの入口認証であり、投票資格ではありません |
| `AUTH_SESSION_SECRET` | 32文字以上、Basicパスワードと異なる独立した秘密。上の例は32バイトから64文字を生成 |
| `AUTH_FIRESTORE_PROJECT_ID` / `AUTH_FIRESTORE_DATABASE_ID` | 両方必須。接続先に合わせ、DB名 `(default)` は引用符で囲む |
| `FIRESTORE_EMULATOR_HOST` | エミュレーターの到達可能な `host:port`。`http://` を付けない |
| `K_SERVICE` | ローカルでは未設定。Cloud Runが設定する変数とエミュレーターの併用は拒否されます。Cloud Runでこの拒否を回避しないでください |

秘密をソース・履歴・ログ・`NEXT_PUBLIC_*`へ入れないでください。継続保存する場合は `web/.env.local`（Git除外済み）に開発専用値だけを保管し、公開/コミットしません。変更後は開発サーバーを再起動します。

エミュレーターの代わりに開発専用の実Firestoreを使う場合は、事前にFirestore Nativeモードのプロジェクト/DBを作成し、2変数をそのIDへ変更して `FIRESTORE_EMULATOR_HOST` を未設定にします。ローカルSDK用に `gcloud auth application-default login` 等のApplication Default Credentialsを用意し、当該開発DBで `authRateLimits/basic` の読み書き/トランザクションを許す権限（例：`roles/datastore.user`）とネットワーク接続を管理者に確認してください。`gcloud auth login` だけではSDK用認証の代わりになりません。実DB利用には課金/権限管理が伴います。本番の秘密・DBで試しません。

### 3. ブラウザーで開く

`http://localhost:3000` を開き、認証ダイアログに上で設定したID・パスワードを入力します。拠出画面は `/recruitments/timescar-corporate/contribute` です。

認証Cookieは `Secure` / `HttpOnly` / `SameSite=Strict` です。localhostのHTTPでSecure Cookieを保持しないブラウザーでは、信頼できるローカル証明書を用意して `npm run dev -- --experimental-https` で起動し、`https://localhost:3000` を使います（開発専用の証明書準備/信頼が必要）。Cookieの保護属性を外す回避はしません。

- 秘密不足/短い秘密/パスワードと同一の秘密：503で拒否。
- 認証ヘッダー付きの初回要求でDB設定不足・接続/権限エラー：503で拒否。Basicの2変数とセッション秘密だけでは起動条件を満たしません。
- 正しく構成した未認証/誤認証：401。新規認証試行は全体で20回/分の共有制限があり、超過時は429と `Retry-After` を返します。Cookieが保存されないと静的ファイル等も新規試行になり得ます。

この手順は認証コード/設定要件との静的照合による補完です。エミュレーター接続・認証・静的資産保護・実ブラウザー表示は2026-10-16〜17に確認済みです（詳細は[残タスク一覧](../todolist.md)の§9 TEST-02/03/04）。

## 辞退・返金・カタログの操作機能

`/dashboard/workflows` に、仕様v0.4の指摘1〜3に対応する操作デモを追加しました。ダッシュボード、相談結果、精算、類似候補の画面から移動できます。

- 選任後の勝者/敗者辞退・資格失効と、新規契約/支出保留、既存銀行結果の照合を区別します。
- 入金取消と予約の必要額だけの追記相殺を行い、固定バッチ・既払いを変更しません。UNKNOWNは照合まで保全し、同実行版の不変送金intentと最新権利照合を分離します。
- 最新カタログ版のCAS、無関係な複数競合の再署名、関連変更/重複の新審査、待機順位、48時間/12日の失効を処理します。期限時刻に達した場合は失効です。

**実運用ではありません。** 架空のA/B、P/Q/R/Sと固定の承認・証明例を画面内メモリーだけで扱います。再読み込み・移動で消え、既存の参加登録・作成プレビュー・実カタログとは連動しません。実投票・実契約・実送金・暗号検証・共有DBは未接続。本番ゲートG-01〜05は未解除です。残余全額を賄えない部分原資の比例配分、新審査ラウンド自体、銀行の部分完了・再試行24時間等も未実装です。

アプリコードを直接検証するテストは、認証DBやブラウザーなしで実行できます（Node.js 24.22.0およびv26.8.1で成功）。画面ハンドラーの検証は描画/hook代替であり、実ブラウザー検証ではありません。実ブラウザーでの確認は[残タスク一覧](../todolist.md)の§9（TEST-03/04）を参照してください。

```bash
node --test scripts/workflows/*.test.mjs
```

実装・検証結果と限界は [実装記録](../docs/reviews/2026-10-14-app-workflows.md) を参照してください。デモの公開更新と実資金機能の有効化は別です。

## 外部未接続のバックエンド契約kernel（P1着手）

`src/domain/operational` に、厳密JSON/共通envelope・JPY整数・返金の固定キー/不変intent/最新contextの構文契約を追加しました。続行分では実行/相殺DTOのheader結合、nonce/冪等/投票scope、明示的なfixture snapshotのreplay検査を追加しました（巻戻し・並列・復元・自然人の一意性を保証しません）。試験namespaceだけを受け付け、成功DTOも未信頼のままです。`src/server/ports/closed.ts` は全能力UNCONFIGURED、正常fixtureやgate/環境flagを渡しても常時拒否します。実API/DB/署名検証/銀行/通知へは接続していません。

```bash
node --test scripts/backend-contracts/*.test.mjs scripts/workflows/*.test.mjs
```

Node.js 24.22.0およびv26.8.1でP1 214件＋既存デモ137件、計351件成功（fail 0・skip 0）。P1限定lint・全体lint・型検証・build（25 static routes）も両バージョンで成功しています。実装範囲・検証限界・残課題は [P1着手記録](../docs/reviews/2026-10-14-backend-p1.md) を参照してください。G-01〜05未解除、本番未更新です。

## 確認（再現用）

Node.js 24.x で、認証DB・ブラウザー・稼働サーバーなしに一括検証できます。各チェックは個別プロセスで実行され、結果は分離して表示されます（1件でも失敗すれば終了コード1）。既知の失敗を成功として隠さず、途中で打ち切らず全部実行します。

```bash
nvm use 24
npm run verify
# 個別に実行する例
node scripts/verify.mjs tests lint:all
node scripts/verify.mjs --list
node scripts/verify.mjs --skip-build
```

`npm run verify`（`node scripts/verify.mjs`）が実行する内容：

| ID | 内容 |
|---|---|
| `runtime` | 実行中Nodeが `engines` の `24.x` を満たすか（24以外はFAILとして記録し、他バージョンの成功を24の成功として扱わない） |
| `yen` | `node scripts/check-yen.mjs`（円の整数入力・予算/返金例） |
| `tests` | `node --test scripts/backend-contracts/*.test.mjs scripts/workflows/*.test.mjs`（351件） |
| `typecheck` | `tsc --noEmit` |
| `lint:target` | `eslint src/domain/operational src/server/ports scripts/backend-contracts` |
| `lint:all` | `eslint .` |
| `build` | `next build` |

2026-10-19時点の結果：**すべて成功**（Node 24.22.0、tests 351 pass / fail 0 / skip 0、build 25 static routes）。個別コマンドを手で流すこともできます。

```bash
node scripts/check-yen.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
npm run build
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:security
```

`test:security`（`node scripts/check-auth-limit.mjs`）はローカルの3317〜3320ポートで本番ビルドを起動し、2プロセスでの共有制限、Cookie署名鍵の独立性・改ざん・期限切れ、ヘッダー、設定不足・保存状態異常時の拒否を確認します。エミュレーター内のランダムなテストプロジェクトだけを使用します。

起動中のアプリに対して `BASIC_AUTH_TEST_URL`・`BASIC_AUTH_USERNAME`・`BASIC_AUTH_PASSWORD` を環境変数に設定し、`node scripts/check-basic-auth.mjs` で認証と静的ファイルの保護を確認できます（productionビルドで exit 0）。こちらも新規認証の試行枠を消費します。

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
