# Stage 1: Build frontend (Next.js standalone)
FROM node:22-alpine AS frontend-build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
ENV NEXT_PUBLIC_API_URL=""
RUN cd frontend && npm run build && \
    echo "=== standalone structure ===" && \
    find frontend/.next/standalone -name "server.js" -type f

# Stage 2: Python backend (alpine + uv)
FROM python:3.12-alpine AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install curl (healthcheck) + Node.js runtime (Next.js standalone)
RUN apk add --no-cache curl bash nodejs

WORKDIR /app

# Python dependencies (layer caching)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Backend code
COPY backend/ ./backend/
COPY scripts/ ./scripts/

# Next.js standalone build — copy entire standalone dir, then static + public
COPY --from=frontend-build /app/frontend/.next/standalone/ ./frontend-standalone/
COPY --from=frontend-build /app/frontend/.next/static ./frontend-standalone/frontend/.next/static/
COPY --from=frontend-build /app/frontend/public ./frontend-standalone/frontend/public/

# Data directory for SQLite DB
RUN mkdir -p /app/data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/api/health || exit 1

CMD ["bash", "scripts/entrypoint.sh"]
