# 物理システムリファクタリング作業記録

**日付**: 2025-01-06  
**Issue**: #100  
**PR**: #103  

## 実施内容

### 1. 物理システムのリファクタリング
#### 背景
PR #101でステージ構築中にジャンプ力の問題が発覚。滞空時間の調整が困難だったため、物理システム全体の改善を実施。

#### 主な変更
- **Entity.updatePhysics()の削除**
  - 使用されていない死んだコードを削除
  - PhysicsSystemに物理演算を集約

- **エンティティごとの物理パラメータ実装**
  ```typescript
  airResistance?: number;  // 空気抵抗 (0.0～1.0)
  gravityScale?: number;   // 重力倍率 (デフォルト: 1.0)
  maxFallSpeed?: number;   // 最大落下速度
  ```

- **Variable Jump機能の修正**
  - ボタン長押しで最大200%の高さまでジャンプ可能
  - VARIABLE_JUMP_GRAVITY_FACTOR = 0.4 に設定
  - デフォルトのvariableJumpBoost = 0.3

### 2. ログシステムの実装
#### 背景
console.log文が多数存在し、Lint警告の原因になっていた。また、production環境でもログが出力される問題があった。

#### 実装内容
- **Loggerクラスの作成** (`src/utils/Logger.ts`)
  - production環境で自動的に無効化
  - デバッグモードの切り替え機能
  - console.log/warn/errorを統一的に管理

- **全ファイルの置換**
  - sedコマンドで一括置換を実施
  - 約85個のconsole文をLogger経由に変更

### 3. その他の修正
- **jump-test.html**
  - スライダーが相互に影響する問題を修正
  - applySingleChange()関数で独立制御を実現

- **スプライトデータの整理**
  - enemies/slime.json（新形式）の読み込みエラーを修正
  - 使用されていないファイルを除外

## 発生した問題と解決

### 1. Variable Jumpが機能しない
**問題**: ボタンを押し続けても高さが変わらない（1-2%程度の差）

**原因**: 
- minJumpTime/maxJumpTimeが8ms/20msと短すぎた
- ジャンプ直後に即座にgrounded判定されていた
- variableJumpBoostが一度しか適用されていなかった

**解決**:
- タイマーを0ms/400msに変更
- ジャンプ後50msはgrounded判定をスキップ
- 毎フレームboostを適用するように修正

### 2. Lintエラーとの戦い
**問題**: 246個の警告でエラーが見つけにくい

**解決**:
- Loggerクラスで統一的にログを管理
- エラー: 1 → 0
- 警告: 246 → 125（約50%削減）

### 3. Git運用の問題
**問題**: `git commit --amend`を多用してforce pushが必要になった

**反省**: 
- 修正は新しいコミットとして追加すべきだった
- CLAUDE.mdにGit運用ルールを追加

## テスト結果

### E2Eテスト
- ✅ 基本フロー: 6/6 成功
- ✅ Variable Jump: 200%の高さ増加を確認

### パフォーマンス
- 60FPSで安定動作
- 物理演算の負荷増加なし

## 今後の課題

1. **Lint警告の残り**（Issue #102）
   - any型: 約100個
   - non-null assertion: 約25個

2. **テストの改善**
   - Variable Jumpテストでshort jumpが0になる問題
   - より詳細な物理パラメータのテスト

3. **ドキュメント整備**
   - 物理パラメータの推奨値集
   - キャラクター別の設定例

## 学んだこと

1. **段階的な改善の重要性**
   - 一度に全てを修正しようとせず、優先順位をつける
   - エラーを0にすることを最優先に

2. **デバッグログの管理**
   - 開発中は有用だが、適切に管理しないと邪魔になる
   - 環境に応じた出力制御が重要

3. **Git運用**
   - amendの多用は避ける
   - 特にチーム開発では履歴の保持が重要

## 参考資料
- [物理システムドキュメント](../docs/development/physics-system.md)
- [jump-test.html](http://localhost:3000/jump-test.html)