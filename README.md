# Renote AI

**あなたの言葉を、そのまま、もっと伝わる文章へ。**

Renote AIは「AIに文章を書かせるサービス」ではありません。文章を書く主体はユーザーであり、AIはそれを支える存在です。

Renote AIは、自分の文章を育てるためのAIライティングアシスタントです。

## 3つのモード

### 整える

自分の文章を自然で読みやすくします。

- 意味を変えない
- 情報を追加しない
- 情報を削除しない
- AIっぽさをなくす
- 文体だけ調整する
- 文字数指定は表示しない

### 書き直す

同じ内容を別の伝え方へ変更します。

- もっと短く
- もっと丁寧
- もっと自然
- もっと説得力
- もっと柔らかく
- もっと論理的
- もっとフォーマル
- もっとカジュアル

情報は基本的に維持し、必要最低限の補足だけ許可します。

### 作成する

メモや箇条書きから文章を作ります。

- 箇条書きからレポート
- メモからメール
- アイデアから企画書
- キーワードからブログ

このモードだけ文字数指定を表示します。

## プラン

Free:

- 整える
- 書き直す

Pro:

- 作成する
- 文字数指定
- AI相談
- Renote Score
- 高品質モード

## v1.0 RCで重視している体験

- 初回だけ表示するウェルカム画面
- モードごとの入力例
- 改善内容の要約表示
- コピー、Markdown、Word、PDFダウンロード
- 履歴の検索、削除、お気に入り
- ライト・ダークテーマ
- 分かりやすいエラー表示
- 処理中のスケルトン表示
- スマートフォンでも押しやすい操作導線

## セットアップ

```bash
npm install
```

`.env.local.example` を参考に `.env.local` を作成してください。

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4.1-mini

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxxxxx
```

## Supabase

`supabase/schema.sql` をSupabase SQL Editorで実行してください。

Googleログインを使う場合は、SupabaseのAuthentication ProvidersでGoogleを有効化し、リダイレクトURLに以下を追加します。

```text
http://localhost:3000/auth/callback
```

## 起動

```bash
npm run dev
```

```text
http://localhost:3000
```

アプリ本体:

```text
http://localhost:3000/app
```

## 本番ビルド

```bash
npm run build
npm run start
```

## 品質チェック

```bash
npm run typecheck
npm run lint
npm run build
```

主要ページ:

- `/`
- `/app`
- `/about`
- `/pricing`
- `/contact`
- `/help`
- `/privacy`
- `/terms`
