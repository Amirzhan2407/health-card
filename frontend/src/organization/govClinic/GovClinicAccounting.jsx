export default function GovClinicAccounting() {
  return (
    <div>
      <h2 className="gov-page-title">Бухгалтерия</h2>
      <p className="gov-page-subtitle">
        Финансовые вопросы, зарплаты, закупки, поставщики и расходы организации.
      </p>

      <div className="gov-grid">
        <div className="gov-card">
          <h3>Зарплаты сотрудников</h3>
          <p>Расчет зарплат, премий, удержаний и выплат сотрудникам.</p>
        </div>

        <div className="gov-card">
          <h3>Госзакупки</h3>
          <p>Подготовка финансовых данных для закупки оборудования и материалов.</p>
        </div>

        <div className="gov-card">
          <h3>Поставщики</h3>
          <p>Поиск, сравнение и учет поставщиков медицинского оборудования.</p>
        </div>

        <div className="gov-card">
          <h3>Финансовые заявки</h3>
          <p>Создание и отправка заявок на согласование главному врачу.</p>
        </div>

        <div className="gov-card">
          <h3>Договоры и счета</h3>
          <p>Учет договоров, счетов, актов и платежных документов.</p>
        </div>

        <div className="gov-card">
          <h3>Отчеты</h3>
          <p>Финансовые отчеты по расходам, закупкам и выплатам.</p>
        </div>
      </div>
    </div>
  );
}