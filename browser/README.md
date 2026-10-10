# 公開前リンクの自動遷移

`locked-page-auto-open.ts` が編集元です。strict TypeScriptでDOM、時刻、timerを検査し、生成されたclassic scriptをWorkerの公開前リンク画面へ埋め込みます。読み込み後は利用者がチェックを入れたときだけ予約し、解除時は予約と表示を消します。待機は最大60秒ごとに再判定し、公開時刻に同じURLを開き直します。

`npm run build:locked-page` は `src/locked-page-script.ts` を生成し、`npm run check:locked-page` は同じ生成結果との一致を確認します。生成先を手で編集しません。CIでも一致検査を行います。

初回の型移行は元inlineの実行処理と表示文言を維持します。テーマ・言語・statusの翻訳は既存のWorker共通画面へ従います。このscriptはその設定・保存・切替を管理しません。別ページのinline処理は後続の移行対象です。
