# 日付取り扱いガイド

## 概要
このプロジェクトでは、ファイル名やドキュメントに日付を含める際の正確性を確保するためのガイドラインです。

## 基本ルール

### 1. 日付確認の必須化
ファイル作成や日付記載の前に、必ず以下のコマンドで現在日付を確認：

```bash
# 日本時間（JST）で表示
date

# 日付のみ取得（YYYY-MM-DD形式）
date +%Y-%m-%d
```

### 2. 引き継ぎドキュメント作成
専用スクリプトを使用することで、日付の間違いを防止：

```bash
# スクリプトを使用（自動的に現在日付が設定される）
./scripts/create-handover-doc.sh <作業内容>

# 例
./scripts/create-handover-doc.sh playstate-implementation
```

### 3. コード内での日付取得
JavaScriptで日付を扱う場合：

```javascript
// 現在の日付を取得（JST）
const now = new Date();
const dateStr = now.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo'
}).replace(/\//g, '-');

console.log(dateStr); // 例: 2025-06-25
```

## よくある間違いと対策

### 間違い1: 前回作業時の日付を使用
**対策**: 毎回 `date` コマンドで確認

### 間違い2: タイムゾーンの違い
**対策**: 環境変数でJSTを明示的に指定
```bash
TZ=Asia/Tokyo date
```

### 間違い3: 手動での日付入力
**対策**: スクリプトやコマンドで自動生成

## チェックリスト
- [ ] ファイル作成前に `date` コマンドを実行したか
- [ ] 表示された日付が正しいことを確認したか
- [ ] 引き継ぎドキュメントは専用スクリプトで作成したか
- [ ] ファイル名の日付フォーマットは `YYYY-MM-DD` か

## 関連ファイル
- `/scripts/create-handover-doc.sh` - 引き継ぎドキュメント作成スクリプト
- `DEVELOPMENT_RULES.md` - 開発ルール（日付の記載ルール含む）
- `CLAUDE.md` - AI向けガイドライン（日付確認の必須化）