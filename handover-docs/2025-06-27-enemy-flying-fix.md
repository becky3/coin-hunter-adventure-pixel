# 敵キャラクターが飛んでいく問題の解決

**日付**: 2025-06-27  
**解決者**: Claude  
**Issue**: #33 敵システムの実装

## 問題の概要

敵キャラクター（スライム）がゲーム開始直後に画面外へ高速で飛んでいく問題が発生。
- 症状：敵が瞬時に画面外へ移動し、座標が数千ピクセルに達する
- 影響：ゲームプレイが不可能

## 原因の特定プロセス

### 1. 初期の誤った仮説
- Entity.jsとPhysicsSystemの二重位置更新 → これは正しく制御されていた
- deltaTimeの伝播不足 → 一部修正が必要だったが、根本原因ではなかった

### 2. 実際の原因（複合的）

#### 原因1: 移動速度の設定ミス
```javascript
// 修正前
this.moveSpeed = 20;  // これは「ピクセル/フレーム」として扱われていた

// 修正後
this.moveSpeed = 0.5;  // 適切な速度に調整
```

60FPSで動作する場合、速度20は1200ピクセル/秒となり、画面幅256ピクセルを0.2秒で通過してしまう。

#### 原因2: 接地判定の更新タイミング
PhysicsSystemで接地判定が物理演算の**後**に行われていたため：
1. 重力で少し落下
2. 地面との衝突で位置を戻す
3. 接地判定時には地面から1ピクセル浮いている → grounded = false
4. 次フレームで再び重力が適用される

```javascript
// 修正前の順序
update(deltaTime) {
    // 1. 物理演算（重力、移動）
    // 2. 衝突判定
    // 3. 接地判定 ← ここで判定すると既に浮いている
}

// 修正後の順序
update(deltaTime) {
    // 1. 接地判定 ← 前フレームの位置で判定
    // 2. 物理演算（重力、移動）
    // 3. 衝突判定
}
```

#### 原因3: deltaTimeの不適切な伝播
- Game.update()がdeltaTimeを受け取っていなかった
- StateManagerに固定値（frameTime）を渡していた

## 解決手順

### ステップ1: 問題の再現とログ収集
1. `tests/enemy-physics-simulation.js` - 物理演算をシミュレート
2. `tests/enemy-position-logger.html` - リアルタイムで座標を記録
3. `tests/velocity-accumulation-test.js` - 速度の累積を検証

### ステップ2: 速度の調整
```javascript
// src/entities/enemies/Slime.js
this.moveSpeed = 0.5;   // 20 → 0.5
this.jumpHeight = 5;    // 30 → 5
```

### ステップ3: PhysicsSystemの修正
```javascript
// src/physics/PhysicsSystem.js
update(deltaTime) {
    // 接地判定を最初に移動
    for (const entity of this.entities) {
        if (entity.active) {
            this.updateGroundedState(entity);
        }
    }
    
    // その後で物理演算
    // ...
}
```

### ステップ4: deltaTime伝播の修正
```javascript
// src/core/Game.js
update(deltaTime) {  // 引数を追加
    this.stateManager.update(deltaTime);  // deltaTimeを渡す
}
```

## テスト方法

### 1. シミュレーションテスト
```bash
node tests/enemy-physics-simulation.js
```
- 60フレームで敵が画面内に留まることを確認
- 最終位置が(177, 192)程度であることを確認

### 2. ブラウザでの動作確認
- http://localhost:3000/tests/enemy-behavior-monitor.html
- 敵の座標、速度、接地状態をリアルタイムで監視

## 重要な教訓

### 1. 動作確認の重要性
**必ず実際に動作確認を行う**。コードレビューだけでは見つからない問題が多い。

### 2. 単位の明確化
速度の単位（ピクセル/秒 vs ピクセル/フレーム）を明確にする。
コメントで単位を記載することが重要。

### 3. 物理演算の順序
物理システムでの処理順序は重要：
1. 状態の判定（接地など）
2. 力の適用（重力など）
3. 位置の更新
4. 衝突判定と解決

### 4. デバッグツールの活用
- 問題の可視化ツールを早期に作成
- リアルタイムモニタリングで異常を検出
- シミュレーションで仮説を検証

## 今後の改善案

1. **単体テストの追加**: PhysicsSystemの各メソッドに対するテスト
2. **定数の管理**: 物理パラメータを一箇所で管理
3. **デバッグモードの強化**: 物理演算の各ステップを可視化
4. **継続的なテスト**: コミット前の自動テスト強化

## 関連ファイル

- `/src/entities/enemies/Slime.js` - 速度設定の修正
- `/src/physics/PhysicsSystem.js` - 接地判定タイミングの修正
- `/src/core/Game.js` - deltaTime伝播の修正
- `/tests/enemy-physics-simulation.js` - 問題再現用シミュレーション
- `/tests/enemy-behavior-monitor.html` - リアルタイム監視ツール