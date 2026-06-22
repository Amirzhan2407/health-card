import { useState, useEffect } from "react";
import api from "../../api/api";
import { RiNotificationLine } from "react-icons/ri";

export default function OrgAdminNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await api.get("/notifications");
        if (res.data?.success) {
          setNotifications(res.data.data);
        }
      } catch (err) {
        console.warn(err);
      }
    }
    loadNotifications();
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Уведомления администратора</h2>
      <p style={styles.sub}>Уведомления о работе клиники, поданных заявках и тикетах поддержки.</p>

      <div style={styles.card}>
        <div style={styles.list}>
          {notifications.length === 0 ? (
            <div style={styles.item}>
              <RiNotificationLine style={{ color: "#6366f1", fontSize: "20px" }} />
              <div>
                <h4 style={{ margin: "0 0 4px 0", fontWeight: 600 }}>Новых уведомлений нет</h4>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>Здесь появятся оповещения клиники.</p>
              </div>
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} style={styles.item}>
                <RiNotificationLine style={{ color: n.is_read ? "#64748b" : "#6366f1", fontSize: "20px" }} />
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontWeight: 600, color: n.is_read ? "#94a3b8" : "#fff" }}>{n.title}</h4>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>{n.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "40px", color: "#fff", fontFamily: "'Outfit', sans-serif" },
  title: { fontSize: "32px", fontWeight: 700, margin: "0 0 8px 0" },
  sub: { color: "#94a3b8", fontSize: "16px", margin: "0 0 40px 0" },
  card: { background: "rgba(30, 41, 59, 0.4)", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "20px" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  item: { display: "flex", gap: "16px", background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "12px", alignItems: "center" }
};
