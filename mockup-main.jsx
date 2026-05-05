// Mounts the 16-screen grid for "a-eye Mockup.html".

const SCREENS = [
  { num: "01", key: "splash",       label: "스플래시",                 Cmp: SplashScreen },
  { num: "02", key: "onboarding",   label: "온보딩 · 2/3",            Cmp: OnboardingScreen },
  { num: "03", key: "home",         label: "홈",                       Cmp: HomeScreen },
  { num: "04", key: "analyzing",    label: "분석 중",                  Cmp: AnalyzingScreen },
  { num: "05", key: "result",       label: "결과 · 기본",              Cmp: (p) => <ResultScreen {...p} expanded={false}/> },
  { num: "06", key: "result-exp",   label: "결과 · 세부 펼침",         Cmp: (p) => <ResultScreen {...p} expanded={true}/> },
  { num: "07", key: "history",      label: "기록",                       Cmp: HistoryScreen },
  { num: "08", key: "settings",     label: "설정",                       Cmp: SettingsScreen },
];

function Grid() {
  // Render: per row, light then dark side-by-side (4-col layout).
  // Pairs: [splash-L, splash-D, onboarding-L, onboarding-D] then [home-L, home-D, analyzing-L, analyzing-D] etc.
  const rows = [];
  for (let i = 0; i < SCREENS.length; i += 2) {
    rows.push([SCREENS[i], SCREENS[i+1]]);
  }
  return (
    <div className="mock-grid">
      {SCREENS.flatMap(s => [
        <Phone key={`${s.key}-light`} theme="light" num={s.num} label={`${s.label} / 라이트`}>
          <s.Cmp/>
        </Phone>,
        <Phone key={`${s.key}-dark`} theme="dark" num={s.num} label={`${s.label} / 다크`}>
          <s.Cmp/>
        </Phone>,
      ])}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("mock-root")).render(<Grid/>);
