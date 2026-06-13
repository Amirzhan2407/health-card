export default function GovClinicDashboard() {
  return (
    <div>
      <h2 className="gov-page-title">Обзор государственной поликлиники</h2>
      <p className="gov-page-subtitle">
        Общая панель управления организацией и основными показателями.
      </p>

      <div className="gov-grid">
        <div className="gov-card">
          <h3>Сотрудники</h3>
          <p>Общее количество врачей, руководителей и административного персонала.</p>
        </div>

        <div className="gov-card">
          <h3>Пациенты</h3>
          <p>Количество прикрепленных пациентов и активных обращений.</p>
        </div>

        <div className="gov-card">
          <h3>Записи</h3>
          <p>Записи пациентов на сегодня и ближайшие дни.</p>
        </div>

        <div className="gov-card">
          <h3>Кабинеты</h3>
          <p>Распределение кабинетов между врачами и отделениями.</p>
        </div>

        <div className="gov-card">
          <h3>Заявки</h3>
          <p>Заявки на сотрудников, согласования и внутренние процессы.</p>
        </div>

        <div className="gov-card">
          <h3>Коммуникации</h3>
          <p>Внутренние сообщения между сотрудниками организации.</p>
        </div>
      </div>
    </div>
  );
}