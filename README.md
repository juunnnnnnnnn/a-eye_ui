# A-EYE — AI 이미지 판별기

AI로 생성된 이미지와 실제 사진을 판별하는 모바일 앱 UI 프로토타입입니다.

## 소개

구조, 맥락, 디테일 세 가지 시선의 모델이 이미지를 교차 검증해 단일 점수로 결과를 제공합니다. 단순히 AI 여부만 알려주는 것이 아니라, 판별 근거와 세부 점수까지 함께 보여줍니다.

## 실행 방법

별도 빌드 없이 로컬 서버만 띄우면 바로 실행됩니다.

```bash
python3 -m http.server 8080
```

브라우저에서 접속:
- 앱: http://localhost:8080/a-eye%20App.html
- 목업: http://localhost:8080/a-eye%20Mockup.html

## 구조

```
├── a-eye App.html         # 인터랙티브 앱 메인
├── a-eye Mockup.html      # 정적 목업
├── colors_and_type.css    # 디자인 토큰 (색상, 타이포)
├── assets/                # 로고 SVG
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
