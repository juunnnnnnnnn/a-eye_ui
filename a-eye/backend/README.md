---
title: A-EYE Backend
emoji: 🧠
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 8000
pinned: false
---

# A-EYE 백엔드

FastAPI 기반 이미지 판별 서버입니다. `MODEL_PATH` 파일이 없거나 비어 있으면 MOCK 모드로 실행되어 앱 end-to-end 테스트가 가능합니다.

## 실행

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 팀원 모델 파일 적용

구글드라이브에서 받은 `best22.pt`는 GitHub에 올리지 않습니다. 각자 내려받은 뒤 파일 이름을 `best.pt`로 바꿔서 아래 위치에 넣어 주세요.

```bash
mkdir -p models
cp ~/Downloads/best22.pt models/best.pt
echo "24_realworld_artifact_30ep" > models/best.pt.version.txt
```

`.env`의 `MODEL_PATH`는 기본값 그대로 두면 됩니다.

```bash
MODEL_PATH=./models/best.pt
```

## 모델 교체

1. `models/best.pt`를 실제 모델 파일로 교체합니다.
2. 선택 사항으로 `models/best.pt.version.txt`의 버전을 갱신합니다.
3. `uvicorn`을 재시작합니다.

코드 수정은 필요 없습니다.

## GPU 사용

기본은 CPU 로딩입니다. GPU 서버에서는 `model_loader.py`의 `map_location`을 환경에 맞춰 조정하거나 배포 이미지에서 CUDA PyTorch를 설치하세요.

## CORS

개발 편의를 위해 모든 origin을 허용합니다. 운영 환경에서는 `main.py`의 `allow_origins`를 앱 도메인 또는 배포된 클라이언트 주소로 좁히세요.
