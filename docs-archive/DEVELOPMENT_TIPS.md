# 開発効率向上のヒント

## Viteキャッシュ問題の対処法

### 1. 設定による対策（実装済み）
`vite.config.js` に以下の設定を追加済み：
- `watch.usePolling: true` - ファイル変更の確実な検知
- `optimizeDeps.force: true` - 依存関係キャッシュの強制再構築
- `esbuild.incremental: false` - インクリメンタルビルドの無効化

### 2. 開発時の推奨手順

#### ファイル変更時
1. ファイルを保存
2. ブラウザのコンソールで `[vite] hot updated: ...` メッセージを確認
3. メッセージが出ない場合は手動リロード（F5）

#### 大きな変更時
- モジュールの追加/削除
- 設定ファイルの変更
- npm パッケージの更新

これらの場合は、一度サーバーを再起動：
```bash
# Ctrl+C でサーバー停止後
npm run dev
```

### 3. ブラウザ側の対策

#### 開発者ツールの設定
1. F12で開発者ツールを開く
2. Network タブ → "Disable cache" にチェック
3. 開発者ツールを開いたまま作業

#### 強制リロード
- Windows/Linux: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

### 4. トラブルシューティング

#### 変更が反映されない場合
```bash
# 1. Viteキャッシュをクリア
rm -rf node_modules/.vite

# 2. サーバー再起動
npm run dev
```

#### それでも解決しない場合
```bash
# 1. 全プロセスを停止
pkill -f vite

# 2. ポートを確認
lsof -i :3000

# 3. クリーンスタート
rm -rf node_modules/.vite
npm run dev
```

## その他の開発効率化

### VSCode拡張機能
- **Vite** - Vite統合
- **ESLint** - リアルタイムエラー検出
- **Prettier** - コードフォーマット

### ホットキー
- `@` - ゲーム内デバッグモード切替
- `F12` - 開発者ツール
- `Ctrl+Shift+I` - 要素検証

### デバッグテクニック
1. `console.log` にラベルを付ける
   ```javascript
   console.log('===== PLAYER UPDATE =====', playerState);
   ```

2. 条件付きブレークポイント
   ```javascript
   if (this.vy < -10) {
       debugger; // 異常な速度の時だけ停止
   }
   ```

3. パフォーマンス計測
   ```javascript
   console.time('update');
   // 処理
   console.timeEnd('update');
   ```