import { useState } from "react";

const C = {
  navy: "#1B2A4A",
  navyLight: "#2C3E6B",
  accent: "#3B82F6",
  red: "#DC2626",
  slate: "#64748B",
  border: "#E2E8F0",
  bg: "#F6F8FB",
  surface: "#FFFFFF",
};

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 50%, #1e3a5f 100%)`,
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        background: C.surface, borderRadius: 16, padding: "44px 40px 36px",
        width: 400, maxWidth: "90vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Logo / Title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: `linear-gradient(135deg, ${C.accent}, ${C.navyLight})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 24, color: "#fff", fontWeight: 700,
          }}>PF</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>Project Financial Dashboard</div>
          <div style={{ fontSize: 13, color: C.slate, marginTop: 4 }}>Sign in to continue</div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              style={{
                width: "100%", padding: "10px 14px", fontSize: 14,
                border: `1px solid ${C.border}`, borderRadius: 8,
                outline: "none", color: C.navy, boxSizing: "border-box",
                transition: "border .2s",
              }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              style={{
                width: "100%", padding: "10px 14px", fontSize: 14,
                border: `1px solid ${C.border}`, borderRadius: 8,
                outline: "none", color: C.navy, boxSizing: "border-box",
                transition: "border .2s",
              }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "#FEF2F2", color: C.red, padding: "10px 14px",
              borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500,
            }}>{error}</div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading || !username || !password} style={{
            width: "100%", padding: "12px", fontSize: 14, fontWeight: 600,
            background: loading ? C.slate : C.accent, color: "#fff",
            border: "none", borderRadius: 8, cursor: loading ? "wait" : "pointer",
            transition: "background .2s", opacity: (!username || !password) ? 0.6 : 1,
          }}>{loading ? "Signing in…" : "Sign In"}</button>
        </form>

        {/* Credentials hint */}
        <div style={{
          marginTop: 28, padding: "14px 16px", background: C.bg,
          borderRadius: 8, fontSize: 11, color: C.slate,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12, color: C.navy }}>Demo Credentials</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Username", "Password", "Role"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "2px 6px", fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["admin", "Admin@123", "Admin"],
                ["jthompson", "James@123", "PM"],
                ["schen", "Sarah@123", "Finance"],
                ["mrodriguez", "Maria@123", "Director"],
                ["viewer", "Viewer@123", "Viewer"],
              ].map(([u, p, r]) => (
                <tr key={u}>
                  <td style={{ padding: "3px 6px", fontFamily: "monospace", fontSize: 11 }}>{u}</td>
                  <td style={{ padding: "3px 6px", fontFamily: "monospace", fontSize: 11 }}>{p}</td>
                  <td style={{ padding: "3px 6px" }}>{r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
