import { useState, useEffect } from "react";
import api from "../../api/api";
import { RiUserAddLine, RiTeamLine } from "react-icons/ri";

export default function OrgAdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Doctor creation fields
  const [iin, setIin] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [roomId, setRoomId] = useState("");

  const [msg, setMsg] = useState("");

  async function loadDoctors() {
    try {
      const res = await api.get("/doctors");
      if (res.data?.success) {
        setDoctors(res.data.data);
      }
    } catch (err) {
      console.warn(err);
    }
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await api.post("/doctors", {
        iin,
        fullName,
        email,
        phone,
        password,
        specialtyId: specialtyId || null,
        roomId: roomId || null,
      });

      if (res.data?.success) {
        setMsg("Профиль врача успешно создан.");
        setShowAddForm(false);
        // Clear inputs
        setIin("");
        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
        loadDoctors();
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Управление врачами клиники</h2>
      <p style={styles.sub}>Добавляйте, архивируйте и просматривайте профили врачей вашей организации.</p>

      {msg && <p style={styles.alert}>{msg}</p>}

      <div style={styles.actionHeader}>
        <button onClick={() => setShowAddForm(!showAddForm)} style={styles.addBtn}>
          <RiUserAddLine /> {showAddForm ? "Скрыть форму" : "Добавить врача"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateDoctor} style={styles.formCard}>
          <h3 style={styles.cardTitle}>Новый врач</h3>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>ИИН</label>
              <input type="text" value={iin} onChange={e => setIin(e.target.value)} style={styles.input} maxLength={12} required />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>ФИО</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={styles.input} required />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Телефон</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            </div>
          </div>
          <button type="submit" style={styles.submitBtn}>Создать</button>
        </form>
      )}

      {/* Doctor list */}
      <div style={styles.listCard}>
        <div style={styles.grid}>
          {doctors.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>В вашей организации еще нет зарегистрированных врачей.</p>
          ) : (
            doctors.map((d) => (
              <div key={d.id} style={styles.doctorItem}>
                <RiTeamLine style={{ fontSize: "24px", color: "#6366f1" }} />
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontWeight: 600 }}>{d.fullName}</h4>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>ИИН: {d.iin} | {d.email}</p>
                </div>
                <span style={{ marginLeft: "auto", fontSize: "12px", background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "4px 8px", borderRadius: "6px" }}>
                  {d.status}
                </span>
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
  actionHeader: { marginBottom: "20px" },
  addBtn: { background: "#6366f1", border: "none", color: "#fff", padding: "12px 20px", borderRadius: "12px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" },
  formCard: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "20px", marginBottom: "30px" },
  cardTitle: { fontSize: "20px", margin: "0 0 20px 0" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", color: "#94a3b8" },
  input: { background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" },
  submitBtn: { background: "#10b981", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "12px", cursor: "pointer", fontWeight: 600 },
  listCard: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "20px" },
  grid: { display: "flex", flexDirection: "column", gap: "12px" },
  doctorItem: { display: "flex", alignItems: "center", gap: "16px", background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "12px" },
  alert: { color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", padding: "12px", borderRadius: "10px", marginBottom: "20px" }
};
