FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-mar \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /app/requirements.txt

COPY backend /app
COPY uploads /uploads

ENV BACKEND_PORT=5000
EXPOSE 5000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
