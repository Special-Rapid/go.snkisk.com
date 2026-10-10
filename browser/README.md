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
