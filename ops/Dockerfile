# Stage 1: Build frontend (Next.js static export)
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV NEXT_PUBLIC_API_URL="/api"
RUN npm run build

# Stage 2: Python backend (alpine + uv)
FROM python:3.12-alpine AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install curl for DB download + healthcheck
RUN apk add --no-cache curl bash

# Dependencies first (layer caching)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Backend code
COPY backend/ ./backend/
COPY scripts/ ./scripts/

# Frontend static export
COPY --from=frontend-build /app/frontend/out ./frontend/out/

# Data directory for SQLite DB
RUN mkdir -p /app/data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["bash", "scripts/entrypoint.sh"]
