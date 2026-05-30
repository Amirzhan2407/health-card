import "../styles/adminLayout.css";

const requests = [
  {
    id: 1,
    name: "Городская поликлиника №5",
    bin: "123456789012",
    type: "Государственная поликлиника",
    city: "Астана",
    status: "Ожидает проверки",
  },
  {
    id: 2,
    name: "Городская больница №2",
    bin: "456789123012",
    type: "Государственная больница",
    city: "Астана",
    status: "Ожидает проверки",
  },
  {
    id: 3,
    name: "Amanat Clinic",
    bin: "987654321012",
    type: "Частная клиника",
    city: "Алматы",
    status: "Проверяется",
  },
];

export default function AdminOrganizations() {
  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <div>
          <h1>Заявки организаций</h1>
          <p>
            Проверка медицинских организаций по БИН и назначение главного врача.
          </p>
        </div>
      </div>

      <div className="adminTableCard">
        <div className="adminTable orgTable">
          <div className="adminTableHead">
            <span>Организация</span>
            <span>БИН</span>
            <span>Тип</span>
            <span>Город</span>
            <span>Статус</span>
            <span>Действие</span>
          </div>

          {requests.map((item) => (
            <div className="adminTableRow" key={item.id}>
              <span className="strongText">{item.name}</span>
              <span>{item.bin}</span>
              <span>{item.type}</span>
              <span>{item.city}</span>
              <span>
                <b className="statusPill pending">{item.status}</b>
              </span>
              <span>
                <button className="adminSmallBtn" type="button">
                  Открыть
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}