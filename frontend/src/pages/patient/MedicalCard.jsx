import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../api/api";

import {
  RiCalendarLine,
  RiDownload2Line,
  RiFileTextLine,
  RiHeartPulseLine,
  RiRefreshLine,
  RiUserHeartLine,
} from "react-icons/ri";

import { useLanguage } from "../../i18n/LanguageContext";

const EMPTY_FORM = {
  blood_type: "",
  rh_factor: "",
  allergies: "",
  chronic_conditions: "",
  surgeries: "",
  contraindications: "",
  important_notes: "",
  analyses: "",
};

const TEXTS = {
  ru: {
    errorDefault: "Произошла ошибка.",
    notSpecified: "Не указано",
    notSpecifiedMasculine: "Не указан",
    notSpecifiedFeminine: "Не указана",
    notSpecifiedLower: "не указан",

    male: "Мужской",
    female: "Женский",

    rhPositive: "Положительный (+)",
    rhNegative: "Отрицательный (-)",

    statusActive: "Действует",
    statusExpired: "Срок истёк",
    statusCancelled: "Аннулирован",

    cardLoadFailed: "Не удалось загрузить медицинскую карту.",
    certificateIdMissing: "Не найден идентификатор справки.",
    downloadLinkMissing: "Ссылка на файл не получена.",
    certificateOpenFailed: "Не удалось открыть справку.",

    loading: "Загрузка медицинской карты...",
    title: "Моя медицинская карта",
    subtitle:
      "Медицинские сведения доступны только для просмотра. Изменения вносит врач во время активного приёма.",
    refresh: "Обновить",

    patientDefault: "Пациент",
    patientInitial: "П",
    iin: "ИИН",
    age: "Возраст",
    gender: "Пол",

    tabProfile: "Основные данные",
    tabMetrics: "Показатели",
    tabVisits: "История приёмов",
    tabCertificates: "Справки",

    personalInfo: "Личная информация",
    fullName: "ФИО",
    birthDate: "Дата рождения",

    medicalInfo: "Медицинские сведения",
    medicalInfoReadOnly: "Эти данные доступны только для просмотра.",
    updated: "Обновлено",
    bloodType: "Группа крови",
    rhFactor: "Резус-фактор",
    allergies: "Аллергии",
    chronicConditions: "Хронические заболевания",
    surgeries: "Перенесённые операции",
    contraindications: "Противопоказания",
    importantNotes: "Дополнительная важная информация",
    analyses: "Анализы и результаты обследований",

    healthMetrics: "Показатели здоровья",
    metricsEmpty: "Показатели здоровья пока отсутствуют.",
    metricDefault: "Показатель",

    visitsHistory: "История приёмов",
    visitsEmpty: "История медицинских приёмов пока отсутствует.",
    medicalVisit: "Медицинский приём",
    complaints: "Жалобы",
    symptoms: "Симптомы",
    diagnosis: "Диагноз",
    treatment: "Лечение",
    recommendations: "Рекомендации",
    comment: "Дополнительный комментарий",

    medicalCertificates: "Медицинские справки",
    certificatesEmpty: "Медицинские справки пока отсутствуют.",
    certificateDefault: "Медицинская справка",
    opening: "Открытие...",
    open: "Открыть",
  },

  kk: {
    errorDefault: "Қате орын алды.",
    notSpecified: "Көрсетілмеген",
    notSpecifiedMasculine: "Көрсетілмеген",
    notSpecifiedFeminine: "Көрсетілмеген",
    notSpecifiedLower: "көрсетілмеген",

    male: "Ер",
    female: "Әйел",

    rhPositive: "Оң (+)",
    rhNegative: "Теріс (-)",

    statusActive: "Жарамды",
    statusExpired: "Мерзімі аяқталған",
    statusCancelled: "Күші жойылған",

    cardLoadFailed: "Медициналық картаны жүктеу мүмкін болмады.",
    certificateIdMissing: "Анықтаманың идентификаторы табылмады.",
    downloadLinkMissing: "Файлға сілтеме алынбады.",
    certificateOpenFailed: "Анықтаманы ашу мүмкін болмады.",

    loading: "Медициналық карта жүктелуде...",
    title: "Менің медициналық картам",
    subtitle:
      "Медициналық мәліметтер тек көруге қолжетімді. Өзгерістерді дәрігер белсенді қабылдау кезінде енгізеді.",
    refresh: "Жаңарту",

    patientDefault: "Емделуші",
    patientInitial: "Е",
    iin: "ЖСН",
    age: "Жасы",
    gender: "Жынысы",

    tabProfile: "Негізгі деректер",
    tabMetrics: "Көрсеткіштер",
    tabVisits: "Қабылдаулар тарихы",
    tabCertificates: "Анықтамалар",

    personalInfo: "Жеке ақпарат",
    fullName: "Аты-жөні",
    birthDate: "Туған күні",

    medicalInfo: "Медициналық мәліметтер",
    medicalInfoReadOnly: "Бұл деректер тек көруге қолжетімді.",
    updated: "Жаңартылды",
    bloodType: "Қан тобы",
    rhFactor: "Резус-фактор",
    allergies: "Аллергиялар",
    chronicConditions: "Созылмалы аурулар",
    surgeries: "Өткізілген операциялар",
    contraindications: "Қарсы көрсетілімдер",
    importantNotes: "Қосымша маңызды ақпарат",
    analyses: "Талдаулар және тексеру нәтижелері",

    healthMetrics: "Денсаулық көрсеткіштері",
    metricsEmpty: "Денсаулық көрсеткіштері әзірге жоқ.",
    metricDefault: "Көрсеткіш",

    visitsHistory: "Қабылдаулар тарихы",
    visitsEmpty: "Медициналық қабылдаулар тарихы әзірге жоқ.",
    medicalVisit: "Медициналық қабылдау",
    complaints: "Шағымдар",
    symptoms: "Белгілер",
    diagnosis: "Диагноз",
    treatment: "Емдеу",
    recommendations: "Ұсынымдар",
    comment: "Қосымша түсініктеме",

    medicalCertificates: "Медициналық анықтамалар",
    certificatesEmpty: "Медициналық анықтамалар әзірге жоқ.",
    certificateDefault: "Медициналық анықтама",
    opening: "Ашылуда...",
    open: "Ашу",
  },
};

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function clean(value) {
  return String(value ?? "").trim();
}

function getErrorMessage(
  error,
  fallback
) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function formatDate(
  value,
  locale,
  fallback
) {
  if (!value) {
    return fallback;
  }

  const normalizedValue =
    String(value).length === 10
      ? `${value}T12:00:00`
      : value;

  const date =
    new Date(normalizedValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleDateString(
    locale,
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

function formatDateTime(
  value,
  locale,
  fallback
) {
  if (!value) {
    return fallback;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleString(
    locale,
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getGenderLabel(
  value,
  text
) {
  const gender =
    clean(value).toLowerCase();

  if (gender === "male") {
    return text.male;
  }

  if (gender === "female") {
    return text.female;
  }

  return (
    clean(value) ||
    text.notSpecifiedMasculine
  );
}

function getBloodLabel(
  value,
  text
) {
  const labels = {
    "O(I)": "O (I)",
    "A(II)": "A (II)",
    "B(III)": "B (III)",
    "AB(IV)": "AB (IV)",
  };

  return (
    labels[clean(value)] ||
    text.notSpecifiedFeminine
  );
}

function getRhLabel(
  value,
  text
) {
  if (value === "positive") {
    return text.rhPositive;
  }

  if (value === "negative") {
    return text.rhNegative;
  }

  return text.notSpecifiedMasculine;
}

function getCertificateStatus(
  certificate,
  text
) {
  const value =
    clean(
      certificate?.display_status ||
        certificate?.status
    );

  const labels = {
    active: text.statusActive,
    expired: text.statusExpired,
    cancelled: text.statusCancelled,
  };

  return (
    labels[value] ||
    value ||
    text.notSpecifiedMasculine
  );
}

function PersonalItem({
  icon,
  label,
  value,
  fallback,
}) {
  return (
    <div style={styles.personalItem}>
      <div style={styles.personalIcon}>
        {icon}
      </div>

      <div>
        <span
          style={
            styles.personalLabel
          }
        >
          {label}
        </span>

        <strong
          style={
            styles.personalValue
          }
        >
          {value || fallback}
        </strong>
      </div>
    </div>
  );
}

function ReadOnlyTextField({
  label,
  value,
  rows = 4,
}) {
  return (
    <div style={styles.formGroup}>
      <label style={styles.formLabel}>
        {label}
      </label>

      <textarea
        value={value || ""}
        rows={rows}
        readOnly
        style={
          styles.readOnlyTextarea
        }
      />
    </div>
  );
}

function ReadOnlyValue({
  label,
  value,
  fallback,
}) {
  return (
    <div style={styles.formGroup}>
      <label style={styles.formLabel}>
        {label}
      </label>

      <div
        style={
          styles.readOnlyInput
        }
      >
        {value || fallback}
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  fallback,
}) {
  return (
    <div style={styles.detailItem}>
      <span style={styles.detailLabel}>
        {label}
      </span>

      <p style={styles.detailValue}>
        {clean(value) ||
          fallback}
      </p>
    </div>
  );
}

export default function MedicalCard() {
  const { language } =
    useLanguage();

  const isKazakh =
    language === "kk" ||
    language === "kz";

  const text =
    isKazakh
      ? TEXTS.kk
      : TEXTS.ru;

  const locale =
    isKazakh
      ? "kk-KZ"
      : "ru-RU";

  const [card, setCard] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [
    activeSection,
    setActiveSection,
  ] = useState("profile");

  const [loading, setLoading] =
    useState(true);

  const [
    openingId,
    setOpeningId,
  ] = useState("");

  const [error, setError] =
    useState("");

  const loadMedicalCard =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await api.get(
            "/medical-card"
          );

        if (
          !response.data?.success
        ) {
          throw new Error(
            response.data?.message ||
              text.cardLoadFailed
          );
        }

        const nextCard =
          response.data.data;

        setCard(nextCard);

        const medicalProfile =
          nextCard?.medical_profile ||
          {};

        setForm({
          blood_type:
            medicalProfile.blood_type ||
            "",

          rh_factor:
            medicalProfile.rh_factor ||
            "",

          allergies:
            medicalProfile.allergies ||
            "",

          chronic_conditions:
            medicalProfile
              .chronic_conditions ||
            "",

          surgeries:
            medicalProfile.surgeries ||
            "",

          contraindications:
            medicalProfile
              .contraindications ||
            "",

          important_notes:
            medicalProfile
              .important_notes ||
            "",

          analyses:
            medicalProfile.analyses ||
            "",
        });
      } catch (requestError) {
        console.error(
          "Medical card loading error:",
          requestError
        );

        setError(
          getErrorMessage(
            requestError,
            text.cardLoadFailed
          )
        );
      } finally {
        setLoading(false);
      }
    }, [text]);

  useEffect(() => {
    loadMedicalCard();
  }, [loadMedicalCard]);

  const visits = useMemo(
    () =>
      [
        ...safeArray(
          card?.visits
        ),
      ].sort(
        (first, second) => {
          const firstTime =
            new Date(
              first?.created_at ||
                0
            ).getTime();

          const secondTime =
            new Date(
              second?.created_at ||
                0
            ).getTime();

          return (
            secondTime -
            firstTime
          );
        }
      ),
    [card?.visits]
  );

  const metrics = useMemo(
    () =>
      [
        ...safeArray(
          card?.metrics
        ),
      ].sort(
        (first, second) => {
          const firstTime =
            new Date(
              first?.measured_at ||
                first?.created_at ||
                0
            ).getTime();

          const secondTime =
            new Date(
              second?.measured_at ||
                second?.created_at ||
                0
            ).getTime();

          return (
            secondTime -
            firstTime
          );
        }
      ),
    [card?.metrics]
  );

  const certificates =
    safeArray(
      card?.certificates
    ).filter((item) => {
      const scope =
        clean(
          item?.document_scope
        );

      if (scope) {
        return (
          scope ===
          "certificate"
        );
      }

      return true;
    });

  async function openCertificate(
    certificate
  ) {
    if (!certificate?.id) {
      setError(
        text.certificateIdMissing
      );

      return;
    }

    setOpeningId(
      certificate.id
    );

    setError("");

    try {
      const response =
        await api.get(
          `/certificates/${certificate.id}/download`
        );

      const signedUrl =
        response?.data?.data
          ?.signedUrl;

      if (!signedUrl) {
        throw new Error(
          text.downloadLinkMissing
        );
      }

      const openedWindow =
        window.open(
          signedUrl,
          "_blank",
          "noopener,noreferrer"
        );

      if (!openedWindow) {
        window.location.href =
          signedUrl;
      }
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          text.certificateOpenFailed
        )
      );
    } finally {
      setOpeningId("");
    }
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />

        <p>
          {text.loading}
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {text.title}
          </h1>

          <p style={styles.subtitle}>
            {text.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={
            loadMedicalCard
          }
          disabled={loading}
          style={
            styles.refreshButton
          }
        >
          <RiRefreshLine />
          {text.refresh}
        </button>
      </header>

      {error && (
        <div style={styles.errorAlert}>
          {error}
        </div>
      )}

      <section
        style={
          styles.patientHeader
        }
      >
        <div style={styles.avatar}>
          {clean(
            card?.profile?.full_name
          )
            .slice(0, 1)
            .toUpperCase() ||
            text.patientInitial}
        </div>

        <div>
          <h2
            style={
              styles.patientName
            }
          >
            {card?.profile
              ?.full_name ||
              text.patientDefault}
          </h2>

          <div
            style={
              styles.patientMeta
            }
          >
            <span>
              {text.iin}:{" "}
              {card?.profile?.iin ||
                text.notSpecifiedLower}
            </span>

            <span>
              {text.age}:{" "}
              {card?.profile?.age ??
                text.notSpecifiedLower}
            </span>

            <span>
              {text.gender}:{" "}
              {getGenderLabel(
                card?.profile
                  ?.gender,
                text
              )}
            </span>
          </div>
        </div>
      </section>

      <nav style={styles.navigation}>
        <button
          type="button"
          onClick={() =>
            setActiveSection(
              "profile"
            )
          }
          style={{
            ...styles.navigationButton,

            ...(activeSection ===
            "profile"
              ? styles.activeNavigationButton
              : {}),
          }}
        >
          <RiUserHeartLine />
          {text.tabProfile}
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveSection(
              "metrics"
            )
          }
          style={{
            ...styles.navigationButton,

            ...(activeSection ===
            "metrics"
              ? styles.activeNavigationButton
              : {}),
          }}
        >
          <RiHeartPulseLine />
          {text.tabMetrics}
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveSection(
              "visits"
            )
          }
          style={{
            ...styles.navigationButton,

            ...(activeSection ===
            "visits"
              ? styles.activeNavigationButton
              : {}),
          }}
        >
          <RiCalendarLine />
          {text.tabVisits}
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveSection(
              "certificates"
            )
          }
          style={{
            ...styles.navigationButton,

            ...(activeSection ===
            "certificates"
              ? styles.activeNavigationButton
              : {}),
          }}
        >
          <RiFileTextLine />
          {text.tabCertificates}
        </button>
      </nav>

      {activeSection ===
        "profile" && (
        <>
          <section
            style={
              styles.infoCard
            }
          >
            <h3
              style={
                styles.sectionTitle
              }
            >
              {text.personalInfo}
            </h3>

            <div
              style={
                styles.personalGrid
              }
            >
              <PersonalItem
                icon={
                  <RiUserHeartLine />
                }
                label={text.fullName}
                value={
                  card?.profile
                    ?.full_name
                }
                fallback={
                  text.notSpecified
                }
              />

              <PersonalItem
                icon={
                  <RiFileTextLine />
                }
                label={text.iin}
                value={
                  card?.profile?.iin
                }
                fallback={
                  text.notSpecified
                }
              />

              <PersonalItem
                icon={
                  <RiCalendarLine />
                }
                label={text.birthDate}
                value={formatDate(
                  card?.profile
                    ?.birth_date,
                  locale,
                  text.notSpecified
                )}
                fallback={
                  text.notSpecified
                }
              />

              <PersonalItem
                icon={
                  <RiUserHeartLine />
                }
                label={text.gender}
                value={getGenderLabel(
                  card?.profile
                    ?.gender,
                  text
                )}
                fallback={
                  text.notSpecified
                }
              />
            </div>
          </section>

          <section
            style={
              styles.formCard
            }
          >
            <div
              style={
                styles.formHeader
              }
            >
              <div>
                <h3
                  style={
                    styles.sectionTitle
                  }
                >
                  {text.medicalInfo}
                </h3>

                <p
                  style={
                    styles.sectionSubtitle
                  }
                >
                  {text.medicalInfoReadOnly}
                </p>
              </div>

              {card?.medical_profile
                ?.updated_at && (
                <span
                  style={
                    styles.updatedDate
                  }
                >
                  {text.updated}:{" "}
                  {formatDateTime(
                    card
                      .medical_profile
                      .updated_at,
                    locale,
                    text.notSpecified
                  )}
                </span>
              )}
            </div>

            <div
              style={
                styles.twoColumns
              }
            >
              <ReadOnlyValue
                label={text.bloodType}
                value={getBloodLabel(
                  form.blood_type,
                  text
                )}
                fallback={
                  text.notSpecified
                }
              />

              <ReadOnlyValue
                label={text.rhFactor}
                value={getRhLabel(
                  form.rh_factor,
                  text
                )}
                fallback={
                  text.notSpecified
                }
              />
            </div>

            <ReadOnlyTextField
              label={text.allergies}
              value={
                form.allergies
              }
            />

            <ReadOnlyTextField
              label={
                text.chronicConditions
              }
              value={
                form
                  .chronic_conditions
              }
            />

            <ReadOnlyTextField
              label={text.surgeries}
              value={
                form.surgeries
              }
            />

            <ReadOnlyTextField
              label={
                text.contraindications
              }
              value={
                form
                  .contraindications
              }
            />

            <ReadOnlyTextField
              label={
                text.importantNotes
              }
              value={
                form
                  .important_notes
              }
            />

            <ReadOnlyTextField
              label={text.analyses}
              value={
                form.analyses
              }
              rows={6}
            />
          </section>
        </>
      )}

      {activeSection ===
        "metrics" && (
        <section
          style={
            styles.infoCard
          }
        >
          <h3
            style={
              styles.sectionTitle
            }
          >
            {text.healthMetrics}
          </h3>

          {metrics.length === 0 ? (
            <div style={styles.empty}>
              {text.metricsEmpty}
            </div>
          ) : (
            <div
              style={
                styles.metricsGrid
              }
            >
              {metrics.map(
                (metric) => (
                  <article
                    key={metric.id}
                    style={
                      styles.metricCard
                    }
                  >
                    <span
                      style={
                        styles.metricType
                      }
                    >
                      {metric.metric_type ||
                        text.metricDefault}
                    </span>

                    <strong
                      style={
                        styles.metricValue
                      }
                    >
                      {metric.value ??
                        "—"}{" "}
                      {metric.unit || ""}
                    </strong>

                    <span
                      style={
                        styles.metricDate
                      }
                    >
                      {formatDateTime(
                        metric.measured_at ||
                          metric.created_at,
                        locale,
                        text.notSpecified
                      )}
                    </span>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      )}

      {activeSection ===
        "visits" && (
        <section
          style={
            styles.infoCard
          }
        >
          <h3
            style={
              styles.sectionTitle
            }
          >
            {text.visitsHistory}
          </h3>

          {visits.length === 0 ? (
            <div style={styles.empty}>
              {text.visitsEmpty}
            </div>
          ) : (
            <div style={styles.list}>
              {visits.map(
                (visit) => (
                  <article
                    key={visit.id}
                    style={
                      styles.listCard
                    }
                  >
                    <div
                      style={
                        styles.listCardHeader
                      }
                    >
                      <strong>
                        {text.medicalVisit}
                      </strong>

                      <span
                        style={
                          styles.listDate
                        }
                      >
                        {formatDateTime(
                          visit.created_at,
                          locale,
                          text.notSpecified
                        )}
                      </span>
                    </div>

                    <DetailItem
                      label={text.complaints}
                      value={
                        visit.complaints
                      }
                      fallback={
                        text.notSpecified
                      }
                    />

                    <DetailItem
                      label={text.symptoms}
                      value={
                        visit.symptoms
                      }
                      fallback={
                        text.notSpecified
                      }
                    />

                    <DetailItem
                      label={text.diagnosis}
                      value={
                        visit
                          .final_diagnosis ||
                        visit
                          .preliminary_diagnosis
                      }
                      fallback={
                        text.notSpecified
                      }
                    />

                    <DetailItem
                      label={text.treatment}
                      value={
                        visit.treatment
                      }
                      fallback={
                        text.notSpecified
                      }
                    />

                    <DetailItem
                      label={
                        text.recommendations
                      }
                      value={
                        visit
                          .recommendations
                      }
                      fallback={
                        text.notSpecified
                      }
                    />

                    <DetailItem
                      label={text.comment}
                      value={
                        visit.comment ||
                        visit
                          .additional_comment
                      }
                      fallback={
                        text.notSpecified
                      }
                    />
                  </article>
                )
              )}
            </div>
          )}
        </section>
      )}

      {activeSection ===
        "certificates" && (
        <section
          style={
            styles.infoCard
          }
        >
          <h3
            style={
              styles.sectionTitle
            }
          >
            {text.medicalCertificates}
          </h3>

          {certificates.length ===
          0 ? (
            <div style={styles.empty}>
              {text.certificatesEmpty}
            </div>
          ) : (
            <div style={styles.list}>
              {certificates.map(
                (certificate) => (
                  <article
                    key={
                      certificate.id
                    }
                    style={
                      styles.certificateCard
                    }
                  >
                    <RiFileTextLine
                      style={
                        styles.certificateIcon
                      }
                    />

                    <div
                      style={{
                        flex: 1,
                      }}
                    >
                      <strong>
                        {certificate.title ||
                          certificate
                            .certificate_type ||
                          text.certificateDefault}
                      </strong>

                      <span
                        style={
                          styles.certificateDate
                        }
                      >
                        {formatDate(
                          certificate
                            .issue_date ||
                            certificate
                              .created_at,
                          locale,
                          text.notSpecified
                        )}
                      </span>

                      <span
                        style={
                          styles.certificateStatus
                        }
                      >
                        {getCertificateStatus(
                          certificate,
                          text
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openCertificate(
                          certificate
                        )
                      }
                      disabled={
                        openingId ===
                        certificate.id
                      }
                      style={{
                        ...styles.openButton,

                        ...(openingId ===
                        certificate.id
                          ? styles.disabledButton
                          : {}),
                      }}
                    >
                      <RiDownload2Line />

                      {openingId ===
                      certificate.id
                        ? text.opening
                        : text.open}
                    </button>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1450px",
    margin: "0 auto",
    padding: "30px",
    color: "#ffffff",
    fontFamily:
      "'Outfit', sans-serif",
  },

  loading: {
    minHeight: "70vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: "15px",
    color: "#94a3b8",
  },

  spinner: {
    width: "44px",
    height: "44px",
    border:
      "3px solid rgba(255,255,255,0.1)",
    borderTop:
      "3px solid #6366f1",
    borderRadius: "50%",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "20px",
    marginBottom: "24px",
  },

  title: {
    margin: "0 0 8px",
    fontSize: "32px",
    fontWeight: 800,
  },

  subtitle: {
    maxWidth: "760px",
    margin: 0,
    color: "#94a3b8",
    fontSize: "15px",
    lineHeight: 1.6,
  },

  refreshButton: {
    minHeight: "42px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 16px",
    border:
      "1px solid rgba(129,140,248,0.35)",
    borderRadius: "11px",
    background:
      "rgba(99,102,241,0.13)",
    color: "#c7d2fe",
    fontWeight: 700,
    cursor: "pointer",
  },

  errorAlert: {
    marginBottom: "18px",
    padding: "14px 16px",
    border:
      "1px solid rgba(251,113,133,0.35)",
    borderRadius: "12px",
    background:
      "rgba(190,18,60,0.13)",
    color: "#fecdd3",
  },

  patientHeader: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    padding: "20px",
    border:
      "1px solid rgba(148,163,184,0.1)",
    borderRadius: "16px",
    background:
      "rgba(30,41,59,0.42)",
  },

  avatar: {
    width: "62px",
    height: "62px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "18px",
    background:
      "linear-gradient(135deg,#4f46e5,#7c3aed)",
    fontSize: "25px",
    fontWeight: 800,
  },

  patientName: {
    margin: "0 0 7px",
    fontSize: "23px",
  },

  patientMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 18px",
    color: "#94a3b8",
    fontSize: "12px",
  },

  navigation: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "20px",
  },

  navigationButton: {
    minHeight: "42px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "0 14px",
    border:
      "1px solid rgba(148,163,184,0.12)",
    borderRadius: "10px",
    background:
      "rgba(15,23,42,0.45)",
    color: "#94a3b8",
    fontWeight: 700,
    cursor: "pointer",
  },

  activeNavigationButton: {
    borderColor: "#6366f1",
    background:
      "rgba(99,102,241,0.2)",
    color: "#ffffff",
  },

  infoCard: {
    marginBottom: "18px",
    padding: "22px",
    border:
      "1px solid rgba(148,163,184,0.1)",
    borderRadius: "16px",
    background:
      "rgba(30,41,59,0.42)",
  },

  formCard: {
    padding: "22px",
    border:
      "1px solid rgba(148,163,184,0.1)",
    borderRadius: "16px",
    background:
      "rgba(30,41,59,0.42)",
  },

  sectionTitle: {
    margin: "0 0 8px",
    fontSize: "20px",
  },

  sectionSubtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
  },

  formHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    flexWrap: "wrap",
    gap: "14px",
    marginBottom: "20px",
  },

  updatedDate: {
    color: "#64748b",
    fontSize: "11px",
  },

  personalGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "11px",
    marginTop: "17px",
  },

  personalItem: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "14px",
    borderRadius: "12px",
    background:
      "rgba(15,23,42,0.48)",
  },

  personalIcon: {
    width: "37px",
    height: "37px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "10px",
    background:
      "rgba(99,102,241,0.15)",
    color: "#818cf8",
  },

  personalLabel: {
    display: "block",
    marginBottom: "4px",
    color: "#64748b",
    fontSize: "9px",
    textTransform: "uppercase",
  },

  personalValue: {
    color: "#e2e8f0",
    fontSize: "12px",
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(240px,1fr))",
    gap: "13px",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginBottom: "15px",
  },

  formLabel: {
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: 700,
  },

  readOnlyInput: {
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    border:
      "1px solid rgba(148,163,184,0.14)",
    borderRadius: "10px",
    background: "#11182e",
    color: "#ffffff",
  },

  readOnlyTextarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border:
      "1px solid rgba(148,163,184,0.14)",
    borderRadius: "10px",
    outline: "none",
    resize: "none",
    background: "#11182e",
    color: "#ffffff",
    fontFamily: "inherit",
    lineHeight: 1.55,
    cursor: "default",
  },

  metricsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: "11px",
    marginTop: "17px",
  },

  metricCard: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "16px",
    borderRadius: "13px",
    background:
      "rgba(15,23,42,0.48)",
  },

  metricType: {
    color: "#94a3b8",
    fontSize: "11px",
  },

  metricValue: {
    color: "#f8fafc",
    fontSize: "18px",
  },

  metricDate: {
    color: "#64748b",
    fontSize: "9px",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "17px",
  },

  listCard: {
    padding: "17px",
    borderRadius: "13px",
    background:
      "rgba(15,23,42,0.48)",
  },

  listCardHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "13px",
  },

  listDate: {
    color: "#64748b",
    fontSize: "10px",
  },

  detailItem: {
    marginTop: "9px",
    padding: "11px 13px",
    borderRadius: "9px",
    background:
      "rgba(2,6,23,0.24)",
  },

  detailLabel: {
    display: "block",
    marginBottom: "4px",
    color: "#818cf8",
    fontSize: "9px",
    fontWeight: 800,
    textTransform: "uppercase",
  },

  detailValue: {
    margin: 0,
    color: "#e2e8f0",
    fontSize: "12px",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },

  certificateCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "15px",
    borderRadius: "12px",
    background:
      "rgba(15,23,42,0.48)",
  },

  certificateIcon: {
    color: "#818cf8",
    fontSize: "25px",
  },

  certificateDate: {
    display: "block",
    marginTop: "4px",
    color: "#64748b",
    fontSize: "10px",
  },

  certificateStatus: {
    display: "inline-block",
    marginTop: "5px",
    padding: "3px 7px",
    borderRadius: "999px",
    background:
      "rgba(99,102,241,0.13)",
    color: "#c7d2fe",
    fontSize: "9px",
  },

  openButton: {
    minHeight: "36px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "0 11px",
    border: "none",
    borderRadius: "8px",
    background:
      "rgba(99,102,241,0.17)",
    color: "#c7d2fe",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },

  disabledButton: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  empty: {
    marginTop: "17px",
    padding: "36px",
    borderRadius: "12px",
    background:
      "rgba(15,23,42,0.35)",
    color: "#64748b",
    textAlign: "center",
  },
};
