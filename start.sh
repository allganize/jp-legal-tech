#!/bin/bash
# 판사 판결 분석 대시보드 기동 스크립트
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=== 판사 판결 분석 대시보드 ==="
echo ""

# Start backend
echo "[1/2] Backend 기동 (port 8000)..."
python3 -m uvicorn backend.main:app --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
echo "[2/2] Frontend 기동 (port 3000)..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Backend:  http://localhost:8000"
echo "✓ Frontend: http://localhost:3000"
echo "✓ API Docs: http://localhost:8000/docs"
echo ""
echo "종료하려면 Ctrl+C"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
