#!/bin/bash

# Claude用のテスト実行スクリプト
# 並列E2Eテストのみを実行

echo "==========================================
📋 Claude Test Runner - 並列E2Eテスト実行
==========================================

このスクリプトは以下を実行します：
1. 開発サーバーの確認
2. 並列E2Eテスト（約80秒）

"

# 1. 開発サーバーの確認
echo "1️⃣ 開発サーバーの確認..."
curl -s http://localhost:3000/ > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  開発サーバーが起動していません"
    echo "   'npm run dev' でサーバーを起動してください"
    exit 1
fi
echo "✅ 開発サーバーが稼働中です"
echo ""

# 2. 並列E2Eテスト
echo "2️⃣ 並列E2Eテストを実行中..."
echo "💡 3つのワーカーで並列実行します（約80秒）"
node tests/e2e/run-tests-parallel.cjs
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ E2Eテストが失敗しました"
    exit 1
fi
echo ""
echo "✅ E2Eテスト: PASS"
echo ""
echo "✅ すべてのテストが完了しました！"