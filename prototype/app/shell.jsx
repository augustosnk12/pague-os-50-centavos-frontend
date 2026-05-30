// LendTrack — app shell (top bar + slide-in drawer)
const { useState: useStateShell, useEffect: useEffectShell } = React;

const NAV = [
  { id: "dashboard", label: "Painel", icon: "home" },
  { id: "debtors", label: "Devedores", icon: "users" },
  { id: "installments", label: "Parcelas", icon: "calendar" },
];

function TopBar({ onMenu, route, onNav, theme, onToggleTheme, store, navStyle, onNewDebt }) {
  const overdue = store.installments.filter(i => instStatus(i) === "OVERDUE").length;
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 90, background: "color-mix(in oklch, var(--bg) 86%, transparent)",
      backdropFilter: "blur(14px)", borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        {navStyle === "drawer" && <span className="lt-hamburger" style={{ display: "inline-grid" }}><IconButton name="menu" onClick={onMenu} label="Menu" /></span>}
        <div onClick={()=>onNav("dashboard")} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}><Logo size={26} /></div>

        {/* desktop inline nav */}
        <nav className="lt-desktop-nav" style={{ marginLeft: 18, gap: 4 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={()=>onNav(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 11, border: "none", cursor: "pointer",
                background: route === n.id ? "var(--primary-weak)" : "transparent", color: route === n.id ? "var(--primary)" : "var(--text-muted)",
                fontWeight: 700, fontSize: 14.5, transition: "background .15s, color .15s" }}>
              <Icon name={n.icon} size={18} /> {n.label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />
        {/* desktop-only explicit create action */}
        <span className="lt-desktop-only" style={{ marginRight: 2 }}><Button size="sm" icon="plus" onClick={onNewDebt}>Nova cobrança</Button></span>
        <IconButton name={theme === "dark" ? "sun" : "moon"} onClick={onToggleTheme} label="Alternar tema" />
        <div style={{ position: "relative" }}>
          <IconButton name="bell" label="Atrasados" onClick={()=>onNav("installments")} />
          {overdue > 0 && <span style={{ position: "absolute", top: 6, right: 6, minWidth: 17, height: 17, padding: "0 4px", borderRadius: 99,
            background: "var(--overdue)", color: "#fff", fontSize: 10.5, fontWeight: 800, display: "grid", placeItems: "center", border: "2px solid var(--bg)" }}>{overdue}</span>}
        </div>
      </div>
    </header>
  );
}

// Bottom tab bar (mobile) — 3 destinations + raised center "+" + Conta
function BottomTabs({ route, onNav, onNewDebt, onAccount, store }) {
  const overdue = store.installments.filter(i => instStatus(i) === "OVERDUE").length;
  const tab = (n, badge) => {
    const active = route === n.id || (n.id === "account" && route === "__account");
    return (
      <button key={n.id} onClick={n.action} aria-label={n.label}
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "8px 0 4px",
          border: "none", background: "transparent", cursor: "pointer", color: active ? "var(--primary)" : "var(--text-faint)", transition: "color .15s", position: "relative" }}>
        <span style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <Icon name={n.icon} size={23} strokeWidth={active ? 2.4 : 2} />
          {badge > 0 && <span style={{ position: "absolute", top: -4, right: -8, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 99,
            background: "var(--overdue)", color: "#fff", fontSize: 10, fontWeight: 800, display: "grid", placeItems: "center", border: "2px solid var(--surface)" }}>{badge}</span>}
        </span>
        <span style={{ fontSize: 11, fontWeight: active ? 800 : 600, letterSpacing: "-0.01em" }}>{n.label}</span>
      </button>
    );
  };
  return (
    <nav className="lt-bottom-tabs" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 95,
      background: "color-mix(in oklch, var(--surface) 92%, transparent)", backdropFilter: "blur(16px)", borderTop: "1px solid var(--border)",
      display: "flex", alignItems: "stretch", paddingBottom: "env(safe-area-inset-bottom, 0px)", boxShadow: "0 -2px 16px oklch(0.4 0.05 var(--accent-h) / 0.06)" }}>
      {tab({ id: "dashboard", label: "Painel", icon: "home", action: ()=>onNav("dashboard") })}
      {tab({ id: "debtors", label: "Devedores", icon: "users", action: ()=>onNav("debtors") })}

      {/* raised center create button */}
      <div style={{ flex: 1, display: "grid", placeItems: "center", position: "relative" }}>
        <button onClick={onNewDebt} aria-label="Nova cobrança"
          style={{ position: "absolute", top: -22, width: 56, height: 56, borderRadius: "32%", border: "4px solid var(--bg)", cursor: "pointer",
            background: "var(--primary)", color: "var(--on-primary)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-primary)", transition: "transform .15s" }}
          onMouseDown={e=>e.currentTarget.style.transform="scale(0.92)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
          <Icon name="plus" size={26} strokeWidth={2.6} />
        </button>
      </div>

      {tab({ id: "installments", label: "Parcelas", icon: "calendar", action: ()=>onNav("installments") }, overdue)}
      {tab({ id: "account", label: "Conta", icon: "user", action: onAccount })}
    </nav>
  );
}

// Account sheet (used by the "Conta" tab) — profile + theme + logout
function AccountSheet({ open, onClose, lender, theme, onToggleTheme, onLogout }) {
  return (
    <Sheet open={open} onClose={onClose} title="Conta">
      <div style={{ display: "flex", alignItems: "center", gap: 13, background: "var(--surface-2)", borderRadius: "calc(var(--radius)*0.7)", padding: 14, marginBottom: 14 }}>
        <Avatar name={lender.name} size={48} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lender.name}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lender.email}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <button onClick={onToggleTheme} style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px", borderRadius: 13, border: "1px solid var(--border)", cursor: "pointer", textAlign: "left", background: "var(--surface)", color: "var(--text)", fontWeight: 700, fontSize: 15 }}>
          <Icon name={theme === "dark" ? "sun" : "moon"} size={20} /> {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </button>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px", borderRadius: 13, border: "1px solid var(--border)", cursor: "pointer", textAlign: "left", background: "var(--surface)", color: "var(--overdue)", fontWeight: 700, fontSize: 15 }}>
          <Icon name="logout" size={20} /> Sair
        </button>
      </div>
    </Sheet>
  );
}

function Drawer({ open, onClose, route, onNav, lender, theme, onToggleTheme, onLogout, onNewDebt }) {
  useEffectShell(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 150, background: "oklch(0.2 0.03 var(--accent-h) / 0.45)", backdropFilter: "blur(2px)", animation: "ltFade .2s ease" }}>
      <aside onClick={e=>e.stopPropagation()} style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 290, maxWidth: "82vw",
        background: "var(--surface)", borderRight: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column",
        animation: "ltSlideInLeft .3s cubic-bezier(0.22,1,0.36,1)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, paddingLeft: 4 }}>
          <Logo size={28} />
          <IconButton name="x" onClick={onClose} label="Fechar" />
        </div>

        {/* lender card */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface-2)", borderRadius: "calc(var(--radius)*0.7)", padding: 12, marginBottom: 16 }}>
          <Avatar name={lender.name} size={42} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lender.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lender.email}</div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={()=>{ onNav(n.id); onClose(); }}
              style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px", borderRadius: 13, border: "none", cursor: "pointer", textAlign: "left",
                background: route === n.id ? "var(--primary-weak)" : "transparent", color: route === n.id ? "var(--primary)" : "var(--text)",
                fontWeight: 700, fontSize: 15.5, transition: "background .15s" }}>
              <Icon name={n.icon} size={20} /> {n.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 16 }}>
          <Button full size="md" icon="plus" onClick={()=>{ onNewDebt(); onClose(); }}>Nova cobrança</Button>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <button onClick={onToggleTheme} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 14px", borderRadius: 13, border: "none", cursor: "pointer", textAlign: "left", background: "transparent", color: "var(--text)", fontWeight: 700, fontSize: 14.5 }}>
            <Icon name={theme === "dark" ? "sun" : "moon"} size={19} /> {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </button>
          <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 14px", borderRadius: 13, border: "none", cursor: "pointer", textAlign: "left", background: "transparent", color: "var(--overdue)", fontWeight: 700, fontSize: 14.5 }}>
            <Icon name="logout" size={19} /> Sair
          </button>
        </div>
      </aside>
    </div>
  );
}

// floating action button (mobile)
function FAB({ onClick }) {
  return (
    <button className="lt-fab" onClick={onClick} aria-label="Nova cobrança"
      style={{ position: "fixed", right: 18, bottom: 22, zIndex: 80, width: 58, height: 58, borderRadius: "30%", border: "none", cursor: "pointer",
        background: "var(--primary)", color: "var(--on-primary)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-primary)", transition: "transform .15s" }}
      onMouseDown={e=>e.currentTarget.style.transform="scale(0.92)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
      <Icon name="plus" size={26} strokeWidth={2.6} />
    </button>
  );
}

// page wrapper with constrained width
function Page({ children, wide }) {
  return <main style={{ maxWidth: wide ? 1080 : 680, margin: "0 auto", padding: "20px 16px 100px" }} className="lt-anim-fade">{children}</main>;
}

function PageHeader({ title, sub, back, onBack, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
      {back && <IconButton name="arrowLeft" onClick={onBack} label="Voltar" style={{ marginLeft: -8, marginTop: 2 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: "-0.03em" }}>{title}</h1>
        {sub && <p style={{ margin: "3px 0 0", color: "var(--text-muted)", fontSize: 14.5 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

Object.assign(window, { TopBar, BottomTabs, AccountSheet, Drawer, FAB, Page, PageHeader, NAV });
