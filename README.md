# go-shortener

Cloudflare Workers + D1 + TypeScript で動く、`go.snkisk.com` 用の認証なし短縮 URL サービスです。

## Features

- `GET /` で短縮 URL 作成フォームを表示
- 日本語・英語のUIに対応（ブラウザ言語で自動選択、画面内で手動切替可能）
- `POST /create` でランダム slug または任意パスの短縮 URL を作成
- `GET /{slug}` で登録先 URL に `302` リダイレクト
- `GET /manage/{slug}?key=...` で転送先 URL、短縮パス、利用回数の上限を含むリンク設定の変更、削除
- 指定回数だけ開ける URL に対応
- 公開 URL 専用の SVG QR コードを表示（外部 QR API は不使用）
- 短縮パス入力中のリアルタイム空き確認
- 回数上限付き URL は通常アクセス時に直接転送し、SNSプレビューでは消費されない
- 指定日時からの公開、指定日時での転送先切替、合言葉保護に対応
- SNS/チャット向けに、転送先OGの保存済みスナップショット・任意入力・転送先URL表示を選べるOGプレビューに対応（時間切替リンクでは無効）
- 作成時から親リンクの終了時メッセージと、任意の最初の相手別入口を設定可能
- 親リンクの転送先と公開条件を共有しながら、相手・用途別に期限・表示・SNSプレビューを持てる招待入口URLに対応
- アクセス履歴、IP アドレス、User-Agent は保存しません。利用回数制限を設定した場合のみ、上限判定のための累計利用回数を保持します
- `POST /create` は Turnstile の server-side validation を通過した場合だけ短縮 URL を作成します

## Setup

```sh
npm install
```

## Turnstile

作成フォームは既存の `go_shortener` widget を使います。secret は公開変数ではなく、Worker Secret として設定してください。

ローカル開発では secret をシェル環境変数から渡します。次の zsh コマンドは入力を表示せず、シェル履歴にも secret を残しません。以後の `npm run dev` は同じシェルで実行してください。

```zsh
read -r -s "TURNSTILE_SECRET_KEY?Turnstile secret: "
echo
export TURNSTILE_SECRET_KEY
```

本番へデプロイする前は、Worker Secret を登録します。

```sh
npx wrangler secret put TURNSTILE_SECRET_KEY
```

`TURNSTILE_SITE_KEY` は公開値として `wrangler.toml` に設定済みです。`TURNSTILE_SECRET_KEY` は絶対に `wrangler.toml` やソースコードへ書かないでください。secret がない状態では、短縮 URL 作成は安全に拒否されます。

D1 database を作成します。

```sh
npx wrangler d1 create go_shortener
```

表示された `database_id` を `wrangler.toml` の `REPLACE_WITH_YOUR_D1_DATABASE_ID` と差し替えます。

ローカル D1 に schema を適用します。

```sh
npm run db:apply:local
```

リモート D1 に schema を適用します。

```sh
npm run db:apply:remote
```

### Existing database migration

2026-07-22 より前に作成した既存 D1 には、`schema.sql` を再実行せず、次の migration を適用してください。`0002_link_behaviors.sql` から `0008_open_limit_fallback_redirect.sql` が順番に適用されます。Cloudflare が適用履歴を管理するため、同じコマンドを再実行しても適用済み migration はスキップされます。

```sh
npm run db:migrate:link-behaviors:remote
```

ローカルの既存 D1 は `npm run db:migrate:link-behaviors:local` を使います。新規 D1 は従来どおり `npm run db:apply:local` / `npm run db:apply:remote` のみで構いません。

## Development

```sh
npm run dev
```

## Deploy

```sh
npm run deploy
```

## Custom Domain

Cloudflare dashboard で Worker に `go.snkisk.com` を Custom Domain として設定する想定です。

## Custom Short Path

作成フォームの「短縮パス」を入力すると、任意の短縮 URL を作れます。

```txt
https://go.snkisk.com/my_link
```

使える文字は英数字、ハイフン、アンダースコアです。長さは1〜64文字です。

未入力の場合は、これまでどおりランダムな7文字のパスを作成します。

管理画面から短縮パスを後で変更できます。変更すると、古い短縮 URL と古い管理 URL は使えなくなります。
古い短縮パスは永久に予約され、以後ほかの URL でも再利用できません。

## Open limit

作成・管理画面で「利用回数の上限」を設定できます。未入力なら無制限です。上限は親URLと相手別入口URLの合計に適用されます。任意で「上限到達後に別のURLへ転送する」をオンにすると、上限に到達した次の通常アクセスから指定URLへ転送できます。

上限付き URL は、人が通常アクセスした `GET` で原子的に利用回数を加算してから直接 `302` 転送します。検出できたSNS bot、プレビュー用ヘッダー、`?preview=og` のアクセスはプレビュー専用応答にするため、利用回数を消費しません。すべての外部サービスの自動アクセスを判別できるわけではありません。

管理画面でリンク設定を更新すると、利用回数は0に戻ります。

## Link behaviors

作成・管理画面で次の公開条件を設定できます。

- **QR コード**: 作成結果と管理画面に、公開短縮 URL だけをエンコードした SVG を表示します。管理 URL や転送先 URL は QR に含めません。
- **短縮パスの空き確認**: 入力中に `/api/slug-availability?slug=...` を同一オリジンで確認します。最終的な重複判定は作成・更新時の D1 制約が行います。
- **管理画面の利用状況**: 回数上限を設定したリンクでは、管理画面を開いている間に5秒ごと、またはタブへ戻った時に「利用状況」と「利用回数」を更新します。無制限リンクでは更新リクエストを送らず、管理キーがない利用状況APIの取得はできません。
- **上限到達後の転送**: 利用回数上限とともに任意でオンにできます。上限に達する最後の1回は通常どおり現在の転送先へ開き、それ以降の通常アクセスだけを指定URLへ302転送します。オフまたは未設定なら既存の終了メッセージを表示します。時間切替とは独立し、親URLと相手別入口URLで共有します。期限切れ・削除済みURL・SNSプレビューはこの転送を使いません。
- **テーマとQRコード**: OSのライト・ダーク設定に自動対応します。QRコードは白背景を内包した画像として白地・黒コードで表示します。Dark Readerを含む強制テーマ拡張の全モードをサイト側で完全に制御することはできません。
- **言語**: UIは日本語・英語に対応します。初回はブラウザ言語が日本語なら日本語、それ以外は英語を選びます。画面上部の `Language / 言語` から変更した選択は同じブラウザに保存されます。終了メッセージ・OGタイトル/説明など利用者が入力した内容と、SNSクローラ向けOGの固定表記は自動翻訳しません。
- **日時の表示と入力**: 時刻はすべてUTCで保存し、作成・管理・公開待ち画面では閲覧者の端末の現地時間で表示します。時刻の末尾には `（現地時間・America/New_York / GMT-4）` のようにタイムゾーンとUTCオフセットを表示します。入力も端末の現地時間として保存され、夏時間の切替で存在しない時刻は保存できません。JavaScriptを無効にした場合だけは、UTCのフォールバック表示・入力になります。
- **転送先切替**: 「切替後の転送先 URL」と「切替日時」を両方設定すると、指定時刻以降のアクセスは新しい URL へ転送します。
- **公開開始日時**: 指定時刻までは公開アクセスを `423 Locked` で拒否します。待機画面で「公開時刻になったらリンクを開く」を選ぶと、ページを開いたままにしている間は公開時刻に自動で再読み込みします。
- **合言葉**: 合言葉を知る人だけが公開ページを進めます。合言葉はランダム salt と PBKDF2-SHA-256（100,000 iterations。Workers実行環境の上限）のハッシュだけを保存し、平文の表示・復元・ログ出力はしません。成功後はリンク単位・10分間の HttpOnly cookie を使って、直接転送までの解錠状態を保持します。
- **SNSプレビュー**: 既定は「OGなし」です。`target_og` は作成・管理更新時だけ転送先の公開HTTPS HTMLを取得し、OG/Twitter/titleをスナップショットとして保存します。取得は手動リダイレクト（最大3回）、5秒、HTML 256KBまでに制限し、ユーザーのcookieやヘッダーは送信しません。`custom` はタイトル・説明と任意の公開HTTPS画像URL、`target_url` はその時点で選ばれる完全な転送先URLを表示します。SNS botまたは `?preview=og` のGETは、OG設定がない場合もプレビュー専用応答を返し、外部転送やD1更新をしません。切替後URLと切替日時を両方設定したリンクでは、親・相手別入口ともSNSプレビューを保存・配信しません。利用回数の上限に到達済み、公開開始前、合言葉保護中もプレビュー内容を返しません。すべてのOG説明とレスポンス本文には、保存値を変更せず表示時に `by 短縮リンクサービス go.snkisk.com` を付記し、`og:site_name` は `短縮リンクサービス go.snkisk.com` に固定します。
- **共有期限・終了時の表示と相手別の入口URL**: 親リンクと入口URLは、共有期限と「利用できなくなった時のメッセージ」をそれぞれ任意で設定できます。メッセージは期限切れまたは親リンクの利用回数上限到達時に、通常アクセス、SNSプレビュー、合言葉POSTへHTTP 200で表示されます。入口URLで上限に達した場合は入口のメッセージを優先し、未指定なら親リンクのメッセージを使います。作成フォームでは任意で最初の入口も1つ追加でき、ラベル、必須の短縮パス、共有期限、終了時の表示、SNSプレビューを設定できます。追加の入口は親リンクの管理画面から作成します。入口ごとの設定に加え、親リンクの期限もすべての入口に適用されます。期限後は転送先・SNSプレビューを返しません。削除済み入口を含め、入口の短縮パスは永久に再利用できません。最初の入口を含む作成時の親リンクと入口はD1 batchで一貫して保存されるため、入口の短縮パス競合時に親リンクだけが残ることはありません。

リンク設定を管理画面から更新すると、利用回数はリセットされます。合言葉欄を空欄にすると現在の値を維持し、「現在の合言葉を解除する」で削除できます。

## Routes

- `GET /`
- `POST /create`
- `GET /api/slug-availability?slug=...`
- `GET /api/manage/{slug}/usage?key={manage_key}`
- `GET /{slug}`
- `GET /{slug}?preview=og`（SNSプレビュー専用。利用回数を消費しない）
- `POST /unlock/{slug}`
- `GET /manage/{slug}?key={manage_key}`
- `POST /manage/{slug}`
- `POST /delete/{slug}`
- `GET /robots.txt`
- `GET /favicon.ico`
- `GET /health`
