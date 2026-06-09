import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import {
  nca,
  makeLoginPayload,
  parseCmsSignature,
  mapKeyInfo,
} from "../services/ncalayer.js";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "../styles/login.css";

function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    /[A-ZА-Я]/.test(password) &&
    /[a-zа-я]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*№?]/.test(password)
  );
}

function isValidIin(iin) {
  return /^\d{12}$/.test(iin);
}

function isValidFullName(name) {
  if (!name) return false;
  if (name === "—") return false;
  if (name === "1.4") return false;
  if (name.length < 5) return false;
  return true;
}

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("ecp");
  const [theme, setTheme] = useState("light");

  const [version, setVersion] = useState("");
  const [status, setStatus] = useState("init");
  const [err, setErr] = useState("");

  const [iinLogin, setIinLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");

  const [needPasswordCreate, setNeedPasswordCreate] = useState(false);
  const [ecpUserData, setEcpUserData] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  useEffect(() => {
    async function checkNca() {
      try {
        setStatus("checking");
        const v = await nca.getVersion();
        setVersion(typeof v === "string" ? v : JSON.stringify(v));
        setStatus("ready");
      } catch (e) {
        setVersion("NCALayer недоступен");
        setErr(e?.message || "NCALayer недоступен");
        setStatus("error");
      }
    }

    checkNca();
  }, []);

  const saveUserData = (userData) => {
    localStorage.setItem("userData", JSON.stringify(userData));
  };

  const onSign = async () => {
    if (status === "reading" || status === "signing") return;

    setErr("");

    try {
      setStatus("reading");

      const rawKeyInfo = await nca.getKeyInfo();
      const keyData = mapKeyInfo(rawKeyInfo);

      setStatus("signing");

      const payload = makeLoginPayload();
      const signature = await nca.basicsSignCMS(payload, "ru");
      const signatureText = String(signature);

      const cmsData = parseCmsSignature(signatureText);

      const userIin =
        keyData.iin && keyData.iin !== "—"
          ? keyData.iin
          : cmsData.iin || "—";

      const userFullName =
        keyData.fullName && keyData.fullName !== "—"
          ? keyData.fullName
          : cmsData.fullName || "—";

      if (!isValidIin(userIin)) {
        setErr(
          "Не удалось получить правильный ИИН из ЭЦП. Выберите ключ физического лица."
        );
        setStatus("error");
        return;
      }

      if (!isValidFullName(userFullName)) {
        setErr(
          "Не удалось получить ФИО из ЭЦП. Выберите правильный ключ физического лица."
        );
        setStatus("error");
        return;
      }

      const genderDigit = userIin[6];

      let gender = "unknown";

      if (["1", "3", "5"].includes(genderDigit)) gender = "male";
      if (["2", "4", "6"].includes(genderDigit)) gender = "female";

      const userData = {
        fullName: userFullName,
        iin: userIin,
        gender,
        certExpire:
          keyData.certExpire !== "—"
            ? keyData.certExpire
            : cmsData.certExpire || "—",
      };

      const { data: existingUser, error: userError } = await supabase
        .from("app_users")
        .select("*")
        .eq("iin", userData.iin)
        .maybeSingle();

      if (userError) throw userError;

      localStorage.setItem("authSignature", signatureText);

      if (existingUser) {
        saveUserData({
          id: existingUser.id,
          fullName: existingUser.full_name || userData.fullName,
          iin: existingUser.iin,
          gender: existingUser.gender || userData.gender,
          certExpire: userData.certExpire,
          phone: existingUser.phone || "",
          email: existingUser.email || "",
        });

        setStatus("ok");
        navigate("/home");
        return;
      }

      setEcpUserData(userData);
      setNeedPasswordCreate(true);
      setStatus("createPassword");
    } catch (e) {
      setErr(e?.message || "Ошибка работы с ЭЦП");
      setStatus("error");
    }
  };

  const createPasswordAfterEcp = async () => {
    setErr("");

    if (!ecpUserData?.iin) {
      setErr("Сначала подтвердите личность через ЭЦП.");
      return;
    }

    if (!isValidIin(ecpUserData.iin)) {
      setErr("Неверный ИИН. Повторите вход через правильный ЭЦП.");
      return;
    }

    if (!isValidFullName(ecpUserData.fullName)) {
      setErr("Неверное ФИО. Повторите вход через правильный ЭЦП.");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setErr(
        "Пароль должен быть минимум 8 символов, содержать большую букву, маленькую букву, цифру и спецсимвол."
      );
      return;
    }

    if (newPassword !== repeatPassword) {
      setErr("Пароли не совпадают.");
      return;
    }

    const { data, error } = await supabase.rpc("register_app_user", {
      p_iin: ecpUserData.iin,
      p_full_name: ecpUserData.fullName,
      p_gender: ecpUserData.gender,
      p_password: newPassword,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    if (!data?.success) {
      setErr(data?.message || "Ошибка регистрации.");
      return;
    }

    saveUserData({
      id: data.user.id,
      fullName: ecpUserData.fullName,
      iin: ecpUserData.iin,
      gender: ecpUserData.gender,
      certExpire: ecpUserData.certExpire,
      phone: "",
      email: "",
    });

    setStatus("ok");
    navigate("/home");
  };

  const loginByPassword = async () => {
    setErr("");

    if (!isValidIin(iinLogin)) {
      setErr("ИИН должен содержать 12 цифр.");
      return;
    }

    if (!passwordLogin.trim()) {
      setErr("Введите пароль.");
      return;
    }

    const { data, error } = await supabase.rpc("login_app_user", {
      p_iin: iinLogin,
      p_password: passwordLogin,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    if (!data?.success) {
      setErr(data?.message || "Неверный ИИН или пароль.");
      return;
    }

    saveUserData({
      id: data.user.id,
      fullName: data.user.fullName || data.user.full_name || "—",
      iin: data.user.iin,
      gender: data.user.gender || "unknown",
      certExpire: "—",
      phone: data.user.phone || "",
      email: data.user.email || "",
    });

    navigate("/home");
  };

  return (
    <div className={`loginWrap ${theme === "dark" ? "dark" : ""}`}>
      <div className="loginCard">
        <section className="loginBrand">
          <div className="brandGlow brandGlowOne" />
          <div className="brandGlow brandGlowTwo" />

          <div className="logoHeart">
            <div className="heartShape">+</div>
          </div>

          <h1 className="brandName">
            <span>Мед</span>Карта
          </h1>

          <p className="brandText">
            Ваш личный помощник
            <br />в мире здоровья
          </p>

          <div className="brandFeatures">
            <div className="brandFeature">
              <div className="featureIcon">💬</div>
              <div>
                <b>ИИ помощник</b>
                <p>Ответы на вопросы о здоровье</p>
              </div>
            </div>

            <div className="brandFeature">
              <div className="featureIcon">🔎</div>
              <div>
                <b>Поиск лекарств и аптек</b>
                <p>Быстрый поиск и сравнение</p>
              </div>
            </div>

            <div className="brandFeature">
              <div className="featureIcon">🛡</div>
              <div>
                <b>Конфиденциальность</b>
                <p>Ваши данные под защитой</p>
              </div>
            </div>
          </div>

          <div className="brandBottom">🔒 Ваше здоровье — наша забота</div>
        </section>

        <section className="loginContent">
          <div className="loginTop">
            <button type="button" onClick={() => setTheme("light")}>
              ☀ Светлый
            </button>
            <button type="button" onClick={() => setTheme("dark")}>
              🌙 Тёмный
            </button>
            <LanguageSwitcher />
          </div>

          <div className="loginBox">
            <h2>Добро пожаловать!</h2>
            <p>Войдите в свой аккаунт, чтобы продолжить</p>

            <div className="loginTabs">
              <button
                type="button"
                className={`loginTab ${mode === "ecp" ? "active" : ""}`}
                onClick={() => {
                  setMode("ecp");
                  setErr("");
                }}
              >
                ЭЦП
              </button>

              <button
                type="button"
                className={`loginTab ${mode === "password" ? "active" : ""}`}
                onClick={() => {
                  setMode("password");
                  setErr("");
                }}
              >
                ИИН + пароль
              </button>
            </div>

            {mode === "ecp" && !needPasswordCreate && (
              <button
                type="button"
                onClick={onSign}
                disabled={status === "reading" || status === "signing"}
                className="loginBtn"
              >
                {status === "reading" || status === "signing"
                  ? "Обрабатываем..."
                  : "Подписать и войти"}
              </button>
            )}

            {mode === "ecp" && needPasswordCreate && (
              <div>
                <input
                  className="loginInput"
                  type="password"
                  placeholder="Новый пароль"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <input
                  className="loginInput"
                  type="password"
                  placeholder="Повторите пароль"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />

                <div className="loginHint">
                  Пароль: минимум 8 символов, большая и маленькая буква, цифра
                  и спецсимвол.
                </div>

                <button
                  type="button"
                  className="loginBtn"
                  onClick={createPasswordAfterEcp}
                >
                  Создать пароль и войти
                </button>
              </div>
            )}

            {mode === "password" && (
              <div>
                <input
                  className="loginInput"
                  type="text"
                  placeholder="ИИН"
                  maxLength={12}
                  value={iinLogin}
                  onChange={(e) =>
                    setIinLogin(e.target.value.replace(/\D/g, ""))
                  }
                />

                <input
                  className="loginInput"
                  type="password"
                  placeholder="Пароль"
                  value={passwordLogin}
                  onChange={(e) => setPasswordLogin(e.target.value)}
                />

                <button
                  type="button"
                  className="loginBtn"
                  onClick={loginByPassword}
                >
                  Войти
                </button>
              </div>
            )}

            {err && <div className="loginError">{err}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}