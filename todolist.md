# 残タスク一覧とテスト可能範囲

更新：2026-10-20 UTC。チェックはその記載範囲だけの完了を示す。P0〜P7は[バックエンド段階計画](docs/superpowers/plans/2026-10-14-backend-implementation-plan.md)の呼称を使う。

## 1. いま一旦テストできるか

**ローカルの単体・fixture契約テストはできる。実運用の一連の結合テストはまだできない。**

| 対象 | 現状 | 条件・限界 |
|---|---|---|
| backend-contracts＋workflowsの自動試験 | 実行可能／2026-10-19にNode24.22.0で再実行・全件成功（`npm run verify`で一括実行可） | Node26.8.1およびNode24.22.0、P1 214件＋デモ137件。DB・ブラウザー不要。両バージョンで成功 |
| `/dashboard/workflows`の操作デモ | ローカル認証環境・操作確認・実ブラウザーE2Eまで完了（TEST-02／03／04、2026-10-16／17） | 専用Firestoreエミュレーター／開発ADC／Basic・sessionを設定。productionビルドで認証・Cookie・静的保護・主要導線・エラー表示・キーボード・小画面をGoogle Chromeで確認（TEST-04、44/44成功）。操作デモ操作もGoogle Chromeで34/34成功（TEST-03）。Node24でも同一結果（TEST-01） |
| 再現可能な検証手順／CI | `npm run verify`（`web/scripts/verify.mjs`）とGitHub Actions（`.github/workflows/ci.yml`）を追加（TEST-06、2026-10-19） | 各チェックを分離表示し失敗を隠さない。Node24以外は`runtime`をFAIL記録。認証DB・ブラウザー・secrets不要。CIはPR #2で初回成功 |
| 本人資格・実投票・契約・集金・返金・通知の一連の動作 | 未実装/未接続のため不可 | 業務API/権威ある正本/署名検証/外部能力・契約が未成立。全live portは常時拒否 |
| 外部事業者sandbox・全銀行権限の接続試験 | 未準備・未許可 | 公開Web調査のみ。照会・契約・口座開設・sandbox登録も未実施 |

351件成功は架空データ/構文/デモの検証。本人・暗号・耐久一意消費・銀行原子性・E2Eの証明ではない。**本番未変更、G-01〜05は全て未解除。**

### すぐ再実行できるコマンド

リポジトリの`web`ディレクトリで、インストール済み依存を使って実行する（`npm test`は未定義）。**一括実行はNode 24で`npm run verify`**（`web/scripts/verify.mjs`）。各チェックを個別プロセスで実行して結果を分離表示し、失敗を成功として隠さない。IDの一覧は`node scripts/verify.mjs --list`、ビルドを除くなら`--skip-build`。

```bash
node --version
node --test scripts/backend-contracts/*.test.mjs scripts/workflows/*.test.mjs
```

対象lint・全体型・buildは2026-10-16に再実行済み（すべて成功）。全体lintはTEST-05修正後に0件、型はexit 0、buildは25 static routes。2026-10-19に**Node 24.22.0でも同一結果**（351件・型・対象lint・全体lint・build 25 routes）を確認した（TEST-01）。

```bash
node node_modules/eslint/bin/eslint.js src/domain/operational src/server/ports scripts/backend-contracts
node node_modules/typescript/bin/tsc --noEmit
NEXT_TELEMETRY_DISABLED=1 npm run build
```

CI（`.github/workflows/ci.yml`、2026-10-19追加・同意済み）は`main`へのpush／Pull Requestで`ubuntu-24.04`（固定。2026-10-19に`ubuntu-latest`から変更。§11）・Node 24・`npm ci`・`npm run verify`を実行する。secretsは使わない。初回実行はPR #2で`verify`が成功（2026-10-19、1分1秒）。その過程で、クリーンチェックアウトでは`next typegen`を先に実行しないと`tsc`が`LayoutProps`未定義（TS2304）で失敗することを検出し、手順に`typegen`を追加した（TEST-06）。

`npm run dev`だけで画面確認の準備が済むわけではない。環境要件は[web/README.md](web/README.md)を参照。2026-10-16にサーバー／エミュレーター起動とBasic認証の検証を実施した（TEST-02）。2026-10-17に実ブラウザー（Google Chrome）をPlaywrightで自動操作し、操作デモの全確認項目（TEST-03、34/34）とproductionビルドのE2E/表示（TEST-04、44/44）を確認した。人手での目視操作は未実施。

## 2. 完了している準備（実運用完成とは別）

- [x] P1のJSON/envelope/JPY/返金intent/context/操作結合/scope/fixture replayと常時拒否portを部分実装。
- [x] 辞退・返金・カタログの画面内メモリーデモとアプリコード試験を実装。
- [x] 今回、Node26.8.1で351/351件成功・失敗0・skip0を再確認。MODULE_TYPELESS_PACKAGE_JSON警告は残存。
- [x] P0の質問票27問・証拠/判定台帳を作成。全問未回答/E0/HOLD。
- [x] 公式情報から照会先2案と未送付の文案を作成。商品適合・正式採用・能力Goではない。
- [x] 2026-10-16にローカル認証環境を構築し、productionビルドでBasic認証・Cookie・静的保護を検証（TEST-02）。
- [x] 2026-10-16に全体lintの6件をルール抑制なしで原因から修正し、`eslint .`を0件にした（TEST-05）。
- [x] 2026-10-17に実ブラウザー（Google Chrome）をPlaywrightで自動操作し、`/dashboard/workflows`の操作デモの全確認項目を再現した（TEST-03、34/34成功・コンソールエラー0・外部リクエスト0）。
- [x] 2026-10-17にproductionビルドへ実ブラウザー（Google Chrome）でE2E/表示確認を行った（TEST-04、44/44成功）。この過程で見つかった320px幅の`/dashboard/workflows`横はみ出しを原因から修正した（`WorkflowConsole`の長い日本語ボタンに折り返しを許可、カタログカードに`min-w-0`・`select`に`w-full`）。
- [x] 2026-10-19に同意の上nvmでNode v24.22.0を導入し、351件・型・対象lint・全体lint・build（25 routes）をNode 24で再確認した（TEST-01）。
- [x] 2026-10-19に再現可能な検証手順`web/scripts/verify.mjs`（`npm run verify`）を追加し、Node 24で全7項目の成功を確認した。CIは同意の上で`.github/workflows/ci.yml`を追加した（TEST-06）。
- [x] 2026-10-19に同意の上PR #2を`main`へマージし（`ce3606b`）、ルート`.gitignore`（`youtube_uploader_mcp.log`・`.DS_Store`）を`main`へ直接pushした（`6c56991`）。CIはいずれも成功。
- [x] 2026-10-19にserver/client境界のnegative試験を追加した（DEV-07、`web/scripts/check-client-boundary.mjs`）。実ビルド成果物への混入なし・実`next build`での拒否・秘密モジュールの明示ガードを確認し、`npm run verify`は9項目になった。

実装/非保証：[P1記録](docs/reviews/2026-10-14-backend-p1.md)、[デモ記録](docs/reviews/2026-10-14-app-workflows.md)。

## 3. 最優先：ローカル試験環境と品質

**画面を一旦試したい場合はTEST-02→TEST-03（完了）。仕様どおりの実行環境（Node 24）はTEST-01で整備・検証済み。実資金・実メールは使わない。**

- [x] **TEST-01：Node24で検証する。**（2026-10-19完了）nvmで同意の上Node v24.22.0（Latest LTS Krypton、npm 11.19.1）を導入し、v24バイナリを明示指定して実行。351件（失敗0・skip0）・`tsc --noEmit` exit 0・対象lint exit 0・全体lint 0件・build 25 static routesすべて成功。Node26の結果を流用せず24で再実行した。記録は§9。
- [x] **TEST-02：ローカル画面用の認証環境を準備する。**（2026-10-16完了）専用Firestoreエミュレーター`demo-action-local`、JavaはAndroid Studio同梱のJBR 21.0.10、既存の開発ADC、ローカル専用Basic/sessionを設定。未認証401・認証済み200・`__Host-demo-auth`（Secure/HttpOnly/SameSite=strict）・静的資産保護・CSP/XFO/nosniffをproductionビルドの`check-basic-auth.mjs`で確認（exit 0）。本番DB/秘密は不使用、認証503の迂回なし。記録は§9。
- [x] **TEST-03：`/dashboard/workflows`の操作デモを確認する。**（2026-10-17完了）実ブラウザー（Google Chrome）をPlaywrightで自動操作し、勝者/敗者辞退、UNKNOWN→照合、取消→必要額相殺、無関係/関連カタログ競合、未分類保留を架空データで実行。34/34項目成功・コンソールエラー0・外部リクエスト0。再読み込みで状態が初期化されるメモリーデモで、実機能に接続されていないことを確認。自動操作であり人手の目視操作ではない点はTEST-04で補う。記録は§9。
- [x] **TEST-04：実ブラウザーのE2E/表示を確認する。**（2026-10-17完了）productionビルドをGoogle Chrome（Playwright自動操作・ヘッドレス）で検査。認証（誤認証401・WWW-Authenticate・Cookie未発行）、Cookie属性（`__Host-demo-auth`：HttpOnly/Secure/SameSite=strict/Path=/・約8時間）、保護された静的資産（JS/CSS/フォント/ファビコンの401/200）、主要導線21ルート・内部リンク14件、404表示、キーボード（Tab到達・`:focus-visible`3px・Enter実行）、小画面（320/375px、10ページ）、コンソールエラー0・失敗リクエスト0・外部送信0を確認。44/44成功。発見した320px横はみ出しは原因から修正。記録は§9。
- [x] **TEST-05：既存UIの全体lint6件を修正する。**（2026-10-16完了）`useSyncExternalStore`（新規`web/src/lib/clientSnapshot.ts`）でeffect内の同期的setStateを除去し、6ファイルを原因から修正。ルール抑制なし。`eslint .`は6 errors→0 problems、型・対象lint・351件・production build（25 routes）は成功。記録は§9。
- [x] **TEST-06：再現可能なテスト手順/CIを整える。**（2026-10-19完了）`web/scripts/verify.mjs`（`npm run verify`）を追加し、Node24で`runtime`／`yen`／`tests`(351)／`typegen`／`typecheck`／対象lint／全体lint／buildの8項目を個別プロセスで実行して結果を分離表示。1件でも失敗すればexit 1で、既知の失敗を成功として隠さず、Node24以外は`runtime`をFAILとして記録する（26での成功を24の成功として扱わない）。`.next`を削除した状態で8/8成功。CIは対象確認の上で`.github/workflows/ci.yml`を追加（mainのpush/PR、Node24、`npm ci`、`npm run verify`、secretsなし）。初回実行はPR #2で成功（`verify`、2026-10-19）。その過程でクリーンチェックアウトでは`next typegen`が無いと`tsc`が`LayoutProps`未定義（TS2304）で失敗することを検出し、`typegen`を`typecheck`の前段に追加した。分岐の解消のため別worktreeで`origin/main`をマージした（PR #2、リモート`main`は未変更）。依存の追加・変更はしていない。記録は§9。

### TEST-05の修正対象（2026-10-16修正済み）

前工程で`react-hooks/set-state-in-effect`だった6件（行番号は当時の位置）。`eslint-disable`等のルール抑制は使わず原因を修正した。

- `web/src/components/groupA/CaseBrowser.tsx:293`
- `web/src/components/groupA/MyJoinStatus.tsx:12`
- `web/src/components/groupB/CreatedPreview.tsx:25`
- `web/src/components/groupB/DashboardJoinCase.tsx:17`
- `web/src/components/groupB/JoinFlow.tsx:227`
- `web/src/components/groupC/ProposalForm.tsx:177`

修正内容：新規`web/src/lib/clientSnapshot.ts`の`createClientSnapshotStore`／`useClientSnapshot`（`useSyncExternalStore`）で、effect内の同期的`setState`を除去。ローカル読み取りはSSR/ハイドレーション中`undefined`、その後クライアント値で1回だけ反映される。`ProposalForm`は復元値の確定後に`key`でフォームを再マウントして初期値として渡す。

## 4. 並行優先：P0の事業者・基盤・ルール成立性

**ローカルデモの試験を妨げないが、実運用接続はここを飛ばせない。**

- [ ] **P0-01：U-01〜05と未承認の初期案を分けて採否を決める。** 人数/期限/配分/保存/再試行/時計・費用・責任主体をrule manifest候補へまとめ、ユーザー承認を記録する。3/5・7日等を自動採用しない。**（2026-10-20：骨格6項目のみユーザー承認。残りは保留＝P1実装時に個別承認。→[rule manifest候補](docs/qualification/2026-10-20-p0-rule-manifest-candidate.md)、[台帳§10](docs/qualification/2026-10-14-p0-decision-register.md)）**
- [ ] **P0-02：照会の宛先・方法・差出人・開示範囲・費用・本文を承認する。** 法人資格/既存口座を仮定しない。外部フォームへの入力自体も送信として扱う。**（2026-10-20：P0-02を先行。初回本文＝担当紹介依頼＋先行4問、費用は無償・公開情報の範囲のみで有料前に再承認。宛先は保留・差出人は未記入のため送付は未承認。差出人・宛先の確認はテスト環境の反映が進んだ時点で行う（2026-10-20保留指示）。§12）**
- [ ] **P0-03：R01の銀行API/BaaS窓口へ事前照会する。** 承認後にB01共同順序/B03固定キー・版横断上限/B04永久不実行fence/B06全経路強制の担当・提供可否・証拠を確認。現時点は未送付/全能力未確認。
- [ ] **P0-04：R02の信託・保管の担当紹介を確認する。** 本件JPY条件付き保管の商品/担当部署は未特定。一般窓口の受諾後に技術4問を再確認して照会し、2社の提携や共同実装を推定しない。
- [ ] **P0-05：全27問の回答と独立評価を揃える。** 銀行/保管/資格/合意/通知/非取得/法務の共同責任・対象版・証拠を記録。公開紹介S-IDやYESだけでE3/能力Goへ昇格させない。署名/hash/最終性・issuer/policy・保管/会計正本・独立配信/リレー費用も選定対象。
- [ ] **P0-06：法的主体・請求経路・残余リスクを専門家と確認する。** 保管/契約/委任、候補同意/利益相反、取消損失/保証/準備金、凍結・倒産・停止時の既権利/独立外部請求を募集前に確定する。

資料：[質問票](docs/qualification/2026-10-14-p0-provider-questionnaire.md)／[判定台帳](docs/qualification/2026-10-14-p0-decision-register.md)／[照会先調査](docs/qualification/2026-10-15-p0-candidate-research.md)／[未送付文案](docs/qualification/2026-10-15-p0-outreach-draft.md)。

## 5. 未完成のバックエンド（P1残項目〜P4）

各項目は今後の作業候補で、今回の一覧作成は実装開始の承認ではない。保存エンジン/暗号/外部基盤/依存の採用や接続を先に決めない。外部未接続の純粋契約試作は範囲を確認して並行可能。

- [ ] **DEV-01／P1：残操作のDTOと能力・証明境界を定義する。** 現在の実行/相殺以外、公開/私的/認証/通知を分離。fixtureと本物の所持/署名/現在rootの境界を維持する。
- [ ] **DEV-02：採用後に真正な検証を実装・監査する。** canonical bytes/hash/署名、承認鍵/失効、外部証明/現在root/最終性/時計を検証。caller oracleやopaque参照を証明にしない。
- [ ] **DEV-03：権威ある受付・認可・一意消費・receiptを実装する。** 通常AUTH/epoch/CSRF/roleと目的限定例外を区別。受理前REJECTEDと受理後FAILED/UNKNOWNを分け、並行更新でも履歴/予約/消費を保全する。fixture snapshotは代用不可。
- [ ] **DEV-04／P2：耐久索引・投影・inbox/outboxと復元を実装する。** 公開合意/外部保管の正本を前提にproof/因果cursor/原intent/receiptを保存。既存auth-security用Firestoreへ業務台帳を混載せず、Web DBを銀行/合意の正本にしない。
- [ ] **DEV-05／P3：実資格・公開案件・選任を実装する。** 外部自然人一意性/所持、共通issuer/policy、固定root/N、初回/決選scope、再発行/失効を検証。端末内AI/評価、カタログ署名・同一panel再照合/異議/選任holdを実装し、Cookie非依存の資格受付候補を通常AUTH必須へ勝手に変更しない。
- [ ] **DEV-06／P4：一般化した私的会計・固定配分・相殺を実装する。** 状態別額/現金恒等式/二重liability除外、不足/実収、本人集約w/cap/Fと上限超過の反復除外・全量原子的予約、部分完了/UNKNOWN/fence/新版移行。通常支出/固定返金/相殺/元決済返品は別条件、仮定立替・既払い再配分は禁止。
- [x] **DEV-07：server/client境界のnegative試験を追加する。**（2026-10-19完了）実際のNext client-buildの成果物でserver-only/秘密の混入を拒否することを確認した（`web/scripts/check-client-boundary.mjs`、`npm run verify`の`boundary`）。既存port試験のmarker代替を実ブラウザーの境界検証と呼ばない方針は維持し、記録は§10。

## 6. 外部接続・受入・UI置換（P5〜P6）

**外部試験は対象・権限・データ・費用の別承認後。机上DESK_READYは能力Go/採用/接続許可ではない。**

- [ ] **INT-01／P5：専用sandboxと事業者協力を準備する。** 合成資格/専用試験資金/最小権限、銀行・保管・資格・合意の共同プロトコルと検証者を定義。本番データ/秘密を流用しない。
- [ ] **INT-02：T1〜T9を実施する。** 外部取消/失効vs不可逆commit、UNKNOWN/部分完了、旧版fence、固定配分、現金、不足、全権限経路を署名trace/契約/独立監査で確認。sandboxが覆わない手動/法令経路は不足として残す。
- [ ] **INT-03：T10〜T15を実施する。** カタログ競合/期限、権威ある並行CAS/二重印、認証・所持・再発行、schema/非取得、偽GateDecision/role混用/rollback拒否を確認。
- [ ] **INT-04：T16〜T18を実施する。** 外部stop/commit/終端、私的照会とログ/export/復旧、基盤停止/倒産/未請求時の権利保全を確認。
- [ ] **UI-01／P6：デモ導線を本番用に置き換える。** timer成功/固定候補/認証省略/証拠ファイル受付を除去し、受付/確定/UNKNOWN/不足/請求導線を正確に表示。実ブラウザー・小画面・非取得検査を行う。
- [ ] **UI-02：実通知を分離実装・検証する。** MAIL-05の購読全世代1件枠、停止と外部commit共同順序、全retry終端/UNKNOWN保全、Basic/Cookie/通常CSRF不要のstopOnly、削除・復元抑止を検証。G-01未達の実メール登録/送信は不可。
- [ ] **UI-03：独立配信・代替リレー・復旧を実証する。** 別管理/鍵/請求・復旧権限/障害域と承認client hashを確認。本文は訂正削除可能、審査前複製/禁止PII hash公開/旧localStorage無断移行なし。

T1〜T18の詳細は[段階計画](docs/superpowers/plans/2026-10-14-backend-implementation-plan.md)。**全18シナリオは未実施。351件の単体試験と重なる題材があっても、全体受入の合格にしない。**

## 7. 本番化（P7）：全て未達

- [ ] **REL-01：対象機能の必要ゲートを正式判定する。** G-01通知、G-02資格/匿名性、G-03円資金、G-04決定/基盤、G-05弁護士/契約の証拠・ユーザー初期値承認・独立領域評価・所定role署名/公開期間を対象版付きで確認。未承認の3/5・7日等をdefaultにしない。
- [ ] **REL-02：配備を別途承認して実行する。** 対象環境/機能/費用/権限/運用/停止・戻し方を確認。code rollbackで確定票・nonce・銀行fence・既払い/個別権利を巻き戻さない。デモのCloud Run更新と実資金/資格/通知の有効化を分ける。

ゲート失効/障害でも既発行stop/delete、真正な既指示照合、予約・未払/個別権利と外部請求を保全する。検証不能を成功・予約なし・未投票と解釈せず、新操作を閉じる。

## 8. 直近のおすすめ順

1. **一旦触るなら：TEST-02→TEST-03**（開発専用の認証環境を準備してメモリーデモを確認。いずれも完了）。
2. TEST-06で再現性（Node24実行手順・CI）を整備し、CIの初回実行も成功した（TEST-01/02/03/04/05/06は2026-10-19までに完了）。PR #2はマージ済み（`ce3606b`）。
3. DEV-07（server/client境界のnegative試験）は2026-10-19に完了（§10）。次はP0-02から事業者への連絡許可を確認し、先行4問→全27問の成立性を評価する（外部照会は送信のため要承認）。**2026-10-20：P0-02を先行とし、初回本文＝担当紹介依頼＋先行4問、費用は無償・公開情報の範囲のみと承認。宛先は保留・差出人未記入のため未送付のまま。初期値は骨格6項目のみ承認（§12）。**
4. TEST-04の所見（`not-found`／`error`／`global-error`／`loading`の未実装、スキップリンク未実装）は2026-10-19に対応した（§9「TEST-04の所見対応」。`loading.tsx`は全ルートが静的のため見送り）。
5. その結果を踏まえDEV/INTの範囲を承認して着手。本番のRELは最後まで停止線として保持する。

この一覧作成で行ったのは文書作成とローカル351件の再実行のみ。依存導入、ADC/秘密/認証設定変更、外部送信、銀行/通知接続、本番配備はしていない。

## 9. TEST-01〜TEST-06の検証記録（2026-10-16〜19）

### TEST-01：Node 24での検証

- 目的：`package.json`の`engines`は`24.x`。Node 26.8.1での成功を24の成功として扱わず、24で再実行して版と結果を記録する。
- 導入（事前承認済み）：nvm（v0.40.3）で`nvm install 24`を実行し、**Node v24.22.0（Latest LTS Krypton、npm 11.19.1）**を`~/.nvm/versions/node/v24.22.0`へ導入。書き込みは`~/.nvm`のみ、sudo不使用、`nvm alias default`（22）と現在のPATH（`~/.local/bin`のv26.8.1）は変更していない。nodejs.orgからのダウンロード（チェックサム一致）。node_modulesは再インストールしていない。
- 実行（v24バイナリを明示指定、`web`で実施）：
  - `node --test scripts/backend-contracts/*.test.mjs scripts/workflows/*.test.mjs` → **351/351成功・fail 0・skip 0**
  - `node node_modules/typescript/bin/tsc --noEmit` → **exit 0**
  - `node node_modules/eslint/bin/eslint.js src/domain/operational src/server/ports scripts/backend-contracts` → **exit 0**
  - `node node_modules/eslint/bin/eslint.js .` → **0 problems**
  - `npm run build`（PATHをv24へ前置） → **成功・25 static routes**
- 追加確認：Node 24で`next start`も起動し、未認証401／認証済み200、`Cache-Control: private, no-store`、CSP/XFO/nosniff、`__Host-demo-auth`（Secure/HttpOnly/SameSite=strict/Path=/・Max-Age=28800）がNode 26と同一であることを確認（`/`・`/dashboard`・`/dashboard/workflows`・`/create`）。
- 未実施：CI（`.github/workflows`）での自動実行は当時未整備で、後にTEST-06で追加し2026-10-19にCI初回成功（PR #2）。`nvm`はユーザー領域の任意導入で、恒久的なPATH/システム変更はしていない。

### TEST-02：ローカル認証環境

- 環境：Firestoreエミュレーター`demo-action-local`（`127.0.0.1:8080`、ローカル専用データ）、Next.js 16.3.6 devサーバー、Node 26.8.1。JavaはAndroid Studio同梱のJBR 21.0.10を使用（システムJava、Homebrew導入、恒久的なPATH変更はしていない）。認証用の開発ADCは既存のものを使用（内容は閲覧・変更せず、本番/サービスアカウント鍵は使わない）。
- 設定：`BASIC_AUTH_USERNAME`／`BASIC_AUTH_PASSWORD`／`AUTH_SESSION_SECRET`はローカル専用値をリポジトリ外の一時ファイル（600）に置き、`.env.local`やソースへは保存していない。`AUTH_FIRESTORE_PROJECT_ID=demo-action-local`、`AUTH_FIRESTORE_DATABASE_ID=(default)`、`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`、`K_SERVICE`は未設定。
- 検証：productionビルド（`next build`→`next start`）に対して`node scripts/check-basic-auth.mjs`を実行し**exit 0**。未認証・誤認証・迂回ヘッダーは401、認証済みは200で`__Host-demo-auth`（`Secure`/`HttpOnly`/`SameSite=strict`/`Path=/`）と`Cache-Control: private, no-store`、静的資産も401／認証で200、CSP`frame-ancestors 'none'`・`X-Frame-Options: DENY`・`nosniff`を確認。`tsc --noEmit`とbuild（25 static routes）も成功。
- 既知の差：devモードではNext.js 16の仕様（`routeModule.isDev`が`Cache-Control: no-cache, must-revalidate`を設定）により認証済みページの`Cache-Control`が上書きされ、上記スクリプトは`no-store`期待で失敗する。productionビルドでは期待どおり`private, no-store`。リポジトリ側の不具合ではないため、`check-basic-auth.mjs`はproductionビルドに対して実行する。
- 未実施：実ブラウザーでの人手によるログイン・操作（TEST-03は自動操作で確認済み、人手の目視操作はTEST-04）。Node 24は当時未導入で、後にTEST-01で導入・再検証した。Firestoreエミュレーターの`--data-dir`は指定不可、Java 21+はAndroid Studio同梱JBRで代替した。

### TEST-03：操作デモの実ブラウザー確認

- 環境：`next dev`（Next.js 16.3.6、Turbopack、`http://localhost:3000`）、Firestoreエミュレーター`demo-action-local`（`127.0.0.1:8080`）、Node 26.8.1。Basic/session値はリポジトリ外の一時ファイル（600）から環境変数で供給（値は非表示・非保存）。ブラウザーはインストール済み Google Chrome を Playwright 1.57（`channel: 'chrome'`、ヘッドレス）で起動した。
- 検証（**34/34項目成功**）：`/dashboard/workflows`で(1)落選候補Bの辞退→選任候補Aの契約・支出は停止せず、(2)選任候補Aの辞退→新規契約・支出が保留（契約ボタン無効）、(3)返金の指示→結果不明(UNKNOWN)→未送金照合（UNKNOWN中は相殺・再送のボタンが無効）、(4)入金60円取消→Aの必要予約10円だけを追記相殺（元バッチと現金は不変）、(5)カタログの無関係競合を2回重ねても提案Sは失効せず最終確定可能、(6)関連変更(changed)→提案Sは新提案・新審査が必要、(7)未分類(unknown)→再照合は保留、を確認。
- メモリー性・非接続：ページ再読み込みで3パネルすべてが初期例に戻り、操作履歴も消える。外部リクエスト0件（`bank`/`payment`/`vote`/`contract`/`signature`系の呼び出しなし）、コンソールエラー0件。
- 非保証：本番の投票・契約・決済・送金・外部署名・共有DBには接続していない。証拠・3人承認・確定結果・時刻は固定のデモ仮定。自動操作であり、人手の目視操作・キーボード操作・小画面表示・Cookie実挙動の確認ではない（TEST-04で補う）。
- 副次：`next dev`は初回ルートコンパイルに時間がかかるため、検証前に認証付き`curl`でウォームアップした。ハイドレーション完了前のクリックは握り潰されるため、検証スクリプトは冪等なリセット操作でハイドレーションを検知してから操作した。

### TEST-04：productionビルドの実ブラウザーE2E/表示

- 環境：`next build`→`next start`（Next.js 16.3.6、`http://localhost:3000`、25 static routes）、Firestoreエミュレーター`demo-action-local`、Node 26.8.1。ブラウザーはインストール済み Google Chrome を Playwright 1.57（ヘッドレス）で起動。Node 24では当時未検証で、後にTEST-01で`next start`の認証・ヘッダ・Cookieが同一であることを確認した。
- 認証・Cookie：誤認証は401＋`WWW-Authenticate`（Cookie未発行）、正認証は200で`__Host-demo-auth`がブラウザーに保存され、属性は`HttpOnly`・`Secure`・`SameSite=strict`・`Path=/`・有効期限約8時間・Domainなし。応答は`Cache-Control: private, no-store`、CSP`frame-ancestors 'none'`、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`。
- 保護された静的資産：未認証では`/favicon.ico`・`/_next/static/missing.js`・実在のJS/CSS/フォントが401、セッション付きでJS/CSS/フォント/ファビコンが200（proxyに除外matcherなし）。
- 主要導線：21ルートが200＋見出し描画。ホーム／作成／ダッシュボードの内部リンク14件はすべて400未満。
- エラー表示：未定義URLと未定義のネストURLは404（認証なしは401が優先）。本文にスタックトレースなし。カスタム`not-found`／`error`／`loading`は未実装でNext.js既定の404を表示（**2026-10-19に対応。下記「TEST-04の所見対応」**）。
- キーボード：Tabで操作可能要素に到達し`:focus-visible`のアウトライン（3px solid）を表示。リセットボタンにフォーカスしてEnterで操作が実行された。`button:not([disabled])`・`a[href]`はすべて`tabIndex>=0`。スキップリンク（本文へ移動）は未実装（**2026-10-19に対応。下記「TEST-04の所見対応」**）。
- 小画面：320px・375pxで10ページに横スクロールなし。モバイルの下部ナビ表示を確認。**320pxで`/dashboard/workflows`が42px横にはみ出す不具合を発見**し、原因（長い日本語ボタンラベル＋`whitespace-nowrap`、カタログカードの`min-width:auto`）を修正して再検証した。
- その他：コンソールエラー0・失敗リクエスト0・外部リクエスト0。RSC prefetchの遷移中断（ERR_ABORTED）と意図的な404のコンソール出力は失敗として計上していない。
- 修正内容：`web/src/components/workflows/WorkflowConsole.tsx`の長い日本語ボタン3種に`whitespace-normal!`（Tailwind v4のimportant接尾辞）、カタログの`<article>`に`min-w-0`、`<select>`に`w-full min-w-0`を付与。修正後に型（`tsc --noEmit`）・全体lint（`eslint .`）・351件・`build`（25 routes）・TEST-03（34/34）・TEST-04（44/44）を再実行しすべて成功。
- 未実施：人手での目視・操作の体感確認。Node 24での再実行（TEST-01で認証・ヘッダ・Cookieを確認済み）。

#### TEST-04の所見対応（2026-10-19）

- 対象：上記で「未実装」と記録した`not-found`／`error`／`global-error`／`loading`とスキップリンク。
- 実装（`web/src/app/`）：
  - `not-found.tsx`（404。未定義URLと`notFound()`の両方で表示）、`error.tsx`（ルート配下のエラー境界。`retry()`で再試行）、`global-error.tsx`（ルートレイアウト自体の失敗。`html`／`body`・`globals.css`・フォントを自前で読み込む）。
  - 3つは共通シェル（`PublicShell`／`AppShell`）の外側で描画されるため、`web/src/components/ui/StatusPage.tsx`に自分の`<main id="main">`を持つ中央寄せ枠を追加した。
  - フォントは`web/src/app/font.ts`に1つだけ定義し、ルートレイアウト（`layout.tsx`）と`global-error.tsx`で共有する。
  - スキップリンク（`layout.tsx`冒頭、`href="#main"`）を追加し、共通シェル（`AppShell`／`PublicShell`／`JoinShell`）の`<main>`に`id="main"`と`tabIndex={-1}`を付けて移動先にした。
- `loading.tsx`は実測のうえ**見送り**（ルート直下には置かない）：
  - 対照A（ルート直下に`loading.tsx`あり）: `/dashboard`の初回表示で読み込みUIを**通常回線1297ms→本文1849ms／低速60KB/s 713ms→本文6589ms**（`#main`=1）。
  - 対照B（`loading.tsx`を退避）: **読み込みUIを検出せず**（`#main`=1）。
  - `next build`のルート表は`/`・`/dashboard`を含め**全ルートが○（Static、prerender）**で、`loading.tsx`のフォールバックは初期HTMLに入る。静的ページの初回表示に読み込みUIが挟まる回帰になるため置かない判断とし、理由を`layout.tsx`にコメントで残した。動的なセグメントが生まれた時点で、その配下に追加する。
  - 対照で退避した`loading.tsx`は`/tmp/loading.tsx.off`（sha256 `2ee7515b…`）に残し、最終ツリーには含めていない。
- 検証（Node v24.22.0、`web`で`npm run verify`）→ **9/9成功**：`runtime`（v24.22.0）、`yen`（exit 0）、`tests`（**pass 351／fail 0／skip 0**）、`typegen`、`typecheck`、`lint:target`、`lint:all`、`build`、`boundary`（すべてexit 0）。
- 実ブラウザー確認（productionビルド＋`next start`、Playwright 1.57＋Chrome、認証はリポジトリ外の一時ファイル）：
  - `/`・`/dashboard`・未定義URLの3経路で**`#main`は各1件**（二重なし）。
  - スキップリンクは非フォーカス時`top=-80px`（画面外）→**Tabで`top=16px`・可視・`:focus-visible`の3pxアウトライン**。Enterで`location.hash="#main"`かつ`document.activeElement.id="main"`（本文へ移動が機能）。
  - 未定義URLは**404でカスタム`not-found`**（「ページが見つかりません」）を表示。コンソールエラーは`/`・`/dashboard`が0件、404のみ意図的な出力1件（失敗として計上しない）。
- 一時ファイル：検証用の一時ルート（`src/app/zz-probe-slow`／`zz-probe-throw`）は削除済みで、作業ツリーには残していない。
- 未実施：人手での目視・操作の体感確認。`error.tsx`の表示は例外を投げる一時ルートで確認した範囲（React error #441は当該ルートのみで発生、通常ページは0件）で、恒久的な導線からは発火させていない。`global-error.tsx`はコード上の確認のみ（実発火は未確認）。

### TEST-05：全体lint

- `eslint .`は**6 errors→0 problems**（warning含む）。`tsc --noEmit`・対象lint（`src/domain/operational src/server/ports scripts/backend-contracts`）はexit 0。`node --test scripts/backend-contracts/*.test.mjs scripts/workflows/*.test.mjs`は351/351成功（fail 0・skip 0）。production buildは25 static routesで成功（修正前と同一）。
- SSRスモーク（`/`・`/create/published`・`/dashboard`・`/recruitments/timescar-corporate/join`・`/lawyer/proposals/new`・`/dashboard/workflows`）は未認証401・認証済み200で、既定値・「確認中」表示が修正前と一致。
- 挙動の非変更：SSRは従来どおり既定値/「確認中」を描画し、ハイドレーション後に保存値を反映する。`ProposalForm`は復元値の確定後`key`で再マウントするため、起動直後にユーザー入力が入った場合のみその入力を破棄しうる（実運用での影響は未評価）。

### TEST-06：再現可能な手順とCI

- 目的：Node24・351件・対象lint・全体lint・型・buildの実行結果を**分離**し、既知の失敗を成功として隠さない。CIの追加は対象確認後に行う。
- 追加（依存追加なし・Node標準のみ）：`web/scripts/verify.mjs`と`npm run verify`。各チェックを個別プロセスで実行し、生ログと要約（ID・PASS/FAIL・所要ms・詳細）を表示する。1件でも失敗または終了コード非0なら**exit 1**（途中で打ち切らず全部実行する）。`runtime`は実行中Nodeが`engines`の`24.x`かを判定し、**24以外はFAILとして記録**する（Node 26での成功を24の成功として扱わない）。オプションは`--list`／`--quiet`／`--skip-build`。
- 実行（Node 24.22.0、`web`で`npm run verify`）→ **7/7成功**：`runtime`（v24.22.0）、`yen`（exit 0）、`tests`（**pass 351／fail 0／skip 0**）、`typecheck`（exit 0）、`lint:target`（exit 0）、`lint:all`（exit 0）、`build`（exit 0）。認証DB・Firestoreエミュレーター・ブラウザー・稼働サーバー・secretsは不要（`build`は認証envなしで成功）。
- 挙動確認（隠蔽しないことの確認）：Node 26.8.1で`runtime`のみ実行すると**FAIL（exit 1）**、不明なIDはexit 2、`--list`は7項目を表示。失敗を成功に丸める処理はない。
- 文書：`web/README.md`の古い記述2箇所（「24での実行は未確認」「24.x未確認・全体lintは6件で失敗」）を現状へ更新し、`## 確認（再現用）`に`npm run verify`のID・内容表と2026-10-19時点の結果を追記した。
- CI（**同意の上で追加**）：`.github/workflows/ci.yml`。`main`へのpush／Pull Requestで`ubuntu-latest`・Node 24・`working-directory: web`・`npm ci`・`npm run verify`を実行。`permissions: contents: read`、同一refの並行実行はcancel。secretsは使わず認証DB/ブラウザーも不要。`web/.gcloudignore`はホワイトリスト方式のため`.github/`はデプロイ対象に含まれない。**（2026-10-19にrunnerを`ubuntu-24.04`へ固定し、actionsをNode 24ランタイムのv7へ更新。§11）**
- CI初回実行（2026-10-19、PR #2 / run 39158759273）：`npm ci`は成功したが**`typecheck`のみ失敗**（exit 2）。ローカルは既存`.next`のため通っていた。原因はクリーンチェックアウトでNext.jsのルート型（`LayoutProps`）が未生成のためで、`src/app/layout.tsx(17,50): error TS2304: Cannot find name 'LayoutProps'`。`build`は型チェックを含むため成功していた。
- 原因修正：`verify.mjs`の`typecheck`の前段に`typegen`（`next typegen`）を追加。`.next`と`tsconfig.tsbuildinfo`を削除した状態で`npm run verify`が**8/8成功**（typegen 710ms、typecheck exit 0）。修正後のCI（run 39159242967）は**`verify`成功（1分1秒、Node v24.21.0）**。
- 分岐の解消：ローカル`main`(030e6f7)とリモート`main`(a09a786)は`50ce74d`で分岐していたため、本体の作業ディレクトリと未コミットの`youtube_uploader_mcp.log`に触れず、**別worktree**で`origin/main`をマージした（`cfb339d`）。競合は3件（`web/package.json`・`scripts/deploy-cloud-run.sh`・`web/README.md`）で両側の追加を統合（package.jsonは`verify`と`test:security`を併存、deployは`--update-env-vars`＋DB存在チェック＋traffic更新、READMEは検証済みの8080/demo-action-local手順＋`test:security`説明）。認証系（`auth.server.ts`・`proxy.ts`・`next.config.ts`・`package-lock.json`）は両側で同一内容だった。PR #2（ブランチ`chore/test-06-verify`）を作成し、**リモート`main`は変更していない**。
- PR #2のマージ（2026-10-19完了・ユーザー承認）：`chore/test-06-verify`は**`main`へマージされた**（`ce3606b`、GitHub PR #2＝MERGED）。CIはPRの`verify`（run 39159512946、45秒）とマージ後の`main`push（run 39159753563、47秒）がいずれも成功。その後、ルート`.gitignore`（`youtube_uploader_mcp.log`・`.DS_Store`）を追加して`main`へ**直接push**した（`6c56991`、run 39160764815、40秒）。ローカル`main`＝`origin/main`＝`6c56991`。
- `npm ci`は`allowScripts`未登録の警告（`protobufjs`／`unrs-resolver`のpostinstall）を出すが、CIでは実行され成功した。**依存の追加・更新・削除はしていない**（マージで取り込んだ`web/scripts/check-auth-limit.mjs`等は既存ファイル）。
- 変更した文書：`web/README.md`（Node24の記述・確認手順・`typegen`）、`web/package.json`（`verify`スクリプト1件）、本一覧。

2026-10-16〜19の作業で行ったのは、ローカル専用の認証環境の構築・検証、全体lint 6件の修正、productionビルドでの実ブラウザーE2E/表示確認と、その過程で見つかった小画面（320px）の横はみ出し修正、同意の上でのNode 24.22.0導入と再検証、再現可能な検証手順`web/scripts/verify.mjs`の追加、同意の上でのCI（`.github/workflows/ci.yml`）追加と原因修正（`typegen`）、同意の上でのPR #2作成（ブランチ`chore/test-06-verify`へのpush）とCI初回成功、上記の再実行のみ。アプリへの依存追加・更新、ADC変更、銀行/通知接続、本番配備はしていない。外部送信はNodeのダウンロード、npmレジストリへの`npm ci`、および同意の上でのGitHubへのブランチpush／PR作成（`moletiger1/action-anxol`、public）に限られる。GitHubへの変更は、同意の上でのブランチpushとPR #2作成、その**PR #2のマージ**（リモート`main`＝`ce3606b`）、およびルート`.gitignore`追加の`main`への直接push（`6c56991`）のみ。Node 24の導入はユーザー領域（`~/.nvm`）のみで、システムや恒久的なPATHは変更していない。加えて2026-10-19に、TEST-04の所見である特殊ファイル（`not-found`／`error`／`global-error`）とスキップリンクを実装し、`loading.tsx`は全ルートが静的（prerender）のため見送る判断をした（同TEST-04の追記。外部送信・依存追加・ADC変更・本番配備は行っていない）。

## 10. DEV-07の検証記録（2026-10-19）

- 目的：**実際のNext client-buildの成果物**でserver-only／秘密の混入を拒否することを確認する。既存の`scripts/backend-contracts/closed-ports.test.mjs`はソースのAST markerを見る代替であり、実ブラウザーの境界検証ではないため、実ビルド成果物を対象にする。
- 追加（依存パッケージの追加なし・Node標準のみ）：`web/scripts/check-client-boundary.mjs`。`npm run verify`の`boundary`として`build`の後に実行する（`--skip-build`時は`boundary`も除外）。
  1. **実ビルド出力の走査**：ブラウザーへ配信される資産（`.next/static/**`の156ファイルと`.next/server/app/**/*.{html,rsc}`の120ファイル、計8.5MB）に、秘密／サーバー専用の11 marker（`__Host-demo-auth`、レート制限の文言、`AUTH_FIRESTORE_PROJECT_ID`、`createHmac`、`@google-cloud/firestore`、`AUTH_SESSION_SECRET`、`BASIC_AUTH_PASSWORD`／`BASIC_AUTH_USERNAME`、`PRODUCTION_PORT_UNAVAILABLE`、`UNCONFIGURED_CAPABILITIES`、Nextのserver-only guard文言）が**無い**ことを確認する。各markerは「ソース側に実在する（対照）」と「配信物に無い」の**両方**を確認するので、marker名を変えるだけで空振り合格しない。さらに配信物にroot layoutのtitle（サーバー描画）が実在することを確認し、走査対象そのものの空振りを検出する。`.next/cache`・`.next/turbopack`・`.next/dev`は配信物ではないため対象外。
  2. **実`next build`による拒否**：client componentが`import 'server-only'`するモジュールを取り込む最小fixture（`web/.boundary-fixture`。gitignore対象で、スクリプトが生成と削除を行う）を、このリポジトリのNextで実際にbuildし、**失敗**することとguard文言（`cannot be imported from a Client Component`）が出ることを確認する。buildが成功したらFAIL。
  3. **明示ガード**：秘密を扱う`src/lib/auth.server.ts`と`src/server/ports/closed.ts`が`import 'server-only'`を宣言していることを確認する。
- **原因修正（本試験で検出）**：`src/lib/auth.server.ts`は`server-only`を宣言していなかった。
  - 修正前（実測・client componentからの誤ったimport）：`Turbopack build failed with 46 errors`（`Can't resolve 'child_process'`、google-auth-library／Firestore SDK経由）。**境界の拒否としては現れない**（SDKを差し替えると境界が黙って開きうる）。
  - 修正：Next.jsのドキュメント（`web/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`、同`02-guides/authentication.md`）が秘密／セッション管理モジュールに`import 'server-only'`を推奨しているため、`src/lib/auth.server.ts`の先頭に1行追加した（`server-only`はNextが内部で解決するため、npmパッケージの導入は不要）。
  - 修正後（同じprobe）：`./src/lib/auth.server.ts:1:1 Error: 'server-only' cannot be imported from a Client Component module`とimport trace（当該client component）が出て**exit 1**。probeは削除済みで、作業ツリーには残していない。
- 試験の妥当性確認（歯の確認）：①server componentから同じモジュールをimportする対照fixtureは**build成功**（exit 0）し、そのmarkerは配信物の`.html`／`.rsc`に**実際に現れた**（＝混入があれば走査で検出できる）。②`auth.server.ts`の`server-only`行を一時的に外すと`boundary`は**NG・exit 1**となり、戻すとsha256一致で復元された。
- 実行（Node 24.22.0、`web`で`npm run verify`）→ **9/9成功**：`runtime`（v24.22.0）、`yen`（exit 0）、`tests`（**pass 351／fail 0／skip 0**）、`typegen`（exit 0）、`typecheck`（exit 0）、`lint:target`（exit 0）、`lint:all`（exit 0）、`build`（25 static routes）、`boundary`（exit 0）。認証DB・Firestoreエミュレーター・ブラウザー・稼働サーバー・secretsは不要。
- 変更した文書・ファイル：`web/README.md`（`## 確認（再現用）`の表と結果、DEV-07の説明）、`web/.gitignore`（一時fixture `/.boundary-fixture/`）、`web/scripts/verify.mjs`（`boundary`の追加）、`web/src/lib/auth.server.ts`（`import "server-only"`の1行）、本一覧。
- 限界：本試験の範囲は**ローカルビルド成果物と`next build`**である。実ブラウザーでの動作確認はTEST-03/04の範囲で、実運用の受入（T1〜T18）や本番配備の合格ではない。`src/proxy.ts`（middleware）とサーバー描画のHTML/RSCは配信物であってもサーバー側コードであるため、混入の有無は上記1のmarker走査で判定している。

## 11. CI衛生の更新（2026-10-19）

- 目的：CI実行に出ていた警告2件を、ルール抑制ではなく設定の原因側で解消する。
  - ① `ubuntu-latest` のUbuntu 26への移行が**2026-10-19に開始**されるとの通知（移行後のイメージ変化を検証せずに受け入れない）。
  - ② `actions/checkout@v4`・`actions/setup-node@v4` が**Node 20非推奨**（Node 24へ強制実行）という警告。
- 変更（`.github/workflows/ci.yml`のみ。アプリコード・依存パッケージの変更なし）：
  - `runs-on: ubuntu-latest` → **`ubuntu-24.04`**（固定）。
  - `actions/checkout@v4` → **`actions/checkout@v7`**、`actions/setup-node@v4` → **`actions/setup-node@v7`**。いずれも`action.yml`の`runs.using`が`node24`であること、`setup-node@v7`にも`node-version`・`cache`・`cache-dependency-path`の入力があることを確認したうえで更新した。
  - 判断理由（なぜ固定し、なぜv7か）をワークフローのコメントに残した。
- 検証：変更はワークフローのみのため、アプリの`npm run verify`（9項目）には影響しない。YAMLはパース確認済み（`runs-on`・`uses`を読み出して確認）。実際の実行はPull RequestのCIで確認した。
- 実行結果（PR #4のCI・run 39207014045）：**success（1分2秒、Node v24.21.0、9/9 PASS）**。runnerは`Image: ubuntu-24.04`／`Ubuntu 24.04.5 LTS`（image version 20261012.334.1）。ログ内の「Node.js 20 is deprecated」と「`ubuntu-latest` label will migrate」は**ともに0件**になり、警告2件は解消した。境界検査（`boundary`）も7.1秒で成功している。
- 限界：runnerイメージの固定はUbuntu 26への移行を「今は受け入れない」という判断である。Ubuntu 26での検証・移行は未実施で、必要になった時点で別途行う。actionsのメジャー更新も、このCI（Node 24・`npm ci`・`npm run verify`）が成功する範囲での確認である。

## 12. P0の承認記録（2026-10-20）

- 記録：承認内容は[判定台帳§10](docs/qualification/2026-10-14-p0-decision-register.md)、初期値の採否一覧は[rule manifest候補](docs/qualification/2026-10-20-p0-rule-manifest-candidate.md)。
- 承認：P0-02を先行／初回本文は担当紹介依頼＋先行4問（B01/B03/B04/B06。27問全文は送らない）／費用は無償・公開情報の範囲のみで、有料手続き・契約・口座開設・NDA・支払の前に再承認／初期値は**骨格6項目のみ**（期限一式・投票日程・定足数・審査・配分・時計）。
- 保留：宛先（R01/R02いずれも未決定＝送付しない）／差出人（氏名・所属・返信先が未記入）／保存期間・再試行回数・統治パラメータ・審査周辺の細目・技術方式・費用額・責任主体・法的主体（P0-06）／配分の端数同順位（仕様内で表現が2通り→統一が必要）。
- 不変：全27問未回答/E0、HOLD、G-01〜05未解除。外部送付・フォーム入力・電話・接続・契約・支払は未実施。**保留値は本番defaultにしない**。
- 次の行動：宛先の決定と差出人の記入 → 窓口URL・受付可否・個人情報の取扱いの再確認（候補調査は2026-10-15作成で以後の再確認なし） → 送付前承認の最終確認（フォーム入力も送信として扱う）。
- **保留（2026-10-20のユーザー指示）**：差出人（名義の種類・氏名・所属・返信先）と宛先の決定は、**テスト環境での反映が進んだタイミングで確認**する。それまでは送付しない（送信・フォーム入力は未承認のまま）。氏名・連絡先はリポジトリへ記録せず、承認後にリポジトリ外で保管する。
