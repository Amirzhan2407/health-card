import { useState } from "react";
import api from "../../api/api";
import { RiUserSearchLine, RiHeartPulseLine } from "react-icons/ri";

export default function PatientCard() {
  const [iin, setIin] = useState("");
  const [card, setCard] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (iin.length !== 12) {
      return setErrorMsg("ИИН должен состоять из 12 цифр.");
    }

    setLoading(true);
    setErrorMsg("");
    setCard(null);

    try {
      const res = await api.get(`/medical-card?iin=${iin}`);
      if (res.data?.success) {
        setCard(res.data.data);
      }
    } catch (err) {
      setErrorMsg(err.message || "Пациент не найден или доступ ограничен.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Медицинские карты пациентов</h2>
      <p style={styles.sub}>Поиск и просмотр истории болезни пациентов вашей организации.</p>

      {/* Search box */}
      <form onSubmit={handleSearch} style={styles.searchBar}>
        <input
          type="text"
          value={iin}
          onChange={e => setIin(e.target.value)}
          placeholder="Введите 12-значный ИИН пациента..."
          style={styles.input}
          maxLength={12}
          required
        />
        <button type="submit" style={styles.searchButton}>
          <RiUserSearchLine /> Найти карту
        </button>
      </form>

      {errorMsg && <div style={styles.error}>{errorMsg}</div>}
      {loading && <p style={{ color: "#94a3b8" }}>Загрузка медицинской карты...</p>}

      {card && (
        <div style={styles.flexContainer}>
          {/* Profile overview */}
          <div style={styles.profileCard}>
            <h3 style={styles.sectionTitle}>Профиль</h3>
            <p><strong>ФИО:</strong> {card.profile.full_name}</p>
            <p><strong>ИИН:</strong> {card.profile.iin}</p>
            <p><strong>Пол:</strong> {card.profile.gender === "male" ? "Мужской" : "Женский"}</p>
          </div>

          {/* Visits history */}
          <div style={styles.historyCard}>
            <h3 style={styles.sectionTitle}>История приемов</h3>
            <div style={styles.list}>
              {card.visits.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>Записи приемов отсутствуют.</p>
              ) : (
                card.visits.map((v) => (
                  <div key={v.id} style={styles.listItem}>
                    <h4 style={{ margin: "0 0 4px 0" }}>Диагноз: {v.final_diagnosis || "Не указан"}</h4>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>Лечение: {v.treatment}</p>
                    <span style={{ color: "#64748b", fontSize: "12px" }}>Дата: {new Date(v.created_at).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: "40px", color: "#fff", fontFamily: "'Outfit', sans-serif" },
  title: { fontSize: "32px", fontWeight: 700, margin: "0 0 8px 0" },
  sub: { color: "#94a3b8", fontSize: "16px", margin: "0 0 40px 0" },
  searchBar: { display: "flex", gap: "12px", background: "rgba(30, 41, 59, 0.4)", padding: "16px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.05)", marginBottom: "30px", maxWidth: "500px" },
  input: { flex: 1, background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" },
  searchButton: { background: "#6366f1", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "12px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" },
  error: { background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", padding: "16px", borderRadius: "12px", marginBottom: "20px", maxWidth: "500px" },
  flexContainer: { display: "flex", gap: "30px", flexWrap: "wrap" },
  profileCard: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "20px", flex: 1, minWidth: "260px" },
  historyCard: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "20px", flex: 2, minWidth: "320px" },
  sectionTitle: { fontSize: "20px", fontWeight: 600, margin: "0 0 20px 0" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  listItem: { background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "12px" }
};
