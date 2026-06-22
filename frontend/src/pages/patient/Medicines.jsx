import { useState } from "react";
import api from "../../api/api";
import { RiSearchLine, RiStore2Line } from "react-icons/ri";

export default function Medicines() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("almaty");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setResults([]);

    try {
      const res = await api.get(`/medicine/search?q=${encodeURIComponent(query)}&city=${city}`);
      if (res.data?.success) {
        setResults(res.data.data);
      }
    } catch (err) {
      setErrorMsg(err.message || "Ошибка загрузки данных о лекарствах.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Поиск лекарств</h2>
      <p style={styles.sub}>Наличие и цены на лекарства в аптеках вашего города.</p>

      {/* Search form */}
      <form onSubmit={handleSearch} style={styles.searchBar}>
        <select value={city} onChange={e => setCity(e.target.value)} style={styles.select}>
          <option value="almaty">Алматы</option>
          <option value="astana">Астана</option>
          <option value="shymkent">Шымкент</option>
          <option value="karaganda">Караганда</option>
        </select>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Введите название препарата (например, Парацетамол)..."
          style={styles.input}
          required
        />
        <button type="submit" style={styles.searchButton}>
          <RiSearchLine /> Поиск
        </button>
      </form>

      {errorMsg && <div style={styles.error}>{errorMsg}</div>}
      {loading && <p style={{ color: "#94a3b8" }}>Поиск предложений в аптеках...</p>}

      {/* Results grid */}
      <div style={styles.grid}>
        {results.map((item, idx) => (
          <div key={idx} style={styles.card}>
            <div style={styles.cardHeader}>
              <RiStore2Line style={styles.pharmacyIcon} />
              <h3 style={styles.pharmacyName}>{item.pharmacyName}</h3>
            </div>
            <p style={styles.address}>{item.address}</p>
            <div style={styles.cardFooter}>
              <span style={styles.price}>{item.price} ₸</span>
              <span style={{
                ...styles.badge,
                color: item.availability === "В наличии" ? "#10b981" : "#f59e0b",
                background: item.availability === "В наличии" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)"
              }}>
                {item.availability}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "40px", color: "#fff", fontFamily: "'Outfit', sans-serif" },
  title: { fontSize: "32px", fontWeight: 700, margin: "0 0 8px 0" },
  sub: { color: "#94a3b8", fontSize: "16px", margin: "0 0 40px 0" },
  searchBar: { display: "flex", gap: "12px", background: "rgba(30, 41, 59, 0.4)", padding: "16px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.05)", marginBottom: "30px", flexWrap: "wrap" },
  select: { background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px", color: "#fff", outline: "none", minWidth: "140px" },
  input: { flex: 1, background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none", minWidth: "200px" },
  searchButton: { background: "#10b981", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "12px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" },
  error: { background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", padding: "16px", borderRadius: "12px", marginBottom: "20px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" },
  card: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" },
  cardHeader: { display: "flex", alignItems: "center", gap: "8px" },
  pharmacyIcon: { fontSize: "20px", color: "#10b981" },
  pharmacyName: { fontSize: "18px", margin: 0, fontWeight: 600 },
  address: { fontSize: "14px", color: "#94a3b8", margin: 0, lineHeight: "1.4" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", pt: "10px" },
  price: { fontSize: "20px", fontWeight: 700, color: "#fff" },
  badge: { padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }
};
