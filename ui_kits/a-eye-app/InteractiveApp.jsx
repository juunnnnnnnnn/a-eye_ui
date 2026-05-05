const { useEffect, useMemo, useRef, useState } = React;

const STORAGE_KEY = "a-eye-app-state-v1";

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
    labels: ["구조", "맥락", "디테일"],
  },
  {
    title: "결과보다 과정까지",
    accent: "왜 이런 점수가 나왔는지 보여줍니다.",
    body: "단순히 AI 같다고 말하는 데서 끝나지 않고,\n세부 점수와 요약 설명을 함께 제공합니다.",
    labels: ["스캔", "교차검증", "요약"],
  },
  {
    title: "빠르게 확인하고 저장",
    accent: "반복 분석도 한 흐름 안에서.",
    body: "이미지를 업로드하면 결과가 히스토리에 자동으로 저장되고,\n언제든 다시 꺼내볼 수 있습니다.",
    labels: ["업로드", "분석", "기록"],
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
      history: Array.isArray(parsed.history) ? parsed.history : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch (error) {
    return { history: [], settings: DEFAULT_SETTINGS };
  }
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
  if (result.xai) {
    return result.xai;
  }

  const seed = hashString(`${result.name}-${result.score}-${result.status}`);
  const findings = createXaiFindings(seed, result.status, result.score);
  return {
    coverage: Math.round(findings.reduce((sum, item) => sum + item.intensity, 0) / findings.length),
    findings,
  };
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
          </defs>
          <circle cx="100" cy="90" r="62" fill="none" stroke="url(#app-ob-a)" strokeWidth="3.5"/>
          <circle cx="180" cy="90" r="62" fill="none" stroke="url(#app-ob-b)" strokeWidth="3.5"/>
          <circle cx="140" cy="140" r="62" fill="none" stroke="url(#app-ob-c)" strokeWidth="3.5"/>
          <circle cx="140" cy="106" r="14" fill="url(#app-ob-c)"/>
          <circle cx="140" cy="106" r="6" fill="var(--surface)"/>
          {/* left label */}
          <rect x="61" y="57" width="48" height="22" rx="11" fill="var(--surface)" fillOpacity="0.85"/>
          <text x="85" y="72" textAnchor="middle" fill="var(--fg)" fontFamily="var(--font-sans)" fontSize="12" fontWeight="700">{step.labels[0]}</text>
          {/* right label */}
          <rect x="171" y="57" width="48" height="22" rx="11" fill="var(--surface)" fillOpacity="0.85"/>
          <text x="195" y="72" textAnchor="middle" fill="var(--fg)" fontFamily="var(--font-sans)" fontSize="12" fontWeight="700">{step.labels[1]}</text>
          {/* bottom label */}
          <rect x="108" y="161" width="64" height="22" rx="11" fill="var(--surface)" fillOpacity="0.85"/>
          <text x="140" y="176" textAnchor="middle" fill="var(--fg)" fontFamily="var(--font-sans)" fontSize="12" fontWeight="700">{step.labels[2]}</text>
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
}) {
  const recent = history.slice(0, 3);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingBottom: 88 }}>
      <AppBar
        right={
          <>
            <IconButton ariaLabel="theme" onClick={onOpenSettings}>
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
                <div key={item.id} style={{ padding: 12, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 12, background: `center/cover url(${item.src})`, border: "1px solid var(--border)" }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ font: "600 12px/1.35 var(--font-sans)", color: "var(--fg)" }}>{item.name}</div>
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
  const strongest = xai.findings[0];
  const heatmapBackground = xai.findings.map((finding) => {
    const centerX = finding.left + finding.width / 2;
    const centerY = finding.top + finding.height / 2;
    const alpha = 0.2 + finding.intensity / 180;
    return `radial-gradient(ellipse at ${centerX}% ${centerY}%, rgba(239,68,68,${alpha}) 0%, rgba(245,158,11,${alpha * 0.62}) 24%, rgba(6,182,212,0.08) 48%, transparent 70%)`;
  }).join(", ");

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ font: "700 12px/1 var(--font-sans)", color: "var(--fg)", letterSpacing: "0.04em", textTransform: "uppercase" }}>XAI 히트맵</div>
        <div style={{ font: "700 11px/1 var(--font-mono)", color: strongest.intensity >= 70 ? "var(--status-ai)" : "var(--status-uncertain)" }}>
          {xai.coverage}%
        </div>
      </div>

      <div style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 18, overflow: "hidden", background: `center/cover url(${result.src})`, border: "1px solid var(--border)", boxShadow: "var(--shadow-2)" }}>
        <div style={{ position: "absolute", inset: 0, background: heatmapBackground, mixBlendMode: "screen" }}/>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,23,42,0.02), rgba(15,23,42,0.32))" }}/>
        {xai.findings.map((finding, index) => (
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
        <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, display: "grid", gap: 6 }}>
          {xai.findings.map((finding, index) => (
            <div key={finding.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 10, background: "rgba(15,23,42,0.72)", color: "#fff", backdropFilter: "blur(12px)" }}>
              <span style={{ width: 18, height: 18, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: index === 0 ? "var(--status-ai)" : "rgba(255,255,255,0.16)", font: "800 10px/1 var(--font-mono)" }}>{index + 1}</span>
              <span style={{ flex: 1, font: "600 11px/1.2 var(--font-sans)" }}>{finding.label}</span>
              <span style={{ font: "700 10px/1 var(--font-mono)", color: "#fecaca" }}>{finding.intensity}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultView({ result, expanded, onToggleExpanded, onRestart, onOpenHistory, onGoHome }) {
  if (!result) return null;

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

        <XaiHeatmap result={result}/>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: expanded ? 14 : 22 }}>
          <div style={{ position: "relative" }}>
            <div className="glow-orb" style={{ width: 200, height: 200, background: result.status === "ai" ? "var(--status-ai)" : result.status === "real" ? "var(--status-real)" : "var(--status-uncertain)", opacity: 0.18, top: 10, left: 10 }}/>
            <ScoreDonut value={result.score} status={result.status} size={expanded ? 160 : 180}/>
          </div>
          <div style={{ marginTop: 14 }}>
            <ConfidencePill status={result.status}>{result.pillLabel}</ConfidencePill>
          </div>
          <div style={{ marginTop: 12, font: "500 13px/1.5 var(--font-sans)", color: "var(--fg)", textAlign: "center", maxWidth: 280 }}>
            {result.summaryLine}
          </div>
        </div>

        <button
          onClick={onToggleExpanded}
          style={{
            marginTop: 20,
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        history,
        settings,
      }),
    );
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
        setHistory((prev) => [finalResult, ...prev.filter((item) => item.id !== finalResult.id)].slice(0, 12));
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

  function handleFilePick(event) {
    const [file] = event.target.files || [];
    if (!file) return;

    const sizeLabel = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)}MB` : `${Math.max(1, Math.round(file.size / 1024))}KB`;
    const reader = new FileReader();

    reader.onload = () => {
      startAnalysis({
        name: file.name,
        src: reader.result,
        preset: "upload",
        size: file.size,
        lastModified: file.lastModified,
        sizeLabel,
        note: "사용자가 업로드한 이미지",
      });
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  }

  function reopenHistoryItem(item) {
    setCurrentResult(item);
    setExpanded(true);
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

ReactDOM.createRoot(document.getElementById("app-root")).render(<InteractiveApp/>);
