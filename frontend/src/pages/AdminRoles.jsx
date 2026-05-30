import "../styles/adminLayout.css";

export default function AdminRoles() {
  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <div>
          <h1>Роли и права</h1>
          <p>
            Настройка возможностей главного админа и сотрудников техподдержки.
          </p>
        </div>
      </div>

      <div className="adminTwoGrid">
        <div className="adminCard">
          <h2>Главный админ</h2>

          <div className="permissionBox">
            <div>Создание сотрудников техподдержки</div>
            <div>Блокировка сотрудников</div>
            <div>Просмотр всех категорий</div>
            <div>Управление заявками организаций</div>
            <div>Просмотр журнала действий</div>
            <div>Настройка ролей</div>
          </div>
        </div>

        <div className="adminCard">
          <h2>Техподдержка</h2>

          <div className="permissionBox">
            <div>Просмотр только своей категории</div>
            <div>Проверка заявок организаций</div>
            <div>Назначение главного врача</div>
            <div>Редактирование данных организации</div>
            <div>Передача сложных заявок главному админу</div>
          </div>
        </div>
      </div>
    </div>
  );
}