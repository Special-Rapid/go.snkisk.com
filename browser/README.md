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
