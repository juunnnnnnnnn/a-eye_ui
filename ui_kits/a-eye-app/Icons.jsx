// a-eye Icon set — Lucide-style 1.6px stroke, currentColor.
// Kept inline to avoid CDN icon mismatches and to control stroke weight.

const Ic = ({ children, size = 22, sw = 1.7, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={sw}
       strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
);

const IconCamera   = (p) => <Ic {...p}><path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z"/><circle cx="12" cy="13" r="4"/></Ic>;
const IconImage    = (p) => <Ic {...p}><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="m21 15-5-5L5 21"/></Ic>;
const IconUpload   = (p) => <Ic {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8 12 3 7 8"/><path d="M12 3v12"/></Ic>;
const IconHome     = (p) => <Ic {...p}><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V10Z"/></Ic>;
const IconHistory  = (p) => <Ic {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></Ic>;
const IconSettings = (p) => <Ic {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></Ic>;
const IconCheck    = (p) => <Ic {...p}><path d="m4 12 5 5 11-12"/></Ic>;
const IconChevR    = (p) => <Ic {...p}><path d="m9 6 6 6-6 6"/></Ic>;
const IconChevD    = (p) => <Ic {...p}><path d="m6 9 6 6 6-6"/></Ic>;
const IconChevL    = (p) => <Ic {...p}><path d="m15 6-6 6 6 6"/></Ic>;
const IconShare    = (p) => <Ic {...p}><path d="M12 3v13"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/></Ic>;
const IconBookmark = (p) => <Ic {...p}><path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/></Ic>;
const IconRefresh  = (p) => <Ic {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></Ic>;
const IconSparkle  = (p) => <Ic {...p}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 17v4M17 19h4"/></Ic>;
const IconSun      = (p) => <Ic {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></Ic>;
const IconMoon     = (p) => <Ic {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></Ic>;
const IconSystem   = (p) => <Ic {...p}><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></Ic>;
const IconInfo     = (p) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></Ic>;
const IconShield   = (p) => <Ic {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></Ic>;
const IconAlert    = (p) => <Ic {...p}><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></Ic>;
const IconFilter   = (p) => <Ic {...p}><path d="M3 4h18l-7 9v6l-4-2v-4Z"/></Ic>;
const IconTrash    = (p) => <Ic {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></Ic>;
const IconChip     = (p) => <Ic {...p}><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/><rect x="9" y="9" width="6" height="6" rx="1"/></Ic>;
const IconBolt     = (p) => <Ic {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7Z"/></Ic>;
const IconArrow    = (p) => <Ic {...p}><path d="M5 12h14M13 5l7 7-7 7"/></Ic>;

// Status bar glyphs (filled, simple)
const StatusSignal = ({ color = "currentColor" }) => (
  <svg width="17" height="11" viewBox="0 0 17 11" fill={color}>
    <rect x="0" y="7"  width="3" height="4" rx="0.6"/>
    <rect x="4.7" y="5" width="3" height="6" rx="0.6"/>
    <rect x="9.4" y="3" width="3" height="8" rx="0.6"/>
    <rect x="14"  y="0" width="3" height="11" rx="0.6"/>
  </svg>
);
const StatusWifi = ({ color = "currentColor" }) => (
  <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
    <path d="M1.5 4.5a10 10 0 0 1 13 0"/>
    <path d="M3.8 6.8a6.5 6.5 0 0 1 8.4 0"/>
    <path d="M6 9.1a3 3 0 0 1 4 0"/>
    <circle cx="8" cy="10.4" r="0.7" fill={color} stroke="none"/>
  </svg>
);
const StatusBattery = ({ color = "currentColor" }) => (
  <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
    <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={color} strokeOpacity="0.45"/>
    <rect x="2"   y="2"   width="18" height="8"  rx="1.6" fill={color}/>
    <rect x="23.5" y="3.5" width="1.6" height="5" rx="0.5" fill={color} fillOpacity="0.5"/>
  </svg>
);

Object.assign(window, {
  IconCamera, IconImage, IconUpload, IconHome, IconHistory, IconSettings,
  IconCheck, IconChevR, IconChevD, IconChevL, IconShare, IconBookmark,
  IconRefresh, IconSparkle, IconSun, IconMoon, IconSystem, IconInfo,
  IconShield, IconAlert, IconFilter, IconTrash, IconChip, IconBolt, IconArrow,
  StatusSignal, StatusWifi, StatusBattery
});
