import { useState, useEffect } from "react";
import api from "../../api/api";
import { RiHeartPulseLine } from "react-icons/ri";

export default function Metrics() {
  const [metrics, setMetrics] = useState([]);
  const [type, setType] = useState("weight");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("кг");
  const [msg, setMsg] = useState("");

  const handleAddMetric = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await api.post("/health-metrics", {
        metricType: type,
        value,
        unit,
      });
      if (res.data?.success) {
        setMsg("Показатель успешно добавлен.");
        setValue("");
        // Reload metrics
        loadMetrics();
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  async function loadMetrics() {
    try {
      const res = await api.get("/health-metrics");
      if (res.data?.success) {
        setMetrics(res.data.data);
      }
    } catch (err) {
      console.warn(err);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Мониторинг здоровья</h2>
      <p style={styles.sub}>Записывайте свои показатели для отслеживания динамики.</p>

      <div style={styles.flex}>
        {/* Add Form */}
        <form onSubmit={handleAddMetric} style={styles.card}>
          <h3 style={styles.cardTitle}>Добавить показатель</h3>
          {msg && <p style={styles.msg}>{msg}</p>}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Тип измерения</label>
            <select value={type} onChange={e => {
              const val = e.target.value;
              setType(val);
              setUnit(val === "weight" ? "кг" : val === "height" ? "см" : val === "blood_sugar" ? "ммоль/л" : "");
            }} style={styles.select}>
              <option value="weight">Вес</option>
              <option value="height">Рост</option>
              <option value="blood_sugar">Сахар в крови</option>
              <option value="pulse">Пульс</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Значение ({unit})</label>
            <input type="number" step="any" value={value} onChange={e => setValue(e.target.value)} style={styles.input} required />
          </div>

          <button type="submit" style={styles.button}>Сохранить</button>
        </form>

        {/* History List */}
        <div style={styles.historyCard}>
          <h3 style={styles.cardTitle}>История измерений</h3>
          <div style={styles.list}>
            {metrics.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>Пока нет записей.</p>
            ) : (
              metrics.map((m) => (
                <div key={m.id} style={styles.item}>
                  <RiHeartPulseLine style={{ color: "#10b981", fontSize: "20px" }} />
                  <div>
                    <span style={{ fontWeight: 600 }}>{m.metric_type === "weight" ? "Вес" : m.metric_type === "height" ? "Рост" : m.metric_type === "bmi" ? "ИМТ" : m.metric_type}: </span>
                    <span>{m.value} {m.unit}</span>
                  </div>
                  <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "auto" }}>{new Date(m.measured_at).toLocaleDateString()}</span>
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
  card: { background: "rgba(30, 41, 59, 0.4)", padding: "24px", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.05)", flex: 1, minWidth: "300px", maxWidth: "400px" },
  historyCard: { background: "rgba(30, 41, 59, 0.4)", padding: "24px", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.05)", flex: 2, minWidth: "300px" },
  cardTitle: { fontSize: "20px", fontWeight: 600, margin: "0 0 20px 0" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" },
  label: { fontSize: "13px", color: "#94a3b8" },
  input: { background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" },
  select: { background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" },
  button: { background: "#6366f1", border: "none", color: "#fff", padding: "12px", borderRadius: "12px", cursor: "pointer", fontWeight: 600 },
  list: { display: "flex", flexDirection: "column", gap: "12px", maxHeight: "350px", overflowY: "auto" },
  item: { display: "flex", alignItems: "center", gap: "12px", background: "rgba(0,0,0,0.15)", padding: "12px 16px", borderRadius: "12px" },
  msg: { color: "#10b981", fontSize: "14px", marginBottom: "10px" }
};
