# sinkaisoku.com / go.snkisk.com

`sinkaisoku.com`と`go.snkisk.com`で同じ短縮パスを扱う、条件付き短縮 URL サービスのソースコードです。

## できること

- 任意の短縮パス、または自動生成された短縮 URL を作成
- 作成済みリンクの転送先・短縮パス・公開条件を管理
- 公開開始日時、有効期限、利用回数上限、日時による転送先切替、合言葉保護を設定
- 上限・期限到達時の表示や、別 URL への転送を設定
- 相手や用途ごとに期限・表示・SNS プレビューを持つ入口 URL を作成
- SNS/チャット向けの OG プレビューと公開 URL 専用の QR コードを表示
- 日本語・英語、ライト・ダークテーマに対応

## 動作の考え方

リンクを開いたときは、有効期限、利用開始・合言葉、利用回数、日時による切替をこの順で確認します。設定されていない条件は判定せず、通常時は登録した転送先 URL へ移動します。

アクセス履歴・IP アドレス・User-Agent は保存しません。利用回数上限を設定したリンクだけ、上限判定のための累計利用回数を保持します。

## 公開について

このリポジトリは `sinkaisoku.com` と `go.snkisk.com` の実装を公開するためのものです。実運用の秘密情報は含みません。特に `TURNSTILE_SECRET` は Worker の外部 Secret として管理し、リポジトリへ追加しません。

クエリーで作成フォームを初期設定する方法は、`https://docs.sinkaisoku.com/query`（または`https://docs.go.snkisk.com/query`）で案内します。両docsホストはWorkerへ割り当て済みで、Turnstileは2つの公開ホストを許可しています。

## 管理ダッシュボード

`/admin/` と `/api/admin/*` は、両方の宛先を含む Cloudflare Access アプリケーションで保護します。Worker でも Access の `Cf-Access-Jwt-Assertion` を署名・issuer・AUD まで検証するため、デプロイ前に次の Worker Secret を設定してください。

- `ACCESS_TEAM_DOMAIN`: `<team>.cloudflareaccess.com`
- `ACCESS_ADMIN_AUDS`: `/admin/*` と `/api/admin/*` を保護する Access アプリケーションの AUDをカンマ区切りで指定

管理者の強制操作は `admin_audit_events` に90日間記録し、日次Cronで期限切れの記録を削除します。リンクの削除は論理削除で、短縮パスは再利用できません。アクセス履歴・IPアドレス・User-Agentは保存しません。

## 静的プレビュー画像

`GET /assets/share-preview-amber-waves.jpg` は元の800×400 JPEGを公開CDNから取得する互換経路です。`src/static-media.ts` にURL・SHA256・49793 bytes・MIMEを固定し、status/MIME/サイズ/署名/hashを確認した画像だけを従来の200とcache headerで返します。CDN取得失敗・不一致は502/no-storeで返します。queryや利用者の認証headerはCDNへ渡しません。画像本体やbase64はGitへ保存せず、変更時はownerのCDN原本確認後にmappingとテストを更新します。

```sh
npm ci
npm run typecheck
npm test
```

テストはCDNアクセスをmockし、原本を再uploadしません。

テストの手書きsourceは `test/*.test.mts` です。Node.js 22.18以降のTypeScript直接実行を使い、`npm run typecheck` はWorker・テスト・拡張機能・生成ツールを厳格に型検査します。テストのJavaScript生成物は保存しません。Chrome拡張機能の編集元と生成手順は [extension/README.md](extension/README.md) を参照してください。


## 非公開作業記録の確認

作業記録・状態表・検証証跡は非公開のローカル `docs/` に保存し、stage・commit・push・公開配信しません。専用worktreeではprimary checkoutの既存feature/task記録を更新して読み戻します。公開PRには確認結果だけを公開可能な範囲で記載し、レビューには非公開記録の実読結果を使います。記録本体は公開差分へ追加しません。


## 公開前リンクのブラウザー処理

公開時刻後の自動遷移は [browser/README.md](browser/README.md) に編集元と生成契約を記載しています。`npm run typecheck` はこの1つのブラウザー処理もstrict検査し、`npm run build:locked-page` でWorkerへ埋め込むstringを生成、`npm run check:locked-page` で一致を確認します。Chrome拡張の生成とは別の入力・生成先です。公開前リンク画面の表示と操作を維持し、他のインラインJSは親Issue #7の後続移行に残します。


### 作成画面のプレビューラベルの型移行

[Issue #15](https://github.com/Special-Rapid/go.snkisk.com/issues/15)ではプレビューラベルの埋込JSを [ブラウザー用の正本](browser/README.md)へ移しました。従来の `npm run build:locked-page` / `npm run check:locked-page` を維持し、公開前リンクと合わせた固定2件の生成・一致検査を行います。既存のラベル文言・イベント・HTML挿入位置を保ち、他の埋込JSと公開docsは変更しません。
