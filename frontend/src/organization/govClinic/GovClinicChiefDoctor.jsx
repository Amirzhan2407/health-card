export default function GovClinicChiefDoctor() {
  const stats = [
    { label: "Пациентов сегодня", value: "428", note: "+12% к прошлой неделе" },
    { label: "Врачей на смене", value: "36", note: "8 отделений активны" },
    { label: "Заявок на подпись", value: "14", note: "кадры / финансы / закупки" },
    { label: "Загруженность", value: "78%", note: "средняя по поликлинике" },
  ];

  const approvals = [
    {
      title: "Приём нового врача",
      from: "Отдел кадров",
      status: "Ожидает подписи",
    },
    {
      title: "Закупка оборудования",
      from: "Бухгалтерия",
      status: "На рассмотрении",
    },
    {
      title: "Перевод сотрудника",
      from: "Зам. главного врача",
      status: "Ожидает решения",
    },
  ];

  const departments = [
    { name: "Терапия", head: "Ахметова А. С.", doctors: 12, load: "82%" },
    { name: "Педиатрия", head: "Ибраев Н. К.", doctors: 9, load: "74%" },
    { name: "Травматология", head: "Серикова М. Т.", doctors: 6, load: "69%" },
    { name: "Диагностика", head: "Ким В. А.", doctors: 8, load: "88%" },
  ];

  return (
    <div className="chief-page">
      <div className="gov-page-head">
        <div>
          <h2 className="gov-page-title">Главный врач</h2>
          <p className="gov-page-subtitle">
            Управление поликлиникой, контроль отделений, сотрудников, финансов и важных заявок.
          </p>
        </div>

        <button className="gov-primary-btn">Создать распоряжение</button>
      </div>

      <div className="chief-stats-grid">
        {stats.map((item) => (
          <div className="chief-stat-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </div>
        ))}
      </div>

      <div className="chief-main-grid">
        <section className="gov-card chief-wide-card">
          <div className="chief-card-head">
            <div>
              <h3>Заявки на согласование</h3>
              <p>Кадровые, финансовые и организационные решения.</p>
            </div>
            <button className="gov-secondary-btn">Все заявки</button>
          </div>

          <div className="chief-list">
            {approvals.map((item) => (
              <div className="chief-list-row" key={item.title}>
                <div>
                  <b>{item.title}</b>
                  <span>{item.from}</span>
                </div>
                <em>{item.status}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="gov-card">
          <h3>Финансовый контроль</h3>
          <p>Госзакупки, поставщики, зарплаты, оборудование и крупные расходы.</p>

          <div className="chief-money-box">
            <span>Заявок на оплату</span>
            <b>7</b>
          </div>

          <div className="chief-money-box">
            <span>Закупки на проверке</span>
            <b>4</b>
          </div>
        </section>
      </div>

      <section className="gov-card">
        <div className="chief-card-head">
          <div>
            <h3>Контроль отделений</h3>
            <p>Руководители, количество врачей и текущая нагрузка.</p>
          </div>
        </div>

        <div className="chief-table">
          <div className="chief-table-head">
            <span>Отделение</span>
            <span>Руководитель</span>
            <span>Врачей</span>
            <span>Нагрузка</span>
          </div>

          {departments.map((item) => (
            <div className="chief-table-row" key={item.name}>
              <span>{item.name}</span>
              <span>{item.head}</span>
              <span>{item.doctors}</span>
              <b>{item.load}</b>
            </div>
          ))}
        </div>
      </section>

      <div className="gov-grid">
        <div className="gov-card">
          <h3>Сотрудники</h3>
          <p>Просмотр врачей, руководителей отделений, администраторов и кабинетов.</p>
        </div>

        <div className="gov-card">
          <h3>Коммуникация</h3>
          <p>Сообщения замам, руководителям отделений, бухгалтерии и кадрам.</p>
        </div>

        <div className="gov-card">
          <h3>Журнал действий</h3>
          <p>Контроль изменений, подписей, заявок и действий сотрудников.</p>
        </div>
      </div>
    </div>
  );
}