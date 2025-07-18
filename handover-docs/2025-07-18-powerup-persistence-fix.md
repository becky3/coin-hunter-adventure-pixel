# パワーアップの持ち越しと死亡時リセット修正

## 実施日
2025-07-18

## Issue
- #187: シールドが次のステージに持ち越せない問題

## 実施内容

### 1. シールドのステージ持ち越し修正

**問題**: ステージ遷移時にSHIELD_STONEが復元されない

**原因**: PlayState.tsのenter()メソッドで、POWER_GLOVEのみが復元されていた

**修正内容**:
- 全てのPowerUpTypeに対応するswitch文を実装
- 各パワーアップの正しい設定で復元

### 2. 死亡時のパワーアップリセット実装

**問題**: 穴に落ちて死亡した際にパワーアップが消失しない

**原因**: Player.tsのrespawn()メソッドでパワーアップのクリア処理が無い

**修正内容**:
```typescript
// Player.ts - respawn()メソッド
this.powerUpManager.clearAll();
Logger.log('[Player] All power-ups cleared on respawn');
```

### 3. コードリファクタリング

**Copilotレビューへの対応**:
- `getPowerUpRestoreConfig()`メソッドを追加
- パワーアップ設定を一元管理
- 全てのパワーアップに統一的なプロパティを定義

## 変更ファイル

1. **src/states/PlayState.ts**
   - enter()メソッドのパワーアップ復元処理を改善
   - getPowerUpRestoreConfig()メソッドを追加

2. **src/entities/Player.ts**
   - respawn()メソッドにパワーアップクリア処理を追加

3. **src/levels/data/stage0-5.json**
   - 動作確認用にゴール手前に穴を追加

## ドキュメント更新

1. **docs/development/powerup-system.md**
   - ステージ遷移時の持ち越し処理を追記
   - 死亡時のリセット仕様を追記

2. **docs/specifications/game.md**
   - シールドストーンの仕様を追加
   - パワーアップの持ち越し・リセット仕様を追記

## テスト方法

### シールド持ち越しテスト
1. ステージ0-5でシールドを取得
2. ゴールに到達（穴を避けて）
3. 次のステージでシールドが維持されていることを確認

### 死亡時のリセットテスト
1. ステージ0-5でシールドを取得
2. ゴール手前の穴に落ちて死亡
3. リスポーン後、シールドが消えていることを確認

## 今後の課題

1. **統一的なパワーアップ設定管理**
   - 現在はgetPowerUpRestoreConfig()で設定が重複している
   - PowerUpItemクラスの設定と統合する仕組みが必要

2. **未実装のパワーアップ**
   - WING_BOOTS、HEAVY_BOOTS、RAINBOW_STARは未実装
   - 実装時に設定の整合性を保つ必要がある

## 学んだこと

1. **ステージ遷移時の状態管理**
   - playerStateオブジェクトで各種状態を引き継ぐ
   - powerUpsは文字列配列として保存される

2. **死亡処理の流れ**
   - PlayState.handlePlayerDeath() → Player.respawn()
   - respawn()でプレイヤーの状態をリセット

3. **Copilotレビューの価値**
   - コードの一貫性について有益な指摘
   - 保守性向上のための改善提案

## PR情報
- PR #188: fix: シールドが次のステージに持ち越せない問題を修正