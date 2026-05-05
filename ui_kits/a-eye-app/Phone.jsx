// Phone — wraps content in a 390×844 iPhone 14 Pro frame with status bar + home indicator.
// `theme` is "light" | "dark" and adds the .theme-dark class scoped to the screen.

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

function Phone({ theme = "light", label, num, children, time }) {
  return (
    <div>
      <div className="mock-label">
        <span className="num">{num}</span>
        <span>{label}</span>
        <span className={`mode-pill ${theme}`}>{theme}</span>
      </div>
      <div className="phone">
        <div className={`phone-screen ${theme === "dark" ? "theme-dark" : ""}`}>
          <div className="notch"></div>
          <StatusBar time={time}/>
          <div className="screen-body">
            {children}
          </div>
          <div className="home-indicator"></div>
        </div>
      </div>
    </div>
  );
}

window.Phone = Phone;
