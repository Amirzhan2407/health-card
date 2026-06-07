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

function formatStatus(status) {
  const map = {
    active: "Открыта",
    opened: "Открыта",
    connected: "Подключена",
    waiting_eds: "Ожидает ЭЦП",
    in_progress: "В процессе",
    rejected: "Отклонена",
    blocked: "Заблокирована",
  };

  return map[status] || status || "—";
}

function categoryLabel(type) {
  const map = {
    state_polyclinic: "Государственная поликлиника",
    state_hospital: "Государственная больница",
    private_clinic: "Частная клиника",
    gov_polyclinic: "Государственная поликлиника",
    gov_hospital: "Государственная больница",
  };

  return map[type] || type || "—";
}

export default function AdminOrganizations() {
  const [organizations, setOrganizations] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const token = useMemo(() => getToken(), []);

  async function loadOrganizations() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/organizations`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Список организаций пока не подключён на backend."
        );
      }

      const list = Array.isArray(result)
        ? result
        : result.organizations || result.data || [];

      setOrganizations(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(
        err.message ||
          "Организации пока не загружаются. Backend для организаций подключим следующим шагом."
      );
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrganizations();
  }, []);

  return (
    <main className="adminOrganizationsPage">
      <section className="orgHead">
        <div>
          <h1>Организации</h1>
          <p>
            Список подключённых больниц, поликлиник и частных клиник. После
            одобрения заявок организации будут появляться здесь.
          </p>
        </div>

        <button type="button" onClick={loadOrganizations} disabled={isLoading}>
          {isLoading ? "Загрузка..." : "Обновить"}
        </button>
      </section>

      {error ? <div className="orgNotice">{error}</div> : null}

      <section className="orgCard">
        <div className="orgTable">
          <div className="orgRow orgRowHead">
            <span>Название</span>
            <span>Категория</span>
            <span>БИН</span>
            <span>Город</span>
            <span>Главный врач</span>
            <span>Статус</span>
          </div>

          {isLoading ? (
            <div className="emptyOrg">Загрузка...</div>
          ) : organizations.length === 0 ? (
            <div className="emptyOrg">Организаций пока нет</div>
          ) : (
            organizations.map((org) => (
              <div key={org.id} className="orgRow">
                <span>{org.organization_name || "—"}</span>
                <span>{categoryLabel(org.organization_type)}</span>
                <span>{org.bin || "—"}</span>
                <span>{org.city || "—"}</span>
                <span>{org.chief_doctor_full_name || "—"}</span>
                <span>
                  <b>{formatStatus(org.status)}</b>
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <style>{`
        .adminOrganizationsPage {
          min-height: 100vh;
          padding: 40px;
          color: #fff;
        }

        .orgHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }

        .orgHead h1 {
          margin: 0 0 10px;
          font-size: 42px;
          font-weight: 950;
        }

        .orgHead p {
          margin: 0;
          color: #9fb2c8;
        }

        .orgHead button {
          border: 0;
          border-radius: 14px;
          background: #10f3df;
          color: #06202e;
          padding: 12px 18px;
          font-weight: 950;
          cursor: pointer;
        }

        .orgNotice {
          margin-bottom: 18px;
          padding: 16px;
          border-radius: 16px;
          color: #fde68a;
          background: rgba(120, 53, 15, 0.35);
          border: 1px solid rgba(251, 191, 36, 0.35);
          font-weight: 800;
        }

        .orgCard {
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 26px;
          padding: 20px;
          overflow-x: auto;
        }

        .orgRow {
          min-width: 1000px;
          display: grid;
          grid-template-columns: 240px 220px 140px 150px 220px 150px;
          gap: 14px;
          padding: 15px 16px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          color: #dbeafe;
        }

        .orgRowHead {
          background: rgba(30, 41, 59, 0.72);
          border-radius: 16px;
          color: #9fb2c8;
          font-weight: 950;
        }

        .emptyOrg {
          padding: 28px 16px;
          color: #9fb2c8;
          font-weight: 800;
        }

        @media (max-width: 700px) {
          .adminOrganizationsPage {
            padding: 20px 14px;
          }

          .orgHead {
            display: block;
          }

          .orgHead h1 {
            font-size: 32px;
          }

          .orgHead button {
            margin-top: 16px;
          }
        }
      `}</style>
    </main>
  );
}