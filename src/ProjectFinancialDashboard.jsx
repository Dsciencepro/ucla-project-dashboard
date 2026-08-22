// ProjectFinancialDashboard.jsx — v3.0 Live FAST Database
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
  ScatterChart, Scatter, ZAxis, LineChart, Line,
} from "recharts";

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
const CHART_COLORS = [C.teal, C.green, C.amber, C.purple, C.blue, C.red, "#E91E63", "#00BCD4"];
const statusMap = {
  "A": { label: "Active", dot: C.green, bg: C.greenBg, text: "#047857" },
  "Awarded": { label: "Awarded", dot: C.teal, bg: "#E0F7FA", text: "#006064" },
  "In Planning": { label: "In Planning", dot: C.amber, bg: C.amberBg, text: "#92400E" },
  "F": { label: "Finished", dot: C.textLight, bg: "#F1F5F9", text: "#475569" },
  "L": { label: "Closed", dot: C.textLight, bg: "#F1F5F9", text: "#475569" },
};
const fmt = (v) => { if (v == null) return "—"; const a = Math.abs(v); if (a >= 1e6) return `$${(v/1e6).toFixed(2)}M`; if (a >= 1e3) return `$${(v/1e3).toFixed(0)}K`; return `$${v.toFixed(0)}`; };
const fmtPct = (v) => `${v.toFixed(1)}%`;
const fmtHrs = (v) => `${Math.round(v).toLocaleString()} h`;

// ─── Shared Components ──────────────────────────────────────────────────────
function NavItem({ icon, label, active, badge, onClick }) {
  return (<div onClick={onClick} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 18px",borderRadius:8,cursor:"pointer",marginBottom:2,background:active?C.sidebarActive:"transparent",color:active?"#fff":"rgba(255,255,255,0.6)",fontWeight:active?600:400,fontSize:13 }}>
    <span style={{fontSize:16,width:20,textAlign:"center"}}>{icon}</span><span style={{flex:1}}>{label}</span>
    {badge && <span style={{background:C.gold,color:C.navy,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10}}>{badge}</span>}
  </div>);
}
function MiniBar({ pct, color }) { return (<div style={{height:4,background:"#E8ECF1",borderRadius:2,marginTop:10}}><div style={{width:`${Math.min(pct||0,100)}%`,height:"100%",borderRadius:2,background:color||C.teal}}/></div>); }
function KpiCard({ label, value, sub, detail, barPct, barColor, icon }) {
  return (<div style={{background:C.surface,borderRadius:10,padding:"20px 22px",flex:"1 1 0",border:`1px solid ${C.border}`,minWidth:180}}>
    <div style={{display:"flex",justifyContent:"space-between"}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.textLight}}>{label}</div><span style={{fontSize:14,color:C.textLight}}>{icon}</span></div>
    <div style={{display:"flex",alignItems:"baseline",gap:8,marginTop:10}}><span style={{fontSize:26,fontWeight:800,color:C.navy,letterSpacing:-1}}>{value}</span>{sub&&<span style={{fontSize:11,color:C.textLight}}>{sub}</span>}</div>
    {detail&&<div style={{fontSize:11,color:C.green,fontWeight:600,marginTop:5}}>{detail}</div>}{barPct!=null&&<MiniBar pct={barPct} color={barColor}/>}
  </div>);
}
function ChartTooltip({ active, payload, label }) {
  if (!active||!payload?.length) return null;
  return (<div style={{background:C.navy,padding:"10px 14px",borderRadius:8,boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>
    <div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:6}}>{label}</div>
    {payload.map((p,i)=>(<div key={i} style={{fontSize:11,color:"rgba(255,255,255,0.8)",display:"flex",gap:8,alignItems:"center",marginBottom:2}}>
      <span style={{width:8,height:3,borderRadius:1,background:p.color,display:"inline-block"}}/>{p.name}: {typeof p.value==="number"&&p.value>100?fmt(p.value):p.value}
    </div>))}
  </div>);
}
function SectionCard({ title, subtitle, children, style: sx }) {
  return (<div style={{background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden",...sx}}>
    <div style={{padding:"18px 20px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.borderLight}`}}>
      <div><div style={{fontSize:15,fontWeight:700,color:C.navy}}>{title}</div>{subtitle&&<div style={{fontSize:11,color:C.textLight}}>{subtitle}</div>}</div>
    </div>{children}
  </div>);
}
function StatusPill({ status }) {
  const s = statusMap[status] || { label: status, dot: C.textLight, bg: "#F1F5F9", text: "#475569" };
  return (<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:600,color:s.text,background:s.bg,padding:"3px 10px",borderRadius:10}}>
    <span style={{width:5,height:5,borderRadius:"50%",background:s.dot}}/>{s.label}
  </span>);
}
function Loader() { return <div style={{padding:60,textAlign:"center",color:C.textLight,fontSize:14}}>Loading live data from FAST database...</div>; }

// ─── Data Hook ──────────────────────────────────────────────────────────────
function useApi(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reload = useCallback(() => {
    setLoading(true);
    fetch(url).then(r=>r.json()).then(d=>{setData(d);setError(null);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  }, [url]);
  useEffect(()=>{reload();},[reload]);
  return { data, loading, error, reload };
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW PAGE
// ══════════════════════════════════════════════════════════════════════════════
function OverviewPage({ user, projects, dashboard }) {
  const [search, setSearch] = useState("");
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  const filtered = useMemo(() => {
    let p = projects || [];
    if (search) { const q = search.toLowerCase(); p = p.filter(x => x.Name?.toLowerCase().includes(q) || x.ProjectNo?.toLowerCase().includes(q)); }
    return p.slice(0, 12);
  }, [projects, search]);

  const totalBudget = (projects||[]).reduce((s,p) => s + (p.RevisedBudget||0), 0);
  const totalTaskBudget = (projects||[]).reduce((s,p) => s + (p.ActualCost||0), 0);
  const totalHours = (projects||[]).reduce((s,p) => s + (p.HoursLogged||0), 0);
  const totalWO = (projects||[]).reduce((s,p) => s + (p.WorkOrderCount||0), 0);
  const completedWO = (projects||[]).reduce((s,p) => s + (p.CompletedWorkOrders||0), 0);
  const woPct = totalWO > 0 ? (completedWO/totalWO*100) : 0;
  const activeCount = (projects||[]).filter(p => p.Status === "A").length;

  // Top projects by budget
  const topProjects = useMemo(() => [...(projects||[])].sort((a,b) => (b.Budget||0)-(a.Budget||0)).slice(0,8), [projects]);

  // By PM
  const byPM = useMemo(() => {
    const map = {};
    (projects||[]).forEach(p => { const pm = p.ProjectManager||"Unassigned"; if(!map[pm]) map[pm]={name:pm,count:0,budget:0}; map[pm].count++; map[pm].budget+=(p.RevisedBudget||0); });
    return Object.values(map).sort((a,b)=>b.count-a.count).slice(0,8);
  }, [projects]);

  // By Status
  const byStatus = useMemo(() => {
    const map = {};
    (projects||[]).forEach(p => { const s = p.Status||"Unknown"; if(!map[s]) map[s]={name:statusMap[s]?.label||s,value:0,fill:statusMap[s]?.dot||C.textLight}; map[s].value++; });
    return Object.values(map);
  }, [projects]);

  return (
    <div>
      {/* DB Status */}
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",background:"#F0FDF9",borderRadius:10,marginBottom:20,border:"1px solid #A7F3D0"}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}60`}}/>
        <div style={{flex:1}}>
          <span style={{fontSize:13,fontWeight:700,color:"#065F46"}}>FAST Database Connected — Live Data</span>
          <span style={{fontSize:12,color:"#047857",marginLeft:16}}><strong>{dashboard?.totalProjects?.toLocaleString()||"..."}</strong> projects · <strong>{dashboard?.totalWorkOrders?.toLocaleString()||"..."}</strong> work orders · <strong>{Math.round(dashboard?.totalHoursLogged||0).toLocaleString()}</strong> hours</span>
        </div>
        <span style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,background:"#D1FAE5",color:"#065F46"}}>db: FAST</span>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:C.teal,marginBottom:6}}>Portfolio Overview</div>
          <div style={{fontSize:28,fontWeight:800,color:C.navy}}>{greeting}, {user?.name?.split(" ")[0]||"there"}</div>
          <div style={{fontSize:13,color:C.textLight,marginTop:4}}>Here's where TQF's active projects stand today.</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"flex",gap:16,marginBottom:22}}>
        <KpiCard label="Revised Budget" value={fmt(totalBudget)} sub={`${(projects||[]).length} projects`} barPct={100} barColor={C.teal} icon="ℹ" />
        <KpiCard label="Actual Cost" value={fmt(totalTaskBudget)} detail={`${fmtPct(totalBudget>0?totalTaskBudget/totalBudget*100:0)} spent`} barPct={totalBudget>0?totalTaskBudget/totalBudget*100:0} barColor={C.green} icon="📊" />
        <KpiCard label="Hours Logged" value={fmtHrs(totalHours)} sub="all time" barPct={50} barColor={C.amber} icon="⏱" />
        <KpiCard label="Work Orders" value={totalWO.toLocaleString()} detail={`${completedWO.toLocaleString()} completed (${fmtPct(woPct)})`} barPct={woPct} barColor={C.teal} icon="◫" />
        <KpiCard label="Active Projects" value={activeCount} sub={`of ${(projects||[]).length}`} barPct={activeCount/(projects||[{length:1}]).length*100} barColor={C.green} icon="◉" />
      </div>

      {/* Search */}
      <div style={{display:"flex",gap:14,marginBottom:22,background:C.surface,padding:"12px 18px",borderRadius:10,border:`1px solid ${C.border}`,alignItems:"center"}}>
        <div style={{position:"relative",flex:1}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textLight}}>⌕</span>
          <input type="text" placeholder="Search project name or number..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{width:"100%",padding:"8px 12px 8px 32px",fontSize:13,border:`1px solid ${C.border}`,borderRadius:6,outline:"none",color:C.text,background:"#FAFBFC"}}/>
        </div>
        <span style={{fontSize:12,color:C.textLight}}>{filtered.length} results</span>
      </div>

      {/* Two Column */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:20,marginBottom:22}}>
        {/* Budget Performance List */}
        <SectionCard title="Budget performance" subtitle="Top projects by estimated budget">
          <div style={{maxHeight:380,overflowY:"auto"}}>
            {topProjects.map(p => {
              const taskPct = p.RevisedBudget > 0 ? (p.ActualCost||0)/p.RevisedBudget*100 : 0;
              return (<div key={p.Id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",borderBottom:`1px solid ${C.borderLight}`,cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{flex:"0 0 260px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:600,color:C.teal}}>{p.ProjectNo}</span>
                    <StatusPill status={p.Status}/>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:240}}>{p.Name}</div>
                </div>
                <div style={{flex:1,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1,height:6,background:"#E8ECF1",borderRadius:3}}>
                    <div style={{width:`${Math.min(taskPct,100)}%`,height:"100%",borderRadius:3,background:C.teal}}/>
                  </div>
                  <span style={{fontSize:11,color:C.textLight,minWidth:55}}>{fmtPct(taskPct)}</span>
                </div>
                <div style={{textAlign:"right",minWidth:80}}>
                  <div style={{fontSize:15,fontWeight:700,color:C.navy}}>{fmt(p.RevisedBudget)}</div>
                  <div style={{fontSize:10,color:C.textLight}}>{p.ProjectManager?.split(" ")[0]||""}</div>
                </div>
                <span style={{color:C.textLight}}>›</span>
              </div>);
            })}
          </div>
        </SectionCard>

        {/* By PM Chart */}
        <SectionCard title="Projects by Manager" subtitle="Project count per PM">
          <div style={{padding:16}}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byPM} layout="vertical" margin={{top:5,right:20,left:5,bottom:0}}>
                <XAxis type="number" style={{fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" style={{fontSize:10}} axisLine={false} tickLine={false} width={90} tickFormatter={v=>v.split(" ")[0]}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="count" fill={C.teal} radius={[0,4,4,0]} barSize={14} name="Projects"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Status + Customer Charts */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:22}}>
        <SectionCard title="Project Status Distribution" subtitle="All projects by status">
          <div style={{padding:16}}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart margin={{top:10,bottom:5}}>
                <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} innerRadius={38} paddingAngle={4} cornerRadius={3}
                  labelLine={false} label={({cx,cy,midAngle,innerRadius,outerRadius,percent})=>{
                    const R=Math.PI/180;const r=innerRadius+(outerRadius-innerRadius)*0.5;const x=cx+r*Math.cos(-midAngle*R);const y=cy+r*Math.sin(-midAngle*R);
                    return percent>0.06?<text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{fontSize:9,fontWeight:800}}>{`${(percent*100).toFixed(0)}%`}</text>:null;
                  }}>{byStatus.map((e,i)=><Cell key={i} fill={e.fill} stroke="none"/>)}</Pie>
                <Legend wrapperStyle={{fontSize:10}} iconType="plainline" iconSize={12}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Recent Projects Table */}
        <SectionCard title="Recently Added Projects" subtitle="Latest projects by start date">
          <div style={{maxHeight:260,overflowY:"auto"}}>
            {(projects||[]).slice(0,6).map(p => (
              <div key={p.Id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 18px",borderBottom:`1px solid ${C.borderLight}`,fontSize:12}}>
                <span style={{fontWeight:600,color:C.teal,minWidth:75}}>{p.ProjectNo}</span>
                <span style={{flex:1,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.Name}</span>
                <StatusPill status={p.Status}/>
                <span style={{fontWeight:700,color:C.navy,minWidth:70,textAlign:"right"}}>{fmt(p.RevisedBudget)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROJECTS PAGE
// ══════════════════════════════════════════════════════════════════════════════
function ProjectsPage({ projects }) {
  const [sortKey, setSortKey] = useState("Budget");
  const [sortDir, setSortDir] = useState("desc");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  const sorted = useMemo(() => {
    let p = [...(projects||[])];
    if (search) { const q = search.toLowerCase(); p = p.filter(x => x.Name?.toLowerCase().includes(q)||x.ProjectNo?.includes(q)||x.ProjectManager?.toLowerCase().includes(q)||x.CustomerName?.toLowerCase().includes(q)); }
    p.sort((a,b) => { const va=a[sortKey],vb=b[sortKey]; const cmp=typeof va==="string"?(va||"").localeCompare(vb||""):(va||0)-(vb||0); return sortDir==="asc"?cmp:-cmp; });
    return p;
  }, [projects, sortKey, sortDir, search]);

  const handleSort = (k) => { if(sortKey===k) setSortDir(d=>d==="asc"?"desc":"asc"); else {setSortKey(k);setSortDir("desc");} };

  useEffect(() => {
    if (selectedId) {
      fetch(`/api/projects/${selectedId}`).then(r=>r.json()).then(setDetail).catch(()=>{});
    } else { setDetail(null); }
  }, [selectedId]);

  const cols = [
    {key:"ProjectNo",label:"Project #",w:95},{key:"Name",label:"Project Name",w:220},{key:"CustomerName",label:"Client",w:160},
    {key:"ProjectManager",label:"PM",w:110},{key:"Status",label:"Status",w:90},{key:"Budget",label:"Budget",w:90,fmt:fmt},
    {key:"TaskBudget",label:"Actual Cost",w:90,fmt:fmt},{key:"HoursLogged",label:"Hours",w:70,fmt:v=>fmtHrs(v||0)},
    {key:"WorkOrderCount",label:"WOs",w:50},{key:"IsTM",label:"T&M",w:45},
  ];

  return (
    <div>
      <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:C.teal,marginBottom:6}}>Project Portfolio</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:20}}>
        <div style={{fontSize:24,fontWeight:800,color:C.navy}}>All Projects ({(projects||[]).length})</div>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textLight}}>⌕</span>
          <input type="text" placeholder="Search name, client, PM..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{padding:"8px 12px 8px 32px",fontSize:13,border:`1px solid ${C.border}`,borderRadius:6,outline:"none",color:C.text,background:C.surface,minWidth:280}}/>
        </div>
      </div>

      <SectionCard title={`${sorted.length} projects`} subtitle="Click any row for detail">
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:1100}}>
            <thead><tr style={{background:"#FAFBFC"}}>
              {cols.map(c=>(<th key={c.key} onClick={()=>handleSort(c.key)} style={{padding:"10px 12px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,color:sortKey===c.key?C.teal:C.textLight,cursor:"pointer",textAlign:c.fmt?"right":"left",borderBottom:`2px solid ${sortKey===c.key?C.teal:"transparent"}`,whiteSpace:"nowrap"}}>{c.label} {sortKey===c.key?(sortDir==="asc"?"↑":"↓"):""}</th>))}
            </tr></thead>
            <tbody>
              {sorted.slice(0,100).map(p=>(<tr key={p.Id} onClick={()=>setSelectedId(selectedId===p.Id?null:p.Id)}
                style={{borderBottom:`1px solid ${C.borderLight}`,cursor:"pointer",background:selectedId===p.Id?"#F0F7FF":"transparent"}}
                onMouseEnter={e=>{if(selectedId!==p.Id)e.currentTarget.style.background="#FAFBFC"}} onMouseLeave={e=>{if(selectedId!==p.Id)e.currentTarget.style.background="transparent"}}>
                <td style={{padding:"10px 12px",fontSize:12,fontWeight:600,color:C.teal}}>{p.ProjectNo}</td>
                <td style={{padding:"10px 12px",fontSize:12,fontWeight:600,color:C.text,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.Name}</td>
                <td style={{padding:"10px 12px",fontSize:11,color:C.textMid,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.CustomerName||"—"}</td>
                <td style={{padding:"10px 12px",fontSize:11,color:C.textMid}}>{p.ProjectManager||"—"}</td>
                <td style={{padding:"10px 12px"}}><StatusPill status={p.Status}/></td>
                <td style={{padding:"10px 12px",fontSize:12,fontWeight:600,color:C.navy,textAlign:"right"}}>{fmt(p.RevisedBudget||0)}</td>
                <td style={{padding:"10px 12px",fontSize:12,color:C.textMid,textAlign:"right"}}>{fmt(p.ActualCost||0)}</td>
                <td style={{padding:"10px 12px",fontSize:12,color:C.textMid,textAlign:"right"}}>{fmtHrs(p.HoursLogged||0)}</td>
                <td style={{padding:"10px 12px",fontSize:12,color:C.textMid,textAlign:"center"}}>{p.WorkOrderCount||0}</td>
                <td style={{padding:"10px 12px",fontSize:11,color:C.textMid,textAlign:"center"}}>{p.IsTM?"✓":"—"}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
        {/* Detail Panel */}
        {detail && detail.project && (
          <div style={{padding:"20px 22px",borderTop:`2px solid ${C.teal}`,background:"#F8FBFF"}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:14}}>{detail.project.ProjectNo} · {detail.project.Name}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              {/* Monthly Hours Chart */}
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.textMid,marginBottom:10}}>Monthly Hours</div>
                {detail.monthly?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={detail.monthly} margin={{top:5,right:10,left:-10,bottom:0}}>
                      <XAxis dataKey="Month" style={{fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v?.slice(5)||v}/>
                      <YAxis style={{fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<ChartTooltip/>}/>
                      <Bar dataKey="Hours" fill={C.teal} radius={[4,4,0,0]} barSize={20} name="Hours"/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div style={{color:C.textLight,fontSize:12,padding:20}}>No timesheet data for this project yet.</div>}
              </div>
              {/* Details + Tasks */}
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                  {[{l:"Client",v:detail.project.CustomerName},{l:"PM",v:detail.project.ProjectManager},{l:"Start",v:detail.project.StartDate?.slice(0,10)},{l:"End",v:detail.project.EndDate?.slice(0,10)||"Ongoing"},
                    {l:"Budget",v:fmt(detail.project.EstimatedAmount)},{l:"T&M",v:detail.project.IsTM?"Yes":"No"}
                  ].map((d,i)=>(<div key={i} style={{padding:"6px 10px",background:C.surface,borderRadius:6,border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",color:C.textLight}}>{d.l}</div>
                    <div style={{fontSize:12,fontWeight:600,color:C.navy,marginTop:2}}>{d.v||"—"}</div>
                  </div>))}
                </div>
                {detail.tasks?.length > 0 && (
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:C.textMid,marginBottom:6}}>Task Codes ({detail.tasks.length})</div>
                    {detail.tasks.slice(0,5).map(t=>(<div key={t.Id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11,borderBottom:`1px solid ${C.borderLight}`}}>
                      <span><span style={{background:C.teal,color:"#fff",padding:"1px 6px",borderRadius:3,fontSize:10,fontWeight:700,marginRight:6}}>{t.TaskCode}</span>{t.Description}</span>
                      <span style={{fontWeight:600,color:C.navy}}>{fmt(t.TaskBudget)}</span>
                    </div>))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TASK CODES PAGE
// ══════════════════════════════════════════════════════════════════════════════
function TaskCodesPage({ tasks }) {
  const totalBudget = (tasks||[]).reduce((s,t) => s + (t.TotalBudget||0), 0);
  const totalProjects = (tasks||[]).reduce((s,t) => s + (t.ProjectCount||0), 0);
  const pieData = (tasks||[]).filter(t=>t.TotalBudget>0).map(t=>({name:`${t.Code} ${(t.Description||"").split(" ")[0]}`,value:t.TotalBudget}));

  return (
    <div>
      <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:C.teal,marginBottom:6}}>Resource Management</div>
      <div style={{fontSize:24,fontWeight:800,color:C.navy,marginBottom:20}}>Task Code Analysis ({(tasks||[]).length} codes)</div>

      <div style={{display:"flex",gap:16,marginBottom:22}}>
        <KpiCard label="Total Task Codes" value={(tasks||[]).length} icon="▤" barPct={100} barColor={C.teal}/>
        <KpiCard label="Total Budget" value={fmt(totalBudget)} icon="💰" barPct={100} barColor={C.green}/>
        <KpiCard label="Project Assignments" value={totalProjects} icon="◫" barPct={70} barColor={C.amber}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:22}}>
        <SectionCard title="Budget by Task Code" subtitle="Dollar allocation across codes">
          <div style={{padding:16}}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart margin={{top:10,bottom:5}}>
                <Pie data={pieData.slice(0,8)} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80} innerRadius={40} paddingAngle={3} cornerRadius={3}
                  labelLine={false} label={({cx,cy,midAngle,innerRadius,outerRadius,percent})=>{
                    const R=Math.PI/180;const r=innerRadius+(outerRadius-innerRadius)*0.5;const x=cx+r*Math.cos(-midAngle*R);const y=cy+r*Math.sin(-midAngle*R);
                    return percent>0.08?<text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{fontSize:9,fontWeight:800}}>{`${(percent*100).toFixed(0)}%`}</text>:null;
                  }}>{pieData.slice(0,8).map((e,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} stroke="none"/>)}</Pie>
                <Legend wrapperStyle={{fontSize:9}} iconType="plainline" iconSize={12}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Budget by Code" subtitle="Top codes by budget allocation">
          <div style={{padding:16}}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={(tasks||[]).filter(t=>t.TotalBudget>0).sort((a,b)=>(b.TotalBudget||0)-(a.TotalBudget||0)).slice(0,10)} layout="vertical" margin={{top:5,right:20,left:5,bottom:0}}>
                <XAxis type="number" tickFormatter={v=>fmt(v)} style={{fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="Code" style={{fontSize:10}} axisLine={false} tickLine={false} width={50}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="TotalBudget" fill={C.teal} radius={[0,4,4,0]} barSize={14} name="Budget"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="All Task Codes" subtitle="From FAST database TaskCodes + ACUM_ProjectTask">
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#FAFBFC"}}>{["Code","Description","Projects","Assignments","Total Budget","Qty"].map((h,i)=>(
            <th key={i} style={{padding:"10px 16px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.6,color:C.textLight,textAlign:i>1?"right":"left",borderBottom:`1px solid ${C.border}`}}>{h}</th>
          ))}</tr></thead>
          <tbody>{(tasks||[]).map(t=>(
            <tr key={t.Code} style={{borderBottom:`1px solid ${C.borderLight}`}}>
              <td style={{padding:"12px 16px"}}><span style={{padding:"3px 10px",borderRadius:4,fontSize:11,fontWeight:700,background:C.teal,color:"#fff"}}>{t.Code}</span></td>
              <td style={{padding:"12px 16px",fontSize:13,fontWeight:600,color:C.text}}>{t.Description||"—"}</td>
              <td style={{padding:"12px 16px",fontSize:12,color:C.textMid,textAlign:"right"}}>{t.ProjectCount||0}</td>
              <td style={{padding:"12px 16px",fontSize:12,color:C.textMid,textAlign:"right"}}>{t.TaskAssignments||0}</td>
              <td style={{padding:"12px 16px",fontSize:12,fontWeight:600,color:C.navy,textAlign:"right"}}>{fmt(t.TotalBudget||0)}</td>
              <td style={{padding:"12px 16px",fontSize:12,color:C.textMid,textAlign:"right"}}>{Math.round(t.TotalQuantity||0).toLocaleString()}</td>
            </tr>
          ))}</tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORECAST PAGE
// ══════════════════════════════════════════════════════════════════════════════
function ForecastPage({ projects, monthly }) {
  const totalBudget = (projects||[]).reduce((s,p) => s + (p.RevisedBudget||0), 0);
  const totalTask = (projects||[]).reduce((s,p) => s + (p.ActualCost||0), 0);
  const topByBudget = [...(projects||[])].sort((a,b)=>(b.Budget||0)-(a.Budget||0)).slice(0,20);

  // Scatter: budget vs hours
  const scatter = topByBudget.filter(p=>p.RevisedBudget>0).map(p=>({
    name: p.Name?.length>20?p.Name.slice(0,18)+"…":p.Name,
    x: p.RevisedBudget, y: p.HoursLogged||0, z: p.WorkOrderCount||1, status: p.Status,
  }));

  // By customer
  const byCust = useMemo(() => {
    const map = {};
    (projects||[]).forEach(p => { const c = p.CustomerName||"Unknown"; if(!map[c]) map[c]={name:c,budget:0,count:0}; map[c].budget+=(p.RevisedBudget||0); map[c].count++; });
    return Object.values(map).sort((a,b)=>b.budget-a.budget).slice(0,10);
  }, [projects]);

  return (
    <div>
      <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:C.teal,marginBottom:6}}>Financial Planning</div>
      <div style={{fontSize:24,fontWeight:800,color:C.navy,marginBottom:20}}>Budget Analysis & Forecast</div>

      <div style={{display:"flex",gap:16,marginBottom:22}}>
        <KpiCard label="Total Portfolio Budget" value={fmt(totalBudget)} icon="📋" barPct={100} barColor={C.teal}/>
        <KpiCard label="Detailed (Task-Level)" value={fmt(totalTask)} detail={`${fmtPct(totalBudget>0?totalTask/totalBudget*100:0)} coverage`} barPct={totalBudget>0?totalTask/totalBudget*100:0} barColor={C.green} icon="📊"/>
        <KpiCard label="Unspent Gap" value={fmt(totalBudget-totalTask)} icon="⚠️" barPct={(totalBudget-totalTask)/totalBudget*100} barColor={C.amber}/>
        <KpiCard label="Top Client Budget" value={fmt(byCust[0]?.budget||0)} sub={byCust[0]?.name?.split(",")[0]||""} icon="👤" barPct={80} barColor={C.purple}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:22}}>
        {/* Monthly hours trend */}
        <SectionCard title="Monthly Hours Trend" subtitle="Logged hours from EmployeeTimesheets (last 12 months)">
          <div style={{padding:16}}>
            {(monthly||[]).length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthly} margin={{top:5,right:10,left:-10,bottom:0}}>
                  <defs><linearGradient id="gH" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.teal} stopOpacity={0.2}/><stop offset="100%" stopColor={C.teal} stopOpacity={0.02}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight}/>
                  <XAxis dataKey="Month" style={{fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v?.slice(5)||v}/>
                  <YAxis tickFormatter={v=>`${(v/1e3).toFixed(1)}K`} style={{fontSize:10}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Area type="monotone" dataKey="TotalHours" stroke={C.teal} strokeWidth={2.5} fill="url(#gH)" name="Total Hours" dot={{r:3,fill:C.teal,stroke:"#fff",strokeWidth:2}}/>
                  <Area type="monotone" dataKey="OvertimeHours" stroke={C.amber} strokeWidth={1.5} fill="none" name="Overtime" strokeDasharray="4 4"/>
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{color:C.textLight,fontSize:12,padding:40,textAlign:"center"}}>Loading monthly data...</div>}
          </div>
        </SectionCard>

        {/* Budget by Customer */}
        <SectionCard title="Budget by Client" subtitle="Top 10 clients by total project budget">
          <div style={{padding:16}}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byCust} layout="vertical" margin={{top:5,right:20,left:5,bottom:0}}>
                <XAxis type="number" tickFormatter={v=>fmt(v)} style={{fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" style={{fontSize:9}} axisLine={false} tickLine={false} width={110} tickFormatter={v=>v.length>18?v.slice(0,16)+"…":v}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="budget" fill={C.teal} radius={[0,4,4,0]} barSize={14} name="Budget"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Scatter */}
      <SectionCard title="Project Map" subtitle="Budget vs hours logged — bubble size = work orders">
        <div style={{padding:16}}>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{top:10,right:10,left:-10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight}/>
              <XAxis type="number" dataKey="x" name="Budget" tickFormatter={v=>fmt(v)} style={{fontSize:10}} axisLine={false}/>
              <YAxis type="number" dataKey="y" name="Hours" style={{fontSize:10}} axisLine={false}/>
              <ZAxis type="number" dataKey="z" range={[30,200]}/>
              <Tooltip content={({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;
                return <div style={{background:C.navy,padding:"10px 14px",borderRadius:8}}><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{d.name}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:4}}>Budget: {fmt(d.x)}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>Hours: {Math.round(d.y)}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>Work Orders: {d.z}</div></div>;}}/>
              <Scatter data={scatter} fill={C.teal}>{scatter.map((s,i)=><Cell key={i} fill={statusMap[s.status]?.dot||C.teal} fillOpacity={0.7}/>)}</Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELP PAGE (static)
// ══════════════════════════════════════════════════════════════════════════════
function HelpPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const faqs = [
    {q:"Where does the data come from?",a:"All data is pulled live from the FAST SQL Server database (Acumatica ERP). Projects come from ACUM_Project, budgets from ACUM_ProjectTaskItems, hours from EmployeeTimesheets, and work orders from the WorkOrders table."},
    {q:"How often does data refresh?",a:"Data refreshes every time you load a page. The FAST database is always live — there's no caching delay."},
    {q:"What does each status mean?",a:"A = Active, Awarded = Contract won but not started, In Planning = Pre-construction phase, F = Finished, L = Closed."},
    {q:"How is Actual Cost calculated?",a:"Actual Cost = SUM(BasePrice × Quantity) from ACUM_ProjectTaskItems, grouped by project. This is the spent line-item budget from task codes."},
    {q:"Why are hours zero for some projects?",a:"Hours come from EmployeeTimesheets linked through WorkOrders. Newer projects may not have work orders or timesheets yet."},
    {q:"Who do I contact for issues?",a:"For data issues contact Jignesh (jigssodvadiya@gmail.com). For dashboard issues contact Ashish (ashishmishra1981@gmail.com)."},
  ];
  return (
    <div>
      <div style={{fontSize:24,fontWeight:800,color:C.navy,marginBottom:20}}>Help & FAQ</div>
      <SectionCard title="Frequently Asked Questions" subtitle={`${faqs.length} questions`}>
        {faqs.map((f,i)=>(<div key={i} style={{borderBottom:`1px solid ${C.borderLight}`}}>
          <div onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{display:"flex",justifyContent:"space-between",padding:"14px 20px",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background="#FAFBFC"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{fontSize:13,fontWeight:600,color:C.text}}>{f.q}</span>
            <span style={{color:C.textLight,transform:openFaq===i?"rotate(180deg)":"none",transition:"transform .2s"}}>⌄</span>
          </div>
          {openFaq===i&&<div style={{padding:"0 20px 16px 20px",fontSize:13,color:C.textMid,lineHeight:1.6}}>{f.a}</div>}
        </div>))}
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SHELL — Fetches all live data
// ══════════════════════════════════════════════════════════════════════════════
export default function ProjectFinancialDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState("overview");
  const { data: projects, loading: projLoading } = useApi("/api/projects");
  const { data: dashboard } = useApi("/api/dashboard");
  const { data: tasks, loading: taskLoading } = useApi("/api/tasks");
  const { data: monthly } = useApi("/api/timesheets/monthly");

  const projectCount = projects?.length || 0;

  const pages = {
    overview: projLoading ? <Loader/> : <OverviewPage user={user} projects={projects} dashboard={dashboard}/>,
    projects: projLoading ? <Loader/> : <ProjectsPage projects={projects}/>,
    tasks: taskLoading ? <Loader/> : <TaskCodesPage tasks={tasks}/>,
    forecast: projLoading ? <Loader/> : <ForecastPage projects={projects} monthly={monthly}/>,
    help: <HelpPage/>,
  };

  return (
    <div style={{display:"flex",minHeight:"100vh",fontFamily:"'Inter', -apple-system, sans-serif"}}>
      {/* Sidebar */}
      <div style={{width:220,background:C.sidebar,display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,bottom:0,zIndex:10}}>
        <div style={{padding:"22px 20px 18px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,borderRadius:8,background:C.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:C.navy,fontFamily:"Georgia, serif"}}>T</div>
          <div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>TQF Portfolio</div><div style={{fontSize:10,color:"rgba(255,255,255,0.45)"}}>The Quality Firm</div></div>
        </div>
        <div style={{padding:"8px 12px"}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"rgba(255,255,255,0.3)",padding:"8px 8px 6px",marginTop:8}}>Workspace</div>
          <NavItem icon="◉" label="Overview" active={activePage==="overview"} onClick={()=>setActivePage("overview")}/>
          <NavItem icon="◫" label="Projects" badge={projectCount||"..."} active={activePage==="projects"} onClick={()=>setActivePage("projects")}/>
          <NavItem icon="▤" label="Task Codes" active={activePage==="tasks"} onClick={()=>setActivePage("tasks")}/>
          <NavItem icon="◨" label="Forecast" active={activePage==="forecast"} onClick={()=>setActivePage("forecast")}/>
        </div>
        <div style={{marginTop:"auto",padding:"16px 16px 20px"}}>
          <div onClick={()=>setActivePage("help")} style={{padding:"12px 14px",borderRadius:8,background:activePage==="help"?C.sidebarActive:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <span>💡</span><div><div style={{fontSize:12,fontWeight:600,color:"#fff"}}>Need help?</div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>FAQ & documentation</div></div>
            <span style={{color:"rgba(255,255,255,0.3)",marginLeft:"auto"}}>›</span>
          </div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",marginTop:12,textTransform:"uppercase",letterSpacing:0.5}}>Powered by<br/><span style={{fontWeight:700,color:"rgba(255,255,255,0.4)"}}>FAST DATABASE</span></div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,marginLeft:220,background:C.bg}}>
        <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"12px 32px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:12,color:C.textLight}}>TQF Capital Programs <span style={{margin:"0 6px"}}>/</span>
            <span style={{color:C.text,fontWeight:600}}>{activePage.charAt(0).toUpperCase()+activePage.slice(1)}</span></div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:11,color:C.textMid,display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:C.green}}/>Live</div>
            <span style={{fontSize:13,fontWeight:600,color:C.text}}>{user?.name||"User"}</span>
            <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg, ${C.teal}, ${C.navy})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>
              {(user?.name||"U").split(" ").map(n=>n[0]).join("")}</div>
            {onLogout&&<button onClick={onLogout} style={{padding:"5px 12px",fontSize:10,fontWeight:600,background:"transparent",color:C.textLight,border:`1px solid ${C.border}`,borderRadius:5,cursor:"pointer"}}>Sign Out</button>}
          </div>
        </div>
        <div style={{padding:"28px 32px 40px"}}>{pages[activePage]}</div>
      </div>
    </div>
  );
}
