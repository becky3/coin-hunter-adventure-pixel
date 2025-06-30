# Coin Hunter Adventure Pixel Documentation

このディレクトリにはGitHub Pagesで公開されるプロジェクトドキュメントが含まれています。

## ローカルでの確認方法

```bash
cd docs-site
bundle install
bundle exec jekyll serve
```

http://localhost:4000 でプレビューできます。

## ドキュメント構成

- `/` - ホームページ
- `/getting-started/` - 初心者向けガイド
- `/development/` - 開発者向けドキュメント
- `/specifications/` - 詳細仕様書
- `/resources/` - リソースとアセット仕様

## 編集時の注意

- 各Markdownファイルの先頭にはJekyllのfront matterが必要です
- 新しいページを追加する場合は、適切なディレクトリに配置してください
- 画像などのアセットは`assets/`ディレクトリに保存してください