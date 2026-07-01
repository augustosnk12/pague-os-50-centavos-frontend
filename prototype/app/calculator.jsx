// Pague os 50 centavos — simple calculator popup
const { useState: useStateCalc, useEffect: useEffectCalc, useRef: useRefCalc } = React;

// format a numeric string for display in pt-BR (thousand separators, comma decimals)
function calcFmt(str) {
  if (str === "" || str === "-") return str || "0";
  if (str === "Erro") return str;
  const neg = str.startsWith("-");
  let s = neg ? str.slice(1) : str;
  let [intp, decp] = s.split(".");
  intp = intp.replace(/^0+(?=\d)/, "");
  const grouped = Number(intp || "0").toLocaleString("pt-BR");
  let out = grouped;
  if (decp !== undefined) out += "," + decp;
  return (neg ? "-" : "") + out;
}

function round12(n) {
  // avoid float noise; keep up to 10 significant decimals
  return parseFloat(n.toFixed(10));
}

function Calculator({ onUse }) {
  const [cur, setCur] = useStateCalc("0");      // current entry (string, raw with '.')
  const [acc, setAcc] = useStateCalc(null);     // accumulated value (number)
  const [op, setOp] = useStateCalc(null);       // pending operator
  const [fresh, setFresh] = useStateCalc(true); // next digit starts a new entry
  const [expr, setExpr] = useStateCalc("");     // small history line

  const opSym = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  function inputDigit(d) {
    setCur(c => {
      if (fresh) return d;
      if (c === "0") return d;
      if (c.replace(/[-.]/g, "").length >= 12) return c; // cap length
      return c + d;
    });
    setFresh(false);
  }
  function inputDot() {
    setCur(c => (fresh ? "0." : c.includes(".") ? c : c + "."));
    setFresh(false);
  }
  function clearAll() { setCur("0"); setAcc(null); setOp(null); setFresh(true); setExpr(""); }
  function backspace() {
    if (fresh) return;
    setCur(c => {
      if (c.length <= 1 || (c.length === 2 && c.startsWith("-"))) return "0";
      return c.slice(0, -1);
    });
  }
  function toggleSign() {
    setCur(c => (c === "0" ? c : c.startsWith("-") ? c.slice(1) : "-" + c));
  }
  function percent() {
    setCur(c => {
      const v = parseFloat(c.replace(",", ".")) || 0;
      const base = acc != null && op ? acc : 1;
      const res = op ? round12(base * v / 100) : round12(v / 100);
      return String(res);
    });
  }

  function compute(a, b, operator) {
    switch (operator) {
      case "+": return round12(a + b);
      case "-": return round12(a - b);
      case "*": return round12(a * b);
      case "/": return b === 0 ? "Erro" : round12(a / b);
      default: return b;
    }
  }

  function chooseOp(nextOp) {
    const val = parseFloat(cur.replace(",", ".")) || 0;
    if (op && !fresh) {
      const r = compute(acc, val, op);
      if (r === "Erro") { setCur("Erro"); setAcc(null); setOp(null); setFresh(true); setExpr(""); return; }
      setAcc(r); setCur(String(r));
      setExpr(`${calcFmt(String(r))} ${opSym[nextOp]}`);
    } else {
      setAcc(val);
      setExpr(`${calcFmt(cur)} ${opSym[nextOp]}`);
    }
    setOp(nextOp); setFresh(true);
  }

  function equals() {
    if (op == null) return;
    const val = parseFloat(cur.replace(",", ".")) || 0;
    const r = compute(acc, val, op);
    if (r === "Erro") { setCur("Erro"); setAcc(null); setOp(null); setFresh(true); setExpr(""); return; }
    setExpr(`${calcFmt(String(acc))} ${opSym[op]} ${calcFmt(cur)} =`);
    setCur(String(r)); setAcc(null); setOp(null); setFresh(true);
  }

  // keyboard support
  useEffectCalc(() => {
    function onKey(e) {
      const k = e.key;
      if (k >= "0" && k <= "9") { inputDigit(k); e.preventDefault(); }
      else if (k === "." || k === ",") { inputDot(); e.preventDefault(); }
      else if (k === "+" || k === "-" || k === "*" || k === "/") { chooseOp(k); e.preventDefault(); }
      else if (k === "Enter" || k === "=") { equals(); e.preventDefault(); }
      else if (k === "Backspace") { backspace(); e.preventDefault(); }
      else if (k === "Escape") { clearAll(); e.preventDefault(); }
      else if (k === "%") { percent(); e.preventDefault(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const display = cur === "Erro" ? "Erro" : calcFmt(cur);
  const isErr = cur === "Erro";
  const numericValue = isErr ? null : parseFloat(cur.replace(",", "."));

  // a calculator key
  function Key({ label, onPress, kind = "num", span, icon, ariaLabel }) {
    const [hover, setHover] = useStateCalc(false);
    const [press, setPress] = useStateCalc(false);
    const palette = {
      num:    { bg: "var(--surface)", fg: "var(--text)", bd: "var(--border)" },
      fn:     { bg: "var(--surface-2)", fg: "var(--text-muted)", bd: "var(--border)" },
      op:     { bg: "var(--primary-weak)", fg: "var(--primary)", bd: "transparent" },
      eq:     { bg: "var(--primary)", fg: "var(--on-primary)", bd: "transparent" },
      active: { bg: "var(--primary)", fg: "var(--on-primary)", bd: "transparent" },
    };
    const p = palette[kind];
    return (
      <button onClick={onPress} aria-label={ariaLabel || label}
        onMouseEnter={()=>setHover(true)} onMouseLeave={()=>{setHover(false);setPress(false);}}
        onMouseDown={()=>setPress(true)} onMouseUp={()=>setPress(false)}
        style={{ gridColumn: span ? `span ${span}` : "auto", border: `1px solid ${p.bd}`, borderRadius: "calc(var(--radius) * 0.7)",
          background: p.bg, color: p.fg, fontSize: 22, fontWeight: 700, cursor: "pointer", height: 60,
          display: "grid", placeItems: "center", transition: "transform .08s ease, filter .15s, background .15s",
          filter: hover ? "brightness(0.97)" : "none", transform: press ? "scale(0.95)" : "scale(1)",
          boxShadow: kind === "eq" ? "var(--shadow-primary)" : "var(--shadow-sm)", fontFamily: "inherit" }}>
        {icon ? <Icon name={icon} size={22} strokeWidth={2.2} /> : label}
      </button>
    );
  }

  return (
    <div style={{ paddingTop: 2 }}>
      {/* display */}
      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px", marginBottom: 14, textAlign: "right", overflow: "hidden" }}>
        <div style={{ minHeight: 20, fontSize: 14, color: "var(--text-faint)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {expr || "\u00A0"}
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em", color: isErr ? "var(--overdue)" : "var(--text)", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {display}
        </div>
      </div>

      {/* keypad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 9 }}>
        <Key label="C" kind="fn" onPress={clearAll} ariaLabel="Limpar" />
        <Key label="±" kind="fn" onPress={toggleSign} ariaLabel="Trocar sinal" />
        <Key label="%" kind="fn" onPress={percent} ariaLabel="Porcentagem" />
        <Key icon="backspace" kind="fn" onPress={backspace} ariaLabel="Apagar" />

        <Key label="7" onPress={()=>inputDigit("7")} />
        <Key label="8" onPress={()=>inputDigit("8")} />
        <Key label="9" onPress={()=>inputDigit("9")} />
        <Key label="÷" kind="op" onPress={()=>chooseOp("/")} ariaLabel="Dividir" />

        <Key label="4" onPress={()=>inputDigit("4")} />
        <Key label="5" onPress={()=>inputDigit("5")} />
        <Key label="6" onPress={()=>inputDigit("6")} />
        <Key label="×" kind="op" onPress={()=>chooseOp("*")} ariaLabel="Multiplicar" />

        <Key label="1" onPress={()=>inputDigit("1")} />
        <Key label="2" onPress={()=>inputDigit("2")} />
        <Key label="3" onPress={()=>inputDigit("3")} />
        <Key label="−" kind="op" onPress={()=>chooseOp("-")} ariaLabel="Subtrair" />

        <Key label="0" span={2} onPress={()=>inputDigit("0")} />
        <Key label="," onPress={inputDot} ariaLabel="Vírgula decimal" />
        <Key label="+" kind="op" onPress={()=>chooseOp("+")} ariaLabel="Somar" />

        <Key label="=" kind="eq" span={4} onPress={equals} ariaLabel="Igual" />
      </div>

      {/* optional: use the result as a value elsewhere */}
      {onUse && (
        <Button full size="lg" icon="check" variant="soft" style={{ marginTop: 12 }}
          disabled={isErr || !(numericValue > 0)}
          onClick={()=> onUse(round12(numericValue))}>
          Usar {numericValue > 0 ? money(round12(numericValue)) : "valor"}
        </Button>
      )}
    </div>
  );
}

function CalculatorSheet({ open, onClose, onUse }) {
  return (
    <Sheet open={open} onClose={onClose} title="Calculadora">
      <Calculator onUse={onUse} />
    </Sheet>
  );
}

Object.assign(window, { Calculator, CalculatorSheet });
