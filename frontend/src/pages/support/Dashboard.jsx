import { useState, useEffect } from "react";
import api from "../../api/api";
import { RiFileList2Line, RiBuilding4Line } from "react-icons/ri";

export default function SupportDashboard() {
  const [applications, setApplications] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [msg, setMsg] = useState("");

  async function loadData() {
    try {
      const appsRes = await api.get("/applications?status=pending");
      if (appsRes.data?.success) {
        setApplications(appsRes.data.data);
      }
      const orgsRes = await api.get("/organizations");
      if (orgsRes.data?.success) {
        setClinics(orgsRes.data.data);
      }
    } catch (err) {
      console.warn(err);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (appId) => {
    try {
      const res = await api.post(`/applications/${appId}/approve`);
      if (res.data?.success) {
        setMsg("Заявка одобрена, учетная запись клиники создана.");
        loadData();
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleReject = async (appId) => {
    const reason = prompt("Укажите причину отказа:");
    if (!reason) return;
    try {
      const res = await api.post(`/applications/${appId}/reject`, { reason });
      if (res.data?.success) {
        setMsg("Заявка отклонена.");
        loadData();
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Кабинет техподдержки</h2>
      <p style={styles.sub}>Одобрение заявок на подключение новых клиник и блокировка организаций.</p>

      {msg && <p style={styles.alert}>{msg}</p>}

      <div style={styles.flex}>
        {/* Applications list */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Заявки на рассмотрении</h3>
          <div style={styles.list}>
            {applications.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>Новых заявок нет.</p>
            ) : (
              applications.map((app) => (
                <div key={app.id} style={styles.item}>
                  <RiFileList2Line style={styles.icon} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 4px 0", fontWeight: 600 }}>{app.organization_name}</h4>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>БИН: {app.bin} | Админ: {app.admin_name}</p>
                  </div>
                  <div style={styles.actions}>
                    <button onClick={() => handleApprove(app.id)} style={styles.approveBtn}>Одобрить</button>
                    <button onClick={() => handleReject(app.id)} style={styles.rejectBtn}>Отказать</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Clinics list */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Активные клиники</h3>
          <div style={styles.list}>
            {clinics.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>Клиники отсутствуют.</p>
            ) : (
              clinics.map((org) => (
                <div key={org.id} style={styles.item}>
                  <RiBuilding4Line style={styles.icon} />
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontWeight: 600 }}>{org.name}</h4>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>Город: {org.city} | Статус: {org.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "40px", color: "#fff", fontFamily: "'Outfit', sans-serif" },
  title: { fontSize: "32px", fontWeight: 700, margin: "0 0 8px 0" },
  sub: { color: "#94a3b8", fontSize: "16px", margin: "0 0 40px 0" },
  flex: { display: "flex", gap: "30px", flexWrap: "wrap" },
  card: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "20px", flex: 1, minWidth: "320px" },
  cardTitle: { fontSize: "20px", fontWeight: 600, margin: "0 0 20px 0" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  item: { display: "flex", alignItems: "center", gap: "16px", background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "12px", flexWrap: "wrap" },
  icon: { fontSize: "24px", color: "#6366f1" },
  actions: { display: "flex", gap: "8px", marginLeft: "auto" },
  approveBtn: { background: "#10b981", border: "none", color: "#fff", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  rejectBtn: { background: "#ef4444", border: "none", color: "#fff", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  alert: { color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", padding: "12px", borderRadius: "10px", marginBottom: "20px" }
};
