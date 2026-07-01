// Pague os 50 centavos — payment registration sheet (supports partial payments)
const { useState: useStatePay, useEffect: useEffectPay } = React;

// parse a pt-BR / loose numeric string to a number
function parseAmount(str) {
  if (str == null) return 0;
  let s = String(str).trim().replace(/\s/g, "").replace(/R\$/g, "");
  // if both . and , present, assume . thousands and , decimal
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function SummaryStat({ label, value, color, big }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, marginBottom: 3, whiteSpace: "nowrap" }}>{label}</div>
      <Money value={value} size={big ? 22 : 17} weight={800} color={color} />
    </div>
  );
}

function PaymentSheet({ open, onClose, context, onConfirm, onDeletePayment }) {
  // context: { inst, debt, debtor }
  const inst = context?.inst;
  const remainingBefore = inst ? instRemaining(inst) : 0;
  const alreadyPaid = inst ? instPaid(inst) : 0;
  const fullAmount = inst ? Number(inst.amount) : 0;
  const payments = inst ? instPayments(inst) : [];

  const [amountStr, setAmountStr] = useStatePay("");
  const [date, setDate] = useStatePay("");
  const [err, setErr] = useStatePay("");
  const [quick, setQuick] = useStatePay("total"); // which chip is active: 'half' | 'total' | 'custom'
  const [histOpen, setHistOpen] = useStatePay(false);

  useEffectPay(() => {
    if (open && inst) {
      setAmountStr(formatAmountInput(remainingBefore));
      setDate(new Date(TODAY).toISOString().slice(0, 10));
      setErr(""); setQuick("total");
      // expand history by default only when there's nothing to register (fully paid)
      setHistOpen(remainingBefore <= 0.005);
    }
  }, [open, inst && inst.id]);

  if (!context || !inst) return null;

  const amount = round2(parseAmount(amountStr));
  const remainingAfter = round2(Math.max(0, remainingBefore - amount));
  const willFullyPay = amount >= remainingBefore - 0.005 && amount > 0;
  const overpay = amount > remainingBefore + 0.005;

  function setQuickHalf() {
    const half = round2(remainingBefore / 2);
    setAmountStr(formatAmountInput(half)); setQuick("half"); setErr("");
  }
  function setQuickTotal() {
    setAmountStr(formatAmountInput(remainingBefore)); setQuick("total"); setErr("");
  }
  function onAmountChange(v) {
    // allow digits, comma, dot
    setAmountStr(v.replace(/[^\d.,]/g, "")); setQuick("custom"); setErr("");
  }

  function confirm() {
    if (!(amount > 0)) return setErr("Informe um valor maior que zero.");
    if (overpay) return setErr(`O valor não pode ser maior que o restante (${money(remainingBefore)}).`);
    onConfirm(inst, { amount, date: date + "T12:00:00.000Z", fully: willFullyPay });
  }

  const m = DEBT_TYPE[context.debt?.type] || {};
  const readOnly = remainingBefore <= 0.005; // fully paid → history-only view

  return (
    <Sheet open={open} onClose={onClose} title={readOnly ? "Pagamentos da parcela" : "Registrar pagamento"}
      footer={readOnly
        ? <Button full size="lg" variant="secondary" onClick={onClose}>Fechar</Button>
        : <>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button full size="lg" icon="check" onClick={confirm}>
          {willFullyPay ? "Quitar parcela" : "Registrar"}
        </Button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 2 }}>

        {/* who / which installment */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={context.debtor?.name} size={44} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{context.debtor?.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Parcela {inst.number} · {context.debt?.description || m.label} · vence {fmtDate(inst.dueDate)}
            </div>
          </div>
        </div>

        {/* balance summary */}
        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "15px 16px" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <SummaryStat label="Valor da parcela" value={fullAmount} color="var(--text)" />
            <div style={{ width: 1, background: "var(--border)" }} />
            <SummaryStat label="Já pago" value={alreadyPaid} color={alreadyPaid > 0 ? "var(--paid)" : "var(--text-muted)"} />
            <div style={{ width: 1, background: "var(--border)" }} />
            <SummaryStat label="Restante" value={remainingBefore} color={remainingBefore > 0 ? "var(--overdue)" : "var(--paid)"} />
          </div>
          {alreadyPaid > 0 && <div style={{ marginTop: 12 }}><Progress value={alreadyPaid / fullAmount} color="var(--paid)" height={6} /></div>}
        </div>

        {/* payment history — collapsed accordion by default */}
        {payments.length > 0 && (
          <div style={{ border: "1px solid var(--border)", borderRadius: "calc(var(--radius)*0.7)", overflow: "hidden" }}>
            <button onClick={()=>setHistOpen(o=>!o)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "12px 14px", background: histOpen ? "var(--surface-2)" : "var(--surface)", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "background .15s" }}>
              <Icon name="clock" size={16} color="var(--text-muted)" />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>Histórico de pagamentos</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--paid)", background: "var(--paid-weak)", padding: "1px 8px", borderRadius: 99 }}>{payments.length}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)" }}>{money(alreadyPaid)}</span>
              <Icon name="chevronDown" size={16} color="var(--text-faint)" style={{ transform: histOpen ? "rotate(180deg)" : "none", transition: "transform .25s" }} />
            </button>
            {histOpen && (
              <div style={{ padding: "4px 14px 10px", animation: "ltFade .2s ease" }}>
                {payments.map((p, i) => (
                  <PaymentHistoryRow key={p.id || i} payment={p} index={i}
                    onDelete={onDeletePayment ? () => onDeletePayment(inst, p.id) : null} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* value input + quick chips */}
        {!readOnly && <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-muted)" }}>Valor recebido <span style={{ color: "var(--primary)" }}>*</span></span>
            <div style={{ display: "flex", gap: 6 }}>
              <Chip active={quick === "half"} onClick={setQuickHalf} disabled={remainingBefore <= 0}>Metade</Chip>
              <Chip active={quick === "total"} onClick={setQuickTotal} disabled={remainingBefore <= 0}>Total</Chip>
            </div>
          </div>
          <Field value={amountStr} onChange={onAmountChange} placeholder="0,00" prefix="R$" inputMode="decimal" error={err} />
        </div>}

        {/* date */}
        {!readOnly && <Field label="Data do pagamento" value={date} onChange={setDate} type="date" />}

        {/* live result */}
        {!readOnly && <div style={{ display: "flex", alignItems: "center", gap: 11, background: willFullyPay ? "var(--paid-weak)" : "var(--partial-weak)",
          borderRadius: "calc(var(--radius)*0.7)", padding: "13px 15px" }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: willFullyPay ? "var(--paid)" : "var(--partial)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name={willFullyPay ? "check" : "clock"} size={18} color="#fff" strokeWidth={2.6} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: willFullyPay ? "var(--paid)" : "var(--partial)" }}>
              {amount <= 0 ? "Informe um valor" : willFullyPay ? "Parcela será quitada" : "Pagamento parcial"}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", fontWeight: 600 }}>
              {amount > 0 && !willFullyPay ? <>Restante após: <b style={{ color: "var(--text)" }}>{money(remainingAfter)}</b></> : willFullyPay ? "Nada mais a receber nesta parcela" : "\u00A0"}
            </div>
          </div>
        </div>}
      </div>
    </Sheet>
  );
}

function Chip({ children, active, onClick, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ padding: "5px 12px", borderRadius: 99, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 12.5,
        border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`, background: active ? "var(--primary)" : "var(--surface)",
        color: active ? "var(--on-primary)" : "var(--text-muted)", opacity: disabled ? 0.5 : 1, transition: "all .15s", fontFamily: "inherit" }}>
      {children}
    </button>
  );
}

// format a number like 500 or 12.5 into "500,00" / "12,50" for the input
function formatAmountInput(n) {
  return Number(n).toFixed(2).replace(".", ",");
}

function PaymentHistoryRow({ payment, index, onDelete }) {
  const [removing, setRemoving] = useStatePay(false);
  function handleDelete() {
    if (removing) return;
    setRemoving(true);
    setTimeout(() => onDelete && onDelete(), 240);
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: "1px solid var(--border)", overflow: "hidden",
      animation: removing ? "ltSwipeOut .24s cubic-bezier(0.4,0,1,1) forwards" : "none" }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--paid-weak)", color: "var(--paid)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name="check" size={14} strokeWidth={2.8} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{fmtDate(payment.date)}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 600 }}>{index + 1}º pagamento</div>
      </div>
      <Money value={payment.amount} size={15} weight={800} color="var(--paid)" />
      {onDelete && (
        <button onClick={handleDelete} aria-label="Remover pagamento"
          style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 8, border: "none", background: "transparent", color: "var(--overdue)", cursor: "pointer", flexShrink: 0, transition: "background .15s" }}
          onMouseEnter={e=>e.currentTarget.style.background="var(--overdue-weak)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <Icon name="trash" size={15} />
        </button>
      )}
    </div>
  );
}

Object.assign(window, { PaymentSheet, parseAmount });
