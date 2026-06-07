import { useEffect, useMemo, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://health-card.onrender.com";

function getToken() {
  const adminData = JSON.parse(localStorage.getItem("adminData") || "null");

  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    adminData?.token ||
    ""
  );
}

function PieChart({ title, stats }) {
  const total = stats?.total || 0;

  const items = [
    { label: "Открыты", value: stats?.opened || 0 },
    { label: "Не открылись", value: stats?.notOpened || 0 },
    { label: "В процессе", value: stats?.inProcess || 0 },
    { label: "Ожидают ЭЦП", value: stats?.waitingEds || 0 },
    { label: "Отклонены", value: stats?.rejected || 0 },
  ];

  let current = 0;

  const gradient =
    total > 0
      ? items
          .map((item, index) => {
            const start = current;
            const end = current + (item.value / total) * 100;
            current = end;

            const colors = [
              "#22c55e",
              "#64748b",
              "#f59e0b",
              "#3b82f6",
              "#ef4444",
            ];

            return `${colors[index]} ${start}% ${end}%`;
          })
          .join(", ")
      : "#1e293b 0% 100%";

  return (
    <div className="dashboardChartCard">
      <h2>{title}</h2>

      <div
        className="pieChart"
        style={{
          background: `conic-gradient(${gradient})`,
        }}
      >
        <div>
          <strong>{total}</strong>
          <span>всего</span>
        </div>
      </div>

      <div className="chartLegend">
        {items.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <b>{item.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const token = useMemo(() => getToken(), []);

  async function loadDashboard() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/super-admin-dashboard`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "Не удалось загрузить главную.");
      }

      setDashboard(result.dashboard || result.data || result);
    } catch (err) {
      setError(err.message || "Ошибка загрузки главной.");
      setDashboard(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const categoryStats = dashboard?.categoryStats || [];

  return (
    <main className="adminDashboardPage">
      <section className="dashboardHead">
        <div>
          <h1>Главная</h1>
          <p>
            Общая статистика по организациям: поликлиники, больницы и частные
            клиники.
          </p>
        </div>

        <button type="button" onClick={loadDashboard} disabled={isLoading}>
          {isLoading ? "Загрузка..." : "Обновить"}
        </button>
      </section>

      {error ? <div className="dashboardError">{error}</div> : null}

      <section className="dashboardCharts">
        {categoryStats.length ? (
          categoryStats.map((item) => (
            <PieChart key={item.key} title={item.title} stats={item.stats} />
          ))
        ) : (
          <>
            <PieChart
              title="Государственные поликлиники"
              stats={{
                total: 0,
                opened: 0,
                notOpened: 0,
                inProcess: 0,
                waitingEds: 0,
                rejected: 0,
              }}
            />
            <PieChart
              title="Государственные больницы"
              stats={{
                total: 0,
                opened: 0,
                notOpened: 0,
                inProcess: 0,
                waitingEds: 0,
                rejected: 0,
              }}
            />
            <PieChart
              title="Частные клиники"
              stats={{
                total: 0,
                opened: 0,
                notOpened: 0,
                inProcess: 0,
                waitingEds: 0,
                rejected: 0,
              }}
            />
          </>
        )}
      </section>

      <style>{`
        .adminDashboardPage {
          min-height: 100vh;
          padding: 40px;
          color: #fff;
        }

        .dashboardHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 26px;
        }

        .dashboardHead h1 {
          margin: 0 0 10px;
          font-size: 42px;
          font-weight: 950;
        }

        .dashboardHead p {
          margin: 0;
          color: #9fb2c8;
        }

        .dashboardHead button {
          border: 0;
          border-radius: 14px;
          background: #10f3df;
          color: #06202e;
          padding: 12px 18px;
          font-weight: 950;
          cursor: pointer;
        }

        .dashboardError {
          margin-bottom: 18px;
          padding: 16px;
          border-radius: 16px;
          color: #fecaca;
          background: rgba(127, 29, 29, 0.38);
          border: 1px solid rgba(248, 113, 113, 0.4);
          font-weight: 800;
        }

        .dashboardCharts {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .dashboardChartCard {
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 26px;
          padding: 22px;
        }

        .dashboardChartCard h2 {
          margin: 0 0 20px;
          font-size: 20px;
        }

        .pieChart {
          width: 210px;
          height: 210px;
          border-radius: 50%;
          margin: 0 auto 22px;
          display: grid;
          place-items: center;
        }

        .pieChart div {
          width: 112px;
          height: 112px;
          border-radius: 50%;
          background: #020617;
          display: grid;
          place-items: center;
          text-align: center;
        }

        .pieChart strong {
          font-size: 28px;
          line-height: 1;
        }

        .pieChart span {
          color: #9fb2c8;
          font-size: 12px;
          font-weight: 900;
        }

        .chartLegend {
          display: grid;
          gap: 10px;
        }

        .chartLegend div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border-radius: 12px;
          background: rgba(2, 6, 23, 0.34);
          padding: 10px 12px;
        }

        .chartLegend span {
          color: #cbd5e1;
        }

        @media (max-width: 1100px) {
          .dashboardCharts {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .adminDashboardPage {
            padding: 20px 14px;
          }

          .dashboardHead {
            display: block;
          }

          .dashboardHead h1 {
            font-size: 32px;
          }

          .dashboardHead button {
            margin-top: 16px;
          }
        }
      `}</style>
    </main>
  );
}