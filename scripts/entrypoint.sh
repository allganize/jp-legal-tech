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

# Start FastAPI (serves both API and frontend static files)
echo "[entrypoint] Starting uvicorn on port ${PORT:-8000}..."
exec uv run uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8000}"
