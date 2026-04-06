# Stage 1: Build frontend (Next.js standalone)
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV NEXT_PUBLIC_API_URL=""
RUN npm run build

# Stage 2: Python backend + Node.js runtime
FROM python:3.12-slim

WORKDIR /app

# Install curl (for DB download + healthcheck) and Node.js runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir uv

# Python dependencies
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy backend
COPY backend/ ./backend/
COPY scripts/ ./scripts/

# Copy Next.js standalone build
COPY --from=frontend-build /app/frontend/.next/standalone ./frontend-standalone/
COPY --from=frontend-build /app/frontend/.next/static ./frontend-standalone/.next/static/
COPY --from=frontend-build /app/frontend/public ./frontend-standalone/public/

# Data directory for SQLite DB
RUN mkdir -p /app/data

ENV PYTHONPATH=/app
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["bash", "scripts/entrypoint.sh"]
