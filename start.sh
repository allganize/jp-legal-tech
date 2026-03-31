#!/bin/bash
# 裁判官判決分析ダッシュボード起動スクリプト
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=== 裁判官判決分析ダッシュボード ==="
echo ""

# Start backend
echo "[1/2] Backend起動 (port 8000)..."
python3 -m uvicorn backend.main:app --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
echo "[2/2] Frontend起動 (port 3000)..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Backend:  http://localhost:8000"
echo "✓ Frontend: http://localhost:3000"
echo "✓ API Docs: http://localhost:8000/docs"
echo ""
echo "終了するにはCtrl+C"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
