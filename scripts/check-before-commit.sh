#!/bin/bash

# 動作確認チェックスクリプト
# コミット前に必ず実行する

set -e

echo "=========================================="
echo "🔍 動作確認チェックを開始します"
echo "=========================================="

# 1. Puppeteerテスト
echo ""
echo "📊 Puppeteerテストを実行中..."
node tests/puppeteer/simple-test.js

# 2. Lintチェック
echo ""
echo "🔧 Lintチェックを実行中..."
npm run lint

# 3. ブラウザ動作確認リマインダー
echo ""
echo "=========================================="
echo "📝 ブラウザ動作確認チェックリスト"
echo "=========================================="
echo ""
echo "以下の項目を確認してください："
echo ""
echo "□ npm run dev でサーバーを起動した"
echo "□ http://localhost:3000/ でゲームが正常に表示される"
echo "□ プレイヤーキャラクターが表示される"
echo "□ 敵キャラクターが表示される"
echo "□ UIが正常に表示される"
echo "□ 基本操作（移動、ジャンプ）が動作する"
echo "□ 実装した新機能が正常に動作する"
echo "□ ブラウザコンソールにエラーが出ていない"
echo "□ 60FPSで安定して動作している"
echo ""
echo "=========================================="

# 4. 確認プロンプト
echo ""
echo -n "すべての項目を確認しましたか？ [y/N]: "
read CONFIRMED

if [ "$CONFIRMED" != "y" ] && [ "$CONFIRMED" != "Y" ]; then
    echo ""
    echo "❌ 動作確認が完了していません"
    echo "👉 必ずすべての項目を確認してください"
    exit 1
fi

echo ""
echo "✅ 動作確認チェック完了！"
echo "👍 コミットの準備ができました"
echo ""