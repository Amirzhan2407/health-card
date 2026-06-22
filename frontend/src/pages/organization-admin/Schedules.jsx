import { useState, useEffect } from "react";
import api from "../../api/api";

export default function Schedules() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [workDays, setWorkDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadDocs() {
      try {
        const res = await api.get("/doctors");
        if (res.data?.success) {
          setDoctors(res.data.data);
        }
      } catch (err) {
        console.warn(err);
      }
    }
    loadDocs();
  }, []);

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await api.post("/schedule/standard", {
        doctorId: selectedDoc,
        workDays,
        workStart,
        workEnd,
      });
      if (res.data?.success) {
        setMsg("Расписание успешно сохранено.");
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Расписание врачей</h2>
      <p style={styles.sub}>Настройка стандартных рабочих смен и приемов для врачей клиники.</p>

      {msg && <p style={styles.alert}>{msg}</p>}

      <form onSubmit={handleSaveSchedule} style={styles.card}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Выберите врача</label>
          <select value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)} style={styles.select} required>
            <option value="">Выберите врача...</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </select>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Начало работы</label>
          <input type="text" value={workStart} onChange={e => setWorkStart(e.target.value)} placeholder="09:00" style={styles.input} required />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Конец работы</label>
          <input type="text" value={workEnd} onChange={e => setWorkEnd(e.target.value)} placeholder="18:00" style={styles.input} required />
        </div>

        <button type="submit" style={styles.btn}>Сохранить расписание</button>
      </form>
    </div>
  );
}

const styles = {
  container: { padding: "40px", color: "#fff", fontFamily: "'Outfit', sans-serif" },
  title: { fontSize: "32px", fontWeight: 700, margin: "0 0 8px 0" },
  sub: { color: "#94a3b8", fontSize: "16px", margin: "0 0 40px 0" },
  card: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "30px", borderRadius: "20px", maxWidth: "500px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" },
  label: { fontSize: "13px", color: "#94a3b8" },
  select: { background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" },
  input: { background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" },
  btn: { background: "#6366f1", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "12px", cursor: "pointer", fontWeight: 600 },
  alert: { color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", padding: "12px", borderRadius: "10px", marginBottom: "20px", maxWidth: "500px" }
};
