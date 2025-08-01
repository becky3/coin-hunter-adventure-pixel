#!/bin/bash

# Pre-commit hook: Run checks before commit

# 1. Lint check
echo "Running lint check..."
npm run lint

if [ $? -ne 0 ]; then
    echo "❌ Lint errors detected. Please fix them before committing."
    exit 1
fi

echo "✅ Lint check passed"

# 2. TypeScript type check
echo "Running TypeScript type check..."
npm run typecheck

if [ $? -ne 0 ]; then
    echo "❌ TypeScript type errors detected. Please fix them before committing."
    exit 1
fi

echo "✅ TypeScript check passed"

# 3. Duplicate code check
echo "Running duplicate code check..."
npm run jscpd:check

if [ $? -ne 0 ]; then
    echo "❌ Duplicate code detected. Please refactor duplicate code before committing."
    exit 1
fi

echo "✅ Duplicate code check passed"

# 4. Build check
echo "Running build check..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors before committing."
    exit 1
fi

echo "✅ Build check passed"

echo "✅ All checks passed!"
exit 0