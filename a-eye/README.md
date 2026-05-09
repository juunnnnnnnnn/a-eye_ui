# A-EYE

A-EYE는 AI 생성 이미지 가능성과 의심 영역을 휴대폰에서 바로 확인하는 Expo 모바일 앱과 FastAPI 추론 서버로 구성된 프로젝트입니다. 모바일 앱은 Expo SDK 54 managed workflow로 고정되어 iPhone의 App Store판 Expo Go에서 QR 스캔만으로 테스트할 수 있습니다.

## 1. 개요

- 모바일: Expo SDK 54, expo-router, TypeScript strict, Expo Go 호환 패키지
- 백엔드: FastAPI, PyTorch, Pillow, Grad-CAM fallback 포함
- 추론: 서버/API 방식
- 모델 교체: `backend/models/best.pt` 파일 교체 후 서버 재시작
- 히스토리 저장: 이미지 base64 저장 금지, 파일 URI와 결과 JSON만 AsyncStorage에 저장

## 2. 사전 준비

- Node 20 이상
- Python 3.11 이상
- iPhone 또는 Android 기기
- Expo Go 앱
- ngrok 또는 HTTPS 터널 도구

## 3. 설치 순서

GitHub에는 코드만 올라갑니다. 실제 모델 파일은 용량이 크기 때문에 구글드라이브에서 따로 내려받아야 합니다.

```bash
git clone <GitHub 저장소 주소>
cd a-eye
npm install
```

구글드라이브에서 `best22.pt`를 다운로드한 뒤, 파일 이름을 `best.pt`로 바꿔서 백엔드 모델 폴더에 넣습니다.

```bash
mkdir -p backend/models
cp ~/Downloads/best22.pt backend/models/best.pt
echo "24_realworld_artifact_30ep" > backend/models/best.pt.version.txt
```

파일 위치는 반드시 아래처럼 맞춰야 합니다.

```text
a-eye/backend/models/best.pt
```


## 4. 백엔드 실행

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

모델 파일이 없거나 비어 있으면 MOCK 모드로 시작합니다. 이 상태에서도 `/api/analyze`는 200 응답을 반환하므로 앱 전체 흐름을 바로 테스트할 수 있습니다.

같은 와이파이에서 iPhone Expo Go로 테스트한다면 보통 ngrok 없이도 됩니다. Mac의 로컬 IP가 `192.168.0.21`이라면 앱 설정 화면에 아래 주소를 입력하세요.

```text
http://192.168.0.21:8000
```

외부 네트워크에서 접속해야 하면 ngrok을 사용합니다.

```bash
ngrok http 8000
```

ngrok에서 받은 `https://...` 주소를 앱의 설정 화면에 입력하고 `연결 테스트`를 누르세요.

## 5. 모바일 앱 실행 (iPhone Expo Go 테스트)

```bash
npm install
npx expo install --check
npx expo start --tunnel
```

iPhone 카메라로 QR 코드를 스캔하면 Expo Go가 자동 실행됩니다. SDK는 `expo@~54.0.34`로 고정되어 있습니다.

## 6. 모델 교체 방법 (코드 수정 0)

1. 새 모델 파일을 `backend/models/best.pt`로 교체
2. 선택 사항으로 `backend/models/best.pt.version.txt` 갱신
3. `uvicorn` 재시작
4. 앱 → 설정 → `모델 버전` 확인

`MODEL_PATH` 환경변수로 다른 모델 경로를 지정할 수도 있습니다.

## 7. Google Play Store 배포

```bash
npm install -g eas-cli
eas login
eas init
eas build --platform android --profile production
eas submit --platform android --profile production
```

- Play Console에서 service account JSON 발급
- 첫 출시: internal track → 14일 closed testing → production
- 필수: 개인정보 처리방침 URL, AI 정확도 디스클레이머, 데이터 안전 섹션

## 8. GitHub에 올리지 않는 파일

아래 파일과 폴더는 로컬 실행용이므로 GitHub에 올리지 않습니다.

- `node_modules/`
- `.expo/`
- `backend/venv/`
- `backend/.env`
- `backend/__pycache__/`
- `backend/models/*.pt`
- `play-service-account.json`

팀원이 필요한 모델은 구글드라이브에서 `best22.pt`를 받은 뒤 `best.pt`로 이름을 바꿔 사용하면 됩니다.

## 9. 운영 메모

개발 중 CORS는 모두 허용되어 있습니다. 운영 배포에서는 `backend/main.py`의 `allow_origins`를 실제 앱/관리 도메인으로 좁히세요.

AI 판별 결과는 보조 지표입니다. 법적 판단이나 공개 제재의 단독 근거로 쓰지 말고 원본 출처, 촬영 맥락, 메타데이터를 함께 확인해야 합니다.

## 10. 완료 체크리스트

- [x] `npx expo install --check` 버전 미스매치 0
- [x] `npx expo-doctor` 경고 0
- [x] `tsc --noEmit` 에러 0
- [x] `npx expo start --tunnel` QR 코드 생성
- [x] 8개 화면 구현
- [x] 백엔드 MOCK 모드 구현
- [x] `POST /api/analyze`, `GET /api/version`, `GET /api/health` 구현
- [x] 네트워크 30초 타임아웃과 사용자 친화 오류 표시
- [x] AsyncStorage 히스토리 보존과 용량 초과 시 오래된 기록 삭제
- [x] 큰 이미지 base64 저장 금지
- [ ] `eas build --platform android --profile preview` APK 생성
- [x] HTML `form` 태그 사용 0, `localStorage` 사용 0, 웹 전용 API 사용 0
