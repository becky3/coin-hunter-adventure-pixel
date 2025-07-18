# サウンドテスト機能実装 - 引き継ぎ資料

**作成日**: 2025年7月18日  
**対応Issue**: #182  
**PR**: #184

## 実装概要

タイトル画面からアクセスできるサウンドテスト機能を実装しました。開発者がBGMとSEを簡単にテストできるようになりました。

## 主な変更内容

### 1. 新規ファイル
- `src/states/SoundTestState.ts` - サウンドテスト画面の実装
- `src/config/resources/se/powerup.json` - 不足していたパワーアップ効果音

### 2. 既存ファイルの変更
- `src/states/MenuState.ts` - SOUND TESTメニューオプション追加
- `src/core/GameCore.ts` - SoundTestStateの登録
- `src/config/ResourceLoader.ts` - powerupをSEリストに追加
- `src/data/bundledData.ts` - powerup.jsonのバンドル追加

### 3. SEフォーマットの統一
以下のファイルを`frequencies`フォーマットから`notes`フォーマットに変換：
- `jump.json` - 440Hz → "A4", 880Hz → "A5"
- `damage.json` - 下降音を段階的な音階で表現
- `button.json` - 800Hz → "G5"
- `enemyDefeat.json` - 周波数変化を音階で表現

### 4. 不要なコードの削除
- `MusicSystem.ts`から`playFrequencyRamp`メソッドを削除
- `FrequencyRamp`型のimportを削除

## 技術的な詳細

### frequencies vs notes
- **frequencies**: 周波数を直接指定する古い形式（例: `{ "start": 440, "end": 880 }`）
- **notes**: 音階名で指定する新しい形式（例: `["A4", "A5"]`）

MusicSystemは`notes`形式のみをサポートしているため、すべてのSEファイルを統一しました。

### UI改善
1. タイトル画面の操作説明位置を調整（184→200、192→208）
2. 再生中インジケータ（♪）を削除
3. 矢印表記をドットフォント対応に変更（[↑↓]→[UP/DN]、[←→]→[LT/RT]）

## 操作方法
- **上下キー**: BGM/SE/QUITの選択
- **左右キー**: 曲の切り替え
- **SPACE**: BGMは再生/停止、SEは単発再生
- **M**: ミュート切り替え

## 利用可能な音源

### BGM（4曲）
- TITLE - タイトル画面BGM
- GAME - ゲーム中BGM
- VICTORY - 勝利BGM
- GAMEOVER - ゲームオーバーBGM

### SE（8種類）
- COIN - コイン取得
- JUMP - ジャンプ
- DAMAGE - ダメージ
- BUTTON - ボタン操作
- POWERUP - パワーアップ
- GAMESTART - ゲーム開始
- GOAL - ゴール到達
- ENEMYDEFEAT - 敵撃破

## 今後の拡張性

### 新しいBGM/SEの追加方法
1. `/src/config/resources/bgm/`または`/se/`に新しいJSONファイルを作成
2. `ResourceLoader.ts`の`bgmFiles`または`seFiles`配列に追加
3. `bundledData.ts`にimportとエクスポートを追加
4. `SoundTestState.ts`のmenuItemsに追加（必要に応じて）

### 注意点
- 必ず`notes`フォーマットを使用すること
- テスト時はサウンドテスト機能で動作確認を行う
- 音量バランスに注意（0.1〜0.5推奨）

## トラブルシューティング

### 音が鳴らない場合
1. ブラウザのコンソールでエラーを確認
2. JSONファイルの構文エラーをチェック
3. ResourceLoaderに正しく登録されているか確認
4. bundledData.tsに追加されているか確認

### 音が歪む場合
- volumeパラメータを下げる（0.1〜0.3推奨）
- envelopeパラメータで音の立ち上がりを調整

## 関連ドキュメントの更新
- `docs/music-pattern-system.md` - サウンドテスト機能の説明追加
- `docs/specifications/game.md` - ゲームフローにSOUND TEST追加
- `docs/development/architecture.md` - GameStateManagerの説明更新
- `docs/development/testing.md` - 音響システムのテスト項目追加