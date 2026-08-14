import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ─── Seeded Random ──────────────────────────────────────────────────────────
function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

// ─── Sample Data ────────────────────────────────────────────────────────────
const rand = seededRandom(42);
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
  const utilPct = 35 + rand() * 62;
  const actual = Math.round(revisedBudget * (utilPct / 100));
  const committed = Math.round(revisedBudget * (0.02 + rand() * 0.08));
  const remaining = revisedBudget - actual - committed;
  const allocatedHours = Math.round(5000 + rand() * 20000);
  const loggedHours = Math.round(allocatedHours * (0.4 + rand() * 0.5));
  const scheduledHours = Math.round(allocatedHours * (0.05 + rand() * 0.1));
  const laborUtil = ((loggedHours + scheduledHours) / allocatedHours) * 100;
  let status;
  if (utilPct > 90) status = "Needs attention";
  else if (utilPct > 70) status = "On track";
  else status = "Under budget";
  return {
    id, name, revisedBudget, actual, committed, remaining, utilPct,
    status, allocatedHours, loggedHours, scheduledHours, laborUtil,
  };
});

// Task codes
const TASK_CODES = [
  { code: "01-100", name: "Program Management", allocated: 12400, logged: 9620, scheduled: 680 },
  { code: "02-210", name: "Design Coordination", allocated: 18200, logged: 12920, scheduled: 1320 },
  { code: "03-310", name: "Field Observation", allocated: 22000, logged: 16880, scheduled: 2640 },
  { code: "04-410", name: "Construction Administration", allocated: 16500, logged: 9440, scheduled: 2100 },
  { code: "05-510", name: "Closeout & Commissioning", allocated: 9200, logged: 3260, scheduled: 980 },
];

// Monthly cost trend
const MONTHS_DATA = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"].map((m, i) => ({
  month: m,
  actual: Math.round(300000 + i * 95000 + (rand() - 0.5) * 120000),
  plan: Math.round(350000 + i * 85000),
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
  sidebar: "#0C2340",
  sidebarHover: "#163458",
  sidebarActive: "#1E4D7B",
  gold: "#FFD100",
  goldDark: "#E6BC00",
  bg: "#F4F6F9",
  surface: "#FFFFFF",
  navy: "#0C2340",
  text: "#1A1A2E",
  textMid: "#4A5568",
  textLight: "#8896A6",
  border: "#E8ECF1",
  borderLight: "#F0F2F5",
  teal: "#0077B6",
  tealLight: "#00B4D8",
  green: "#10B981",
  greenBg: "#ECFDF5",
  amber: "#F59E0B",
  amberBg: "#FFF8E1",
  red: "#EF4444",
  redBg: "#FFF0F0",
  blue: "#3B82F6",
};

const statusColors = {
  "On track": { dot: C.green, bg: C.greenBg, text: "#047857" },
  "Under budget": { dot: C.teal, bg: "#E0F7FA", text: "#006064" },
  "Needs attention": { dot: C.amber, bg: C.amberBg, text: "#92400E" },
};

// ─── Sidebar Nav Item ───────────────────────────────────────────────────────
function NavItem({ icon, label, active, badge, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 18px",
      borderRadius: 8, cursor: "pointer", marginBottom: 2,
      background: active ? C.sidebarActive : "transparent",
      color: active ? "#fff" : "rgba(255,255,255,0.6)",
      fontWeight: active ? 600 : 400, fontSize: 13,
      transition: "all .15s",
    }}>
      <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          background: C.gold, color: C.navy, fontSize: 10, fontWeight: 700,
          padding: "2px 7px", borderRadius: 10, minWidth: 18, textAlign: "center",
        }}>{badge}</span>
      )}
    </div>
  );
}

// ─── Mini Progress Bar (for KPI cards) ──────────────────────────────────────
function MiniBar({ pct, color }) {
  return (
    <div style={{ height: 4, background: "#E8ECF1", borderRadius: 2, marginTop: 10 }}>
      <div style={{
        width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 2,
        background: color || C.teal, transition: "width .4s",
      }} />
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, detail, barPct, barColor, icon }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 10, padding: "20px 22px", flex: "1 1 0",
      border: `1px solid ${C.border}`, minWidth: 200, position: "relative",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.textLight }}>{label}</div>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: C.textLight,
        }}>{icon}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: C.navy, letterSpacing: -1 }}>{value}</span>
        {sub && <span style={{ fontSize: 12, color: C.textLight }}>{sub}</span>}
      </div>
      {detail && <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginTop: 6 }}>{detail}</div>}
      {barPct != null && <MiniBar pct={barPct} color={barColor} />}
    </div>
  );
}

// ─── Budget Performance Row ─────────────────────────────────────────────────
function ProjectRow({ project }) {
  const sc = statusColors[project.status] || statusColors["On track"];
  const usedPct = project.utilPct;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
      borderBottom: `1px solid ${C.borderLight}`, cursor: "pointer",
      transition: "background .15s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ flex: "0 0 280px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid }}>{project.id}</span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 10, fontWeight: 600, color: sc.text, background: sc.bg,
            padding: "2px 8px", borderRadius: 10,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot }} />
            {project.status}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{project.name}</div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid, minWidth: 70 }}>
          {fmtPct(usedPct)} used
        </span>
        <div style={{ flex: 1, height: 6, background: "#E8ECF1", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            width: `${Math.min(usedPct, 100)}%`, height: "100%", borderRadius: 3,
            background: usedPct > 90 ? C.amber : usedPct > 70 ? C.teal : C.tealLight,
            transition: "width .4s",
          }} />
        </div>
        <span style={{ fontSize: 11, color: C.textLight, minWidth: 60, textAlign: "right" }}>
          of {fmt(project.revisedBudget)}
        </span>
      </div>
      <div style={{ flex: "0 0 80px", textAlign: "right" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{fmt(project.remaining)}</div>
        <div style={{ fontSize: 10, color: C.textLight }}>remaining</div>
      </div>
      <div style={{ fontSize: 16, color: C.textLight, cursor: "pointer" }}>›</div>
    </div>
  );
}

// ─── Chart Tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.navy, padding: "10px 14px", borderRadius: 8,
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    }}>
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

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function ProjectFinancialDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState("overview");
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("Through August 2026");
  const [chartMode, setChartMode] = useState("actual"); // actual | plan

  // Totals
  const totalBudget = PROJECTS.reduce((s, p) => s + p.revisedBudget, 0);
  const totalActual = PROJECTS.reduce((s, p) => s + p.actual, 0);
  const totalCommitted = PROJECTS.reduce((s, p) => s + p.committed, 0);
  const totalRemaining = PROJECTS.reduce((s, p) => s + p.remaining, 0);
  const totalAllocHrs = PROJECTS.reduce((s, p) => s + p.allocatedHours, 0);
  const totalLoggedHrs = PROJECTS.reduce((s, p) => s + p.loggedHours, 0);
  const totalSchedHrs = PROJECTS.reduce((s, p) => s + p.scheduledHours, 0);
  const laborUtil = ((totalLoggedHrs + totalSchedHrs) / totalAllocHrs * 100);
  const needsAttention = PROJECTS.filter(p => p.status === "Needs attention");

  const filteredProjects = useMemo(() => {
    if (!search) return PROJECTS;
    const q = search.toLowerCase();
    return PROJECTS.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [search]);

  const augActual = MONTHS_DATA[MONTHS_DATA.length - 1].actual;
  const augPlan = MONTHS_DATA[MONTHS_DATA.length - 1].plan;
  const variance = augActual - augPlan;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ═══ SIDEBAR ═══ */}
      <div style={{
        width: 220, background: C.sidebar, display: "flex", flexDirection: "column",
        padding: "0", flexShrink: 0, position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: "22px 20px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, background: C.gold,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 900, color: C.navy, fontFamily: "Georgia, serif",
          }}>U</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Capital Portfolio</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>UCLA Facilities</div>
          </div>
        </div>

        <div style={{ padding: "8px 12px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "rgba(255,255,255,0.3)", padding: "8px 8px 6px", marginTop: 8 }}>Workspace</div>
          <NavItem icon="◉" label="Overview" active={activePage === "overview"} onClick={() => setActivePage("overview")} />
          <NavItem icon="◫" label="Projects" badge={PROJECTS.length} onClick={() => setActivePage("overview")} />
          <NavItem icon="▤" label="Task codes" onClick={() => setActivePage("overview")} />
          <NavItem icon="◨" label="Forecast" onClick={() => setActivePage("overview")} />

          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "rgba(255,255,255,0.3)", padding: "16px 8px 6px" }}>System</div>
          <NavItem icon="✦" label="Data health" onClick={() => setActivePage("overview")} />
        </div>

        {/* Bottom help */}
        <div style={{ marginTop: "auto", padding: "16px 16px 20px" }}>
          <div style={{
            padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.06)",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 14 }}>💡</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>Need help?</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>View the portal guide</div>
            </div>
            <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>›</span>
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Prepared for<br/><span style={{ fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>UCLA CAPITAL PROGRAMS</span>
          </div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{ flex: 1, marginLeft: 220, background: C.bg }}>
        {/* Top Bar */}
        <div style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 12, color: C.textLight }}>
            Capital Programs <span style={{ margin: "0 6px" }}>/</span>
            <span style={{ color: C.text, fontWeight: 600 }}>Portfolio</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`,
              fontSize: 11, color: C.textMid, display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
              Connected
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{user?.name || "Portfolio View"}</span>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.teal}, ${C.navy})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#fff",
              }}>{(user?.name || "U").split(" ").map(n => n[0]).join("")}</div>
              {onLogout && (
                <button onClick={onLogout} style={{
                  padding: "5px 12px", fontSize: 10, fontWeight: 600,
                  background: "transparent", color: C.textLight,
                  border: `1px solid ${C.border}`, borderRadius: 5, cursor: "pointer",
                }}>Sign Out</button>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: "28px 32px 40px" }}>
          {/* Greeting + Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: C.teal, marginBottom: 6 }}>Portfolio Overview</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.navy, letterSpacing: -0.5 }}>
                {greeting}, {user?.name?.split(" ")[0] || "there"}
              </div>
              <div style={{ fontSize: 13, color: C.textLight, marginTop: 4 }}>
                Here's where UCLA's active capital projects stand today.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button style={{
                padding: "9px 18px", fontSize: 12, fontWeight: 600,
                background: C.surface, color: C.text, border: `1px solid ${C.border}`,
                borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>↓ Export</button>
              <button style={{
                padding: "9px 18px", fontSize: 12, fontWeight: 600,
                background: C.teal, color: "#fff", border: "none",
                borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 2px 8px rgba(0,119,182,0.3)",
              }}>⟳ Refresh data</button>
            </div>
          </div>

          {/* Search + Filters */}
          <div style={{
            display: "flex", gap: 14, marginBottom: 22, background: C.surface,
            padding: "12px 18px", borderRadius: 10, border: `1px solid ${C.border}`,
            alignItems: "center",
          }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textLight, fontSize: 14 }}>⌕</span>
              <input type="text" placeholder="Search project or PM" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px 8px 32px", fontSize: 13,
                  border: `1px solid ${C.border}`, borderRadius: 6, outline: "none",
                  color: C.text, background: "#FAFBFC",
                }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textLight }}>
              <span style={{ fontWeight: 600 }}>PROJECT</span>
              <select style={{
                padding: "8px 12px", fontSize: 12, border: `1px solid ${C.border}`,
                borderRadius: 6, background: "#FAFBFC", color: C.text, fontWeight: 600,
              }}>
                <option>All projects</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textLight }}>
              <span style={{ fontWeight: 600 }}>PERIOD</span>
              <span style={{ fontWeight: 700, color: C.text }}>{periodFilter}</span>
            </div>
            <button style={{
              fontSize: 12, color: C.teal, fontWeight: 600, background: "none",
              border: "none", cursor: "pointer",
            }}>Clear filters</button>
          </div>

          {/* ── KPI Cards ── */}
          <div style={{ display: "flex", gap: 16, marginBottom: 22 }}>
            <KpiCard label="Revised Budget" value={fmt(totalBudget)} sub={`${PROJECTS.length} active projects`}
              detail={`+2.4% from approved changes`} barPct={100} barColor={C.teal} icon="ℹ" />
            <KpiCard label="Actual + Committed" value={fmt(totalActual + totalCommitted)} sub={fmt(totalActual) + " actual"}
              detail={fmtPct((totalActual + totalCommitted) / totalBudget * 100) + " of budget"}
              barPct={(totalActual + totalCommitted) / totalBudget * 100} barColor={C.teal} icon="📊" />
            <KpiCard label="Remaining Budget" value={fmt(totalRemaining)} sub="available to spend"
              detail={fmt(totalCommitted) + " committed"}
              barPct={totalRemaining / totalBudget * 100} barColor={C.green} icon="◉" />
            <KpiCard label="Labor Utilization" value={fmtPct(laborUtil)} sub="logged + scheduled"
              detail={`${(totalLoggedHrs / 1000).toFixed(1)}K of ${(totalAllocHrs / 1000).toFixed(1)}K hours`}
              barPct={laborUtil} barColor={C.teal} icon="⊙" />
          </div>

          {/* ── Alert Banner ── */}
          {needsAttention.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
              background: C.amberBg, borderRadius: 8, marginBottom: 22,
              border: `1px solid #FFE082`,
            }}>
              <span style={{ fontSize: 18 }}>⚠</span>
              <div style={{ flex: 1, fontSize: 13, color: "#5D4037" }}>
                <strong>{needsAttention.length} items need attention.</strong>{" "}
                {needsAttention[0].name} is {fmtPct(needsAttention[0].utilPct)} utilized —{" "}
                {fmt(needsAttention[0].remaining)} remains against a {fmt(needsAttention[0].revisedBudget)} forecast to complete.
              </div>
              <button style={{
                fontSize: 12, fontWeight: 600, color: C.teal, background: "none",
                border: "none", cursor: "pointer", whiteSpace: "nowrap",
              }}>Review projects →</button>
            </div>
          )}

          {/* ── Two Column: Budget Perf + Monthly Trend ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 22 }}>
            {/* Budget Performance */}
            <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{
                padding: "18px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
                borderBottom: `1px solid ${C.borderLight}`,
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>Budget performance</div>
                  <div style={{ fontSize: 11, color: C.textLight }}>Actual and committed costs against revised budget</div>
                </div>
                <div style={{ display: "flex", gap: 4, background: C.bg, borderRadius: 6, padding: 3 }}>
                  {["Actual", "Committed"].map(t => (
                    <button key={t} style={{
                      padding: "5px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                      borderRadius: 4, background: t === "Actual" ? C.surface : "transparent",
                      color: t === "Actual" ? C.text : C.textLight,
                      boxShadow: t === "Actual" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                    }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {filteredProjects.slice(0, 8).map(p => <ProjectRow key={p.id} project={p} />)}
              </div>
            </div>

            {/* Monthly Cost Trend */}
            <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>Monthly cost trend</div>
                <div style={{ display: "flex", gap: 4, background: C.bg, borderRadius: 6, padding: 3 }}>
                  {["Actual", "Plan"].map(t => (
                    <button key={t} onClick={() => setChartMode(t.toLowerCase())}
                      style={{
                        padding: "5px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                        borderRadius: 4,
                        background: chartMode === t.toLowerCase() ? C.surface : "transparent",
                        color: chartMode === t.toLowerCase() ? C.text : C.textLight,
                        boxShadow: chartMode === t.toLowerCase() ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.textLight, marginBottom: 16 }}>Actual costs compared with spending plan</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={MONTHS_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.teal} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={C.teal} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                  <XAxis dataKey="month" style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${(v/1e3).toFixed(0)}K`} style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="plan" stroke={C.textLight} strokeWidth={1.5}
                    fill="none" name="Plan" strokeDasharray="6 3" />
                  <Area type="monotone" dataKey="actual" stroke={C.teal} strokeWidth={2.5}
                    fill="url(#gradTeal)" name="Actual"
                    dot={{ r: 4, fill: C.teal, stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
              {/* Monthly summary */}
              <div style={{ display: "flex", gap: 12, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.borderLight}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.textLight }}>August Actual</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginTop: 4 }}>{fmt(augActual)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.textLight }}>Variance to Plan</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: variance > 0 ? C.red : C.green, marginTop: 4 }}>
                    {variance > 0 ? "+" : "−"}{fmt(Math.abs(variance))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Task Code Utilization ── */}
          <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <div style={{
              padding: "18px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
              borderBottom: `1px solid ${C.borderLight}`,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>Task code utilization</div>
                <div style={{ fontSize: 11, color: C.textLight }}>Logged hours plus FAS scheduled hours against allocated hours</div>
              </div>
              <div style={{ display: "flex", gap: 4, background: C.bg, borderRadius: 6, padding: 3 }}>
                {["Logged", "Scheduled"].map(t => (
                  <button key={t} style={{
                    padding: "5px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                    borderRadius: 4, background: t === "Logged" ? C.surface : "transparent",
                    color: t === "Logged" ? C.text : C.textLight,
                    boxShadow: t === "Logged" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  }}>{t}</button>
                ))}
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#FAFBFC" }}>
                  {["Task Code", "", "Allocated", "Logged", "Scheduled", "Labor Utilization", "Budget Used"].map((h, i) => (
                    <th key={i} style={{
                      padding: "10px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: 0.6, color: C.textLight, textAlign: i > 1 ? "right" : "left",
                      borderBottom: `1px solid ${C.border}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TASK_CODES.map(tc => {
                  const util = ((tc.logged + tc.scheduled) / tc.allocated) * 100;
                  const budgetUsed = (tc.logged / tc.allocated) * 100;
                  const barColor = util > 85 ? C.amber : C.teal;
                  return (
                    <tr key={tc.code} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                          background: C.teal, color: "#fff",
                        }}>{tc.code}</span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: C.text }}>{tc.name}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMid, textAlign: "right" }}>{fmtHrs(tc.allocated)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMid, textAlign: "right" }}>{fmtHrs(tc.logged)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMid, textAlign: "right" }}>{fmtHrs(tc.scheduled)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          <div style={{ width: 80, height: 5, background: "#E8ECF1", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(util, 100)}%`, height: "100%", borderRadius: 3, background: barColor }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: barColor, minWidth: 42 }}>{fmtPct(util)}</span>
                        </div>
                      </td>
                      <td style={{
                        padding: "12px 16px", fontSize: 12, fontWeight: 600, textAlign: "right",
                        color: budgetUsed > 80 ? C.amber : C.textMid,
                      }}>{fmtPct(budgetUsed)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
