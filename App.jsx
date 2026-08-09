import React, { useState } from "react";
import {
  ArrowLeft, TrendingUp, TrendingDown, PiggyBank, Landmark, Flame, Heart,
  Coins, FileText, Activity, PieChart as IconPie, Briefcase, Sparkles,
  Calculator as CalcIcon, Plus, Trash2, Wallet, ChevronRight, ChevronDown,
  Building2, Home as HomeIcon, Settings as SettingsIcon, RefreshCw,
  DollarSign, Ruler, Package, Square, Clock, Database, Tag, Droplet, Hash, Gauge, Thermometer, Receipt
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, AreaChart, Area
} from "recharts";

/* ----------------------------- THEME -----------------------------
   Black background, white text. GREEN = profit/winner/good,
   RED = loss/cost/warning, GOLD = single brand accent.
------------------------------------------------------------------- */
const T = {
  bg: "#000000", bgSoft: "#0D0D0F", card: "#141416", cardHi: "#1C1C1F",
  border: "#2A2A2E", borderSoft: "#1F1F22", text: "#FFFFFF", sub: "#A6A6AC",
  faint: "#6B6B72", gold: "#E8A33D", green: "#22C55E", red: "#EF4444",
};
const CHART_COLORS = [T.gold, T.green, "#5B8DEF"];

const nf = new Intl.NumberFormat("en-IN");
const money = (v) => "₹" + nf.format(Math.round(Number(v) || 0));
const num = (v) => (v === "" || v === undefined || v === null || isNaN(v) ? 0 : Number(v));
const pct1 = (v) => (Number(v) || 0).toFixed(1) + "%";
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function yrsMonthsText(totalMonths) {
  totalMonths = Math.max(Math.round(totalMonths), 0);
  const y = Math.floor(totalMonths / 12), m = totalMonths % 12;
  if (y <= 0) return `${m} Month${m === 1 ? "" : "s"}`;
  if (m === 0) return `${y} Year${y === 1 ? "" : "s"}`;
  return `${y} Year${y === 1 ? "" : "s"} & ${m} Month${m === 1 ? "" : "s"}`;
}

/* --------------------------- FINANCE FORMULAS ------------------------------ */
function sipFV(monthly, annualRatePct, years) {
  const n = Math.round(years * 12);
  const i = annualRatePct / 1200;
  if (n <= 0) return 0;
  if (i === 0) return monthly * n;
  return monthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
}
function sipSeries(monthly, annualRatePct, years) {
  const out = [];
  for (let y = 0; y <= Math.round(years); y++) out.push({ year: y, invested: monthly * 12 * y, value: sipFV(monthly, annualRatePct, y) });
  return out;
}
function fdMaturity(principal, ratePct, years, compPerYear) {
  return principal * Math.pow(1 + ratePct / 100 / compPerYear, compPerYear * years);
}
function fdSeries(principal, ratePct, years, compPerYear) {
  const out = [];
  for (let y = 0; y <= Math.round(years); y++) out.push({ year: y, value: fdMaturity(principal, ratePct, y, compPerYear) });
  return out;
}
function annualAnnuityFV(annualDeposit, ratePct, years) {
  const r = ratePct / 100;
  if (years <= 0) return 0;
  if (r === 0) return annualDeposit * years;
  return annualDeposit * ((Math.pow(1 + r, years) - 1) / r) * (1 + r);
}
function swpSimulate(principal, annualRatePct, monthlyWithdrawal, months) {
  let corpus = principal;
  const i = annualRatePct / 1200;
  const rows = [];
  let totalWithdrawn = 0, depletedAt = null;
  for (let m = 1; m <= months; m++) {
    const opening = corpus;
    const withdrawal = Math.min(monthlyWithdrawal, Math.max(corpus, 0));
    const afterW = corpus - withdrawal;
    const returns = afterW > 0 ? afterW * i : 0;
    corpus = afterW + returns;
    totalWithdrawn += withdrawal;
    if (corpus <= 0 && depletedAt === null) depletedAt = m;
    rows.push({ month: m, opening, withdrawal, returns, closing: corpus });
  }
  return { rows, finalCorpus: corpus, totalWithdrawn, depletedAt };
}
function emiOf(principal, ratePct, years) {
  const r = ratePct / 1200, n = Math.max(Math.round(years * 12), 1);
  if (principal <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}
function amortizationMonthly({ principal, rate, years, extraEmisPerYear = 0, stepUpPct = 0, lumpsum = 0, lumpsumMonth = 12, lumpsumMode = "tenure" }) {
  const r = rate / 1200;
  let bal = principal;
  let emi = emiOf(principal, rate, years);
  let month = 0, lumpsumApplied = false;
  const rows = [];
  const maxMonths = Math.round(years * 12) + 360;
  while (bal > 0.5 && month < maxMonths) {
    month++;
    if (stepUpPct > 0 && month > 1 && (month - 1) % 12 === 0) emi = emi * (1 + stepUpPct / 100);
    const opening = bal;
    const interest = bal * r;
    let principalPay = emi - interest;
    if (principalPay < 0) principalPay = 0;
    if (principalPay > bal) principalPay = bal;
    bal -= principalPay;
    let prepay = 0;
    if (!lumpsumApplied && lumpsum > 0 && month === Math.round(lumpsumMonth)) {
      const applied = Math.min(lumpsum, bal);
      bal -= applied; prepay += applied; lumpsumApplied = true;
      if (lumpsumMode === "emi" && bal > 0) {
        const monthsLeft = Math.round(years * 12) - month;
        if (monthsLeft > 0) emi = emiOf(bal, rate, monthsLeft / 12);
      }
    }
    if (extraEmisPerYear > 0 && month % 12 === 0 && bal > 0) {
      const applied = Math.min(extraEmisPerYear * emi, bal);
      bal -= applied; prepay += applied;
    }
    if (bal < 1) bal = 0;
    rows.push({ month, opening, emi, interest, principal: principalPay, prepayment: prepay, closing: bal });
  }
  return rows;
}
function amortizationYearly(monthlyRows) {
  const years = [];
  let acc = null;
  monthlyRows.forEach((r) => {
    const y = Math.ceil(r.month / 12);
    if (!acc || acc.year !== y) { if (acc) years.push(acc); acc = { year: y, opening: r.opening, emi: 0, interest: 0, principal: 0, prepayment: 0, closing: r.closing }; }
    acc.emi += r.emi; acc.interest += r.interest; acc.principal += r.principal; acc.prepayment += r.prepayment; acc.closing = r.closing;
  });
  if (acc) years.push(acc);
  return years;
}
function simulateMultiLoan(loans, extraBudget, strategy) {
  let bals = loans.map((l) => ({ ...l, balance: num(l.balance), rate: num(l.rate), emi: num(l.emi), paid: false, payoffMonth: null }));
  let order = null;
  if (strategy === "snowball") order = [...bals].sort((a, b) => a.balance - b.balance).map((l) => l.id);
  if (strategy === "avalanche") order = [...bals].sort((a, b) => b.rate - a.rate).map((l) => l.id);
  let month = 0, totalInterest = 0, freed = strategy === "status" ? 0 : Math.max(num(extraBudget), 0);
  const totalDebtSeries = [];
  const payoffOrder = [];
  const maxMonths = 720;
  while (bals.some((b) => b.balance > 0.5) && month < maxMonths) {
    month++;
    let targetId = null;
    if (order) targetId = order.find((id) => bals.find((b) => b.id === id).balance > 0.5);
    bals.forEach((b) => {
      if (b.balance <= 0.5) return;
      const interest = b.balance * (b.rate / 1200);
      totalInterest += interest;
      let pay = b.emi;
      if (order && b.id === targetId) pay += freed;
      let principal = pay - interest;
      if (principal < 0) principal = 0;
      if (principal > b.balance) principal = b.balance;
      b.balance -= principal;
      if (b.balance <= 0.5 && !b.paid) {
        b.paid = true; b.payoffMonth = month;
        payoffOrder.push({ name: b.name, months: month });
        if (order) freed += b.emi;
      }
    });
    if (month % 12 === 0 || bals.every((b) => b.balance <= 0.5)) {
      totalDebtSeries.push({ year: Math.ceil(month / 12), total: Math.round(bals.reduce((s, b) => s + Math.max(b.balance, 0), 0)) });
    }
  }
  return { months: month, totalInterest, totalDebtSeries, payoffOrder };
}

/* --------------------------- CALCULATOR EXPRESSION ENGINE --------------------------- */
function evaluateExpr(str, angleMode) {
  let i = 0;
  const s = String(str).replace(/π/g, "pi").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  function isDigit(c) { return c >= "0" && c <= "9"; }
  function skipWs() { while (s[i] === " ") i++; }
  function parseExpression() {
    let v = parseTerm();
    while (true) {
      skipWs();
      if (s[i] === "+") { i++; v += parseTerm(); }
      else if (s[i] === "-") { i++; v -= parseTerm(); }
      else break;
    }
    return v;
  }
  function parseTerm() {
    let v = parsePower();
    while (true) {
      skipWs();
      if (s[i] === "*") { i++; v *= parsePower(); }
      else if (s[i] === "/") { i++; v /= parsePower(); }
      else break;
    }
    return v;
  }
  function parsePower() {
    let v = parseUnary();
    skipWs();
    if (s[i] === "^") { i++; const e = parsePower(); v = Math.pow(v, e); }
    return v;
  }
  function parseUnary() {
    skipWs();
    if (s[i] === "-") { i++; return -parseUnary(); }
    if (s[i] === "+") { i++; return parseUnary(); }
    return parsePostfix();
  }
  function parsePostfix() {
    let v = parseAtom();
    skipWs();
    while (s[i] === "!" || s[i] === "%") {
      if (s[i] === "!") { i++; v = factorial(v); }
      else if (s[i] === "%") { i++; v = v / 100; }
      skipWs();
    }
    return v;
  }
  function parseAtom() {
    skipWs();
    if (s[i] === "(") { i++; const v = parseExpression(); skipWs(); if (s[i] === ")") i++; return v; }
    const funcs = ["asin", "acos", "atan", "sin", "cos", "tan", "log", "ln", "sqrt", "abs"];
    for (const f of funcs) {
      if (s.substr(i, f.length) === f) {
        const save = i;
        i += f.length; skipWs();
        if (s[i] === "(") { i++; const arg = parseExpression(); skipWs(); if (s[i] === ")") i++; return applyFunc(f, arg); }
        i = save;
      }
    }
    if (s.substr(i, 2) === "pi") { i += 2; return Math.PI; }
    if (s[i] === "e" && !isDigit(s[i + 1])) { i += 1; return Math.E; }
    let start = i;
    while (i < s.length && (isDigit(s[i]) || s[i] === ".")) i++;
    if (start === i) throw new Error("Unexpected character");
    return parseFloat(s.slice(start, i));
  }
  function applyFunc(f, arg) {
    const rad = angleMode === "deg" ? (arg * Math.PI) / 180 : arg;
    switch (f) {
      case "sin": return Math.sin(rad);
      case "cos": return Math.cos(rad);
      case "tan": return Math.tan(rad);
      case "asin": return angleMode === "deg" ? (Math.asin(arg) * 180) / Math.PI : Math.asin(arg);
      case "acos": return angleMode === "deg" ? (Math.acos(arg) * 180) / Math.PI : Math.acos(arg);
      case "atan": return angleMode === "deg" ? (Math.atan(arg) * 180) / Math.PI : Math.atan(arg);
      case "log": return Math.log10(arg);
      case "ln": return Math.log(arg);
      case "sqrt": return Math.sqrt(arg);
      case "abs": return Math.abs(arg);
    }
  }
  function factorial(n) { n = Math.round(n); if (n < 0) return NaN; let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; }
  const result = parseExpression();
  skipWs();
  if (i < s.length) throw new Error("Unexpected trailing characters");
  return result;
}
function formatCalcResult(v) {
  if (!isFinite(v)) return "Error";
  if (Math.abs(v) < 1e-12) v = 0;
  const rounded = Math.round(v * 1e10) / 1e10;
  if (Number.isInteger(rounded)) return rounded.toString();
  return parseFloat(rounded.toPrecision(12)).toString();
}

/* --------------------------- UNIT CONVERTER TABLES --------------------------- */
const UNIT_CATS = {
  length: { label: "Length", base: "m", units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mile: 1609.34, yard: 0.9144, foot: 0.3048, inch: 0.0254 } },
  mass: { label: "Mass", base: "kg", units: { kg: 1, g: 0.001, mg: 0.000001, ton: 1000, pound: 0.453592, ounce: 0.0283495 } },
  area: { label: "Area", base: "sqm", units: { sqm: 1, sqkm: 1000000, sqft: 0.092903, sqyard: 0.836127, acre: 4046.86, hectare: 10000 } },
  volume: { label: "Volume", base: "liter", units: { liter: 1, ml: 0.001, gallon: 3.78541, cubicm: 1000, cubicft: 28.3168 } },
  speed: { label: "Speed", base: "kmh", units: { kmh: 1, ms: 3.6, mph: 1.60934, knot: 1.852 } },
  data: { label: "Data", base: "mb", units: { bit: 1.25e-7, byte: 1e-6, kb: 0.001, mb: 1, gb: 1000, tb: 1000000 } },
  time: { label: "Time", base: "sec", units: { sec: 1, min: 60, hour: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 } },
};
const CURRENCY_RATES_TO_INR = { INR: 1, USD: 87, EUR: 94, GBP: 110, AED: 23.7, SGD: 64, AUD: 56, CAD: 62, JPY: 0.58, SAR: 23.2 };
function convertUnit(cat, value, from, to) {
  const def = UNIT_CATS[cat];
  const base = value * def.units[from];
  return base / def.units[to];
}
function convertTemp(v, from, to) {
  let c;
  if (from === "C") c = v; else if (from === "F") c = ((v - 32) * 5) / 9; else c = v - 273.15;
  if (to === "C") return c; if (to === "F") return (c * 9) / 5 + 32; return c + 273.15;
}

/* --------------------------- UI ATOMS ------------------------------ */
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
      .sc * { box-sizing: border-box; }
      .sc { font-family: 'Inter', sans-serif; }
      .sc h1, .sc h2, .sc h3, .sc .disp { font-family: 'Space Grotesk', sans-serif; }
      .sc input, .sc select { font-family: 'Inter', sans-serif; }
      .sc ::selection { background: ${T.gold}55; }
      .sc .scrollbox::-webkit-scrollbar { width: 6px; height: 6px; }
      .sc .scrollbox::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
      .sc button:disabled { opacity: 0.35; cursor: not-allowed; }
      .sc button { -webkit-tap-highlight-color: transparent; }
    `}</style>
  );
}
function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.sub, marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: T.faint, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}
function NumInput({ value, onChange, prefix, suffix, placeholder, disabled }) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: disabled ? T.borderSoft : T.bgSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", opacity: disabled ? 0.6 : 1 }}>
      {prefix && <span style={{ color: T.faint, marginRight: 6, fontWeight: 600 }}>{prefix}</span>}
      <input type="number" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: "transparent", border: "none", outline: "none", color: T.text, fontSize: 15, fontWeight: 600, width: "100%", minWidth: 0 }} />
      {suffix && <span style={{ color: T.faint, marginLeft: 6, fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>{suffix}</span>}
    </div>
  );
}
function TextInput({ value, onChange, placeholder }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", background: T.bgSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", color: T.text, fontSize: 14, fontWeight: 500, outline: "none" }} />
  );
}
function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", background: T.bgSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", color: T.text, fontSize: 14, fontWeight: 600, outline: "none" }}>
      {options.map((o) => <option key={o.value} value={o.value} style={{ background: T.card }}>{o.label}</option>)}
    </select>
  );
}
function Toggle({ checked, onChange, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.bgSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", gap: 10 }}>
      <span style={{ fontSize: 13.5, color: T.text, fontWeight: 500 }}>{label}</span>
      <button onClick={() => onChange(!checked)}
        style={{ flexShrink: 0, width: 42, height: 24, borderRadius: 999, border: "none", cursor: "pointer", background: checked ? T.green : T.border, position: "relative", transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
      </button>
    </div>
  );
}
function Segmented({ options, value, onChange, accent }) {
  const a = accent || T.gold;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            style={{ flex: "1 1 auto", padding: "10px 10px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${active ? a : T.border}`, background: active ? a + "22" : T.bgSoft,
              color: active ? a : T.sub, fontWeight: 700, fontSize: 13, textAlign: "center" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
function Card({ children, style }) {
  return <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, ...style }}>{children}</div>;
}
function StatCard({ label, value, accent, sub }) {
  const a = accent || T.text;
  return (
    <div style={{ background: T.bgSoft, border: `1px solid ${T.borderSoft}`, borderTop: `2.5px solid ${a}`, borderRadius: 12, padding: 14, flex: "1 1 140px" }}>
      <div style={{ fontSize: 11.5, color: T.faint, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div className="disp" style={{ fontSize: 20, fontWeight: 700, color: a, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: T.faint, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function Btn({ children, onClick, accent, textColor }) {
  return (
    <button onClick={onClick}
      style={{ padding: "12px 16px", borderRadius: 12, border: accent === T.bgSoft ? `1px solid ${T.border}` : "none", background: accent || T.gold, color: textColor || "#000000",
        fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
      {children}
    </button>
  );
}
function PageHeader({ icon: Icon, title, description, onBack }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: 13.5, fontWeight: 600, marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={16} /> All calculators
      </button>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: T.gold + "1f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={22} color={T.gold} />
        </div>
        <div>
          <h1 className="disp" style={{ fontSize: 22, fontWeight: 700, margin: 0, color: T.text }}>{title}</h1>
          <p style={{ fontSize: 13.5, color: T.sub, margin: "4px 0 0", lineHeight: 1.5, maxWidth: 480 }}>{description}</p>
        </div>
      </div>
    </div>
  );
}
function ChartBox({ title, height = 260, children }) {
  return (
    <Card style={{ marginTop: 16 }}>
      {title && <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>{title}</div>}
      <div style={{ width: "100%", height }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </Card>
  );
}
function InflationBlock({ adj, setAdj, rate, setRate }) {
  return (
    <>
      <Field label="Adjust for Inflation"><Toggle checked={adj} onChange={setAdj} label="Show value in today's ₹" /></Field>
      {adj && <Field label="Assumed Inflation Rate (% p.a.)"><NumInput value={rate} onChange={setRate} suffix="%" /></Field>}
    </>
  );
}
function PaginatedTable({ columns, rows, pageSize = 12 }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(Math.ceil(rows.length / pageSize), 1);
  const p = clamp(page, 0, totalPages - 1);
  const slice = rows.slice(p * pageSize, p * pageSize + pageSize);
  return (
    <div>
      <div className="scrollbox" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: columns.length * 96 }}>
          <thead><tr style={{ color: T.faint, textAlign: "left" }}>{columns.map((c) => <th key={c.key} style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{c.label}</th>)}</tr></thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${T.borderSoft}`, color: T.text }}>
                {columns.map((c) => <td key={c.key} style={{ padding: "6px 8px", whiteSpace: "nowrap", color: c.color ? c.color(r) : T.text }}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 12 }}>
          <button onClick={() => setPage(Math.max(p - 1, 0))} disabled={p === 0}
            style={{ background: T.bgSoft, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>‹ Prev</button>
          <span style={{ fontSize: 12, color: T.faint, fontWeight: 600 }}>{p + 1} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(p + 1, totalPages - 1))} disabled={p === totalPages - 1}
            style={{ background: T.bgSoft, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Next ›</button>
        </div>
      )}
    </div>
  );
}
const gridProps = { stroke: T.borderSoft };
const axisProps = { tick: { fill: T.faint, fontSize: 11 }, axisLine: { stroke: T.border }, tickLine: false };
const tooltipStyle = { contentStyle: { background: T.cardHi, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12, color: T.text }, labelStyle: { color: T.sub } };
const compactY = (v) => (Math.abs(v) >= 10000000 ? (v / 10000000).toFixed(1) + "Cr" : Math.abs(v) >= 100000 ? (v / 100000).toFixed(0) + "L" : v);

/* ======================================================================
   TAB 1: CALCULATOR (Basic + Scientific)
====================================================================== */
function CalcButton({ label, onClick, kind = "digit" }) {
  const styles = {
    digit: { background: T.card, color: T.text },
    op: { background: T.bgSoft, color: T.gold },
    action: { background: T.bgSoft, color: T.gold },
    equals: { background: T.gold, color: "#000000" },
    sci: { background: T.bgSoft, color: T.sub, fontSize: 13 },
  };
  const s = styles[kind] || styles.digit;
  return (
    <button onClick={onClick}
      style={{ ...s, border: "none", borderRadius: 14, height: kind === "sci" ? 46 : 62, fontSize: kind === "sci" ? 14 : 22, fontWeight: 600, cursor: "pointer" }}>
      {label}
    </button>
  );
}
function CalculatorTab() {
  const [expr, setExpr] = useState("");
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [error, setError] = useState(false);
  const [scientific, setScientific] = useState(false);
  const [angleMode, setAngleMode] = useState("deg");

  const display = expr === "" ? "0" : expr.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−");

  const press = (val) => {
    setError(false);
    if (val === "AC") { setExpr(""); setJustEvaluated(false); return; }
    if (val === "DEL") { setExpr(expr.slice(0, -1)); setJustEvaluated(false); return; }
    if (val === "=") {
      try {
        const r = evaluateExpr(expr || "0", angleMode);
        setExpr(formatCalcResult(r));
        setJustEvaluated(true);
      } catch (e) { setError(true); setJustEvaluated(false); }
      return;
    }
    if (val === "1/x") { setExpr(`1/(${expr || "0"})`); setJustEvaluated(false); return; }
    if (justEvaluated && !["+", "-", "*", "/", "^", "%", "!"].includes(val)) { setExpr(val); }
    else setExpr(expr + val);
    setJustEvaluated(false);
  };

  const basicRows = [
    [{ l: "AC", k: "action" }, { l: "⌫", k: "action", v: "DEL" }, { l: "%", k: "op" }, { l: "÷", k: "op", v: "/" }],
    [{ l: "7", k: "digit" }, { l: "8", k: "digit" }, { l: "9", k: "digit" }, { l: "×", k: "op", v: "*" }],
    [{ l: "4", k: "digit" }, { l: "5", k: "digit" }, { l: "6", k: "digit" }, { l: "−", k: "op", v: "-" }],
    [{ l: "1", k: "digit" }, { l: "2", k: "digit" }, { l: "3", k: "digit" }, { l: "+", k: "op" }],
    [{ l: scientific ? "123" : "fx", k: "action", v: "__toggle_sci" }, { l: "0", k: "digit" }, { l: ".", k: "digit" }, { l: "=", k: "equals" }],
  ];
  const sciRows = [
    [{ l: angleMode === "deg" ? "Deg" : "Rad", k: "sci", v: "__toggle_angle" }, { l: "(", k: "sci" }, { l: ")", k: "sci" }, { l: "n!", k: "sci", v: "!" }],
    [{ l: "sin", k: "sci", v: "sin(" }, { l: "cos", k: "sci", v: "cos(" }, { l: "tan", k: "sci", v: "tan(" }, { l: "1/x", k: "sci" }],
    [{ l: "log", k: "sci", v: "log(" }, { l: "ln", k: "sci", v: "ln(" }, { l: "√", k: "sci", v: "sqrt(" }, { l: "^", k: "sci" }],
    [{ l: "π", k: "sci" }, { l: "e", k: "sci" }, { l: "asin", k: "sci", v: "asin(" }, { l: "acos", k: "sci", v: "acos(" }],
  ];

  const handleTap = (btn) => {
    if (btn.v === "__toggle_sci") { setScientific((s) => !s); return; }
    if (btn.v === "__toggle_angle") { setAngleMode((a) => (a === "deg" ? "rad" : "deg")); return; }
    press(btn.v !== undefined ? btn.v : btn.l);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
        <span className="disp" style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Calculator</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "30px 8px 20px", minHeight: 140 }}>
        <div className="disp" style={{ fontSize: error ? 26 : 40, fontWeight: 700, color: error ? T.red : T.text, wordBreak: "break-all", textAlign: "right" }}>
          {error ? "Error" : display}
        </div>
      </div>
      {scientific && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
          {sciRows.flat().map((b, i) => <CalcButton key={i} label={b.l} kind={b.k} onClick={() => handleTap(b)} />)}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {basicRows.flat().map((b, i) => <CalcButton key={i} label={b.l} kind={b.k} onClick={() => handleTap(b)} />)}
      </div>
    </div>
  );
}

/* ======================================================================
   TAB 2: CONVERT
====================================================================== */
const CONVERT_CATEGORIES = [
  { id: "currency", label: "Currency", icon: DollarSign },
  { id: "length", label: "Length", icon: Ruler },
  { id: "mass", label: "Mass", icon: Package },
  { id: "area", label: "Area", icon: Square },
  { id: "time", label: "Time", icon: Clock },
  { id: "data", label: "Data", icon: Database },
  { id: "discount", label: "Discount", icon: Tag },
  { id: "volume", label: "Volume", icon: Droplet },
  { id: "numeral", label: "Numeral System", icon: Hash },
  { id: "speed", label: "Speed", icon: Gauge },
  { id: "temperature", label: "Temperature", icon: Thermometer },
  { id: "bmi", label: "BMI", icon: Activity },
  { id: "gst", label: "GST", icon: Receipt },
];

function GenericUnitConverter({ cat }) {
  const def = UNIT_CATS[cat];
  const keys = Object.keys(def.units);
  const [value, setValue] = useState("1");
  const [from, setFrom] = useState(keys[0]);
  const [to, setTo] = useState(keys[1]);
  const result = convertUnit(cat, num(value), from, to);
  return (
    <Card>
      <Field label={`Value (${from})`}><NumInput value={value} onChange={setValue} /></Field>
      <Field label="From"><Select value={from} onChange={setFrom} options={keys.map((k) => ({ value: k, label: k }))} /></Field>
      <Field label="To"><Select value={to} onChange={setTo} options={keys.map((k) => ({ value: k, label: k }))} /></Field>
      <StatCard label={`Result (${to})`} value={formatCalcResult(result)} accent={T.gold} />
    </Card>
  );
}
function CurrencyConverter() {
  const keys = Object.keys(CURRENCY_RATES_TO_INR);
  const [value, setValue] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const inInr = num(value) * CURRENCY_RATES_TO_INR[from];
  const result = inInr / CURRENCY_RATES_TO_INR[to];
  return (
    <Card>
      <Field label={`Amount (${from})`}><NumInput value={value} onChange={setValue} /></Field>
      <Field label="From"><Select value={from} onChange={setFrom} options={keys.map((k) => ({ value: k, label: k }))} /></Field>
      <Field label="To"><Select value={to} onChange={setTo} options={keys.map((k) => ({ value: k, label: k }))} /></Field>
      <StatCard label={`Result (${to})`} value={formatCalcResult(result)} accent={T.gold} />
      <div style={{ fontSize: 11, color: T.faint, marginTop: 10 }}>Rates are approximate reference values, not live market rates.</div>
    </Card>
  );
}
function TemperatureConverter() {
  const [value, setValue] = useState("37");
  const [from, setFrom] = useState("C");
  const [to, setTo] = useState("F");
  const result = convertTemp(num(value), from, to);
  const opts = [{ value: "C", label: "Celsius (°C)" }, { value: "F", label: "Fahrenheit (°F)" }, { value: "K", label: "Kelvin (K)" }];
  return (
    <Card>
      <Field label="Value"><NumInput value={value} onChange={setValue} /></Field>
      <Field label="From"><Select value={from} onChange={setFrom} options={opts} /></Field>
      <Field label="To"><Select value={to} onChange={setTo} options={opts} /></Field>
      <StatCard label="Result" value={formatCalcResult(result) + "°" + (to === "K" ? "K" : to)} accent={T.gold} />
    </Card>
  );
}
function DiscountConverter() {
  const [price, setPrice] = useState("1000");
  const [discount, setDiscount] = useState("20");
  const saved = num(price) * (num(discount) / 100);
  const final = num(price) - saved;
  return (
    <Card>
      <Field label="Original Price (₹)"><NumInput value={price} onChange={setPrice} prefix="₹" /></Field>
      <Field label="Discount (%)"><NumInput value={discount} onChange={setDiscount} suffix="%" /></Field>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="You Save" value={money(saved)} accent={T.green} />
        <StatCard label="Final Price" value={money(final)} accent={T.gold} />
      </div>
    </Card>
  );
}
function GstConverter() {
  const [amount, setAmount] = useState("1000");
  const [rate, setRate] = useState("18");
  const [mode, setMode] = useState("add");
  let gstAmount, base, total;
  if (mode === "add") { base = num(amount); gstAmount = base * (num(rate) / 100); total = base + gstAmount; }
  else { total = num(amount); base = total / (1 + num(rate) / 100); gstAmount = total - base; }
  return (
    <Card>
      <Field label="Mode">
        <Segmented value={mode} onChange={setMode} options={[{ value: "add", label: "Add GST" }, { value: "remove", label: "Remove GST" }]} />
      </Field>
      <Field label={mode === "add" ? "Amount before GST (₹)" : "Amount including GST (₹)"}><NumInput value={amount} onChange={setAmount} prefix="₹" /></Field>
      <Field label="GST Rate (%)"><NumInput value={rate} onChange={setRate} suffix="%" /></Field>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="Base Amount" value={money(base)} accent={T.text} />
        <StatCard label="GST Amount" value={money(gstAmount)} accent={T.gold} />
        <StatCard label="Total" value={money(total)} accent={T.green} />
      </div>
    </Card>
  );
}
function BmiConverter() {
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("65");
  const h = num(height) / 100;
  const bmi = h > 0 ? num(weight) / (h * h) : 0;
  let cat = "Normal", color = T.green;
  if (bmi < 18.5) { cat = "Underweight"; color = T.gold; }
  else if (bmi >= 25 && bmi < 30) { cat = "Overweight"; color = T.gold; }
  else if (bmi >= 30) { cat = "Obese"; color = T.red; }
  return (
    <Card>
      <Field label="Height (cm)"><NumInput value={height} onChange={setHeight} suffix="cm" /></Field>
      <Field label="Weight (kg)"><NumInput value={weight} onChange={setWeight} suffix="kg" /></Field>
      <StatCard label="BMI" value={bmi.toFixed(1)} accent={color} sub={cat} />
    </Card>
  );
}
function NumeralConverter() {
  const [value, setValue] = useState("42");
  const [base, setBase] = useState("10");
  const opts = [{ value: "2", label: "Binary" }, { value: "8", label: "Octal" }, { value: "10", label: "Decimal" }, { value: "16", label: "Hexadecimal" }];
  let dec = parseInt(value || "0", parseInt(base, 10));
  if (isNaN(dec)) dec = 0;
  return (
    <Card>
      <Field label="Input Base"><Select value={base} onChange={setBase} options={opts} /></Field>
      <Field label="Value"><TextInput value={value} onChange={setValue} placeholder="Enter number" /></Field>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <StatCard label="Binary" value={dec.toString(2)} accent={T.text} />
        <StatCard label="Octal" value={dec.toString(8)} accent={T.text} />
        <StatCard label="Decimal" value={dec.toString(10)} accent={T.gold} />
        <StatCard label="Hexadecimal" value={dec.toString(16).toUpperCase()} accent={T.text} />
      </div>
    </Card>
  );
}
function ConvertTab() {
  const [cat, setCat] = useState(null);
  if (cat) {
    const meta = CONVERT_CATEGORIES.find((c) => c.id === cat);
    let body;
    if (cat === "currency") body = <CurrencyConverter />;
    else if (cat === "temperature") body = <TemperatureConverter />;
    else if (cat === "discount") body = <DiscountConverter />;
    else if (cat === "gst") body = <GstConverter />;
    else if (cat === "bmi") body = <BmiConverter />;
    else if (cat === "numeral") body = <NumeralConverter />;
    else body = <GenericUnitConverter cat={cat} />;
    return (
      <div>
        <PageHeader icon={meta.icon} onBack={() => setCat(null)} title={meta.label} description={`Convert between common ${meta.label.toLowerCase()} units.`} />
        {body}
      </div>
    );
  }
  return (
    <div>
      <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
        <span className="disp" style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Convert</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {CONVERT_CATEGORIES.map((c) => (
          <div key={c.id} onClick={() => setCat(c.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 4px" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: T.card, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <c.icon size={22} color={T.gold} />
            </div>
            <div style={{ fontSize: 11.5, color: T.sub, textAlign: "center", lineHeight: 1.3 }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ======================================================================
   TAB 3: INVESTMENT CALCULATOR  (all finance tools)
====================================================================== */
function SipCalc({ onBack }) {
  const [monthly, setMonthly] = useState("10000");
  const [rate, setRate] = useState("13");
  const [years, setYears] = useState("15");
  const [inflAdj, setInflAdj] = useState(false);
  const [inflRate, setInflRate] = useState("6");
  const m = num(monthly), r = num(rate), y = num(years);
  const deflate = (v, yy) => (inflAdj ? v / Math.pow(1 + num(inflRate) / 100, yy) : v);
  const fv = deflate(sipFV(m, r, y), y);
  const invested = m * 12 * y;
  const gains = fv - invested;
  const series = sipSeries(m, r, y).map((d) => ({ year: d.year, invested: d.invested, value: deflate(d.value, d.year) }));
  return (
    <div>
      <PageHeader icon={TrendingUp} onBack={onBack} title="SIP Calculator" description="See how a monthly SIP grows into a corpus, with the power of compounding over time." />
      <Card>
        <Field label="Monthly Investment (₹)"><NumInput value={monthly} onChange={setMonthly} prefix="₹" /></Field>
        <Field label="Expected Annual Return (%)"><NumInput value={rate} onChange={setRate} suffix="%" /></Field>
        <Field label="Time Period (Years)"><NumInput value={years} onChange={setYears} suffix="yrs" /></Field>
        <InflationBlock adj={inflAdj} setAdj={setInflAdj} rate={inflRate} setRate={setInflRate} />
      </Card>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <StatCard label="Invested Amount" value={money(invested)} accent={T.text} />
        <StatCard label="Est. Returns" value={money(gains)} accent={T.green} />
        <StatCard label="Maturity Value" value={money(fv)} accent={T.gold} sub={inflAdj ? "In today's rupees" : ""} />
      </div>
      <ChartBox title="Growth Over Time">
        <AreaChart data={series}>
          <defs><linearGradient id="sipG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.gold} stopOpacity={0.5} /><stop offset="100%" stopColor={T.gold} stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="year" {...axisProps} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} />
          <Area type="monotone" dataKey="invested" stroke={T.faint} fill="none" strokeDasharray="4 4" name="Invested" />
          <Area type="monotone" dataKey="value" stroke={T.gold} fill="url(#sipG)" strokeWidth={2.5} name="Value" />
        </AreaChart>
      </ChartBox>
    </div>
  );
}
function SwpCalc({ onBack }) {
  const [amount, setAmount] = useState("5000000");
  const [rate, setRate] = useState("8");
  const [withdrawal, setWithdrawal] = useState("30000");
  const [years, setYears] = useState("20");
  const [inflAdj, setInflAdj] = useState(false);
  const [inflRate, setInflRate] = useState("6");
  const months = Math.round(num(years) * 12);
  const sim = swpSimulate(num(amount), num(rate), num(withdrawal), months);
  const deflate = (v, mm) => (inflAdj ? v / Math.pow(1 + num(inflRate) / 100, mm / 12) : v);
  const chartData = sim.rows.filter((r) => r.month % 3 === 0 || r.month === 1).map((r) => ({ month: r.month, corpus: deflate(Math.max(r.closing, 0), r.month) }));
  const tableRows = sim.rows.map((r) => ({ ...r, opening: deflate(r.opening, r.month), withdrawal: deflate(r.withdrawal, r.month), returns: deflate(r.returns, r.month), closing: deflate(Math.max(r.closing, 0), r.month) }));
  return (
    <div>
      <PageHeader icon={TrendingDown} onBack={onBack} title="SWP Calculator" description="Plan a Systematic Withdrawal Plan — see how long your corpus lasts and how much you can withdraw each month." />
      <Card>
        <Field label="Total Investment Amount (₹)"><NumInput value={amount} onChange={setAmount} prefix="₹" /></Field>
        <Field label="Expected Annual Return (%)"><NumInput value={rate} onChange={setRate} suffix="%" /></Field>
        <Field label="Monthly Withdrawal (₹)"><NumInput value={withdrawal} onChange={setWithdrawal} prefix="₹" /></Field>
        <Field label="Investment Duration (Years)"><NumInput value={years} onChange={setYears} suffix="yrs" /></Field>
        <InflationBlock adj={inflAdj} setAdj={setInflAdj} rate={inflRate} setRate={setInflRate} />
      </Card>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <StatCard label="Total Invested" value={money(amount)} accent={T.text} />
        <StatCard label="Total Withdrawn" value={money(sim.totalWithdrawn)} accent={T.gold} />
        <StatCard label="Final Corpus" value={money(deflate(Math.max(sim.finalCorpus, 0), months))} accent={sim.depletedAt ? T.red : T.green} sub={sim.depletedAt ? `Corpus exhausted at month ${sim.depletedAt}` : "Sustains full duration"} />
      </div>
      <ChartBox title="Corpus Over Time">
        <LineChart data={chartData}>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="month" {...axisProps} tickFormatter={(v) => "Y" + Math.round(v / 12)} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} labelFormatter={(v) => "Month " + v} />
          <Line type="monotone" dataKey="corpus" stroke={T.gold} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ChartBox>
      <Card style={{ marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Month-by-Month Breakdown</div>
        <PaginatedTable pageSize={12} columns={[
          { key: "month", label: "Month" },
          { key: "opening", label: "Opening", render: (r) => money(r.opening) },
          { key: "withdrawal", label: "Withdrawal", render: (r) => money(r.withdrawal), color: () => T.gold },
          { key: "returns", label: "Returns", render: (r) => money(r.returns), color: () => T.green },
          { key: "closing", label: "Closing", render: (r) => money(r.closing) },
        ]} rows={tableRows} />
      </Card>
    </div>
  );
}
function FdCalc({ onBack }) {
  const [principal, setPrincipal] = useState("100000");
  const [rate, setRate] = useState("7.1");
  const [years, setYears] = useState("5");
  const [comp, setComp] = useState("4");
  const [inflAdj, setInflAdj] = useState(false);
  const [inflRate, setInflRate] = useState("6");
  const P = num(principal), R = num(rate), Y = num(years), C = num(comp);
  const deflate = (v, yy) => (inflAdj ? v / Math.pow(1 + num(inflRate) / 100, yy) : v);
  const maturity = deflate(fdMaturity(P, R, Y, C), Y);
  const interest = maturity - P;
  const series = fdSeries(P, R, Y, C).map((d) => ({ year: d.year, value: deflate(d.value, d.year) }));
  return (
    <div>
      <PageHeader icon={Landmark} onBack={onBack} title="FD Calculator" description="Calculate the maturity value of your Fixed Deposit based on compounding frequency." />
      <Card>
        <Field label="Principal Amount (₹)"><NumInput value={principal} onChange={setPrincipal} prefix="₹" /></Field>
        <Field label="Interest Rate (% p.a.)"><NumInput value={rate} onChange={setRate} suffix="%" /></Field>
        <Field label="Tenure (Years)"><NumInput value={years} onChange={setYears} suffix="yrs" /></Field>
        <Field label="Compounding Frequency"><Select value={comp} onChange={setComp} options={[{ value: "1", label: "Annually" }, { value: "2", label: "Half-Yearly" }, { value: "4", label: "Quarterly" }, { value: "12", label: "Monthly" }]} /></Field>
        <InflationBlock adj={inflAdj} setAdj={setInflAdj} rate={inflRate} setRate={setInflRate} />
      </Card>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <StatCard label="Principal" value={money(P)} accent={T.text} />
        <StatCard label="Interest Earned" value={money(interest)} accent={T.green} />
        <StatCard label="Maturity Value" value={money(maturity)} accent={T.gold} />
      </div>
      <ChartBox title="Growth Over Time">
        <AreaChart data={series}>
          <defs><linearGradient id="fdG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.gold} stopOpacity={0.5} /><stop offset="100%" stopColor={T.gold} stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="year" {...axisProps} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Area type="monotone" dataKey="value" stroke={T.gold} fill="url(#fdG)" strokeWidth={2.5} />
        </AreaChart>
      </ChartBox>
    </div>
  );
}
function RdCalc({ onBack }) {
  const [monthly, setMonthly] = useState("5000");
  const [rate, setRate] = useState("6.8");
  const [years, setYears] = useState("5");
  const [inflAdj, setInflAdj] = useState(false);
  const [inflRate, setInflRate] = useState("6");
  const m = num(monthly), r = num(rate), y = num(years);
  const deflate = (v, yy) => (inflAdj ? v / Math.pow(1 + num(inflRate) / 100, yy) : v);
  const maturity = deflate(sipFV(m, r, y), y);
  const invested = m * 12 * y;
  const series = sipSeries(m, r, y).map((d) => ({ year: d.year, value: deflate(d.value, d.year) }));
  return (
    <div>
      <PageHeader icon={PiggyBank} onBack={onBack} title="RD Calculator" description="Estimate the maturity amount of your Recurring Deposit with monthly compounding." />
      <Card>
        <Field label="Monthly Deposit (₹)"><NumInput value={monthly} onChange={setMonthly} prefix="₹" /></Field>
        <Field label="Interest Rate (% p.a.)"><NumInput value={rate} onChange={setRate} suffix="%" /></Field>
        <Field label="Tenure (Years)"><NumInput value={years} onChange={setYears} suffix="yrs" /></Field>
        <InflationBlock adj={inflAdj} setAdj={setInflAdj} rate={inflRate} setRate={setInflRate} />
      </Card>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <StatCard label="Total Deposited" value={money(invested)} accent={T.text} />
        <StatCard label="Interest Earned" value={money(maturity - invested)} accent={T.green} />
        <StatCard label="Maturity Value" value={money(maturity)} accent={T.gold} />
      </div>
      <ChartBox title="Growth Over Time">
        <AreaChart data={series}>
          <defs><linearGradient id="rdG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.gold} stopOpacity={0.5} /><stop offset="100%" stopColor={T.gold} stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="year" {...axisProps} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Area type="monotone" dataKey="value" stroke={T.gold} fill="url(#rdG)" strokeWidth={2.5} />
        </AreaChart>
      </ChartBox>
    </div>
  );
}
function RetirementCalc({ onBack }) {
  const [curAge, setCurAge] = useState("30");
  const [retAge, setRetAge] = useState("60");
  const [basic, setBasic] = useState("50000");
  const [nps, setNps] = useState("5000");
  const [sip, setSip] = useState("10000");
  const [inflAdj, setInflAdj] = useState(false);
  const [inflRate, setInflRate] = useState("6");
  const [epfR, setEpfR] = useState("8.25");
  const [npsR, setNpsR] = useState("10");
  const [sipR, setSipR] = useState("13");
  const years = Math.max(num(retAge) - num(curAge), 0);
  const epfMonthly = num(basic) * 0.24;
  const deflate = (v, yy) => (inflAdj ? v / Math.pow(1 + num(inflRate) / 100, yy) : v);
  const epfFV = deflate(sipFV(epfMonthly, num(epfR), years), years);
  const npsFV = deflate(sipFV(num(nps), num(npsR), years), years);
  const sipFVv = deflate(sipFV(num(sip), num(sipR), years), years);
  const best = [["EPF", epfFV], ["NPS", npsFV], ["SIP", sipFVv]].sort((a, b) => b[1] - a[1])[0];
  const series = [];
  for (let a = num(curAge); a <= num(retAge); a++) { const yy = a - num(curAge); series.push({ age: a, EPF: Math.round(deflate(sipFV(epfMonthly, num(epfR), yy), yy)), NPS: Math.round(deflate(sipFV(num(nps), num(npsR), yy), yy)), SIP: Math.round(deflate(sipFV(num(sip), num(sipR), yy), yy)) }); }
  return (
    <div>
      <PageHeader icon={Flame} onBack={onBack} title="Retirement Engine" description="Head-to-head: EPF vs NPS vs SIP. See exactly what corpus you retire with at your target age." />
      <Card>
        <Field label="Current Age"><NumInput value={curAge} onChange={setCurAge} suffix="yrs" /></Field>
        <Field label="Retirement Age"><NumInput value={retAge} onChange={setRetAge} suffix="yrs" /></Field>
        <Field label="Monthly Basic Salary (EPF base)"><NumInput value={basic} onChange={setBasic} prefix="₹" /></Field>
        <Field label="Monthly NPS Contribution"><NumInput value={nps} onChange={setNps} prefix="₹" /></Field>
        <Field label="Monthly SIP Contribution"><NumInput value={sip} onChange={setSip} prefix="₹" /></Field>
        <InflationBlock adj={inflAdj} setAdj={setInflAdj} rate={inflRate} setRate={setInflRate} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="EPF %"><NumInput value={epfR} onChange={setEpfR} suffix="%" /></Field>
          <Field label="NPS %"><NumInput value={npsR} onChange={setNpsR} suffix="%" /></Field>
          <Field label="SIP %"><NumInput value={sipR} onChange={setSipR} suffix="%" /></Field>
        </div>
      </Card>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <StatCard label="EPF Corpus" value={money(epfFV)} accent={best[0] === "EPF" ? T.green : T.text} sub={`Monthly: ${money(epfMonthly)}`} />
        <StatCard label="NPS Corpus" value={money(npsFV)} accent={best[0] === "NPS" ? T.green : T.text} sub={`Monthly: ${money(nps)}`} />
        <StatCard label="SIP Corpus" value={money(sipFVv)} accent={best[0] === "SIP" ? T.green : T.text} sub={`Monthly: ${money(sip)}`} />
      </div>
      <Card style={{ marginTop: 12, borderColor: T.green }}><div style={{ fontSize: 13, color: T.sub }}>🏆 Best choice for your inputs</div><div className="disp" style={{ fontSize: 20, fontWeight: 700, color: T.green }}>{best[0]} — {money(best[1])}</div></Card>
      <ChartBox title="Wealth Gap Over Time">
        <BarChart data={series}>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="age" {...axisProps} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="EPF" fill={CHART_COLORS[0]} /><Bar dataKey="NPS" fill={CHART_COLORS[2]} /><Bar dataKey="SIP" fill={CHART_COLORS[1]} />
        </BarChart>
      </ChartBox>
    </div>
  );
}
function ChildCalc({ onBack }) {
  const [curAge, setCurAge] = useState("0");
  const [targetAge, setTargetAge] = useState("21");
  const [monthly, setMonthly] = useState("10000");
  const [inflAdj, setInflAdj] = useState(false);
  const [inflRate, setInflRate] = useState("6");
  const [ppfR, setPpfR] = useState("7.1");
  const [ssyR, setSsyR] = useState("8.2");
  const [sipR, setSipR] = useState("13");
  const years = Math.max(num(targetAge) - num(curAge), 0);
  const annualCapped = Math.min(num(monthly) * 12, 150000);
  const deflate = (v, yy) => (inflAdj ? v / Math.pow(1 + num(inflRate) / 100, yy) : v);
  const ppfFV = deflate(annualAnnuityFV(annualCapped, num(ppfR), years), years);
  const ssyFV = deflate(annualAnnuityFV(annualCapped, num(ssyR), years), years);
  const sipFVv = deflate(sipFV(num(monthly), num(sipR), years), years);
  const invested = annualCapped * years;
  const investedSip = num(monthly) * 12 * years;
  const best = [["PPF", ppfFV], ["SSY", ssyFV], ["SIP", sipFVv]].sort((a, b) => b[1] - a[1])[0];
  const series = [];
  for (let a = num(curAge); a <= num(targetAge); a++) { const yy = a - num(curAge); series.push({ age: a, PPF: Math.round(deflate(annualAnnuityFV(annualCapped, num(ppfR), yy), yy)), SSY: Math.round(deflate(annualAnnuityFV(annualCapped, num(ssyR), yy), yy)), SIP: Math.round(deflate(sipFV(num(monthly), num(sipR), yy), yy)) }); }
  return (
    <div>
      <PageHeader icon={Heart} onBack={onBack} title="Child Legacy Engine" description="Head-to-head: PPF vs SSY vs SIP. See exactly how much corpus your child gets at the target age." />
      <Card>
        <Field label="Child's Current Age"><NumInput value={curAge} onChange={setCurAge} suffix="yrs" /></Field>
        <Field label="Target Age (Corpus Release)"><NumInput value={targetAge} onChange={setTargetAge} suffix="yrs" /></Field>
        <Field label="Monthly Investment (₹)"><NumInput value={monthly} onChange={setMonthly} prefix="₹" /></Field>
        <InflationBlock adj={inflAdj} setAdj={setInflAdj} rate={inflRate} setRate={setInflRate} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="PPF %"><NumInput value={ppfR} onChange={setPpfR} suffix="%" /></Field>
          <Field label="SSY %"><NumInput value={ssyR} onChange={setSsyR} suffix="%" /></Field>
          <Field label="SIP %"><NumInput value={sipR} onChange={setSipR} suffix="%" /></Field>
        </div>
      </Card>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <StatCard label="PPF" value={money(ppfFV)} accent={best[0] === "PPF" ? T.green : T.text} sub={`Invested: ${money(invested)}`} />
        <StatCard label="SSY" value={money(ssyFV)} accent={best[0] === "SSY" ? T.green : T.text} sub={`Invested: ${money(invested)}`} />
        <StatCard label="SIP" value={money(sipFVv)} accent={best[0] === "SIP" ? T.green : T.text} sub={`Invested: ${money(investedSip)}`} />
      </div>
      <Card style={{ marginTop: 12, borderColor: T.green }}><div style={{ fontSize: 13, color: T.sub }}>🏆 Best choice for your inputs</div><div className="disp" style={{ fontSize: 20, fontWeight: 700, color: T.green }}>{best[0]} — {money(best[1])}</div></Card>
      <ChartBox title="Wealth Gap Over Time">
        <BarChart data={series}>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="age" {...axisProps} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="PPF" fill={CHART_COLORS[2]} /><Bar dataKey="SSY" fill={CHART_COLORS[0]} /><Bar dataKey="SIP" fill={CHART_COLORS[1]} />
        </BarChart>
      </ChartBox>
    </div>
  );
}
function GoldCalc({ onBack }) {
  const [capital, setCapital] = useState("100000");
  const [rate, setRate] = useState("10");
  const [years, setYears] = useState("10");
  const [expRatio, setExpRatio] = useState("0.8");
  const [trackErr, setTrackErr] = useState("0.25");
  const [inflAdj, setInflAdj] = useState(false);
  const [inflRate, setInflRate] = useState("6");
  const c = num(capital), r = num(rate), y = num(years);
  const deflate = (v) => (inflAdj ? v / Math.pow(1 + num(inflRate) / 100, y) : v);
  const physical = deflate(c * 0.94 * Math.pow(1 + r / 100, y));
  const digital = deflate(c * 0.97 * Math.pow(1 + r / 100, y));
  const etfRate = Math.max(r - num(expRatio) - num(trackErr), 0);
  const etf = deflate(c * Math.pow(1 + etfRate / 100, y));
  const rows = [{ name: "Physical Gold", value: physical, note: "6% making + GST charged upfront" }, { name: "Digital Gold", value: digital, note: "3% GST charged upfront" }, { name: "Gold ETF", value: etf, note: `Net return ${etfRate.toFixed(2)}% after fees` }];
  const best = rows.slice().sort((a, b) => b.value - a.value)[0];
  const series = [];
  for (let yy = 0; yy <= y; yy++) series.push({ year: yy, Physical: Math.round(deflate(c * 0.94 * Math.pow(1 + r / 100, yy))), Digital: Math.round(deflate(c * 0.97 * Math.pow(1 + r / 100, yy))), ETF: Math.round(deflate(c * Math.pow(1 + etfRate / 100, yy))) });
  return (
    <div>
      <PageHeader icon={Coins} onBack={onBack} title="Gold Returns Calculator" description="Compare Physical, Digital & ETF gold returns with fees built in." />
      <Card>
        <Field label="Investment Capital (₹)"><NumInput value={capital} onChange={setCapital} prefix="₹" /></Field>
        <Field label="Expected Returns (% p.a.)"><NumInput value={rate} onChange={setRate} suffix="%" /></Field>
        <Field label="Time Period (Years)"><NumInput value={years} onChange={setYears} suffix="yrs" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="ETF Expense Ratio (%)"><NumInput value={expRatio} onChange={setExpRatio} suffix="%" /></Field>
          <Field label="ETF Tracking Error (%)"><NumInput value={trackErr} onChange={setTrackErr} suffix="%" /></Field>
        </div>
        <InflationBlock adj={inflAdj} setAdj={setInflAdj} rate={inflRate} setRate={setInflRate} />
      </Card>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        {rows.map((row) => <StatCard key={row.name} label={row.name} value={money(row.value)} accent={row.name === best.name ? T.green : T.text} sub={row.note} />)}
      </div>
      <Card style={{ marginTop: 12, borderColor: T.green }}><div style={{ fontSize: 13, color: T.sub }}>🏆 Best after fees</div><div className="disp" style={{ fontSize: 20, fontWeight: 700, color: T.green }}>{best.name} — {money(best.value)}</div></Card>
      <ChartBox title="Growth Comparison">
        <LineChart data={series}>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="year" {...axisProps} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Physical" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Digital" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="ETF" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
        </LineChart>
      </ChartBox>
    </div>
  );
}
function BondsCalc({ onBack }) {
  const [face, setFace] = useState("1000");
  const [coupon, setCoupon] = useState("7.5");
  const [price, setPrice] = useState("980");
  const [years, setYears] = useState("10");
  const [inflAdj, setInflAdj] = useState(false);
  const [inflRate, setInflRate] = useState("6");
  const f = num(face), c = num(coupon), p = num(price), y = num(years);
  const annualCoupon = (f * c) / 100;
  const totalCoupons = annualCoupon * y;
  const deflate = (v, yy) => (inflAdj ? v / Math.pow(1 + num(inflRate) / 100, yy) : v);
  const totalReturn = totalCoupons + (f - p);
  const approxYTM = y > 0 ? ((annualCoupon + (f - p) / y) / ((f + p) / 2)) * 100 : 0;
  const series = [];
  let cum = -p;
  for (let yy = 1; yy <= y; yy++) { cum += annualCoupon; series.push({ year: yy, value: Math.round(deflate(cum + (yy === y ? f : 0), yy)) }); }
  return (
    <div>
      <PageHeader icon={FileText} onBack={onBack} title="Bonds Calculator" description="Estimate coupon income, maturity value and approximate yield-to-maturity of a bond." />
      <Card>
        <Field label="Face Value (₹)"><NumInput value={face} onChange={setFace} prefix="₹" /></Field>
        <Field label="Coupon Rate (% p.a.)"><NumInput value={coupon} onChange={setCoupon} suffix="%" /></Field>
        <Field label="Purchase Price (₹)"><NumInput value={price} onChange={setPrice} prefix="₹" /></Field>
        <Field label="Years to Maturity"><NumInput value={years} onChange={setYears} suffix="yrs" /></Field>
        <InflationBlock adj={inflAdj} setAdj={setInflAdj} rate={inflRate} setRate={setInflRate} />
      </Card>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <StatCard label="Annual Coupon" value={money(annualCoupon)} accent={T.text} />
        <StatCard label="Total Coupons Received" value={money(totalCoupons)} accent={T.gold} />
        <StatCard label="Net Return (Cumulative)" value={money(deflate(totalReturn, y))} accent={totalReturn >= 0 ? T.green : T.red} />
        <StatCard label="Approx. YTM" value={pct1(approxYTM)} accent={T.text} />
      </div>
      <ChartBox title="Cumulative Value Over Time">
        <BarChart data={series}>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="year" {...axisProps} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Bar dataKey="value" fill={T.gold} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartBox>
    </div>
  );
}
function FinHealthCalc({ onBack }) {
  const [income, setIncome] = useState("80000");
  const [expenses, setExpenses] = useState("45000");
  const [savings, setSavings] = useState("15000");
  const [debtEmi, setDebtEmi] = useState("10000");
  const [efMonths, setEfMonths] = useState("4");
  const [lifeIns, setLifeIns] = useState(true);
  const [healthIns, setHealthIns] = useState(true);
  const inc = Math.max(num(income), 1);
  const sav = Math.max(num(savings), 0);
  const debt = Math.max(num(debtEmi), 0);
  const exp = Math.max(num(expenses), 0);
  const savingsRate = (sav / inc) * 100;
  const debtRatio = (debt / inc) * 100;
  const expenseRatio = (exp / inc) * 100;
  const savingsPts = clamp((savingsRate / 30) * 30, 0, 30);
  const debtPts = clamp(25 - (debtRatio / 50) * 25, 0, 25);
  const efPts = clamp((num(efMonths) / 6) * 20, 0, 20);
  const insPts = (lifeIns ? 7.5 : 0) + (healthIns ? 7.5 : 0);
  const expPts = expenseRatio <= 50 ? 10 : clamp(10 - ((expenseRatio - 50) / 50) * 10, 0, 10);
  const score = Math.round(clamp(savingsPts + debtPts + efPts + insPts + expPts, 0, 100));
  let tag = "Needs Attention", tagColor = T.red;
  if (score >= 80) { tag = "Excellent"; tagColor = T.green; } else if (score >= 60) { tag = "Good"; tagColor = T.green; } else if (score >= 40) { tag = "Fair"; tagColor = T.gold; }
  const breakdown = [
    { name: "Savings Rate", value: Math.round(savingsPts), max: 30, tip: `You save ${pct1(savingsRate)} of income. Aim for 30%+.` },
    { name: "Debt Control", value: Math.round(debtPts), max: 25, tip: `EMIs eat ${pct1(debtRatio)} of income. Keep under 30%.` },
    { name: "Emergency Fund", value: Math.round(efPts), max: 20, tip: `You have ${num(efMonths)} month(s) of expenses saved. Target 6.` },
    { name: "Insurance Cover", value: Math.round(insPts), max: 15, tip: lifeIns && healthIns ? "Both life & health covered — good." : "Consider adding the missing cover." },
    { name: "Expense Ratio", value: Math.round(expPts), max: 10, tip: `Expenses are ${pct1(expenseRatio)} of income.` },
  ];
  const gaugeData = [{ name: "score", value: score }, { name: "rest", value: 100 - score }];
  return (
    <div>
      <PageHeader icon={Activity} onBack={onBack} title="FinHealth Score" description="A quick 0–100 checkup of your money habits — savings, debt, emergency fund and insurance cover." />
      <Card>
        <Field label="Monthly Income (₹)"><NumInput value={income} onChange={setIncome} prefix="₹" /></Field>
        <Field label="Monthly Expenses (₹)"><NumInput value={expenses} onChange={setExpenses} prefix="₹" /></Field>
        <Field label="Monthly Savings / Investments (₹)"><NumInput value={savings} onChange={setSavings} prefix="₹" /></Field>
        <Field label="Monthly Debt EMIs (₹)"><NumInput value={debtEmi} onChange={setDebtEmi} prefix="₹" /></Field>
        <Field label="Emergency Fund (months of expenses saved)"><NumInput value={efMonths} onChange={setEfMonths} suffix="mo" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Life Insurance"><Toggle checked={lifeIns} onChange={setLifeIns} label="I have life cover" /></Field>
          <Field label="Health Insurance"><Toggle checked={healthIns} onChange={setHealthIns} label="I have health cover" /></Field>
        </div>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <div style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart><Pie data={gaugeData} dataKey="value" startAngle={210} endAngle={-30} innerRadius={70} outerRadius={95} stroke="none"><Cell fill={tagColor} /><Cell fill={T.borderSoft} /></Pie></RePieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ textAlign: "center", marginTop: -140 }}>
          <div className="disp" style={{ fontSize: 40, fontWeight: 700, color: tagColor }}>{score}<span style={{ fontSize: 16, color: T.faint }}>/100</span></div>
          <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: tagColor + "22", color: tagColor, fontWeight: 700, fontSize: 12 }}>{tag}</div>
        </div>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Score Breakdown & Tips</div>
        {breakdown.map((b) => (
          <div key={b.name} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}><span style={{ color: T.sub }}>{b.name}</span><span style={{ color: T.text, fontWeight: 600 }}>{b.value}/{b.max}</span></div>
            <div style={{ height: 6, borderRadius: 4, background: T.bgSoft, overflow: "hidden" }}><div style={{ height: "100%", width: `${(b.value / b.max) * 100}%`, background: b.value / b.max >= 0.8 ? T.green : b.value / b.max >= 0.5 ? T.gold : T.red, borderRadius: 4 }} /></div>
            <div style={{ fontSize: 11.5, color: T.faint, marginTop: 4 }}>{b.tip}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
const DEFAULT_WEIGHTS = { Conservative: { equity: "20", debt: "50", gold: "15", silver: "5", cash: "10" }, Moderate: { equity: "45", debt: "30", gold: "15", silver: "5", cash: "5" }, Aggressive: { equity: "70", debt: "10", gold: "10", silver: "5", cash: "5" } };
const DEFAULT_RETURNS = { equity: "13", debt: "6", gold: "11", silver: "12", cash: "3" };
const ASSET_KEYS = ["equity", "debt", "gold", "silver", "cash"];
const ASSET_COLORS = { equity: T.gold, debt: CHART_COLORS[2], gold: "#D4AF37", silver: "#B8B8C0", cash: T.green };
function AllocTypeCard({ title, subtitle, selected, onClick }) {
  return (
    <div onClick={onClick} style={{ border: `1.5px solid ${selected ? T.gold : T.border}`, background: selected ? T.gold + "14" : T.bgSoft, borderRadius: 12, padding: 14, marginBottom: 10, cursor: "pointer" }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: selected ? T.gold : T.text }}>{title}</div>
      <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{subtitle}</div>
    </div>
  );
}
function AllocatorCalc({ onBack }) {
  const [capital, setCapital] = useState("500000");
  const [years, setYears] = useState("10");
  const [profile, setProfile] = useState("Moderate");
  const [inflAdj, setInflAdj] = useState(false);
  const [inflRate, setInflRate] = useState("6");
  const [returns, setReturns] = useState(DEFAULT_RETURNS);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [advOpen, setAdvOpen] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const updateWeight = (profileKey, assetKey, val) => setWeights((prev) => ({ ...prev, [profileKey]: { ...prev[profileKey], [assetKey]: val } }));
  const resetDefaults = () => { setWeights(DEFAULT_WEIGHTS); setReturns(DEFAULT_RETURNS); };
  const currentWeights = weights[profile];
  const deflate = (v, yy) => (inflAdj ? v / Math.pow(1 + num(inflRate) / 100, yy) : v);
  const blendedFor = (w) => ASSET_KEYS.reduce((s, k) => s + (num(w[k]) / 100) * num(returns[k]), 0);
  const blended = blendedFor(currentWeights);
  const fv = deflate(num(capital) * Math.pow(1 + blended / 100, num(years)), num(years));
  const series = [];
  for (let yy = 0; yy <= num(years); yy++) { const row = { year: yy }; Object.keys(DEFAULT_WEIGHTS).forEach((p) => { row[p] = Math.round(deflate(num(capital) * Math.pow(1 + blendedFor(weights[p]) / 100, yy), yy)); }); series.push(row); }
  const pieData = ASSET_KEYS.map((k) => ({ name: k[0].toUpperCase() + k.slice(1), value: num(currentWeights[k]) })).filter((d) => d.value > 0);
  return (
    <div>
      <PageHeader icon={IconPie} onBack={onBack} title="Investment Allocator" description="See how Conservative, Moderate & Aggressive allocations grow over time." />
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📋 Investment Details</div>
        <Field label="Investment Capital (₹)" hint="Min ₹5,000 · Max ₹10Cr"><NumInput value={capital} onChange={setCapital} prefix="₹" /></Field>
        <Field label="Time Period (Years)" hint="Min 1 year · Max 40 years"><NumInput value={years} onChange={setYears} suffix="yrs" /></Field>
        <Field label="Asset Allocation Type">
          <AllocTypeCard title="Conservative" subtitle="Lower risk, stable returns" selected={profile === "Conservative"} onClick={() => setProfile("Conservative")} />
          <AllocTypeCard title="Moderate" subtitle="Balanced risk and returns" selected={profile === "Moderate"} onClick={() => setProfile("Moderate")} />
          <AllocTypeCard title="Aggressive" subtitle="Higher risk, higher potential" selected={profile === "Aggressive"} onClick={() => setProfile("Aggressive")} />
        </Field>
        <InflationBlock adj={inflAdj} setAdj={setInflAdj} rate={inflRate} setRate={setInflRate} />
        <div onClick={() => setAdvOpen((o) => !o)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "10px 2px", borderTop: `1px solid ${T.borderSoft}`, marginTop: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>⚙️ Advanced Settings</span>
          <ChevronDown size={16} color={T.faint} style={{ transform: advOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </div>
        {advOpen && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12.5, color: T.sub, fontWeight: 700, marginBottom: 8 }}>Expected Annual Returns (%)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
              {ASSET_KEYS.map((k) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><NumInput value={returns[k]} onChange={(v) => setReturns({ ...returns, [k]: v })} suffix="%" /></Field>)}
            </div>
            <div style={{ borderTop: `1px solid ${T.borderSoft}`, margin: "10px 0 14px" }} />
            <div style={{ fontSize: 12.5, color: T.sub, fontWeight: 700, marginBottom: 4 }}>Custom Allocation Weights (%)</div>
            <div style={{ fontSize: 11, color: T.faint, marginBottom: 12 }}>Weights must sum to 100% for each allocation type</div>
            {Object.keys(DEFAULT_WEIGHTS).map((p) => {
              const w = weights[p];
              const total = ASSET_KEYS.reduce((s, k) => s + num(w[k]), 0);
              return (
                <div key={p} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{p}</span><span style={{ fontSize: 12, fontWeight: 700, color: total === 100 ? T.green : T.red }}>Total: {total}%</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {ASSET_KEYS.map((k) => (<div key={k}><div style={{ fontSize: 10.5, color: T.faint, marginBottom: 3 }}>{k[0].toUpperCase() + k.slice(1)}</div><NumInput value={w[k]} onChange={(v) => updateWeight(p, k, v)} suffix="%" /></div>))}
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn accent={T.bgSoft} textColor={T.text} onClick={() => setShowCompare((s) => !s)}>⚖ {showCompare ? "Hide" : "Compare"} Scenarios</Btn>
              <Btn accent={T.bgSoft} textColor={T.text} onClick={resetDefaults}>↺ Reset to Defaults</Btn>
            </div>
          </div>
        )}
      </Card>
      {showCompare && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Scenario Comparison at Year {years}</div>
          {Object.keys(DEFAULT_WEIGHTS).map((p) => { const val = deflate(num(capital) * Math.pow(1 + blendedFor(weights[p]) / 100, num(years)), num(years)); return (<div key={p} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${T.borderSoft}` }}><span style={{ color: T.sub, fontSize: 13 }}>{p}</span><span style={{ color: p === profile ? T.green : T.text, fontWeight: 700 }}>{money(val)}</span></div>); })}
        </Card>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <StatCard label="Blended Return" value={pct1(blended)} accent={T.gold} />
        <StatCard label="Invested" value={money(capital)} accent={T.text} />
        <StatCard label="Projected Value" value={money(fv)} accent={T.green} />
      </div>
      <ChartBox title={`${profile} Allocation Mix`} height={280}>
        <RePieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {pieData.map((d, i) => <Cell key={i} fill={ASSET_COLORS[d.name.toLowerCase()] || CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={(v) => v + "%"} /><Legend wrapperStyle={{ fontSize: 11 }} />
        </RePieChart>
      </ChartBox>
      <ChartBox title="Allocation Comparison Over Time">
        <LineChart data={series}>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="year" {...axisProps} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Conservative" stroke={CHART_COLORS[2]} strokeWidth={profile === "Conservative" ? 3 : 1.5} dot={false} />
          <Line type="monotone" dataKey="Moderate" stroke={T.gold} strokeWidth={profile === "Moderate" ? 3 : 1.5} dot={false} />
          <Line type="monotone" dataKey="Aggressive" stroke={T.red} strokeWidth={profile === "Aggressive" ? 3 : 1.5} dot={false} />
        </LineChart>
      </ChartBox>
    </div>
  );
}
function SingleLoanDebt() {
  const [loan, setLoan] = useState("500000");
  const [rate, setRate] = useState("8.5");
  const [tenure, setTenure] = useState("20");
  const [extraEmis, setExtraEmis] = useState("0");
  const [stepUp, setStepUp] = useState("0");
  const [lumpsum, setLumpsum] = useState("0");
  const [lumpsumMonth, setLumpsumMonth] = useState("12");
  const [lumpsumMode, setLumpsumMode] = useState("tenure");
  const [tableFreq, setTableFreq] = useState("yearly");
  const [tableSet, setTableSet] = useState("original");
  const L = num(loan), R = num(rate), Y = num(tenure);
  const emi = emiOf(L, R, Y);
  const totalPaidOrig = emi * Y * 12;
  const interestOrig = totalPaidOrig - L;
  const hasAccel = num(extraEmis) > 0 || num(stepUp) > 0 || num(lumpsum) > 0;
  const origMonthly = amortizationMonthly({ principal: L, rate: R, years: Y });
  const accelMonthly = amortizationMonthly({ principal: L, rate: R, years: Y, extraEmisPerYear: num(extraEmis), stepUpPct: num(stepUp), lumpsum: num(lumpsum), lumpsumMonth: num(lumpsumMonth), lumpsumMode });
  const origYearly = amortizationYearly(origMonthly);
  const accelYearly = amortizationYearly(accelMonthly);
  const accelInterestPaid = accelMonthly.reduce((s, r) => s + r.interest, 0);
  const accelMonths = accelMonthly.length;
  const chartData = origYearly.map((o, i) => ({ year: o.year, Original: Math.round(o.closing), Accelerated: Math.round(accelYearly[i] ? accelYearly[i].closing : 0) }));
  const timeSavedMonths = origMonthly.length - accelMonths;
  const interestSaved = interestOrig - accelInterestPaid;
  const gaugeData = [{ name: "Principal", value: L }, { name: "Interest", value: interestOrig }];
  const activeMonthly = tableSet === "original" ? origMonthly : accelMonthly;
  const activeYearly = tableSet === "original" ? origYearly : accelYearly;
  const monthlyCols = [{ key: "month", label: "#" }, { key: "period", label: "Period", render: (r) => "Month " + r.month }, { key: "opening", label: "Opening Balance", render: (r) => money(r.opening) }, { key: "emi", label: "EMI", render: (r) => money(r.emi) }, { key: "interest", label: "Interest", render: (r) => money(r.interest), color: () => T.red }, { key: "principal", label: "Principal", render: (r) => money(r.principal) }, { key: "prepayment", label: "Prepayment", render: (r) => (r.prepayment > 0 ? money(r.prepayment) : "—"), color: (r) => (r.prepayment > 0 ? T.green : T.faint) }, { key: "closing", label: "Closing Balance", render: (r) => money(r.closing) }];
  const yearlyCols = [{ key: "year", label: "#" }, { key: "period", label: "Period", render: (r) => "Year " + r.year }, { key: "opening", label: "Opening Balance", render: (r) => money(r.opening) }, { key: "emi", label: "EMI (total)", render: (r) => money(r.emi) }, { key: "interest", label: "Interest", render: (r) => money(r.interest), color: () => T.red }, { key: "principal", label: "Principal", render: (r) => money(r.principal) }, { key: "prepayment", label: "Prepayment", render: (r) => (r.prepayment > 0 ? money(r.prepayment) : "—"), color: (r) => (r.prepayment > 0 ? T.green : T.faint) }, { key: "closing", label: "Closing Balance", render: (r) => money(r.closing) }];
  return (
    <div>
      <Card>
        <Field label="Loan Amount (₹)"><NumInput value={loan} onChange={setLoan} prefix="₹" /></Field>
        <Field label="Interest Rate (% p.a.)"><NumInput value={rate} onChange={setRate} suffix="%" /></Field>
        <Field label="Tenure (Years)"><NumInput value={tenure} onChange={setTenure} suffix="yrs" /></Field>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12.5, color: T.sub, fontWeight: 600 }}>MONTHLY EMI</div>
        <div className="disp" style={{ fontSize: 30, fontWeight: 700, color: T.text, margin: "4px 0 10px" }}>{money(emi)}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatCard label="Principal" value={money(L)} accent={T.text} />
          <StatCard label="Interest (no prepay)" value={money(interestOrig)} accent={T.red} />
          <StatCard label="Total Paid" value={money(totalPaidOrig)} accent={T.text} />
        </div>
      </Card>
      <ChartBox title="The Brutal Reality — Principal vs Interest" height={260}>
        <RePieChart>
          <Pie data={gaugeData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={2}><Cell fill={T.text} /><Cell fill={T.red} /></Pie>
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Legend wrapperStyle={{ fontSize: 12 }} />
        </RePieChart>
      </ChartBox>
      <Card style={{ marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🚀 Cheat Codes — Prepayment Accelerators</div>
        <Field label="Extra EMIs Per Year"><NumInput value={extraEmis} onChange={setExtraEmis} suffix="EMIs" /></Field>
        <Field label="Annual EMI Step-Up (%)"><NumInput value={stepUp} onChange={setStepUp} suffix="%" /></Field>
        <div style={{ borderTop: `1px solid ${T.borderSoft}`, margin: "14px 0" }} />
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Lumpsum Prepayment</div>
        <div style={{ fontSize: 11.5, color: T.faint, marginBottom: 10 }}>Got a bonus or windfall? Drop a one-time payment and watch the loan crumble.</div>
        <Field label="Lumpsum Amount (₹)"><NumInput value={lumpsum} onChange={setLumpsum} prefix="₹" /></Field>
        <Field label="Paid in Month #"><NumInput value={lumpsumMonth} onChange={setLumpsumMonth} suffix="mo" /></Field>
        <Field label="Mode"><Segmented value={lumpsumMode} onChange={setLumpsumMode} options={[{ value: "tenure", label: "Tenure Reducing" }, { value: "emi", label: "EMI Reducing" }]} /><div style={{ fontSize: 11.5, color: T.faint, marginTop: 6 }}>{lumpsumMode === "tenure" ? "EMI stays the same — your loan finishes earlier." : "Tenure stays the same — your EMI drops."}</div></Field>
      </Card>
      {hasAccel && (
        <Card style={{ marginTop: 16, borderColor: T.green }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🚀 Your Escape Plan</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StatCard label="Time Saved" value={yrsMonthsText(timeSavedMonths)} accent={T.green} />
            <StatCard label="Interest Saved" value={money(interestSaved)} accent={T.green} />
            <StatCard label="New Payoff Time" value={yrsMonthsText(accelMonths)} accent={T.text} />
          </div>
        </Card>
      )}
      <ChartBox title="Loan Balance Over Time">
        <LineChart data={chartData}>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="year" {...axisProps} tickFormatter={(v) => v + "y"} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Original" stroke={T.red} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="Accelerated" stroke={T.green} strokeWidth={2} dot={false} />
        </LineChart>
      </ChartBox>
      <Card style={{ marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📊 Amortization Schedule</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}><Segmented value={tableFreq} onChange={setTableFreq} options={[{ value: "yearly", label: "Yearly" }, { value: "monthly", label: "Monthly" }]} /></div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}><Segmented value={tableSet} onChange={setTableSet} options={[{ value: "original", label: "Original" }, { value: "accelerated", label: "Accelerated" }]} /></div>
        <PaginatedTable pageSize={tableFreq === "yearly" ? 10 : 12} columns={tableFreq === "yearly" ? yearlyCols : monthlyCols} rows={tableFreq === "yearly" ? activeYearly : activeMonthly} />
        <div style={{ fontSize: 11, color: T.faint, marginTop: 10 }}>{tableFreq === "yearly" ? "Each row aggregates 12 monthly EMIs. Switch to Monthly for full detail." : "Scroll horizontally to see every column."}</div>
      </Card>
    </div>
  );
}
function MultiLoanDebt() {
  const [loans, setLoans] = useState([{ id: 1, name: "Credit Card 1", balance: "100000", rate: "36", emi: "6000" }, { id: 2, name: "Credit Card 2", balance: "150000", rate: "30", emi: "7000" }, { id: 3, name: "Car Loan", balance: "500000", rate: "10", emi: "12000" }, { id: 4, name: "Home Loan", balance: "3000000", rate: "8.5", emi: "28000" }]);
  const [extraBudget, setExtraBudget] = useState("5000");
  const update = (id, key, val) => setLoans(loans.map((l) => (l.id === id ? { ...l, [key]: val } : l)));
  const addLoan = () => setLoans([...loans, { id: Date.now(), name: "New Loan", balance: "0", rate: "10", emi: "0" }]);
  const removeLoan = (id) => setLoans(loans.filter((l) => l.id !== id));
  const totalBaseEmi = loans.reduce((s, l) => s + num(l.emi), 0);
  const statusQuo = simulateMultiLoan(loans, 0, "status");
  const snowball = simulateMultiLoan(loans, extraBudget, "snowball");
  const avalanche = simulateMultiLoan(loans, extraBudget, "avalanche");
  const winner = avalanche.totalInterest <= snowball.totalInterest ? "avalanche" : "snowball";
  const chartData = statusQuo.totalDebtSeries.map((s, i) => ({ year: s.year, "Status Quo": s.total, Snowball: snowball.totalDebtSeries[i] ? snowball.totalDebtSeries[i].total : 0, Avalanche: avalanche.totalDebtSeries[i] ? avalanche.totalDebtSeries[i].total : 0 }));
  const StrategyBlock = ({ title, icon, sim, isWinner, note, color }) => (
    <Card style={{ marginBottom: 12, borderColor: isWinner ? T.green : T.border }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{icon} {title}</div>{isWinner && <span style={{ background: T.green + "22", color: T.green, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>🏆 Winner</span>}</div>
      <div style={{ fontSize: 11.5, color: T.faint, marginTop: 2, marginBottom: 10 }}>{note}</div>
      <div style={{ fontSize: 11.5, color: T.faint, fontWeight: 600 }}>DEBT-FREE IN</div>
      <div className="disp" style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>{yrsMonthsText(sim.months)}</div>
      <div style={{ fontSize: 11.5, color: T.faint, fontWeight: 600 }}>TOTAL INTEREST</div>
      <div className="disp" style={{ fontSize: 18, fontWeight: 700, color: color, marginBottom: 8 }}>{money(sim.totalInterest)}</div>
      {sim.payoffOrder.length > 0 && (<div style={{ marginTop: 10 }}><div style={{ fontSize: 11.5, color: T.faint, fontWeight: 600, marginBottom: 6 }}>PAYOFF ORDER</div>{sim.payoffOrder.map((p, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i === 0 ? "none" : `1px solid ${T.borderSoft}` }}><span style={{ width: 20, height: 20, borderRadius: "50%", background: T.green + "22", color: T.green, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span><span style={{ fontSize: 12.5, color: T.text, flex: 1 }}>{p.name}</span><span style={{ fontSize: 12, color: T.faint }}>{yrsMonthsText(p.months)}</span></div>))}</div>)}
    </Card>
  );
  return (
    <div>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Your Loans</div>
        {loans.map((l) => (
          <div key={l.id} style={{ background: T.bgSoft, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}><div style={{ flex: 1 }}><TextInput value={l.name} onChange={(v) => update(l.id, "name", v)} placeholder="Loan name" /></div><button onClick={() => removeLoan(l.id)} style={{ background: T.red + "22", border: "none", borderRadius: 8, padding: "0 10px", cursor: "pointer" }}><Trash2 size={15} color={T.red} /></button></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <div><div style={{ fontSize: 10.5, color: T.faint, marginBottom: 3 }}>Balance</div><NumInput value={l.balance} onChange={(v) => update(l.id, "balance", v)} prefix="₹" /></div>
              <div><div style={{ fontSize: 10.5, color: T.faint, marginBottom: 3 }}>Rate %</div><NumInput value={l.rate} onChange={(v) => update(l.id, "rate", v)} suffix="%" /></div>
              <div><div style={{ fontSize: 10.5, color: T.faint, marginBottom: 3 }}>Min EMI</div><NumInput value={l.emi} onChange={(v) => update(l.id, "emi", v)} prefix="₹" /></div>
            </div>
          </div>
        ))}
        <Btn accent={T.bgSoft} textColor={T.text} onClick={addLoan}><Plus size={16} /> Add Loan</Btn>
        <div style={{ marginTop: 14 }}><Field label="Extra Monthly Budget (for snowball/avalanche)"><NumInput value={extraBudget} onChange={setExtraBudget} prefix="₹" /></Field></div>
        <StatCard label="Total Base EMI (all loans)" value={money(totalBaseEmi)} accent={T.text} sub={`+ ${money(extraBudget)} extra = ${money(totalBaseEmi + num(extraBudget))} total outflow`} />
      </Card>
      <div style={{ marginTop: 16 }}>
        <StrategyBlock title="Status Quo" icon="🔒" sim={statusQuo} isWinner={false} note="Pay only the standard EMIs. The bank wins." color={T.red} />
        <StrategyBlock title="Snowball" icon="❤️" sim={snowball} isWinner={winner === "snowball"} note="Smallest balance first. Psychological wins." color={winner === "snowball" ? T.green : T.gold} />
        <StrategyBlock title="Avalanche" icon="🧠" sim={avalanche} isWinner={winner === "avalanche"} note="Highest interest first. Mathematical wins." color={winner === "avalanche" ? T.green : T.gold} />
      </div>
      <ChartBox title="Total Debt Over Time">
        <LineChart data={chartData}>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="year" {...axisProps} tickFormatter={(v) => v + "y"} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Status Quo" stroke={T.red} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="Snowball" stroke={T.gold} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="Avalanche" stroke={T.green} strokeWidth={2} dot={false} />
        </LineChart>
      </ChartBox>
    </div>
  );
}
function DebtCalc({ onBack }) {
  const [mode, setMode] = useState("single");
  return (
    <div>
      <PageHeader icon={Building2} onBack={onBack} title="Debt Engine" description="Calculate your true interest cost and build your escape plan — single loan or a full portfolio." />
      <Segmented value={mode} onChange={setMode} options={[{ value: "single", label: "Single Loan" }, { value: "multi", label: "Loan Portfolio (Snowball vs Avalanche)" }]} />
      <div style={{ marginTop: 16 }}>{mode === "single" ? <SingleLoanDebt /> : <MultiLoanDebt />}</div>
    </div>
  );
}
function BuyVsRentCalc({ onBack }) {
  const [city, setCity] = useState("Chennai");
  const [salary, setSalary] = useState("100000");
  const [sqft, setSqft] = useState("1000");
  const [pricePerSqft, setPricePerSqft] = useState("8000");
  const [rent, setRent] = useState("25000");
  const [propType, setPropType] = useState("ready");
  const [downPct, setDownPct] = useState("20");
  const [loanRate, setLoanRate] = useState("8.5");
  const [tenure, setTenure] = useState("20");
  const [equityR, setEquityR] = useState("12");
  const [propAppr, setPropAppr] = useState("6");
  const [rentInfl, setRentInfl] = useState("7");
  const [horizon, setHorizon] = useState("20");
  const propertyPrice = num(sqft) * num(pricePerSqft);
  const gstPct = propType === "under" ? 5 : propType === "affordable" ? 1 : 0;
  const stampDuty = propertyPrice * 0.05;
  const registration = propertyPrice * 0.01;
  const gst = propertyPrice * (gstPct / 100);
  const interiors = propertyPrice * 0.04;
  const totalActualCost = propertyPrice + stampDuty + registration + gst + interiors;
  const hiddenCosts = stampDuty + registration + gst + interiors;
  const downPayment = propertyPrice * (num(downPct) / 100);
  const cashUpfront = downPayment + hiddenCosts;
  const loanAmount = Math.max(propertyPrice - downPayment, 0);
  const emi = emiOf(loanAmount, num(loanRate), num(tenure));
  const salaryNeeded = emi / 0.3;
  const emiToSalaryPct = (emi / Math.max(num(salary), 1)) * 100;
  const shortfall = Math.max(salaryNeeded - num(salary), 0);
  const sim = (() => {
    const months = num(horizon) * 12;
    const rMonthly = num(loanRate) / 1200;
    const iMonthly = num(equityR) / 1200;
    let bal = loanAmount, investCorpus = cashUpfront, sipCorpus = 0, currentRent = num(rent), totalRentPaid = 0, emiPaidTotal = 0;
    const series = [];
    for (let m = 1; m <= months; m++) {
      if (bal > 0) { const interest = bal * rMonthly; let principal = emi - interest; if (principal > bal) principal = bal; bal -= principal; emiPaidTotal += emi; }
      investCorpus *= 1 + iMonthly; sipCorpus *= 1 + iMonthly;
      if (m > 1 && (m - 1) % 12 === 0) currentRent *= 1 + num(rentInfl) / 100;
      totalRentPaid += currentRent;
      const surplus = emi - currentRent;
      if (surplus > 0) sipCorpus += surplus;
      if (bal < 1) bal = 0;
      if (m % 12 === 0) { const propFV = propertyPrice * Math.pow(1 + num(propAppr) / 100, m / 12); series.push({ year: m / 12, Buy: Math.round(propFV - bal), "Rent + Invest": Math.round(investCorpus + sipCorpus) }); }
    }
    const propertyFV = propertyPrice * Math.pow(1 + num(propAppr) / 100, num(horizon));
    return { loanLeft: Math.max(bal, 0), propertyFV, buyNetWorth: propertyFV - Math.max(bal, 0), rentNetWorth: investCorpus + sipCorpus, totalRentPaid, emiPaidTotal, series };
  })();
  const delta = sim.rentNetWorth - sim.buyNetWorth;
  const verdict = delta > 0 ? "Renting wins" : "Buying wins";
  const buyIsWinner = sim.buyNetWorth >= sim.rentNetWorth;
  return (
    <div>
      <PageHeader icon={HomeIcon} onBack={onBack} title="Buy vs Rent Engine" description="Compare your net worth over time: pay EMI and own the home, or rent cheap and invest the difference." />
      <Card>
        <Field label="City"><Select value={city} onChange={setCity} options={["Chennai", "Coimbatore", "Madurai", "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune"].map((c) => ({ value: c, label: c }))} /></Field>
        <Field label="Net Monthly In-Hand Salary (₹)"><NumInput value={salary} onChange={setSalary} prefix="₹" /></Field>
        <Field label="Property Size (sqft)"><NumInput value={sqft} onChange={setSqft} suffix="sqft" /></Field>
        <Field label="Price per sqft (₹)"><NumInput value={pricePerSqft} onChange={setPricePerSqft} prefix="₹" /></Field>
        <Field label="Property Price" hint="Auto-calculated from size × price/sqft"><NumInput value={Math.round(propertyPrice)} disabled onChange={() => {}} prefix="₹" /></Field>
        <Field label="Current Monthly Rent (₹)"><NumInput value={rent} onChange={setRent} prefix="₹" /></Field>
        <Field label="Property Type" hint="GST applies only to under-construction property"><Segmented value={propType} onChange={setPropType} options={[{ value: "ready", label: "Ready / Resale" }, { value: "under", label: "Under-construction" }, { value: "affordable", label: "Affordable" }]} /></Field>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Affordability Reality Check — {city}</div>
        <div style={{ fontSize: 11.5, color: T.faint, lineHeight: 1.6, marginBottom: 10 }}>Property Cost: {money(propertyPrice)} · +Stamp Duty (5%): {money(stampDuty)} · +Registration (1%): {money(registration)} · +GST ({gstPct}%): {money(gst)} · +Interiors & misc (4%): {money(interiors)}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatCard label="Total Actual Cost" value={money(totalActualCost)} accent={T.text} />
          <StatCard label="Cash Needed Upfront" value={money(cashUpfront)} accent={T.gold} />
          <StatCard label="Loan Amount" value={money(loanAmount)} accent={T.text} />
          <StatCard label="EMI" value={money(emi) + "/mo"} accent={T.gold} />
        </div>
        <div style={{ marginTop: 12, background: emiToSalaryPct > 30 ? "#2A1518" : "#0F2417", border: `1px solid ${emiToSalaryPct > 30 ? T.red : T.green}`, borderRadius: 12, padding: 14 }}>
          {emiToSalaryPct > 30 ? (<><div style={{ color: T.red, fontWeight: 700, fontSize: 13 }}>⚠ EMI Anxiety Zone</div><div style={{ fontSize: 12.5, color: T.text, marginTop: 4 }}>Your salary: {money(salary)} → EMI = <span style={{ color: T.red, fontWeight: 700 }}>{pct1(emiToSalaryPct)}</span> of income</div><div style={{ fontSize: 11.5, color: T.faint, marginTop: 4 }}>Keep EMI ≤ 30% of income to sleep peacefully. Shortfall: {money(shortfall)}/mo</div></>) : (<><div style={{ color: T.green, fontWeight: 700, fontSize: 13 }}>✓ Comfortable Zone</div><div style={{ fontSize: 12.5, color: T.text, marginTop: 4 }}>EMI is {pct1(emiToSalaryPct)} of your income — salary needed for a safe 30% EMI ratio is {money(salaryNeeded)}/mo.</div></>)}
        </div>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Loan & Assumptions</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Down Payment %"><NumInput value={downPct} onChange={setDownPct} suffix="%" /></Field>
          <Field label="Home Loan Rate"><NumInput value={loanRate} onChange={setLoanRate} suffix="%" /></Field>
          <Field label="Tenure (yrs)"><NumInput value={tenure} onChange={setTenure} suffix="yrs" /></Field>
          <Field label="Horizon (yrs)"><NumInput value={horizon} onChange={setHorizon} suffix="yrs" /></Field>
          <Field label="Equity SIP Return"><NumInput value={equityR} onChange={setEquityR} suffix="%" /></Field>
          <Field label="Property Appreciation"><NumInput value={propAppr} onChange={setPropAppr} suffix="%" /></Field>
          <Field label="Rent Inflation"><NumInput value={rentInfl} onChange={setRentInfl} suffix="%" /></Field>
        </div>
      </Card>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <StatCard label="Buy — Net Worth" value={money(sim.buyNetWorth)} accent={buyIsWinner ? T.green : T.text} sub={`Property: ${money(sim.propertyFV)} · Loan left: ${money(sim.loanLeft)}`} />
        <StatCard label="Rent + Invest — Net Worth" value={money(sim.rentNetWorth)} accent={!buyIsWinner ? T.green : T.text} sub={`Rent paid: ${money(sim.totalRentPaid)}`} />
      </div>
      <Card style={{ marginTop: 12, borderColor: T.green }}><div style={{ fontSize: 13, color: T.sub }}>🏆 Verdict</div><div className="disp" style={{ fontSize: 22, fontWeight: 700, color: T.green }}>{verdict}</div><div style={{ fontSize: 12, color: T.faint, marginTop: 4 }}>Δ {money(Math.abs(delta))} · EMI/Salary: {pct1(emiToSalaryPct)}</div></Card>
      <ChartBox title="Net Worth Over Time">
        <LineChart data={sim.series}>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="year" {...axisProps} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Buy" stroke={T.gold} strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="Rent + Invest" stroke={T.green} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ChartBox>
    </div>
  );
}
function PortfolioCalc({ onBack }) {
  const [rows, setRows] = useState([{ id: 1, name: "Nifty 50 Index Fund", invested: "150000", current: "195000" }, { id: 2, name: "Gold ETF", invested: "50000", current: "58000" }]);
  const addRow = () => setRows([...rows, { id: Date.now(), name: "", invested: "0", current: "0" }]);
  const update = (id, key, val) => setRows(rows.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  const remove = (id) => setRows(rows.filter((r) => r.id !== id));
  const totalInvested = rows.reduce((s, r) => s + num(r.invested), 0);
  const totalCurrent = rows.reduce((s, r) => s + num(r.current), 0);
  const gain = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
  const pieData = rows.filter((r) => num(r.current) > 0).map((r) => ({ name: r.name || "Untitled", value: num(r.current) }));
  return (
    <div>
      <PageHeader icon={Briefcase} onBack={onBack} title="Portfolio" description="Track all your holdings in one place and see your overall gain or loss at a glance." />
      <Card>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: T.faint, marginBottom: 8 }}><span style={{ flex: 2 }}>Name</span><span style={{ flex: 1 }}>Invested (₹)</span><span style={{ flex: 1 }}>Current (₹)</span></div>
        {rows.map((r) => (<div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, alignItems: "center", marginBottom: 10 }}><TextInput value={r.name} onChange={(v) => update(r.id, "name", v)} placeholder="Holding name" /><NumInput value={r.invested} onChange={(v) => update(r.id, "invested", v)} prefix="₹" /><NumInput value={r.current} onChange={(v) => update(r.id, "current", v)} prefix="₹" /><button onClick={() => remove(r.id)} style={{ background: T.red + "22", border: "none", borderRadius: 8, padding: 9, cursor: "pointer" }}><Trash2 size={15} color={T.red} /></button></div>))}
        <Btn accent={T.bgSoft} textColor={T.text} onClick={addRow}><Plus size={16} /> Add Holding</Btn>
      </Card>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <StatCard label="Total Invested" value={money(totalInvested)} accent={T.text} />
        <StatCard label="Current Value" value={money(totalCurrent)} accent={T.text} />
        <StatCard label="Gain / Loss" value={`${gain >= 0 ? "+" : ""}${money(gain)}`} accent={gain >= 0 ? T.green : T.red} sub={pct1(gainPct)} />
      </div>
      {pieData.length > 0 && (<ChartBox title="Allocation by Holding" height={280}><RePieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>{pieData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? T.gold : CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Legend wrapperStyle={{ fontSize: 11 }} /></RePieChart></ChartBox>)}
    </div>
  );
}
function SmartCalc({ onBack, go }) {
  const [total, setTotal] = useState("500000");
  const [ladders, setLadders] = useState("5");
  const [rate, setRate] = useState("7.2");
  const [inflAdj, setInflAdj] = useState(false);
  const [inflRate, setInflRate] = useState("6");
  const n = Math.max(Math.round(num(ladders)), 1);
  const perLadder = num(total) / n;
  const deflate = (v, yy) => (inflAdj ? v / Math.pow(1 + num(inflRate) / 100, yy) : v);
  const rows = Array.from({ length: n }, (_, i) => { const tenure = i + 1; const maturity = deflate(fdMaturity(perLadder, num(rate), tenure, 4), tenure); return { tenure, amount: perLadder, maturity }; });
  const totalMaturity = rows.reduce((s, r) => s + r.maturity, 0);
  const tips = [
    { title: "SIP + SWP combo", desc: "Build a corpus with SIP through your career, then switch to SWP after retirement for a steady income.", cta: "sip" },
    { title: "Buy vs Rent, run the numbers first", desc: "Before signing a home loan, check the Buy vs Rent Engine — renting and investing the difference sometimes wins.", cta: "buyvsrent" },
    { title: "Debt first, then goals", desc: "Clear high-interest debt via the Debt Engine before ramping up SIPs — the guaranteed 'return' beats most markets.", cta: "debt" },
    { title: "Separate child & retirement pots", desc: "Never mix the Child Legacy Engine and Retirement Engine — each goal deserves its own dedicated investment.", cta: "child" },
    { title: "Rebalance yearly", desc: "Use the Investment Allocator once a year to bring equity/debt/gold back to your target mix.", cta: "allocator" },
  ];
  return (
    <div>
      <PageHeader icon={Sparkles} onBack={onBack} title="Smart Ideas" description="FD laddering, and practical strategies to grow wealth faster than a single SIP or SWP alone." />
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>FD Ladder Builder</div>
        <Field label="Total Amount to Ladder (₹)"><NumInput value={total} onChange={setTotal} prefix="₹" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Number of Ladders"><NumInput value={ladders} onChange={setLadders} suffix="steps" /></Field>
          <Field label="Interest Rate (% p.a.)"><NumInput value={rate} onChange={setRate} suffix="%" /></Field>
        </div>
        <InflationBlock adj={inflAdj} setAdj={setInflAdj} rate={inflRate} setRate={setInflRate} />
        <div className="scrollbox" style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr style={{ color: T.faint, textAlign: "left" }}><th style={{ padding: "6px 8px" }}>Ladder</th><th style={{ padding: "6px 8px" }}>Matures In</th><th style={{ padding: "6px 8px" }}>Amount</th><th style={{ padding: "6px 8px" }}>Maturity Value</th></tr></thead>
            <tbody>{rows.map((r, i) => (<tr key={i} style={{ borderTop: `1px solid ${T.borderSoft}`, color: T.text }}><td style={{ padding: "6px 8px" }}>#{i + 1}</td><td style={{ padding: "6px 8px" }}>{r.tenure} yr</td><td style={{ padding: "6px 8px" }}>{money(r.amount)}</td><td style={{ padding: "6px 8px", color: T.gold }}>{money(r.maturity)}</td></tr>))}</tbody>
          </table>
        </div>
        <div style={{ marginTop: 12 }}><StatCard label="Total Maturity Value" value={money(totalMaturity)} accent={T.gold} /></div>
      </Card>
      <ChartBox title="Ladder Maturity Schedule">
        <BarChart data={rows.map((r, i) => ({ ladder: "#" + (i + 1), value: Math.round(r.maturity) }))}>
          <CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="ladder" {...axisProps} /><YAxis {...axisProps} tickFormatter={compactY} />
          <Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Bar dataKey="value" fill={T.gold} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartBox>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {tips.map((t) => (<Card key={t.title} style={{ cursor: t.cta ? "pointer" : "default" }}><div onClick={() => t.cta && go(t.cta)}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{t.title}</div>{t.cta && <ChevronRight size={16} color={T.faint} />}</div><div style={{ fontSize: 12.5, color: T.sub, marginTop: 4, lineHeight: 1.5 }}>{t.desc}</div></div></Card>))}
      </div>
    </div>
  );
}
function OtherCalc({ onBack }) {
  const [tab, setTab] = useState("nsc");
  const [nscP, setNscP] = useState("100000");
  const [nscR, setNscR] = useState("7.7");
  const nscMaturity = fdMaturity(num(nscP), num(nscR), 5, 1);
  const [lsP, setLsP] = useState("100000");
  const [lsR, setLsR] = useState("12");
  const [lsY, setLsY] = useState("10");
  const lsFV = num(lsP) * Math.pow(1 + num(lsR) / 100, num(lsY));
  const lsSeries = [];
  for (let y = 0; y <= num(lsY); y++) lsSeries.push({ year: y, value: Math.round(num(lsP) * Math.pow(1 + num(lsR) / 100, y)) });
  const [cagrStart, setCagrStart] = useState("100000");
  const [cagrEnd, setCagrEnd] = useState("250000");
  const [cagrY, setCagrY] = useState("7");
  const cagr = num(cagrY) > 0 ? (Math.pow(num(cagrEnd) / Math.max(num(cagrStart), 1), 1 / num(cagrY)) - 1) * 100 : 0;
  const [infAmt, setInfAmt] = useState("100000");
  const [infR, setInfR] = useState("6");
  const [infY, setInfY] = useState("10");
  const futureCost = num(infAmt) * Math.pow(1 + num(infR) / 100, num(infY));
  const infSeries = [];
  for (let y = 0; y <= num(infY); y++) infSeries.push({ year: y, value: Math.round(num(infAmt) * Math.pow(1 + num(infR) / 100, y)) });
  return (
    <div>
      <PageHeader icon={CalcIcon} onBack={onBack} title="Other Calculators" description="Quick tools: NSC (lump sum), Lumpsum growth, CAGR and Inflation impact." />
      <Segmented value={tab} onChange={setTab} options={[{ value: "nsc", label: "NSC" }, { value: "lumpsum", label: "Lumpsum" }, { value: "cagr", label: "CAGR" }, { value: "inflation", label: "Inflation" }]} />
      <div style={{ marginTop: 16 }}>
        {tab === "nsc" && (<Card><div style={{ fontSize: 12.5, color: T.faint, marginBottom: 12 }}>National Savings Certificate — a 5-year lump sum, government-backed, fixed rate instrument (compounded annually).</div><Field label="Investment Amount (₹)"><NumInput value={nscP} onChange={setNscP} prefix="₹" /></Field><Field label="Interest Rate (% p.a.)"><NumInput value={nscR} onChange={setNscR} suffix="%" /></Field><div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}><StatCard label="Maturity (5 yrs, fixed)" value={money(nscMaturity)} accent={T.gold} /><StatCard label="Interest Earned" value={money(nscMaturity - num(nscP))} accent={T.green} /></div></Card>)}
        {tab === "lumpsum" && (<Card><Field label="Lump Sum Amount (₹)"><NumInput value={lsP} onChange={setLsP} prefix="₹" /></Field><Field label="Expected Return (% p.a.)"><NumInput value={lsR} onChange={setLsR} suffix="%" /></Field><Field label="Time Period (Years)"><NumInput value={lsY} onChange={setLsY} suffix="yrs" /></Field><div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}><StatCard label="Future Value" value={money(lsFV)} accent={T.gold} /><StatCard label="Gain" value={money(lsFV - num(lsP))} accent={T.green} /></div><ChartBox title="Growth Over Time" height={220}><AreaChart data={lsSeries}><defs><linearGradient id="lsG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.gold} stopOpacity={0.5} /><stop offset="100%" stopColor={T.gold} stopOpacity={0} /></linearGradient></defs><CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="year" {...axisProps} /><YAxis {...axisProps} tickFormatter={compactY} /><Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Area type="monotone" dataKey="value" stroke={T.gold} fill="url(#lsG)" strokeWidth={2.5} /></AreaChart></ChartBox></Card>)}
        {tab === "cagr" && (<Card><Field label="Starting Value (₹)"><NumInput value={cagrStart} onChange={setCagrStart} prefix="₹" /></Field><Field label="Ending Value (₹)"><NumInput value={cagrEnd} onChange={setCagrEnd} prefix="₹" /></Field><Field label="Time Period (Years)"><NumInput value={cagrY} onChange={setCagrY} suffix="yrs" /></Field><StatCard label="CAGR" value={pct1(cagr)} accent={cagr >= 0 ? T.green : T.red} /></Card>)}
        {tab === "inflation" && (<Card><Field label="Today's Cost (₹)"><NumInput value={infAmt} onChange={setInfAmt} prefix="₹" /></Field><Field label="Inflation Rate (% p.a.)"><NumInput value={infR} onChange={setInfR} suffix="%" /></Field><Field label="Years Ahead"><NumInput value={infY} onChange={setInfY} suffix="yrs" /></Field><StatCard label="Future Cost" value={money(futureCost)} accent={T.red} /><ChartBox title="Cost Rising Over Time" height={220}><AreaChart data={infSeries}><defs><linearGradient id="infG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.red} stopOpacity={0.5} /><stop offset="100%" stopColor={T.red} stopOpacity={0} /></linearGradient></defs><CartesianGrid {...gridProps} vertical={false} /><XAxis dataKey="year" {...axisProps} /><YAxis {...axisProps} tickFormatter={compactY} /><Tooltip {...tooltipStyle} formatter={(v) => money(v)} /><Area type="monotone" dataKey="value" stroke={T.red} fill="url(#infG)" strokeWidth={2.5} /></AreaChart></ChartBox></Card>)}
      </div>
    </div>
  );
}
const INVEST_GROUPS = [
  { title: "Grow Your Money", items: [
    { id: "sip", name: "SIP Calculator", desc: "Grow wealth monthly with compounding", icon: TrendingUp },
    { id: "fd", name: "FD Calculator", desc: "Fixed deposit maturity value", icon: Landmark },
    { id: "rd", name: "RD Calculator", desc: "Recurring deposit maturity value", icon: PiggyBank },
    { id: "gold", name: "Gold Calculator", desc: "Physical vs Digital vs ETF gold", icon: Coins },
    { id: "bonds", name: "Bonds Calculator", desc: "Coupon income & approx. YTM", icon: FileText },
  ]},
  { title: "Plan Ahead", items: [
    { id: "swp", name: "SWP Calculator", desc: "Plan monthly withdrawals from a corpus", icon: TrendingDown },
    { id: "retirement", name: "Retirement Engine", desc: "EPF vs NPS vs SIP, head-to-head", icon: Flame },
    { id: "child", name: "Child Legacy Engine", desc: "PPF vs SSY vs SIP for your child", icon: Heart },
    { id: "buyvsrent", name: "Buy vs Rent Engine", desc: "20-year net worth: own vs rent+invest", icon: HomeIcon },
  ]},
  { title: "Health & Debt", items: [
    { id: "finhealth", name: "FinHealth Score", desc: "A 0–100 checkup of your finances", icon: Activity },
    { id: "debt", name: "Debt Engine", desc: "Single loan or multi-loan snowball/avalanche", icon: Building2 },
  ]},
  { title: "Track & Strategize", items: [
    { id: "allocator", name: "Investment Allocator", desc: "Conservative vs Moderate vs Aggressive", icon: IconPie },
    { id: "portfolio", name: "Portfolio", desc: "Track all your holdings in one place", icon: Briefcase },
    { id: "smart", name: "Smart Ideas", desc: "FD laddering & wealth-building strategies", icon: Sparkles },
    { id: "other", name: "Other Calculators", desc: "NSC, Lumpsum, CAGR, Inflation", icon: CalcIcon },
  ]},
];
function InvestmentTab() {
  const [view, setView] = useState("home");
  const go = (id) => setView(id);
  const back = () => setView("home");
  const pages = {
    sip: <SipCalc onBack={back} />, swp: <SwpCalc onBack={back} />, fd: <FdCalc onBack={back} />, rd: <RdCalc onBack={back} />,
    retirement: <RetirementCalc onBack={back} />, child: <ChildCalc onBack={back} />, gold: <GoldCalc onBack={back} />,
    bonds: <BondsCalc onBack={back} />, finhealth: <FinHealthCalc onBack={back} />, allocator: <AllocatorCalc onBack={back} />,
    debt: <DebtCalc onBack={back} />, buyvsrent: <BuyVsRentCalc onBack={back} />, portfolio: <PortfolioCalc onBack={back} />,
    smart: <SmartCalc onBack={back} go={go} />, other: <OtherCalc onBack={back} />,
  };
  if (view !== "home") return pages[view];
  return (
    <div>
      <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
        <span className="disp" style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Investment Calculator</span>
        <div style={{ fontSize: 12.5, color: T.sub, maxWidth: 300, margin: "6px auto 0", lineHeight: 1.5 }}>One home for every rupee decision — SIPs to retirement, gold to debt payoff.</div>
      </div>
      {INVEST_GROUPS.map((g) => (
        <div key={g.title} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10, paddingLeft: 2 }}>{g.title}</div>
          <Card style={{ padding: 6 }}>
            {g.items.map((it, i) => (
              <div key={it.id} onClick={() => go(it.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", cursor: "pointer", borderTop: i === 0 ? "none" : `1px solid ${T.borderSoft}` }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: T.gold + "1f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><it.icon size={18} color={T.gold} /></div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{it.name}</div><div style={{ fontSize: 12, color: T.sub }}>{it.desc}</div></div>
                <ChevronRight size={17} color={T.faint} />
              </div>
            ))}
          </Card>
        </div>
      ))}
      <div style={{ textAlign: "center", fontSize: 11, color: T.faint, padding: "8px 0 20px" }}>Estimates only · Not investment advice · Assumed rates are editable</div>
    </div>
  );
}

/* ======================================================================
   TAB 4: SETTINGS
====================================================================== */
function SettingsRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderTop: `1px solid ${T.borderSoft}` }}>
      <span style={{ fontSize: 13.5, color: T.text }}>{label}</span>
      <span style={{ fontSize: 13, color: T.faint }}>{value}</span>
    </div>
  );
}
function SettingsTab() {
  const [angleDefault, setAngleDefault] = useState("deg");
  const [hapticHint, setHapticHint] = useState(true);
  return (
    <div>
      <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
        <span className="disp" style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Settings</span>
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>Calculator</div>
      <Card style={{ marginBottom: 20 }}>
        <Field label="Default Angle Mode"><Segmented value={angleDefault} onChange={setAngleDefault} options={[{ value: "deg", label: "Degrees" }, { value: "rad", label: "Radians" }]} /></Field>
        <Field label="Button Feedback"><Toggle checked={hapticHint} onChange={setHapticHint} label="Highlight button on tap" /></Field>
      </Card>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>App</div>
      <Card style={{ marginBottom: 20 }}>
        <SettingsRow label="App name" value="Smart Calculator" />
        <SettingsRow label="Version" value="1.0.0" />
        <SettingsRow label="Currency" value="₹ INR" />
        <SettingsRow label="Theme" value="Dark" />
      </Card>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>About</div>
      <Card>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.7 }}>
          Smart Calculator bundles a scientific calculator, a unit converter and a full suite of Indian personal-finance calculators in one app.
        </div>
        <div style={{ fontSize: 11.5, color: T.faint, marginTop: 12, lineHeight: 1.6 }}>
          All financial figures are estimates based on the rates you enter — not investment advice. Currency conversion rates are approximate reference values, not live market rates.
        </div>
      </Card>
    </div>
  );
}

/* =============================== APP SHELL ================================= */
const TABS = [
  { id: "calc", label: "Calculator", icon: CalcIcon },
  { id: "convert", label: "Convert", icon: RefreshCw },
  { id: "invest", label: "Investment", icon: Wallet },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];
export default function App() {
  const [tab, setTab] = useState("calc");
  return (
    <div className="sc" style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      <GlobalStyle />
      <div style={{ flex: 1, maxWidth: 460, width: "100%", margin: "0 auto", padding: "18px 16px 90px", overflowY: "auto" }}>
        <div style={{ display: tab === "calc" ? "block" : "none" }}><CalculatorTab /></div>
        <div style={{ display: tab === "convert" ? "block" : "none" }}><ConvertTab /></div>
        <div style={{ display: tab === "invest" ? "block" : "none" }}><InvestmentTab /></div>
        <div style={{ display: tab === "settings" ? "block" : "none" }}><SettingsTab /></div>
      </div>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.card, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0 max(10px, env(safe-area-inset-bottom))", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", padding: "4px 10px" }}>
              <t.icon size={20} color={active ? T.gold : T.faint} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: active ? T.gold : T.faint }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}