## GeChat Frontend Monitoring

ジーチャットの検証環境フロント画面の死活監視スクリプトです。

## セットアップ

```bash
cd monitoring

# 依存関係のインストール（Playwright/ dotenv を含む）
npm install

# Playwrightブラウザのインストール（初回のみ）
npm run install-browsers

# 環境変数ファイルを作成
cp .env.example .env  
```

### .env の例
```dotenv
# 監視対象
FRONT_URL=https://stg.front.geechat.jp
AI_NAME=sample1

# Basic認証
BASIC_AUTH_USER=＜ユーザー名＞
BASIC_AUTH_PASS=＜パスワード＞

# 動作設定
TIMEOUT_MS=30000
RETRIES=2
HEADLESS=true

# 送信する質問（カンマ区切り）
QUESTIONS=質問1,質問2,料金はいくらですか
```

### .gitignore（抜粋）
- `.env`
- `node_modules/`
- `error-*.png`

## 使い方

### 手動実行
```bash
# 単発でヘルスチェックを実行（.env を自動読み込み）
npm run health-check
# または
node health-check.js
```

### Cron 設定例
```bash
# crontab を編集
crontab -e

# 5分ごとに実行（作業ディレクトリに移動して .env を読み込む）
*/5 * * * * cd /path/to/geechat/monitoring && node health-check.js >> ./health-check.log 2>&1
```

他の間隔:
```bash
*/30 * * * * cd /path/to/geechat/monitoring && node health-check.js >> ./health-check.log 2>&1
0 * * * *    cd /path/to/geechat/monitoring && node health-check.js >> ./health-check.log 2>&1
```

## 監視内容

- 対象URL: `${FRONT_URL}?ai_name=${AI_NAME}`
- Basic認証: `.env` の `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`
- テスト質問: `.env` の `QUESTIONS` からランダム選択
- 成功条件: 回答が表示されること
- 失敗時: カレントディレクトリに `error-<timestamp>.png` を保存

## 出力例

成功時:
```
[2024-01-15T10:30:00.000Z] 🚀 Starting health check: https://stg.front.geechat.jp?ai_name=sample1
[2024-01-15T10:30:00.000Z] 📝 Sending question: "質問1"
[2024-01-15T10:30:15.000Z] ✅ Health check passed - Question: "質問1"
```

失敗時:
```
[2024-01-15T10:30:00.000Z] 🚀 Starting health check: https://stg.front.geechat.jp?ai_name=sample1
[2024-01-15T10:30:30.000Z] ❌ Health check failed: 回答が表示されませんでした
📸 Screenshot saved: ./error-1705314630000.png
```

## 環境変数一覧

- `FRONT_URL`: 監視対象フロントURL（例: https://stg.front.geechat.jp）
- `AI_NAME`: クエリに付与する AI 名（例: sample1）
- `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`: Basic認証情報
- `QUESTIONS`: 送信する質問群（カンマ区切り）
- `TIMEOUT_MS`: 回答待機タイムアウト（ms）
- `RETRIES`: 失敗時のリトライ回数（将来的な拡張用）
- `HEADLESS`: ブラウザのヘッドレス実行（true/false）

## トラブルシューティング

- ブラウザが見つからない:
  ```bash
  npm run install-browsers
  ```
- パーミッションエラー:
  ```bash
  chmod +x health-check.js
  ```
- ログの確認:
  ```bash
  tail -f health-check.log
  grep "❌" health-check.log | tail -5
  ```
