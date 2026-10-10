# Chrome拡張機能

popupの編集元は `popup.ts`、使用するChrome APIの型は `chrome.d.ts` です。Chromeが直接読む `popup.js` は生成物としてGitで追跡します。manifest・HTML・CSSとあわせ、このフォルダを開発用拡張機能として読み込めます。

Node.js 22.18以降でルートから実行します。

```sh
npm ci
npm run typecheck
npm run build:extension
npm run check:extension
```

`build:extension` は専用compiler設定で一時ディレクトリへ生成してから `popup.js` を更新します。`check:extension` は同じ生成結果とのbyte一致を検査し、差があれば失敗します。sourceと生成物は同じcommitに含め、生成物を直接編集しないでください。CIでも一致を検査します。

popupは既存のbridgeメッセージ検査、短縮URL作成、locale/theme保存、QR保存の動作を維持します。型定義は使用中のAPI契約を表し、manifestの権限を追加しません。
