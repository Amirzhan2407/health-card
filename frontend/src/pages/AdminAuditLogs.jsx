import "../styles/adminLayout.css";

const logs = [
  {
    id: 1,
    admin: "Ещанов Амиржан",
    action: "Добавил администратора",
    details: "support_poly_1",
    date: "30.05.2026 14:20",
  },
  {
    id: 2,
    admin: "Ещанов Амиржан",
    action: "Изменил категорию",
    details: "support_hospital_1 → Государственные больницы",
    date: "30.05.2026 14:35",
  },
  {
    id: 3,
    admin: "support_poly_1",
    action: "Проверил заявку организации",
    details: "Городская поликлиника №5",
    date: "30.05.2026 15:10",
  },
];

export default function AdminAuditLogs() {
  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <div>
          <h1>Журнал действий</h1>
          <p>
            История действий главного админа и сотрудников техподдержки.
          </p>
        </div>
      </div>

      <div className="adminTableCard">
        <div className="adminTable logsTable">
          <div className="adminTableHead">
            <span>Админ</span>
            <span>Действие</span>
            <span>Подробности</span>
            <span>Дата</span>
          </div>

          {logs.map((item) => (
            <div className="adminTableRow" key={item.id}>
              <span className="strongText">{item.admin}</span>
              <span>{item.action}</span>
              <span>{item.details}</span>
              <span>{item.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}