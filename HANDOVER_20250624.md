# 引き継ぎ資料 - 2025年6月24日

## 概要
coin-hunter-adventure-pixelプロジェクトのMenuState実装およびInputSystem実装が完了しました。

## 完了した作業

### 1. InputSystem実装（Issue #10関連）
- **ファイル**: `src/core/InputSystem.js`
- **内容**: イベントベースの入力管理システムを実装
- **特徴**:
  - キーの状態変化をフレーム単位で正確に検出
  - `justPressedKeys`/`justReleasedKeys`で今フレームの変化を記録
  - イベントリスナーシステムでコンポーネント間の疎結合を実現
  - アクションマッピング（例: 'jump' → ['Space', 'ArrowUp', 'KeyW']）

### 2. MenuState実装（Issue #10）
- **ファイル**: `src/states/MenuState.js`
- **機能**:
  - タイトル画面の表示とアニメーション
  - メニュー選択（START GAME/HOW TO PLAY/CREDITS）
  - HOW TO PLAY画面とCREDITS画面の表示
  - 音楽ミュート機能（Mキー）
  - InputSystemを使用したイベントベースの入力処理

### 3. デバッグモード実装
- **トグルキー**: @キー（JISキーボードではBracketLeft）
- **表示内容**:
  - FPS
  - 現在のゲーム状態
  - 押されているキー
  - 音楽システムの状態
- **実装箇所**: `src/core/Game.js`の`renderDebugOverlay()`メソッド

### 4. その他の変更
- InputManagerを削除（InputSystemに完全移行）
- NAMING_CONVENTION.mdドキュメントを追加
- CLAUDE.mdに開発サーバー起動の注意事項を追加

## 現在の状態

### 動作確認済み
- ✅ メニュー画面の表示とナビゲーション
- ✅ HOW TO PLAY/CREDITS画面への遷移と復帰
- ✅ 音楽の再生とミュート切り替え
- ✅ デバッグモードのON/OFF（@キー）
- ✅ デバッグ情報の表示

### 既知の問題
- START GAMEを選択するとエラーが発生（PlayStateが未実装のため）

## 次の作業（推奨）

### 1. PlayState実装（Issue #11）
**優先度: 高**

PlayStateはゲームのメイン画面です。以下の実装が必要：
- ゲームループの実装
- プレイヤーの操作と移動
- レベルの読み込みと表示
- エンティティの管理
- 当たり判定システム
- カメラ追従

**参考ファイル**:
- `old_project_achive/testAction/js/states/PlayState.js`（SVG版の実装）
- `src/entities/Player.js`（既に実装済み）

### 2. AssetLoader実装（Issue #5）
**優先度: 中**

ゲームアセット（画像、音声）の読み込みシステムが必要です。

### 3. LevelLoader実装（Issue #6）
**優先度: 中**

レベルデータの読み込みとパース機能が必要です。

## 技術的な注意点

### InputSystemの使い方
```javascript
// イベントリスナーの登録
const removeListener = this.game.inputSystem.on('keyPress', (event) => {
    if (event.action === 'jump') {
        // ジャンプ処理
    }
});

// リスナーの解除（重要！）
removeListener();

// ポーリング方式でのチェック
if (this.game.inputSystem.isActionJustPressed('jump')) {
    // ジャンプ処理
}
```

### デバッグモード
- 開発中は@キーでデバッグモードをONにすると便利
- FPSやキー入力状態が確認できる

### 開発サーバー
```bash
cd /mnt/d/claude/pixelAction/coin-hunter-adventure-pixel
npm run dev
```
※ サーバー起動はユーザー側で行う（トークン消費を避けるため）

## 参考資料
- `DEVELOPMENT_RULES.md` - 開発ルール
- `CODING_STANDARDS.md` - コーディング規約
- `ARCHITECTURE.md` - アーキテクチャ設計
- `docs/GAME_SPECIFICATION.md` - ゲーム仕様
- `docs/IMPLEMENTATION_ROADMAP.md` - 実装ロードマップ

## コミット履歴
- InputSystem実装とMenuState対応
- HOW TO PLAY/CREDITS画面の不具合修正
- デバッグモード（@キー）の動作修正

以上