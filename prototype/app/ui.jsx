// LendTrack — shared UI primitives
const { useState, useEffect, useRef } = React;

// ---------- Icons (simple line glyphs) ----------
const ICONS = {
  menu: "M3 6h18M3 12h18M3 18h18",
  x: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  chevronRight: "M9 6l6 6-6 6",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronDown: "M6 9l6 6 6-6",
  arrowLeft: "M19 12H5M12 19l-7-7 7-7",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  home: "M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5",
  users: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13A4 4 0 0116 11",
  calendar: "M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
  trash: "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6",
  edit: "M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z",
  mail: "M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 7l-10 6L2 7",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  alert: "M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.4 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  sun: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  banknote: "M2 6h20v12H2zM12 15a3 3 0 100-6 3 3 0 000 6zM6 9h.01M18 15h.01",
  card: "M2 5h20v14H2zM2 10h20",
  zap: "M13 2L3 14h7l-1 8 10-12h-7l1-8z",
  layers: "M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5",
  wallet: "M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a2 2 0 000 4h4v-4z",
  trending: "M22 7l-8.5 8.5-5-5L2 17M16 7h6v6",
  bell: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
  dots: "M12 13a1 1 0 100-2 1 1 0 000 2zM12 6a1 1 0 100-2 1 1 0 000 2zM12 20a1 1 0 100-2 1 1 0 000 2z",
  filter: "M22 3H2l8 9.5V19l4 2v-8.5L22 3z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  whatsapp: "M3 21l1.65-4.5A8 8 0 113 21zM8.5 9.5c.5 2 2 3.5 4 4l1.2-1 2 1-.5 2c-3 0-7-4-7-7l2-.5 1 2-1 1z",
};

function Icon({ name, size = 20, color = "currentColor", strokeWidth = 2, fill = "none", style }) {
  const dpath = ICONS[name] || ICONS.x;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {dpath.split("M").filter(Boolean).map((seg, i) => <path key={i} d={"M" + seg} />)}
    </svg>
  );
}

// ---------- Button ----------
function Button({ children, variant = "primary", size = "md", icon, iconRight, full, onClick, disabled, type, style }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    border: "1px solid transparent", borderRadius: "calc(var(--radius) * 0.66)", cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700, fontSize: size === "lg" ? 17 : size === "sm" ? 13.5 : 15, letterSpacing: "-0.01em",
    padding: size === "lg" ? "15px 22px" : size === "sm" ? "8px 13px" : "12px 18px",
    width: full ? "100%" : "auto", transition: "transform .12s ease, background .18s ease, box-shadow .2s ease, border-color .18s",
    opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap", ...style,
  };
  const variants = {
    primary: { background: "var(--primary)", color: "var(--on-primary)", boxShadow: "var(--shadow-primary)" },
    secondary: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-sm)" },
    ghost: { background: "transparent", color: "var(--text-muted)" },
    soft: { background: "var(--primary-weak)", color: "var(--primary)" },
    danger: { background: "var(--overdue-weak)", color: "var(--overdue)" },
    paid: { background: "var(--paid)", color: "#fff" },
  };
  const [hover, setHover] = useState(false);
  const hoverStyle = !disabled && hover ? (variant === "primary" ? { background: "var(--primary-hover)" } : variant === "secondary" || variant === "ghost" ? { background: "var(--surface-hover)" } : {}) : {};
  return (
    <button type={type || "button"} onClick={disabled ? undefined : onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
      style={{ ...base, ...variants[variant], ...hoverStyle }}>
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 16 : 18} />}
    </button>
  );
}

function IconButton({ name, onClick, size = 20, label, active, style }) {
  const [hover, setHover] = useState(false);
  return (
    <button aria-label={label} onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: 12, cursor: "pointer",
        background: active ? "var(--primary-weak)" : hover ? "var(--surface-hover)" : "transparent",
        color: active ? "var(--primary)" : "var(--text-muted)", border: "none", transition: "background .15s, color .15s", ...style }}>
      <Icon name={name} size={size} />
    </button>
  );
}

// ---------- Badge / status chip ----------
function StatusBadge({ status, size = "md" }) {
  const m = STATUS_META[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: m.weak, color: m.color,
      padding: size === "sm" ? "3px 9px" : "5px 11px", borderRadius: 99, fontSize: size === "sm" ? 11.5 : 12.5, fontWeight: 700, letterSpacing: "0.01em" }}>
      <Icon name={m.icon} size={size === "sm" ? 12 : 13} strokeWidth={2.6} />
      {m.label}
    </span>
  );
}

function TypeChip({ type, size = "md" }) {
  const m = DEBT_TYPE[type];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--surface-2)", color: "var(--text-muted)",
      padding: size === "sm" ? "3px 9px" : "5px 11px", borderRadius: 99, fontSize: size === "sm" ? 11.5 : 12.5, fontWeight: 600, border: "1px solid var(--border)" }}>
      <Icon name={m.icon} size={13} strokeWidth={2} />
      {m.short}
    </span>
  );
}

// ---------- Money display ----------
function Money({ value, size = 28, weight = 800, muted, color }) {
  const p = moneyParts(value);
  return (
    <span style={{ color: color || (muted ? "var(--text-muted)" : "var(--text)"), fontWeight: weight, letterSpacing: "-0.02em", whiteSpace: "nowrap", display: "inline-flex", alignItems: "baseline", gap: 3 }}>
      <span style={{ fontSize: size * 0.6, fontWeight: 700, opacity: 0.7 }}>{p.symbol}</span>
      <span style={{ fontSize: size }}>{p.int}</span>
      <span style={{ fontSize: size * 0.55, fontWeight: 700, opacity: 0.7 }}>,{p.dec}</span>
    </span>
  );
}

// ---------- Field ----------
function Field({ label, value, onChange, placeholder, type = "text", required, hint, error, prefix, textarea, autoFocus, inputMode }) {
  const [focus, setFocus] = useState(false);
  const ring = error ? "var(--overdue)" : focus ? "var(--primary)" : "var(--border-strong)";
  const common = {
    width: "100%", border: "none", outline: "none", background: "transparent", color: "var(--text)",
    fontSize: 16, fontWeight: 500, fontFamily: "inherit", resize: "none",
  };
  return (
    <label style={{ display: "block" }}>
      {label && <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-muted)", marginBottom: 7 }}>
        {label} {required && <span style={{ color: "var(--primary)" }}>*</span>}
      </div>}
      <div style={{ display: "flex", alignItems: textarea ? "flex-start" : "center", gap: 8,
        background: "var(--surface)", border: `1.5px solid ${ring}`, borderRadius: "calc(var(--radius) * 0.6)",
        padding: textarea ? "13px 15px" : "13px 15px", transition: "border-color .15s, box-shadow .15s",
        boxShadow: focus ? `0 0 0 4px var(--primary-weak)` : "none" }}>
        {prefix && <span style={{ color: "var(--text-faint)", fontWeight: 700, fontSize: 15 }}>{prefix}</span>}
        {textarea
          ? <textarea rows={3} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} style={common} />
          : <input type={type} inputMode={inputMode} value={value} placeholder={placeholder} autoFocus={autoFocus}
              onChange={e=>onChange(e.target.value)} onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} style={common} />}
      </div>
      {(hint || error) && <div style={{ fontSize: 12.5, marginTop: 6, color: error ? "var(--overdue)" : "var(--text-faint)" }}>{error || hint}</div>}
    </label>
  );
}

// ---------- Avatar ----------
function Avatar({ name, size = 44 }) {
  const initials = (name || "?").split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
  // deterministic hue offset from name
  let h = 0; for (const c of (name||"")) h = (h + c.charCodeAt(0)) % 360;
  const hue = `calc(var(--accent-h) + ${(h % 60) - 30})`;
  return (
    <div style={{ width: size, height: size, borderRadius: "30%", flexShrink: 0, display: "grid", placeItems: "center",
      background: `oklch(0.62 0.13 ${hue})`, color: "#fff", fontWeight: 800, fontSize: size * 0.36, letterSpacing: "-0.02em",
      boxShadow: "var(--shadow-sm)" }}>
      {initials}
    </div>
  );
}

// ---------- Card ----------
function Card({ children, onClick, style, hover: enableHover, pad = 18 }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
        padding: pad, boxShadow: enableHover && hover ? "var(--shadow-md)" : "var(--shadow-sm)",
        transition: "box-shadow .2s, transform .15s, border-color .2s", cursor: onClick ? "pointer" : "default",
        transform: enableHover && hover ? "translateY(-2px)" : "none",
        borderColor: enableHover && hover ? "var(--border-strong)" : "var(--border)", ...style }}>
      {children}
    </div>
  );
}

// ---------- Sheet / Modal (bottom sheet on mobile, centered dialog on desktop) ----------
function Sheet({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "oklch(0.2 0.03 var(--accent-h) / 0.5)",
      backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "ltFade .2s ease" }}
      className="lt-sheet-wrap">
      <div onClick={e=>e.stopPropagation()} className="lt-sheet"
        style={{ background: "var(--surface)", width: "100%", maxWidth: 460, borderRadius: "calc(var(--radius) * 1.2) calc(var(--radius) * 1.2) 0 0",
          boxShadow: "var(--shadow-lg)", maxHeight: "92vh", display: "flex", flexDirection: "column", animation: "ltScaleIn .28s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 12px" }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</div>
          <IconButton name="x" onClick={onClose} label="Fechar" />
        </div>
        <div style={{ padding: "0 18px 18px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: 18, borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Toast ----------
function Toast({ toast }) {
  if (!toast) return null;
  const m = toast.status ? STATUS_META[toast.status] : null;
  return (
    <div style={{ position: "fixed", left: "50%", bottom: 26, transform: "translateX(-50%)", zIndex: 400,
      background: "var(--text)", color: "var(--bg)", padding: "13px 20px", borderRadius: 99, fontWeight: 700, fontSize: 14.5,
      boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: 9, animation: "ltPop .35s cubic-bezier(0.22,1,0.36,1)", maxWidth: "90vw" }}>
      <Icon name={toast.icon || "check"} size={18} strokeWidth={2.6} color={m ? m.color : "var(--primary)"} />
      {toast.msg}
    </div>
  );
}

// ---------- Progress bar ----------
function Progress({ value, color = "var(--primary)", height = 7 }) {
  return (
    <div style={{ background: "var(--surface-2)", borderRadius: 99, height, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${Math.round(value*100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width .5s cubic-bezier(0.22,1,0.36,1)" }} />
    </div>
  );
}

// ---------- Empty state ----------
function Empty({ icon = "wallet", title, sub, action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: 64, height: 64, borderRadius: "26%", background: "var(--primary-weak)", display: "grid", placeItems: "center", marginBottom: 8 }}>
        <Icon name={icon} size={28} color="var(--primary)" />
      </div>
      <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
      {sub && <div style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 280 }}>{sub}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

Object.assign(window, { Icon, Button, IconButton, StatusBadge, TypeChip, Money, Field, Avatar, Card, Sheet, Toast, Progress, Empty });
