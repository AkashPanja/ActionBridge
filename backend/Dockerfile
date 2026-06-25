FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -sf http://localhost:8000/health || exit 1

CMD ["sh", "-c", "if [ \"$DEBUG\" = \"true\" ]; then exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload; else exec gunicorn app.main:app --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --workers ${GUNICORN_WORKERS:-4} --timeout 120; fi"]