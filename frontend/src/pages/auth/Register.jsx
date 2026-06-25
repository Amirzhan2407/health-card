
import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  RiArrowLeftLine,
  RiMailCheckLine,
  RiRefreshLine,
  RiUserHeartLine,
} from "react-icons/ri";

import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";


const REGISTER_TEXTS = {
  ru: {
    registrationTitle: "Регистрация",
    confirmationTitle: "Подтверждение электронной почты",
    registrationSubtitle: "Создание медицинского аккаунта пациента",
    codeSentTo: "Код отправлен на",

    personalDataTitle: "Личные данные",
    personalDataHint:
      "В дальнейшем вход в аккаунт пациента будет выполняться по ИИН.",
    fullNameLabel: "ФИО",
    fullNamePlaceholder: "Ещанов Амиржан Галинурович",
    iinLabel: "ИИН",
    iinPlaceholder: "12 цифр",
    iinHint: "ИИН будет использоваться для входа.",
    birthDateLabel: "Дата рождения",
    genderLabel: "Пол",
    genderPlaceholder: "Выберите пол",
    male: "Мужской",
    female: "Женский",
    emailLabel: "Электронная почта",
    emailHint: "На эту почту придёт код подтверждения.",

    passwordSectionTitle: "Пароль",
    passwordHint: "Для входа используйте ИИН и указанный пароль.",
    passwordLabel: "Пароль",
    repeatPasswordLabel: "Повторите пароль",
    passwordPlaceholder: "Минимум 8 символов",
    repeatPasswordPlaceholder: "Повторите пароль",

    sendingCode: "Отправка кода...",
    getCode: "Получить код",
    confirmationCodeLabel: "Код подтверждения",
    codeValidFor: "Код действует ещё",
    codeExpired: "Срок действия кода истёк",
    checkingCode: "Проверка кода...",
    confirmRegistration: "Подтвердить регистрацию",
    sending: "Отправка...",
    resendAfter: "Отправить повторно через",
    secondsShort: "сек.",
    sendNewCode: "Отправить новый код",
    changeData: "Изменить данные",

    alreadyHaveAccount: "Уже есть аккаунт?",
    login: "Войти",

    fullNameRequired: "Введите полное ФИО.",
    fullNameInvalid:
      "ФИО может содержать только буквы, пробелы, дефис и апостроф.",
    iinInvalid: "ИИН должен содержать ровно 12 цифр.",
    birthDateRequired: "Укажите дату рождения.",
    birthDateInvalid: "Укажите корректную дату рождения.",
    birthDateFuture: "Дата рождения не может быть в будущем.",
    genderRequired: "Выберите пол.",
    emailInvalid: "Введите корректную электронную почту.",
    passwordShort: "Пароль должен содержать минимум 8 символов.",
    passwordsMismatch: "Пароли не совпадают.",
    codeInvalid: "Введите код из 6 цифр.",
    codeExpiredRequestNew:
      "Срок действия кода истёк. Запросите новый код.",
    codeSentSuccess:
      "Код подтверждения отправлен на электронную почту.",
    codeSendFailed: "Не удалось отправить код подтверждения.",
    confirmFailed: "Не удалось подтвердить регистрацию.",
    newCodeSent: "Новый код отправлен на электронную почту.",
    resendFailed: "Не удалось повторно отправить код.",
  },

  kk: {
    registrationTitle: "Тіркелу",
    confirmationTitle: "Электрондық поштаны растау",
    registrationSubtitle: "Емделушінің медициналық аккаунтын жасау",
    codeSentTo: "Код мына поштаға жіберілді:",

    personalDataTitle: "Жеке деректер",
    personalDataHint:
      "Кейін емделуші аккаунтына ЖСН арқылы кіресіз.",
    fullNameLabel: "Аты-жөні",
    fullNamePlaceholder: "Ещанов Амиржан Галинурович",
    iinLabel: "ЖСН",
    iinPlaceholder: "12 цифр",
    iinHint: "ЖСН жүйеге кіру үшін пайдаланылады.",
    birthDateLabel: "Туған күні",
    genderLabel: "Жынысы",
    genderPlaceholder: "Жынысты таңдаңыз",
    male: "Ер",
    female: "Әйел",
    emailLabel: "Электрондық пошта",
    emailHint: "Растау коды осы поштаға жіберіледі.",

    passwordSectionTitle: "Құпиясөз",
    passwordHint:
      "Жүйеге кіру үшін ЖСН мен көрсетілген құпиясөзді пайдаланыңыз.",
    passwordLabel: "Құпиясөз",
    repeatPasswordLabel: "Құпиясөзді қайталаңыз",
    passwordPlaceholder: "Кемінде 8 таңба",
    repeatPasswordPlaceholder: "Құпиясөзді қайталаңыз",

    sendingCode: "Код жіберілуде...",
    getCode: "Код алу",
    confirmationCodeLabel: "Растау коды",
    codeValidFor: "Кодтың жарамдылық уақыты:",
    codeExpired: "Кодтың жарамдылық мерзімі аяқталды",
    checkingCode: "Код тексерілуде...",
    confirmRegistration: "Тіркелуді растау",
    sending: "Жіберілуде...",
    resendAfter: "Қайта жіберуге дейін",
    secondsShort: "сек.",
    sendNewCode: "Жаңа код жіберу",
    changeData: "Деректерді өзгерту",

    alreadyHaveAccount: "Аккаунтыңыз бар ма?",
    login: "Кіру",

    fullNameRequired: "Аты-жөніңізді толық енгізіңіз.",
    fullNameInvalid:
      "Аты-жөні тек әріптерден, бос орыннан, дефис пен апострофтан тұруы керек.",
    iinInvalid: "ЖСН дәл 12 цифрдан тұруы керек.",
    birthDateRequired: "Туған күніңізді көрсетіңіз.",
    birthDateInvalid: "Туған күніңізді дұрыс енгізіңіз.",
    birthDateFuture: "Туған күн болашақта болмауы керек.",
    genderRequired: "Жынысты таңдаңыз.",
    emailInvalid: "Электрондық поштаны дұрыс енгізіңіз.",
    passwordShort: "Құпиясөз кемінде 8 таңбадан тұруы керек.",
    passwordsMismatch: "Құпиясөздер сәйкес келмейді.",
    codeInvalid: "6 цифрдан тұратын кодты енгізіңіз.",
    codeExpiredRequestNew:
      "Кодтың жарамдылық мерзімі аяқталды. Жаңа код сұраңыз.",
    codeSentSuccess: "Растау коды электрондық поштаға жіберілді.",
    codeSendFailed: "Растау кодын жіберу мүмкін болмады.",
    confirmFailed: "Тіркелуді растау мүмкін болмады.",
    newCodeSent: "Жаңа код электрондық поштаға жіберілді.",
    resendFailed: "Кодты қайта жіберу мүмкін болмады.",
  },
};

function getTodayString() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Register() {
  const {
    requestRegistrationCode,
    confirmRegistration,
    resendRegistrationCode,
  } = useAuth();

  const {
    language,
    setLanguage,
  } = useLanguage();

  const locale =
    language === "kk" ||
    language === "kz"
      ? "kk"
      : "ru";

  function tr(key) {
    return (
      REGISTER_TEXTS[locale]?.[key] ||
      REGISTER_TEXTS.ru[key] ||
      key
    );
  }

  const navigate = useNavigate();

  const [step, setStep] =
    useState("form");

  const [fullName, setFullName] =
    useState("");

  const [iin, setIin] =
    useState("");

  const [birthDate, setBirthDate] =
    useState("");

  const [gender, setGender] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [code, setCode] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    resendLoading,
    setResendLoading,
  ] = useState(false);

  const [
    codeExpiresIn,
    setCodeExpiresIn,
  ] = useState(0);

  const [
    resendDelay,
    setResendDelay,
  ] = useState(0);

  useEffect(() => {
    if (
      codeExpiresIn <= 0 &&
      resendDelay <= 0
    ) {
      return undefined;
    }

    const timer =
      window.setInterval(() => {
        setCodeExpiresIn(
          (current) =>
            current > 0
              ? current - 1
              : 0
        );

        setResendDelay(
          (current) =>
            current > 0
              ? current - 1
              : 0
        );
      }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    codeExpiresIn,
    resendDelay,
  ]);

  function formatTime(
    totalSeconds
  ) {
    const minutes = Math.floor(
      totalSeconds / 60
    );

    const seconds =
      totalSeconds % 60;

    return `${String(
      minutes
    ).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }

  function switchLanguage() {
    setLanguage(
      language === "ru"
        ? "kk"
        : "ru"
    );
  }

  function validateRegistrationForm() {
    const normalizedFullName =
      fullName
        .trim()
        .replace(/\s+/g, " ");

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const normalizedIin =
      iin.replace(/\D/g, "");

    if (
      normalizedFullName.length < 5 ||
      normalizedFullName.length > 120
    ) {
      return tr("fullNameRequired");
    }

    if (
      !/^[\p{L}\s.'’\-]+$/u.test(
        normalizedFullName
      )
    ) {
      return tr("fullNameInvalid");
    }

    if (
      !/^\d{12}$/.test(
        normalizedIin
      )
    ) {
      return tr("iinInvalid");
    }

    if (!birthDate) {
      return tr("birthDateRequired");
    }

    const selectedBirthDate =
      new Date(
        `${birthDate}T00:00:00`
      );

    const today = new Date();

    if (
      Number.isNaN(
        selectedBirthDate.getTime()
      )
    ) {
      return tr("birthDateInvalid");
    }

    if (
      selectedBirthDate > today
    ) {
      return tr("birthDateFuture");
    }

    if (
      gender !== "male" &&
      gender !== "female"
    ) {
      return tr("genderRequired");
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      return tr("emailInvalid");
    }

    if (
      password.length < 8
    ) {
      return tr("passwordShort");
    }

    if (
      password !==
      confirmPassword
    ) {
      return tr("passwordsMismatch");
    }

    return "";
  }

  async function handleRequestCode(
    event
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const validationError =
      validateRegistrationForm();

    if (validationError) {
      setErrorMessage(
        validationError
      );

      return;
    }

    setLoading(true);

    try {
      const result =
        await requestRegistrationCode(
          {
            fullName: fullName
              .trim()
              .replace(/\s+/g, " "),

            iin: iin
              .replace(/\D/g, "")
              .slice(0, 12),

            birthDate,

            gender,

            email: email
              .trim()
              .toLowerCase(),

            password,

            confirmPassword,

            preferredLanguage:
              locale === "kk"
                ? "kz"
                : "ru",
          }
        );

      setStep("code");
      setCode("");

      setCodeExpiresIn(
        result.expiresInSeconds ||
          600
      );

      setResendDelay(30);

      setSuccessMessage(
        result.message ||
          tr("codeSentSuccess")
      );
    } catch (error) {
      setErrorMessage(
        error?.message ||
          tr("codeSendFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCode(
    event
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (
      !/^\d{6}$/.test(code)
    ) {
      setErrorMessage(
        tr("codeInvalid")
      );

      return;
    }

    if (
      codeExpiresIn <= 0
    ) {
      setErrorMessage(
        tr("codeExpiredRequestNew")
      );

      return;
    }

    setLoading(true);

    try {
      await confirmRegistration(
        email
          .trim()
          .toLowerCase(),
        code
      );

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(
        error?.message ||
          tr("confirmFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (
      resendLoading ||
      resendDelay > 0
    ) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setResendLoading(true);

    try {
      const result =
        await resendRegistrationCode(
          email
            .trim()
            .toLowerCase()
        );

      setCode("");

      setCodeExpiresIn(
        result.expiresInSeconds ||
          600
      );

      setResendDelay(30);

      setSuccessMessage(
        result.message ||
          tr("newCodeSent")
      );
    } catch (error) {
      setErrorMessage(
        error?.message ||
          tr("resendFailed")
      );
    } finally {
      setResendLoading(false);
    }
  }

  function handleChangeRegistrationData() {
    setStep("form");
    setCode("");
    setCodeExpiresIn(0);
    setResendDelay(0);
    setErrorMessage("");
    setSuccessMessage("");
  }

  return (
    <div style={styles.container}>
      <div style={styles.bgBlob1} />
      <div style={styles.bgBlob2} />

      <div style={styles.langSelector}>
        <button
          type="button"
          onClick={switchLanguage}
          style={styles.langButton}
        >
          {language === "ru"
            ? "ҚАЗ"
            : "РУС"}
        </button>
      </div>

      <main style={styles.card}>
        <header style={styles.header}>
          <div
            style={
              styles.logoContainer
            }
          >
            {step === "form" ? (
              <RiUserHeartLine
                style={
                  styles.logoIcon
                }
              />
            ) : (
              <RiMailCheckLine
                style={
                  styles.logoIcon
                }
              />
            )}
          </div>

          <h1 style={styles.title}>
            {step === "form"
              ? tr("registrationTitle")
              : tr("confirmationTitle")}
          </h1>

          <p style={styles.subtitle}>
            {step === "form"
              ? tr("registrationSubtitle")
              : `${tr("codeSentTo")} ${email}`}
          </p>
        </header>

        {errorMessage && (
          <div
            style={
              styles.errorAlert
            }
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={
              styles.successAlert
            }
            role="status"
          >
            {successMessage}
          </div>
        )}

        {step === "form" ? (
          <form
            onSubmit={
              handleRequestCode
            }
            style={styles.form}
          >
            <section
              style={
                styles.formSection
              }
            >
              <h2
                style={
                  styles.formSectionTitle
                }
              >
                {tr("personalDataTitle")}
              </h2>

              <p
                style={
                  styles.formSectionText
                }
              >
                {tr("personalDataHint")}
              </p>

              <div
                style={
                  styles.inputGroup
                }
              >
                <label
                  htmlFor="fullName"
                  style={styles.label}
                >
                  {tr("fullNameLabel")}
                </label>

                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value
                    )
                  }
                  placeholder={tr("fullNamePlaceholder")}
                  autoComplete="name"
                  maxLength={120}
                  disabled={loading}
                  style={styles.input}
                  required
                />
              </div>

              <div
                style={
                  styles.twoColumnGrid
                }
              >
                <div
                  style={
                    styles.inputGroup
                  }
                >
                  <label
                    htmlFor="iin"
                    style={styles.label}
                  >
                    {tr("iinLabel")}
                  </label>

                  <input
                    id="iin"
                    type="text"
                    inputMode="numeric"
                    value={iin}
                    onChange={(
                      event
                    ) => {
                      const digits =
                        event.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(
                            0,
                            12
                          );

                      setIin(digits);
                    }}
                    placeholder={tr("iinPlaceholder")}
                    minLength={12}
                    maxLength={12}
                    disabled={loading}
                    style={styles.input}
                    required
                  />

                  <span
                    style={
                      styles.inputHint
                    }
                  >
                    {tr("iinHint")}
                  </span>
                </div>

                <div
                  style={
                    styles.inputGroup
                  }
                >
                  <label
                    htmlFor="birthDate"
                    style={styles.label}
                  >
                    {tr("birthDateLabel")}
                  </label>

                  <input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(
                      event
                    ) =>
                      setBirthDate(
                        event.target.value
                      )
                    }
                    max={getTodayString()}
                    disabled={loading}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div
                style={
                  styles.inputGroup
                }
              >
                <label
                  htmlFor="gender"
                  style={styles.label}
                >
                  {tr("genderLabel")}
                </label>

                <select
                  id="gender"
                  value={gender}
                  onChange={(event) =>
                    setGender(
                      event.target.value
                    )
                  }
                  disabled={loading}
                  style={styles.select}
                  required
                >
                  <option value="">
                    {tr("genderPlaceholder")}
                  </option>

                  <option value="male">
                    {tr("male")}
                  </option>

                  <option value="female">
                    {tr("female")}
                  </option>
                </select>
              </div>

              <div
                style={
                  styles.inputGroup
                }
              >
                <label
                  htmlFor="email"
                  style={styles.label}
                >
                  {tr("emailLabel")}
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="example@gmail.com"
                  autoComplete="email"
                  disabled={loading}
                  style={styles.input}
                  required
                />

                <span
                  style={
                    styles.inputHint
                  }
                >
                  {tr("emailHint")}
                </span>
              </div>
            </section>

            <section
              style={
                styles.formSection
              }
            >
              <h2
                style={
                  styles.formSectionTitle
                }
              >
                {tr("passwordSectionTitle")}
              </h2>

              <p
                style={
                  styles.formSectionText
                }
              >
                {tr("passwordHint")}
              </p>

              <div
                style={
                  styles.twoColumnGrid
                }
              >
                <div
                  style={
                    styles.inputGroup
                  }
                >
                  <label
                    htmlFor="password"
                    style={styles.label}
                  >
                    {tr("passwordLabel")}
                  </label>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(
                      event
                    ) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder={tr("passwordPlaceholder")}
                    autoComplete="new-password"
                    minLength={8}
                    disabled={loading}
                    style={styles.input}
                    required
                  />
                </div>

                <div
                  style={
                    styles.inputGroup
                  }
                >
                  <label
                    htmlFor="confirmPassword"
                    style={styles.label}
                  >
                    {tr("repeatPasswordLabel")}
                  </label>

                  <input
                    id="confirmPassword"
                    type="password"
                    value={
                      confirmPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    placeholder={tr("repeatPasswordPlaceholder")}
                    autoComplete="new-password"
                    minLength={8}
                    disabled={loading}
                    style={styles.input}
                    required
                  />
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,

                ...(loading
                  ? styles.disabledButton
                  : {}),
              }}
            >
              {loading
                ? tr("sendingCode")
                : tr("getCode")}
            </button>
          </form>
        ) : (
          <form
            onSubmit={
              handleConfirmCode
            }
            style={styles.form}
          >
            <div
              style={
                styles.registrationSummary
              }
            >
              <div>
                <span
                  style={
                    styles.summaryLabel
                  }
                >
                  {tr("fullNameLabel")}
                </span>

                <strong
                  style={
                    styles.summaryValue
                  }
                >
                  {fullName}
                </strong>
              </div>

              <div>
                <span
                  style={
                    styles.summaryLabel
                  }
                >
                  {tr("iinLabel")}
                </span>

                <strong
                  style={
                    styles.summaryValue
                  }
                >
                  {iin}
                </strong>
              </div>

              <div>
                <span
                  style={
                    styles.summaryLabel
                  }
                >
                  {tr("emailLabel")}
                </span>

                <strong
                  style={
                    styles.summaryValue
                  }
                >
                  {email}
                </strong>
              </div>
            </div>

            <div
              style={
                styles.inputGroup
              }
            >
              <label
                htmlFor="confirmationCode"
                style={styles.label}
              >
                {tr("confirmationCodeLabel")}
              </label>

              <input
                id="confirmationCode"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => {
                  const digits =
                    event.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(0, 6);

                  setCode(digits);
                }}
                placeholder="000000"
                autoComplete="one-time-code"
                maxLength={6}
                disabled={loading}
                style={
                  styles.codeInput
                }
                required
                autoFocus
              />
            </div>

            <div
              style={
                styles.codeInfo
              }
            >
              {codeExpiresIn > 0 ? (
                <span>
                  {tr("codeValidFor")}{" "}
                  <strong>
                    {formatTime(
                      codeExpiresIn
                    )}
                  </strong>
                </span>
              ) : (
                <span
                  style={
                    styles.expiredText
                  }
                >
                  {tr("codeExpired")}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                code.length !== 6 ||
                codeExpiresIn <= 0
              }
              style={{
                ...styles.submitButton,

                ...(loading ||
                code.length !== 6 ||
                codeExpiresIn <= 0
                  ? styles.disabledButton
                  : {}),
              }}
            >
              {loading
                ? tr("checkingCode")
                : tr("confirmRegistration")}
            </button>

            <button
              type="button"
              onClick={
                handleResendCode
              }
              disabled={
                resendLoading ||
                resendDelay > 0
              }
              style={{
                ...styles.secondaryButton,

                ...(resendLoading ||
                resendDelay > 0
                  ? styles.disabledButton
                  : {}),
              }}
            >
              <RiRefreshLine />

              {resendLoading
                ? tr("sending")
                : resendDelay > 0
                  ? `${tr("resendAfter")} ${resendDelay} ${tr("secondsShort")}`
                  : tr("sendNewCode")}
            </button>

            <button
              type="button"
              onClick={
                handleChangeRegistrationData
              }
              disabled={loading}
              style={styles.backButton}
            >
              <RiArrowLeftLine />
              {tr("changeData")}
            </button>
          </form>
        )}

        <footer style={styles.footer}>
          <p style={styles.footerText}>
            {tr("alreadyHaveAccount")}{" "}

            <Link
              to="/login"
              style={styles.footerLink}
            >
              {tr("login")}
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box",
    padding: "80px 20px 40px",
    background:
      "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    fontFamily:
      "'Outfit', 'Inter', sans-serif",
    position: "relative",
    overflowX: "hidden",
  },

  bgBlob1: {
    position: "absolute",
    width: "420px",
    height: "420px",
    background:
      "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(0,0,0,0) 70%)",
    top: "-160px",
    left: "-160px",
    borderRadius: "50%",
  },

  bgBlob2: {
    position: "absolute",
    width: "520px",
    height: "520px",
    background:
      "radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(0,0,0,0) 70%)",
    right: "-200px",
    bottom: "-220px",
    borderRadius: "50%",
  },

  langSelector: {
    position: "absolute",
    top: "20px",
    right: "20px",
    zIndex: 20,
  },

  langButton: {
    background:
      "rgba(255,255,255,0.06)",
    border:
      "1px solid rgba(255,255,255,0.14)",
    color: "#ffffff",
    padding: "9px 17px",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
  },

  card: {
    width: "100%",
    maxWidth: "720px",
    boxSizing: "border-box",
    padding: "38px",
    background:
      "rgba(15,23,42,0.72)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter:
      "blur(20px)",
    border:
      "1px solid rgba(255,255,255,0.1)",
    borderRadius: "24px",
    boxShadow:
      "0 24px 60px rgba(0,0,0,0.35)",
    position: "relative",
    zIndex: 10,
  },

  header: {
    textAlign: "center",
    marginBottom: "27px",
  },

  logoContainer: {
    width: "62px",
    height: "62px",
    margin: "0 auto 16px",
    borderRadius: "17px",
    background:
      "linear-gradient(135deg, #6366f1 0%, #10b981 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  logoIcon: {
    fontSize: "31px",
    color: "#ffffff",
  },

  title: {
    margin: "0 0 5px",
    color: "#ffffff",
    fontSize: "28px",
    fontWeight: 800,
  },

  subtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
  },

  errorAlert: {
    marginBottom: "18px",
    padding: "12px 15px",
    borderRadius: "12px",
    background:
      "rgba(239,68,68,0.15)",
    border:
      "1px solid rgba(239,68,68,0.32)",
    color: "#fca5a5",
    textAlign: "center",
  },

  successAlert: {
    marginBottom: "18px",
    padding: "12px 15px",
    borderRadius: "12px",
    background:
      "rgba(16,185,129,0.15)",
    border:
      "1px solid rgba(16,185,129,0.32)",
    color: "#6ee7b7",
    textAlign: "center",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  formSection: {
    padding: "20px",
    borderRadius: "16px",
    border:
      "1px solid rgba(255,255,255,0.08)",
    background:
      "rgba(255,255,255,0.025)",
  },

  formSectionTitle: {
    margin: "0 0 5px",
    color: "#ffffff",
    fontSize: "17px",
  },

  formSectionText: {
    margin: "0 0 18px",
    color: "#64748b",
    fontSize: "12px",
  },

  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "15px",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginBottom: "15px",
  },

  label: {
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 15px",
    background:
      "rgba(0,0,0,0.22)",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "15px",
    outline: "none",
    colorScheme: "dark",
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 15px",
    background: "#10172a",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "15px",
    outline: "none",
  },

  inputHint: {
    color: "#64748b",
    fontSize: "11px",
  },

  codeInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "15px",
    background:
      "rgba(0,0,0,0.22)",
    border:
      "1px solid rgba(255,255,255,0.14)",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "28px",
    fontWeight: 800,
    letterSpacing: "10px",
    textAlign: "center",
    outline: "none",
  },

  submitButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    background:
      "rgba(16,185,129,0.12)",
    border:
      "1px solid rgba(16,185,129,0.25)",
    color: "#6ee7b7",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
  },

  backButton: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },

  disabledButton: {
    cursor: "not-allowed",
    opacity: 0.55,
  },

  registrationSummary: {
    display: "grid",
    gap: "12px",
    padding: "17px",
    borderRadius: "14px",
    background:
      "rgba(255,255,255,0.045)",
  },

  summaryLabel: {
    display: "block",
    marginBottom: "3px",
    color: "#64748b",
    fontSize: "10px",
    textTransform: "uppercase",
  },

  summaryValue: {
    display: "block",
    color: "#e2e8f0",
    fontSize: "14px",
  },

  codeInfo: {
    color: "#94a3b8",
    textAlign: "center",
  },

  expiredText: {
    color: "#fca5a5",
  },

  footer: {
    marginTop: "25px",
    textAlign: "center",
  },

  footerText: {
    margin: 0,
    color: "#94a3b8",
  },

  footerLink: {
    color: "#818cf8",
    textDecoration: "none",
    fontWeight: 700,
  },
};

