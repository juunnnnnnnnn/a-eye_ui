const { useEffect, useMemo, useRef, useState } = React;

const STORAGE_KEY = "a-eye-app-state-v1";
const MAX_HISTORY_ITEMS = 8;
const MAX_UPLOAD_PREVIEW_SIZE = 720;
const UPLOAD_PREVIEW_QUALITY = 0.76;
const PLACEHOLDER_IMAGE_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2306B6D4'/%3E%3Cstop offset='1' stop-color='%235B6BFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='640' fill='%23F1F5F9'/%3E%3Ccircle cx='250' cy='260' r='120' fill='none' stroke='url(%23g)' stroke-width='18' opacity='.8'/%3E%3Ccircle cx='390' cy='260' r='120' fill='none' stroke='url(%23g)' stroke-width='18' opacity='.62'/%3E%3Ccircle cx='320' cy='380' r='120' fill='none' stroke='url(%23g)' stroke-width='18' opacity='.72'/%3E%3Ccircle cx='320' cy='300' r='34' fill='url(%23g)'/%3E%3C/svg%3E";

const SAMPLE_LIBRARY = [
  {
    id: "sample-ai",
    name: "campaign_portrait_v2.png",
    src: IMG_AIART,
    preset: "ai",
    note: "광고용 스타일 이미지",
  },
  {
    id: "sample-real",
    name: "editorial_portrait.jpg",
    src: IMG_PORTRAIT,
    preset: "real",
    note: "실사 인물 사진",
  },
  {
    id: "sample-uncertain",
    name: "city_evening.jpeg",
    src: IMG_CITY,
    preset: "uncertain",
    note: "야경 기반 장면 사진",
  },
];

const ONBOARDING_PAGES = [
  {
    title: "구조, 맥락, 디테일",
    accent: "세 시선이 하나의 결론으로.",
    body: "서로 다른 관점의 모델이 같은 이미지를 교차 검증해서,\n직관적인 하나의 판단 점수로 정리합니다.",
    labels: ["STRUCTURE", "CONTEXT", "DETAIL"],
  },
  {
    title: "결과보다 과정까지",
    accent: "왜 이런 점수가 나왔는지 보여줍니다.",
    body: "단순히 AI 같다고 말하는 데서 끝나지 않고,\n세부 점수와 요약 설명을 함께 제공합니다.",
    labels: ["SCAN", "VERIFY", "SUMMARY"],
  },
  {
    title: "빠르게 확인하고 저장",
    accent: "반복 분석도 한 흐름 안에서.",
    body: "이미지를 업로드하면 결과가 히스토리에 자동으로 저장되고,\n언제든 다시 꺼내볼 수 있습니다.",
    labels: ["UPLOAD", "ANALYZE", "HISTORY"],
  },
];

const DEFAULT_SETTINGS = {
  autoSaveHistory: true,
  includeOriginal: false,
  themeMode: "system",
};

function readStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { history: [], settings: DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw);
    return {
      history: Array.isArray(parsed.history) ? parsed.history.map(normalizeHistoryItem).filter(Boolean).slice(0, MAX_HISTORY_ITEMS) : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch (error) {
    return { history: [], settings: DEFAULT_SETTINGS };
  }
}

function normalizeHistoryItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const score = Number.isFinite(item.score) ? item.score : 50;
  const status = ["ai", "real", "uncertain"].includes(item.status)
    ? item.status
    : score >= 72 ? "ai" : score <= 28 ? "real" : "uncertain";
  const meta = getStatusMeta(status, score);
  const structure = Number.isFinite(item.breakdown?.structure) ? item.breakdown.structure : score;
  const context = Number.isFinite(item.breakdown?.context) ? item.breakdown.context : score;
  const detail = Number.isFinite(item.breakdown?.detail) ? item.breakdown.detail : score;

  return {
    ...item,
    id: item.id || `result-restored-${hashString(`${item.name || "image"}-${score}-${item.analyzedAt || ""}`)}`,
    name: item.name || "restored-image.jpg",
    src: item.src || PLACEHOLDER_IMAGE_SRC,
    preset: item.preset || "upload",
    analyzedAt: item.analyzedAt || new Date().toISOString(),
    score,
    status,
    summaryTitle: item.summaryTitle || meta.title,
    summaryLine: item.summaryLine || meta.line,
    pillLabel: item.pillLabel || meta.pill,
    breakdown: { structure, context, detail },
    note: item.note || "저장된 분석 이미지",
    sizeLabel: item.sizeLabel || "저장된 파일",
  };
}

function makePersistableHistory(history, stripUploadImages = false) {
  return history.slice(0, MAX_HISTORY_ITEMS).map((item) => {
    if (!stripUploadImages || item.preset !== "upload") {
      return item;
    }
    return {
      ...item,
      src: PLACEHOLDER_IMAGE_SRC,
      note: `${item.note || "사용자가 업로드한 이미지"} · 미리보기는 저장 공간 보호를 위해 대체 이미지로 보관됨`,
    };
  });
}

function persistState(history, settings) {
  const attempts = [
    makePersistableHistory(history, false),
    makePersistableHistory(history.slice(0, 4), false),
    makePersistableHistory(history.slice(0, 4), true),
    [],
  ];

  for (const persistableHistory of attempts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ history: persistableHistory, settings }));
      return true;
    } catch (error) {
      // Try the smaller payload below. Large phone photos can exceed localStorage.
    }
  }

  return false;
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getStatusMeta(status, score) {
  if (status === "ai") {
    return {
      title: "AI 생성 가능성 높음",
      line: `AI로 생성되었을 확률이 ${score}%입니다.`,
      pill: "AI 생성 · 확신도 높음",
    };
  }
  if (status === "real") {
    return {
      title: "실사 가능성 높음",
      line: `실제 사진일 확률이 ${100 - score}%입니다.`,
      pill: "실사 · 비교적 안정적",
    };
  }
  return {
    title: "추가 확인 필요",
    line: `AI 생성 확률이 ${score}%로, 판단이 어렵습니다.`,
    pill: "불확실 · 재확인 권장",
  };
}

function getEvidencePoints(result) {
  const { status } = result;
  const breakdown = result.breakdown || {
    structure: result.score || 50,
    context: result.score || 50,
    detail: result.score || 50,
  };
  if (status === "ai") {
    return [
      { value: breakdown.structure, text: "패치 경계선에서 반복적인 생성 흔적이 감지됐습니다", level: "high" },
      { value: breakdown.context, text: "배경과 피사체 사이의 맥락 불일치가 확인됐습니다", level: "high" },
      { value: breakdown.detail, text: "피부·질감에서 인공적인 균일성이 나타납니다", level: "high" },
    ].sort((a, b) => b.value - a.value).slice(0, 3);
  }
  if (status === "real") {
    return [
      { value: breakdown.structure, text: "자연스러운 노이즈와 구조 패턴이 확인됐습니다", level: "safe" },
      { value: breakdown.context, text: "조명과 그림자의 물리적 일관성이 유지됩니다", level: "safe" },
      { value: breakdown.detail, text: "유기적인 질감과 자연스러운 경계선이 관찰됩니다", level: "safe" },
    ].sort((a, b) => a.value - b.value).slice(0, 3);
  }
  return [
    { text: "AI 생성 패턴과 실사 패턴이 혼재합니다", level: "mid" },
    { text: "모델 간 의견 불일치로 추가 검토가 필요합니다", level: "mid" },
    { text: "고해상도 원본으로 재분석을 권장합니다", level: "mid" },
  ];
}

function ShareCardModal({ result, onClose }) {
  const isAi = result.status === "ai";
  const isReal = result.status === "real";
  const statusLabel = isAi ? "AI 생성" : isReal ? "실사 사진" : "판단 불확실";

  return (
    <div
      onClick={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.68)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", borderRadius: 28, overflow: "hidden", background: "var(--bg)", boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)" }}>

        {/* 카드 헤더 */}
        <div style={{ padding: "28px 24px 22px", background: "linear-gradient(135deg, var(--grad-from), var(--grad-to))", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, position: "relative" }}>
          <div style={{ font: "800 11px/1 var(--font-mono)", color: "rgba(255,255,255,0.6)", letterSpacing: "0.2em" }}>A — EYE</div>
          <div style={{ width: 88, height: 88, borderRadius: 999, border: "2.5px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ font: "800 30px/1 var(--font-mono)", color: "#fff" }}>{result.score}</div>
            <div style={{ font: "600 11px/1 var(--font-sans)", color: "rgba(255,255,255,0.65)", marginTop: 2 }}>%</div>
          </div>
          <div style={{ padding: "5px 16px", borderRadius: 999, background: "rgba(255,255,255,0.22)", font: "700 12px/1 var(--font-sans)", color: "#fff", letterSpacing: "0.06em" }}>{statusLabel}</div>
        </div>

        {/* 카드 바디 */}
        <div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* 이미지 + 파일명 */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `center/cover url(${result.src})`, border: "1px solid var(--border)", flexShrink: 0 }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "600 12px/1.3 var(--font-sans)", color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.name}</div>
              <div style={{ font: "400 11px/1.3 var(--font-sans)", color: "var(--fg-muted)", marginTop: 3 }}>{formatWhen(result.analyzedAt)}</div>
            </div>
          </div>

          {/* 3축 점수 */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "구조", value: result.breakdown.structure },
              { label: "맥락", value: result.breakdown.context },
              { label: "디테일", value: result.breakdown.detail },
            ].map((item) => (
              <div key={item.label} style={{ flex: 1, padding: "10px 6px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ font: "700 15px/1 var(--font-mono)", color: "var(--fg)" }}>{item.value}<span style={{ font: "500 10px/1 var(--font-mono)", color: "var(--fg-muted)" }}>%</span></div>
                <div style={{ font: "500 10px/1 var(--font-sans)", color: "var(--fg-muted)", marginTop: 5 }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ font: "400 12px/1.55 var(--font-sans)", color: "var(--fg-muted)", textAlign: "center" }}>{result.summaryLine}</div>

          {/* 버튼 */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--fg-muted)", font: "600 13px/1 var(--font-sans)", cursor: "pointer" }}>닫기</button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "A-EYE 판별 결과", text: `${result.name} — ${result.summaryLine}` });
                } else {
                  alert("공유 기능은 모바일에서 지원됩니다.");
                }
              }}
              style={{ flex: 2, padding: "12px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, var(--grad-from), var(--grad-to))", color: "#fff", font: "600 13px/1 var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer" }}
            >
              <IconShare size={14}/> 공유하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function createXaiFindings(seed, status, score) {
  const baseIntensity = status === "ai" ? 0.86 : status === "uncertain" ? 0.64 : 0.34;
  const labels = status === "real"
    ? ["압축 흔적", "조명 편차", "질감 변화"]
    : ["경계선 왜곡", "피부 질감 반복", "배경 패턴 불일치"];

  return [0, 1, 2].map((index) => {
    const offset = seed >> (index * 5);
    const width = 22 + (offset % 12);
    const height = 18 + ((offset >> 3) % 14);
    const left = clamp(18 + ((offset >> 5) % 52), 8, 76);
    const top = clamp(16 + ((offset >> 8) % 50), 8, 76);
    const intensity = clamp(Math.round((baseIntensity * 100) - index * 9 + (score % 7)), 24, 96);

    return {
      id: `xai-${index + 1}`,
      label: labels[index],
      left,
      top,
      width,
      height,
      intensity,
    };
  }).sort((a, b) => b.intensity - a.intensity);
}

function getResultXai(result) {
  if (result.xai?.findings?.length) {
    return result.xai;
  }

  const seed = hashString(`${result.name}-${result.score}-${result.status}`);
  const findings = createXaiFindings(seed, result.status, result.score);
  return {
    coverage: Math.round(findings.reduce((sum, item) => sum + item.intensity, 0) / findings.length),
    findings,
  };
}

function createImagePreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const originalSrc = reader.result;

      if (!file.type.startsWith("image/")) {
        resolve(originalSrc);
        return;
      }

      const image = new Image();
      image.onload = () => {
        try {
          const scale = Math.min(1, MAX_UPLOAD_PREVIEW_SIZE / Math.max(image.width, image.height));
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");

          if (!context) {
            resolve(originalSrc);
            return;
          }

          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", UPLOAD_PREVIEW_QUALITY));
        } catch (error) {
          resolve(originalSrc);
        }
      };
      image.onerror = () => resolve(originalSrc);
      image.src = originalSrc;
    };

    reader.readAsDataURL(file);
  });
}

function createAnalysis(image) {
  const fingerprint = `${image.name}-${image.preset || "upload"}-${image.size || 0}-${image.lastModified || 0}`;
  const seed = hashString(fingerprint);

  let score;
  if (image.preset === "ai") {
    score = 82 + (seed % 13);
  } else if (image.preset === "real") {
    score = 8 + (seed % 17);
  } else if (image.preset === "uncertain") {
    score = 43 + (seed % 18);
  } else {
    score = 18 + (seed % 68);
  }

  let status = "uncertain";
  if (score >= 72) {
    status = "ai";
  } else if (score <= 28) {
    status = "real";
  }

  const structure = clamp(score + ((seed % 15) - 7), 3, 98);
  const context = clamp(score + (((seed >> 3) % 17) - 8), 3, 98);
  const detail = clamp(score + (((seed >> 7) % 13) - 6), 3, 98);
  const meta = getStatusMeta(status, score);

  return {
    id: `result-${Date.now()}-${seed}`,
    name: image.name,
    src: image.src,
    preset: image.preset || "upload",
    analyzedAt: new Date().toISOString(),
    score,
    status,
    summaryTitle: meta.title,
    summaryLine: meta.line,
    pillLabel: meta.pill,
    breakdown: { structure, context, detail },
    xai: {
      coverage: Math.round((structure + context + detail) / 3),
      findings: createXaiFindings(seed, status, score),
    },
    note: image.note || "사용자가 업로드한 이미지",
    sizeLabel: image.sizeLabel || "로컬 파일",
  };
}

function formatWhen(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function StatusBar({ time = "9:41" }) {
  return (
    <div className="status-bar">
      <div style={{ font: "600 13px/1 var(--font-sans)" }}>{time}</div>
      <div className="icons" style={{ color: "var(--fg)" }}>
        <StatusSignal/>
        <StatusWifi/>
        <StatusBattery/>
      </div>
    </div>
  );
}

function DeviceShell({ theme, children }) {
  return (
    <div className="phone">
      <div className={`phone-screen ${theme === "dark" ? "theme-dark" : ""}`}>
        <div className="notch"></div>
        <StatusBar/>
        <div className="screen-body">{children}</div>
        <div className="home-indicator"></div>
      </div>
    </div>
  );
}

function IconButton({ children, ariaLabel, onClick }) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--fg)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function InteractiveNav({ active, onSelect }) {
  const items = [
    { key: "home", label: "홈", Icon: IconHome },
    { key: "history", label: "기록", Icon: IconHistory },
    { key: "settings", label: "설정", Icon: IconSettings },
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "12px 28px 28px",
        display: "flex",
        justifyContent: "space-around",
        background: "color-mix(in oklab, var(--surface) 82%, transparent)",
        backdropFilter: "blur(20px) saturate(160%)",
        borderTop: "1px solid var(--border)",
      }}
    >
      {items.map(({ key, label, Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: isActive ? "var(--primary)" : "var(--fg-muted)",
              fontWeight: isActive ? 600 : 500,
              background: "transparent",
              border: 0,
              cursor: "pointer",
            }}
          >
            <Icon size={22} sw={isActive ? 2 : 1.7}/>
            <span style={{ font: `${isActive ? 600 : 500} 10px/1 var(--font-sans)`, letterSpacing: "0.02em" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SplashView() {
  return (
    <div
      className="noise-bg"
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 20,
        overflow: "hidden",
      }}
    >
      <div className="glow-orb" style={{ width: 240, height: 240, background: "var(--secondary)", top: "30%", left: "20%" }}/>
      <div className="glow-orb" style={{ width: 280, height: 280, background: "var(--primary)", top: "40%", right: "15%" }}/>

      <div
        style={{
          position: "relative",
          width: 132,
          height: 132,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle, color-mix(in oklab, var(--secondary) 18%, transparent) 0%, transparent 70%)",
        }}
      >
        <Logo size={108}/>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ font: "800 36px/1 var(--font-sans)", letterSpacing: "0.06em", color: "var(--fg)" }}>A-EYE</div>
        <div style={{ marginTop: 10, font: "500 13px/1.4 var(--font-sans)", color: "var(--fg-muted)", letterSpacing: "0.02em" }}>AI 이미지 판별기</div>
      </div>

    </div>
  );
}

function OnboardingView({ index, onNext, onSkip }) {
  const step = ONBOARDING_PAGES[index];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "20px 28px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark/>
        <button onClick={onSkip} style={{ font: "500 13px/1 var(--font-sans)", color: "var(--fg-muted)", background: "none", border: 0, cursor: "pointer" }}>건너뛰기</button>
      </div>

      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="glow-orb" style={{ width: 260, height: 260, background: index === 1 ? "var(--secondary)" : "var(--primary)", opacity: 0.22, position: "absolute" }}/>
        <svg viewBox="0 0 280 220" width="280" height="220" style={{ position: "relative" }}>
          <defs>
            <linearGradient id="app-ob-a" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--grad-from)" stopOpacity="0.72"/>
              <stop offset="100%" stopColor="var(--grad-from)" stopOpacity="0.1"/>
            </linearGradient>
            <linearGradient id="app-ob-b" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--grad-to)" stopOpacity="0.76"/>
              <stop offset="100%" stopColor="var(--grad-to)" stopOpacity="0.12"/>
            </linearGradient>
            <linearGradient id="app-ob-c" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--secondary)" stopOpacity="0.82"/>
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.26"/>
            </linearGradient>
            <linearGradient id="txt-a" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--grad-from)"/>
              <stop offset="100%" stopColor="var(--grad-from)" stopOpacity="0.7"/>
            </linearGradient>
            <linearGradient id="txt-b" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--grad-to)"/>
              <stop offset="100%" stopColor="var(--secondary)"/>
            </linearGradient>
            <linearGradient id="txt-c" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--secondary)"/>
              <stop offset="100%" stopColor="var(--grad-to)"/>
            </linearGradient>
          </defs>
          <circle cx="100" cy="90" r="62" fill="none" stroke="url(#app-ob-a)" strokeWidth="3.5"/>
          <circle cx="180" cy="90" r="62" fill="none" stroke="url(#app-ob-b)" strokeWidth="3.5"/>
          <circle cx="140" cy="140" r="62" fill="none" stroke="url(#app-ob-c)" strokeWidth="3.5"/>
          <circle cx="140" cy="106" r="14" fill="url(#app-ob-c)"/>
          <circle cx="140" cy="106" r="6" fill="var(--surface)"/>
          <text x="85" y="72" textAnchor="middle" fill="url(#txt-a)" fontFamily="var(--font-mono)" fontSize="12" fontWeight="800" letterSpacing="0.1em">{step.labels[0]}</text>
          <text x="195" y="72" textAnchor="middle" fill="url(#txt-b)" fontFamily="var(--font-mono)" fontSize="12" fontWeight="800" letterSpacing="0.1em">{step.labels[1]}</text>
          <text x="140" y="176" textAnchor="middle" fill="url(#txt-c)" fontFamily="var(--font-mono)" fontSize="12" fontWeight="800" letterSpacing="0.1em">{step.labels[2]}</text>
        </svg>
      </div>

      <div>
        <div style={{ font: "700 22px/1.18 var(--font-sans)", letterSpacing: "-0.04em", color: "var(--fg)" }}>
          {step.title}
          <br/>
          <span style={{ color: "var(--fg-muted)", fontWeight: 500 }}>{step.accent}</span>
        </div>
        <p style={{ marginTop: 12, font: "400 13px/1.58 var(--font-sans)", color: "var(--fg-muted)", whiteSpace: "pre-line" }}>{step.body}</p>

        <button className="aeye-cta" style={{ width: "100%" }} onClick={onNext}>
          {index === ONBOARDING_PAGES.length - 1 ? "시작하기" : "다음"} <IconChevR size={16}/>
        </button>
      </div>
    </div>
  );
}

function HomeView({
  resolvedTheme,
  history,
  onOpenSettings,
  onOpenHistory,
  onChooseFile,
  onChooseCamera,
  onToggleTheme,
}) {
  const recent = history.slice(0, 3);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingBottom: 88 }}>
      <AppBar
        right={
          <>
            <IconButton ariaLabel="theme" onClick={onToggleTheme}>
              {resolvedTheme === "dark" ? <IconMoon size={18}/> : <IconSun size={18}/>}
            </IconButton>
            <IconButton ariaLabel="history" onClick={onOpenHistory}>
              <IconHistory size={18}/>
            </IconButton>
          </>
        }
      />

      <div style={{ padding: "8px 20px", overflowY: "auto", flex: 1 }}>
        <h1 style={{ font: "700 26px/1.2 var(--font-sans)", letterSpacing: "-0.03em", color: "var(--fg)", margin: "4px 0 18px" }}>
          진짜와 가짜를 <span className="aeye-gradient-text">가려내볼까요?</span>
        </h1>

        <div
          style={{
            position: "relative",
            padding: 22,
            borderRadius: 20,
            border: "1.5px dashed var(--border-strong)",
            background: "color-mix(in oklab, var(--surface) 74%, transparent)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, var(--grad-from), var(--grad-to))",
              color: "#fff",
              boxShadow: "var(--glow-primary)",
            }}
          >
            <IconUpload size={28} sw={2}/>
          </div>
          <div style={{ font: "600 14px/1.45 var(--font-sans)", color: "var(--fg)", textAlign: "center" }}>
            이미지를 업로드하거나 예시 이미지로<br/>분석을 시작하세요
          </div>
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <button
              onClick={onChooseFile}
              style={{
                flex: 1,
                padding: "11px 12px",
                borderRadius: 12,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--fg)",
                font: "600 13px/1 var(--font-sans)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <IconImage size={16}/> 파일 선택
            </button>
            <button
              onClick={onChooseCamera}
              style={{
                flex: 1,
                padding: "11px 12px",
                borderRadius: 12,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--fg)",
                font: "600 13px/1 var(--font-sans)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <IconCamera size={16}/> 카메라 촬영
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ font: "600 14px/1 var(--font-sans)", color: "var(--fg)", marginBottom: 10 }}>최근 분석</div>
          {recent.length === 0 ? (
            <div style={{ padding: 14, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--fg-muted)", font: "500 12px/1.45 var(--font-sans)" }}>
              아직 기록이 없습니다. 예시 이미지나 파일을 선택해서 첫 분석을 시작해보세요.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {recent.map((item) => (
                <div key={item.id} style={{ padding: 12, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
                  <div style={{ width: 54, height: 54, borderRadius: 12, background: `center/cover url(${item.src})`, border: "1px solid var(--border)" }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "600 12px/1.35 var(--font-sans)", color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    <div style={{ marginTop: 4, font: "500 11px/1 var(--font-sans)", color: item.status === "ai" ? "var(--status-ai)" : item.status === "real" ? "var(--status-real)" : "var(--status-uncertain)" }}>
                      {item.score}% · {item.summaryTitle}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <InteractiveNav active="home" onSelect={(key) => key === "settings" ? onOpenSettings() : key === "history" ? onOpenHistory() : null}/>
    </div>
  );
}

function AnalyzingView({ image, progress }) {
  const steps = [
    { state: progress >= 25 ? "done" : "active", label: "이미지 구조 패치 분석" },
    { state: progress >= 50 ? "done" : progress >= 25 ? "active" : "pending", label: "맥락 일관성 교차 검증" },
    { state: progress >= 75 ? "done" : progress >= 50 ? "active" : "pending", label: "디테일 판독 및 흔적 탐색" },
    { state: progress >= 95 ? "done" : progress >= 75 ? "active" : "pending", label: "최종 결과 종합" },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <AppBar right={<span style={{ font: "500 12px/1 var(--font-mono)", color: "var(--fg-muted)" }}>{Math.min(progress, 99)}%</span>}/>
      <div style={{ padding: "8px 24px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ font: "700 22px/1.2 var(--font-sans)", letterSpacing: "-0.03em", color: "var(--fg)", marginTop: 4 }}>
          분석 중<span style={{ color: "var(--secondary)" }}>...</span>
        </div>
        <div style={{ font: "400 13px/1.45 var(--font-sans)", color: "var(--fg-muted)", marginTop: 4 }}>
          세 시선 모델이 이미지를 교차 검증하고 있어요
        </div>

        <div
          style={{
            marginTop: 18,
            position: "relative",
            aspectRatio: "1 / 1",
            borderRadius: 18,
            overflow: "hidden",
            background: `center/cover url(${image.src})`,
            boxShadow: "var(--shadow-2)",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0,0,0,0.3) 100%)" }}/>
          <div className="scan-line"/>
          <div style={{ position: "absolute", left: 14, bottom: 14, padding: "6px 9px", borderRadius: 999, background: "rgba(15,23,42,0.68)", color: "#fff", font: "600 11px/1 var(--font-sans)", backdropFilter: "blur(10px)" }}>
            {image.name}
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map((step, index) => {
            const isDone = step.state === "done";
            const isActive = step.state === "active";
            const dotBg = isDone ? "linear-gradient(135deg, var(--grad-from), var(--grad-to))" : isActive ? "color-mix(in oklab, var(--secondary) 16%, transparent)" : "var(--surface-2)";
            const color = isDone || isActive ? "var(--fg)" : "var(--fg-muted)";
            return (
              <div key={index} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: 999, background: dotBg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: isActive ? "1.5px solid var(--secondary)" : "1px solid var(--border)" }}>
                  {isDone && <IconCheck size={12} sw={3}/>}
                  {isActive && <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--secondary)", boxShadow: "0 0 8px var(--secondary)" }}/>}
                </div>
                <div style={{ font: `${isActive ? 600 : 500} 13px/1.35 var(--font-sans)`, color, flex: 1 }}>{step.label}</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18, height: 8, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, var(--grad-from), var(--grad-to))", transition: "width 280ms ease" }}/>
        </div>

        <div style={{ flex: 1 }}/>
        <div style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--fg-muted)", textAlign: "center", padding: "0 12px 12px", fontStyle: "italic" }}>
          AI는 종종 디테일에서 흔적을 남깁니다
        </div>
      </div>
    </div>
  );
}

function XaiHeatmap({ result }) {
  const xai = getResultXai(result);
  const findings = xai.findings?.length ? xai.findings : createXaiFindings(hashString(result.name || "image"), result.status || "uncertain", result.score || 50);
  const strongest = findings[0] || { intensity: 50 };
  const coverage = Number.isFinite(xai.coverage)
    ? xai.coverage
    : Math.round(findings.reduce((sum, item) => sum + item.intensity, 0) / Math.max(findings.length, 1));
  const heatmapBackground = findings.map((finding) => {
    const centerX = finding.left + finding.width / 2;
    const centerY = finding.top + finding.height / 2;
    const alpha = 0.2 + finding.intensity / 180;
    return `radial-gradient(ellipse at ${centerX}% ${centerY}%, rgba(239,68,68,${alpha}) 0%, rgba(245,158,11,${alpha * 0.62}) 24%, rgba(6,182,212,0.08) 48%, transparent 70%)`;
  }).join(", ");

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ font: "700 12px/1 var(--font-sans)", color: "var(--fg)", letterSpacing: "0.04em", textTransform: "uppercase" }}>의심 구역</div>
        <div style={{ font: "700 11px/1 var(--font-mono)", color: strongest.intensity >= 70 ? "var(--status-ai)" : "var(--status-uncertain)" }}>
          {coverage}%
        </div>
      </div>

      <div style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 18, overflow: "hidden", background: `center/cover url(${result.src})`, border: "1px solid var(--border)", boxShadow: "var(--shadow-2)" }}>
        <div style={{ position: "absolute", inset: 0, background: heatmapBackground, mixBlendMode: "screen" }}/>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,23,42,0.02), rgba(15,23,42,0.32))" }}/>
        {findings.map((finding, index) => (
          <div
            key={finding.id}
            style={{
              position: "absolute",
              left: `${finding.left}%`,
              top: `${finding.top}%`,
              width: `${finding.width}%`,
              height: `${finding.height}%`,
              borderRadius: 16,
              border: "1.5px solid rgba(255,255,255,0.88)",
              boxShadow: "0 0 0 1px rgba(239,68,68,0.45), 0 0 24px rgba(239,68,68,0.45)",
              background: "rgba(239,68,68,0.16)",
            }}
          >
            <span style={{ position: "absolute", left: -8, top: -10, width: 22, height: 22, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--status-ai)", color: "#fff", font: "800 11px/1 var(--font-mono)", boxShadow: "0 8px 18px rgba(15,23,42,0.26)" }}>
              {index + 1}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
        {findings.map((finding, index) => (
          <div key={finding.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
            <span style={{ width: 20, height: 20, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: index === 0 ? "var(--status-ai)" : "var(--surface-2)", border: index !== 0 ? "1px solid var(--border)" : "none", color: index === 0 ? "#fff" : "var(--fg-muted)", font: "800 10px/1 var(--font-mono)", flexShrink: 0 }}>{index + 1}</span>
            <span style={{ flex: 1, font: "500 12px/1.2 var(--font-sans)", color: "var(--fg)" }}>{finding.label}</span>
            <span style={{ font: "700 11px/1 var(--font-mono)", color: index === 0 ? "var(--status-ai)" : "var(--fg-muted)" }}>{finding.intensity}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultView({ result, expanded, onToggleExpanded, onRestart, onOpenHistory, onGoHome }) {
  const [showShare, setShowShare] = useState(false);
  if (!result) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AppBar
          right={
            <IconButton ariaLabel="home" onClick={onGoHome}>
              <IconHome size={16}/>
            </IconButton>
          }
        />
        <div style={{ padding: "34px 24px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--primary)" }}>
            <IconInfo size={26}/>
          </div>
          <div style={{ font: "800 22px/1.2 var(--font-sans)", letterSpacing: "-0.03em", color: "var(--fg)" }}>결과를 불러오지 못했어요</div>
          <div style={{ font: "400 13px/1.55 var(--font-sans)", color: "var(--fg-muted)" }}>분석 데이터가 비어 있거나 손상되었습니다. 홈에서 다시 분석을 시작해 주세요.</div>
          <button className="aeye-cta" onClick={onGoHome} style={{ marginTop: 6, width: "100%" }}>
            홈으로 돌아가기 <IconChevR size={16}/>
          </button>
        </div>
      </div>
    );
  }
  const evidencePoints = getEvidencePoints(result);
  const dotColor = { high: "var(--status-ai)", safe: "var(--status-real)", mid: "var(--status-uncertain)" };
  const statusColor = result.status === "ai" ? "#EF4444" : result.status === "real" ? "#10B981" : "#F59E0B";
  const statusSoft = result.status === "ai" ? "rgba(239,68,68,0.08)" : result.status === "real" ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)";
  const statusBorder = result.status === "ai" ? "rgba(239,68,68,0.3)" : result.status === "real" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)";
  const verdictText = result.status === "ai" ? "AI 생성 사진" : result.status === "real" ? "실제 사진" : "판단 불확실";
  const displayScore = result.status === "real" ? 100 - result.score : result.score;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <AppBar
        right={
          <>
            <IconButton ariaLabel="history" onClick={onOpenHistory}>
              <IconHistory size={16}/>
            </IconButton>
            <IconButton ariaLabel="home" onClick={onGoHome}>
              <IconHome size={16}/>
            </IconButton>
          </>
        }
      />
      <div style={{ padding: "8px 24px 28px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: `center/cover url(${result.src})`, border: "1px solid var(--border)" }}/>
          <div style={{ flex: 1 }}>
            <div style={{ font: "600 13px/1.2 var(--font-sans)", color: "var(--fg)" }}>{result.name}</div>
            <div style={{ font: "400 11px/1.35 var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>{result.sizeLabel} · {formatWhen(result.analyzedAt)}</div>
          </div>
        </div>

        {/* 판별 결과 히어로 */}
        <div style={{ marginTop: 16, borderRadius: 20, background: statusSoft, border: `1px solid ${statusBorder}` }}>
          <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 999, background: "var(--surface)", border: `2px solid ${statusBorder}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ font: "800 28px/1 var(--font-mono)", color: statusColor, letterSpacing: "-0.04em" }}>{displayScore}</div>
              <div style={{ font: "600 9px/1 var(--font-mono)", color: statusColor, opacity: 0.7, marginTop: 3, letterSpacing: "0.08em" }}>%</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "800 18px/1.2 var(--font-sans)", letterSpacing: "-0.03em", color: "var(--fg)", marginBottom: 6 }}>{verdictText}</div>
              <div style={{ font: "400 12px/1.5 var(--font-sans)", color: "var(--fg-muted)" }}>{result.summaryLine}</div>
            </div>
          </div>
          <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ height: 5, borderRadius: 999, background: "var(--surface)", overflow: "hidden" }}>
              <div style={{ width: `${displayScore}%`, height: "100%", borderRadius: 999, background: statusColor }}/>
            </div>
            <ConfidencePill status={result.status}>{result.pillLabel}</ConfidencePill>
          </div>
        </div>

        {/* 판별 근거 */}
        <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ font: "600 10px/1 var(--font-mono)", color: "var(--fg-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 11 }}>판별 근거</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {evidencePoints.map((point, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 7, height: 7, borderRadius: 999, background: dotColor[point.level], marginTop: 4, flexShrink: 0, boxShadow: `0 0 6px ${dotColor[point.level]}` }}/>
                <div style={{ font: "400 12px/1.55 var(--font-sans)", color: "var(--fg)" }}>{point.text}</div>
              </div>
            ))}
          </div>
        </div>

        <XaiHeatmap result={result}/>

        {expanded && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ font: "600 12px/1 var(--font-sans)", color: "var(--fg)", letterSpacing: "0.04em", textTransform: "uppercase" }}>모델별 점수</div>
              <div style={{ font: "500 11px/1 var(--font-mono)", color: "var(--fg-muted)" }}>{result.summaryTitle}</div>
            </div>
            <ScoreBar label="구조 분석" value={result.breakdown.structure} sub="패치 단위 구조 흔적"/>
            <ScoreBar label="맥락 검증" value={result.breakdown.context} sub="의미와 장면의 일관성"/>
            <ScoreBar label="디테일 판독" value={result.breakdown.detail} sub="피부, 가장자리, 질감 흔적"/>

            <div style={{ marginTop: 4, paddingTop: 14, borderTop: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              {[
                { label: "구조", weight: "0.35" },
                { label: "맥락", weight: "0.30" },
                { label: "디테일", weight: "0.35" },
              ].map((item) => (
                <div key={item.label} style={{ flex: 1, padding: "8px 6px", borderRadius: 10, background: "var(--surface-2)", textAlign: "center", font: "600 11px/1 var(--font-mono)", color: "var(--fg)" }}>
                  {item.label}
                  <div style={{ font: "500 9px/1 var(--font-sans)", color: "var(--fg-muted)", marginTop: 3 }}>×{item.weight}</div>
                </div>
              ))}
              <IconArrow size={14} style={{ color: "var(--primary)" }}/>
              <div style={{ padding: "8px 10px", borderRadius: 10, background: "linear-gradient(135deg, var(--grad-from), var(--grad-to))", color: "#fff", font: "700 13px/1 var(--font-mono)" }}>{result.score}%</div>
            </div>
            <div style={{ font: "400 11px/1.45 var(--font-sans)", color: "var(--fg-muted)" }}>{result.note}</div>
          </div>
        )}

        <button
          onClick={onToggleExpanded}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "12px 14px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            color: "var(--fg)",
            font: "600 13px/1 var(--font-sans)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          {expanded ? "세부 분석 접기" : "세부 분석 보기"} <IconChevD size={14} style={{ transform: expanded ? "rotate(180deg)" : "none" }}/>
        </button>

        <div style={{ flex: 1 }}/>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onRestart} style={{ flex: 1, padding: "12px 8px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--fg)", font: "600 12px/1 var(--font-sans)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <IconRefresh size={18}/>
            다시 분석
          </button>
          <button onClick={onOpenHistory} style={{ flex: 1, padding: "12px 8px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--fg)", font: "600 12px/1 var(--font-sans)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <IconBookmark size={18}/>
            기록 보기
          </button>
          <button onClick={onGoHome} style={{ flex: 1, padding: "12px 8px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--fg)", font: "600 12px/1 var(--font-sans)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <IconHome size={18}/>
            홈으로
          </button>
        </div>
        <button
          onClick={() => setShowShare(true)}
          style={{ marginTop: 8, width: "100%", padding: "13px", borderRadius: 16, border: "none", background: "linear-gradient(135deg, var(--grad-from), var(--grad-to))", color: "#fff", font: "600 14px/1 var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", boxShadow: "0 8px 24px -6px color-mix(in oklab, var(--primary) 50%, transparent)" }}
        >
          <IconShare size={16}/> 결과 공유하기
        </button>

        {showShare && <ShareCardModal result={result} onClose={() => setShowShare(false)}/>}
      </div>
    </div>
  );
}

function HistoryView({ history, onSelect, onBackHome, onOpenSettings }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingBottom: 88 }}>
      <AppBar
        right={
          <>
            <IconButton ariaLabel="home" onClick={onBackHome}>
              <IconHome size={16}/>
            </IconButton>
            <IconButton ariaLabel="settings" onClick={onOpenSettings}>
              <IconSettings size={16}/>
            </IconButton>
          </>
        }
      />

      <div style={{ padding: "0 20px 16px", flex: 1, overflowY: "auto" }}>
        <h1 style={{ font: "700 24px/1.15 var(--font-sans)", letterSpacing: "-0.03em", color: "var(--fg)", margin: "0 0 14px" }}>분석 기록</h1>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[
            { label: "전체", active: true },
            { label: "자동 저장", active: false },
          ].map((chip) => (
            <div key={chip.label} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid", borderColor: chip.active ? "transparent" : "var(--border)", background: chip.active ? "linear-gradient(135deg, var(--grad-from), var(--grad-to))" : "var(--surface)", color: chip.active ? "#fff" : "var(--fg-muted)", font: "600 12px/1 var(--font-sans)" }}>
              {chip.label}
            </div>
          ))}
        </div>

        {history.length === 0 ? (
          <div style={{ padding: 18, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--fg-muted)", font: "500 13px/1.55 var(--font-sans)" }}>
            아직 저장된 분석 기록이 없습니다. 홈에서 예시 이미지나 파일로 첫 분석을 실행해보세요.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {history.map((item) => {
              const color = item.status === "ai" ? "var(--status-ai)" : item.status === "real" ? "var(--status-real)" : "var(--status-uncertain)";
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-1)",
                    padding: 0,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ aspectRatio: "1 / 1", position: "relative", background: `center/cover url(${item.src})` }}>
                    <span style={{ position: "absolute", top: 8, right: 8, padding: "3px 8px", borderRadius: 999, background: "rgba(15,23,42,0.78)", color: "#fff", font: "700 11px/1 var(--font-mono)", backdropFilter: "blur(6px)" }}>{item.score}%</span>
                    <span style={{ position: "absolute", bottom: 8, left: 8, width: 8, height: 8, borderRadius: 999, background: color, boxShadow: `0 0 8px ${color}` }}/>
                  </div>
                  <div style={{ padding: "8px 10px 10px" }}>
                    <div style={{ font: "600 11px/1.35 var(--font-sans)", color }}>{item.summaryTitle}</div>
                    <div style={{ font: "400 10px/1.35 var(--font-sans)", color: "var(--fg-muted)", marginTop: 3 }}>{formatWhen(item.analyzedAt)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <InteractiveNav active="history" onSelect={(key) => key === "home" ? onBackHome() : key === "settings" ? onOpenSettings() : null}/>
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 40,
        height: 24,
        borderRadius: 999,
        background: on ? "linear-gradient(135deg, var(--grad-from), var(--grad-to))" : "var(--surface-2)",
        position: "relative",
        transition: "background 200ms",
        border: on ? "none" : "1px solid var(--border)",
        cursor: "pointer",
      }}
    >
      <div style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 20, height: 20, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 200ms" }}/>
    </button>
  );
}

function SettingsSection({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ font: "600 10px/1 var(--font-sans)", color: "var(--fg-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>{label}</div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-1)" }}>
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ label, sub, trailing, destructive }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderBottom: "1px solid var(--border)", color: destructive ? "var(--status-ai)" : "var(--fg)" }}>
      <div style={{ flex: 1 }}>
        <div style={{ font: "600 13px/1.2 var(--font-sans)" }}>{label}</div>
        {sub ? <div style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>{sub}</div> : null}
      </div>
      <div style={{ color: destructive ? "var(--status-ai)" : "var(--fg-muted)" }}>{trailing}</div>
    </div>
  );
}

function SettingsView({ settings, onSetTheme, onToggleAutoSave, onToggleIncludeOriginal, onBackHome, onOpenHistory }) {
  const themes = [
    { key: "system", Icon: IconSystem, label: "시스템" },
    { key: "light", Icon: IconSun, label: "라이트" },
    { key: "dark", Icon: IconMoon, label: "다크" },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingBottom: 88, overflow: "hidden" }}>
      <AppBar
        right={
          <>
            <IconButton ariaLabel="history" onClick={onOpenHistory}>
              <IconHistory size={16}/>
            </IconButton>
            <IconButton ariaLabel="home" onClick={onBackHome}>
              <IconHome size={16}/>
            </IconButton>
          </>
        }
      />
      <div style={{ padding: "0 20px", flex: 1, overflowY: "auto" }}>
        <h1 style={{ font: "700 24px/1.15 var(--font-sans)", letterSpacing: "-0.03em", color: "var(--fg)", margin: "0 0 18px" }}>설정</h1>

        <SettingsSection label="테마">
          <div style={{ display: "flex", gap: 8, padding: 10 }}>
            {themes.map(({ key, Icon, label }) => {
              const active = settings.themeMode === key;
              return (
                <button
                  key={key}
                  onClick={() => onSetTheme(key)}
                  style={{
                    flex: 1,
                    padding: "12px 8px",
                    borderRadius: 12,
                    background: active ? "color-mix(in oklab, var(--primary) 12%, transparent)" : "var(--surface-2)",
                    border: `1.5px solid ${active ? "var(--primary)" : "transparent"}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    color: active ? "var(--primary)" : "var(--fg-muted)",
                    cursor: "pointer",
                  }}
                >
                  <Icon size={18} sw={active ? 2.2 : 1.7}/>
                  <div style={{ font: `${active ? 700 : 500} 12px/1 var(--font-sans)` }}>{label}</div>
                </button>
              );
            })}
          </div>
        </SettingsSection>

        <SettingsSection label="분석">
          <SettingsRow label="히스토리 자동 저장" sub="분석 완료 후 기록 탭에 자동 보관" trailing={<Toggle on={settings.autoSaveHistory} onToggle={onToggleAutoSave}/>}/>
          <SettingsRow label="저장 시 원본 표시 유지" sub="결과 화면에서 업로드 소스 힌트 유지" trailing={<Toggle on={settings.includeOriginal} onToggle={onToggleIncludeOriginal}/>}/>
          <SettingsRow label="XAI 히트맵 표시" sub="결과 화면에서 의심 영역을 시각화" trailing={<span style={{ font: "600 11px/1 var(--font-mono)" }}>ON</span>}/>
        </SettingsSection>

        <SettingsSection label="정보">
          <SettingsRow label="분석 엔진 정보" sub="구조 / 맥락 / 디테일 3축 앙상블" trailing={<IconChevR size={16}/>}/>
          <SettingsRow label="의심 영역 기준" sub="경계선, 질감, 배경 패턴 변화를 종합" trailing={<IconChevR size={16}/>}/>
          <SettingsRow label="데이터 보관" sub="분석 기록은 이 기기에 저장" trailing={<IconChevR size={16}/>}/>
        </SettingsSection>

        <div style={{ marginTop: 18, textAlign: "center", font: "400 11px/1.5 var(--font-sans)", color: "var(--fg-muted)" }}>
          A-EYE 팀
          <div style={{ font: "500 10px/1.4 var(--font-mono)", letterSpacing: "0.06em", opacity: 0.7, marginTop: 4 }}>v1.0.0</div>
        </div>
      </div>

      <InteractiveNav active="settings" onSelect={(key) => key === "home" ? onBackHome() : key === "history" ? onOpenHistory() : null}/>
    </div>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <DeviceShell theme="light">
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "76px 24px 44px", background: "var(--bg)" }}>
          <div style={{ width: 58, height: 58, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--primary)" }}>
            <IconInfo size={26}/>
          </div>
          <div style={{ marginTop: 18, font: "800 22px/1.2 var(--font-sans)", letterSpacing: "-0.03em", color: "var(--fg)" }}>화면을 다시 준비했어요</div>
          <div style={{ marginTop: 10, font: "400 13px/1.55 var(--font-sans)", color: "var(--fg-muted)" }}>일시적인 화면 오류가 발생했습니다. 아래 버튼으로 홈 화면을 새로 불러올 수 있습니다.</div>
          <button className="aeye-cta" style={{ width: "100%", marginTop: 22 }} onClick={() => window.location.reload()}>
            홈 다시 열기 <IconRefresh size={16}/>
          </button>
        </div>
      </DeviceShell>
    );
  }
}

function InteractiveApp() {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const storedState = useMemo(() => readStoredState(), []);
  const [screen, setScreen] = useState("splash");
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [history, setHistory] = useState(storedState.history);
  const [settings, setSettings] = useState(storedState.settings);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentResult, setCurrentResult] = useState(storedState.history[0] || null);
  const [expanded, setExpanded] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(12);

  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedTheme = settings.themeMode === "system" ? (prefersDark ? "dark" : "light") : settings.themeMode;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setScreen("onboarding");
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    persistState(history, settings);
  }, [history, settings]);

  useEffect(() => {
    if (screen !== "analyzing" || !selectedImage) {
      return undefined;
    }

    setAnalysisProgress(14);
    let progress = 14;
    const timer = window.setInterval(() => {
      progress = Math.min(progress + 18, 96);
      setAnalysisProgress(progress);
    }, 650);

    const finalTimer = window.setTimeout(() => {
      window.clearInterval(timer);
      setAnalysisProgress(100);
      const result = createAnalysis(selectedImage);
      const finalResult = settings.includeOriginal
        ? { ...result, note: `${result.note} · 원본 ${result.name}` }
        : result;
      setCurrentResult(finalResult);
      setExpanded(false);
      if (settings.autoSaveHistory) {
        setHistory((prev) => [finalResult, ...prev.filter((item) => item.id !== finalResult.id)].slice(0, MAX_HISTORY_ITEMS));
      }
      setScreen("result");
    }, 3000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(finalTimer);
    };
  }, [screen, selectedImage, settings.autoSaveHistory, settings.includeOriginal]);

  function startAnalysis(image) {
    setSelectedImage(image);
    setScreen("analyzing");
  }

  async function handleFilePick(event) {
    const [file] = event.target.files || [];
    if (!file) return;

    const sizeLabel = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)}MB` : `${Math.max(1, Math.round(file.size / 1024))}KB`;
    event.target.value = "";

    try {
      const previewSrc = await createImagePreview(file);
      startAnalysis({
        name: file.name,
        src: previewSrc,
        preset: "upload",
        size: file.size,
        lastModified: file.lastModified,
        sizeLabel,
        note: "사용자가 업로드한 이미지",
      });
    } catch (error) {
      startAnalysis({
        name: file.name,
        src: PLACEHOLDER_IMAGE_SRC,
        preset: "upload",
        size: file.size,
        lastModified: file.lastModified,
        sizeLabel,
        note: "이미지 미리보기를 만들지 못해 대체 이미지로 분석했습니다",
      });
    }
  }

  function reopenHistoryItem(item) {
    setCurrentResult(item);
    setExpanded(false);
    setScreen("result");
  }

  function renderScreen() {
    if (screen === "splash") {
      return <SplashView/>;
    }
    if (screen === "onboarding") {
      return (
        <OnboardingView
          index={onboardingIndex}
          onNext={() => {
            if (onboardingIndex === ONBOARDING_PAGES.length - 1) {
              setScreen("home");
            } else {
              setOnboardingIndex((prev) => prev + 1);
            }
          }}
          onSkip={() => setScreen("home")}
        />
      );
    }
    if (screen === "home") {
      return (
        <HomeView
          resolvedTheme={resolvedTheme}
          history={history}
          onOpenSettings={() => setScreen("settings")}
          onOpenHistory={() => setScreen("history")}
          onChooseFile={() => fileInputRef.current?.click()}
          onChooseCamera={() => cameraInputRef.current?.click()}
          onToggleTheme={() => setSettings((prev) => ({ ...prev, themeMode: prev.themeMode === "dark" ? "light" : "dark" }))}
        />
      );
    }
    if (screen === "analyzing" && selectedImage) {
      return <AnalyzingView image={selectedImage} progress={analysisProgress}/>;
    }
    if (screen === "result") {
      return (
        <ResultView
          result={currentResult}
          expanded={expanded}
          onToggleExpanded={() => setExpanded((prev) => !prev)}
          onRestart={() => {
            if (selectedImage) {
              startAnalysis(selectedImage);
            } else {
              setScreen("home");
            }
          }}
          onOpenHistory={() => setScreen("history")}
          onGoHome={() => setScreen("home")}
        />
      );
    }
    if (screen === "history") {
      return (
        <HistoryView
          history={history}
          onSelect={reopenHistoryItem}
          onBackHome={() => setScreen("home")}
          onOpenSettings={() => setScreen("settings")}
        />
      );
    }
    return (
      <SettingsView
        settings={settings}
        onSetTheme={(themeMode) => setSettings((prev) => ({ ...prev, themeMode }))}
        onToggleAutoSave={() => setSettings((prev) => ({ ...prev, autoSaveHistory: !prev.autoSaveHistory }))}
        onToggleIncludeOriginal={() => setSettings((prev) => ({ ...prev, includeOriginal: !prev.includeOriginal }))}
        onBackHome={() => setScreen("home")}
        onOpenHistory={() => setScreen("history")}
      />
    );
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: "none" }}/>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFilePick} style={{ display: "none" }}/>
      <DeviceShell theme={resolvedTheme}>{renderScreen()}</DeviceShell>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("app-root")).render(
  <AppErrorBoundary>
    <InteractiveApp/>
  </AppErrorBoundary>,
);
