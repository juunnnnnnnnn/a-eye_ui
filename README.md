# A-EYE — AI 이미지 판별기

AI로 생성된 이미지와 실제 사진을 판별하는 A-EYE 프로젝트입니다. 이 저장소에는 기존 웹 목업과, iPhone Expo Go에서 바로 테스트할 수 있는 실제 모바일 앱/백엔드가 함께 들어 있습니다.

## 소개

구조, 맥락, 디테일 세 가지 시선의 모델이 이미지를 교차 검증해 단일 점수로 결과를 제공합니다. 단순히 AI 여부만 알려주는 것이 아니라, 판별 근거와 세부 점수까지 함께 보여줍니다.

## 실제 모바일 앱 실행

실제 앱 코드는 `a-eye/` 폴더에 있습니다. 팀원은 저장소를 받은 뒤 아래 순서대로 실행하면 됩니다.

```bash
cd a-eye
npm install
```

모델 파일은 GitHub에 올리지 않습니다. 구글드라이브에서 `best22.pt`를 받은 뒤 파일 이름을 `best.pt`로 바꿔서 아래 위치에 넣어 주세요.

```bash
mkdir -p backend/models
cp ~/Downloads/best22.pt backend/models/best.pt
echo "24_realworld_artifact_30ep" > backend/models/best.pt.version.txt
```

백엔드 실행:

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

모바일 앱 실행:

```bash
cd ..
npx expo install --check
npx expo start --tunnel
```

iPhone 카메라로 QR 코드를 스캔하면 Expo Go에서 앱이 열립니다. 같은 와이파이에서 테스트할 때 앱 설정의 백엔드 URL은 각자 컴퓨터 IP에 맞춰 입력합니다.

```text
http://192.168.x.x:8000
```

자세한 설명은 `a-eye/README.md`를 확인하세요.

## 웹 목업 실행

기존 웹 목업은 별도 빌드 없이 로컬 서버만 띄우면 바로 실행됩니다.

```bash
python3 -m http.server 8080
```

브라우저에서 접속:
- 앱: http://localhost:8080/a-eye%20App.html
- 목업: http://localhost:8080/a-eye%20Mockup.html

## 구조

```
├── a-eye/                 # Expo 모바일 앱 + FastAPI 백엔드
├── a-eye App.html         # 웹 인터랙티브 앱 메인
├── a-eye Mockup.html      # 웹 정적 목업
├── colors_and_type.css    # 웹 목업 디자인 토큰
├── assets/                # 웹 목업 로고 SVG
└── ui_kits/a-eye-app/
    ├── InteractiveApp.jsx  # 앱 전체 로직 및 화면
    ├── Screens.jsx         # 각 화면 컴포넌트
    ├── Icons.jsx           # 아이콘 모음
    └── Phone.jsx           # 폰 프레임 컴포넌트
```

## 주요 기능

- 이미지 업로드 / 카메라 촬영으로 분석 시작
- AI 생성 확률 점수 및 세부 분석 결과 제공
- 분석 기록 자동 저장 및 히스토리 조회
- 라이트 / 다크 / 시스템 테마 지원
- 온보딩 슬라이드 (3단계)
