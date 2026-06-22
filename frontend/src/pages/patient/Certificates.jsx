import { useState, useEffect } from "react";
import api from "../../api/api";
import { RiFilePaper2Line, RiDownload2Line } from "react-icons/ri";

export default function Certificates() {
  const [certs, setCerts] = useState([]);

  useEffect(() => {
    async function loadCerts() {
      try {
        const res = await api.get("/certificates");
        if (res.data?.success) {
          setCerts(res.data.data);
        }
      } catch (err) {
        console.warn(err);
      }
    }
    loadCerts();
  }, []);

  const handleDownload = async (filePath) => {
    try {
      const res = await api.get(`/medical-documents/signed-url?bucketName=certificates&filePath=${encodeURIComponent(filePath)}`);
      if (res.data?.success && res.data?.signedUrl) {
        // Open the signed url in new window
        window.open(res.data.signedUrl, "_blank");
      }
    } catch (err) {
      alert("Не удалось скачать файл: " + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Медицинские справки</h2>
      <p style={styles.sub}>Список выданных вам больничных листов, справок и освобождений.</p>

      <div style={styles.grid}>
        {certs.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>У вас пока нет выданных справок.</p>
        ) : (
          certs.map((c) => (
            <div key={c.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <RiFilePaper2Line style={styles.icon} />
                <h3 style={styles.cardTitle}>{c.title}</h3>
              </div>
              <p style={styles.type}>Тип: {c.certificate_type}</p>
              <p style={styles.org}>Организация: {c.organization?.name}</p>
              {c.valid_until && <p style={styles.expiry}>Действителен до: {new Date(c.valid_until).toLocaleDateString()}</p>}
              
              <button onClick={() => handleDownload(c.file_url)} style={styles.downloadBtn}>
                <RiDownload2Line /> Просмотр / Скачать
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "40px", color: "#fff", fontFamily: "'Outfit', sans-serif" },
  title: { fontSize: "32px", fontWeight: 700, margin: "0 0 8px 0" },
  sub: { color: "#94a3b8", fontSize: "16px", margin: "0 0 40px 0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" },
  card: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", gap: "10px" },
  cardHeader: { display: "flex", alignItems: "center", gap: "10px" },
  icon: { fontSize: "24px", color: "#10b981" },
  cardTitle: { fontSize: "18px", margin: 0, fontWeight: 600 },
  type: { fontSize: "14px", color: "#e2e8f0", margin: 0 },
  org: { fontSize: "14px", color: "#94a3b8", margin: 0 },
  expiry: { fontSize: "13px", color: "#f59e0b", margin: 0, fontWeight: 600 },
  downloadBtn: { background: "#6366f1", border: "none", color: "#fff", padding: "10px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", marginTop: "10px" }
};
