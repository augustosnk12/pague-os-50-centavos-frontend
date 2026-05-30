// LendTrack — app root
const { useState: useStateMain, useEffect: useEffectMain } = React;

const ACCENTS = {
  "Roxo":    { h: 295, c: 0.20 },
  "Violeta": { h: 280, c: 0.19 },
  "Magenta": { h: 332, c: 0.18 },
  "Índigo":  { h: 264, c: 0.18 },
};
const RADII = { "Suave": 18, "Médio": 12, "Reto": 6 };
const FONTS = { "Manrope": "'Manrope'", "Plus Jakarta": "'Plus Jakarta Sans'", "Sistema": "system-ui" };

const NAV_STYLES = { "Abas inferiores": "tabs", "Menu lateral": "drawer" };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "Roxo",
  "radius": "Suave",
  "font": "Manrope",
  "nav": "Abas inferiores"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [theme, setTheme] = useStateMain(() => localStorage.getItem("lt-theme") || "light");
  const [lender, setLender] = useStateMain(() => {
    const s = localStorage.getItem("lt-lender"); return s ? JSON.parse(s) : null;
  });
  const [store, setStore] = useStateMain(() => {
    const base = buildStore(); base.lenderName = SEED_LENDER.name; return base;
  });

  const [route, setRoute] = useStateMain("dashboard");
  const [selDebtor, setSelDebtor] = useStateMain(null);
  const [newDebtPreset, setNewDebtPreset] = useStateMain(null);
  const [drawer, setDrawer] = useStateMain(false);
  const [account, setAccount] = useStateMain(false);
  const [debtorForm, setDebtorForm] = useStateMain({ open: false, editing: null });
  const [confirmDel, setConfirmDel] = useStateMain(null);
  const [mKey, setMKey] = useStateMain(monthKey(TODAY));
  const [toast, setToast] = useStateMain(null);

  // apply theme + tweaks to :root
  useEffectMain(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("lt-theme", theme); }, [theme]);
  useEffectMain(() => {
    const a = ACCENTS[t.accent] || ACCENTS.Roxo;
    const r = document.documentElement.style;
    r.setProperty("--accent-h", a.h); r.setProperty("--accent-c", a.c);
    r.setProperty("--radius", (RADII[t.radius] || 18) + "px");
    r.setProperty("--font", FONTS[t.font] || "'Manrope'");
  }, [t.accent, t.radius, t.font]);

  function flash(msg, opts = {}) { setToast({ msg, ...opts }); setTimeout(() => setToast(null), 2200); }

  function go(r) { setRoute(r); window.scrollTo({ top: 0 }); }
  function openDebtor(id) { setSelDebtor(id); go("debtor-detail"); }
  function openNewDebt(debtorId) { setNewDebtPreset(debtorId || null); go("new-debt"); }

  function authenticate(l) { setLender(l); localStorage.setItem("lt-lender", JSON.stringify(l)); setStore(s => ({ ...s, lenderName: l.name })); }
  function logout() { setLender(null); localStorage.removeItem("lt-lender"); setDrawer(false); }

  // ---- mutations ----
  function markPaid(inst) {
    setStore(s => ({ ...s, installments: s.installments.map(i => i.id === inst.id ? { ...i, paidAt: new Date(TODAY).toISOString() } : i) }));
    flash("Parcela marcada como paga", { status: "PAID", icon: "check" });
  }
  function saveDebtor(data) {
    if (data.id) {
      setStore(s => ({ ...s, debtors: s.debtors.map(d => d.id === data.id ? { ...d, ...data } : d) }));
      flash("Devedor atualizado");
    } else {
      const id = uid("d");
      setStore(s => ({ ...s, debtors: [{ ...data, id, lenderId: lender?.id, createdAt: new Date(TODAY).toISOString() }, ...s.debtors] }));
      flash("Devedor adicionado");
    }
    setDebtorForm({ open: false, editing: null });
  }
  function deleteDebtor(dt) {
    const debtIds = new Set(debtsByDebtor(store, dt.id).map(d => d.id));
    setStore(s => ({
      ...s,
      debtors: s.debtors.filter(d => d.id !== dt.id),
      debts: s.debts.filter(d => d.debtorId !== dt.id),
      installments: s.installments.filter(i => !debtIds.has(i.debtId)),
    }));
    setConfirmDel(null);
    go("debtors");
    flash("Devedor excluído");
  }
  function createDebt(data) {
    const debtId = uid("debt");
    const debt = { id: debtId, description: data.description, type: data.type, totalAmount: data.totalAmount, debtorId: data.debtorId, createdAt: data.firstDueDate };
    const insts = data.installments.map(p => ({ id: uid("inst"), number: p.number, amount: p.amount, dueDate: p.dueDate, paidAt: null, debtId }));
    setStore(s => ({ ...s, debts: [...s.debts, debt], installments: [...s.installments, ...insts] }));
    setSelDebtor(data.debtorId); go("debtor-detail");
    flash(`Cobrança criada · ${data.installments.length}× parcela${data.installments.length>1?"s":""}`, { status: "PENDING", icon: "check" });
  }

  if (!lender) return (<><Auth onAuthenticated={authenticate} /><LtTweaks t={t} setTweak={setTweak} /></>);

  const navStyle = NAV_STYLES[t.nav] || "tabs";
  const toggleTheme = () => setTheme(x=>x==="dark"?"light":"dark");

  return (
    <>
      <TopBar onMenu={()=>setDrawer(true)} route={route} onNav={go} theme={theme} onToggleTheme={toggleTheme} store={store} navStyle={navStyle} onNewDebt={()=>openNewDebt()} />
      {navStyle === "drawer" && <Drawer open={drawer} onClose={()=>setDrawer(false)} route={route} onNav={go} lender={{ ...lender, name: store.lenderName }}
        theme={theme} onToggleTheme={toggleTheme} onLogout={logout} onNewDebt={()=>openNewDebt()} />}

      {route === "dashboard" && <Dashboard store={store} mKey={mKey} setMKey={setMKey} onNav={go} onOpenDebtor={openDebtor} onMarkPaid={markPaid} />}
      {route === "debtors" && <DebtorsList store={store} onOpenDebtor={openDebtor} onNewDebtor={()=>setDebtorForm({ open: true, editing: null })} />}
      {route === "debtor-detail" && <DebtorDetail store={store} debtorId={selDebtor} onBack={()=>go("debtors")}
        onNewDebt={openNewDebt} onMarkPaid={markPaid} onEdit={(dt)=>setDebtorForm({ open: true, editing: dt })} onDelete={(dt)=>setConfirmDel(dt)} />}
      {route === "installments" && <InstallmentsView store={store} onOpenDebtor={openDebtor} onMarkPaid={markPaid} />}
      {route === "new-debt" && <NewDebt store={store} presetDebtorId={newDebtPreset} onClose={()=>go(selDebtor?"debtor-detail":"dashboard")}
        onSave={createDebt} onNewDebtor={()=>setDebtorForm({ open: true, editing: null })} />}

      {navStyle === "drawer" && route !== "new-debt" && <FAB onClick={()=>openNewDebt()} />}
      {navStyle === "tabs" && route !== "new-debt" && <BottomTabs route={route} onNav={go} onNewDebt={()=>openNewDebt()} onAccount={()=>setAccount(true)} store={store} />}
      <AccountSheet open={account} onClose={()=>setAccount(false)} lender={{ ...lender, name: store.lenderName }} theme={theme} onToggleTheme={toggleTheme} onLogout={()=>{ setAccount(false); logout(); }} />

      <DebtorForm open={debtorForm.open} editing={debtorForm.editing} onClose={()=>setDebtorForm({ open: false, editing: null })} onSave={saveDebtor} />

      {/* delete confirm */}
      <Sheet open={!!confirmDel} onClose={()=>setConfirmDel(null)} title="Excluir devedor?"
        footer={<><Button variant="ghost" onClick={()=>setConfirmDel(null)}>Cancelar</Button><Button full variant="danger" icon="trash" onClick={()=>deleteDebtor(confirmDel)}>Excluir tudo</Button></>}>
        {confirmDel && <div style={{ paddingTop: 4 }}>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.6 }}>
            Isso vai apagar <b style={{ color: "var(--text)" }}>{confirmDel.name}</b> e todas as suas dívidas e parcelas. Esta ação não pode ser desfeita.
          </p>
        </div>}
      </Sheet>

      <Toast toast={toast} />
      <LtTweaks t={t} setTweak={setTweak} />
    </>
  );
}

function LtTweaks({ t, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="Navegação" />
      <TweakRadio label="Estilo" value={t.nav} options={Object.keys(NAV_STYLES)} onChange={v=>setTweak("nav", v)} />
      <TweakSection label="Cor de destaque" />
      <TweakRadio label="Tom" value={t.accent} options={Object.keys(ACCENTS)} onChange={v=>setTweak("accent", v)} />
      <TweakSection label="Forma" />
      <TweakRadio label="Cantos" value={t.radius} options={Object.keys(RADII)} onChange={v=>setTweak("radius", v)} />
      <TweakSection label="Tipografia" />
      <TweakRadio label="Fonte" value={t.font} options={Object.keys(FONTS)} onChange={v=>setTweak("font", v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
