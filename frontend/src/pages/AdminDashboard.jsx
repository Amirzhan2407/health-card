import "../styles/adminLayout.css";

export default function AdminDashboard() {
  const stats = [
    {
      title: "Всего админов",
      value: "6",
      text: "Главный админ и сотрудники техподдержки",
    },
    {
      title: "Гос. поликлиники",
      value: "2",
      text: "Ответственные сотрудники",
    },
    {
      title: "Гос. больницы",
      value: "2",
      text: "Ответственные сотрудники",
    },
    {
      title: "Частные клиники",
      value: "1",
      text: "Ответственные сотрудники",
    },
    {
      title: "Заявки организаций",
      value: "12",
      text: "Ожидают проверки",
    },
    {
      title: "Активные админы",
      value: "5",
      text: "Имеют доступ к системе",
    },
  ];

  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <div>
          <h1>Главная панель</h1>
          <p>
            Общая информация по администраторам, заявкам организаций и зонам
            ответственности.
          </p>
        </div>
      </div>

      <div className="adminStatsGrid">
        {stats.map((item) => (
          <div className="adminStatCard" key={item.title}>
            <span>{item.title}</span>
            <b>{item.value}</b>
            <p>{item.text}</p>
          </div>
        ))}
      </div>

      <div className="adminTwoGrid">
        <div className="adminCard">
          <h2>Как работает система</h2>

          <div className="adminStepList">
            <div>
              <b>1. Главный админ</b>
              <span>Создаёт сотрудников техподдержки и назначает категории.</span>
            </div>

            <div>
              <b>2. Техподдержка</b>
              <span>Проверяет заявки организаций по своей категории.</span>
            </div>

            <div>
              <b>3. Организация</b>
              <span>Подписывает регистрацию через ЭЦП БИН.</span>
            </div>

            <div>
              <b>4. Главный врач</b>
              <span>Получает доступ и управляет врачами своей организации.</span>
            </div>
          </div>
        </div>

        <div className="adminCard">
          <h2>Категории ответственности</h2>

          <div className="categoryList">
            <div>Государственные поликлиники</div>
            <div>Государственные больницы</div>
            <div>Частные клиники</div>
            <div>Медицинские центры</div>
            <div>Лаборатории / анализы</div>
          </div>
        </div>
      </div>
    </div>
  );
}