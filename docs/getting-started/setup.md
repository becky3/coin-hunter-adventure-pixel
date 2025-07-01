---
layout: default
title: 環境構築
parent: はじめに
---

# 環境構築ガイド

## 必要な環境
- Node.js（npm）
- モダンなWebブラウザ（Chrome、Firefox、Safari等）

## セットアップ手順

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 開発サーバーの起動
```bash
npm run dev
```
デフォルトで http://localhost:3000/ でアクセス可能

### 3. ビルド
```bash
npm run build
```

## よくあるトラブルと対処法

### ポート3000が使用中の場合
別のポートで起動：
```bash
npm run dev -- --port 3001
```

### 開発サーバーが起動しない場合
依存関係を再インストール：
```bash
rm -rf node_modules package-lock.json
npm install
```

### その他のコマンド
- **コード検証**: `npm run lint`
- **テスト実行**: `npm test`
- **ビルドプレビュー**: `npm run preview`

## 開発のヒント
- Viteによるホットリロードが有効（ファイル変更時に自動リロード）
- ブラウザの開発者ツール（F12）でデバッグ可能
- http://localhost:3000/test-core-systems.html でシステムテスト画面にアクセス可能

次のステップ: [最初の一歩]({{ site.baseurl }}/getting-started/first-steps.html)に進む