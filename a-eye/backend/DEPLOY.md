# A-EYE 백엔드 무료 배포 가이드 (Hugging Face Spaces)

앱이 **앱스토어 심사를 통과하려면**, 심사관이 어디서든 접속할 수 있는
**공개 HTTPS 백엔드**가 있어야 합니다. (집 와이파이 IP나 ngrok 임시 주소로는 통과 못 합니다.)

이 모델은 **737MB + torch** 라서 RAM 2GB 이상이 필요한데,
**Hugging Face Spaces** 가 RAM 16GB를 무료로 제공해서 유일하게 맞는 무료 옵션입니다.
(Render 무료 512MB는 메모리 부족으로 실패합니다.)

---

## 1단계 — 모델 파일 업로드 (브라우저, 터미널 X)

1. https://huggingface.co 가입 (구글 계정으로 30초).
2. 우측 상단 프로필 → **New Model** → 이름 예: `aeye-model` → Create.
3. 모델 페이지 → **Files and versions** 탭 → **Add file → Upload files** →
   `best.pt` 드래그&드롭 → Commit. (대용량 LFS 자동 처리)
4. 업로드된 `best.pt` 옆 **⋯ → Copy download link** 로 직링크 복사. 형식:
   ```
   https://huggingface.co/<유저명>/aeye-model/resolve/main/best.pt
   ```
   이게 아래에서 쓸 **MODEL_URL** 입니다.

---

## 2단계 — Space(서버) 만들기 (브라우저)

1. 프로필 → **New Space**.
2. 설정:
   - **Owner / Space name**: 예 `aeye-backend`
   - **SDK**: **Docker** 선택 (중요)
   - **Hardware**: `CPU basic` (무료, 16GB RAM)
   - 공개/비공개: **Public** 권장 (앱이 호출해야 함)
3. **Create Space** → 빈 Space가 생깁니다.

---

## 3단계 — 백엔드 코드 올리기 (터미널, 명령 몇 줄)

Space는 git 저장소입니다. `a-eye/backend` 폴더 내용을 Space에 넣습니다.

```bash
# 작업 폴더에서
git clone https://huggingface.co/spaces/<유저명>/aeye-backend
cp -R "/Users/jun/Desktop/a-eye Design System/a-eye/backend/." aeye-backend/
cd aeye-backend
git add .
git commit -m "deploy A-EYE backend"
git push
```

> push 할 때 사용자명은 HF 아이디, 비밀번호는 **HF 액세스 토큰**입니다.
> 토큰: https://huggingface.co/settings/tokens → New token(write) 생성 후 비밀번호 자리에 붙여넣기.
> (`venv/`, 모델 파일은 `.gitignore`로 자동 제외됩니다.)

---

## 4단계 — 모델 주소 알려주기 (브라우저)

1. Space 페이지 → **Settings → Variables and secrets** → **New secret**.
2. 추가:
   | Name | Value |
   |------|-------|
   | `MODEL_URL` | 1단계에서 복사한 `best.pt` 직링크 |

3. Space가 자동으로 다시 빌드됩니다. 첫 빌드는 torch 설치 + 모델 다운로드로 **5~10분** 걸립니다.

### 동작 확인
Space 주소는 `https://<유저명>-aeye-backend.hf.space` 형태입니다.
```bash
curl https://<유저명>-aeye-backend.hf.space/api/health     # {"status":"ok"}
curl https://<유저명>-aeye-backend.hf.space/api/version    # model_version 표시(mock 아니면 정상)
```

---

## 5단계 — 앱에 백엔드 주소 연결

`a-eye/app.json` 의 `extra.defaultBackendUrl` 수정:
```json
"extra": {
  "defaultBackendUrl": "https://<유저명>-aeye-backend.hf.space"
}
```
이제 앱은 설치 즉시 분석이 동작합니다. (사용자는 설정에서 다른 서버로 바꿀 수도 있음)

---

## 참고
- 무료 Space는 일정 시간 미사용 시 잠들고(sleep), 다음 첫 요청 때 깨어나며 30초~1분 걸릴 수 있습니다.
  앱스토어 심사 직전에 위 `curl /api/health` 로 한 번 깨워두면 좋습니다.
- 트래픽이 늘면 Space Settings에서 유료 하드웨어로 업그레이드할 수 있습니다.

> Render/Railway/Fly.io 도 같은 `Dockerfile` + `MODEL_URL` 환경변수로 배포할 수 있습니다.
> 단, 모델 로딩에 RAM 2GB 이상 플랜이 필요하며 대부분 유료입니다.
