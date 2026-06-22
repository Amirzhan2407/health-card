import { useState, useEffect } from "react";
import api from "../../api/api";
import { RiFileTextLine } from "react-icons/ri";

export default function Visits() {
  const [visits, setVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);

  useEffect(() => {
    async function loadVisits() {
      try {
        const res = await api.get("/visits");
        if (res.data?.success) {
          setVisits(res.data.data);
        }
      } catch (err) {
        console.warn(err);
      }
    }
    loadVisits();
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>История посещений</h2>
      <p style={styles.sub}>Архив ваших медицинских приемов и записей врачей.</p>

      <div style={styles.flex}>
        {/* Visit list */}
        <div style={styles.listCard}>
          <div style={styles.list}>
            {visits.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>У вас пока нет завершенных посещений.</p>
            ) : (
              visits.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVisit(v)}
                  style={{
                    ...styles.item,
                    ...(selectedVisit?.id === v.id ? styles.activeItem : {}),
                  }}
                >
                  <RiFileTextLine style={styles.icon} />
                  <div>
                    <h4 style={styles.itemTitle}>Прием у врача</h4>
                    <p style={styles.itemDoctor}>{v.doctor?.organization_members?.profiles?.full_name || "Врач"}</p>
                  </div>
                  <span style={styles.date}>{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected visit detail view */}
        <div style={styles.detailCard}>
          {selectedVisit ? (
            <div>
              <h3 style={styles.detailTitle}>Протокол приема от {new Date(selectedVisit.created_at).toLocaleDateString()}</h3>
              <p style={styles.detailDoc}>Врач: {selectedVisit.doctor?.organization_members?.profiles?.full_name}</p>
              
              <div style={styles.field}>
                <span style={styles.label}>Жалобы</span>
                <p style={styles.text}>{selectedVisit.complaints || "Нет данных"}</p>
              </div>

              <div style={styles.field}>
                <span style={styles.label}>Диагноз</span>
                <p style={styles.text}>{selectedVisit.final_diagnosis || selectedVisit.preliminary_diagnosis || "Нет данных"}</p>
              </div>

              <div style={styles.field}>
                <span style={styles.label}>Назначение и рекомендации</span>
                <p style={styles.text}>{selectedVisit.treatment || selectedVisit.recommendations || "Нет данных"}</p>
              </div>
            </div>
          ) : (
            <p style={{ color: "#94a3b8", textAlign: "center", marginTop: "100px" }}>Выберите прием для просмотра деталей.</p>
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
  flex: { display: "flex", gap: "30px", flexWrap: "wrap" },
  listCard: { background: "rgba(30, 41, 59, 0.4)", padding: "24px", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.05)", flex: 1, minWidth: "300px" },
  detailCard: { background: "rgba(30, 41, 59, 0.4)", padding: "30px", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.05)", flex: 2, minWidth: "300px" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  item: { display: "flex", alignItems: "center", gap: "16px", background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "12px", cursor: "pointer", transition: "all 0.2s ease" },
  activeItem: { border: "1px solid #6366f1", background: "rgba(99,102,241,0.1)" },
  icon: { fontSize: "24px", color: "#6366f1" },
  itemTitle: { fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0" },
  itemDoctor: { fontSize: "13px", color: "#94a3b8", margin: 0 },
  date: { fontSize: "13px", color: "#64748b", marginLeft: "auto" },
  detailTitle: { fontSize: "22px", fontWeight: 600, margin: "0 0 8px 0" },
  detailDoc: { fontSize: "14px", color: "#94a3b8", margin: "0 0 24px 0" },
  field: { marginBottom: "20px" },
  label: { fontSize: "12px", color: "#6366f1", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "6px" },
  text: { background: "rgba(0,0,0,0.2)", padding: "14px", borderRadius: "10px", margin: 0, fontSize: "15px", color: "#e2e8f0", lineHeight: "1.5" }
};
