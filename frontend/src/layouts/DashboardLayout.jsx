import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { RiLogoutBoxLine, RiGlobalLine, RiUserHeartLine, RiNotificationLine } from "react-icons/ri";

export default function DashboardLayout({ links = [] }) {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logoBox}>
            <RiUserHeartLine style={{ fontSize: "20px" }} />
          </div>
          <span style={styles.brandName}>Clinic OS</span>
        </div>

        <nav style={styles.nav}>
          {links.map((link) => (
            <Link key={link.path} to={link.path} style={styles.navLink}>
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.fullName || "Пользователь"}</span>
            <span style={styles.userRole}>{user?.role || ""}</span>
          </div>
          
          <div style={styles.actionsGrid}>
            <button onClick={() => setLanguage(language === "ru" ? "kk" : "ru")} style={styles.actionBtn}>
              <RiGlobalLine />
            </button>
            <button onClick={handleLogout} style={{ ...styles.actionBtn, color: "#fca5a5" }}>
              <RiLogoutBoxLine />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  container: { display: "flex", minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", fontFamily: "'Outfit', sans-serif" },
  sidebar: { width: "260px", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(15px)", borderRight: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", flexDirection: "column", padding: "30px 20px" },
  brand: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "40px" },
  logoBox: { width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #6366f1 0%, #10b981 100%)", display: "flex", alignItems: "center", justifyOrigin: "center", justifyContent: "center", color: "#fff" },
  brandName: { fontSize: "20px", fontWeight: 700, color: "#fff" },
  nav: { display: "flex", flexDirection: "column", gap: "8px", flex: 1 },
  navLink: { display: "flex", alignItems: "center", gap: "12px", color: "#94a3b8", textDecoration: "none", padding: "12px 16px", borderRadius: "12px", transition: "all 0.2s ease", fontSize: "15px", fontWeight: 600 },
  sidebarFooter: { borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "16px" },
  userInfo: { display: "flex", flexDirection: "column" },
  userName: { color: "#fff", fontSize: "14px", fontWeight: 600 },
  userRole: { color: "#64748b", fontSize: "12px", textTransform: "uppercase", fontWeight: 700, marginTop: "2px" },
  actionsGrid: { display: "flex", gap: "12px" },
  actionBtn: { flex: 1, background: "rgba(255,255,255,0.05)", border: "none", color: "#94a3b8", padding: "10px", borderRadius: "10px", cursor: "pointer", fontSize: "16px", display: "flex", justifyContent: "center", alignItems: "center" },
  main: { flex: 1, overflowY: "auto", height: "100vh" }
};
export const option = {};
