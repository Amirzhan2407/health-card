import React from "react";

export default function HomePage() {
  return (
    <div className="pageGrid">
      {/* Это заглушка под твой контент как на макете */}
      <section className="cardWide">
        <div className="cardTitle">Экстренные данные</div>
        <div className="cardText">Кровь • Аллергии • Контакты • Хронические</div>
      </section>

      <section className="card">
        <div className="cardTitle">Паспорт здоровья</div>
        <div className="cardText">Кровь: O(I)+ • Резус: + • Аллергии: 2</div>
      </section>

      <section className="card">
        <div className="cardTitle">Быстрые действия</div>
        <div className="cardText">Добавить запись • Загрузить документ • QR • PDF</div>
      </section>

      <section className="card">
        <div className="cardTitle">Последние документы</div>
        <div className="cardText">Анализы • УЗИ • Выписка</div>
      </section>

      <section className="card">
        <div className="cardTitle">Витальные показатели</div>
        <div className="cardText">АД • Глюкоза • Вес</div>
      </section>
    </div>
  );
}
