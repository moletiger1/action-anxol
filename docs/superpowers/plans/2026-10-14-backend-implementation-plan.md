# 実運用バックエンドの段階的実装・検証計画

版：0.1、承認待ち。対応：[バックエンド設計案](../specs/2026-10-14-backend-design.md)、[参照仕様v0.4](../specs/2026-10-09-action-requirements-design.md)。本書は全体計画。後続の「次の部分着手」と「続けてください」でP1の入力/返金契約・操作結合・scope/fixture replay・閉鎖portの部分だけを実装した（[P1着手記録](../../reviews/2026-10-14-backend-p1.md)）。残工程/外部接続およびT1〜T18の受入シナリオは未実施。続行分を含むP1の214件とデモ137件は、銀行能力等の実証の代わりではない。

## 1. 進め方と停止線

- ユーザーは設計先行の後、P1の外部未接続スライス着手を指示した。本番への配備、実登録/集金/投票/候補受付/通知は行わない。G-01〜05は未解除。
- U-01〜05を保持。人数/期限/保存/再試行/配分/時計規約、技術/事業者は承認待ちと明示する。
- 正本は公開の検証可能な合意基盤と、既存外部決済/保管の強制エンジン。Web DB/ORM/queueの導入を、分散最終性や銀行との原子性の達成と扱わない。
- 第0段階の事業者成立確認は実資金接続より先。架空データのkernel/契約試作は並行可能だが、証明不足のlive portは閉鎖する。
- 新工程の依存導入、保存エンジン採用、実装開始、外部sandbox接続、GCP作成/変更は、その対象と影響を別途確認する。設計案の存在は承認ではない。

## 2. 実装する構造の候補

以下は全体の配置案。`domain/operational`の入力/返金/操作結合/scopeと明示fixture snapshot契約、`server/ports/closed.ts`と`backend-contracts`の一部だけを作成済み。他のadapter/operations/API等は未実装である。

```text
web/src/domain/operational/        closed schemas / deterministic invariants / algorithms
web/src/server/verification/       authoritative roots / signatures / role & holder proof
web/src/server/policy/             operation-specific gates / current authorization
web/src/server/ports/              external authority & custody contracts
web/src/server/projections/        proof-backed read models / inbox / transport outbox
web/src/server/operations/         admission / authoritative receipts / reconciliation
web/src/app/api/v1/                minimal typed HTTP adapters
web/scripts/backend-contracts/    real-code tests / adversarial schedules / fixture namespace
```

純粋計算/検証契約と、秘密/外部権限を持つserver-only adapterを分離。検証済みフラグ/署名済みclient申告を混同しない。server-only境界の実装方法は採用Nextバージョンのguide確認後に決める。現`lib/workflow`はデモとして維持し、A/B固定・fake proof・仮定補填を実運用kernelへコピーしない。

ストレージの抽象契約は、scope付き一意制約、CAS、immutable receipt/intent、再構築、障害時保全を明記。in-memory/local試験storeは本番正本として使わない。既存認証FirestoreのDB/権限へ台帳を追加しない。

## 3. 段階と完了条件

### P0：採否の成立確認（コードより先に必要な判断）

- v0.4のU既決定と初期案を分け、採否一覧とrule manifest草案を作る。
- 設計第10節の論点を具体化した[P0質問票27問](../../qualification/2026-10-14-p0-provider-questionnaire.md)と[回答・証拠/Go・No-Go台帳](../../qualification/2026-10-14-p0-decision-register.md)で、銀行・保管・資格・通知・合意基盤の能力、責任、非取得権限を確認する。文書作成のみ実施、全27問未回答/HOLD。資料確認・能力Go・正式採用・G解除を分け、P0完了とはしない。
- 不可逆commitと外部失効の共同順序、版fence、全銀行経路、部分額終端、権利/現金証拠を確認できない選択肢は不採用。
- 合意基盤、署名方式/RFC 8785相当の固定正規化実装・文字列規則、時計/最終性、issuer/policy、私的会計の権威ある保管、リレー費用は未選定のまま実受付しない。
- 完了証拠：ユーザー採否、事業者契約/技術回答、専門家所見、残余リスク。単なるサービス名やAPI仕様へのリンクでは解除不可。

### P1：外部未接続の契約・検証kernel

- 入力schema/version/environment/scope、JPY安全整数、中間BigInt、識別子、原署名bytes/hashの契約を定義。
- 公開決定/私的会計/認証/通知のDTOを分け、本人原資料/口座/カード/メールと票の結合を拒否する。
- 外部portの能力manifestと、未知/未採用/閉鎖時の拒否を先に実装。`verified:true`、fake signer、demo proof、local gate flagでlive操作不可。
- 原intent、現在context、銀行固定キー、実行版操作キー、相殺キー、nonce/nullifier/idempotencyの一意scopeを実装する。
- 実コードのRED→GREEN：厳密schema・異payload再送・失効・境界・overflow・fixture→live混入拒否等。
- 完了：pure/port契約テスト、型/lint、server/client依存境界、全live拒否、外部呼出し0。これを本番機能完成とはしない。

### P2：耐久索引・inbox/outbox・証明付き投影

- 選定後の独立業務storeに、因果cursor、pending gaps、正本proof/ref、一意receipt、原intent、未終端予約を永続化。
- at-least-once運搬は同じ外部operation key/原payloadで、正本receipt照会を行う。API/outbox成功を資金/カタログ確定にしない。
- crash/重複/逆順/欠番/復元を試験。キャッシュ消失でも外部正本を再実行せず、未知を予約0/未投票にしない。
- 完了：並行CAS、耐久再構築、最終性/根不明の保留、私的照会の認可、ログ/コピーの非取得・保持境界。

### P3：認証・資格・公開決定/カタログ

- 通常保護操作のAUTH鍵/epoch/re-auth/CSRFと、目的限定capability/事業者署名の明示例外を分けて実装。VOTE-03のCookie/通知に依存しない資格所持による受付候補はG-02で評価し、Cookie必須へ勝手に変更しない。
- 募集共通issuer/issuerPolicyVersionと唯一の最終化済みrootVersion/rootHash、N、候補条件、rule/全期限を開始前に固定。INITIAL/RUNOFFで同じroot/Nを受理し、途中issuer/root/新秘密差替えを拒否。scope=H(domainTag,environmentId,consensusId,recruitmentId,electionId,roundId,ruleVersion)からrootVersion/候補/authId/額を除き、所持証明とnullifierを一意更新に結合する。role/利害排除は種別ごと。
- 通知/認証/資格を分離し、メール/Basicを票・返金所持の根拠にしない。再発行/紛失は履歴横断検証まで閉鎖。
- submitProposalの公開入力/AI評価・候補集合/版、審査単一結論/矛盾署名、異議/新round、同合意基盤のCAS/queue/期限を実装。無関係再照合は元の同じ5人全体の比較/その3人の専用署名で、別3人へ代替しない。
- 提案/カタログ本文は訂正・削除可能な配信に置き、審査前ミラー複製/本文のチェーン永久保存を禁止。catalog版・environment/schema/rule・本文/索引hash・FinalDecision/最終性・鍵版を結合したbundleを端末/ミラーで検証する。
- FINAL後の勝者/敗者イベントと参加者失効/有効性異議を分け、FINAL/票/既払いを戻さない。
- 完了：T1/T10〜T14等の実コード検証。G-02/G-04/G-05の外部証拠未達なら本番投票/候補受付なし。

### P4：外部未接続の私的会計・固定配分・相殺

- 全状態別額・現金恒等式・重複liability排除・不足/補填債権/実収を実装する。
- PAY-07のcappedLargestRemainderを一般化し、複数入金の外部本人集約、固定w/cap/F/順位、全量一括予約を検証する。cap超過者全員のcap割当/同時除外→残f/W再計算を超過者0まで反復してからfloor/端数へ進む。T6の多段飽和で一回除外の誤実装を検出する。
- 支出・固定返金・相殺・元決済返品を別operation/schema/権限とし、通常支出の条件を返金へ足さない。
- 部分完了の累計/差分、UNKNOWN拘束、終端fence、同版intentと最新contextの分離、新版移行条件を実装する。
- 仮定`externalAdvance`/勝手な借越を禁止。期限経過や清掃で権利/予約を再配分しない。
- 完了：T2〜T9の実コード/架空データ検証。外部原子性/真実性は未検証のままG-03閉鎖。

### P5：採用事業者の専用sandbox/銀行経路接続

- 許可済みの専用試験環境・架空利用者・試験資金と、外部からPIIを取得できない権限を準備する。本番情報/秘密は流用しない。
- 外部commitバリア、取消/失効の先行、分断、旧版遅延配送、全経路迂回を事業者協力で試験する。
- 銀行/保管/資格/公開根の署名traceを独立Verifierで検証。provider受付をirreversible commitと誤認しない。
- 完了：契約上の責任＋共同原子性/最終性/全経路の実接続証拠＋非取得/ログ検査＋復元/外部請求検証。
- sandboxだけで手動口座/サポート/法令権限を覆えない場合は、その不足を記載し別の監査/確認が必要。本番送金で不足検証を補わない。

### P6：通知・UI置換・独立配信/復旧

- G-01条件を満たす通知専用実装、確認/停止/削除/復元、目的限定tokenの限定例外を検証。G-01未達なら実email登録/送信なし。
- MAIL-05の購読単位未終端最大1件/停止と外部commit直列化/全再試行終端を確認。一般メールqueueだけでは完了にしない。
- UIからtimer成功/固定候補/認証省略/資料file受付を除去し、受付/最終確定/UNKNOWN/部分完了/不足/外部請求を表示。
- ノード/ミラー/管理鍵/請求・復旧権限/障害域を独立化し、承認client hash/別リレー/保持・復元を実証する。
- 完了：実ブラウザー/キーボード/小画面、署名検証、私的情報/ログ/URL流出なし、旧localStorage無断移行なし。

### P7：ゲート判定後のリリース

- 対象rule/client/backend/provider/policy/environment版と証拠hashをGateDecisionに結び付け、ユーザー初期値承認・独立領域評価証拠・評議会3/5・解除前7日公開に従う（数値未承認）。案件元/別審査、検収/別裁定、返金/相殺の既存裁定、予算参加者投票と評議会を固定snapshot/operationのrole scopeで分け、別集合の署名を混用しない。ルール新版は新募集だけで、既存資金/票を改変しない。
- 実受付前に資金保管/契約主体、法律上の委任/解除/取消・保証/準備金/倒産請求を確認する。
- 変更範囲、認証/秘密/権限、費用、観測、デプロイ対象、rollback手順をユーザーに確認する。
- コードrollbackが確定票/権利/銀行fence/既払いを巻き戻さないこと。失効時は新操作停止、既権利の照合/請求は保全。
- 完了：証拠とユーザー承認が揃った機能だけ有効化。承認済みだから別機能のGも解除することはしない。

## 4. 必須受入・障害テスト（すべて今後の計画）

以下の結果欄はすべて**未実施**。条件にある数値はv0.4/前工程の検証例であり、本番の承認済み初期値ではない。

| ID | 入力・障害/競合 | 検証する結果/証拠 |
|---|---|---|
| T1 | bank不可逆commit直前バリアで、A勝者失効、Bのみ敗者辞退、参加者失効、受理異議を両順序投入 | A等先行は既予約も拒否、Bのみは不要停止なし、commit先は既払い/FINAL不変。外部条件版/順序trace |
| T2 | 取消vs返金、外部版先行/Webhook遅延/分断/別リレイヤー | 取消先は旧権利/旧版拒否、順序不明保留、commit先は照合まで拘束。内部到着順で代替しない |
| T3 | 受付後応答消失、UNKNOWN、逆順/重複/欠番証明、worker停止/復元 | 予約解放/二重cash消費0、新keyでの再払い0、旧rootからの復活0 |
| T4 | 50円旧版FAILED（fence前に原payload retry）→永久不実行fence→80円取消→30円相殺→新20円（新版原payload retry） | 同版同payload retry、fence後の旧50円の再実行拒否、異payload拒否、同銀行key累計<=新権利、UNKNOWN/fence欠落なら版切替不可 |
| T5 | 50円中30円確定・20円UNKNOWN→永久未送金20円、取消/相殺競合、receipt再送 | 差分30円だけcash/予約反映、残20円保全、完了部相殺不可、恒等式/版横断総額維持 |
| T6 | 5:3:1 F4→追加F1、9回1円/10回目、cap0、同一人複数入金、並行batch、整数溢れ/tie、多段飽和w=(100,10,10,10)/cap=(1,2,10,10)/F20/C<D | 多段はA1→残f19/W30→B2→残f17/W20→(1,2,9,8)。固定(2,1,1)→累計(3,1,1)、上限/Σallocation=F、本人集約、既払い不変、全量原子的予約 |
| T7 | 通常支出を返金と偽装、未達/中止で選任・検収なしの正当返金/元決済返品 | 偽装拒否、別種別の固有条件だけで判定。管理/手動/サポート/昇格でも同じ |
| T8 | cash100/債務40+準備金10+未払fee5、取消後cash20、非現金保証/偽補填 | F<=45、不足35で新操作/既予約自動実行停止。実収証明なしのcash増加0、権利維持 |
| T9 | API/管理/口座名義/サポート/昇格/鍵再発行/例外/受取先変更/事業者自身 | 全経路種別条件と旧権限fence、owner任意引出不可。法令残余は隠さず監査 |
| T10 | P/Q/R確定中にS再照合、未分類/重複/候補変化、先行unready/後着ready、別panel署名、本文訂正/削除・審査前複製、改竄bundle | 三競合で失効せず元同じpanelの最新3署名/CAS、関連は新round、未分類保留、順位保持、審査前複製/永久本文保存なし、版/署名/内容hash/最終性不一致bundle拒否 |
| T11 | 開始48h/専用署名48h/元D12の直前・一致・直後、未完了reset、次周期旧署名expired | 承認候補のstrict期限、旧署名復活なし、元期限不変、成功後の正常次周期だけ許可 |
| T12 | 並行CAS、二重nullifier/nonce、同key異payload、外部確定後API投影失敗 | 権威ある効果/receiptは一度。受理前検証拒否は新規消費0。受理後FAILED/UNKNOWN/投影失敗は元receipt/消費/予約/履歴を保全。再POSTは元決定、再構築は再実行せず、銀行retryは同版原許可/payloadと最新contextで再検証 |
| T13 | 鍵失効/epoch更新の旧session、メール/Basicのみ、他人入金・他募集・応援/再発行、途中issuer/root変更、別候補/アカウント/リレイヤー/端末並行、Cookieなしの方式別受付 | 通常保護操作/資格/権利をscopeで拒否、INITIAL/RUNOFFの固定root/Nと各段階最大1票、Cookieなし候補方式へ通常AUTHを誤固定しない、票/分母/既権利の書換なし |
| T14 | unknown schema/fields、文字列false/verified、float/unsafe JPY、PII/full webhook、私的URL/任意取得 | 厳密拒否、ログ/保管/公開コピー0、SSRF/原資料取得0、fixture proof live混入0 |
| T15 | 偽GateDecision/期限切れ/版不一致/単独解除/別panel署名の混用/未公開解除、root rollback/署名鍵侵害 | 所定のユーザー承認/独立証拠/評議会role/公開期間なしの新効果拒否、既決定保全、真正性不明は隔離/UNKNOWN、管理DB flagで解除不可 |
| T16 | メールstop vs外部commit、UNKNOWN、旧backup/欠落抑止、旧token再POST、新generation | 1件枠/停止共同順序、UNKNOWN解放なし、STOP/RESTORE_BLOCKED、旧token再開/権利復旧不可 |
| T17 | 過去proofだけの私的照会、推測operation ID、メール/票/会計間join、自動ログ/export/権限復旧 | 現在の所持/閲覧認可、最小結果、PII非取得、token/IP/本文ログ等の契約不適合を未達検出 |
| T18 | 基盤停止/事業者凍結/倒産/契約解除、取消最大期間終了前、未請求/未解決 | 新操作保留、未払/予約を再配分せず、独立会計・外部請求、保存期限を権利失効にしない |

金額/候補/権利の例をテスト用nonce/環境へ完全分離する。期間・回数・金額の実初期値は承認されたmanifestから読み、fixture値を本番defaultにしない。

## 5. 検証層と証跡

1. **実コード単体/性質テスト**：整数/上限/不変batch、original=completed+offset+remaining、cash恒等式、frozen input、reject atomic、時刻境界、署名/入力。失敗を該当理由で確認して修正。
2. **永続化・並行契約テスト**：採用storeの一意/CAS/復元、外部確定と投影故障、inbox重複/欠番。純粋モデルの逐次テストだけで並行性達成を言わない。
3. **外部プロトコル・全経路**：T1〜T9のバリア/分断/遅延に署名trace、銀行/保管二者証拠、独立Verifierと契約/権限監査。内部mockは能力証明でない。
4. **ブラウザー/プライバシー**：本物のセッション/鍵/資格、複数端末/リレイヤー、操作・表示・停止POST、network/log/export/復元の検査。描画hook代替をE2Eと呼ばない。
5. **本番ゲート**：法律/非取得/一意性/匿名性/保管能力/基盤・パネル独立性/AI評価/通知停止の証拠を対象版で束ねる。実施者、独立確認者、日時、入力/結果、未達項目を記録する。

nonce/権利/未終端履歴等の正本と、7日等の運用ログは別保持契約。ログを削除したから未終端履歴も消す、未請求を他人へ配る、バックアップから旧権限を復活させる処理は禁止。

## 6. リリース判定のチェックリスト

- [ ] 本設計/実装順序、ルール初期案、費用/主体をユーザーが承認した。
- [ ] 事業者共同原子性/旧版fence/全経路強制/真実性/非取得/請求の能力を証明した。
- [ ] G-01〜05の必要証拠と対象版のGateDecisionが成立した。
- [ ] 実装/型/lint/build/並行/障害/外部/ブラウザー/プライバシー試験を実施し、未達を隠していない。
- [ ] 認証/秘密/鍵/デモ省略・固定値/旧資料受付の除去、独立配信/復元を確認した。
- [ ] 配備範囲、料金、運用/rollback、法的残余・外部権利と停止時導線を確認した。

リリース判定のチェックリストは現時点すべて未達。P1の部分実装/内部試験とは区別する。Cloud Runデモ更新だけではこのチェックリストを満たさず、実受付や銀行送金を有効にしない。
