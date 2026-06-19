import { useEffect, useState } from "react";
import { adminRequest } from "../api/adminApi";

function PieChart({ title, stats }) {
  const total = stats?.total || 0;

  const items = [
    { label: "Открыты", value: stats?.opened || 0, color: "#22c55e" },
    { label: "Не открылись", value: stats?.notOpened || 0, color: "#64748b" },
    { label: "В процессе", value: stats?.inProcess || 0, color: "#f59e0b" },
    { label: "Ожидают ЭЦП", value: stats?.waitingEds || 0, color: "#3b82f6" },
    { label: "Отклонены", value: stats?.rejected || 0, color: "#ef4444" },
  ];

  let current = 0;

  const gradient =
    total > 0
      ? items
          .map((item) => {
            const start = current;
            const end = current + (item.value / total) * 100;
            current = end;
            return `${item.color} ${start}% ${end}%`;
          })
          .join(", ")
      : "#1e293b 0% 100%";

  return (
    <div className="chartCard">
      <h2>{title}</h2>

      <div className="pie" style={{ background: `conic-gradient(${gradient})` }}>
        <div>
          <b>{total}</b>
          <span>всего</span>
        </div>
      </div>

      <div className="legend">
        {items.map((item) => (
          <p key={item.label}>
            <span>{item.label}</span>
            <b>{item.value}</b>
          </p>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
 const [dashboard, setDashboard] = useState({ categoryStats: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const result = await adminRequest("/api/admin-dashboard");
      setDashboard(result?.dashboard || { categoryStats: [] });
    } catch (err) {
      setError(err.message || "Не удалось загрузить главную.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const categoryStats = Array.isArray(dashboard?.categoryStats) ? dashboard.categoryStats : [];

  return (
    <main className="dashPage">
      <section className="dashHead">
        <div>
          <h1>Главная</h1>
          <p>Статистика по организациям и заявкам.</p>
        </div>

        <button onClick={loadDashboard}>
          {loading ? "Загрузка..." : "Обновить"}
        </button>
      </section>

      {error ? <div className="dashError">{error}</div> : null}

      <section className="charts">
        {categoryStats.map((item) => (
          <PieChart key={item.key} title={item.title} stats={item.stats} />
        ))}
      </section>

      <style>{`
        .dashPage { min-height: 100vh; padding: 40px; color: #fff; }
        .dashHead { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 26px; }
        .dashHead h1 { margin: 0 0 10px; font-size: 42px; font-weight: 950; }
        .dashHead p { margin: 0; color: #9fb2c8; }
        .dashHead button { border: 0; border-radius: 14px; background: #10f3df; color: #06202e; padding: 12px 18px; font-weight: 950; cursor: pointer; }
        .dashError { margin-bottom: 18px; padding: 16px; border-radius: 16px; color: #fecaca; background: rgba(127,29,29,.38); border: 1px solid rgba(248,113,113,.4); font-weight: 800; }
        .charts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
        .chartCard { background: rgba(15,23,42,.78); border: 1px solid rgba(148,163,184,.14); border-radius: 26px; padding: 22px; }
        .chartCard h2 { margin: 0 0 20px; }
        .pie { width: 210px; height: 210px; border-radius: 50%; margin: 0 auto 22px; display: grid; place-items: center; }
        .pie div { width: 112px; height: 112px; border-radius: 50%; background: #020617; display: grid; place-items: center; text-align: center; }
        .pie b { font-size: 28px; }
        .pie span { color: #9fb2c8; font-size: 12px; }
        .legend { display: grid; gap: 10px; }
        .legend p { margin: 0; display: flex; justify-content: space-between; background: rgba(2,6,23,.34); border-radius: 12px; padding: 10px 12px; }
        .legend span { color: #cbd5e1; }
        @media (max-width: 1100px) { .charts { grid-template-columns: 1fr; } }
        @media (max-width: 760px) { .dashPage { padding: 20px 14px; } .dashHead { display: block; } .dashHead h1 { font-size: 32px; } .dashHead button { margin-top: 16px; } }
      `}</style>
    </main>
  );
}