#!/bin/bash

echo "=== Vite Startup Debug Test ==="
echo "Starting at: $(date)"

# 環境変数を設定してデバッグモードで起動
export DEBUG=vite:*

echo -e "\n[1] Starting Vite with debug logging..."
START_TIME=$(date +%s)

# Viteを起動して最初の数行のログを表示
timeout 30s npm run dev 2>&1 | tee vite-debug.log &
VITE_PID=$!

# Viteが起動するまで待つ
echo -e "\n[2] Waiting for Vite to be ready..."
while ! grep -q "ready in" vite-debug.log 2>/dev/null; do
    sleep 0.5
done

echo -e "\n[3] Vite is ready. Now making first request..."
echo "This may take several minutes on first access..."

# 別のターミナルでリクエストの詳細を確認
time curl -v http://localhost:3000/ 2>&1 | head -50

# プロセスを終了
kill $VITE_PID 2>/dev/null

echo -e "\n=== Key findings from log ==="
grep -E "(ready in|transform|resolve|load)" vite-debug.log | head -20