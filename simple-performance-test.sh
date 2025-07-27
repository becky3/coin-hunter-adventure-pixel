#!/bin/bash

echo "=== Simple Performance Test ==="
echo "Starting at: $(date)"

# Viteサーバーを起動してログを記録
echo -e "\n[1] Starting Vite server..."
START_TIME=$(date +%s%3N)

# バックグラウンドでViteを起動し、出力をファイルにリダイレクト
npm run dev > vite-startup.log 2>&1 &
VITE_PID=$!

echo "Vite PID: $VITE_PID"

# Viteが起動するまで待つ
echo "[2] Waiting for Vite to be ready..."
while ! grep -q "ready in" vite-startup.log 2>/dev/null; do
    sleep 0.1
done

VITE_READY_TIME=$(date +%s%3N)
VITE_STARTUP_TIME=$((VITE_READY_TIME - START_TIME))
echo "Vite ready in ${VITE_STARTUP_TIME}ms"

# Viteの起動時間を抽出
VITE_REPORTED_TIME=$(grep "ready in" vite-startup.log | grep -oE "[0-9]+ ms" | grep -oE "[0-9]+")
echo "Vite reported ready in ${VITE_REPORTED_TIME}ms"

# curlで初回アクセス
echo -e "\n[3] First access with curl..."
CURL_START=$(date +%s%3N)
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nTotal time: %{time_total}s\n" http://localhost:3000/
CURL_END=$(date +%s%3N)
CURL_TIME=$((CURL_END - CURL_START))
echo "Curl request took ${CURL_TIME}ms"

# プロセスをクリーンアップ
echo -e "\n[4] Cleaning up..."
kill $VITE_PID
wait $VITE_PID 2>/dev/null

# 結果サマリー
echo -e "\n=== Summary ==="
echo "Vite startup time: ${VITE_STARTUP_TIME}ms (reported: ${VITE_REPORTED_TIME}ms)"
echo "First HTTP request: ${CURL_TIME}ms"
echo "Total time: $((CURL_END - START_TIME))ms"

# ログファイルを表示
echo -e "\n=== Vite startup log ==="
cat vite-startup.log