// LendTrack — auth flow (magic-link, simulated)
const { useState: useStateAuth } = React;

function Logo({ size = 28, showText = true }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: size, height: size, borderRadius: "28%", background: "var(--primary)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-primary)" }}>
        <Icon name="wallet" size={size * 0.6} color="var(--on-primary)" strokeWidth={2.4} />
      </div>
      {showText && <span style={{ fontWeight: 800, fontSize: size * 0.62, letterSpacing: "-0.03em", lineHeight: 1, whiteSpace: "nowrap" }}>Pague os 50 centavos</span>}
    </div>
  );
}

function AuthShell({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "32px 20px", position: "relative", overflow: "hidden" }}>
      {/* soft decorative glow */}
      <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 420, height: 420, borderRadius: "50%",
        background: "radial-gradient(circle, var(--primary-weak-2), transparent 70%)", opacity: 0.7, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-15%", left: "-10%", width: 360, height: 360, borderRadius: "50%",
        background: "radial-gradient(circle, var(--primary-weak), transparent 70%)", opacity: 0.6, pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }} className="lt-anim-up">
        {children}
      </div>
    </div>
  );
}

function MailHero({ email }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 22 }}>
      <div style={{ width: 84, height: 84, borderRadius: "30%", background: "var(--primary-weak)", display: "grid", placeItems: "center", marginBottom: 18, animation: "ltPop .5s cubic-bezier(0.22,1,0.36,1)" }}>
        <Icon name="mail" size={38} color="var(--primary)" strokeWidth={1.8} />
      </div>
    </div>
  );
}

// step: 'register' | 'register-sent' | 'login' | 'login-sent'
function Auth({ onAuthenticated }) {
  const [step, setStep] = useStateAuth("login");
  const [email, setEmail] = useStateAuth("joao@example.com");
  const [name, setName] = useStateAuth("");
  const [err, setErr] = useStateAuth("");
  const [loading, setLoading] = useStateAuth(false);

  const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

  function submitRegister() {
    setErr("");
    if (!name.trim()) return setErr("Informe seu nome.");
    if (!validEmail(email)) return setErr("E-mail inválido.");
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep("register-sent"); }, 700);
  }
  function submitLogin() {
    setErr("");
    if (!validEmail(email)) return setErr("E-mail inválido.");
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep("login-sent"); }, 700);
  }

  // simulate clicking the magic link in the email
  function openMagicLink() {
    setLoading(true);
    setTimeout(() => onAuthenticated({ id: "lender_1", email, name: name || SEED_LENDER.name }), 600);
  }

  const cardStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 26, boxShadow: "var(--shadow-lg)" };

  return (
    <AuthShell key={step}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}><Logo size={32} /></div>

      {step === "login" && (
        <div style={cardStyle} className="lt-anim-up">
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>Bem-vindo de volta</h1>
          <p style={{ margin: "0 0 22px", color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.5 }}>Enviamos um link de acesso pro seu e-mail. Sem senhas.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="E-mail" value={email} onChange={setEmail} placeholder="voce@email.com" type="email" required error={err} autoFocus />
            <Button full size="lg" icon="send" onClick={submitLogin} disabled={loading}>{loading ? "Enviando…" : "Enviar link de acesso"}</Button>
          </div>
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--text-muted)" }}>
            Ainda não tem conta? <a onClick={()=>{setStep("register"); setErr("");}} style={{ color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>Criar conta</a>
          </div>
        </div>
      )}

      {step === "register" && (
        <div style={cardStyle} className="lt-anim-up">
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>Criar sua conta</h1>
          <p style={{ margin: "0 0 22px", color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.5 }}>Controle quem te deve e nunca mais esqueça uma parcela.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Seu nome" value={name} onChange={setName} placeholder="João Silva" required autoFocus />
            <Field label="E-mail" value={email} onChange={setEmail} placeholder="voce@email.com" type="email" required error={err} />
            <Button full size="lg" icon="send" onClick={submitRegister} disabled={loading}>{loading ? "Criando…" : "Criar conta"}</Button>
          </div>
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--text-muted)" }}>
            Já tem conta? <a onClick={()=>{setStep("login"); setErr("");}} style={{ color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>Entrar</a>
          </div>
        </div>
      )}

      {(step === "register-sent" || step === "login-sent") && (
        <div style={cardStyle} className="lt-anim-up">
          <MailHero email={email} />
          <h1 style={{ margin: "0 0 8px", fontSize: 23, fontWeight: 800, letterSpacing: "-0.03em", textAlign: "center" }}>
            {step === "register-sent" ? "Confirme seu e-mail" : "Link de acesso enviado"}
          </h1>
          <p style={{ margin: "0 auto 22px", color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.55, textAlign: "center", maxWidth: 300 }}>
            {step === "register-sent"
              ? <>Enviamos um link de confirmação para <b style={{color:"var(--text)"}}>{email}</b>. Abra-o para ativar sua conta.</>
              : <>Enviamos um link mágico para <b style={{color:"var(--text)"}}>{email}</b>. Clique nele para entrar.</>}
          </p>

          {/* Simulated email — clicking the button stands in for opening the link */}
          <div style={{ background: "var(--surface-2)", border: "1px dashed var(--border-strong)", borderRadius: "calc(var(--radius)*0.7)", padding: 16, marginBottom: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>📨 Simulação do e-mail</div>
            <Button full size="md" variant="primary" icon={step === "register-sent" ? "check" : "arrowRight"} onClick={openMagicLink} disabled={loading}>
              {loading ? "Abrindo…" : (step === "register-sent" ? "Confirmar minha conta" : "Abrir link e entrar")}
            </Button>
          </div>

          <div style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-muted)" }}>
            Não recebeu? <a onClick={()=> setStep(step === "register-sent" ? "register" : "login")} style={{ color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>Reenviar</a>
            <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
            <a onClick={()=> setStep(step === "register-sent" ? "register" : "login")} style={{ color: "var(--text-muted)", fontWeight: 700, cursor: "pointer" }}>Voltar</a>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 22, fontSize: 12.5, color: "var(--text-faint)" }}>
        Protótipo · fluxo de e-mail simulado
      </div>
    </AuthShell>
  );
}

Object.assign(window, { Auth, Logo });
