#!/bin/bash

# Git hooksのセットアップスクリプト

echo "Setting up Git hooks..."

# pre-commit hookをコピー
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "✅ Git hooks setup completed!"
echo "Pre-commit hook will run:"
echo "  - Lint check"
echo "  - TypeScript type check"
echo "  - Build check"