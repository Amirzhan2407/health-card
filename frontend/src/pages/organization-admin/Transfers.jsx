import { useState, useEffect } from "react";
import api from "../../api/api";

export default function Transfers() {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState("");
  const [selectedDoc, setSelectedDoc] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");

  async function loadData() {
    try {
      const apptsRes = await api.get("/appointments");
      if (apptsRes.data?.success) {
        setAppointments(apptsRes.data.data.filter(a => ["scheduled", "confirmed"].includes(a.status)));
      }
      const docsRes = await api.get("/doctors");
      if (docsRes.data?.success) {
        setDoctors(docsRes.data.data);
      }
    } catch (err) {
      console.warn(err);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handlePropose = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await api.post("/transfers/propose", {
        appointmentId: selectedAppt,
        newDoctorId: selectedDoc,
        newDate: date,
        newTime: time,
        reason,
      });
      if (res.data?.success) {
        setMsg("Предложение переноса отправлено пациенту.");
        // reset form
        setSelectedAppt("");
        setSelectedDoc("");
        setDate("");
        setTime("");
        setReason("");
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Перенос приемов</h2>
      <p style={styles.sub}>Инициируйте предложения о замене врача или времени приема для пациентов.</p>

      {msg && <p style={styles.alert}>{msg}</p>}

      <form onSubmit={handlePropose} style={styles.card}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Выберите запись приема</label>
          <select value={selectedAppt} onChange={e => setSelectedAppt(e.target.value)} style={styles.select} required>
            <option value="">Выберите прием...</option>
            {appointments.map(a => (
              <option key={a.id} value={a.id}>Пациент: {a.profiles?.full_name} | {a.date} {a.time}</option>
            ))}
          </select>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Новый врач</label>
          <select value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)} style={styles.select} required>
            <option value="">Выберите нового врача...</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </select>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Новая дата</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={styles.input} required />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Новое время</label>
          <input type="text" value={time} onChange={e => setTime(e.target.value)} placeholder="09:30" style={styles.input} required />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Причина переноса</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Болезнь врача..." style={styles.input} required />
        </div>

        <button type="submit" style={styles.btn}>Создать предложение переноса</button>
      </form>
    </div>
  );
}

const styles = {
  container: { padding: "40px", color: "#fff", fontFamily: "'Outfit', sans-serif" },
  title: { fontSize: "32px", fontWeight: 700, margin: "0 0 8px 0" },
  sub: { color: "#94a3b8", fontSize: "16px", margin: "0 0 40px 0" },
  card: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "30px", borderRadius: "20px", maxWidth: "500px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" },
  label: { fontSize: "13px", color: "#94a3b8" },
  select: { background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" },
  input: { background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" },
  btn: { background: "#6366f1", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "12px", cursor: "pointer", fontWeight: 600 },
  alert: { color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", padding: "12px", borderRadius: "10px", marginBottom: "20px", maxWidth: "500px" }
};
