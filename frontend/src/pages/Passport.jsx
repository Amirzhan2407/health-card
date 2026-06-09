import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "../styles/passport.css";

export default function Passport() {
  const savedUser = JSON.parse(localStorage.getItem("userData") || "{}");

  const [phone, setPhone] = useState(savedUser.phone || "");
  const [email, setEmail] = useState(savedUser.email || "");
  const [message, setMessage] = useState("");

  const genderLabel =
    savedUser.gender === "male"
      ? "Мужской"
      : savedUser.gender === "female"
      ? "Женский"
      : "Не определён";

  const user = {
    id: savedUser.id,
    fullName: savedUser.fullName || "—",
    iin: savedUser.iin || "—",
    gender: genderLabel,
    certExpire: savedUser.certExpire || "—",
  };

  useEffect(() => {
    async function loadContacts() {
      if (!user.id) return;

      const { data, error } = await supabase
        .from("app_users")
        .select("phone, email")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setPhone(data.phone || "");
        setEmail(data.email || "");
      }
    }

    loadContacts();
  }, [user.id]);

  const saveContacts = async () => {
    setMessage("");

    if (!user.id) {
      setMessage("Ошибка: пользователь не найден.");
      return;
    }

    const { error } = await supabase
      .from("app_users")
      .update({
        phone: phone.trim() || null,
        email: email.trim() || null,
      })
      .eq("id", user.id);

    if (error) {
      setMessage("Ошибка сохранения: " + error.message);
      return;
    }

    const updatedUser = {
      ...savedUser,
      phone: phone.trim(),
      email: email.trim(),
    };

    localStorage.setItem("userData", JSON.stringify(updatedUser));
    setMessage("Контактные данные сохранены.");
  };

  return (
    <div className="passportWrap">
      <div className="passportTop">
        <div>
          <div className="passportTitle">Мед карта</div>
          <div className="passportSub">Данные владельца и контакты</div>
        </div>

        <LanguageSwitcher />
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

      <section className="passportCard passportContactCard">
        <div className="passportCardTitle">Контактные данные</div>

        <div className="passportSub">
          Эти данные можно использовать для уведомлений и связи.
        </div>

        <div className="passportGrid">
          <div className="pField">
            <div className="pLabel">Телефон</div>
            <input
              className="pInput"
              type="text"
              placeholder="+7 777 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="pField">
            <div className="pLabel">Почта</div>
            <input
              className="pInput"
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <button type="button" className="passportSaveBtn" onClick={saveContacts}>
          Сохранить изменения
        </button>

        {message && <div className="passportMessage">{message}</div>}
      </section>
    </div>
  );
}