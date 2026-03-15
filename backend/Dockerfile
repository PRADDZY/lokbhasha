FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

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

USER app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
