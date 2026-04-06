#!/bin/bash
set -e

DB_PATH="/app/data/jp-legal.db"
DB_URL="https://github.com/hyominkim347/jp-legal-tech/releases/download/v0.1.0/jp-legal.db.gz"

# Download DB if not present
if [ ! -f "$DB_PATH" ]; then
    echo "[entrypoint] Database not found. Downloading from GitHub Release..."
    curl -L --progress-bar "$DB_URL" -o /tmp/jp-legal.db.gz
    echo "[entrypoint] Extracting..."
    gunzip -c /tmp/jp-legal.db.gz > "$DB_PATH"
    rm -f /tmp/jp-legal.db.gz
    echo "[entrypoint] Database ready: $(du -h "$DB_PATH" | cut -f1)"
else
    echo "[entrypoint] Database exists: $(du -h "$DB_PATH" | cut -f1)"
fi

# Start FastAPI backend (internal, port 8001)
echo "[entrypoint] Starting FastAPI on port 8001..."
uv run uvicorn backend.main:app --host 127.0.0.1 --port 8001 &

# Wait for FastAPI to be ready
for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:8001/api/health > /dev/null 2>&1; then
        echo "[entrypoint] FastAPI is ready"
        break
    fi
    sleep 1
done

# Find and start Next.js standalone server
SERVER_JS=$(find /app/frontend-standalone -name "server.js" -type f | head -1)
if [ -z "$SERVER_JS" ]; then
    echo "[entrypoint] ERROR: server.js not found in frontend-standalone"
    exit 1
fi
SERVER_DIR=$(dirname "$SERVER_JS")
echo "[entrypoint] Starting Next.js from $SERVER_DIR on port 8000..."
cd "$SERVER_DIR"
PORT=8000 exec node server.js
