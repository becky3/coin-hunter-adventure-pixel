---
layout: default
title: 重複コード検出
parent: 開発者向け
---

# 重複コード検出ツール (jscpd)

## 概要

本プロジェクトでは、コード品質の維持と技術的負債の削減のため、jscpd（JS Copy/Paste Detector）を使用して重複コードの検出を行います。

## 使用方法

### 基本的な使用方法

```bash
# 重複コードの検出（レポート生成）
npm run jscpd

# CI/CDで使用（重複が見つかった場合はエラーで終了）
npm run jscpd:check
```

### 実行結果

- コンソールに検出結果のサマリーが表示されます
- `reports/jscpd/html/`にHTMLレポートが生成されます（gitignore対象）
- HTMLレポートでは、重複箇所を視覚的に確認できます

## 設定

設定は`.jscpd.json`で管理されています：

```json
{
  "threshold": 1,                    // 重複の許容閾値（1%）
  "minLines": 10,                    // 最小検出行数
  "minTokens": 70,                   // 最小検出トークン数
  "output": "./reports/jscpd",       // レポート出力先
  "format": ["typescript", "javascript"],  // 検出対象の言語
  "ignore": [                        // 除外パターン
    "**/node_modules/**",
    "**/tests/**",
    "**/pixelFont.ts"              // フォント定義は意図的に除外
  ]
}
```

### 設定値の根拠

- **minLines: 10** - 短い共通処理は除外し、意味のある重複のみを検出
- **minTokens: 70** - 単純な繰り返しではなく、ロジックの重複を検出
- **pixelFont.ts除外** - フォント定義は規則的なパターンのため除外

### 重複除外の方法

意図的な重複（データ定義等）がある場合は、以下の方法で除外できます：

```typescript
/* eslint-disable capitalized-comments -- jscpd directive requires lowercase */
/* jscpd:ignore-start */
const STAGE_PALETTES = {
  // パレット定義...
};
/* jscpd:ignore-end */
/* eslint-enable capitalized-comments */
```

**注意**: jscpdディレクティブは小文字で記述する必要があるため、ESLintの`capitalized-comments`ルールを一時的に無効化します。

## 運用方針

### 検出時の対応

1. **新規開発時**
   - 開発中に定期的に`npm run jscpd`を実行
   - 重複が検出された場合は、共通化を検討

2. **既存コードの重複**
   - 優先度を判断して段階的にリファクタリング
   - Issue #239のような実害がある重複を優先

3. **意図的な重複**
   - パフォーマンスやモジュール独立性のための意図的な重複は許容
   - コメントで理由を明記
   - データ定義（パレット等）の重複は`/* jscpd:ignore-start */`で除外可能

### CI/CDへの統合

#### pre-commitフックへの統合（実装済み）

本プロジェクトでは、既存のpre-commitフックにjscpdチェックを統合しています：

- **実行内容**: 
  1. Lintチェック
  2. TypeScriptの型チェック
  3. 重複コードチェック（jscpd）
  4. ビルドチェック
- **閾値**: 1%以下の重複率で通過
- **動作**: コミット時に自動実行され、基準を満たさない場合はコミットを中止
- **セットアップ**: `bash scripts/setup-hooks.sh`で設定

#### 将来的な統合計画

- GitHub Actionsでのチェック
- PRレビュー時の自動実行とコメント

## 現在の検出結果

2025年8月時点の検出結果：

- **重複率**: 0%（リファクタリング完了）
- **実施したリファクタリング**:
  1. Enemy基底クラスへの共通処理統合
  2. BaseUIStateクラスの作成とUI共通処理の統合
  3. MasterPaletteクラスへの色定義の一元化

pre-commitフックにより、今後も低い重複率が維持されます。

## トラブルシューティング

### レポートが生成されない

```bash
# reportsディレクトリを手動作成
mkdir -p reports/jscpd
```

### メモリ不足エラー

大規模プロジェクトでは以下のように実行：

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run jscpd
```

## 参考リンク

- [jscpd公式ドキュメント](https://github.com/kucherenko/jscpd)
- [設定オプション詳細](https://github.com/kucherenko/jscpd/tree/master/packages/jscpd#configuration)