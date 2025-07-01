# 開発ガイド

## 開発環境のセットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 開発サーバーの起動

#### 通常起動（フォアグラウンド）
```bash
npm run dev
```
※ この方法ではターミナルがブロックされます

#### バックグラウンド起動（推奨）
```bash
# バックグラウンドで起動
nohup npm run dev > dev-server.log 2>&1 &

# ログを確認
tail -f dev-server.log

# プロセスを確認
ps aux | grep vite | grep -v grep
```

### 3. 開発サーバーへのアクセス
- メインページ: http://localhost:3000/
- コアシステムテスト: http://localhost:3000/test-core-systems.html

### 4. 開発サーバーの停止
```bash
# Viteプロセスを検索
ps aux | grep vite | grep -v grep

# プロセスIDを確認してkill
kill [プロセスID]

# または一括で停止
pkill -f vite
```

## 動作確認

### コアシステムテスト
`test-core-systems.html` で以下を確認できます：

1. **システム状態**
   - InputManager: キーボード/マウス入力
   - GameStateManager: ゲーム状態管理
   - AssetLoader: アセット読み込み
   - PixelRenderer: 描画システム
   - LevelLoader: レベル管理

2. **入力テスト**
   - 矢印キー/WASD: 方向入力
   - Space/Up/W: ジャンプ
   - Enter/E: アクション
   - @: デバッグモード切り替え

3. **デバッグ情報**
   - F12で開発者ツールを開く
   - コンソールでシステムログを確認

## ビルド

### プロダクションビルド
```bash
npm run build
```

### ビルドのプレビュー
```bash
npm run preview
```

## コード品質

### ESLint実行
```bash
npm run lint

# 自動修正
npm run lint:fix
```

### テスト実行
```bash
npm test

# ウォッチモード
npm run test:watch

# カバレッジ付き
npm run test:coverage
```

## トラブルシューティング

### ポート3000が使用中の場合
```bash
# 使用中のプロセスを確認
lsof -i :3000

# 別のポートで起動（例: 3001）
npm run dev -- --port 3001
```

### 開発サーバーが起動しない場合
1. node_modulesを削除して再インストール
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. キャッシュをクリア
   ```bash
   npm cache clean --force
   ```

### ブラウザでアクセスできない場合
1. ブラウザのキャッシュをクリア（Ctrl+F5）
2. 別のブラウザで試す
3. http://127.0.0.1:3000 でアクセス
4. ファイアウォール設定を確認

## 開発のヒント

### ホットリロード
Viteは自動的にファイルの変更を検出し、ブラウザをリロードします。

### デバッグ
- `console.log`を活用
- ブラウザの開発者ツールでブレークポイントを設定
- `window.game`でGameインスタンスにアクセス可能（デバッグ用）

### パフォーマンス
- Chrome DevToolsのPerformanceタブで計測
- 60FPSを維持できているか確認