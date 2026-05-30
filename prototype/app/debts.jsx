// LendTrack — Create debt (with installment preview) + Installments view
const { useState: useStateDebts } = React;

// generate installments preview, mirroring backend rules (inst #1 absorbs remainder)
function genInstallments(total, count, firstDueISO) {
  const t = Math.round(Number(total) * 100);
  const n = Math.max(1, Math.floor(count));
  const base = Math.floor(t / n);
  const remainder = t - base * n;
  const first = new Date(firstDueISO);
  const out = [];
  for (let i = 0; i < n; i++) {
    const cents = base + (i === 0 ? remainder : 0);
    const due = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i, first.getUTCDate()));
    out.push({ number: i + 1, amount: (cents / 100).toFixed(2), dueDate: due.toISOString() });
  }
  return out;
}

const TYPE_OPTIONS = ["CASH", "PIX", "CREDIT_CARD", "PIX_INSTALLMENT"];

function NewDebt({ store, onClose, onSave, presetDebtorId, onNewDebtor }) {
  const [debtorId, setDebtorId] = useStateDebts(presetDebtorId || (store.debtors[0]?.id || ""));
  const [type, setType] = useStateDebts("PIX_INSTALLMENT");
  const [amount, setAmount] = useStateDebts("");
  const [count, setCount] = useStateDebts("3");
  const [firstDue, setFirstDue] = useStateDebts(() => {
    const t = new Date(TODAY); const dd = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth()+1, 1));
    return dd.toISOString().slice(0,10);
  });
  const [description, setDescription] = useStateDebts("");
  const [err, setErr] = useStateDebts("");

  const isInstallment = type === "PIX_INSTALLMENT" || type === "CREDIT_CARD";
  const effCount = isInstallment ? Math.max(1, parseInt(count) || 1) : 1;
  const numAmount = parseFloat(String(amount).replace(",", ".")) || 0;
  const preview = numAmount > 0 ? genInstallments(numAmount, effCount, firstDue + "T00:00:00.000Z") : [];

  function save() {
    if (!debtorId) return setErr("Selecione um devedor.");
    if (!(numAmount > 0)) return setErr("Informe um valor válido.");
    onSave({
      debtorId, type, totalAmount: numAmount.toFixed(2), numberOfInstallments: effCount,
      firstDueDate: firstDue + "T00:00:00.000Z", description: description.trim() || null,
      installments: preview,
    });
  }

  const debtorName = debtorById(store, debtorId)?.name;

  return (
    <Page>
      <PageHeader title="Nova cobrança" back onBack={onClose} sub="Registre uma dívida e gere as parcelas." />

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* debtor */}
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-muted)", marginBottom: 7 }}>Devedor <span style={{ color: "var(--primary)" }}>*</span></div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <select value={debtorId} onChange={e=>{setDebtorId(e.target.value); setErr("");}}
                style={{ width: "100%", appearance: "none", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "calc(var(--radius)*0.6)", padding: "14px 40px 14px 15px", fontSize: 16, fontWeight: 600, color: "var(--text)", fontFamily: "inherit", cursor: "pointer" }}>
                {store.debtors.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
              </select>
              <Icon name="chevronDown" size={18} color="var(--text-faint)" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
            <Button variant="secondary" icon="plus" onClick={onNewDebtor}>Novo</Button>
          </div>
        </div>

        {/* type */}
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-muted)", marginBottom: 7 }}>Tipo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {TYPE_OPTIONS.map(t => {
              const m = DEBT_TYPE[t]; const active = type === t;
              return (
                <button key={t} onClick={()=>setType(t)}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 14px", borderRadius: "calc(var(--radius)*0.6)", cursor: "pointer", textAlign: "left",
                    background: active ? "var(--primary-weak)" : "var(--surface)", border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`, color: active ? "var(--primary)" : "var(--text)", fontWeight: 700, fontSize: 14, transition: "all .15s" }}>
                  <Icon name={m.icon} size={18} /> {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* amount + installments */}
        <div style={{ display: "grid", gridTemplateColumns: isInstallment ? "1.4fr 1fr" : "1fr", gap: 12 }}>
          <Field label="Valor total" value={amount} onChange={v=>{setAmount(v); setErr("");}} placeholder="1.500,00" prefix="R$" inputMode="decimal" error={err && !(numAmount>0) ? err : ""} />
          {isInstallment && <Field label="Parcelas" value={count} onChange={v=>setCount(v.replace(/\D/g,""))} placeholder="3" inputMode="numeric" />}
        </div>

        <Field label="Primeiro vencimento" value={firstDue} onChange={setFirstDue} type="date" />
        <Field label="Descrição" value={description} onChange={setDescription} placeholder="Empréstimo de junho" hint="Opcional" />

        {/* live preview */}
        {preview.length > 0 && (
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="layers" size={16} color="var(--primary)" />Prévia das parcelas</span>
              <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontWeight: 700 }}>{preview.length}× de até {money(preview[0].amount)}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 220, overflowY: "auto" }}>
              {preview.slice(0, 12).map(p => (
                <div key={p.number} style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 13.5 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7, background: "var(--surface)", border: "1px solid var(--border)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{p.number}</span>
                  <span style={{ flex: 1, color: "var(--text-muted)" }}>{fmtDate(p.dueDate)}</span>
                  <span style={{ fontWeight: 800 }}>{money(p.amount)}</span>
                </div>
              ))}
              {preview.length > 12 && <div style={{ fontSize: 12.5, color: "var(--text-faint)", textAlign: "center", paddingTop: 4 }}>+ {preview.length - 12} parcelas</div>}
            </div>
          </div>
        )}

        <div style={{ position: "sticky", bottom: 16, display: "flex", gap: 10, marginTop: 4 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button full size="lg" icon="check" onClick={save}>Criar cobrança{debtorName ? ` p/ ${debtorName.split(" ")[0]}` : ""}</Button>
        </div>
      </div>
    </Page>
  );
}

// ---------- Installments view ----------
const PERIODS = [{ id: "day", label: "Dia" }, { id: "week", label: "Semana" }, { id: "month", label: "Mês" }];

function InstallmentsView({ store, onOpenDebtor, onMarkPaid }) {
  const [period, setPeriod] = useStateDebts("month");
  const [dateKey, setDateKey] = useStateDebts(() => new Date(TODAY).toISOString().slice(0,10));
  const [filter, setFilter] = useStateDebts("ALL"); // ALL | PENDING | OVERDUE | PAID

  let list = installmentsForPeriod(store, period, dateKey).map(i => enrich(store, i));
  if (filter !== "ALL") list = list.filter(e => e.status === filter);

  const totalDue = list.filter(e=>e.status!=="PAID").reduce((s,e)=>s+Number(e.inst.amount),0);
  const counts = { ALL: installmentsForPeriod(store, period, dateKey).length };
  ["PENDING","OVERDUE","PAID"].forEach(s => counts[s] = installmentsForPeriod(store, period, dateKey).filter(i=>instStatus(i)===s).length);

  function shiftPeriod(dir) {
    const base = new Date(dateKey + "T12:00:00Z");
    if (period === "day") base.setUTCDate(base.getUTCDate() + dir);
    else if (period === "week") base.setUTCDate(base.getUTCDate() + dir*7);
    else base.setUTCMonth(base.getUTCMonth() + dir);
    setDateKey(base.toISOString().slice(0,10));
  }

  function periodLabel() {
    const base = new Date(dateKey + "T12:00:00Z");
    if (period === "day") return fmtDate(base.toISOString());
    if (period === "month") return monthLabel(monthKey(base.toISOString()));
    const day = (base.getUTCDay()+6)%7;
    const mon = new Date(base); mon.setUTCDate(base.getUTCDate()-day);
    const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate()+6);
    return `${fmtDateShort(mon.toISOString())} – ${fmtDateShort(sun.toISOString())}`;
  }

  return (
    <Page>
      <PageHeader title="Parcelas" sub="Acompanhe e dê baixa nos pagamentos." />

      {/* period segmented control */}
      <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 13, padding: 4, marginBottom: 14 }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={()=>setPeriod(p.id)}
            style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14,
              background: period===p.id ? "var(--surface)" : "transparent", color: period===p.id ? "var(--primary)" : "var(--text-muted)",
              boxShadow: period===p.id ? "var(--shadow-sm)" : "none", transition: "all .15s" }}>{p.label}</button>
        ))}
      </div>

      {/* date navigator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "8px 8px", boxShadow: "var(--shadow-sm)" }}>
        <IconButton name="chevronLeft" onClick={()=>shiftPeriod(-1)} label="Anterior" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{periodLabel()}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{totalDue>0 ? `${money(totalDue)} a receber` : "Nada a receber"}</div>
        </div>
        <IconButton name="chevronRight" onClick={()=>shiftPeriod(1)} label="Próximo" />
      </div>

      {/* status filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {[{id:"ALL",label:"Todas"},{id:"OVERDUE",label:"Atrasadas"},{id:"PENDING",label:"Pendentes"},{id:"PAID",label:"Pagas"}].map(f => {
          const active = filter === f.id;
          const c = f.id==="ALL" ? "var(--primary)" : STATUS_META[f.id].color;
          return (
            <button key={f.id} onClick={()=>setFilter(f.id)}
              style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 99, cursor: "pointer", fontWeight: 700, fontSize: 13.5, transition: "all .15s",
                border: `1.5px solid ${active ? c : "var(--border)"}`, background: active ? c : "var(--surface)", color: active ? "#fff" : "var(--text-muted)" }}>
              {f.label} <span style={{ opacity: 0.7 }}>{counts[f.id]}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0
        ? <Empty icon="calendar" title="Nenhuma parcela" sub="Não há parcelas para este período e filtro." />
        : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((e, idx) => <InstallmentRow key={e.inst.id} e={e} onOpenDebtor={onOpenDebtor} onMarkPaid={onMarkPaid} index={idx} />)}
          </div>}
    </Page>
  );
}

Object.assign(window, { NewDebt, InstallmentsView, genInstallments });
