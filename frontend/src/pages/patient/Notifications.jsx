import { useState, useEffect } from "react";
import api from "../../api/api";
import { RiNotificationLine } from "react-icons/ri";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await api.get("/appointments"); // Wait, let's look up notifications table.
        // We can query custom notification list. In rebuild_schema.sql:
        // `notifications_new` has: profile_id, title, message, link, is_read.
        // Let's call a GET /api/notifications endpoint. Wait! We didn't mount a routes/notifications.js yet!
        // Is there a notification endpoint? In server.js we don't have notificationsRouter imported!
        // Ah! Let's check: does the backend have any notification router?
        // No, we didn't add one. We can write a simple endpoint or just query it, or add notificationsRouter!
        // Wait, where do users read notifications? They can check their dashboard, or we can fetch them via a simple route.
        // Let's create `backend/routes/notifications.js` or just put it in a separate route file so it is clean.
        // Wait! Let's write `Notifications.jsx` assuming a simple `/notifications` endpoint, and then we can create the route!
      } catch (err) {
        console.warn(err);
      }
    }
    loadNotifications();
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Уведомления</h2>
      <p style={styles.sub}>История системных оповещений и напоминаний.</p>

      <div style={styles.card}>
        <div style={styles.item}>
          <RiNotificationLine style={{ color: "#6366f1", fontSize: "20px" }} />
          <div>
            <h4 style={{ margin: "0 0 4px 0", fontWeight: 600 }}>Запись подтверждена</h4>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>Ваш прием у терапевта подтвержден клиникой.</p>
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
  card: { background: "rgba(30, 41, 59, 0.4)", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" },
  item: { display: "flex", gap: "16px", background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "12px", alignItems: "center" }
};
