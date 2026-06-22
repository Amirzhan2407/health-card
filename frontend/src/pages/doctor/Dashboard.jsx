import { useState, useEffect } from "react";
import api from "../../api/api";
import { Link } from "react-router-dom";
import { RiCalendarCheckLine } from "react-icons/ri";

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    async function loadAppts() {
      try {
        const res = await api.get("/appointments");
        if (res.data?.success) {
          setAppointments(res.data.data);
        }
      } catch (err) {
        console.warn(err);
      }
    }
    loadAppts();
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Календарь приемов</h2>
      <p style={styles.sub}>Список ваших запланированных приемов на сегодня.</p>

      <div style={styles.card}>
        <div style={styles.list}>
          {appointments.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>На сегодня нет запланированных приемов.</p>
          ) : (
            appointments.map((appt) => (
              <div key={appt.id} style={styles.item}>
                <RiCalendarCheckLine style={styles.icon} />
                <div>
                  <h4 style={styles.time}>{appt.time}</h4>
                  <p style={styles.patient}>Пациент: {appt.profiles?.full_name || "Неизвестно"}</p>
                </div>
                <span style={{
                  ...styles.status,
                  color: appt.status === "completed" ? "#10b981" : "#3b82f6"
                }}>
                  {appt.status}
                </span>
                <Link to={`/doctor/visit?apptId=${appt.id}`} style={styles.actionBtn}>
                  Начать прием
                </Link>
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
  card: { background: "rgba(30, 41, 59, 0.4)", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "24px" },
  list: { display: "flex", flexDirection: "column", gap: "16px" },
  item: { display: "flex", alignItems: "center", gap: "20px", background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "12px" },
  icon: { fontSize: "28px", color: "#6366f1" },
  time: { fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0" },
  patient: { fontSize: "14px", color: "#94a3b8", margin: 0 },
  status: { marginLeft: "auto", fontSize: "13px", fontWeight: 600, textTransform: "uppercase" },
  actionBtn: { background: "#6366f1", border: "none", color: "#fff", padding: "10px 18px", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer" }
};
