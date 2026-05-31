# A-EYE 추론 백엔드 — 클라우드 배포용 이미지
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MODEL_PATH=/app/models/best.pt

WORKDIR /app

# grad-cam(opencv) 실행에 필요한 시스템 라이브러리
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# CPU 전용 torch/torchvision 을 먼저 설치해 이미지 용량을 줄입니다.
RUN pip install --upgrade pip \
    && pip install torch==2.5.1 torchvision==0.20.1 \
       --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# 모델 다운로드/캐시가 가능하도록 쓰기 가능 디렉터리 보장
# (Hugging Face Spaces 등 비루트 사용자로 실행되는 환경 대비)
RUN mkdir -p /app/models && chmod -R 777 /app/models

# 클라우드 플랫폼이 주입하는 $PORT 를 사용합니다(없으면 8000).
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
