import { useState, useEffect } from "react";
import api from "../../api/api";

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  async function loadDepts() {
    try {
      const res = await api.get("/departments");
      if (res.data?.success) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      console.warn(err);
    }
  }

  useEffect(() => {
    loadDepts();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await api.post("/departments", { name });
      if (res.data?.success) {
        setMsg("Отделение создано.");
        setName("");
        loadDepts();
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Управление отделениями</h2>
      <p style={styles.sub}>Создавайте и настраивайте отделения и кабинеты вашей клиники.</p>

      {msg && <p style={styles.alert}>{msg}</p>}

      <div style={styles.flex}>
        <form onSubmit={handleCreate} style={styles.card}>
          <h3 style={styles.cardTitle}>Новое отделение</h3>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Название отделения</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Терапия..." style={styles.input} required />
          </div>
          <button type="submit" style={styles.btn}>Создать отделение</button>
        </form>

        <div style={styles.listCard}>
          <h3 style={styles.cardTitle}>Зарегистрированные отделения</h3>
          <div style={styles.list}>
            {departments.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>Отделения не созданы.</p>
            ) : (
              departments.map(d => (
                <div key={d.id} style={styles.listItem}>
                  {d.name}
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
  card: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "20px", flex: 1, minWidth: "280px" },
  listCard: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "20px", flex: 2, minWidth: "300px" },
  cardTitle: { fontSize: "20px", fontWeight: 600, margin: "0 0 20px 0" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" },
  label: { fontSize: "13px", color: "#94a3b8" },
  input: { background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" },
  btn: { background: "#6366f1", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "12px", cursor: "pointer", fontWeight: 600 },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  listItem: { background: "rgba(0,0,0,0.15)", padding: "14px 16px", borderRadius: "10px" },
  alert: { color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", padding: "12px", borderRadius: "10px", marginBottom: "20px", maxWidth: "500px" }
};
