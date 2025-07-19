#!/bin/bash

# Claude用のプッシュヘルパースクリプト
# プッシュ前に必要なテストを実行してからプッシュする

echo "==========================================
📋 Claude Push Helper - プッシュ前チェック
==========================================

このスクリプトは以下を実行します：
1. Lintチェック
2. 開発サーバーの確認
3. 並列E2Eテスト（約80秒）
4. 成功したらgit push

"

# 1. Lintチェック
echo "1️⃣ Lintチェックを実行中..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Lintエラーが検出されました"
    echo "🚫 プッシュを中止します"
    exit 1
fi
echo "✅ Lintチェック: PASS"
echo ""

# 2. 開発サーバーの確認
echo "2️⃣ 開発サーバーの確認..."
curl -s http://localhost:3000/ > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  開発サーバーが起動していません"
    echo "   'npm run dev' でサーバーを起動してください"
    exit 1
fi
echo "✅ 開発サーバーが稼働中です"
echo ""

# 3. 並列E2Eテスト
echo "3️⃣ 並列E2Eテストを実行中..."
echo "💡 3つのワーカーで並列実行します（約80秒）"
node tests/e2e/run-tests-parallel.cjs
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ E2Eテストが失敗しました"
    echo "🚫 プッシュを中止します"
    exit 1
fi
echo ""
echo "✅ E2Eテスト: PASS"
echo ""

# 4. git push
echo "4️⃣ すべてのチェックが完了しました。プッシュを実行します..."
echo ""

# 現在のブランチ名を取得
BRANCH=$(git branch --show-current)

# プッシュ実行
git push origin "$BRANCH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ プッシュが完了しました！"
else
    echo ""
    echo "❌ プッシュに失敗しました"
    exit 1
fi