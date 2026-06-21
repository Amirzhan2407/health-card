import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import {
  nca,
  makeLoginPayload,
  parseCmsSignature,
  mapKeyInfo,
} from "../services/ncalayer.js";
import { useLanguage } from "../i18n/LanguageContext";
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
  const { t } = useLanguage();

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
        setVersion(t("ncaUnavailable"));
        setErr(e?.message || t("ncaUnavailable"));
        setStatus("error");
      }
    }

    checkNca();
  }, [t]);

  const saveUserData = (userData) => {
    localStorage.setItem("userData", JSON.stringify(userData));
  };

  const obtainPatientToken = async (iin, id) => {
    try {
      const API_URL = "https://health-card.onrender.com";
      const response = await fetch(`${API_URL}/api/organizations/auth/patient-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iin, id }),
      });
      const resData = await response.json();
      if (response.ok && resData.token) {
        localStorage.setItem("organizationToken", resData.token);
      }
    } catch (e) {
      console.warn("Could not obtain patient auth token:", e);
    }
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
        setErr(t("ecpWrongIin"));
        setStatus("error");
        return;
      }

      if (!isValidFullName(userFullName)) {
        setErr(t("ecpWrongFullName"));
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

        await obtainPatientToken(existingUser.iin, existingUser.id);
        setStatus("ok");
        navigate("/");
        return;
      }

      setEcpUserData(userData);
      setNeedPasswordCreate(true);
      setStatus("createPassword");
    } catch (e) {
      setErr(e?.message || t("ecpError"));
      setStatus("error");
    }
  };

  const createPasswordAfterEcp = async () => {
    setErr("");

    if (!ecpUserData?.iin) {
      setErr(t("confirmIdentityFirst"));
      return;
    }

    if (!isValidIin(ecpUserData.iin)) {
      setErr(t("wrongIinRepeatEcp"));
      return;
    }

    if (!isValidFullName(ecpUserData.fullName)) {
      setErr(t("wrongFullNameRepeatEcp"));
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setErr(t("weakPassword"));
      return;
    }

    if (newPassword !== repeatPassword) {
      setErr(t("passwordsNotMatch"));
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
      setErr(data?.message || t("registrationError"));
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

    await obtainPatientToken(ecpUserData.iin, data.user.id);
    setStatus("ok");
    navigate("/");
  };

  const loginByPassword = async () => {
    setErr("");

    if (!isValidIin(iinLogin)) {
      setErr(t("iinMustBe12"));
      return;
    }

    if (!passwordLogin.trim()) {
      setErr(t("enterPassword"));
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
      setErr(data?.message || t("wrongIinOrPassword"));
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

    await obtainPatientToken(data.user.iin, data.user.id);
    navigate("/");
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
            {t("personalAssistant")}
            <br />
            {t("healthWorld")}
          </p>

          <div className="brandFeatures">
            <div className="brandFeature">
              <div className="featureIcon">💬</div>
              <div>
                <b>{t("aiHelper")}</b>
                <p>{t("aiHelperText")}</p>
              </div>
            </div>

            <div className="brandFeature">
              <div className="featureIcon">🔎</div>
              <div>
                <b>{t("medicineSearch")}</b>
                <p>{t("medicineSearchText")}</p>
              </div>
            </div>

            <div className="brandFeature">
              <div className="featureIcon">🛡</div>
              <div>
                <b>{t("privacy")}</b>
                <p>{t("privacyText")}</p>
              </div>
            </div>
          </div>

          <div className="brandBottom">{t("healthCareSlogan")}</div>
        </section>

        <section className="loginContent">
          <div className="loginTop">
            <button type="button" onClick={() => setTheme("light")}>
              {t("lightTheme")}
            </button>
            <button type="button" onClick={() => setTheme("dark")}>
              {t("darkTheme")}
            </button>
            <LanguageSwitcher />
          </div>

          <div className="loginBox">
            <h2>{t("welcome")}</h2>
            <p>{t("loginSubtitle")}</p>

            <div className="loginTabs">
              <button
                type="button"
                className={`loginTab ${mode === "ecp" ? "active" : ""}`}
                onClick={() => {
                  setMode("ecp");
                  setErr("");
                }}
              >
                {t("ecp")}
              </button>

              <button
                type="button"
                className={`loginTab ${mode === "password" ? "active" : ""}`}
                onClick={() => {
                  setMode("password");
                  setErr("");
                }}
              >
                {t("iinPassword")}
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
                  ? t("processing")
                  : t("signAndLogin")}
              </button>
            )}

            {mode === "ecp" && needPasswordCreate && (
              <div>
                <input
                  className="loginInput"
                  type="password"
                  placeholder={t("newPassword")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <input
                  className="loginInput"
                  type="password"
                  placeholder={t("repeatPassword")}
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />

                <div className="loginHint">{t("passwordHint")}</div>

                <button
                  type="button"
                  className="loginBtn"
                  onClick={createPasswordAfterEcp}
                >
                  {t("createPasswordAndLogin")}
                </button>
              </div>
            )}

            {mode === "password" && (
              <div>
                <input
                  className="loginInput"
                  type="text"
                  placeholder={t("iin")}
                  maxLength={12}
                  value={iinLogin}
                  onChange={(e) =>
                    setIinLogin(e.target.value.replace(/\D/g, ""))
                  }
                />

                <input
                  className="loginInput"
                  type="password"
                  placeholder={t("password")}
                  value={passwordLogin}
                  onChange={(e) => setPasswordLogin(e.target.value)}
                />

                <button
                  type="button"
                  className="loginBtn"
                  onClick={loginByPassword}
                >
                  {t("login")}
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