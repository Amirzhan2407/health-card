import React from "react";
import "../styles/home.css";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="pageGrid">
      <section className="cardWide">
        <div className="emergencyLeft">
          <div className="emergencyIcon">
            <div className="emergencyIconPlus" />
          </div>

          <div style={{ minWidth: 0 }}>
            <div className="cardTitle">Мед карта</div>
            <div className="cardText">ФИО • ИИН • данные из ЭЦП</div>
          </div>
        </div>

        <button
          className="emergencyRight"
          type="button"
          onClick={() => navigate("/passport")}
          aria-label="Открыть медкарту"
        >
          ›
        </button>
      </section>

      <section className="card">
        <div className="cardTitle">Последние документы</div>
        <div className="cardText">PDF / JPG / DOCX — быстрый просмотр</div>
      </section>

      <section className="card">
        <div className="cardTitle">Напоминания</div>
        <div className="cardText">Лекарства • справки • проверки</div>
      </section>

      <section className="card">
        <div className="cardTitle">Оценка сна</div>
        <div className="cardText">Сводка за неделю</div>
      </section>

      <section className="card">
        <div className="cardTitle">Быстрые действия</div>
        <div className="cardText">Загрузить документ • QR • PDF</div>
      </section>
    </div>
  );
}