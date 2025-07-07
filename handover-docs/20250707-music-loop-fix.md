# 音楽ループシステムの修正 (Issue #105)

## 対応日
2025年1月7日

## 概要
音楽のループ再生が正常に動作しない問題を修正しました。

## 問題の詳細

### 報告された症状
1. プレイ中の音楽が正常にループ再生されない
2. ゲームオーバーなどを経てタイトルに戻ると、タイトル曲もループしなくなる
3. ループの位置がおかしくなる

### 原因分析

#### 1. 新旧システムの混在
- **旧システム**: MusicSystem内にハードコードされた音楽データ（`playTitleBGM()`, `playGameBGM()`など）
- **新システム**: JSONファイルベースの音楽データ
- 両システムが混在し、フォールバック処理で旧システムが呼ばれることがあった

#### 2. 複雑なループ管理
- 各トラックが独立した`setTimeout`でループ
- タイミングのずれが蓄積
- `trackIntervals`というMapで各トラックを個別管理

#### 3. オブジェクト参照比較の問題
```javascript
if (!this.currentMusicConfig || this.currentMusicConfig !== config) {
    // configオブジェクトの参照比較が失敗してループが停止
}
```

#### 4. 重複BGM呼び出し
- 同じBGMが既に再生中でも`stopBGM()`を呼んで自己停止

## 実施した修正

### 1. 旧システムの完全削除
- ハードコードされた音楽実装をすべて削除
- `setInterval`ベースのループを削除
- `bgmLoopInterval`変数とその関連処理を削除

### 2. シンプルなループ実装
```javascript
// 旧: 各トラック独立のループ
trackIntervals: Map<string, NodeJS.Timeout>

// 新: 単一のループ管理
patternLoopTimeout: NodeJS.Timeout | null
```

- 全トラックを1つのループとして管理
- 単一の`setTimeout`で次のループをスケジュール
- 最長トラックの`duration`に合わせて全体をループ

### 3. ループ継続条件の改善
```javascript
// 旧: オブジェクト参照比較
if (!this.currentMusicConfig || this.currentMusicConfig !== config)

// 新: BGM状態のみチェック
if (!this.currentBGM || !this.currentMusicConfig)
```

### 4. 重複再生の防止
```javascript
// 既に再生中の同じBGMは再起動しない
if (this.currentBGM === name) {
    return;
}
```

### 5. 音楽データの調整
ループシステムの変更に伴い、曲データも調整：

#### ゲームBGM（game.json）
- 全トラックを8ビートパターンに統一
- ドラムパターンを拡張（後半にフィルイン追加）
- ベースラインを8ビートに拡張
- リードメロディを`times`ベースに変更

#### タイトルBGM（title.json）
- 全トラックに`duration: 4`を明示

## 学んだ教訓

### 1. シンプルさの重要性
- 複雑なトラック管理より、単一ループの方が確実
- Web Audio APIのタイミングとJavaScriptタイマーを混在させない

### 2. 移行の完全性
- 新旧システムの混在は避ける
- フォールバック処理は一時的なものとして、早期に削除

### 3. 音楽データの設計
- 全トラックの長さを統一することで、ループ管理が簡単に
- `duration`パラメータの重要性

## 今後の改善案

### 1. Web Audio APIのスケジューリング活用
現在は`setTimeout`でループしているが、Web Audio APIの`AudioContext.currentTime`を使った精密なスケジューリングに移行できる。

### 2. 音楽エディタの作成
JSONを直接編集するのではなく、ビジュアルな音楽エディタがあると便利。

### 3. クロスフェード機能
BGM切り替え時にクロスフェードできると、より自然な遷移になる。

## 関連ファイル
- `/src/audio/MusicSystem.ts` - 音楽システムの実装
- `/src/config/resources/bgm/*.json` - BGMデータ
- `/docs/music-pattern-system.md` - 音楽パターンシステムのドキュメント

## テスト方法
1. ゲームを起動してタイトル画面の音楽がループすることを確認
2. ゲームを開始してプレイ中の音楽がループすることを確認
3. ゲームオーバー後にタイトルに戻っても音楽が正常にループすることを確認
4. コンソールでエラーが出ていないことを確認

## 注意事項
- `startAt`と`repeatEvery`パラメータは廃止
- 代わりに`times`配列と`duration`を使用
- 全トラックの`duration`を統一することが重要