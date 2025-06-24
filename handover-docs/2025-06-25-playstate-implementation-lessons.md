# PlayState実装時の問題と教訓（2025-06-25）

## 概要
Issue #11（基本的なPlayStateの実装）の作業中に発生した問題と、今後の改善点をまとめます。

## 発生した主な問題

### 1. StateManagerの不適切な使用
**問題**: Game.jsが`menu`状態以外でStateManagerを使用せず、ハードコードされた`updateTestMode()`を呼んでいた
```javascript
// 問題のあったコード
if (this.stateManager.currentStateName === 'menu') {
    this.stateManager.update(this.frameTime);
} else {
    this.updateTestMode(); // StateManagerを使わない
}
```

**影響**: PlayStateの`update()`と`render()`が呼ばれず、ゲームが動作しない

**解決策**: すべての状態でStateManagerに委譲するよう修正

### 2. キャンバスサイズの未設定
**問題**: index.jsでキャンバスのwidth/heightが設定されていなかった

**影響**: ゲーム画面が小さく左上に表示される

**解決策**: `CANVAS_SIZE`定数を使用してキャンバスサイズを設定

### 3. InputSystemのイベント名の不一致
**問題**: PlayStateが存在しないイベント名（`keyDown`/`keyUp`）を使用

**影響**: エラーが発生し、入力が機能しない

**解決策**: 正しいイベント名（`keyPress`/`keyRelease`）を使用、または`isActionPressed()`を直接使用

### 4. MusicSystemのメソッド名の不一致
**問題**: `playGameMusic()`を呼んでいたが、実際は`playGameBGM()`

**影響**: BGM再生時にエラー

## 今後の開発で注意すべきポイント

### 1. インターフェースの確認
新しいクラスを使用する前に、必ず以下を確認：
- 利用可能なメソッド名
- 期待される引数の形式
- 戻り値の型

### 2. レンダリングシステムの使用
- 直接`ctx`を使用せず、PixelRendererのメソッドを使用する
- `drawRect()`、`drawSprite()`など、スケーリングを考慮したメソッドを使用

### 3. 状態管理
- 新しい状態を追加する際は、必ずStateManagerに登録
- Game.jsに状態固有のコードを書かない

### 4. デバッグ情報の活用
- `@`キーでデバッグモードを有効化
- コンソールログを積極的に使用
- 問題の切り分けを段階的に行う

## 推奨される開発フロー

### 1. 最小限の実装から始める
```javascript
// まず動作確認用の最小実装
export class SimpleState {
    enter() { console.log('Enter SimpleState'); }
    update() { console.log('Update called'); }
    render(renderer) { 
        renderer.clear('#FF0000'); // 赤で塗りつぶし
    }
    exit() { console.log('Exit SimpleState'); }
}
```

### 2. 段階的に機能を追加
1. 基本的な描画の確認
2. 入力の確認
3. エンティティの追加
4. 物理演算の追加

### 3. 既存コードの参照
- MenuStateの実装を参考にする
- 特に入力処理とレンダリング処理

## チェックリスト

### 新しい状態を実装する際のチェックリスト
- [ ] StateManagerに登録されているか
- [ ] enter/update/render/exitメソッドが実装されているか
- [ ] PixelRendererのメソッドを使用しているか
- [ ] 入力処理は正しいイベント名/メソッドを使用しているか
- [ ] 音楽/効果音のメソッド名は正しいか
- [ ] ESLintエラーがないか

### デバッグ時のチェックリスト
- [ ] コンソールにエラーが出ていないか
- [ ] StateManagerの現在の状態は正しいか
- [ ] update/renderが呼ばれているか（ログで確認）
- [ ] 入力が検出されているか（`game.inputSystem.isActionPressed()`で確認）

## 関連Issue/PR
- Issue #11: 基本的なPlayStateの実装とステージ表示
- PR #18: PlayState実装のPR
- Issue #19: 開発効率改善（今回の経験を基に作成）

## 次のステップ
1. Issue #20, #21の実装により、今回のような問題を早期に発見できる仕組みを構築
2. テスト環境とデバッグツールの整備
3. トラブルシューティングガイドの作成（Issue #25）