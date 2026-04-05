FROM python:3.12-slim

WORKDIR /app

# Install system deps for curl (DB download)
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir fastapi uvicorn sqlalchemy aiohttp pydantic pydantic-settings python-dotenv anthropic google-genai

# Copy backend code
COPY backend/ backend/
COPY scripts/ scripts/

# Ensure data directory exists (Railway volume mounts here)
RUN mkdir -p /app/data
RUN chmod +x scripts/entrypoint.sh

ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

CMD ["bash", "scripts/entrypoint.sh"]
