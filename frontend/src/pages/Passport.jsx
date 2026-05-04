import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/passport.css";

export default function Passport() {
  const navigate = useNavigate();

  const savedUser = JSON.parse(localStorage.getItem("userData") || "{}");

  const genderLabel =
  savedUser.gender === "male"
    ? "Мужской"
    : savedUser.gender === "female"
    ? "Женский"
    : "Не определён";

const user = {
  fullName: savedUser.fullName || "—",
  iin: savedUser.iin || "—",
  gender: genderLabel,
  certExpire: savedUser.certExpire || "—",
};

  return (
    <div className="passportWrap">
      <div className="passportTop">
        <button
          className="passportBack"
          type="button"
          onClick={() => navigate("/home")}
        >
          ← Назад
        </button>

        <div>
          <div className="passportTitle">Мед карта</div>
          <div className="passportSub">Данные владельца (ЭЦП)</div>
        </div>
      </div>

      <section className="passportCard">
        <div className="passportCardTitle">Профиль</div>

        <div className="passportGrid">
          <div className="pField">
            <div className="pLabel">ФИ</div>
            <div className="pValue">{user.fullName}</div>
          </div>

          <div className="pField">
            <div className="pLabel">ИИН</div>
            <div className="pValue">{user.iin}</div>
          </div>

          <div className="pField">
            <div className="pLabel">Срок действия ЭЦП</div>
            <div className="pValue">{user.certExpire}</div>
          </div>
            
            
            <div className="pField">
              <div className="pLabel">Пол</div>
              <div className="pValue">{user.gender}</div>
            </div>


        </div>
      </section>
    </div>
  );
}