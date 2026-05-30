// LendTrack — Dashboard
const { useState: useStateDash } = React;

function MonthSwitcher({ mKey, setMKey }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 99, padding: 3, boxShadow: "var(--shadow-sm)" }}>
      <IconButton name="chevronLeft" size={18} onClick={()=>setMKey(addMonthsKey(mKey, -1))} label="Mês anterior" style={{ width: 34, height: 34 }} />
      <div style={{ fontWeight: 800, fontSize: 14, minWidth: 110, textAlign: "center", letterSpacing: "-0.01em", textTransform: "capitalize" }}>{monthLabelShort(mKey)}</div>
      <IconButton name="chevronRight" size={18} onClick={()=>setMKey(addMonthsKey(mKey, 1))} label="Próximo mês" style={{ width: 34, height: 34 }} />
    </div>
  );
}

function StatTile({ label, value, status, count }) {
  const m = STATUS_META[status];
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "15px 16px", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: m.color, fontWeight: 700, fontSize: 13 }}>
          <span style={{ width: 24, height: 24, borderRadius: 8, background: m.weak, display: "grid", placeItems: "center" }}><Icon name={m.icon} size={14} strokeWidth={2.6} /></span>
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)" }}>{count}×</span>
      </div>
      <Money value={value} size={21} weight={800} />
    </div>
  );
}

function Dashboard({ store, mKey, setMKey, onNav, onOpenDebtor, onMarkPaid }) {
  const data = dashboard(store, mKey);
  const owedNow = totalOwedNow(store);
  const isCurrent = mKey === monthKey(TODAY);

  // upcoming + overdue across all months (action list)
  const actionItems = store.installments
    .map(i => enrich(store, i))
    .filter(e => e.status !== "PAID")
    .sort((a,b) => {
      const ao = a.status === "OVERDUE" ? 0 : 1, bo = b.status === "OVERDUE" ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return new Date(a.inst.dueDate) - new Date(b.inst.dueDate);
    })
    .slice(0, 6);

  const receivedPct = data.totalExpected > 0 ? data.totalReceived / data.totalExpected : 0;

  return (
    <Page wide>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: "-0.03em" }}>Olá, {store.lenderName?.split(" ")[0] || "João"} 👋</h1>
          <p style={{ margin: "3px 0 0", color: "var(--text-muted)", fontSize: 14.5 }}>Veja quem precisa te pagar.</p>
        </div>
        <MonthSwitcher mKey={mKey} setMKey={setMKey} />
      </div>

      {/* HERO — a receber agora */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: "calc(var(--radius)*1.15)", padding: "24px 24px 22px",
        background: "linear-gradient(135deg, var(--primary), oklch(0.42 0.2 calc(var(--accent-h) + 25)))", color: "#fff", boxShadow: "var(--shadow-primary)", marginBottom: 14 }}
        className="lt-anim-up">
        <div style={{ position: "absolute", top: -40, right: -30, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
        <div style={{ position: "absolute", bottom: -60, right: 40, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, opacity: 0.92, marginBottom: 8 }}>
            <Icon name="wallet" size={17} /> Total a receber agora
          </div>
          <div style={{ fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
            <span style={{ fontSize: 22, opacity: 0.85, marginRight: 4 }}>R$</span>
            <span style={{ fontSize: 46 }}>{money(owedNow).replace("R$","").trim()}</span>
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 18, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 600 }}>Atrasado</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{money(store.installments.filter(i=>instStatus(i)==="OVERDUE").reduce((s,i)=>s+Number(i.amount),0))}</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.25)" }} />
            <div>
              <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 600 }}>A vencer</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{money(store.installments.filter(i=>instStatus(i)==="PENDING").reduce((s,i)=>s+Number(i.amount),0))}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Month summary: recebido vs esperado */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>{monthLabel(mKey)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--paid)" }}>{Math.round(receivedPct*100)}% recebido</div>
        </div>
        <Progress value={receivedPct} color="var(--paid)" height={9} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13 }}>
          <span style={{ color: "var(--text-muted)" }}>Recebido <b style={{ color: "var(--text)" }}>{money(data.totalReceived)}</b></span>
          <span style={{ color: "var(--text-muted)" }}>Esperado <b style={{ color: "var(--text)" }}>{money(data.totalExpected)}</b></span>
        </div>
      </Card>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatTile label="Recebido" status="PAID" value={data.totalReceived} count={data.counts.paid} />
        <StatTile label="Pendente" status="PENDING" value={data.totalPending} count={data.counts.pending} />
        <StatTile label="Atrasado" status="OVERDUE" value={data.totalOverdue} count={data.counts.overdue} />
      </div>

      {/* Action list */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Precisa de atenção</h2>
        <a onClick={()=>onNav("installments")} style={{ fontSize: 13.5, fontWeight: 700, color: "var(--primary)", cursor: "pointer" }}>Ver tudo</a>
      </div>

      {actionItems.length === 0
        ? <Empty icon="check" title="Tudo em dia!" sub="Nenhuma parcela atrasada ou pendente no momento." />
        : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {actionItems.map((e, idx) => <InstallmentRow key={e.inst.id} e={e} onOpenDebtor={onOpenDebtor} onMarkPaid={onMarkPaid} index={idx} />)}
          </div>}
    </Page>
  );
}

// shared row used in dashboard + installments view + debtor detail
function InstallmentRow({ e, onOpenDebtor, onMarkPaid, showDebtor = true, index = 0 }) {
  const { inst, debt, debtor, status } = e;
  const days = daysBetween(TODAY, inst.dueDate); // positive = overdue by N
  let when;
  if (status === "PAID") when = `Pago em ${fmtDate(inst.paidAt)}`;
  else if (status === "OVERDUE") when = days === 0 ? "Vence hoje" : `Atrasado há ${days} ${days===1?"dia":"dias"}`;
  else { const dleft = -days; when = dleft === 0 ? "Vence hoje" : `Vence em ${dleft} ${dleft===1?"dia":"dias"} · ${fmtDate(inst.dueDate)}`; }
  const m = STATUS_META[status];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, background: "var(--surface)", border: "1px solid var(--border)",
      borderLeft: `4px solid ${m.color}`, borderRadius: "var(--radius)", padding: "13px 15px", boxShadow: "var(--shadow-sm)",
      animation: `ltRise .4s cubic-bezier(0.22,1,0.36,1) ${index*0.04}s both` }}>
      <div onClick={()=>onOpenDebtor && onOpenDebtor(debtor.id)} style={{ cursor: onOpenDebtor ? "pointer" : "default", flexShrink: 0 }}>
        <Avatar name={debtor.name} size={44} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {showDebtor && <span onClick={()=>onOpenDebtor && onOpenDebtor(debtor.id)} style={{ fontWeight: 800, fontSize: 15, cursor: onOpenDebtor?"pointer":"default", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{debtor.name}</span>}
          <span style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600 }}>Parcela {inst.number}</span>
        </div>
        <div style={{ fontSize: 13, color: status === "OVERDUE" ? "var(--overdue)" : "var(--text-muted)", fontWeight: status==="OVERDUE"?700:500, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {debt.description ? `${debt.description} · ` : ""}{when}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
        <Money value={inst.amount} size={16.5} weight={800} />
        {status === "PAID"
          ? <StatusBadge status="PAID" size="sm" />
          : <Button size="sm" variant={status==="OVERDUE"?"paid":"soft"} icon="check" onClick={()=>onMarkPaid(inst)}>Pago</Button>}
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, InstallmentRow, MonthSwitcher });
