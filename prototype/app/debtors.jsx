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

function DebtorDetail({ store, debtorId, onBack, onNewDebt, onPay, onEdit, onDelete, onOpenDebt, onEditDebt, onDeleteDebt }) {
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
            {debts.map(debt => <DebtCard key={debt.id} store={store} debt={debt} onPay={onPay} onOpenDebt={onOpenDebt} onEditDebt={onEditDebt} onDeleteDebt={onDeleteDebt} />)}
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

function DebtCard({ store, debt, onPay, onOpenDebt, onEditDebt, onDeleteDebt }) {
  const [open, setOpen] = useStateDebtors(false);
  const insts = instByDebt(store, debt.id);
  const debtor = debtorById(store, debt.debtorId);
  const paid = insts.filter(i=>isFullyPaid(i));
  const remaining = round2(insts.reduce((s,i)=>s+instRemaining(i),0));
  const ratio = debtorPaidRatioForList(insts);
  const m = DEBT_TYPE[debt.type];
  const hasOverdue = insts.some(i=>!isFullyPaid(i)&&isOverdueDate(i));

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
          const rem = instRemaining(inst);
          return (
            <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: sm.weak, color: sm.color, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{inst.number}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{money(inst.amount)}{st==="PARTIAL" && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--partial)", marginLeft: 6 }}>falta {money(rem)}</span>}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{st==="PAID" ? `Pago em ${fmtDate(inst.paidAt)}` : st==="PARTIAL" ? `${money(instPaid(inst))} pago · vence ${fmtDate(inst.dueDate)}` : `Vence ${fmtDate(inst.dueDate)}`}</div>
              </div>
              {st === "PAID"
                ? (instPayments(inst).length > 1
                    ? <button onClick={()=>onPay({ inst, debt, debtor })} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--paid-weak)", color: "var(--paid)", border: "none", padding: "5px 11px", borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}><Icon name="clock" size={13} strokeWidth={2.6} />{instPayments(inst).length} pagamentos</button>
                    : <StatusBadge status="PAID" size="sm" />)
                : <Button size="sm" variant="primary" icon="wallet" onClick={()=>onPay({ inst, debt, debtor })}>Receber</Button>}
            </div>
          );
        })}
        {onEditDebt && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <button onClick={()=>onEditDebt(debt)} aria-label="Editar dívida"
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: "calc(var(--radius)*0.55)", border: "none", background: "transparent", color: "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "background .15s, color .15s" }}
              onMouseEnter={e=>{e.currentTarget.style.background="var(--surface-hover)";e.currentTarget.style.color="var(--text)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--text-muted)";}}>
              <Icon name="edit" size={15} /> Editar
            </button>
          </div>
        )}
      </div>}
    </div>
  );
}

function debtorPaidRatioForList(insts) {
  const total = insts.reduce((s,i)=>s+Number(i.amount),0);
  const paid = insts.reduce((s,i)=>s+instPaid(i),0);
  return total > 0 ? paid/total : 0;
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

// Edit debt form (Sheet) — description + type only (amount/installments are immutable once generated)
function DebtForm({ open, onClose, onSave, onDelete, editing }) {
  const [description, setDescription] = useStateDebtors("");
  const [type, setType] = useStateDebtors("PIX_INSTALLMENT");

  React.useEffect(() => {
    if (open && editing) { setDescription(editing.description || ""); setType(editing.type || "PIX_INSTALLMENT"); }
  }, [open, editing]);

  const TYPES = ["CASH", "PIX", "CREDIT_CARD", "PIX_INSTALLMENT"];

  function save() { onSave({ id: editing.id, description: description.trim() || null, type }); }

  return (
    <Sheet open={open} onClose={onClose} title="Editar dívida"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button full icon="check" onClick={save}>Salvar</Button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 4 }}>
        <Field label="Descrição" value={description} onChange={setDescription} placeholder="Empréstimo de junho" hint="Opcional" autoFocus />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-muted)", marginBottom: 7 }}>Tipo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {TYPES.map(tp => {
              const m = DEBT_TYPE[tp]; const active = type === tp;
              return (
                <button key={tp} onClick={()=>setType(tp)}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 14px", borderRadius: "calc(var(--radius)*0.6)", cursor: "pointer", textAlign: "left",
                    background: active ? "var(--primary-weak)" : "var(--surface)", border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`, color: active ? "var(--primary)" : "var(--text)", fontWeight: 700, fontSize: 14, transition: "all .15s" }}>
                  <Icon name={m.icon} size={18} /> {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* destructive zone — deliberately separated and quiet */}
        {onDelete && (
          <div style={{ marginTop: 4, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <button onClick={()=>onDelete(editing)}
              style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: "calc(var(--radius)*0.6)", border: "none", background: "transparent", color: "var(--overdue)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}
              onMouseEnter={e=>e.currentTarget.style.background="var(--overdue-weak)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <Icon name="trash" size={16} /> Excluir dívida
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

Object.assign(window, { DebtorsList, DebtorDetail, DebtorForm, DebtForm, DebtCard });
