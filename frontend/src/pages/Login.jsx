// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import {
  nca,
  makeLoginPayload,
  parseCmsSignature,
  mapKeyInfo,
} from "../services/ncalayer.js";
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

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("ecp");

  const [version, setVersion] = useState("");
  const [status, setStatus] = useState("init");
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");

  const [iinLogin, setIinLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");

  const [needPasswordCreate, setNeedPasswordCreate] = useState(false);
  const [ecpUserData, setEcpUserData] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const saveUserData = (userData) => {
    localStorage.setItem("userData", JSON.stringify(userData));
  };

  const onSign = async () => {
    if (status === "reading" || status === "signing") return;

    setErr("");
    setResult("");

    try {
      setStatus("reading");

      const rawKeyInfo = await nca.getKeyInfo();
      const keyData = mapKeyInfo(rawKeyInfo);

      console.log("KEY INFO RAW:", rawKeyInfo);
      console.log("KEY INFO MAPPED:", keyData);

      setStatus("signing");

      const payload = makeLoginPayload();
      const signature = await nca.basicsSignCMS(payload, "ru");
      const signatureText = String(signature);

      setResult(signatureText);

      const cmsData = parseCmsSignature(signatureText);

      const userIin = keyData.iin !== "—" ? keyData.iin : cmsData.iin || "—";
      const genderDigit = userIin?.[6];

      let gender = "unknown";

      if (["1", "3", "5"].includes(genderDigit)) {
        gender = "male";
      }

      if (["2", "4", "6"].includes(genderDigit)) {
        gender = "female";
      }

      const userData = {
        fullName: keyData.fullName || "—",
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

      if (userError) {
        throw userError;
      }

      localStorage.setItem("authSignature", signatureText);

      if (existingUser) {
        saveUserData({
          id: existingUser.id,
          fullName: existingUser.full_name || userData.fullName,
          iin: existingUser.iin,
          gender: existingUser.gender || userData.gender,
          certExpire: userData.certExpire,
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
    });

    setStatus("ok");
    navigate("/home");
  };

  const loginByPassword = async () => {
    setErr("");

    if (!/^\d{12}$/.test(iinLogin)) {
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
    });

    navigate("/home");
  };

  const statusText =
    status === "checking"
      ? "Проверяем NCALayer..."
      : status === "ready"
      ? "NCALayer подключен"
      : status === "reading"
      ? "Считываем данные сертификата..."
      : status === "signing"
      ? "Подписываем вход..."
      : status === "createPassword"
      ? "Создайте пароль"
      : status === "ok"
      ? "Вход выполнен"
      : status === "error"
      ? "Ошибка"
      : "…";

  return (
    <div className="loginWrap">
      <div className="loginCard">
        <div className="loginHeader">
          <div className="loginHeaderRow">
            <div className="loginLogo">+</div>
            <div>
              <div className="loginTitle">Личная карта здоровья</div>
              <div className="loginSub">Авторизация</div>
            </div>
          </div>
        </div>

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

        {mode === "ecp" && (
          <>
            

            

            {!needPasswordCreate && (
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

            {needPasswordCreate && (
              <div className="loginPanel">
                <div className="loginSummaryTitle">Создайте пароль</div>

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

                <div className="loginChipGreen">
                  Пароль должен содержать минимум 8 символов, большую и
                  маленькую букву, цифру и спецсимвол.
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
          </>
        )}

        {mode === "password" && (
          <div className="loginPanel">
            <div className="loginSummaryTitle">Вход по ИИН и паролю</div>

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

        {result && mode === "ecp" && (
          <div className="loginCms">
            <div className="loginCmsTitle">CMS подпись (часть):</div>
            <pre className="loginCmsPre">
              {result.slice(0, 800)}
              {result.length > 800 ? "..." : ""}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}