export default function GovClinicDeputyChief() {
  return (
    <div>
      <h2 className="gov-page-title">Заместитель главного врача</h2>
      <p className="gov-page-subtitle">
        Управление медицинской частью, расписанием врачей, кабинетами и отделениями.
      </p>

      <div className="gov-grid">
        <div className="gov-card">
          <h3>Расписание врачей</h3>
          <p>Создание и изменение графика работы врачей по отделениям.</p>
        </div>

        <div className="gov-card">
          <h3>Кабинеты</h3>
          <p>Распределение врачей по кабинетам и контроль занятости помещений.</p>
        </div>

        <div className="gov-card">
          <h3>Согласование заявок</h3>
          <p>Подписание заявок на прием сотрудников перед главным врачом.</p>
        </div>

        <div className="gov-card">
          <h3>Контроль врачей</h3>
          <p>Проверка нагрузки, посещаемости и качества работы врачей.</p>
        </div>

        <div className="gov-card">
          <h3>Отделения</h3>
          <p>Контроль работы отделений и руководителей отделений.</p>
        </div>

        <div className="gov-card">
          <h3>Коммуникации</h3>
          <p>Связь с главным врачом, руководителями отделений и врачами.</p>
        </div>
      </div>
    </div>
  );
}