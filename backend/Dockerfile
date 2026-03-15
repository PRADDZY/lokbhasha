FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-mar \
    && groupadd --system app \
    && useradd --system --gid app --create-home --home-dir /home/app app \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY --chown=app:app backend /app
RUN mkdir -p /uploads && chown -R app:app /app /uploads

ENV BACKEND_PORT=5000
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import json, sys, urllib.request; response = urllib.request.urlopen('http://127.0.0.1:5000/health', timeout=3); payload = json.load(response); sys.exit(0 if payload.get('status') == 'ok' else 1)"

USER app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
