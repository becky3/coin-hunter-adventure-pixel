#!/bin/bash

# TypeScript型チェックスクリプト
# エラーを適切にキャプチャして表示

echo "🔍 TypeScript型チェックを実行中..."

# npx tscを直接実行してエラーを取得
npx tsc --noEmit 2>&1 | tee typecheck-output.log

# 終了コードを保存
EXIT_CODE=${PIPESTATUS[0]}

# エラーの数をカウント
ERROR_COUNT=$(grep -c "error TS" typecheck-output.log 2>/dev/null || echo "0")

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ 型チェック成功: エラーなし"
    rm -f typecheck-output.log
else
    echo "❌ 型チェックエラー: ${ERROR_COUNT}件のエラーが見つかりました"
    echo ""
    echo "詳細は typecheck-output.log を確認してください"
fi

exit $EXIT_CODE