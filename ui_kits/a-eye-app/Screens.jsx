// All 8 a-eye screens, both themes.
// Reusable visual elements: AppBar, BottomNav, ScoreDonut, Bar, Pill, etc.

/* ---------- shared sample imagery (placeholder photos via Unsplash) ---------- */
const IMG_LANDSCAPE = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=70";
const IMG_PORTRAIT  = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=70";
const IMG_CITY      = "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&q=70";
const IMG_PRODUCT   = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=70";
const IMG_FOOD      = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=70";
const IMG_ANIMAL    = "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600&q=70";
const IMG_AIART     = "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=600&q=70";
const IMG_FACE      = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=70";

/* =============================================================
   Pieces
   ============================================================= */

function Logo({ size = 22 }) {
  // Abstract: three overlapping rings — no eye motif.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`lg${size}`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--grad-from)"/>
          <stop offset="100%" stopColor="var(--grad-to)"/>
        </linearGradient>
      </defs>
      <circle cx="22" cy="24" r="14" stroke={`url(#lg${size})`} strokeWidth="3" fill="none" opacity="0.85"/>
      <circle cx="42" cy="24" r="14" stroke={`url(#lg${size})`} strokeWidth="3" fill="none" opacity="0.85"/>
      <circle cx="32" cy="40" r="14" stroke={`url(#lg${size})`} strokeWidth="3" fill="none" opacity="0.85"/>
      <circle cx="32" cy="29.5" r="5" fill={`url(#lg${size})`}/>
    </svg>
  );
}

function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Logo size={22}/>
      <span style={{
        font: "800 16px/1 var(--font-sans)",
        letterSpacing: "0.04em",
        color: "var(--fg)"
      }}>A-EYE</span>
    </div>
  );
}

function AppBar({ right }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 20px 12px",
    }}>
      <Wordmark/>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--fg-muted)" }}>
        {right}
      </div>
    </div>
  );
}

function IconBtn({ children, ariaLabel }) {
  return (
    <button aria-label={ariaLabel} style={{
      width: 36, height: 36, borderRadius: 12,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "var(--surface-2)", border: "1px solid var(--border)",
      color: "var(--fg)"
    }}>{children}</button>
  );
}

function BottomNav({ active = "home" }) {
  const labels = { home: "홈", history: "기록", settings: "설정" };
  const item = (key, Icon, label) => {
    const isActive = active === key;
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        color: isActive ? "var(--primary)" : "var(--fg-muted)",
        fontWeight: isActive ? 600 : 500,
      }}>
        <Icon size={22} sw={isActive ? 2 : 1.7}/>
        <span style={{ font: `${isActive ? 600 : 500} 10px/1 var(--font-sans)`, letterSpacing: "0.02em" }}>{label}</span>
      </div>
    );
  };
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0,
      padding: "12px 28px 28px",
      display: "flex", justifyContent: "space-around",
      background: "color-mix(in oklab, var(--surface) 80%, transparent)",
      backdropFilter: "blur(20px) saturate(160%)",
      borderTop: "1px solid var(--border)"
    }}>
      {item("home",     IconHome,     labels.home)}
      {item("history",  IconHistory,  labels.history)}
      {item("settings", IconSettings, labels.settings)}
    </div>
  );
}

/* Pill — confidence badge */
function ConfidencePill({ status, children }) {
  const map = {
    real:       { c: "var(--status-real)",      bg: "var(--status-real-soft)" },
    uncertain:  { c: "var(--status-uncertain)", bg: "var(--status-uncertain-soft)" },
    ai:         { c: "var(--status-ai)",        bg: "var(--status-ai-soft)" },
  };
  const s = map[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 12px",
      borderRadius: 999,
      background: s.bg,
      color: s.c,
      font: "600 12px/1 var(--font-sans)",
      letterSpacing: "0.01em"
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.c }}/>
      {children}
    </span>
  );
}

/* Donut chart — outer track + gradient stroke arc */
function ScoreDonut({ value = 87, status = "ai", size = 220, mono = true }) {
  const r = (size - 28) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  const colorMap = {
    real: "var(--status-real)",
    uncertain: "var(--status-uncertain)",
    ai: "var(--status-ai)"
  };
  const stroke = colorMap[status];
  const id = `donut-${size}-${status}`;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--grad-from)"/>
            <stop offset="100%" stopColor={stroke}/>
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r}
                stroke="var(--surface-2)" strokeWidth="14" fill="none"/>
        <circle cx={size/2} cy={size/2} r={r}
                stroke={`url(#${id})`} strokeWidth="14" fill="none"
                strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={off}
                transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2
      }}>
        <div style={{
          font: `700 ${Math.round(size*0.34)}px/0.95 var(--font-mono)`,
          letterSpacing: "-0.04em",
          color: "var(--fg)",
          fontFeatureSettings: '"tnum" 1'
        }}>
          {value}<span style={{ fontSize: Math.round(size*0.16), color: "var(--fg-muted)" }}>%</span>
        </div>
        <div style={{ font: "500 11px/1 var(--font-sans)", color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          AI Probability
        </div>
      </div>
    </div>
  );
}

/* horizontal score bar */
function ScoreBar({ label, value, sub }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ font: "600 13px/1 var(--font-sans)", color: "var(--fg)" }}>{label}</span>
        <span style={{ font: "700 18px/1 var(--font-mono)", color: "var(--fg)", letterSpacing: "-0.02em" }}>{value}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value}%`,
          background: "linear-gradient(90deg, var(--grad-from), var(--grad-to))",
          borderRadius: 999,
          boxShadow: "0 0 12px -2px var(--grad-to)"
        }}/>
      </div>
      {sub && <div style={{ marginTop: 6, font: "400 11px/1.4 var(--font-sans)", color: "var(--fg-muted)" }}>{sub}</div>}
    </div>
  );
}

/* =============================================================
   1 · Splash
   ============================================================= */
function SplashScreen() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 20,
      overflow: "hidden"
    }} className="noise-bg">
      {/* Glow orbs */}
      <div className="glow-orb" style={{ width: 240, height: 240, background: "var(--secondary)", top: "30%", left: "20%" }}/>
      <div className="glow-orb" style={{ width: 280, height: 280, background: "var(--primary)",   top: "40%", right: "15%" }}/>

      <div style={{
        position: "relative",
        width: 132, height: 132,
        borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(circle, color-mix(in oklab, var(--secondary) 18%, transparent) 0%, transparent 70%)",
      }}>
        <Logo size={108}/>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{
          font: "800 36px/1 var(--font-sans)",
          letterSpacing: "0.06em",
          color: "var(--fg)"
        }}>A-EYE</div>
        <div style={{
          marginTop: 10,
          font: "500 13px/1.4 var(--font-sans)",
          color: "var(--fg-muted)",
          letterSpacing: "0.02em"
        }}>AI 이미지 판별기</div>
      </div>

    </div>
  );
}

/* =============================================================
   2 · Onboarding
   ============================================================= */
function OnboardingScreen() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "20px 28px 40px" }}>
      {/* Top: skip */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={{ font: "500 13px/1 var(--font-sans)", color: "var(--fg-muted)", background: "none", border: 0 }}>건너뛰기</button>
      </div>

      {/* Illustration: 3 overlapping circles → 1 */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="glow-orb" style={{ width: 260, height: 260, background: "var(--primary)", opacity: 0.25 }}/>
        <svg viewBox="0 0 280 220" width="280" height="220" style={{ position: "relative" }}>
          <defs>
            <linearGradient id="ob-a" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--grad-from)" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="var(--grad-from)" stopOpacity="0.1"/>
            </linearGradient>
            <linearGradient id="ob-b" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--grad-to)" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="var(--grad-to)" stopOpacity="0.1"/>
            </linearGradient>
            <linearGradient id="ob-c" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--secondary)" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.2"/>
            </linearGradient>
          </defs>
          <circle cx="100" cy="90"  r="62" fill="none" stroke="url(#ob-a)" strokeWidth="2"/>
          <circle cx="180" cy="90"  r="62" fill="none" stroke="url(#ob-b)" strokeWidth="2"/>
          <circle cx="140" cy="140" r="62" fill="none" stroke="url(#ob-c)" strokeWidth="2"/>
          {/* Center node */}
          <circle cx="140" cy="106" r="14" fill="url(#ob-c)"/>
          <circle cx="140" cy="106" r="6"  fill="var(--surface)"/>
        </svg>
      </div>

      {/* Text */}
      <div>
        <div style={{
          font: "700 24px/1.2 var(--font-sans)",
          letterSpacing: "-0.03em",
          color: "var(--fg)"
        }}>
          구조, 맥락, 디테일<br/>
          <span style={{ color: "var(--fg-muted)", fontWeight: 500 }}>세 시선이 하나의 결론으로.</span>
        </div>
        <p style={{
          marginTop: 12,
          font: "400 14px/1.55 var(--font-sans)",
          color: "var(--fg-muted)"
        }}>
          서로 다른 시각의 모델 3개가 한 장의 이미지를 교차 검증해 단일 점수로 알려드려요.
        </p>

        <button className="aeye-cta" style={{ width: "100%" }}>
          다음 <IconChevR size={16}/>
        </button>
      </div>
    </div>
  );
}

/* =============================================================
   3 · Home
   ============================================================= */
function HomeScreen() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingBottom: 88 }}>
      <AppBar right={<>
        <IconBtn ariaLabel="theme"><IconMoon size={18}/></IconBtn>
        <IconBtn ariaLabel="history"><IconHistory size={18}/></IconBtn>
      </>}/>

      <div style={{ padding: "8px 20px", overflow: "hidden", flex: 1 }}>
        {/* Greeting */}
        <div style={{ font: "400 14px/1.4 var(--font-sans)", color: "var(--fg-muted)", marginTop: 4 }}>
          안녕하세요 👁
        </div>
        <h1 style={{
          font: "700 26px/1.2 var(--font-sans)", letterSpacing: "-0.03em",
          color: "var(--fg)", margin: "4px 0 18px"
        }}>
          진짜와 가짜를 <span className="aeye-gradient-text">가려내볼까요?</span>
        </h1>

        {/* Upload card */}
        <div style={{
          position: "relative",
          padding: 22,
          borderRadius: 20,
          border: "1.5px dashed var(--border-strong)",
          background: "color-mix(in oklab, var(--surface) 70%, transparent)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, var(--grad-from), var(--grad-to))",
            color: "#fff",
            boxShadow: "var(--glow-primary)"
          }}>
            <IconUpload size={26} sw={2}/>
          </div>
          <div style={{ font: "600 14px/1.35 var(--font-sans)", color: "var(--fg)", textAlign: "center" }}>
            이미지를 선택하거나, 촬영하거나,<br/>공유받으세요
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, width: "100%" }}>
            <button style={{
              flex: 1, padding: "10px 12px", borderRadius: 12,
              background: "var(--surface-2)", border: "1px solid var(--border)",
              color: "var(--fg)", font: "600 13px/1 var(--font-sans)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6
            }}>
              <IconCamera size={16}/> 촬영
            </button>
            <button style={{
              flex: 1, padding: "10px 12px", borderRadius: 12,
              background: "var(--surface-2)", border: "1px solid var(--border)",
              color: "var(--fg)", font: "600 13px/1 var(--font-sans)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6
            }}>
              <IconImage size={16}/> 갤러리
            </button>
          </div>
        </div>

        {/* Recent */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 10 }}>
          <div style={{ font: "600 14px/1 var(--font-sans)", color: "var(--fg)" }}>최근 분석</div>
          <div style={{ font: "500 12px/1 var(--font-sans)", color: "var(--fg-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            전체 보기 <IconChevR size={12}/>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
          {[
            { src: IMG_AIART,   score: 87, status: "ai" },
            { src: IMG_PORTRAIT, score: 12, status: "real" },
            { src: IMG_CITY,    score: 54, status: "uncertain" },
          ].map((it, i) => (
            <div key={i} style={{
              width: 110, flexShrink: 0,
              borderRadius: 14, overflow: "hidden",
              background: "var(--surface)", border: "1px solid var(--border)",
              boxShadow: "var(--shadow-1)"
            }}>
              <div style={{ height: 88, position: "relative", background: `center/cover url(${it.src})` }}>
                <span style={{
                  position: "absolute", top: 6, right: 6,
                  padding: "2px 6px", borderRadius: 999,
                  background: "rgba(15,23,42,0.7)",
                  color: "#fff", font: "700 10px/1 var(--font-mono)", backdropFilter: "blur(4px)"
                }}>{it.score}%</span>
              </div>
              <div style={{ padding: "8px 10px" }}>
                <div style={{
                  font: "600 11px/1 var(--font-sans)",
                  color: it.status === "ai" ? "var(--status-ai)" : it.status === "real" ? "var(--status-real)" : "var(--status-uncertain)"
                }}>{it.status === "ai" ? "AI 생성" : it.status === "real" ? "진짜" : "불확실"}</div>
                <div style={{ marginTop: 2, font: "400 10px/1 var(--font-sans)", color: "var(--fg-muted)" }}>2분 전</div>
              </div>
            </div>
          ))}
        </div>

        {/* Info card */}
        <div style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "color-mix(in oklab, var(--secondary) 14%, transparent)",
            color: "var(--secondary)"
          }}>
            <IconInfo size={18}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ font: "600 12px/1.3 var(--font-sans)", color: "var(--fg)" }}>
              세 시선 앙상블이란?
            </div>
            <div style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>
              세 모델이 교차 검증해 한 점수로 합쳐요
            </div>
          </div>
          <IconChevR size={16}/>
        </div>
      </div>

      <BottomNav active="home"/>
    </div>
  );
}

/* =============================================================
   4 · Analyzing
   ============================================================= */
function AnalyzingScreen() {
  const steps = [
    { state: "done",     label: "이미지 구조 패치 분석" },
    { state: "done",     label: "의미적 일관성 검증" },
    { state: "active",   label: "정밀 디테일 판독 중..." },
    { state: "pending",  label: "결과 종합" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <AppBar right={<span style={{ font: "500 12px/1 var(--font-mono)", color: "var(--fg-muted)" }}>3 / 4</span>}/>

      <div style={{ padding: "8px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{
          font: "700 22px/1.2 var(--font-sans)", letterSpacing: "-0.03em",
          color: "var(--fg)", marginTop: 4
        }}>
          분석 중<span style={{ color: "var(--secondary)" }}>...</span>
        </div>
        <div style={{ font: "400 13px/1.4 var(--font-sans)", color: "var(--fg-muted)", marginTop: 4 }}>
          세 시선이 이미지를 교차 검증하고 있어요
        </div>

        {/* Image with scan line */}
        <div style={{
          marginTop: 18, position: "relative",
          aspectRatio: "1 / 1",
          borderRadius: 18, overflow: "hidden",
          background: `center/cover url(${IMG_AIART})`,
          boxShadow: "var(--shadow-2)"
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0,0,0,0.3) 100%)"
          }}/>
          <div className="scan-line"/>
          {/* Tech overlay corners */}
          {[
            { top: 8, left: 8 }, { top: 8, right: 8, transform: "scaleX(-1)" },
            { bottom: 8, left: 8, transform: "scaleY(-1)" }, { bottom: 8, right: 8, transform: "scale(-1,-1)" }
          ].map((s, i) => (
            <svg key={i} width="20" height="20" viewBox="0 0 20 20" style={{ position: "absolute", ...s }}>
              <path d="M2 8V2h6" stroke="var(--secondary)" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
            </svg>
          ))}
        </div>

        {/* Steps */}
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map((s, i) => {
            const isDone = s.state === "done";
            const isActive = s.state === "active";
            const dotBg = isDone ? "linear-gradient(135deg, var(--grad-from), var(--grad-to))"
                       : isActive ? "color-mix(in oklab, var(--secondary) 16%, transparent)"
                       : "var(--surface-2)";
            const txtCol = isDone || isActive ? "var(--fg)" : "var(--fg-muted)";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 999,
                  background: dotBg, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: isActive ? "1.5px solid var(--secondary)" : "1px solid var(--border)",
                }}>
                  {isDone && <IconCheck size={12} sw={3}/>}
                  {isActive && <span style={{
                    width: 7, height: 7, borderRadius: 999,
                    background: "var(--secondary)",
                    boxShadow: "0 0 8px var(--secondary)"
                  }}/>}
                </div>
                <div style={{ font: `${isActive ? 600 : 500} 13px/1.3 var(--font-sans)`, color: txtCol, flex: 1 }}>
                  {s.label}
                </div>
                {isActive && (
                  <span style={{ font: "500 11px/1 var(--font-mono)", color: "var(--secondary)" }}>83%</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{
          font: "400 11px/1.4 var(--font-sans)",
          color: "var(--fg-muted)", textAlign: "center",
          padding: "0 12px 24px",
          fontStyle: "italic"
        }}>
          AI는 종종 디테일에서 흔적을 남깁니다
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   5 · Result (collapsed)
   ============================================================= */
function ResultScreen({ expanded = false }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <AppBar right={<>
        <IconBtn ariaLabel="bookmark"><IconBookmark size={16}/></IconBtn>
        <IconBtn ariaLabel="share"><IconShare size={16}/></IconBtn>
      </>}/>
      <div style={{ padding: "8px 24px 28px", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* thumb + meta */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: `center/cover url(${IMG_AIART})`,
            border: "1px solid var(--border)"
          }}/>
          <div style={{ flex: 1 }}>
            <div style={{ font: "600 13px/1.2 var(--font-sans)", color: "var(--fg)" }}>portrait_v2.png</div>
            <div style={{ font: "400 11px/1.2 var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>
              1024 × 1024 · 방금 분석
            </div>
          </div>
        </div>

        {/* Donut */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: expanded ? 14 : 24 }}>
          <div style={{ position: "relative" }}>
            <div className="glow-orb" style={{ width: 200, height: 200, background: "var(--status-ai)", opacity: 0.18, top: 10, left: 10 }}/>
            <ScoreDonut value={87} status="ai" size={expanded ? 180 : 220}/>
          </div>
          <div style={{ marginTop: 14 }}>
            <ConfidencePill status="ai">AI 생성 · 확신도 높음</ConfidencePill>
          </div>
          <div style={{
            marginTop: 12,
            font: "500 13px/1.45 var(--font-sans)",
            color: "var(--fg)", textAlign: "center",
            maxWidth: 280
          }}>
            이 이미지는 AI로 생성되었을<br/>가능성이 매우 높습니다.
          </div>
        </div>

        {/* Expand toggle / details */}
        {!expanded && (
          <button style={{
            marginTop: 20,
            width: "100%", padding: "12px 14px",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 14,
            color: "var(--fg)", font: "600 13px/1 var(--font-sans)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6
          }}>
            세부 분석 보기 <IconChevD size={14}/>
          </button>
        )}

        {expanded && (
          <div style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            display: "flex", flexDirection: "column", gap: 14
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ font: "600 12px/1 var(--font-sans)", color: "var(--fg)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                모델별 점수
              </div>
              <IconChevD size={14} style={{ color: "var(--fg-muted)", transform: "rotate(180deg)" }}/>
            </div>
            <ScoreBar label="구조 분석"        value={89} sub="패치 단위 특징"/>
            <ScoreBar label="맥락 검증"        value={84} sub="의미적 일관성"/>
            <ScoreBar label="디테일 판독"      value={91} sub="정밀 판별"/>

            {/* Ensemble diagram */}
            <div style={{
              marginTop: 4, paddingTop: 14,
              borderTop: "1px dashed var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6
            }}>
              {["구조","맥락","디테일"].map((m,i) => (
                <div key={m} style={{
                  flex: 1, padding: "8px 6px", borderRadius: 10,
                  background: "var(--surface-2)", textAlign: "center",
                  font: "600 11px/1 var(--font-mono)", color: "var(--fg)"
                }}>{m}<div style={{ font: "500 9px/1 var(--font-sans)", color: "var(--fg-muted)", marginTop: 3 }}>×0.{[35,30,35][i]}</div></div>
              ))}
              <IconArrow size={14} style={{ color: "var(--primary)" }}/>
              <div style={{
                padding: "8px 10px", borderRadius: 10,
                background: "linear-gradient(135deg, var(--grad-from), var(--grad-to))",
                color: "#fff",
                font: "700 13px/1 var(--font-mono)"
              }}>87%</div>
            </div>
            <div style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--fg-muted)" }}>
              각 모델은 서로 다른 시각으로 이미지를 검증합니다.
            </div>
          </div>
        )}

        <div style={{ flex: 1 }}/>

        {/* Bottom actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {[
            { Icon: IconRefresh,  label: "다시" },
            { Icon: IconBookmark, label: "저장" },
            { Icon: IconShare,    label: "공유" },
          ].map(({ Icon, label }, i) => (
            <button key={i} style={{
              flex: 1, padding: "12px 8px", borderRadius: 14,
              background: "var(--surface)", border: "1px solid var(--border)",
              color: "var(--fg)", font: "600 12px/1 var(--font-sans)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6
            }}>
              <Icon size={18}/>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   7 · History
   ============================================================= */
function HistoryScreen() {
  const items = [
    { src: IMG_AIART,    score: 87, status: "ai",        when: "오늘 14:22" },
    { src: IMG_PORTRAIT, score: 12, status: "real",      when: "오늘 11:08" },
    { src: IMG_CITY,     score: 54, status: "uncertain", when: "어제" },
    { src: IMG_FOOD,     score: 8,  status: "real",      when: "어제" },
    { src: IMG_PRODUCT,  score: 92, status: "ai",        when: "4월 30일" },
    { src: IMG_ANIMAL,   score: 18, status: "real",      when: "4월 28일" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingBottom: 88 }}>
      <AppBar right={<>
        <IconBtn ariaLabel="filter"><IconFilter size={16}/></IconBtn>
      </>}/>

      <div style={{ padding: "0 20px 16px" }}>
        <h1 style={{
          font: "700 24px/1.15 var(--font-sans)",
          letterSpacing: "-0.03em", color: "var(--fg)",
          margin: "0 0 14px"
        }}>분석 기록</h1>

        {/* filter chips */}
        <div style={{ display: "flex", gap: 6, overflow: "hidden" }}>
          {[
            { label: "전체",       active: true,  count: 24 },
            { label: "AI 생성",   active: false, color: "var(--status-ai)" },
            { label: "진짜",     active: false, color: "var(--status-real)" },
            { label: "불확실",    active: false, color: "var(--status-uncertain)" },
          ].map((c, i) => (
            <button key={i} style={{
              padding: "6px 12px", borderRadius: 999,
              border: "1px solid",
              borderColor: c.active ? "transparent" : "var(--border)",
              background: c.active ? "linear-gradient(135deg, var(--grad-from), var(--grad-to))" : "var(--surface)",
              color: c.active ? "#fff" : c.color || "var(--fg-muted)",
              font: "600 12px/1 var(--font-sans)",
              display: "inline-flex", alignItems: "center", gap: 6,
              flexShrink: 0
            }}>
              {c.label}
              {c.count && <span style={{ opacity: 0.85, font: "500 11px/1 var(--font-mono)" }}>{c.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        flex: 1,
        padding: "0 20px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        overflow: "hidden",
        alignContent: "start"
      }}>
        {items.map((it, i) => {
          const c = it.status === "ai" ? "var(--status-ai)"
                  : it.status === "real" ? "var(--status-real)"
                  : "var(--status-uncertain)";
          return (
            <div key={i} style={{
              borderRadius: 14, overflow: "hidden",
              background: "var(--surface)", border: "1px solid var(--border)",
              boxShadow: "var(--shadow-1)"
            }}>
              <div style={{
                aspectRatio: "1 / 1",
                position: "relative",
                background: `center/cover url(${it.src})`
              }}>
                <span style={{
                  position: "absolute", top: 8, right: 8,
                  padding: "3px 8px", borderRadius: 999,
                  background: "rgba(15,23,42,0.78)", color: "#fff",
                  font: "700 11px/1 var(--font-mono)",
                  backdropFilter: "blur(6px)"
                }}>{it.score}%</span>
                <span style={{
                  position: "absolute", bottom: 8, left: 8,
                  width: 8, height: 8, borderRadius: 999,
                  background: c, boxShadow: `0 0 8px ${c}`
                }}/>
              </div>
              <div style={{ padding: "8px 10px" }}>
                <div style={{ font: "600 11px/1 var(--font-sans)", color: c }}>
                  {it.status === "ai" ? "AI 생성" : it.status === "real" ? "진짜" : "불확실"}
                </div>
                <div style={{ font: "400 10px/1 var(--font-sans)", color: "var(--fg-muted)", marginTop: 3 }}>
                  {it.when}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav active="history"/>
    </div>
  );
}

/* =============================================================
   8 · Settings
   ============================================================= */
function SettingsScreen() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", paddingBottom: 88, overflow: "hidden" }}>
      <AppBar/>
      <div style={{ padding: "0 20px", flex: 1, overflow: "hidden" }}>
        <h1 style={{
          font: "700 24px/1.15 var(--font-sans)",
          letterSpacing: "-0.03em", color: "var(--fg)",
          margin: "0 0 18px"
        }}>설정</h1>

        {/* Section: Theme */}
        <SettingsSection label="테마">
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { key: "system", Icon: IconSystem, label: "시스템" },
              { key: "light",  Icon: IconSun,    label: "라이트", active: true },
              { key: "dark",   Icon: IconMoon,   label: "다크" },
            ].map(({ key, Icon, label, active }) => (
              <div key={key} style={{
                flex: 1,
                padding: "12px 8px",
                borderRadius: 12,
                background: active ? "color-mix(in oklab, var(--primary) 12%, transparent)" : "var(--surface-2)",
                border: `1.5px solid ${active ? "var(--primary)" : "transparent"}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                color: active ? "var(--primary)" : "var(--fg-muted)"
              }}>
                <Icon size={18} sw={active ? 2.2 : 1.7}/>
                <div style={{ font: `${active ? 700 : 500} 12px/1 var(--font-sans)` }}>{label}</div>
              </div>
            ))}
          </div>
        </SettingsSection>

        {/* Section: Analysis */}
        <SettingsSection label="분석">
          <SettingsRow label="히스토리 자동 저장" trailing={<Toggle on/>}/>
          <SettingsRow label="저장 시 원본 포함"   trailing={<Toggle/>}/>
          <SettingsRow label="히스토리 전체 삭제"   destructive trailing={<IconChevR size={16}/>}/>
        </SettingsSection>

        {/* Section: Info */}
        <SettingsSection label="정보">
          <SettingsRow label="분석 엔진 정보"     trailing={<IconChevR size={16}/>}/>
          <SettingsRow label="라이선스"           trailing={<IconChevR size={16}/>}/>
          <SettingsRow label="개인정보처리방침"   trailing={<IconChevR size={16}/>}/>
        </SettingsSection>

        {/* Footer credit */}
        <div style={{
          marginTop: 18, textAlign: "center",
          font: "400 11px/1.5 var(--font-sans)", color: "var(--fg-muted)"
        }}>
          A-EYE 팀
          <div style={{ font: "500 10px/1.4 var(--font-mono)", letterSpacing: "0.06em", opacity: 0.7, marginTop: 4 }}>v1.0.0</div>
        </div>
      </div>
      <BottomNav active="settings"/>
    </div>
  );
}

function SettingsSection({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        font: "600 10px/1 var(--font-sans)", color: "var(--fg-muted)",
        letterSpacing: "0.1em", textTransform: "uppercase",
        marginBottom: 8, paddingLeft: 4
      }}>{label}</div>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 14, overflow: "hidden",
        boxShadow: "var(--shadow-1)"
      }}>
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ label, sub, trailing, destructive }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "13px 14px",
      borderBottom: "1px solid var(--border)",
      color: destructive ? "var(--status-ai)" : "var(--fg)"
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ font: "600 13px/1.2 var(--font-sans)" }}>{label}</div>
        {sub && <div style={{ font: "400 11px/1.2 var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ color: destructive ? "var(--status-ai)" : "var(--fg-muted)" }}>{trailing}</div>
    </div>
  );
}

function Toggle({ on }) {
  return (
    <div style={{
      width: 40, height: 24, borderRadius: 999,
      background: on ? "linear-gradient(135deg, var(--grad-from), var(--grad-to))" : "var(--surface-2)",
      position: "relative",
      transition: "background 200ms",
      border: on ? "none" : "1px solid var(--border)"
    }}>
      <div style={{
        position: "absolute", top: 2, left: on ? 18 : 2,
        width: 20, height: 20, borderRadius: 999,
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left 200ms"
      }}/>
    </div>
  );
}

Object.assign(window, {
  SplashScreen, OnboardingScreen, HomeScreen, AnalyzingScreen,
  ResultScreen, HistoryScreen, SettingsScreen,
  Logo, Wordmark, AppBar, BottomNav, ConfidencePill, ScoreDonut, ScoreBar,
  IMG_AIART, IMG_PORTRAIT, IMG_CITY, IMG_FOOD, IMG_PRODUCT, IMG_ANIMAL, IMG_FACE, IMG_LANDSCAPE
});
