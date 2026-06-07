import { useEffect, useMemo, useState } from "react";
import { adminRequest, getAdminData } from "../api/adminApi";

const CATEGORY_LABELS = {
  state_polyclinic: "Государственная поликлиника",
  state_hospital: "Государственная больница",
  private_clinic: "Частная клиника",
  gov_polyclinic: "Государственная поликлиника",
  gov_hospital: "Государственная больница",
};

const STATUS_LABELS = {
  active: "Открыта",
  opened: "Открыта",
  connected: "Подключена",
  waiting_eds: "Ожидает ЭЦП",
  in_progress: "В процессе",
  rejected: "Отклонена",
  blocked: "Заблокирована",
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status || "—";
}

function categoryLabel(type, fallback) {
  return fallback || CATEGORY_LABELS[type] || type || "—";
}

export default function AdminOrganizations() {
  const adminData = getAdminData();

  const [organizations, setOrganizations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadOrganizations() {
    setLoading(true);
    setError("");

    try {
      const result = await adminRequest("/api/organizations");
      setOrganizations(result.organizations || []);
    } catch (err) {
      setOrganizations([]);
      setError(err.message || "Не удалось загрузить организации.");
    } finally {
      setLoading(false);
    }
  }

  function openOrganization(org) {
    setSelected(org);
    setForm({
      organization_name: org.organization_name || "",
      organization_type: org.organization_type || "",
      organization_type_label: org.organization_type_label || "",
      bin: org.bin || "",
      city: org.city || "",
      address: org.address || "",
      chief_doctor_full_name: org.chief_doctor_full_name || "",
      chief_doctor_email: org.chief_doctor_email || "",
      chief_doctor_phone: org.chief_doctor_phone || "",
      organization_email: org.organization_email || "",
      organization_phone: org.organization_phone || "",
      status: org.status || "",
    });
  }

  function changeField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function saveOrganization() {
    if (!selected?.id) return;

    setSaving(true);
    setError("");

    try {
      const result = await adminRequest(`/api/organizations/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      const updated = result.organization;

      setOrganizations((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );

      setSelected(updated);
      openOrganization(updated);
    } catch (err) {
      setError(err.message || "Не удалось сохранить организацию.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadOrganizations();
  }, []);

  const filteredOrganizations = useMemo(() => {
    const text = search.trim().toLowerCase();

    return organizations.filter((org) => {
      const byCategory =
        category === "all" || org.organization_type === category;

      if (!byCategory) return false;

      if (!text) return true;

      const source = [
        org.organization_name,
        org.bin,
        org.city,
        org.address,
        org.chief_doctor_full_name,
        org.organization_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return source.includes(text);
    });
  }, [organizations, search, category]);

  return (
    <main className="orgPage">
      <section className="orgHead">
        <div>
          <h1>Организации</h1>
          <p>
            Список подключённых организаций. Здесь админ может изменять данные
            больницы, поликлиники или частной клиники.
          </p>
        </div>

        <button type="button" onClick={loadOrganizations} disabled={loading}>
          {loading ? "Загрузка..." : "Обновить"}
        </button>
      </section>

      {error ? <div className="orgError">{error}</div> : null}

      <section className="orgFilters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по названию, БИН, городу..."
        />

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">Все категории</option>
          <option value="state_polyclinic">Государственные поликлиники</option>
          <option value="state_hospital">Государственные больницы</option>
          <option value="private_clinic">Частные клиники</option>
        </select>
      </section>

      <section className="orgGrid">
        <div className="orgCard">
          <div className="orgTitle">
            <h2>Список организаций</h2>
            <span>{filteredOrganizations.length} шт.</span>
          </div>

          <div className="orgTable">
            <div className="orgRow orgRowHead">
              <span>Название</span>
              <span>Категория</span>
              <span>БИН</span>
              <span>Город</span>
              <span>Статус</span>
              <span></span>
            </div>

            {loading ? (
              <div className="emptyOrg">Загрузка...</div>
            ) : filteredOrganizations.length === 0 ? (
              <div className="emptyOrg">Организаций пока нет.</div>
            ) : (
              filteredOrganizations.map((org) => (
                <div key={org.id} className="orgRow">
                  <span>{org.organization_name || "—"}</span>
                  <span>
                    {categoryLabel(
                      org.organization_type,
                      org.organization_type_label
                    )}
                  </span>
                  <span>{org.bin || "—"}</span>
                  <span>{org.city || "—"}</span>
                  <span>
                    <b className={`status ${org.status || "none"}`}>
                      {statusLabel(org.status)}
                    </b>
                  </span>
                  <span>
                    <button
                      type="button"
                      className="openBtn"
                      onClick={() => openOrganization(org)}
                    >
                      Открыть
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="orgCard detailsOrg">
          {!selected ? (
            <div className="emptyDetails">
              <h2>Организация не выбрана</h2>
              <p>Выберите организацию из списка.</p>
            </div>
          ) : (
            <>
              <div className="detailsTop">
                <div>
                  <h2>{selected.organization_name || "Организация"}</h2>
                  <p>
                    {categoryLabel(
                      selected.organization_type,
                      selected.organization_type_label
                    )}
                  </p>
                </div>

                <b className={`status ${selected.status || "none"}`}>
                  {statusLabel(selected.status)}
                </b>
              </div>

              <div className="formGrid">
                <label>
                  <span>Название</span>
                  <input
                    value={form.organization_name}
                    onChange={(e) =>
                      changeField("organization_name", e.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Категория</span>
                  <select
                    value={form.organization_type}
                    onChange={(e) =>
                      changeField("organization_type", e.target.value)
                    }
                  >
                    <option value="">Не выбрано</option>
                    <option value="state_polyclinic">
                      Государственная поликлиника
                    </option>
                    <option value="state_hospital">
                      Государственная больница
                    </option>
                    <option value="private_clinic">Частная клиника</option>
                  </select>
                </label>

                <label>
                  <span>БИН</span>
                  <input
                    value={form.bin}
                    onChange={(e) => changeField("bin", e.target.value)}
                  />
                </label>

                <label>
                  <span>Город</span>
                  <input
                    value={form.city}
                    onChange={(e) => changeField("city", e.target.value)}
                  />
                </label>

                <label className="wide">
                  <span>Адрес</span>
                  <input
                    value={form.address}
                    onChange={(e) => changeField("address", e.target.value)}
                  />
                </label>

                <label>
                  <span>ФИО главного врача</span>
                  <input
                    value={form.chief_doctor_full_name}
                    onChange={(e) =>
                      changeField("chief_doctor_full_name", e.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Email главного врача</span>
                  <input
                    value={form.chief_doctor_email}
                    onChange={(e) =>
                      changeField("chief_doctor_email", e.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Телефон главного врача</span>
                  <input
                    value={form.chief_doctor_phone}
                    onChange={(e) =>
                      changeField("chief_doctor_phone", e.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Email организации</span>
                  <input
                    value={form.organization_email}
                    onChange={(e) =>
                      changeField("organization_email", e.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Телефон организации</span>
                  <input
                    value={form.organization_phone}
                    onChange={(e) =>
                      changeField("organization_phone", e.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Статус</span>
                  <select
                    value={form.status}
                    onChange={(e) => changeField("status", e.target.value)}
                  >
                    <option value="">Не выбран</option>
                    <option value="active">Открыта</option>
                    <option value="waiting_eds">Ожидает ЭЦП</option>
                    <option value="in_progress">В процессе</option>
                    <option value="rejected">Отклонена</option>
                    <option value="blocked">Заблокирована</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                className="saveBtn"
                onClick={saveOrganization}
                disabled={saving}
              >
                {saving ? "Сохранение..." : "Сохранить изменения"}
              </button>

              {adminData?.role !== "super_admin" ? (
                <p className="hint">
                  Обычный админ видит и редактирует только назначенные ему
                  организации.
                </p>
              ) : null}
            </>
          )}
        </aside>
      </section>

      <style>{`
        .orgPage {
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
          line-height: 1.6;
        }

        .orgHead button,
        .openBtn,
        .saveBtn {
          border: 0;
          border-radius: 14px;
          background: #10f3df;
          color: #06202e;
          padding: 12px 18px;
          font-weight: 950;
          cursor: pointer;
        }

        .orgError {
          margin-bottom: 18px;
          padding: 16px;
          border-radius: 16px;
          color: #fecaca;
          background: rgba(127, 29, 29, 0.38);
          border: 1px solid rgba(248, 113, 113, 0.4);
          font-weight: 800;
        }

        .orgFilters {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 14px;
          margin-bottom: 20px;
        }

        .orgFilters input,
        .orgFilters select,
        .formGrid input,
        .formGrid select {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(15, 23, 42, 0.72);
          color: #fff;
          border-radius: 16px;
          padding: 14px;
          outline: none;
          width: 100%;
        }

        .orgGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(420px, 0.8fr);
          gap: 22px;
          align-items: start;
        }

        .orgCard {
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 26px;
          padding: 20px;
        }

        .orgTitle {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
        }

        .orgTitle h2 {
          margin: 0;
        }

        .orgTitle span {
          color: #22d3ee;
          font-weight: 950;
        }

        .orgTable {
          overflow-x: auto;
        }

        .orgRow {
          min-width: 980px;
          display: grid;
          grid-template-columns: 260px 220px 140px 150px 150px 110px;
          gap: 14px;
          align-items: center;
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

        .status {
          display: inline-flex;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 950;
          background: rgba(34, 211, 238, 0.13);
          color: #67e8f9;
          white-space: nowrap;
        }

        .status.active,
        .status.opened,
        .status.connected {
          background: rgba(34, 197, 94, 0.16);
          color: #86efac;
        }

        .status.rejected,
        .status.blocked {
          background: rgba(239, 68, 68, 0.16);
          color: #fecaca;
        }

        .detailsOrg {
          position: sticky;
          top: 22px;
          max-height: calc(100vh - 44px);
          overflow-y: auto;
        }

        .emptyDetails {
          min-height: 260px;
          display: grid;
          place-content: center;
          text-align: center;
          color: #9fb2c8;
        }

        .detailsTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .detailsTop h2 {
          margin: 0 0 6px;
        }

        .detailsTop p {
          margin: 0;
          color: #9fb2c8;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .formGrid label {
          display: grid;
          gap: 7px;
        }

        .formGrid label.wide {
          grid-column: 1 / -1;
        }

        .formGrid span {
          color: #8aa0b8;
          font-size: 12px;
          font-weight: 900;
        }

        .saveBtn {
          width: 100%;
          margin-top: 18px;
        }

        .hint {
          margin: 14px 0 0;
          color: #9fb2c8;
          line-height: 1.6;
        }

        @media (max-width: 1200px) {
          .orgGrid {
            grid-template-columns: 1fr;
          }

          .detailsOrg {
            position: static;
            max-height: none;
          }
        }

        @media (max-width: 760px) {
          .orgPage {
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

          .orgFilters,
          .formGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}