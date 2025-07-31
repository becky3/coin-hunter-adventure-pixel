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
  "threshold": 0,                    // 重複の許容閾値（0%）
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

### CI/CDへの統合

現時点では開発者の手動実行としていますが、将来的には以下の統合を検討：

- GitHub Actionsでのチェック
- pre-commitフックへの追加（オプション）
- PRレビュー時の自動実行

## 現在の検出結果

2025年7月時点の検出結果：

- **重複率**: 約0.55%（非常に健全な状態）
- **主な重複箇所**:
  1. Bat.ts/Spider.ts - 敵キャラクターの共通処理
  2. MenuState.ts/SoundTestState.ts - UI処理の共通部分
  3. MasterPalette.ts/pixelArtPalette.ts - パレット定義の重複

これらの重複は、今後のリファクタリング候補として管理します。

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