# ドキュメント移行計画

## 概要
既存のドキュメントをGitHub Pages用の新しい構成に移行する計画です。

## 移行マッピング

### 統合されたドキュメント

#### 開発ガイドライン（→ docs-site/development/guidelines.md）
以下のファイルを統合：
- DEVELOPMENT_GUIDELINES.md
- DEVELOPMENT_RULES.md
- DEVELOPMENT_TIPS.md
- CODING_STANDARDS.md
- NAMING_CONVENTION.md

#### アーキテクチャ（→ docs-site/development/architecture.md）
以下のファイルを統合：
- ARCHITECTURE.md
- ARCHITECTURE_IMPROVEMENT_PLAN.md

#### テストガイド（→ docs-site/development/testing.md）
以下のファイルを統合：
- TESTING_GUIDE.md
- MANUAL_TEST_GUIDE.md

#### 環境構築（→ docs-site/getting-started/setup.md）
以下から抽出：
- DEVELOPMENT_GUIDE.md（環境構築部分）

### 移行されたドキュメント

| 旧ファイル | 新ファイル |
|-----------|-----------|
| GAME_SPECIFICATION.md | docs-site/specifications/game.md |
| TECHNICAL_SPECIFICATION.md | docs-site/specifications/technical.md |
| PIXEL_ART_SPECIFICATION.md | docs-site/resources/pixel-art.md |

### アーカイブ予定のドキュメント

以下のファイルは新サイトに統合済みのため、アーカイブフォルダに移動予定：
- DATE_HANDLING_GUIDE.md（技術仕様に統合）
- IMPLEMENTATION_CHECKLIST.md（開発ガイドラインに統合）
- IMPLEMENTATION_ROADMAP.md（アーキテクチャに統合）
- TYPESCRIPT_MIGRATION.md（完了済みのため不要）

### 保持するドキュメント

以下のファイルは引き続きdocsディレクトリに保持：
- README.md（プロジェクトルートのREADMEから参照）
- handover-docs/（引き継ぎ資料）

## 実装手順

1. ✅ GitHub Pages用の新構成を作成
2. ✅ 既存ドキュメントの内容を統合・移行
3. ⏳ アーカイブフォルダ（docs/archive/）を作成
4. ⏳ 不要になったドキュメントをアーカイブに移動
5. ⏳ プロジェクトのREADMEとCLAUDE.mdを更新

## 次のステップ

1. このブランチでPRを作成
2. レビューと承認
3. マージ後、GitHub Pagesの設定を有効化
4. ドキュメントサイトのURLを関係者に共有