---
layout: default
title: 最初の一歩
parent: はじめに
---

# 最初の一歩

環境構築が完了したら、実際にゲームを動かしてみましょう。

## ゲームの起動

1. 開発サーバーを起動します：
   ```bash
   npm run dev
   ```

2. ブラウザで http://localhost:3000/ にアクセス

3. ゲームが表示されることを確認

## 基本的な操作

- **矢印キー / A,D**: キャラクターの移動
- **Shift + 移動キー**: ダッシュ（高速移動）
- **スペースキー / W / ↑**: ジャンプ
- **. (ピリオド)**: 攻撃（パワーグローブ装備時）
- **P**: ポーズ
- **M**: 音楽のミュート切り替え

## プロジェクト構造の理解

主要なディレクトリ：
- `src/` - ソースコード
- `public/` - 静的ファイル（画像、音声など）
- `docs/` - ドキュメント
- `tests/` - テストファイル

## コードの変更を試す

1. `src/`内のファイルを編集
2. 保存すると自動的にブラウザがリロード
3. 変更が反映されることを確認

### コード例：ステート管理

ゲームステートの切り替えは型安全に行います：

```typescript
// src/types/GameStateTypes.tsで定義された定数を使用
import { GameStates } from '../types/GameStateTypes';

// メニューステートに遷移
this.game.stateManager.setState(GameStates.MENU);

// プレイステートに遷移（パラメータ付き）
this.game.stateManager.setState(GameStates.PLAY, { level: 'stage1' });
```

文字列リテラルではなく定数を使用することで、IDE補完とタイプチェックが有効になります。

## 次のステップ

- [開発ガイドライン](../development/guidelines.md) - コーディング規約やベストプラクティス
- [アーキテクチャ](../development/architecture.md) - システムの設計について
- [テストガイド](../development/testing.md) - テストの書き方と実行方法

## トラブルシューティング

問題が発生した場合は：
1. コンソールでエラーメッセージを確認
2. 開発者ツール（F12）でブラウザのコンソールを確認
3. [GitHubのIssues](https://github.com/becky3/coin-hunter-adventure-pixel/issues)で質問