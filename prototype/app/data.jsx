// LendTrack — mock data store wired to the API shapes from PROJECT_STRUCTURE.md
// "Today" anchor for the prototype
const TODAY = new Date("2026-05-29T12:00:00.000Z");

// ---------- helpers ----------
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function money(v) { return BRL.format(Number(v)); }
// compact-ish for big hero numbers but keep full
function moneyParts(v) {
  const s = money(v); // "R$ 1.380,00"
  const m = s.match(/^(\D+)\s?([\d.]+),(\d{2})$/);
  if (!m) return { symbol: "R$", int: s, dec: "" };
  return { symbol: m[1].trim(), int: m[2], dec: m[3] };
}

const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const MESLONG = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function d(iso) { return new Date(iso); }
function fmtDate(date) { const x = d(date); return `${String(x.getUTCDate()).padStart(2,"0")} ${MES[x.getUTCMonth()]} ${x.getUTCFullYear()}`; }
function fmtDateShort(date) { const x = d(date); return `${String(x.getUTCDate()).padStart(2,"0")}/${String(x.getUTCMonth()+1).padStart(2,"0")}`; }
function fmtDayName(date) { return DIA[d(date).getUTCDay()]; }
function monthKey(date) { const x = d(date); return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,"0")}`; }
function monthLabel(key) { const [y,m] = key.split("-"); return `${MESLONG[Number(m)-1]} de ${y}`; }
function monthLabelShort(key) { const [y,m] = key.split("-"); return `${MESLONG[Number(m)-1].slice(0,3)} ${y}`; }
function addMonthsKey(key, delta) {
  let [y,m] = key.split("-").map(Number); m = m - 1 + delta;
  y += Math.floor(m/12); m = ((m%12)+12)%12; return `${y}-${String(m+1).padStart(2,"0")}`;
}
function daysBetween(a, b) { return Math.round((d(a) - d(b)) / 86400000); }

// status computed from dates + paidAt, per spec
function instStatus(inst) {
  if (inst.paidAt) return "PAID";
  if (d(inst.dueDate) < TODAY && !sameDay(inst.dueDate, TODAY)) return "OVERDUE";
  return "PENDING";
}
function sameDay(a, b) { const x=d(a),y=d(b); return x.getUTCFullYear()===y.getUTCFullYear()&&x.getUTCMonth()===y.getUTCMonth()&&x.getUTCDate()===y.getUTCDate(); }

const DEBT_TYPE = {
  CASH: { label: "Dinheiro", icon: "banknote", short: "Dinheiro" },
  CREDIT_CARD: { label: "Cartão de crédito", icon: "card", short: "Cartão" },
  PIX: { label: "Pix", icon: "zap", short: "Pix" },
  PIX_INSTALLMENT: { label: "Pix parcelado", icon: "layers", short: "Pix parc." },
};

const STATUS_META = {
  PAID: { label: "Pago", color: "var(--paid)", weak: "var(--paid-weak)", icon: "check" },
  PENDING: { label: "Pendente", color: "var(--pending)", weak: "var(--pending-weak)", icon: "clock" },
  OVERDUE: { label: "Atrasado", color: "var(--overdue)", weak: "var(--overdue-weak)", icon: "alert" },
};

// ---------- seed data ----------
function iso(y,m,day) { return new Date(Date.UTC(y, m-1, day, 0,0,0)).toISOString(); }

let _id = 0; const uid = (p) => `${p}_${(++_id).toString(36)}${Date.now().toString(36).slice(-3)}`;

const SEED_LENDER = { id: "lender_1", email: "joao@example.com", name: "João Silva", confirmed: true, createdAt: iso(2026,1,12) };

// debtors
const SEED = [
  {
    debtor: { id:"d1", name:"Maria Souza", email:"maria@example.com", phone:"+55 11 91234-5678", notes:"Vizinha do bloco B", createdAt: iso(2026,2,3) },
    debts: [
      { type:"PIX_INSTALLMENT", description:"Empréstimo de junho", total:"1500.00", insts:[
        { n:1, amount:"500.00", due:iso(2026,5,1), paid:iso(2026,5,2) },
        { n:2, amount:"500.00", due:iso(2026,6,1) },
        { n:3, amount:"500.00", due:iso(2026,7,1) },
      ]},
      { type:"CREDIT_CARD", description:"Parcelei a TV pra ela", total:"1200.00", insts:[
        { n:1, amount:"300.00", due:iso(2026,4,10), paid:iso(2026,4,11) },
        { n:2, amount:"300.00", due:iso(2026,5,10) },
        { n:3, amount:"300.00", due:iso(2026,6,10) },
        { n:4, amount:"300.00", due:iso(2026,7,10) },
      ]},
    ],
  },
  {
    debtor: { id:"d2", name:"Carlos Pereira", email:null, phone:"+55 11 98888-1122", notes:"Colega de trabalho", createdAt: iso(2026,3,1) },
    debts: [
      { type:"CASH", description:"Dinheiro emprestado", total:"400.00", insts:[ { n:1, amount:"400.00", due:iso(2026,5,20) } ]},
      { type:"PIX", description:"Rateio do churrasco", total:"80.00", insts:[ { n:1, amount:"80.00", due:iso(2026,5,26) } ]},
    ],
  },
  {
    debtor: { id:"d3", name:"Ana Oliveira", email:"ana.oli@example.com", phone:null, notes:"Prima", createdAt: iso(2026,3,18) },
    debts: [
      { type:"PIX_INSTALLMENT", description:"Conserto do carro", total:"900.00", insts:[
        { n:1, amount:"300.00", due:iso(2026,5,15), paid:iso(2026,5,15) },
        { n:2, amount:"300.00", due:iso(2026,6,15) },
        { n:3, amount:"300.00", due:iso(2026,7,15) },
      ]},
    ],
  },
  {
    debtor: { id:"d4", name:"Roberto Lima", email:null, phone:"+55 11 97777-3344", notes:"Amigo da academia", createdAt: iso(2026,2,20) },
    debts: [
      { type:"CREDIT_CARD", description:"Notebook usado", total:"2000.00", insts:[
        { n:1, amount:"400.00", due:iso(2026,3,5), paid:iso(2026,3,5) },
        { n:2, amount:"400.00", due:iso(2026,4,5), paid:iso(2026,4,6) },
        { n:3, amount:"400.00", due:iso(2026,5,5), paid:iso(2026,5,4) },
        { n:4, amount:"400.00", due:iso(2026,6,5) },
        { n:5, amount:"400.00", due:iso(2026,7,5) },
      ]},
    ],
  },
  {
    debtor: { id:"d5", name:"Fernanda Costa", email:"fe.costa@example.com", phone:"+55 21 96543-2211", notes:"Comprou meu celular antigo", createdAt: iso(2026,5,5) },
    debts: [
      { type:"PIX", description:"Celular antigo", total:"600.00", insts:[ { n:1, amount:"600.00", due:iso(2026,5,31) } ]},
    ],
  },
];

function buildStore() {
  const debtors = [];
  const debts = [];
  const installments = [];
  for (const row of SEED) {
    debtors.push({ ...row.debtor, lenderId: SEED_LENDER.id });
    for (const dd of row.debts) {
      const debtId = uid("debt");
      debts.push({ id: debtId, description: dd.description, type: dd.type, totalAmount: dd.total, debtorId: row.debtor.id, createdAt: dd.insts[0].due });
      for (const it of dd.insts) {
        installments.push({ id: uid("inst"), number: it.n, amount: it.amount, dueDate: it.due, paidAt: it.paid || null, debtId });
      }
    }
  }
  return { debtors, debts, installments };
}

// ---------- selectors (mirror the API) ----------
function debtsByDebtor(store, debtorId) { return store.debts.filter(x => x.debtorId === debtorId); }
function instByDebt(store, debtId) { return store.installments.filter(x => x.debtId === debtId).sort((a,b)=>a.number-b.number); }
function instByDebtor(store, debtorId) {
  const ids = new Set(debtsByDebtor(store, debtorId).map(x=>x.id));
  return store.installments.filter(x => ids.has(x.debtId));
}
function debtorOutstanding(store, debtorId) {
  return instByDebtor(store, debtorId).filter(i => instStatus(i)!=="PAID").reduce((s,i)=>s+Number(i.amount),0);
}
function debtorOverdueCount(store, debtorId) {
  return instByDebtor(store, debtorId).filter(i => instStatus(i)==="OVERDUE").length;
}
function debtorPaidRatio(store, debtorId) {
  const all = instByDebtor(store, debtorId);
  if (!all.length) return 0;
  return all.filter(i=>instStatus(i)==="PAID").length / all.length;
}
function debtorById(store, id) { return store.debtors.find(x=>x.id===id); }
function debtById(store, id) { return store.debts.find(x=>x.id===id); }

// GET /dashboard?month=YYYY-MM
function dashboard(store, mKey) {
  const inMonth = store.installments.filter(i => monthKey(i.dueDate) === mKey);
  let totalExpected=0, totalReceived=0, totalPending=0, totalOverdue=0;
  let paid=0, pending=0, overdue=0;
  for (const i of inMonth) {
    const amt = Number(i.amount); totalExpected += amt;
    const st = instStatus(i);
    if (st==="PAID") { totalReceived += amt; paid++; }
    else if (st==="OVERDUE") { totalOverdue += amt; overdue++; }
    else { totalPending += amt; pending++; }
  }
  return { month: mKey, totalExpected, totalReceived, totalPending, totalOverdue,
    counts: { paid, pending, overdue, total: inMonth.length } };
}

// GET /installments?period=&date=&debtorId=
function installmentsForPeriod(store, period, dateKey, debtorId) {
  const base = d(dateKey + "T12:00:00.000Z");
  let start, end;
  if (period === "day") { start = startOfDay(base); end = endOfDay(base); }
  else if (period === "week") {
    const day = (base.getUTCDay()+6)%7; // Monday=0
    start = startOfDay(addDays(base, -day)); end = endOfDay(addDays(base, 6-day));
  } else { // month
    start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
    end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth()+1, 0, 23,59,59));
  }
  let list = store.installments.filter(i => { const t = d(i.dueDate); return t >= start && t <= end; });
  if (debtorId) { const ids = new Set(debtsByDebtor(store, debtorId).map(x=>x.id)); list = list.filter(i=>ids.has(i.debtId)); }
  return list.sort((a,b)=> d(a.dueDate)-d(b.dueDate));
}
function startOfDay(x){ return new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth(),x.getUTCDate(),0,0,0)); }
function endOfDay(x){ return new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth(),x.getUTCDate(),23,59,59)); }
function addDays(x,n){ return new Date(x.getTime()+n*86400000); }

// enrich an installment with its debt + debtor for list rendering
function enrich(store, inst) {
  const debt = debtById(store, inst.debtId);
  const debtor = debt ? debtorById(store, debt.debtorId) : null;
  return { inst, debt, debtor, status: instStatus(inst) };
}

// overall "owed to me right now" across everything
function totalOwedNow(store) {
  return store.installments.filter(i => instStatus(i)!=="PAID").reduce((s,i)=>s+Number(i.amount),0);
}

Object.assign(window, {
  TODAY, money, moneyParts, fmtDate, fmtDateShort, fmtDayName, monthKey, monthLabel, monthLabelShort,
  addMonthsKey, daysBetween, instStatus, sameDay, DEBT_TYPE, STATUS_META, MESLONG, MES, DIA,
  SEED_LENDER, buildStore, uid, iso,
  debtsByDebtor, instByDebt, instByDebtor, debtorOutstanding, debtorOverdueCount, debtorPaidRatio,
  debtorById, debtById, dashboard, installmentsForPeriod, enrich, totalOwedNow,
});
