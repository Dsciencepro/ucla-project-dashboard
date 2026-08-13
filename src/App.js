import { useState, useEffect } from "react";
import LoginPage from "./LoginPage";
import ProjectFinancialDashboard from "./ProjectFinancialDashboard";

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      fetch("/api/me", {
        headers: { Authorization: "Bearer " + savedToken },
      })
        .then((r) => {
          if (r.ok) return r.json();
          throw new Error("expired");
        })
        .then((data) => {
          setUser(data.user);
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#F6F8FB", fontFamily: "'Inter', sans-serif", color: "#64748B",
      }}>Loading…</div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <ProjectFinancialDashboard user={user} onLogout={handleLogout} />;
}

export default App;
