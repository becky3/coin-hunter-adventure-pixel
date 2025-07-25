## GitHub プッシュ手順

以下の手順で作業を進めてください：

### 1. ブランチの確認と作成
```bash
git status  # 現在のブランチを確認
```
- mainブランチの場合は、適切なfeature/bugfixブランチを作成
- 既存のブランチの場合は、そのまま続行

### 2. 変更のコミット
```bash
git add -A
git commit -m "適切なコミットメッセージ"
```

### 3. 【重要】プッシュ前のテスト実行
**必ず以下のコマンドを使用してプッシュしてください：**

```bash
npm run push:claude
```

**このコマンドは以下を自動実行します：**
1. Lintチェック
2. 並列E2Eテスト（約80秒）
3. 成功したら自動でgit push

**注意事項：**
- Bashツールで実行する場合は `timeout: 600000` (10分) を指定
- 直接 `git push` は使用しない
- テストが失敗した場合は修正してから再実行

### 4. エラー対応
- **Lintエラー**: `npm run lint` で詳細確認、修正後に再実行
- **テストエラー**: `docs/development/testing.md` を確認
- すべてのエラーを解決してから `npm run push:claude` を再実行

### 5. PR作成
プッシュ成功後、PRを作成してください。
