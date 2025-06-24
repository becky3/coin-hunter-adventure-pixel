#!/bin/bash
# 引き継ぎドキュメント作成支援スクリプト

# 現在日付を取得（YYYY-MM-DD形式）
CURRENT_DATE=$(date +%Y-%m-%d)

# 引数チェック
if [ $# -eq 0 ]; then
    echo "使用方法: ./scripts/create-handover-doc.sh <作業内容>"
    echo "例: ./scripts/create-handover-doc.sh playstate-implementation"
    exit 1
fi

# ファイル名を生成
WORK_NAME=$1
FILENAME="handover-docs/${CURRENT_DATE}-${WORK_NAME}.md"

# ファイルが既に存在する場合は警告
if [ -f "$FILENAME" ]; then
    echo "警告: $FILENAME は既に存在します。"
    read -p "上書きしますか？ (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "中止しました。"
        exit 1
    fi
fi

# テンプレートを作成
cat > "$FILENAME" << EOF
# ${WORK_NAME}に関する引き継ぎ（${CURRENT_DATE}）

## 概要
[作業の概要を記載]

## 実施内容
[実施した作業の詳細]

## 発生した問題と解決策
[問題があった場合は記載]

## 今後の課題
[残っている課題や推奨事項]

## 関連Issue/PR
- Issue #XX: [Issue名]
- PR #XX: [PR名]
EOF

echo "作成しました: $FILENAME"
echo "現在日付: $CURRENT_DATE"