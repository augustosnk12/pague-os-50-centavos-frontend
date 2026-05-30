// LendTrack — Debtors list, detail, create/edit
const { useState: useStateDebtors } = React;

function DebtorsList({ store, onOpenDebtor, onNewDebtor }) {
  const [q, setQ] = useStateDebtors("");
  const debtors = store.debtors
    .map(dt => ({ dt, out: debtorOutstanding(store, dt.id), overdue: debtorOverdueCount(store, dt.id), ratio: debtorPaidRatio(store, dt.id) }))
    .filter(x => x.dt.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a,b) => b.overdue - a.overdue || b.out - a.out);

  const totalOut = store.debtors.reduce((s,dt)=>s+debtorOutstanding(store, dt.id), 0);

  return (
    <Page>
      <PageHeader title="Devedores" sub={`${store.debtors.length} pessoas · ${money(totalOut)} a receber`}
        action={<Button size="md" icon="plus" onClick={onNewDebtor} style={{ display: "none" }} />} />

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 99, padding: "11px 16px", boxShadow: "var(--shadow-sm)" }}>
          <Icon name="search" size={18} color="var(--text-faint)" />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar devedor…"
            style={{ border: "none", outline: "none", background: "transparent", color: "var(--text)", fontSize: 15, fontWeight: 500, width: "100%", fontFamily: "inherit" }} />
          {q && <IconButton name="x" size={16} onClick={()=>setQ("")} label="Limpar" style={{ width: 28, height: 28 }} />}
        </div>
      </div>

      {debtors.length === 0
        ? <Empty icon="users" title={q ? "Nada encontrado" : "Nenhum devedor ainda"} sub={q ? "Tente outro nome." : "Adicione a primeira pessoa que te deve."} action={!q && <Button icon="plus" onClick={onNewDebtor}>Adicionar devedor</Button>} />
        : <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {debtors.map(({ dt, out, overdue, ratio }, idx) => (
              <div key={dt.id} onClick={()=>onOpenDebtor(dt.id)} className="lt-row-hover"
                style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 15, boxShadow: "var(--shadow-sm)", cursor: "pointer", transition: "transform .15s, box-shadow .2s, border-color .2s", animation: `ltRise .4s cubic-bezier(0.22,1,0.36,1) ${idx*0.04}s both` }}>
                <Avatar name={dt.name} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dt.name}</span>
                    {overdue > 0 && <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: "var(--overdue)", background: "var(--overdue-weak)", padding: "2px 8px", borderRadius: 99 }}>{overdue} atrasada{overdue>1?"s":""}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {dt.notes || dt.email || dt.phone || "Sem observações"}
                  </div>
                  {out > 0 && <div style={{ marginTop: 9, maxWidth: 180 }}><Progress value={ratio} color="var(--paid)" height={5} /></div>}
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                  {out > 0
                    ? <><span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700 }}>deve</span><Money value={out} size={16} weight={800} color={overdue>0?"var(--overdue)":"var(--text)"} /></>
                    : <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--paid)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="check" size={15} strokeWidth={3}/>Quitado</span>}
                  <Icon name="chevronRight" size={18} color="var(--text-faint)" />
                </div>
              </div>
            ))}
          </div>}
    </Page>
  );
}

function DebtorDetail({ store, debtorId, onBack, onNewDebt, onMarkPaid, onEdit, onDelete, onOpenDebt }) {
  const dt = debtorById(store, debtorId);
  if (!dt) return <Page><Empty title="Devedor não encontrado" /></Page>;
  const debts = debtsByDebtor(store, debtorId);
  const out = debtorOutstanding(store, debtorId);
  const allInst = instByDebtor(store, debtorId);
  const paidCount = allInst.filter(i=>instStatus(i)==="PAID").length;
  const ratio = debtorPaidRatio(store, debtorId);

  return (
    <Page>
      <PageHeader title={dt.name} back onBack={onBack}
        action={<div style={{ display: "flex", gap: 4 }}>
          <IconButton name="edit" onClick={()=>onEdit(dt)} label="Editar" />
          <IconButton name="trash" onClick={()=>onDelete(dt)} label="Excluir" />
        </div>} />

      {/* contact + summary card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
          <Avatar name={dt.name} size={58} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700 }}>Saldo devedor</div>
            <Money value={out} size={26} weight={800} color={debtorOverdueCount(store,debtorId)>0?"var(--overdue)":out>0?"var(--text)":"var(--paid)"} />
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{paidCount} de {allInst.length} parcelas pagas</div>
          </div>
        </div>
        {allInst.length > 0 && <div style={{ marginTop: 14 }}><Progress value={ratio} color="var(--paid)" height={7} /></div>}

        {(dt.phone || dt.email || dt.notes) && <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
          {dt.phone && <ContactLine icon="phone" text={dt.phone} action={<a href="#" onClick={e=>e.preventDefault()} style={{ color: "var(--paid)", fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="whatsapp" size={15}/>Lembrar</a>} />}
          {dt.email && <ContactLine icon="mail" text={dt.email} />}
          {dt.notes && <ContactLine icon="edit" text={dt.notes} muted />}
        </div>}
      </Card>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Dívidas <span style={{ color: "var(--text-faint)", fontWeight: 700 }}>{debts.length}</span></h2>
        <Button size="sm" icon="plus" onClick={()=>onNewDebt(debtorId)}>Nova dívida</Button>
      </div>

      {debts.length === 0
        ? <Empty icon="wallet" title="Sem dívidas" sub="Registre o que essa pessoa te deve." action={<Button icon="plus" onClick={()=>onNewDebt(debtorId)}>Nova dívida</Button>} />
        : <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {debts.map(debt => <DebtCard key={debt.id} store={store} debt={debt} onMarkPaid={onMarkPaid} onOpenDebt={onOpenDebt} />)}
          </div>}
    </Page>
  );
}

function ContactLine({ icon, text, action, muted }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, background: "var(--surface-2)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name={icon} size={16} color="var(--text-muted)" /></span>
      <span style={{ flex: 1, fontSize: 14, color: muted ? "var(--text-muted)" : "var(--text)", fontWeight: muted?500:600 }}>{text}</span>
      {action}
    </div>
  );
}

function DebtCard({ store, debt, onMarkPaid, onOpenDebt }) {
  const [open, setOpen] = useStateDebtors(false);
  const insts = instByDebt(store, debt.id);
  const paid = insts.filter(i=>instStatus(i)==="PAID");
  const remaining = insts.filter(i=>instStatus(i)!=="PAID").reduce((s,i)=>s+Number(i.amount),0);
  const ratio = insts.length ? paid.length/insts.length : 0;
  const m = DEBT_TYPE[debt.type];
  const hasOverdue = insts.some(i=>instStatus(i)==="OVERDUE");

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ padding: 16, cursor: "pointer", display: "flex", gap: 13, alignItems: "center" }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, background: "var(--primary-weak)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name={m.icon} size={20} color="var(--primary)" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 15.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{debt.description || m.label}</span>
            {hasOverdue && <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--overdue)", flexShrink: 0 }} />}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{m.label} · {insts.length}× · {paid.length}/{insts.length} pagas</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <Money value={debt.totalAmount} size={15.5} weight={800} />
          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 2 }}>
            <span style={{ fontSize: 12, color: remaining>0?"var(--text-muted)":"var(--paid)", fontWeight: 700 }}>{remaining>0?`${money(remaining)} restam`:"Quitada"}</span>
            <Icon name="chevronDown" size={16} color="var(--text-faint)" style={{ transform: open?"rotate(180deg)":"none", transition: "transform .25s" }} />
          </div>
        </div>
      </div>
      <div style={{ padding: "0 16px 4px" }}><Progress value={ratio} color={hasOverdue?"var(--overdue)":"var(--paid)"} height={5} /></div>
      {open && <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 8, animation: "ltFade .25s ease" }}>
        {insts.map(inst => {
          const st = instStatus(inst);
          const sm = STATUS_META[st];
          return (
            <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: sm.weak, color: sm.color, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{inst.number}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{money(inst.amount)}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{st==="PAID" ? `Pago em ${fmtDate(inst.paidAt)}` : `Vence ${fmtDate(inst.dueDate)}`}</div>
              </div>
              {st === "PAID" ? <StatusBadge status="PAID" size="sm" /> : <Button size="sm" variant={st==="OVERDUE"?"paid":"soft"} icon="check" onClick={()=>onMarkPaid(inst)}>Pago</Button>}
            </div>
          );
        })}
      </div>}
    </div>
  );
}

// Create / edit debtor form (in a Sheet)
function DebtorForm({ open, onClose, onSave, editing }) {
  const [name, setName] = useStateDebtors("");
  const [email, setEmail] = useStateDebtors("");
  const [phone, setPhone] = useStateDebtors("");
  const [notes, setNotes] = useStateDebtors("");
  const [err, setErr] = useStateDebtors("");

  React.useEffect(() => {
    if (open) {
      setName(editing?.name || ""); setEmail(editing?.email || ""); setPhone(editing?.phone || ""); setNotes(editing?.notes || ""); setErr("");
    }
  }, [open, editing]);

  function save() {
    if (!name.trim()) return setErr("O nome é obrigatório.");
    onSave({ id: editing?.id, name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, notes: notes.trim() || null });
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Editar devedor" : "Novo devedor"}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button full icon="check" onClick={save}>{editing ? "Salvar" : "Adicionar"}</Button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 4 }}>
        <Field label="Nome" value={name} onChange={v=>{setName(v); setErr("");}} placeholder="Maria Souza" required error={err} autoFocus />
        <Field label="E-mail" value={email} onChange={setEmail} placeholder="maria@email.com" type="email" hint="Opcional" />
        <Field label="Telefone" value={phone} onChange={setPhone} placeholder="+55 11 91234-5678" inputMode="tel" hint="Opcional" />
        <Field label="Observações" value={notes} onChange={setNotes} placeholder="Vizinha do bloco B" textarea hint="Opcional" />
      </div>
    </Sheet>
  );
}

Object.assign(window, { DebtorsList, DebtorDetail, DebtorForm, DebtCard });
