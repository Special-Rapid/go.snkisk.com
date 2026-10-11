# 公開前リンクの自動遷移

`locked-page-auto-open.ts` が編集元です。strict TypeScriptでDOM、時刻、timerを検査し、生成されたclassic scriptをWorkerの公開前リンク画面へ埋め込みます。読み込み後は利用者がチェックを入れたときだけ予約し、解除時は予約と表示を消します。待機は最大60秒ごとに再判定し、公開時刻に同じURLを開き直します。

`npm run build:locked-page` は `src/locked-page-script.ts` を生成し、`npm run check:locked-page` は同じ生成結果との一致を確認します。生成先を手で編集しません。CIでも一致検査を行います。

初回の型移行は元inlineの実行処理と表示文言を維持します。テーマ・言語・statusの翻訳は既存のWorker共通画面へ従います。このscriptはその設定・保存・切替を管理しません。別ページのinline処理は後続の移行対象です。


## 作成画面のプレビューラベル

[Issue #15](https://github.com/Special-Rapid/go.snkisk.com/issues/15)の `create-preview-label.ts` は、DOMContentLoaded時に既存プレビューfieldsetの `aria-label` を現在の文書言語で設定します。`en` は `Social preview`、それ以外は `SNSプレビュー` とする既存判定、selectorとHTMLElement確認を維持します。言語設定の保存・切替をこのscriptへ移したものではありません。

既存コマンド `build:locked-page` / `check:locked-page` は、公開前リンクとプレビューラベルの固定2正本を対象にします。生成先は `src/locked-page-script.ts` と `src/create-preview-label-script.ts` です。DOM.Iterableを含むstrictブラウザー設定で、実行可能なclassic scriptを生成します。生成JSの文字列を直接編集しません。他26箇所の手書き埋込JSは親Issue #7の残作業です。


## 作成画面の案内翻訳

[Issue #17](https://github.com/Special-Rapid/go.snkisk.com/issues/17)の `create-service-guide-locale.ts` は、案内見出し・公開docsリンク・拡張機能の開発中表示を既存の日本語/英語で同期します。`go:localechange` と一度だけの `DOMContentLoaded` を元の順序で登録し、イベント時点の文書言語が `en` のとき英語、それ以外は日本語を使います。`data-service-guide` の既存keyだけに対応し、言語の決定・保存やdocsの本文を変更しません。

現在の `build:locked-page` / `check:locked-page` は公開前リンク・プレビューラベル・案内翻訳の固定3正本を対象にします。追加生成先は `src/create-service-guide-locale-script.ts`、従来2生成物は同byteで維持します。上の各移行説明は導入順を示し、現在の生成件数は3件です。辞書の値とDOM型をstrict検査し、実行AST・挿入位置・表示文言は維持します。親Issue #7には他25箇所の手書き埋込JSが残ります。

## 条件見出しの翻訳

[Issue #19](https://github.com/Special-Rapid/go.snkisk.com/issues/19)の `create-rule-heading-locale.ts` は、初回の0ms timerが実行される時点で文書言語が `en` の場合だけ、既存の条件見出し・option・回数表示を翻訳します。登録済みinput/changeはそれぞれ0ms timerで再同期します。初回判定後に文書言語を再判定しない既存挙動を保ち、言語設定の保存・切替処理は変更しません。

辞書の欠落値は型に反映し、既存のtruthy確認直後の代入だけに非null型注釈を使います。実行時の辞書参照回数・条件・文言を維持し、数値の辞書値やDOM代入はstrictで拒否します。生成JSの実行ASTは元のIIFEと同一です。

現在の固定生成は上記の4正本で、追加生成先は `src/create-rule-heading-locale-script.ts` です。従来3生成物は同byteを維持します。前段の件数は導入履歴で、親Issue #7の残作業は手書き24箇所です。


## テーマ初期化

[Issue #21](https://github.com/Special-Rapid/go.snkisk.com/issues/21)の `theme-bootstrap.ts` は共通画面のheadで `go_theme` を同期で1回読み、light/dark/autoだけを使います。欠落・無効値・storage例外はauto、`dataset.theme` と `style.colorScheme` を元の順で設定します。保存や言語切替は既存の処理に従います。themeの3値unionとDOM型でstrict検査し、型の強制変換は使いません。

現在の `build:locked-page` / `check:locked-page` は固定5正本を対象にします。追加生成先は `src/theme-bootstrap-script.ts`、従来4生成物は同byteです。上の件数は導入履歴で、親Issue #7の残作業は手書き23箇所です。

## 作成画面の用語翻訳

[Issue #23](https://github.com/Special-Rapid/go.snkisk.com/issues/23)の `create-form-terms-locale.ts` は、初回実行時の文書言語が `en` の場合だけ開始し、その後は言語を再判定せずに有効期限・終了時表示・終了メッセージ・現地時間の4文言を翻訳します。初回RAF、追加NodeのMutationObserver、text walker、除外tagと前後の空白、同期走査の順序を維持します。追加textでは親を走査し、追加Elementではその要素を走査する既存の区別を保ちます。言語の決定・保存・切替はこの処理に移していません。

辞書の欠落値は `string | undefined`、走査引数と配列はNode型としてstrict検査します。型の強制変換は使いません。現在の固定生成は6正本で、追加生成先は `src/create-form-terms-locale-script.ts`、従来5生成物は同byteです。前段の件数は導入履歴で、親Issue #7の残作業は手書き22箇所です。

## 作成画面の説明再同期

[Issue #25](https://github.com/Special-Rapid/go.snkisk.com/issues/25)の `setting-info-locale-refresh.ts` は、DOMContentLoadedを一度だけ登録し、発火時に既存条件toggleのinputへchangeをbubbles=trueで送ります。その後で文書言語を判定し、enかつ既存studioがHTMLElementの場合だけ5文言を翻訳します。イベントによる言語/DOM変更を反映する順序、例外時の後続停止、除外tag・空白・replaceによる置換を保ちます。言語や設定の保存・切替処理は変更しません。

辞書の欠落値は `string | undefined`、走査配列はNode型でstrict検査し、型の強制変換は使いません。現在の固定生成は7正本、追加生成先は `src/setting-info-locale-refresh-script.ts`、従来6生成物は同byteです。前段の件数は導入履歴で、親Issue #7の残作業は手書き21箇所です。

## 作成画面の動的文言翻訳

[Issue #27](https://github.com/Special-Rapid/go.snkisk.com/issues/27)の `create-form-dynamic-locale.ts` は初回実行時がenなら5文言の翻訳を開始し、その後は言語を再判定しません。初回RAFは全text Nodeを収集してから変換し、characterDataと追加textはそのNodeだけを直接変換します。追加Elementは配下を走査します。前の用語翻訳で行う「追加textの親を再走査」とは別の既存契約です。除外tag・空白・childList/subtree/characterData監視と挿入順を維持します。

辞書の欠落値、変換/走査引数とNode配列の4型注釈でstrict検査し、型の強制変換は使いません。現在の固定生成は8正本、追加生成先は `src/create-form-dynamic-locale-script.ts`、従来7生成物は同byteです。前段の件数は導入履歴で、親Issue #7の残作業は手書き20箇所です。


### ホーム補助翻訳のstrict TypeScript正本

[Issue #29](https://github.com/Special-Rapid/go.snkisk.com/issues/29)の `home-polish-locale.ts` は初回enで補助3文言の翻訳を開始し、後続は言語を再判定しません。親または祖先の `[data-no-i18n]` を除外し、除外tagと空白を保ちます。RAFは実行時点のbodyから全text Nodeを収集後に変換します。characterDataと追加textは対象だけを直接変換し、追加Elementは配下を走査します。

辞書欠落値・変換/走査引数・Node配列の4型注釈だけを使い、型の強制変換はありません。固定生成は9正本、追加先は `src/home-polish-locale-script.ts`、従来8生成物は同byteです。前段件数は履歴で、親Issue #7の手書き残作業は19箇所です。

### 入口期限の補助翻訳をstrict正本へ移行

[Issue #31](https://github.com/Special-Rapid/go.snkisk.com/issues/31)の `entry-expiry-locale.ts` は初回enで開始し、後続は言語を再判定しません。textは親/祖先の `[data-no-i18n]` と除外tagを先に判定し、全収集後に空白を保って変換します。その後のplaceholder走査はroot自身を含まない子孫だけを対象とし、textの除外条件を使わない既存契約です。RAF時点body、characterDataと追加textの直接変換、追加Element走査、attributes監視なしを維持します。

辞書欠落値・変換Node・走査Element・Node配列の4型注釈だけでstrict検査します。固定生成は10正本、追加先は `src/entry-expiry-locale-script.ts`、従来9生成物は同byteです。前段件数は履歴で、親Issue #7の手書き残作業は18箇所です。

### 完了・管理文言の補助翻訳

`browser/completion-locale.ts` をstrict正本とし、固定11生成の `src/completion-locale-script.ts` を共通ページへ埋め込みます。初回enだけで開始し、後続の言語変更は再判定しません。textの親・祖先 `data-no-i18n` と除外tag、空白保持、RAF時点body、全text収集後変換、characterData/追加textの直接変換と追加Element走査を維持します。辞書12文言のうち `期限: ` は末尾空白を含むkeyであり、trim後のlookupでは一致しない既存挙動を保持します。4型注釈だけを追加し、旧10生成物のbyteと監視3項目・挿入順を保ちます。

### 作成フォーム45文言の翻訳

`browser/create-form-locale.ts` をstrict正本とし、固定12生成の `src/create-form-locale-script.ts` を埋め込みます。初回enだけ開始し、各convertでもlangを再判定します。en開始後の非en中は変換せず、enへ戻った通知では変換します。SCRIPT/STYLE/TEXTAREAの3tagを除外し、OPTIONは変換します。data-no-i18n祖先除外を追加しない既存契約です。空白保持、RAF時点body、全Text収集後変換、characterData/追加Text直接変換と追加Element走査、監視3項目と挿入順を維持します。4型注釈だけを追加し、旧11生成物のbyteを保持します。

### 入力検証翻訳と日時整形

[Issue #37](https://github.com/Special-Rapid/go.snkisk.com/issues/37)の `browser/validation-locale.ts` をstrict正本とし、固定13生成の `src/validation-locale-script.ts` を同位置へ埋め込みます。22固定文言と4正規表現、捕捉値・空白・親/祖先data-no-i18n・除外4tagを保持します。初回enだけ開始し、後続の言語は再判定しません。RAF時点bodyの全Text収集後変換に続いて日時を整形し、characterData/追加Text直接変換と追加Element走査では日時を整形しません。DateのNaN判定とIntlのzone/shortOffset/dateStyle/timeStyle、監視3項目と順序を維持します。辞書欠落値・string引数・Node/Node配列と、既存HTML time要素向けquerySelectorAllのHTMLElement型引数だけを追加します。型の強制変換はなく、旧12生成物のbyteを保ちます。前段の件数は履歴で、親 #7の手書き残作業は15箇所です。

### 条件カードの制御

[Issue #39](https://github.com/Special-Rapid/go.snkisk.com/issues/39)の `browser/condition-card.ts` をstrict正本とし、固定14生成の `src/condition-card-script.ts` を同位置へ埋め込みます。toggleによる表示・control disabled・上限転送設定・form同期event、hashのdecode/所属確認/details展開/RAFscroll、submit時の期間customValidity・required・checkValidity/reportValidityを維持します。期間input/changeはcustomValidityを解除します。control列挙のinput/select/textarea unionと期間2IDのinputに型引数2箇所だけを付け、型の強制変換は使いません。旧13生成物のbyteを保持します。前段件数は履歴で、親 #7の手書き残作業は14箇所です。

### 作成フォームの状態管理

[Issue #41](https://github.com/Special-Rapid/go.snkisk.com/issues/41)の `browser/create-state.ts` をstrict正本とし、固定15生成の `src/create-state-script.ts` を同位置へ埋め込みます。初回setTimeout(0)、studio/form型guard、現在言語でのURL検証表示、Turnstile success/expired/errorの状態同期、input/changeの遅延同期、audience有効時のlabel/slug customValidityを維持します。共有Windowのoptional callback3宣言とnameのstring注釈だけを追加し、型の強制変換は使いません。旧14生成物のbyteを保持します。前段件数は履歴で、親 #7の手書き残作業は13箇所です。

### 条件フォームの同期

[Issue #43](https://github.com/Special-Rapid/go.snkisk.com/issues/43)の `browser/condition-form-sync.ts` をstrict正本とし、固定16生成の `src/condition-form-sync-script.ts` を同位置へ埋め込みます。無効条件の既存日本語表示、切替設定によるSNSプレビューfieldsetとnotice、input/change/conditioncardsyncの即時同期、microtask後のsubmit登録と無効日時inputと同名hiddenの除去を維持します。string注釈4と現HTMLの日時inputに型引数1だけを追加し、型の強制変換は使いません。旧15生成物のbyteを保持します。前段件数は履歴で、親 #7の手書き残作業は12箇所です。

### 設定説明とinfo開閉

[Issue #45](https://github.com/Special-Rapid/go.snkisk.com/issues/45)の `browser/setting-info.ts` をstrict正本とし、固定17生成の `src/setting-info-script.ts` を同位置へ埋め込みます。現在言語での見出し・状態・説明、infoのclick/focus/blur/hover、focus中leaveの維持、hashと入力エラーによるdetails展開、load/localechange/toggle同期の順序を保ちます。辞書の型とbutton/tooltip/valueの4注釈だけを追加し、未知keyのundefinedと旧16生成byteを保持します。前段件数は履歴で、親 #7の手書き残作業は11箇所です。

### 言語切替後の補助翻訳

[Issue #47](https://github.com/Special-Rapid/go.snkisk.com/issues/47)の `browser/localization-after.ts` をstrict正本とし、固定18生成の `src/localization-after-script.ts` を同位置へ埋め込みます。既存の文字列辞書登録・文字列翻訳callback2つをoptionalとして表し、不在時のfallback、19文言の辞書登録、RAF走査と除外tag、日時zone、title suffix、input/change後のtimer、locale通知の順序を保ちます。生成scriptの一意markerを現在の固定 `SERVICE_HOST` で置換し、外部入力の新経路は作りません。旧17生成byteを維持し、前段件数は履歴です。親 #7の手書き残作業は10箇所です。

### クエリー設定案内の補助翻訳

[Issue #49](https://github.com/Special-Rapid/go.snkisk.com/issues/49)の `browser/docs-query.ts` をstrict正本とし、固定19生成の `src/docs-query-script.ts` を同位置へ埋め込みます。ja/enの辞書と未知keyのundefined、現在のlangによる文言とtitle、locale通知、DOMContentLoaded onceの順序を保ちます。現HTMLの `data-docs-copy` は8要素で、辞書の15項目すべてがDOMにあるとは扱いません。既存 `escapeHtml(docsOrigin)` は一意markerをcallbackで置換し、replacement特殊文字をそのまま保ちます。旧18生成byteを維持し、前段件数は履歴です。親 #7の手書き残作業は9箇所です。

### 未使用の補助翻訳定義

[Issue #51](https://github.com/Special-Rapid/go.snkisk.com/issues/51)の `browser/localization-polish.ts` をstrict正本とし、固定20生成の `src/localization-polish-script.ts` から既存定義を復元します。現在の `localizationPolishScript` は定義のみでHTMLへ挿入されていません。呼出し・埋込の追加や定義の削除は行わず、初期en判定、19文言、空白、除外tag、zone/title、optional翻訳callback、MutationObserver処理と例外を保持します。固定 `SERVICE_HOST` の補間は一意markerで復元し、旧19生成byteと完成Worker HTML全文を維持します。前段件数は履歴です。親 #7の手書き残作業は8箇所です。

### 共有翻訳処理

[Issue #53](https://github.com/Special-Rapid/go.snkisk.com/issues/53)の `browser/localization-core.ts` をstrict正本とし、固定21生成の `src/localization-core-script.ts` を既存の共有layoutへ同じ位置で埋め込みます。保存済みja/enをOSより優先し、それ以外は既存のOS判定（ja候補があればja、それ以外en）を保持します。manual選択の保存、auto時の削除、text・placeholder・altの辞書、observerの停止と再接続、locale通知の順序を変えません。型注釈だけで既存のprototype key例外やzone文言も保持し、今回に挙動改善を混ぜません。旧20生成byteを維持し、前段件数は履歴です。親 #7の手書き残作業は7箇所です。

## クエリー初期値処理の型付き正本

[Issue #55](https://github.com/Special-Rapid/go.snkisk.com/issues/55)の作成フォームのクエリー初期値処理は `browser/create-query-preset.ts` を編集し、固定生成の `src/create-query-preset-script.ts` を同じ場所へ埋め込みます。生成対象は22件です。許可パラメーター・値の検証、条件切替、通知順、`restore=1` の除外を維持します。手書きJSの残作業6箇所と、本番反映・実ブラウザー確認は別の作業です。

## 条件概要の英語同期の型付き正本

[Issue #57](https://github.com/Special-Rapid/go.snkisk.com/issues/57)の条件概要の英語同期は `browser/create-rule-locale.ts` を編集し、固定生成 `src/create-rule-locale-script.ts` を従来の位置へ埋め込みます。生成対象は23件です。timer実行時のen判定、期限・回数・切替の文言、input/change後の再同期、DOMの読み取り回数と既存例外を維持します。繰り返し取得の型構文は実行時に消去され、新しい入力検証ではありません。手書き残5箇所と実ブラウザー確認・本番反映は別作業です。

## テーマ処理の型付き正本

[Issue #59](https://github.com/Special-Rapid/go.snkisk.com/issues/59)の共有layoutのテーマ処理は `browser/theme-controls.ts` を編集し、固定生成 `src/theme-controls-script.ts` を従来の位置へ埋め込みます。生成対象は24件です。System/Light/Dark、OS変更追従、手動保存、言語別ラベル、menu閉じとsummary focus、legacy listener、datasetの読み取り回数と既存例外を維持します。画面上のテーマ選択は既存radioへ渡されます。消去される型generic/non-null構文は新しい実行時検証ではありません。手書き残4箇所、実ブラウザー確認、本番反映は別作業です。

## 言語・テーマ選択ボタンの型付き正本

[Issue #61](https://github.com/Special-Rapid/go.snkisk.com/issues/61)の共有layoutの選択ボタン処理は `browser/locale-picker.ts` を編集し、固定生成 `src/locale-picker-script.ts` を従来のHTML/CSS・挿入順で埋め込みます。生成対象は25件です。click・方向キー/Home/End・RAF focus、テーマradio接続、言語callback/select fallback、OS追従・observer・meta同期、保存値、再取得・未知key/prototype値・既存例外を維持します。消去されるnon-null1とcallback引数型は新しい実行時検証ではありません。手書き残3箇所、実ブラウザー確認、本番反映は別作業です。

## フォーム復元処理の型付き正本

[Issue #63](https://github.com/Special-Rapid/go.snkisk.com/issues/63)の作成フォーム保存・復元は `browser/create-form-recovery.ts` を編集し、固定生成 `src/create-form-recovery-script.ts` を従来の位置へ埋め込みます。生成対象は26件です。submit listenerとrestoreの順序、sessionStorageの保存除外・既存復元・例外、各controlとtoggle、formイベントとerror focus呼出しを維持します。JSON.parse由来の型注釈は未検証のproducer契約で、新しい実行時検証ではありません。異常値・継承key・繰り返し取得・途中例外の挙動も保ちます。手書き残2箇所、実ブラウザー確認、本番反映は別作業です。
