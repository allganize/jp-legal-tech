# Stage 1: Build frontend (Next.js static export)
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV NEXT_PUBLIC_API_URL="/api"
RUN npm run build

# Stage 2: Python backend
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir uv

# Python dependencies
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy backend
COPY backend/ ./backend/
COPY scripts/ ./scripts/

# Copy frontend static export
COPY --from=frontend-build /app/frontend/out ./frontend/out/

# Data directory for SQLite DB
RUN mkdir -p /app/data

ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["bash", "scripts/entrypoint.sh"]
