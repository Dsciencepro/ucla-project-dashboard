import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar, RadialBarChart, RadialBar,
  ScatterChart, Scatter, ZAxis, LineChart, Line,
} from "recharts";

// ─── Seeded Random ──────────────────────────────────────────────────────────
function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

// ─── Sample Data ────────────────────────────────────────────────────────────
const rand = seededRandom(42);
const BILLING = ["T&M", "Lump Sum", "Cost Plus", "Unit Price"];
const PMS = ["Maya Chen", "James Rivera", "Sarah Kim", "David Okafor", "Lisa Patel"];
const PHASES = ["Design", "Construction", "Closeout", "Pre-Construction", "Commissioning"];

const PROJECTS = [
  "Health Ambulatory Care Expansion", "Powell Library Seismic Modernization",
  "Dykstra Hall MEP Renewal", "South Campus Utility Upgrade",
  "EV Charging Infrastructure", "Luskin Center Renovation",
  "Engineering VI HVAC Upgrade", "Pauley Pavilion AV Systems",
  "Broad Art Center Exterior", "Life Sciences Phase II",
  "Geffen Playhouse Lighting", "Anderson School Suite 300",
  "Court of Sciences Landscape", "Royce Hall Seismic Retrofit",
  "Ackerman Union Food Court", "Drake Stadium Turf Replace",
  "Haines Hall ADA Compliance", "Boelter Hall Lab Modernize",
  "Kaufman Hall Acoustics", "Murphy Hall IT Infrastructure",
  "Sproul Landing Commons", "Saxon Suites Renovation",
  "Molecular Sciences Bldg", "Mira Hershey Hall Plumbing",
].map((name, i) => {
  const id = `UCLA-${2400 + i}`;
  const revisedBudget = Math.round((800000 + rand() * 2500000) / 1000) * 1000;
  const originalBudget = Math.round(revisedBudget * (0.85 + rand() * 0.1));
  const changeOrders = revisedBudget - originalBudget;
  const utilPct = 35 + rand() * 62;
  const actual = Math.round(revisedBudget * (utilPct / 100));
  const committed = Math.round(revisedBudget * (0.02 + rand() * 0.08));
  const remaining = revisedBudget - actual - committed;
  const allocatedHours = Math.round(5000 + rand() * 20000);
  const loggedHours = Math.round(allocatedHours * (0.4 + rand() * 0.5));
  const scheduledHours = Math.round(allocatedHours * (0.05 + rand() * 0.1));
  const laborUtil = ((loggedHours + scheduledHours) / allocatedHours) * 100;
  const billing = BILLING[i % 4];
  const pm = PMS[i % 5];
  const phase = PHASES[i % 5];
  const startDate = `2025-${String(1 + (i % 12)).padStart(2, "0")}-15`;
  const endDate = `2027-${String(1 + ((i + 6) % 12)).padStart(2, "0")}-30`;
  let status;
  if (utilPct > 90) status = "Needs attention";
  else if (utilPct > 70) status = "On track";
  else status = "Under budget";

  // Monthly spend for each project
  const monthly = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"].map((m, mi) => {
    const base = actual / 8;
    return { month: m, spend: Math.round(base * (0.6 + rand() * 0.8)) };
  });

  return {
    id, name, revisedBudget, originalBudget, changeOrders, actual, committed,
    remaining, utilPct, status, allocatedHours, loggedHours, scheduledHours,
    laborUtil, billing, pm, phase, startDate, endDate, monthly,
  };
});

const TASK_CODES = [
  { code: "01-100", name: "Program Management", allocated: 12400, logged: 9620, scheduled: 680 },
  { code: "02-210", name: "Design Coordination", allocated: 18200, logged: 12920, scheduled: 1320 },
  { code: "03-310", name: "Field Observation", allocated: 22000, logged: 16880, scheduled: 2640 },
  { code: "04-410", name: "Construction Administration", allocated: 16500, logged: 9440, scheduled: 2100 },
  { code: "05-510", name: "Closeout & Commissioning", allocated: 9200, logged: 3260, scheduled: 980 },
  { code: "06-600", name: "Inspections & Testing", allocated: 14800, logged: 11200, scheduled: 1400 },
  { code: "07-700", name: "Environmental Compliance", allocated: 7600, logged: 4100, scheduled: 900 },
  { code: "08-800", name: "Safety & Risk Management", allocated: 11000, logged: 7800, scheduled: 1100 },
];

const MONTHS_DATA = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"].map((m, i) => ({
  month: m,
  actual: Math.round(300000 + i * 95000 + (rand() - 0.5) * 120000),
  plan: Math.round(350000 + i * 85000),
  forecast: Math.round(320000 + i * 100000),
}));

// ─── Formatters ─────────────────────────────────────────────────────────────
const fmt = (v) => {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
};
const fmtPct = (v) => `${v.toFixed(1)}%`;
const fmtHrs = (v) => `${v.toLocaleString()} h`;

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  sidebar: "#0C2340", sidebarActive: "#1E4D7B", gold: "#FFD100",
  bg: "#F4F6F9", surface: "#FFFFFF", navy: "#0C2340",
  text: "#1A1A2E", textMid: "#4A5568", textLight: "#8896A6",
  border: "#E8ECF1", borderLight: "#F0F2F5",
  teal: "#0077B6", tealLight: "#00B4D8", green: "#10B981",
  greenBg: "#ECFDF5", amber: "#F59E0B", amberBg: "#FFF8E1",
  red: "#EF4444", redBg: "#FFF0F0", purple: "#8B5CF6", purpleBg: "#F5F3FF",
  blue: "#3B82F6",
};
const statusColors = {
  "On track": { dot: C.green, bg: C.greenBg, text: "#047857" },
  "Under budget": { dot: C.teal, bg: "#E0F7FA", text: "#006064" },
  "Needs attention": { dot: C.amber, bg: C.amberBg, text: "#92400E" },
};
const CHART_COLORS = [C.teal, C.green, C.amber, C.purple, C.blue, C.red, "#E91E63", "#00BCD4"];

// ─── Shared Components ──────────────────────────────────────────────────────
function NavItem({ icon, label, active, badge, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 18px",
      borderRadius: 8, cursor: "pointer", marginBottom: 2,
      background: active ? C.sidebarActive : "transparent",
      color: active ? "#fff" : "rgba(255,255,255,0.6)",
      fontWeight: active ? 600 : 400, fontSize: 13, transition: "all .15s",
    }}>
      <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={{
        background: C.gold, color: C.navy, fontSize: 10, fontWeight: 700,
        padding: "2px 7px", borderRadius: 10,
      }}>{badge}</span>}
    </div>
  );
}

function MiniBar({ pct, color }) {
  return (
    <div style={{ height: 4, background: "#E8ECF1", borderRadius: 2, marginTop: 10 }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 2, background: color || C.teal }} />
    </div>
  );
}

function KpiCard({ label, value, sub, detail, barPct, barColor, icon }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 10, padding: "20px 22px", flex: "1 1 0",
      border: `1px solid ${C.border}`, minWidth: 180,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.textLight }}>{label}</div>
        <span style={{ fontSize: 14, color: C.textLight }}>{icon}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: C.navy, letterSpacing: -1 }}>{value}</span>
        {sub && <span style={{ fontSize: 11, color: C.textLight }}>{sub}</span>}
      </div>
      {detail && <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginTop: 5 }}>{detail}</div>}
      {barPct != null && <MiniBar pct={barPct} color={barColor} />}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.navy, padding: "10px 14px", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
          <span style={{ width: 8, height: 3, borderRadius: 1, background: p.color, display: "inline-block" }} />
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, subtitle, rightContent, children, style: sx }) {
  return (
    <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", ...sx }}>
      <div style={{
        padding: "18px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: `1px solid ${C.borderLight}`,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: C.textLight }}>{subtitle}</div>}
        </div>
        {rightContent}
      </div>
      {children}
    </div>
  );
}

function TogglePills({ options, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, background: C.bg, borderRadius: 6, padding: 3 }}>
      {options.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          padding: "5px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
          borderRadius: 4, background: active === t ? C.surface : "transparent",
          color: active === t ? C.text : C.textLight,
          boxShadow: active === t ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
        }}>{t}</button>
      ))}
    </div>
  );
}

function StatusPill({ status }) {
  const sc = statusColors[status] || statusColors["On track"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600,
      color: sc.text, background: sc.bg, padding: "3px 10px", borderRadius: 10,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot }} />
      {status}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════
function OverviewPage({ user }) {
  const totalBudget = PROJECTS.reduce((s, p) => s + p.revisedBudget, 0);
  const totalActual = PROJECTS.reduce((s, p) => s + p.actual, 0);
  const totalCommitted = PROJECTS.reduce((s, p) => s + p.committed, 0);
  const totalRemaining = PROJECTS.reduce((s, p) => s + p.remaining, 0);
  const totalAllocHrs = PROJECTS.reduce((s, p) => s + p.allocatedHours, 0);
  const totalLoggedHrs = PROJECTS.reduce((s, p) => s + p.loggedHours, 0);
  const totalSchedHrs = PROJECTS.reduce((s, p) => s + p.scheduledHours, 0);
  const laborUtil = (totalLoggedHrs + totalSchedHrs) / totalAllocHrs * 100;
  const needsAttention = PROJECTS.filter(p => p.status === "Needs attention");
  const [search, setSearch] = useState("");
  const filtered = search ? PROJECTS.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : PROJECTS;
  const augActual = MONTHS_DATA[7].actual;
  const variance = augActual - MONTHS_DATA[7].plan;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: C.teal, marginBottom: 6 }}>Portfolio Overview</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>{greeting}, {user?.name?.split(" ")[0] || "there"}</div>
          <div style={{ fontSize: 13, color: C.textLight, marginTop: 4 }}>Here's where UCLA's active capital projects stand today.</div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={{ padding: "9px 18px", fontSize: 12, fontWeight: 600, background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 7, cursor: "pointer" }}>↓ Export</button>
          <button style={{ padding: "9px 18px", fontSize: 12, fontWeight: 600, background: C.teal, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,119,182,0.3)" }}>⟳ Refresh data</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 22, background: C.surface, padding: "12px 18px", borderRadius: 10, border: `1px solid ${C.border}`, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textLight }}>⌕</span>
          <input type="text" placeholder="Search project or PM" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 32px", fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: "none", color: C.text, background: "#FAFBFC" }} />
        </div>
        <span style={{ fontSize: 12, color: C.textLight }}>PERIOD <strong style={{ color: C.text }}>Through August 2026</strong></span>
        <button style={{ fontSize: 12, color: C.teal, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Clear filters</button>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 22 }}>
        <KpiCard label="Revised Budget" value={fmt(totalBudget)} sub={`${PROJECTS.length} projects`} detail="+2.4% from changes" barPct={100} barColor={C.teal} icon="ℹ" />
        <KpiCard label="Actual + Committed" value={fmt(totalActual + totalCommitted)} sub={fmt(totalActual) + " actual"} detail={fmtPct((totalActual + totalCommitted) / totalBudget * 100) + " of budget"} barPct={(totalActual + totalCommitted) / totalBudget * 100} barColor={C.teal} icon="📊" />
        <KpiCard label="Remaining Budget" value={fmt(totalRemaining)} sub="available" detail={fmt(totalCommitted) + " committed"} barPct={totalRemaining / totalBudget * 100} barColor={C.green} icon="◉" />
        <KpiCard label="Labor Utilization" value={fmtPct(laborUtil)} sub="logged + scheduled" detail={`${(totalLoggedHrs/1e3).toFixed(1)}K of ${(totalAllocHrs/1e3).toFixed(1)}K hrs`} barPct={laborUtil} barColor={C.teal} icon="⊙" />
      </div>

      {needsAttention.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", background: C.amberBg, borderRadius: 8, marginBottom: 22, border: "1px solid #FFE082" }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <div style={{ flex: 1, fontSize: 13, color: "#5D4037" }}>
            <strong>{needsAttention.length} items need attention.</strong> {needsAttention[0].name} is {fmtPct(needsAttention[0].utilPct)} utilized — {fmt(needsAttention[0].remaining)} remains.
          </div>
          <span style={{ fontSize: 12, color: C.teal, fontWeight: 600, cursor: "pointer" }}>Review projects →</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 22 }}>
        <SectionCard title="Budget performance" subtitle="Actual costs against revised budget">
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {filtered.slice(0, 8).map(p => {
              const sc = statusColors[p.status];
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${C.borderLight}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ flex: "0 0 260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid }}>{p.id}</span>
                      <StatusPill status={p.status} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid, minWidth: 65 }}>{fmtPct(p.utilPct)} used</span>
                    <div style={{ flex: 1, height: 6, background: "#E8ECF1", borderRadius: 3 }}>
                      <div style={{ width: `${Math.min(p.utilPct, 100)}%`, height: "100%", borderRadius: 3, background: p.utilPct > 90 ? C.amber : C.teal }} />
                    </div>
                    <span style={{ fontSize: 11, color: C.textLight, minWidth: 55 }}>of {fmt(p.revisedBudget)}</span>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 70 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{fmt(p.remaining)}</div>
                    <div style={{ fontSize: 10, color: C.textLight }}>remaining</div>
                  </div>
                  <span style={{ color: C.textLight }}>›</span>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Monthly cost trend" subtitle="Actual costs vs spending plan">
          <div style={{ padding: "14px 18px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MONTHS_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs><linearGradient id="gT" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.teal} stopOpacity={0.2}/><stop offset="100%" stopColor={C.teal} stopOpacity={0.02}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight}/><XAxis dataKey="month" style={{fontSize:10}} axisLine={false} tickLine={false}/><YAxis tickFormatter={v=>`$${(v/1e3).toFixed(0)}K`} style={{fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Area type="monotone" dataKey="plan" stroke={C.textLight} strokeWidth={1.5} fill="none" name="Plan" strokeDasharray="6 3"/>
                <Area type="monotone" dataKey="actual" stroke={C.teal} strokeWidth={2.5} fill="url(#gT)" name="Actual" dot={{r:4,fill:C.teal,stroke:"#fff",strokeWidth:2}}/>
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 12, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.borderLight}` }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.textLight }}>August Actual</div><div style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginTop: 4 }}>{fmt(augActual)}</div></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.textLight }}>Variance</div><div style={{ fontSize: 22, fontWeight: 800, color: variance > 0 ? C.red : C.green, marginTop: 4 }}>{variance > 0 ? "+" : "−"}{fmt(Math.abs(variance))}</div></div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Task code utilization" subtitle="Logged hours plus scheduled hours against allocated">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#FAFBFC" }}>{["Task Code","","Allocated","Logged","Scheduled","Labor Utilization","Budget Used"].map((h,i)=>(
            <th key={i} style={{ padding: "10px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: C.textLight, textAlign: i>1?"right":"left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
          ))}</tr></thead>
          <tbody>{TASK_CODES.slice(0,5).map(tc => {
            const util = (tc.logged+tc.scheduled)/tc.allocated*100; const bu = tc.logged/tc.allocated*100;
            return (<tr key={tc.code} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
              <td style={{ padding: "12px 16px" }}><span style={{ padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: C.teal, color: "#fff" }}>{tc.code}</span></td>
              <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: C.text }}>{tc.name}</td>
              <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMid, textAlign: "right" }}>{fmtHrs(tc.allocated)}</td>
              <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMid, textAlign: "right" }}>{fmtHrs(tc.logged)}</td>
              <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMid, textAlign: "right" }}>{fmtHrs(tc.scheduled)}</td>
              <td style={{ padding: "12px 16px", textAlign: "right" }}><div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                <div style={{ width: 80, height: 5, background: "#E8ECF1", borderRadius: 3 }}><div style={{ width: `${Math.min(util,100)}%`, height: "100%", borderRadius: 3, background: util > 85 ? C.amber : C.teal }}/></div>
                <span style={{ fontSize: 12, fontWeight: 700, color: util > 85 ? C.amber : C.teal, minWidth: 42 }}>{fmtPct(util)}</span>
              </div></td>
              <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, textAlign: "right", color: bu > 80 ? C.amber : C.textMid }}>{fmtPct(bu)}</td>
            </tr>);
          })}</tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: PROJECTS
// ══════════════════════════════════════════════════════════════════════════════
function ProjectsPage() {
  const [sortKey, setSortKey] = useState("utilPct");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedId, setSelectedId] = useState(null);

  const sorted = useMemo(() => {
    return [...PROJECTS].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [sortKey, sortDir]);

  const selected = selectedId ? PROJECTS.find(p => p.id === selectedId) : null;
  const handleSort = (k) => { if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("desc"); } };

  // Aggregates for charts
  const byStatus = Object.entries(statusColors).map(([name]) => ({ name, value: PROJECTS.filter(p => p.status === name).length }));
  const byPhase = PHASES.map(ph => ({ name: ph, count: PROJECTS.filter(p => p.phase === ph).length, budget: PROJECTS.filter(p => p.phase === ph).reduce((s, p) => s + p.revisedBudget, 0) }));
  const byPM = PMS.map(pm => ({ name: pm.split(" ")[0], projects: PROJECTS.filter(p => p.pm === pm).length, budget: PROJECTS.filter(p => p.pm === pm).reduce((s, p) => s + p.revisedBudget, 0), actual: PROJECTS.filter(p => p.pm === pm).reduce((s, p) => s + p.actual, 0) }));

  const cols = [
    { key: "id", label: "ID", w: 90 }, { key: "name", label: "Project Name", w: 200 },
    { key: "pm", label: "PM", w: 100 }, { key: "phase", label: "Phase", w: 100 },
    { key: "billing", label: "Billing", w: 80 }, { key: "revisedBudget", label: "Budget", w: 90, fmt: fmt },
    { key: "actual", label: "Actual", w: 85, fmt: fmt }, { key: "remaining", label: "Remaining", w: 85, fmt: fmt },
    { key: "utilPct", label: "Utilization", w: 100 }, { key: "status", label: "Status", w: 110 },
  ];

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: C.teal, marginBottom: 6 }}>Project Portfolio</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 20 }}>All Projects ({PROJECTS.length})</div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 22 }}>
        <SectionCard title="By Status" subtitle="Project distribution">
          <div style={{ padding: 14 }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart margin={{top:15,bottom:5}}>
                <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={65} innerRadius={35} paddingAngle={4} cornerRadius={3}
                  labelLine={false}
                  label={({cx,cy,midAngle,innerRadius,outerRadius,percent})=> {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return percent > 0.06 ? <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{fontSize:10,fontWeight:800}}>{`${(percent*100).toFixed(0)}%`}</text> : null;
                  }}>
                  {byStatus.map((e,i) => <Cell key={i} fill={statusColors[e.name]?.dot || C.teal} stroke="none"/>)}
                </Pie>
                <Legend wrapperStyle={{fontSize:10}} iconType="plainline" iconSize={12}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="By Phase" subtitle="Budget allocation per phase">
          <div style={{ padding: 14 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byPhase} margin={{top:5,right:10,left:-10,bottom:40}}>
                <XAxis dataKey="name" style={{fontSize:9}} axisLine={false} tickLine={false} angle={-25} textAnchor="end" interval={0} height={50}/>
                <YAxis tickFormatter={v=>`$${(v/1e6).toFixed(1)}M`} style={{fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="budget" fill={C.teal} radius={[4,4,0,0]} barSize={28} name="Budget"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="By Project Manager" subtitle="Actual spend by PM">
          <div style={{ padding: 14 }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byPM} layout="vertical" margin={{top:5,right:20,left:0,bottom:0}}>
                <XAxis type="number" tickFormatter={v=>`$${(v/1e6).toFixed(1)}M`} style={{fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" style={{fontSize:10}} axisLine={false} tickLine={false} width={55}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="actual" fill={C.green} radius={[0,4,4,0]} barSize={16} name="Actual Spend"/>
                <Bar dataKey="budget" fill="#E2E8F0" radius={[0,4,4,0]} barSize={16} name="Budget"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Detail Table */}
      <SectionCard title="Project Details" subtitle="Click any row for monthly spend breakdown">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
            <thead><tr style={{ background: "#FAFBFC" }}>
              {cols.map(c => (
                <th key={c.key} onClick={() => handleSort(c.key)} style={{
                  padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                  color: sortKey === c.key ? C.teal : C.textLight, cursor: "pointer",
                  textAlign: c.fmt ? "right" : "left", borderBottom: `2px solid ${sortKey === c.key ? C.teal : "transparent"}`,
                }}>{c.label} {sortKey === c.key ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
              ))}
            </tr></thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id} onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                  style={{ borderBottom: `1px solid ${C.borderLight}`, cursor: "pointer", background: selectedId === p.id ? "#F0F7FF" : "transparent" }}
                  onMouseEnter={e => { if (selectedId !== p.id) e.currentTarget.style.background = "#FAFBFC"; }}
                  onMouseLeave={e => { if (selectedId !== p.id) e.currentTarget.style.background = "transparent"; }}>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: C.teal }}>{p.id}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: C.text }}>{p.name}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: C.textMid }}>{p.pm}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: C.textMid }}>{p.phase}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: C.textMid }}>{p.billing}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: C.navy, textAlign: "right" }}>{fmt(p.revisedBudget)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: C.textMid, textAlign: "right" }}>{fmt(p.actual)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: p.remaining < 100000 ? C.amber : C.navy, textAlign: "right" }}>{fmt(p.remaining)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 5, background: "#E8ECF1", borderRadius: 3 }}>
                        <div style={{ width: `${Math.min(p.utilPct, 100)}%`, height: "100%", borderRadius: 3, background: p.utilPct > 90 ? C.amber : C.teal }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: p.utilPct > 90 ? C.amber : C.teal, minWidth: 36 }}>{fmtPct(p.utilPct)}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px" }}><StatusPill status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Expanded Project Detail */}
        {selected && (
          <div style={{ padding: "20px 22px", borderTop: `2px solid ${C.teal}`, background: "#F8FBFF" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14 }}>
              {selected.id} · {selected.name} — Monthly Spend Breakdown
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={selected.monthly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="month" style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${(v/1e3).toFixed(0)}K`} style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="spend" fill={C.teal} radius={[4, 4, 0, 0]} barSize={24} name="Monthly Spend" />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Original Budget", val: fmt(selected.originalBudget) },
                  { label: "Change Orders", val: fmt(selected.changeOrders) },
                  { label: "PM", val: selected.pm },
                  { label: "Phase", val: selected.phase },
                  { label: "Start", val: selected.startDate },
                  { label: "End", val: selected.endDate },
                ].map((d, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: C.textLight }}>{d.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginTop: 4 }}>{d.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: TASK CODES
// ══════════════════════════════════════════════════════════════════════════════
function TaskCodesPage() {
  const totalAlloc = TASK_CODES.reduce((s, t) => s + t.allocated, 0);
  const totalLogged = TASK_CODES.reduce((s, t) => s + t.logged, 0);
  const totalSched = TASK_CODES.reduce((s, t) => s + t.scheduled, 0);
  const overallUtil = (totalLogged + totalSched) / totalAlloc * 100;

  const pieData = TASK_CODES.map(tc => ({ name: tc.code + " " + tc.name.split(" ")[0], value: tc.logged }));
  const monthlyByCode = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"].map((m, mi) => {
    const row = { month: m };
    TASK_CODES.forEach((tc, ti) => { row[tc.code] = Math.round(tc.logged / 8 * (0.7 + seededRandom(mi * 10 + ti)() * 0.6)); });
    return row;
  });

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: C.teal, marginBottom: 6 }}>Resource Management</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 20 }}>Task Code Analysis</div>

      <div style={{ display: "flex", gap: 16, marginBottom: 22 }}>
        <KpiCard label="Total Allocated" value={fmtHrs(totalAlloc)} icon="📋" barPct={100} barColor={C.teal} />
        <KpiCard label="Hours Logged" value={fmtHrs(totalLogged)} icon="⏱" detail={fmtPct(totalLogged/totalAlloc*100)+" of allocated"} barPct={totalLogged/totalAlloc*100} barColor={C.green} />
        <KpiCard label="Scheduled" value={fmtHrs(totalSched)} icon="📅" barPct={totalSched/totalAlloc*100} barColor={C.amber} />
        <KpiCard label="Overall Utilization" value={fmtPct(overallUtil)} icon="⊙" barPct={overallUtil} barColor={overallUtil > 80 ? C.amber : C.teal} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 22 }}>
        <SectionCard title="Hours Distribution" subtitle="Logged hours by task code">
          <div style={{ padding: 16 }}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart margin={{top:10,bottom:5}}>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80} innerRadius={42} paddingAngle={3} cornerRadius={3}
                  labelLine={false}
                  label={({cx,cy,midAngle,innerRadius,outerRadius,percent})=> {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return percent > 0.08 ? <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{fontSize:9,fontWeight:800}}>{`${(percent*100).toFixed(0)}%`}</text> : null;
                  }}>
                {pieData.map((e,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none"/>)}
              </Pie><Legend wrapperStyle={{fontSize:9}} iconType="plainline" iconSize={12}/></PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Monthly Hours Trend" subtitle="Logged hours by month per task code">
          <div style={{ padding: 16 }}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyByCode} margin={{top:5,right:10,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight}/>
                <XAxis dataKey="month" style={{fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${(v/1e3).toFixed(1)}K`} style={{fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                {TASK_CODES.slice(0,5).map((tc,i)=>(
                  <Area key={tc.code} type="monotone" dataKey={tc.code} stroke={CHART_COLORS[i]} strokeWidth={2} fill={CHART_COLORS[i]} fillOpacity={0.08} name={tc.code} dot={{r:3,fill:CHART_COLORS[i],stroke:"#fff",strokeWidth:1.5}}/>
                ))}
                <Legend wrapperStyle={{fontSize:9}} iconType="plainline" iconSize={12}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Detailed Breakdown" subtitle="All task codes with utilization metrics">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#FAFBFC" }}>{["Code","Task Name","Allocated","Logged","Scheduled","Remaining","Utilization","Budget Used"].map((h,i)=>(
            <th key={i} style={{ padding: "10px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: C.textLight, textAlign: i>1?"right":"left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
          ))}</tr></thead>
          <tbody>{TASK_CODES.map(tc => {
            const util = (tc.logged+tc.scheduled)/tc.allocated*100;
            const remaining = tc.allocated - tc.logged - tc.scheduled;
            return (<tr key={tc.code} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
              <td style={{ padding: "12px 16px" }}><span style={{ padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: C.teal, color: "#fff" }}>{tc.code}</span></td>
              <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{tc.name}</td>
              <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMid, textAlign: "right" }}>{fmtHrs(tc.allocated)}</td>
              <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMid, textAlign: "right" }}>{fmtHrs(tc.logged)}</td>
              <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMid, textAlign: "right" }}>{fmtHrs(tc.scheduled)}</td>
              <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: remaining < 1000 ? C.red : C.textMid, textAlign: "right" }}>{fmtHrs(remaining)}</td>
              <td style={{ padding: "12px 16px", textAlign: "right" }}><div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                <div style={{ width: 80, height: 5, background: "#E8ECF1", borderRadius: 3 }}><div style={{ width: `${Math.min(util,100)}%`, height: "100%", borderRadius: 3, background: util>85?C.amber:C.teal }}/></div>
                <span style={{ fontSize: 12, fontWeight: 700, color: util>85?C.amber:C.teal }}>{fmtPct(util)}</span>
              </div></td>
              <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, textAlign: "right", color: tc.logged/tc.allocated*100>80?C.amber:C.textMid }}>{fmtPct(tc.logged/tc.allocated*100)}</td>
            </tr>);
          })}</tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: FORECAST
// ══════════════════════════════════════════════════════════════════════════════
function ForecastPage() {
  const totalBudget = PROJECTS.reduce((s, p) => s + p.revisedBudget, 0);
  const totalActual = PROJECTS.reduce((s, p) => s + p.actual, 0);
  const burnRate = totalActual / 8; // per month
  const monthsRemaining = (totalBudget - totalActual) / burnRate;
  const projectedTotal = totalActual + burnRate * 12;
  const projectedVariance = projectedTotal - totalBudget;

  // Cumulative spend
  let cumActual = 0, cumPlan = 0;
  const cumulative = MONTHS_DATA.map(m => {
    cumActual += m.actual; cumPlan += m.plan;
    return { month: m.month, actual: cumActual, plan: cumPlan, forecast: cumActual + burnRate * 0.98 };
  });
  // Add forecast months
  const forecastMonths = ["Sep","Oct","Nov","Dec"];
  forecastMonths.forEach((m, i) => {
    cumPlan += MONTHS_DATA[7].plan; cumActual += Math.round(burnRate * (0.9 + seededRandom(i+50)() * 0.2));
    cumulative.push({ month: m, plan: cumPlan, forecast: cumActual });
  });

  // Risk scatter
  const scatter = PROJECTS.map(p => ({
    name: p.name.length > 20 ? p.name.slice(0,18)+"…" : p.name,
    x: p.utilPct, y: p.revisedBudget, z: p.remaining, status: p.status,
  }));

  // Quarterly summary
  const quarters = [
    { q: "Q1 2026", actual: MONTHS_DATA.slice(0,3).reduce((s,m)=>s+m.actual,0), plan: MONTHS_DATA.slice(0,3).reduce((s,m)=>s+m.plan,0) },
    { q: "Q2 2026", actual: MONTHS_DATA.slice(3,6).reduce((s,m)=>s+m.actual,0), plan: MONTHS_DATA.slice(3,6).reduce((s,m)=>s+m.plan,0) },
    { q: "Q3 2026", actual: MONTHS_DATA.slice(6,8).reduce((s,m)=>s+m.actual,0), plan: MONTHS_DATA.slice(6,8).reduce((s,m)=>s+m.plan,0) },
  ];

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: C.teal, marginBottom: 6 }}>Financial Planning</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 20 }}>Budget Forecast & Analysis</div>

      <div style={{ display: "flex", gap: 16, marginBottom: 22 }}>
        <KpiCard label="Current Burn Rate" value={fmt(burnRate)} sub="/month" icon="🔥"
          detail={`${monthsRemaining.toFixed(1)} months of runway`} barPct={Math.min(burnRate/totalBudget*100*12, 100)} barColor={C.amber} />
        <KpiCard label="Projected Year-End" value={fmt(projectedTotal)} icon="📈"
          detail={projectedVariance > 0 ? `${fmt(projectedVariance)} over budget` : `${fmt(Math.abs(projectedVariance))} under budget`}
          barPct={projectedTotal/totalBudget*100} barColor={projectedVariance > 0 ? C.red : C.green} />
        <KpiCard label="Budget Remaining" value={fmt(totalBudget - totalActual)} icon="💰"
          detail={fmtPct((totalBudget-totalActual)/totalBudget*100) + " of total"} barPct={(totalBudget-totalActual)/totalBudget*100} barColor={C.green} />
        <KpiCard label="Forecast Accuracy" value="94.2%" icon="🎯"
          detail="Based on 8-month rolling avg" barPct={94.2} barColor={C.teal} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 22 }}>
        <SectionCard title="Cumulative Spend vs Plan" subtitle="Actual to date + projected forecast through December">
          <div style={{ padding: 16 }}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={cumulative} margin={{top:5,right:10,left:-10,bottom:0}}>
                <defs>
                  <linearGradient id="gCum" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.teal} stopOpacity={0.15}/><stop offset="100%" stopColor={C.teal} stopOpacity={0.02}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight}/>
                <XAxis dataKey="month" style={{fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`$${(v/1e6).toFixed(1)}M`} style={{fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Area type="monotone" dataKey="plan" stroke={C.textLight} strokeWidth={1.5} fill="none" name="Plan" strokeDasharray="6 3"/>
                <Area type="monotone" dataKey="actual" stroke={C.teal} strokeWidth={2.5} fill="url(#gCum)" name="Actual" dot={{r:3,fill:C.teal,stroke:"#fff",strokeWidth:2}}/>
                <Area type="monotone" dataKey="forecast" stroke={C.amber} strokeWidth={2} fill="none" name="Forecast" strokeDasharray="4 4"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Project Risk Map" subtitle="Utilization % vs budget size — larger = more remaining">
          <div style={{ padding: 16 }}>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{top:10,right:10,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight}/>
                <XAxis type="number" dataKey="x" name="Utilization %" domain={[30,105]} tickFormatter={v=>`${v}%`} style={{fontSize:10}} axisLine={false}/>
                <YAxis type="number" dataKey="y" name="Budget" tickFormatter={v=>`$${(v/1e6).toFixed(1)}M`} style={{fontSize:10}} axisLine={false}/>
                <ZAxis type="number" dataKey="z" range={[40,300]}/>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div style={{background:C.navy,padding:"10px 14px",borderRadius:8,boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{d.name}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:4}}>Utilization: {fmtPct(d.x)}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>Budget: {fmt(d.y)}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>Remaining: {fmt(d.z)}</div>
                  </div>;
                }}/>
                <Scatter data={scatter} fill={C.teal}>
                  {scatter.map((s,i)=><Cell key={i} fill={statusColors[s.status]?.dot || C.teal} fillOpacity={0.7}/>)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Quarterly Performance" subtitle="Actual vs planned spend by quarter">
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {quarters.map(q => {
              const v = q.actual - q.plan;
              const pct = q.plan > 0 ? (q.actual / q.plan * 100) : 0;
              return (
                <div key={q.q} style={{ padding: "18px 20px", background: "#FAFBFC", borderRadius: 10, border: `1px solid ${C.borderLight}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.5 }}>{q.q}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
                    <div><div style={{ fontSize: 9, color: C.textLight }}>Actual</div><div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{fmt(q.actual)}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: 9, color: C.textLight }}>Plan</div><div style={{ fontSize: 20, fontWeight: 800, color: C.textMid }}>{fmt(q.plan)}</div></div>
                  </div>
                  <MiniBar pct={pct} color={pct > 100 ? C.red : C.teal} />
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: v > 0 ? C.red : C.green }}>
                    {v > 0 ? "+" : "−"}{fmt(Math.abs(v))} variance ({fmtPct(Math.abs(v)/q.plan*100)})
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: DATA HEALTH
// ══════════════════════════════════════════════════════════════════════════════
function DataHealthPage() {
  const r = seededRandom(777);

  // Data completeness per field
  const fields = [
    { field: "Project Name", table: "DimProject", complete: 24, total: 24 },
    { field: "Revised Budget", table: "FactRevenueBudget", complete: 24, total: 24 },
    { field: "Actual Spend", table: "FactInvoiceLine", complete: 23, total: 24 },
    { field: "Change Orders", table: "FactRevenueBudget", complete: 22, total: 24 },
    { field: "PM Assignment", table: "DimProject", complete: 21, total: 24 },
    { field: "Phase", table: "DimProject", complete: 24, total: 24 },
    { field: "Billing Method", table: "ContractOverride", complete: 20, total: 24 },
    { field: "FAST Hours", table: "FactFASTActivity", complete: 18, total: 24 },
    { field: "Pro Forma Draft", table: "FactProForma", complete: 16, total: 24 },
    { field: "Start/End Dates", table: "DimProject", complete: 22, total: 24 },
    { field: "Task Code Mapping", table: "FactFASTActivity", complete: 19, total: 24 },
    { field: "Invoice Line Items", table: "FactInvoiceLine", complete: 23, total: 24 },
  ];

  const overallComplete = fields.reduce((s, f) => s + f.complete, 0);
  const overallTotal = fields.reduce((s, f) => s + f.total, 0);
  const overallPct = (overallComplete / overallTotal * 100);

  // Data freshness
  const sources = [
    { name: "SAP Financial Module", lastSync: "2 hours ago", status: "healthy", records: "148,203", latency: "1.2s" },
    { name: "FAST Timekeeping", lastSync: "4 hours ago", status: "healthy", records: "52,841", latency: "0.8s" },
    { name: "Contract Management DB", lastSync: "6 hours ago", status: "healthy", records: "3,412", latency: "2.1s" },
    { name: "Pro Forma Staging", lastSync: "1 day ago", status: "warning", records: "892", latency: "4.5s" },
    { name: "HR/PM Assignments", lastSync: "3 days ago", status: "stale", records: "1,205", latency: "0.5s" },
  ];

  // Validation rules
  const validations = [
    { rule: "Budget > 0 for all active projects", passed: 24, failed: 0, severity: "critical" },
    { rule: "Actual ≤ Revised Budget (no overruns without flag)", passed: 22, failed: 2, severity: "high" },
    { rule: "PM assigned to every project", passed: 21, failed: 3, severity: "medium" },
    { rule: "Task codes map to valid GL accounts", passed: 19, failed: 5, severity: "high" },
    { rule: "Invoice dates within project date range", passed: 23, failed: 1, severity: "medium" },
    { rule: "No duplicate invoice line items", passed: 24, failed: 0, severity: "critical" },
    { rule: "FAST hours ≤ allocated hours per code", passed: 17, failed: 7, severity: "high" },
    { rule: "Change orders have approval timestamps", passed: 20, failed: 4, severity: "medium" },
    { rule: "Pro forma amounts reconcile to contracts", passed: 15, failed: 9, severity: "low" },
    { rule: "Billing method consistent across invoices", passed: 22, failed: 2, severity: "low" },
  ];

  const criticalFails = validations.filter(v => v.severity === "critical" && v.failed > 0).length;
  const highFails = validations.filter(v => v.severity === "high" && v.failed > 0).length;
  const totalPassed = validations.reduce((s, v) => s + v.passed, 0);
  const totalChecked = validations.reduce((s, v) => s + v.passed + v.failed, 0);
  const validationScore = (totalPassed / totalChecked * 100);

  // Monthly data quality trend
  const qualityTrend = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"].map((m, i) => ({
    month: m,
    completeness: 88 + i * 1.2 + (r() - 0.5) * 2,
    accuracy: 91 + i * 0.8 + (r() - 0.5) * 3,
    freshness: 82 + i * 2 + (r() - 0.5) * 4,
  }));

  // Entity record counts for pie
  const entities = [
    { name: "FactInvoiceLine", value: 148203 },
    { name: "FactFASTActivity", value: 52841 },
    { name: "FactRevenueBudget", value: 3412 },
    { name: "FactProForma", value: 892 },
    { name: "DimProject", value: 24 },
    { name: "ContractOverride", value: 156 },
  ];

  const sevColors = { critical: C.red, high: C.amber, medium: C.blue, low: C.textLight };
  const statusIcon = { healthy: { bg: C.greenBg, color: C.green, label: "Healthy" }, warning: { bg: C.amberBg, color: C.amber, label: "Warning" }, stale: { bg: C.redBg, color: C.red, label: "Stale" } };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: C.teal, marginBottom: 6 }}>System Monitoring</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Data Health Dashboard</div>
          <div style={{ fontSize: 13, color: C.textLight, marginTop: 4 }}>Completeness, freshness, and validation status across all data entities.</div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={{ padding: "9px 18px", fontSize: 12, fontWeight: 600, background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 7, cursor: "pointer" }}>↓ Export Report</button>
          <button style={{ padding: "9px 18px", fontSize: 12, fontWeight: 600, background: C.teal, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,119,182,0.3)" }}>⟳ Run Checks</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 16, marginBottom: 22 }}>
        <KpiCard label="Overall Completeness" value={fmtPct(overallPct)} icon="📋"
          detail={`${overallComplete} of ${overallTotal} fields populated`}
          barPct={overallPct} barColor={overallPct > 90 ? C.green : C.amber} />
        <KpiCard label="Validation Score" value={fmtPct(validationScore)} icon="✓"
          detail={`${totalPassed} of ${totalChecked} checks passed`}
          barPct={validationScore} barColor={validationScore > 90 ? C.green : C.amber} />
        <KpiCard label="Critical Issues" value={criticalFails} icon="🔴"
          detail={criticalFails === 0 ? "No critical failures" : `${criticalFails} rules failing`}
          barPct={criticalFails === 0 ? 100 : 30} barColor={criticalFails === 0 ? C.green : C.red} />
        <KpiCard label="High Priority" value={highFails} icon="🟡"
          detail={`${highFails} high-severity rules need review`}
          barPct={highFails === 0 ? 100 : 60} barColor={highFails === 0 ? C.green : C.amber} />
      </div>

      {/* Alert if stale sources */}
      {sources.some(s => s.status === "stale") && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", background: C.redBg, borderRadius: 8, marginBottom: 22, border: "1px solid #FFCDD2" }}>
          <span style={{ fontSize: 18 }}>🔴</span>
          <div style={{ flex: 1, fontSize: 13, color: "#B71C1C" }}>
            <strong>Stale data detected.</strong> {sources.filter(s => s.status === "stale").map(s => s.name).join(", ")} hasn't synced in over 24 hours. Data may be outdated.
          </div>
          <span style={{ fontSize: 12, color: C.teal, fontWeight: 600, cursor: "pointer" }}>Trigger sync →</span>
        </div>
      )}

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 22 }}>
        <SectionCard title="Data Quality Trend" subtitle="Monthly completeness, accuracy, and freshness scores">
          <div style={{ padding: 16 }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={qualityTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                <XAxis dataKey="month" style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[75, 100]} tickFormatter={v => `${v}%`} style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return <div style={{ background: C.navy, padding: "10px 14px", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{label}</div>
                    {payload.map((p, i) => <div key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                      <span style={{ width: 8, height: 3, borderRadius: 1, background: p.color, display: "inline-block" }} />{p.name}: {p.value.toFixed(1)}%
                    </div>)}
                  </div>;
                }} />
                <Line type="monotone" dataKey="completeness" stroke={C.teal} strokeWidth={2.5} name="Completeness" dot={{ r: 3, fill: C.teal, stroke: "#fff", strokeWidth: 2 }} />
                <Line type="monotone" dataKey="accuracy" stroke={C.green} strokeWidth={2} name="Accuracy" dot={{ r: 3, fill: C.green, stroke: "#fff", strokeWidth: 2 }} />
                <Line type="monotone" dataKey="freshness" stroke={C.amber} strokeWidth={2} name="Freshness" dot={{ r: 3, fill: C.amber, stroke: "#fff", strokeWidth: 2 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} iconType="plainline" iconSize={12} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Records by Entity" subtitle="Total records across all data tables">
          <div style={{ padding: 16 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={entities} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
                <XAxis type="number" tickFormatter={v => v >= 1000 ? `${(v/1e3).toFixed(0)}K` : v} style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" style={{ fontSize: 9 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return <div style={{ background: C.navy, padding: "10px 14px", borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{payload[0].payload.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>{payload[0].value.toLocaleString()} records</div>
                  </div>;
                }} />
                <Bar dataKey="value" fill={C.teal} radius={[0, 4, 4, 0]} barSize={14} name="Records">
                  {entities.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Data Sources */}
      <SectionCard title="Data Source Connections" subtitle="Sync status and latency for all upstream feeds" style={{ marginBottom: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0 }}>
          {sources.map(s => {
            const st = statusIcon[s.status];
            return (
              <div key={s.name} style={{ padding: "18px 20px", borderRight: `1px solid ${C.borderLight}`, textAlign: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: st.color, margin: "0 auto 10px", boxShadow: `0 0 8px ${st.color}40` }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{s.name}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: st.color, background: st.bg, padding: "2px 8px", borderRadius: 10, marginBottom: 8 }}>
                  {st.label}
                </div>
                <div style={{ fontSize: 11, color: C.textLight, marginBottom: 2 }}>Last sync: {s.lastSync}</div>
                <div style={{ fontSize: 11, color: C.textLight }}>{s.records} records · {s.latency}</div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Field Completeness */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 22 }}>
        <SectionCard title="Field Completeness" subtitle="Population rate by data field">
          <div style={{ padding: "8px 0" }}>
            {fields.map(f => {
              const pct = f.complete / f.total * 100;
              const missing = f.total - f.complete;
              return (
                <div key={f.field} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 20px", borderBottom: `1px solid ${C.borderLight}` }}>
                  <div style={{ flex: "0 0 160px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{f.field}</div>
                    <div style={{ fontSize: 10, color: C.textLight }}>{f.table}</div>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "#E8ECF1", borderRadius: 3 }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: pct === 100 ? C.green : pct > 80 ? C.teal : C.amber }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? C.green : pct > 80 ? C.teal : C.amber, minWidth: 36 }}>{fmtPct(pct)}</span>
                  </div>
                  <div style={{ flex: "0 0 60px", textAlign: "right", fontSize: 11, color: missing > 0 ? C.amber : C.textLight }}>
                    {missing > 0 ? `${missing} missing` : "Complete"}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Validation Rules */}
        <SectionCard title="Validation Rules" subtitle="Business rule checks and failure counts">
          <div style={{ padding: "4px 0", maxHeight: 420, overflowY: "auto" }}>
            {validations.map((v, i) => {
              const total = v.passed + v.failed;
              const pct = v.passed / total * 100;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: `1px solid ${C.borderLight}` }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: v.failed === 0 ? C.green : sevColors[v.severity],
                    flexShrink: 0, boxShadow: v.failed > 0 ? `0 0 6px ${sevColors[v.severity]}50` : "none",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.rule}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <div style={{ width: 80, height: 4, background: "#E8ECF1", borderRadius: 2 }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: v.failed === 0 ? C.green : sevColors[v.severity] }} />
                      </div>
                      <span style={{ fontSize: 10, color: C.textLight }}>{v.passed}/{total}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {v.failed === 0 ? (
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.green, background: C.greenBg, padding: "2px 8px", borderRadius: 10 }}>Passed</span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 600, color: sevColors[v.severity], background: v.severity === "critical" ? C.redBg : v.severity === "high" ? C.amberBg : C.purpleBg, padding: "2px 8px", borderRadius: 10 }}>
                        {v.failed} failed · {v.severity}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: HELP
// ══════════════════════════════════════════════════════════════════════════════
function HelpPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const guides = [
    { icon: "◉", title: "Portfolio Overview", desc: "Understand your KPI cards, budget performance list, and monthly cost trend chart.", steps: ["Navigate to Overview from the sidebar", "KPI cards show revised budget, actual + committed, remaining, and labor utilization", "Budget performance shows each project's spend progress against its revised budget", "Monthly cost trend compares actual invoicing vs your spending plan"] },
    { icon: "◫", title: "Managing Projects", desc: "View all projects, sort by any column, and drill into monthly spend breakdowns.", steps: ["Click Projects in the sidebar to see the full portfolio", "Use column headers to sort by utilization, budget, status, etc.", "Click any row to expand a detailed monthly spend chart", "Status charts at the top show distribution by phase, PM, and status"] },
    { icon: "▤", title: "Task Code Analysis", desc: "Track hours allocated, logged, and scheduled across all task codes.", steps: ["Task Codes page shows utilization across all work categories", "The donut chart breaks down logged hours by task code", "Monthly trend shows how hour consumption changes over time", "Review remaining hours to identify codes at risk of overrun"] },
    { icon: "◨", title: "Forecasting & Risk", desc: "Analyze burn rate, projected spend, and identify at-risk projects.", steps: ["Forecast page calculates your current monthly burn rate", "Cumulative spend chart shows actuals vs plan with projected forecast line", "The risk scatter plot maps utilization against budget size", "Quarterly cards show variance between actual and planned spend"] },
    { icon: "✦", title: "Data Health Monitoring", desc: "Check data completeness, source freshness, and validation rule compliance.", steps: ["Data Health shows sync status for all upstream data feeds", "Field completeness tracks which data fields have gaps", "Validation rules check business logic (e.g. actual ≤ budget)", "Stale data alerts appear when a source hasn't synced in 24+ hours"] },
  ];

  const faqs = [
    { q: "How often does the data refresh?", a: "Financial data from SAP refreshes every 2 hours. FAST timekeeping syncs every 4 hours. Pro Forma staging updates daily. You can check exact sync times on the Data Health page." },
    { q: "What does 'Needs attention' status mean?", a: "A project is flagged 'Needs attention' when its utilization exceeds 90% of the revised budget. This means the project is close to or at risk of exceeding its approved budget and may need a change order or scope adjustment." },
    { q: "How is Labor Utilization calculated?", a: "Labor Utilization = (Logged Hours + Scheduled Hours) / Allocated Hours × 100. It includes both actual time entries and forward-scheduled FAS hours against the total allocation for each task code." },
    { q: "Can I export data to Excel?", a: "Yes — click the 'Export' button on any page to download the current view as a CSV file. For formatted reports, use the Export button on the Overview page which generates a PDF summary." },
    { q: "Who can access this dashboard?", a: "Access is role-based. Admins have full access. Project Managers see their assigned projects. Finance Leads see all financial data. Directors have read-only portfolio view. Viewers see summary data only." },
    { q: "How are forecasts calculated?", a: "Forecasts use a rolling 3-month burn rate average projected forward through year-end. The forecast accuracy metric compares prior monthly forecasts against actual outcomes over the trailing 8 months." },
    { q: "What should I do if data looks incorrect?", a: "First check the Data Health page for stale sources or validation failures. If the source is healthy, contact the data team using the form below. Most data discrepancies trace back to delayed SAP postings or pending invoice approvals." },
    { q: "How do I get a new user account?", a: "Account requests go through your department admin. They can submit a request through the UCLA Facilities IT portal. Typical provisioning takes 1-2 business days." },
  ];

  const contacts = [
    { name: "Portfolio Support", email: "portfolio-support@facilities.ucla.edu", desc: "General questions about the dashboard", hours: "M–F 8am–5pm PT" },
    { name: "Data Engineering", email: "data-team@facilities.ucla.edu", desc: "Data quality issues, missing records, sync problems", hours: "M–F 7am–6pm PT" },
    { name: "IT Helpdesk", email: "it-help@facilities.ucla.edu", desc: "Login issues, access requests, permissions", hours: "24/7" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: C.teal, marginBottom: 6 }}>Support Center</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Portal Guide & Help</div>
        <div style={{ fontSize: 13, color: C.textLight, marginTop: 4 }}>Learn how to use each section of the Capital Portfolio dashboard.</div>
      </div>

      {/* Quick Start Guides */}
      <SectionCard title="Quick Start Guides" subtitle="Step-by-step walkthroughs for each dashboard section" style={{ marginBottom: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 0 }}>
          {guides.map((g, gi) => (
            <div key={gi} style={{ padding: "20px 22px", borderRight: gi < guides.length - 1 ? `1px solid ${C.borderLight}` : "none", borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${C.teal}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: C.teal }}>{g.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{g.title}</div>
              </div>
              <div style={{ fontSize: 12, color: C.textMid, marginBottom: 12, lineHeight: 1.5 }}>{g.desc}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {g.steps.map((step, si) => (
                  <div key={si} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: C.teal, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{si + 1}</span>
                    <span style={{ fontSize: 11, color: C.textMid, lineHeight: 1.5 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* FAQs */}
      <SectionCard title="Frequently Asked Questions" subtitle={`${faqs.length} common questions answered`} style={{ marginBottom: 22 }}>
        <div>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
              <div onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 20px", cursor: "pointer", transition: "background .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#FAFBFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: openFaq === i ? C.teal : "#E8ECF1", color: openFaq === i ? "#fff" : C.textMid, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>?</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{faq.q}</span>
                </div>
                <span style={{ fontSize: 16, color: C.textLight, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform .2s" }}>⌄</span>
              </div>
              {openFaq === i && (
                <div style={{ padding: "0 20px 16px 52px", fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Contact Cards */}
      <SectionCard title="Contact Support" subtitle="Reach out to the right team for your issue">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {contacts.map((c, i) => (
            <div key={i} style={{ padding: "22px 24px", borderRight: i < contacts.length - 1 ? `1px solid ${C.borderLight}` : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${CHART_COLORS[i]}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 14, color: CHART_COLORS[i] }}>
                {["📧", "🔧", "🖥"][i]}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: C.textMid, marginBottom: 10, lineHeight: 1.5 }}>{c.desc}</div>
              <div style={{ fontSize: 12, color: C.teal, fontWeight: 600, marginBottom: 4 }}>{c.email}</div>
              <div style={{ fontSize: 11, color: C.textLight }}>Available: {c.hours}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD SHELL
// ══════════════════════════════════════════════════════════════════════════════
export default function ProjectFinancialDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState("overview");

  const pages = { overview: <OverviewPage user={user}/>, projects: <ProjectsPage/>, tasks: <TaskCodesPage/>, forecast: <ForecastPage/>, datahealth: <DataHealthPage/>, help: <HelpPage/> };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: C.sidebar, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10 }}>
        <div style={{ padding: "22px 20px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: C.navy, fontFamily: "Georgia, serif" }}>U</div>
          <div><div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Capital Portfolio</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>UCLA Facilities</div></div>
        </div>
        <div style={{ padding: "8px 12px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "rgba(255,255,255,0.3)", padding: "8px 8px 6px", marginTop: 8 }}>Workspace</div>
          <NavItem icon="◉" label="Overview" active={activePage==="overview"} onClick={()=>setActivePage("overview")} />
          <NavItem icon="◫" label="Projects" badge={PROJECTS.length} active={activePage==="projects"} onClick={()=>setActivePage("projects")} />
          <NavItem icon="▤" label="Task Codes" active={activePage==="tasks"} onClick={()=>setActivePage("tasks")} />
          <NavItem icon="◨" label="Forecast" active={activePage==="forecast"} onClick={()=>setActivePage("forecast")} />
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "rgba(255,255,255,0.3)", padding: "16px 8px 6px" }}>System</div>
          <NavItem icon="✦" label="Data health" active={activePage==="datahealth"} onClick={()=>setActivePage("datahealth")} />
        </div>
        <div style={{ marginTop: "auto", padding: "16px 16px 20px" }}>
          <div onClick={() => setActivePage("help")} style={{ padding: "12px 14px", borderRadius: 8, background: activePage === "help" ? C.sidebarActive : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <span>💡</span><div><div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>Need help?</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>View the portal guide</div></div>
            <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>›</span>
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Prepared for<br/><span style={{ fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>UCLA CAPITAL PROGRAMS</span></div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, marginLeft: 220, background: C.bg }}>
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: C.textLight }}>Capital Programs <span style={{ margin: "0 6px" }}>/</span>
            <span style={{ color: C.text, fontWeight: 600 }}>{activePage.charAt(0).toUpperCase()+activePage.slice(1)}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11, color: C.textMid, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }}/>Connected</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{user?.name || "User"}</span>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.teal}, ${C.navy})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
              {(user?.name||"U").split(" ").map(n=>n[0]).join("")}</div>
            {onLogout && <button onClick={onLogout} style={{ padding: "5px 12px", fontSize: 10, fontWeight: 600, background: "transparent", color: C.textLight, border: `1px solid ${C.border}`, borderRadius: 5, cursor: "pointer" }}>Sign Out</button>}
          </div>
        </div>
        <div style={{ padding: "28px 32px 40px" }}>{pages[activePage]}</div>
      </div>
    </div>
  );
}
