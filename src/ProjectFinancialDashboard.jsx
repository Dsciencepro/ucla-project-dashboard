import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

// ─── Sample Data Generator (mirrors the PBIX star schema) ───────────────────
const BILLING_METHODS = ["T&M", "Lump Sum", "Cost Plus", "Unit Price"];
const STATUS_LABELS = ["Under Budget", "On Track", "At Risk", "Over Budget"];

function generateProjects(n = 24) {
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
    const originalContract = Math.round((150000 + Math.random() * 2850000) / 1000) * 1000;
    const changeOrderPct = (Math.random() * 0.25 - 0.05);
    const approvedChangeOrders = Math.round(originalContract * changeOrderPct / 100) * 100;
    const revisedContract = originalContract + approvedChangeOrders;
    const invoicedPct = 0.15 + Math.random() * 0.75;
    const amountInvoiced = Math.round(revisedContract * invoicedPct / 100) * 100;
    const draftPct = Math.random() * 0.15;
    const draftProForma = Math.round(revisedContract * draftPct / 100) * 100;
    const totalBilledAndDraft = amountInvoiced + draftProForma;
    const remainingAfterDraft = revisedContract - totalBilledAndDraft;
    const utilizationPct = revisedContract > 0 ? (totalBilledAndDraft / revisedContract) * 100 : 0;
    const fastHours = Math.round(50 + Math.random() * 2000);
    let status;
    if (utilizationPct > 95) status = "Over Budget";
    else if (utilizationPct > 80) status = "At Risk";
    else if (utilizationPct > 50) status = "On Track";
    else status = "Under Budget";

    return {
      projectNumber: projNum,
      projectName: name,
      billingMethod,
      originalContract,
      approvedChangeOrders,
      revisedContract,
      amountInvoiced,
      draftProForma,
      totalBilledAndDraft,
      fastHours,
      remainingAfterDraft,
      utilizationPct,
      status,
    };
  });
}

const PROJECTS = generateProjects(24);

// ─── Formatters ─────────────────────────────────────────────────────────────
const fmtCurrency = (v) => {
  if (v == null) return "—";
  const abs = Math.abs(v);
  const str = abs >= 1e6 ? `$${(abs / 1e6).toFixed(2)}M` : `$${abs.toLocaleString("en-US")}`;
  return v < 0 ? `(${str})` : str;
};
const fmtPct = (v) => (v == null ? "—" : `${v.toFixed(1)}%`);
const fmtNum = (v) => (v == null ? "—" : v.toLocaleString("en-US"));

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: "#F6F8FB",
  surface: "#FFFFFF",
  navy: "#1B2A4A",
  navyLight: "#2C3E6B",
  slate: "#64748B",
  border: "#E2E8F0",
  accent: "#3B82F6",
  green: "#059669",
  greenBg: "#ECFDF5",
  amber: "#D97706",
  amberBg: "#FFFBEB",
  red: "#DC2626",
  redBg: "#FEF2F2",
  blue: "#2563EB",
  blueBg: "#EFF6FF",
};

const statusColor = {
  "Under Budget": { bg: C.greenBg, fg: C.green },
  "On Track": { bg: C.blueBg, fg: C.blue },
  "At Risk": { bg: C.amberBg, fg: C.amber },
  "Over Budget": { bg: C.redBg, fg: C.red },
};

const utilizationBarColor = (pct) => {
  if (pct > 95) return C.red;
  if (pct > 80) return C.amber;
  if (pct > 50) return C.accent;
  return C.green;
};

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 10, padding: "18px 22px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", flex: "1 1 0",
      minWidth: 170, borderLeft: `3px solid ${color || C.accent}`,
    }}>
      <div style={{ fontSize: 11, color: C.slate, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.navy }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Status Pill ────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const sc = statusColor[status] || { bg: "#f1f5f9", fg: "#475569" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 12,
      fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.fg,
      whiteSpace: "nowrap",
    }}>{status}</span>
  );
}

// ─── Utilization Bar ────────────────────────────────────────────────────────
function UtilBar({ pct }) {
  const capped = Math.min(pct, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 7, background: "#E2E8F0", borderRadius: 4, overflow: "hidden", minWidth: 50 }}>
        <div style={{ width: `${capped}%`, height: "100%", background: utilizationBarColor(pct), borderRadius: 4, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: utilizationBarColor(pct), minWidth: 42, textAlign: "right" }}>{fmtPct(pct)}</span>
    </div>
  );
}

// ─── Sortable Column Header ─────────────────────────────────────────────────
function SortHeader({ label, field, sortKey, sortDir, onSort, align }) {
  const active = sortKey === field;
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        cursor: "pointer", userSelect: "none", padding: "10px 10px",
        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: 0.4, color: active ? C.accent : C.slate,
        borderBottom: `2px solid ${active ? C.accent : C.border}`,
        textAlign: align || "left", whiteSpace: "nowrap",
        background: "transparent", position: "sticky", top: 0,
        zIndex: 2, backdropFilter: "blur(6px)",
      }}
    >
      {label} {active ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function ProjectFinancialDashboard() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterBilling, setFilterBilling] = useState("All");
  const [sortKey, setSortKey] = useState("projectNumber");
  const [sortDir, setSortDir] = useState("asc");
  const [activeTab, setActiveTab] = useState("table");

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

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

  // Chart data
  const statusCounts = STATUS_LABELS.map(s => ({
    name: s, value: PROJECTS.filter(p => p.status === s).length,
    fill: statusColor[s]?.fg || C.slate,
  }));

  const top10 = [...PROJECTS].sort((a, b) => b.revisedContract - a.revisedContract).slice(0, 10).map(p => ({
    name: p.projectName.length > 22 ? p.projectName.slice(0, 20) + "…" : p.projectName,
    contract: p.revisedContract,
    invoiced: p.amountInvoiced,
    remaining: p.remainingAfterDraft,
  }));

  const COLS = [
    { key: "projectNumber", label: "Project #", align: "left" },
    { key: "projectName", label: "Project Name", align: "left" },
    { key: "billingMethod", label: "Billing", align: "center" },
    { key: "originalContract", label: "Original Contract", align: "right", fmt: fmtCurrency },
    { key: "approvedChangeOrders", label: "Change Orders", align: "right", fmt: fmtCurrency },
    { key: "revisedContract", label: "Current Contract", align: "right", fmt: fmtCurrency },
    { key: "amountInvoiced", label: "Amount Invoiced", align: "right", fmt: fmtCurrency },
    { key: "draftProForma", label: "Draft Pro Forma", align: "right", fmt: fmtCurrency },
    { key: "totalBilledAndDraft", label: "Total Billed + Draft", align: "right", fmt: fmtCurrency },
    { key: "fastHours", label: "FAST Hours", align: "right", fmt: fmtNum },
    { key: "remainingAfterDraft", label: "Remaining", align: "right", fmt: fmtCurrency },
    { key: "utilizationPct", label: "Utilization", align: "center", custom: true },
    { key: "status", label: "Status", align: "center", custom: true },
  ];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: C.bg, minHeight: "100vh", color: C.navy, padding: 0 }}>
      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`,
        padding: "22px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: -0.3 }}>
            Project Financial Dashboard
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
            Contract &amp; Billing Tracker · {PROJECTS.length} Active Projects
          </div>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
          Sample data · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>

      <div style={{ padding: "20px 28px 28px" }}>
        {/* ── KPI Cards ── */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
          <KpiCard label="Total Contract Value" value={fmtCurrency(totalRevised)} sub={`${PROJECTS.length} projects`} color={C.accent} />
          <KpiCard label="Amount Invoiced" value={fmtCurrency(totalInvoiced)} sub={fmtPct(totalInvoiced / totalRevised * 100) + " of total"} color={C.green} />
          <KpiCard label="Remaining Balance" value={fmtCurrency(totalRemaining)} color={C.amber} />
          <KpiCard label="FAST Hours" value={fmtNum(totalHours)} sub={`Avg ${fmtNum(Math.round(totalHours / PROJECTS.length))} / project`} color={C.navyLight} />
          <KpiCard label="Avg Utilization" value={fmtPct(avgUtil)} color={avgUtil > 80 ? C.amber : C.accent} />
          <KpiCard label="At Risk / Over Budget" value={atRiskCount} sub={`of ${PROJECTS.length} projects`} color={atRiskCount > 0 ? C.red : C.green} />
        </div>

        {/* ── Tab Switcher ── */}
        <div style={{ display: "flex", gap: 0, marginBottom: 18 }}>
          {[{ id: "table", label: "Detail Table" }, { id: "charts", label: "Visual Summary" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "9px 22px", fontSize: 12, fontWeight: 600,
              border: `1px solid ${C.border}`, cursor: "pointer",
              background: activeTab === t.id ? C.navy : C.surface,
              color: activeTab === t.id ? "#fff" : C.slate,
              borderRadius: t.id === "table" ? "7px 0 0 7px" : "0 7px 7px 0",
              borderLeft: t.id === "charts" ? "none" : undefined,
            }}>{t.label}</button>
          ))}
        </div>

        {activeTab === "table" && (
          <>
            {/* ── Filters ── */}
            <div style={{
              display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center",
            }}>
              <input
                type="text" placeholder="Search projects…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: "8px 14px", fontSize: 13, border: `1px solid ${C.border}`,
                  borderRadius: 7, outline: "none", minWidth: 220, background: C.surface,
                  color: C.navy,
                }}
              />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
                padding: "8px 12px", fontSize: 12, border: `1px solid ${C.border}`,
                borderRadius: 7, background: C.surface, color: C.navy, cursor: "pointer",
              }}>
                <option value="All">All Statuses</option>
                {STATUS_LABELS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterBilling} onChange={e => setFilterBilling(e.target.value)} style={{
                padding: "8px 12px", fontSize: 12, border: `1px solid ${C.border}`,
                borderRadius: 7, background: C.surface, color: C.navy, cursor: "pointer",
              }}>
                <option value="All">All Billing Methods</option>
                {BILLING_METHODS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <span style={{ fontSize: 12, color: C.slate, marginLeft: 4 }}>{filtered.length} of {PROJECTS.length} shown</span>
            </div>

            {/* ── Data Table ── */}
            <div style={{
              background: C.surface, borderRadius: 10, overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: `1px solid ${C.border}`,
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1300 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {COLS.map(c => (
                        <SortHeader key={c.key} label={c.label} field={c.key} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align={c.align} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, idx) => (
                      <tr key={p.projectNumber} style={{
                        background: idx % 2 === 0 ? "#fff" : "#FAFBFD",
                        transition: "background .15s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F0F5FF"}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#FAFBFD"}
                      >
                        {COLS.map(c => {
                          if (c.key === "utilizationPct") return (
                            <td key={c.key} style={{ padding: "8px 10px" }}><UtilBar pct={p.utilizationPct} /></td>
                          );
                          if (c.key === "status") return (
                            <td key={c.key} style={{ padding: "8px 10px", textAlign: "center" }}><StatusPill status={p.status} /></td>
                          );
                          const val = p[c.key];
                          const display = c.fmt ? c.fmt(val) : val;
                          const isNeg = typeof val === "number" && val < 0;
                          return (
                            <td key={c.key} style={{
                              padding: "8px 10px", fontSize: 12, textAlign: c.align || "left",
                              color: isNeg ? C.red : C.navy, whiteSpace: "nowrap",
                              fontVariantNumeric: "tabular-nums",
                            }}>{display}</td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr style={{ background: "#F0F4F8", fontWeight: 700 }}>
                      <td style={{ padding: "10px 10px", fontSize: 12 }} colSpan={3}>TOTAL ({filtered.length} projects)</td>
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
                          padding: "10px 10px", fontSize: 12, textAlign: "right",
                          color: v < 0 ? C.red : C.navy, fontVariantNumeric: "tabular-nums",
                        }}>{i === 6 ? fmtNum(v) : fmtCurrency(v)}</td>
                      ))}
                      <td style={{ padding: "10px 10px", fontSize: 12, textAlign: "center" }}>
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

        {activeTab === "charts" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Status Distribution */}
            <div style={{ background: C.surface, borderRadius: 10, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 16 }}>Contract Status Distribution</div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                    innerRadius={50} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`}
                    style={{ fontSize: 11 }}>
                    {statusCounts.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top 10 by Contract Value */}
            <div style={{ background: C.surface, borderRadius: 10, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 16 }}>Top 10 Projects by Contract Value</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={top10} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <XAxis type="number" tickFormatter={v => `$${(v / 1e6).toFixed(1)}M`} style={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={140} style={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => fmtCurrency(v)} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="invoiced" stackId="a" fill={C.accent} name="Invoiced" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="remaining" stackId="a" fill="#CBD5E1" name="Remaining" radius={[0, 3, 3, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Billing Method Breakdown */}
            <div style={{ background: C.surface, borderRadius: 10, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: `1px solid ${C.border}`, gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 16 }}>Contract Value by Billing Method</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={BILLING_METHODS.map(bm => {
                  const projs = PROJECTS.filter(p => p.billingMethod === bm);
                  return {
                    name: bm,
                    count: projs.length,
                    contract: projs.reduce((s, p) => s + p.revisedContract, 0),
                    invoiced: projs.reduce((s, p) => s + p.amountInvoiced, 0),
                  };
                })} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" style={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `$${(v / 1e6).toFixed(1)}M`} style={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => fmtCurrency(v)} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="contract" fill={C.navyLight} name="Current Contract" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="invoiced" fill={C.green} name="Amount Invoiced" radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 24, padding: "12px 0", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 11, color: C.slate }}>
          <span>Data entities: DimProject · FactRevenueBudget · FactInvoiceLine · FactProForma · FactFASTActivity · ContractOverride</span>
          <span>React Dashboard · Powered by sample data</span>
        </div>
      </div>
    </div>
  );
}
