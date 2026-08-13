import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, Area, AreaChart, CartesianGrid } from "recharts";

// ─── Sample Data Generator ─────────────────────────────────────────────────
const BILLING_METHODS = ["T&M", "Lump Sum", "Cost Plus", "Unit Price"];
const STATUS_LABELS = ["Under Budget", "On Track", "At Risk", "Over Budget"];

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function generateProjects(n = 24) {
  const rand = seededRandom(42);
  const names = [
    "Luskin Center Renovation", "Engineering VI HVAC Upgrade", "Pauley Pavilion AV Systems",
    "Broad Art Center Exterior", "Life Sciences Phase II", "Geffen Playhouse Lighting",
    "Anderson School Suite 300", "Court of Sciences Landscape", "Royce Hall Seismic Retrofit",
    "Ackerman Union Food Court", "Drake Stadium Turf Replace", "Haines Hall ADA Compliance",
    "Boelter Hall Lab Modernize", "Kaufman Hall Acoustics", "Murphy Hall IT Infrastructure",
    "Sproul Landing Commons", "Saxon Suites Renovation", "Molecular Sciences Bldg",
    "Dodd Hall Archive Vault", "Campbell Hall Lecture AV", "Franz Hall Vivarium Upgrade",
    "Kerckhoff Patio Expansion", "Public Affairs Bldg HVAC", "Mira Hershey Hall Plumbing"
  ];
  return names.slice(0, n).map((name, i) => {
    const projNum = `PRJ-${String(2024001 + i)}`;
    const billingMethod = BILLING_METHODS[i % BILLING_METHODS.length];
    const originalContract = Math.round((150000 + rand() * 2850000) / 1000) * 1000;
    const changeOrderPct = (rand() * 0.25 - 0.05);
    const approvedChangeOrders = Math.round(originalContract * changeOrderPct / 100) * 100;
    const revisedContract = originalContract + approvedChangeOrders;
    const invoicedPct = 0.15 + rand() * 0.75;
    const amountInvoiced = Math.round(revisedContract * invoicedPct / 100) * 100;
    const draftPct = rand() * 0.15;
    const draftProForma = Math.round(revisedContract * draftPct / 100) * 100;
    const totalBilledAndDraft = amountInvoiced + draftProForma;
    const remainingAfterDraft = revisedContract - totalBilledAndDraft;
    const utilizationPct = revisedContract > 0 ? (totalBilledAndDraft / revisedContract) * 100 : 0;
    const fastHours = Math.round(50 + rand() * 2000);
    let status;
    if (utilizationPct > 95) status = "Over Budget";
    else if (utilizationPct > 80) status = "At Risk";
    else if (utilizationPct > 50) status = "On Track";
    else status = "Under Budget";
    return {
      projectNumber: projNum, projectName: name, billingMethod,
      originalContract, approvedChangeOrders, revisedContract,
      amountInvoiced, draftProForma, totalBilledAndDraft,
      fastHours, remainingAfterDraft, utilizationPct, status,
    };
  });
}

const PROJECTS = generateProjects(24);

// ─── Date periods & monthly invoice data per project ────────────────────────
const PERIOD_OPTIONS = [
  { key: "all", label: "All Time" },
  { key: "q1", label: "Q1 2026 (Jan–Mar)" },
  { key: "q2", label: "Q2 2026 (Apr–Jun)" },
  { key: "q3", label: "Q3 2026 (Jul–Aug)" },
  { key: "last3", label: "Last 3 Months" },
  { key: "last6", label: "Last 6 Months" },
];

const ALL_MONTHS = [
  { key: "2026-01", label: "Jan 2026", short: "Jan", q: "q1" },
  { key: "2026-02", label: "Feb 2026", short: "Feb", q: "q1" },
  { key: "2026-03", label: "Mar 2026", short: "Mar", q: "q1" },
  { key: "2026-04", label: "Apr 2026", short: "Apr", q: "q2" },
  { key: "2026-05", label: "May 2026", short: "May", q: "q2" },
  { key: "2026-06", label: "Jun 2026", short: "Jun", q: "q2" },
  { key: "2026-07", label: "Jul 2026", short: "Jul", q: "q3" },
  { key: "2026-08", label: "Aug 2026", short: "Aug", q: "q3" },
];

// Generate monthly invoice amounts per project (sums to amountInvoiced)
const rand2 = seededRandom(99);
const projectMonthlyData = PROJECTS.map(p => {
  const weights = ALL_MONTHS.map(() => 0.3 + rand2() * 0.7);
  const totalW = weights.reduce((a, b) => a + b, 0);
  return ALL_MONTHS.map((m, i) => ({
    month: m.key, label: m.short, q: m.q,
    projectNumber: p.projectNumber,
    billingMethod: p.billingMethod,
    invoiced: Math.round((weights[i] / totalW) * p.amountInvoiced),
    budget: Math.round((1 / ALL_MONTHS.length) * p.revisedContract),
  }));
}).flat();

function filterMonths(period) {
  if (period === "all") return ALL_MONTHS;
  if (period === "last3") return ALL_MONTHS.slice(-3);
  if (period === "last6") return ALL_MONTHS.slice(-6);
  return ALL_MONTHS.filter(m => m.q === period);
}

// ─── Monthly trend data (simulated 8 months) ───────────────────────────────
const monthlyTrend = ALL_MONTHS.map((m) => {
  const rows = projectMonthlyData.filter(r => r.month === m.key);
  return {
    month: m.short,
    invoiced: rows.reduce((s, r) => s + r.invoiced, 0),
    budget: rows.reduce((s, r) => s + r.budget, 0),
  };
});

// ─── Formatters ─────────────────────────────────────────────────────────────
const fmtCurrency = (v) => {
  if (v == null) return "—";
  const abs = Math.abs(v);
  const str = abs >= 1e6 ? `$${(abs / 1e6).toFixed(2)}M` : abs >= 1e3 ? `$${(abs / 1e3).toFixed(0)}K` : `$${abs}`;
  return v < 0 ? `(${str})` : str;
};
const fmtPct = (v) => (v == null ? "—" : `${v.toFixed(1)}%`);
const fmtNum = (v) => (v == null ? "—" : v.toLocaleString("en-US"));

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: "#F0F4F8",
  surface: "#FFFFFF",
  navy: "#0F172A",
  navyMid: "#1E293B",
  navyLight: "#334155",
  slate: "#64748B",
  slateLt: "#94A3B8",
  border: "#E2E8F0",
  borderLt: "#F1F5F9",
  accent: "#3B82F6",
  accentDark: "#2563EB",
  green: "#10B981",
  greenDark: "#059669",
  greenBg: "#ECFDF5",
  amber: "#F59E0B",
  amberDark: "#D97706",
  amberBg: "#FFFBEB",
  red: "#EF4444",
  redDark: "#DC2626",
  redBg: "#FEF2F2",
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
  purple: "#8B5CF6",
  purpleBg: "#F5F3FF",
};

const statusStyle = {
  "Under Budget": { bg: C.greenBg, fg: C.greenDark, icon: "✓" },
  "On Track": { bg: C.blueBg, fg: C.accentDark, icon: "●" },
  "At Risk": { bg: C.amberBg, fg: C.amberDark, icon: "▲" },
  "Over Budget": { bg: C.redBg, fg: C.redDark, icon: "!" },
};

const utilizationBarColor = (pct) => {
  if (pct > 95) return C.red;
  if (pct > 80) return C.amber;
  if (pct > 50) return C.accent;
  return C.green;
};

// ─── Trend Arrow Component ──────────────────────────────────────────────────
function TrendBadge({ value, label, inverse }) {
  const isPositive = inverse ? value < 0 : value > 0;
  const color = isPositive ? C.greenDark : C.redDark;
  const bg = isPositive ? C.greenBg : C.redBg;
  const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "→";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
        color, background: bg,
      }}>
        <span style={{ fontSize: 13 }}>{arrow}</span>
        {Math.abs(value).toFixed(1)}%
      </span>
      <span style={{ fontSize: 10, color: C.slateLt }}>{label}</span>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, trend, trendLabel, trendInverse, icon, color, sub }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 12, padding: "20px 22px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
      flex: "1 1 0", minWidth: 185,
      border: `1px solid ${C.borderLt}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 14, right: 16, width: 38, height: 38,
        borderRadius: 10, background: `${color}15`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18,
      }}>{icon}</div>
      <div style={{
        fontSize: 11, color: C.slate, textTransform: "uppercase",
        letterSpacing: 0.7, marginBottom: 8, fontWeight: 600,
      }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.navy, letterSpacing: -0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.slateLt, marginTop: 2 }}>{sub}</div>}
      {trend != null && <TrendBadge value={trend} label={trendLabel || "vs last month"} inverse={trendInverse} />}
    </div>
  );
}

// ─── Status Pill ────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const s = statusStyle[status] || { bg: "#f1f5f9", fg: "#475569", icon: "?" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, background: s.bg, color: s.fg,
      whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 8 }}>{s.icon}</span> {status}
    </span>
  );
}

// ─── Utilization Bar ────────────────────────────────────────────────────────
function UtilBar({ pct }) {
  const capped = Math.min(pct, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: "#E2E8F0", borderRadius: 10, overflow: "hidden", minWidth: 55 }}>
        <div style={{
          width: `${capped}%`, height: "100%",
          background: `linear-gradient(90deg, ${utilizationBarColor(pct)}CC, ${utilizationBarColor(pct)})`,
          borderRadius: 10, transition: "width .4s ease",
        }} />
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, color: utilizationBarColor(pct),
        minWidth: 42, textAlign: "right", fontVariantNumeric: "tabular-nums",
      }}>{fmtPct(pct)}</span>
    </div>
  );
}

// ─── Sort Header ────────────────────────────────────────────────────────────
function SortHeader({ label, field, sortKey, sortDir, onSort, align }) {
  const active = sortKey === field;
  return (
    <th onClick={() => onSort(field)} style={{
      cursor: "pointer", userSelect: "none", padding: "11px 10px",
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: 0.6, color: active ? C.accent : C.slateLt,
      borderBottom: `2px solid ${active ? C.accent : "transparent"}`,
      textAlign: align || "left", whiteSpace: "nowrap",
      background: "#FAFBFC", position: "sticky", top: 0, zIndex: 2,
    }}>
      {label} {active ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.navy, padding: "10px 14px", borderRadius: 8,
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)", border: "none",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: "inline-block" }} />
          {p.name}: {fmtCurrency(p.value)}
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function ProjectFinancialDashboard({ user, onLogout }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterBilling, setFilterBilling] = useState("All");
  const [sortKey, setSortKey] = useState("projectNumber");
  const [sortDir, setSortDir] = useState("asc");
  const [activeTab, setActiveTab] = useState("table");
  const [period, setPeriod] = useState("all");

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // Period-filtered monthly data
  const activeMonths = useMemo(() => filterMonths(period), [period]);
  const activeMonthKeys = useMemo(() => new Set(activeMonths.map(m => m.key)), [activeMonths]);
  const periodData = useMemo(() => projectMonthlyData.filter(r => activeMonthKeys.has(r.month)), [activeMonthKeys]);
  const periodTrend = useMemo(() => activeMonths.map(m => {
    const rows = projectMonthlyData.filter(r => r.month === m.key);
    return { month: m.short, invoiced: rows.reduce((s, r) => s + r.invoiced, 0), budget: rows.reduce((s, r) => s + r.budget, 0) };
  }), [activeMonths]);
  const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label || "All Time";

  const filtered = useMemo(() => {
    let d = [...PROJECTS];
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(p => p.projectName.toLowerCase().includes(q) || p.projectNumber.toLowerCase().includes(q));
    }
    if (filterStatus !== "All") d = d.filter(p => p.status === filterStatus);
    if (filterBilling !== "All") d = d.filter(p => p.billingMethod === filterBilling);
    d.sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return d;
  }, [search, filterStatus, filterBilling, sortKey, sortDir]);

  // KPI computations
  const totalRevised = PROJECTS.reduce((s, p) => s + p.revisedContract, 0);
  const totalInvoiced = PROJECTS.reduce((s, p) => s + p.amountInvoiced, 0);
  const totalRemaining = PROJECTS.reduce((s, p) => s + p.remainingAfterDraft, 0);
  const totalHours = PROJECTS.reduce((s, p) => s + p.fastHours, 0);
  const avgUtil = PROJECTS.reduce((s, p) => s + p.utilizationPct, 0) / PROJECTS.length;
  const atRiskCount = PROJECTS.filter(p => p.status === "At Risk" || p.status === "Over Budget").length;

  // Chart: status distribution
  const statusCounts = STATUS_LABELS.map(s => ({
    name: s, value: PROJECTS.filter(p => p.status === s).length,
    fill: statusStyle[s]?.fg || C.slate,
  }));

  // Chart: top 10
  const top10 = [...PROJECTS].sort((a, b) => b.revisedContract - a.revisedContract).slice(0, 10);

  // Chart: billing method — period-aware with monthly breakdown
  const billingData = useMemo(() => BILLING_METHODS.map(bm => {
    const rows = periodData.filter(r => r.billingMethod === bm);
    return {
      name: bm,
      count: PROJECTS.filter(p => p.billingMethod === bm).length,
      invoiced: rows.reduce((s, r) => s + r.invoiced, 0),
      budget: rows.reduce((s, r) => s + r.budget, 0),
    };
  }), [periodData]);

  // Billing method monthly trend (for the stacked area)
  const billingMonthly = useMemo(() => activeMonths.map(m => {
    const row = { month: m.short };
    BILLING_METHODS.forEach(bm => {
      row[bm] = projectMonthlyData.filter(r => r.month === m.key && r.billingMethod === bm)
        .reduce((s, r) => s + r.invoiced, 0);
    });
    return row;
  }), [activeMonths]);

  const COLS = [
    { key: "projectNumber", label: "Project #", align: "left" },
    { key: "projectName", label: "Project Name", align: "left" },
    { key: "billingMethod", label: "Billing", align: "center" },
    { key: "originalContract", label: "Original Contract", align: "right", fmt: fmtCurrency },
    { key: "approvedChangeOrders", label: "Change Orders", align: "right", fmt: fmtCurrency },
    { key: "revisedContract", label: "Current Contract", align: "right", fmt: fmtCurrency },
    { key: "amountInvoiced", label: "Invoiced", align: "right", fmt: fmtCurrency },
    { key: "draftProForma", label: "Draft Pro Forma", align: "right", fmt: fmtCurrency },
    { key: "totalBilledAndDraft", label: "Total Billed", align: "right", fmt: fmtCurrency },
    { key: "fastHours", label: "FAST Hrs", align: "right", fmt: fmtNum },
    { key: "remainingAfterDraft", label: "Remaining", align: "right", fmt: fmtCurrency },
    { key: "utilizationPct", label: "Utilization", align: "center", custom: true },
    { key: "status", label: "Status", align: "center", custom: true },
  ];

  const tabStyle = (id) => ({
    padding: "10px 24px", fontSize: 12, fontWeight: 600,
    border: "none", cursor: "pointer",
    background: activeTab === id ? C.accent : "transparent",
    color: activeTab === id ? "#fff" : C.slate,
    borderRadius: 8, transition: "all .2s",
  });

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: C.bg, minHeight: "100vh", color: C.navy }}>
      {/* ── Header ── */}
      <div style={{
        background: C.navy, padding: "0 32px", display: "flex",
        alignItems: "center", justifyContent: "space-between", height: 64,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#fff",
          }}>UCLA</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: -0.3 }}>
              UCLA Project Financial Dashboard
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
              {PROJECTS.length} Active Projects · {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{user?.name || "User"}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{user?.role || ""}</div>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#fff",
          }}>{(user?.name || "U").split(" ").map(n => n[0]).join("")}</div>
          {onLogout && (
            <button onClick={onLogout} style={{
              padding: "7px 16px", fontSize: 11, fontWeight: 600, marginLeft: 4,
              background: "transparent", color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
              cursor: "pointer",
            }}>Sign Out</button>
          )}
        </div>
      </div>

      <div style={{ padding: "24px 28px 32px" }}>
        {/* ── KPI Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: 16, marginBottom: 24 }}>
          <KpiCard label="Total Contract Value" value={fmtCurrency(totalRevised)} icon="📋" color={C.accent}
            trend={4.2} trendLabel="vs last month" sub={`Across ${PROJECTS.length} projects`} />
          <KpiCard label="Amount Invoiced" value={fmtCurrency(totalInvoiced)} icon="💰" color={C.green}
            trend={8.7} trendLabel="MoM" sub={fmtPct(totalInvoiced / totalRevised * 100) + " collected"} />
          <KpiCard label="Remaining Balance" value={fmtCurrency(totalRemaining)} icon="⏳" color={C.amber}
            trend={-3.1} trendLabel="MoM" trendInverse={true} />
          <KpiCard label="FAST Hours" value={fmtNum(totalHours)} icon="⏱" color={C.purple}
            trend={12.4} trendLabel="vs last month" sub={`${fmtNum(Math.round(totalHours / PROJECTS.length))} avg/project`} />
          <KpiCard label="Avg Utilization" value={fmtPct(avgUtil)} icon="📊" color={C.accent}
            trend={2.8} trendLabel="MoM" />
          <KpiCard label="At Risk Projects" value={atRiskCount} icon="⚠️" color={C.red}
            trend={atRiskCount > 3 ? 15.0 : -10.0} trendLabel="vs last month" trendInverse={true}
            sub={`of ${PROJECTS.length} total`} />
        </div>

        {/* ── Tab Bar + Period Filter ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{
            display: "flex", gap: 6, background: C.surface,
            padding: 4, borderRadius: 10, width: "fit-content",
            border: `1px solid ${C.border}`,
          }}>
            <button onClick={() => setActiveTab("table")} style={tabStyle("table")}>📋 Detail Table</button>
            <button onClick={() => setActiveTab("charts")} style={tabStyle("charts")}>📊 Analytics</button>
            <button onClick={() => setActiveTab("trends")} style={tabStyle("trends")}>📈 Trends</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: C.slateLt, fontWeight: 600 }}>📅 Period:</span>
            <div style={{ display: "flex", gap: 4, background: C.surface, padding: 3, borderRadius: 8, border: `1px solid ${C.border}` }}>
              {PERIOD_OPTIONS.map(po => (
                <button key={po.key} onClick={() => setPeriod(po.key)} style={{
                  padding: "6px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                  background: period === po.key ? C.navy : "transparent",
                  color: period === po.key ? "#fff" : C.slate,
                  borderRadius: 6, transition: "all .2s", whiteSpace: "nowrap",
                }}>{po.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ TABLE TAB ═══ */}
        {activeTab === "table" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.slateLt, fontSize: 14 }}>🔍</span>
                <input type="text" placeholder="Search projects…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: "9px 14px 9px 36px", fontSize: 13, border: `1px solid ${C.border}`,
                    borderRadius: 8, outline: "none", minWidth: 240, background: C.surface,
                    color: C.navy,
                  }} />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
                padding: "9px 12px", fontSize: 12, border: `1px solid ${C.border}`,
                borderRadius: 8, background: C.surface, color: C.navy, cursor: "pointer",
              }}>
                <option value="All">All Statuses</option>
                {STATUS_LABELS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterBilling} onChange={e => setFilterBilling(e.target.value)} style={{
                padding: "9px 12px", fontSize: 12, border: `1px solid ${C.border}`,
                borderRadius: 8, background: C.surface, color: C.navy, cursor: "pointer",
              }}>
                <option value="All">All Billing Methods</option>
                {BILLING_METHODS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <span style={{
                fontSize: 12, color: C.slateLt, background: C.borderLt,
                padding: "6px 12px", borderRadius: 20, fontWeight: 600,
              }}>{filtered.length} of {PROJECTS.length}</span>
            </div>

            <div style={{
              background: C.surface, borderRadius: 12, overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: `1px solid ${C.border}`,
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1300 }}>
                  <thead>
                    <tr>{COLS.map(c => (
                      <SortHeader key={c.key} label={c.label} field={c.key} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align={c.align} />
                    ))}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, idx) => (
                      <tr key={p.projectNumber} style={{ borderBottom: `1px solid ${C.borderLt}` }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8FAFF"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        {COLS.map(c => {
                          if (c.key === "utilizationPct") return <td key={c.key} style={{ padding: "9px 10px" }}><UtilBar pct={p.utilizationPct} /></td>;
                          if (c.key === "status") return <td key={c.key} style={{ padding: "9px 10px", textAlign: "center" }}><StatusPill status={p.status} /></td>;
                          const val = p[c.key];
                          const display = c.fmt ? c.fmt(val) : val;
                          const isNeg = typeof val === "number" && val < 0;
                          return (
                            <td key={c.key} style={{
                              padding: "9px 10px", fontSize: 12, textAlign: c.align || "left",
                              color: isNeg ? C.red : c.key === "projectName" ? C.navy : C.navyLight,
                              fontWeight: c.key === "projectName" ? 600 : 400,
                              whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums",
                            }}>{display}</td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr style={{ background: "#F8FAFC" }}>
                      <td colSpan={3} style={{ padding: "12px 10px", fontSize: 12, fontWeight: 700, color: C.navy }}>
                        TOTAL ({filtered.length} projects)
                      </td>
                      {[
                        filtered.reduce((s, p) => s + p.originalContract, 0),
                        filtered.reduce((s, p) => s + p.approvedChangeOrders, 0),
                        filtered.reduce((s, p) => s + p.revisedContract, 0),
                        filtered.reduce((s, p) => s + p.amountInvoiced, 0),
                        filtered.reduce((s, p) => s + p.draftProForma, 0),
                        filtered.reduce((s, p) => s + p.totalBilledAndDraft, 0),
                        filtered.reduce((s, p) => s + p.fastHours, 0),
                        filtered.reduce((s, p) => s + p.remainingAfterDraft, 0),
                      ].map((v, i) => (
                        <td key={i} style={{
                          padding: "12px 10px", fontSize: 12, fontWeight: 700, textAlign: "right",
                          color: v < 0 ? C.red : C.navy, fontVariantNumeric: "tabular-nums",
                        }}>{i === 6 ? fmtNum(v) : fmtCurrency(v)}</td>
                      ))}
                      <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, fontSize: 12 }}>
                        {fmtPct(filtered.reduce((s, p) => s + p.utilizationPct, 0) / (filtered.length || 1))}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ═══ ANALYTICS TAB ═══ */}
        {activeTab === "charts" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Status Donut */}
            <div style={{ background: C.surface, borderRadius: 12, padding: 24, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Contract Status</div>
              <div style={{ fontSize: 12, color: C.slateLt, marginBottom: 16 }}>Distribution across {PROJECTS.length} projects</div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95}
                    innerRadius={55} paddingAngle={4} cornerRadius={4}
                    label={({ name, value, percent }) => `${(percent * 100).toFixed(0)}%`}
                    style={{ fontSize: 12, fontWeight: 700 }}>
                    {statusCounts.map((e, i) => <Cell key={i} fill={e.fill} stroke="none" />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top 10 — Custom Horizontal Chart */}
            <div style={{ background: C.surface, borderRadius: 12, padding: 24, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Top 10 by Contract Value</div>
              <div style={{ fontSize: 12, color: C.slateLt, marginBottom: 20 }}>Invoiced vs remaining · sorted by total contract</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {top10.map((p, i) => {
                  const maxVal = top10[0].revisedContract;
                  const totalWidth = (p.revisedContract / maxVal) * 100;
                  const invoicedWidth = (p.amountInvoiced / maxVal) * 100;
                  const utilPct = p.utilizationPct;
                  const barColor = utilPct > 90 ? C.red : utilPct > 70 ? C.amber : C.accent;
                  return (
                    <div key={p.projectNumber} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: `${barColor}18`, color: barColor,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, flexShrink: 0,
                      }}>{i + 1}</div>
                      <div style={{ width: 130, flexShrink: 0, overflow: "hidden" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.projectName}
                        </div>
                        <div style={{ fontSize: 9, color: C.slateLt }}>{p.billingMethod}</div>
                      </div>
                      <div style={{ flex: 1, position: "relative", height: 26 }}>
                        {/* Total bar (ghost) */}
                        <div style={{
                          position: "absolute", top: 3, left: 0, height: 20,
                          width: `${totalWidth}%`, background: "#F1F5F9",
                          borderRadius: 10,
                        }} />
                        {/* Invoiced bar (filled) */}
                        <div style={{
                          position: "absolute", top: 3, left: 0, height: 20,
                          width: `${invoicedWidth}%`,
                          background: `linear-gradient(90deg, ${barColor}DD, ${barColor})`,
                          borderRadius: 10, transition: "width .5s ease",
                          boxShadow: `0 2px 8px ${barColor}30`,
                        }} />
                        {/* Value label on the invoiced bar */}
                        {invoicedWidth > 15 && (
                          <div style={{
                            position: "absolute", top: 5, left: `${Math.min(invoicedWidth - 1, totalWidth - 5)}%`,
                            transform: "translateX(-100%)", paddingRight: 6,
                            fontSize: 9, fontWeight: 700, color: "#fff",
                            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                          }}>{fmtCurrency(p.amountInvoiced)}</div>
                        )}
                      </div>
                      <div style={{ width: 58, textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.navy }}>{fmtCurrency(p.revisedContract)}</div>
                        <div style={{ fontSize: 9, color: barColor, fontWeight: 600 }}>{fmtPct(utilPct)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 10, borderTop: `1px solid ${C.borderLt}`, justifyContent: "center" }}>
                {[
                  { color: C.accent, label: "Invoiced (healthy)" },
                  { color: C.amber, label: "Invoiced (>70% util)" },
                  { color: C.red, label: "Invoiced (>90% util)" },
                  { color: "#F1F5F9", label: "Remaining", border: true },
                ].map((l, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.slate }}>
                    <div style={{ width: 18, height: 4, borderRadius: 2, background: l.color, border: l.border ? `1px solid ${C.border}` : "none" }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Billing Method — Period-Aware */}
            <div style={{ background: C.surface, borderRadius: 12, padding: 24, border: `1px solid ${C.border}`, gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Invoicing by Billing Method</div>
                  <div style={{ fontSize: 12, color: C.slateLt }}>{periodLabel} · Monthly breakdown by billing type</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {billingData.map(b => {
                    const pct = b.budget > 0 ? ((b.invoiced / b.budget) * 100) : 0;
                    return (
                      <div key={b.name} style={{
                        padding: "10px 14px", borderRadius: 8, background: "#F8FAFC",
                        border: `1px solid ${C.borderLt}`, minWidth: 110, textAlign: "center",
                      }}>
                        <div style={{ fontSize: 10, color: C.slateLt, fontWeight: 600, marginBottom: 4 }}>{b.name}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>{fmtCurrency(b.invoiced)}</div>
                        <div style={{ fontSize: 10, color: pct > 100 ? C.red : pct > 80 ? C.amber : C.green, fontWeight: 600, marginTop: 2 }}>
                          {fmtPct(pct)} of budget
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={billingMonthly} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    {[
                      { key: "T&M", color: C.accent },
                      { key: "Lump Sum", color: C.green },
                      { key: "Cost Plus", color: C.purple },
                      { key: "Unit Price", color: C.amber },
                    ].map(({ key, color }) => (
                      <linearGradient key={key} id={`grad-${key.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderLt} />
                  <XAxis dataKey="month" style={{ fontSize: 11 }} axisLine={false} />
                  <YAxis tickFormatter={v => `$${(v / 1e6).toFixed(1)}M`} style={{ fontSize: 10 }} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  {[
                    { key: "T&M", color: C.accent },
                    { key: "Lump Sum", color: C.green },
                    { key: "Cost Plus", color: C.purple },
                    { key: "Unit Price", color: C.amber },
                  ].map(({ key, color }) => (
                    <Area key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2}
                      fill={`url(#grad-${key.replace(/\s/g, "")})`} name={key}
                      dot={{ r: 3, fill: color, stroke: "#fff", strokeWidth: 1.5 }} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" iconSize={14} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ═══ TRENDS TAB ═══ */}
        {activeTab === "trends" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
            <div style={{ background: C.surface, borderRadius: 12, padding: 24, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Monthly Invoicing vs Budget</div>
              <div style={{ fontSize: 12, color: C.slateLt, marginBottom: 20 }}>{periodLabel} · Budget target vs actual invoiced</div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={periodTrend} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.green} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={C.green} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderLt} />
                  <XAxis dataKey="month" style={{ fontSize: 11 }} axisLine={false} />
                  <YAxis tickFormatter={v => `$${(v / 1e6).toFixed(1)}M`} style={{ fontSize: 10 }} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="budget" stroke={C.slateLt} strokeWidth={2}
                    fill="url(#gradGreen)" name="Budget Target" strokeDasharray="6 3" />
                  <Area type="monotone" dataKey="invoiced" stroke={C.accent} strokeWidth={2.5}
                    fill="url(#gradBlue)" name="Invoiced" dot={{ r: 4, fill: C.accent, stroke: "#fff", strokeWidth: 2 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" iconSize={8} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Per-project sparkline summary */}
            <div style={{ background: C.surface, borderRadius: 12, padding: 24, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Project Health Summary</div>
              <div style={{ fontSize: 12, color: C.slateLt, marginBottom: 16 }}>Quick view · utilization and status across all projects</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {PROJECTS.slice(0, 12).map(p => {
                  const s = statusStyle[p.status];
                  return (
                    <div key={p.projectNumber} style={{
                      padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.borderLt}`,
                      display: "flex", alignItems: "center", gap: 12, background: "#FAFBFC",
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: s.fg, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.projectName}
                        </div>
                        <div style={{ fontSize: 10, color: C.slateLt }}>{fmtCurrency(p.revisedContract)}</div>
                      </div>
                      <UtilBar pct={p.utilizationPct} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
