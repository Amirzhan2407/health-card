import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  RiDownload2Line,
  RiFileExcel2Line,
  RiFileImageLine,
  RiFilePaper2Line,
  RiFileTextLine,
  RiRefreshLine,
} from "react-icons/ri";

import api from "../../api/api";
import { useLanguage } from "../../i18n/LanguageContext";

const PATIENT_CERTIFICATE_TYPES =
  new Set([
    "health_status",
    "sick_leave",
    "medical_certificate",
    "education",
    "employment",
    "sports",
  ]);

const TEXTS = {
  ru: {
    title: "Медицинские справки",
    subtitle:
      "Справки и другие медицинские файлы, выданные врачами.",
    refreshing: "Обновление...",
    refresh: "Обновить",
    loadingDocuments:
      "Загрузка медицинских документов...",
    emptyDocuments:
      "У вас пока нет выданных медицинских справок.",
    loadFailed:
      "Не удалось загрузить медицинские справки.",
    documentIdMissing:
      "Не найден идентификатор документа.",
    signedUrlMissing:
      "Backend не вернул ссылку на файл.",
    openFailed:
      "Не удалось открыть или скачать файл.",
    defaultDocument:
      "Медицинский документ",
    defaultFile: "Файл",
    type: "Тип",
    organization: "Организация",
    doctor: "Врач",
    issueDate: "Дата выдачи",
    validUntil: "Действителен до",
    gettingFile: "Получение файла...",
    viewDownload: "Просмотр / Скачать",
    notSpecified: "Не указано",
    notSpecifiedFemale: "Не указана",
    defaultOrganization:
      "Медицинская организация",
    defaultDoctor: "Врач",
    statusActive: "Действует",
    statusExpired: "Срок истёк",
    statusCancelled: "Аннулирован",
    typeHealthStatus:
      "Справка о состоянии здоровья",
    typeSickLeave:
      "Справка о нетрудоспособности",
    typeMedicalCertificate:
      "Медицинская справка",
    typeEducation:
      "Для учебного заведения",
    typeEmployment:
      "Для места работы",
    typeSports:
      "Для спортивной секции",
    typeExaminationResult:
      "Результат обследования",
    typePrescription:
      "Рецепт или назначение",
    typeImage:
      "Медицинское изображение",
    typeOther:
      "Другой медицинский документ",
    genericError: "Произошла ошибка.",
    bytes: "Б",
    kilobytes: "КБ",
    megabytes: "МБ",
  },

  kk: {
    title: "Медициналық анықтамалар",
    subtitle:
      "Дәрігерлер берген анықтамалар және басқа медициналық файлдар.",
    refreshing: "Жаңартылуда...",
    refresh: "Жаңарту",
    loadingDocuments:
      "Медициналық құжаттар жүктелуде...",
    emptyDocuments:
      "Сізге әзірге медициналық анықтамалар берілмеген.",
    loadFailed:
      "Медициналық анықтамаларды жүктеу мүмкін болмады.",
    documentIdMissing:
      "Құжаттың идентификаторы табылмады.",
    signedUrlMissing:
      "Сервер файлға сілтемені қайтармады.",
    openFailed:
      "Файлды ашу немесе жүктеп алу мүмкін болмады.",
    defaultDocument:
      "Медициналық құжат",
    defaultFile: "Файл",
    type: "Түрі",
    organization: "Ұйым",
    doctor: "Дәрігер",
    issueDate: "Берілген күні",
    validUntil: "Жарамдылық мерзімі",
    gettingFile: "Файл алынуда...",
    viewDownload: "Қарау / Жүктеп алу",
    notSpecified: "Көрсетілмеген",
    notSpecifiedFemale: "Көрсетілмеген",
    defaultOrganization:
      "Медициналық ұйым",
    defaultDoctor: "Дәрігер",
    statusActive: "Жарамды",
    statusExpired: "Мерзімі аяқталған",
    statusCancelled: "Күші жойылған",
    typeHealthStatus:
      "Денсаулық жағдайы туралы анықтама",
    typeSickLeave:
      "Еңбекке жарамсыздық туралы анықтама",
    typeMedicalCertificate:
      "Медициналық анықтама",
    typeEducation:
      "Оқу орнына арналған",
    typeEmployment:
      "Жұмыс орнына арналған",
    typeSports:
      "Спорт секциясына арналған",
    typeExaminationResult:
      "Тексеру нәтижесі",
    typePrescription:
      "Рецепт немесе тағайындау",
    typeImage:
      "Медициналық кескін",
    typeOther:
      "Басқа медициналық құжат",
    genericError: "Қате орын алды.",
    bytes: "Б",
    kilobytes: "КБ",
    megabytes: "МБ",
  },
};

function clean(value) {
  return String(value ?? "").trim();
}

function isPatientCertificate(item) {
  const scope = clean(
    item?.document_scope
  ).toLowerCase();

  if (scope) {
    return scope === "certificate";
  }

  return PATIENT_CERTIFICATE_TYPES.has(
    clean(
      item?.certificate_type
    )
  );
}

function extractArray(response) {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (
    Array.isArray(
      response?.data?.data
    )
  ) {
    return response.data.data;
  }

  return [];
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
  text
) {
  if (!value) {
    return text.notSpecifiedFemale;
  }

  const normalizedValue =
    String(value).length === 10
      ? `${value}T12:00:00`
      : value;

  const date = new Date(
    normalizedValue
  );

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(
    locale
  );
}

function formatFileSize(
  value,
  text
) {
  const size = Number(value);

  if (
    !Number.isFinite(size) ||
    size <= 0
  ) {
    return "";
  }

  if (size < 1024) {
    return `${size} ${text.bytes}`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(
      size / 1024
    )} ${text.kilobytes}`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} ${text.megabytes}`;
}

function getFileExtension(fileName) {
  const normalized =
    clean(fileName).toLowerCase();

  const parts =
    normalized.split(".");

  return parts.length > 1
    ? parts[parts.length - 1]
    : "";
}

function getDocumentIcon(fileName) {
  const extension =
    getFileExtension(fileName);

  if (
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
    ].includes(extension)
  ) {
    return RiFileImageLine;
  }

  if (
    [
      "xls",
      "xlsx",
      "csv",
    ].includes(extension)
  ) {
    return RiFileExcel2Line;
  }

  if (
    [
      "doc",
      "docx",
      "txt",
    ].includes(extension)
  ) {
    return RiFileTextLine;
  }

  return RiFilePaper2Line;
}

function getCertificateTypeText(
  type,
  text
) {
  const types = {
    health_status:
      text.typeHealthStatus,

    sick_leave:
      text.typeSickLeave,

    medical_certificate:
      text.typeMedicalCertificate,

    education:
      text.typeEducation,

    employment:
      text.typeEmployment,

    sports:
      text.typeSports,

    examination_result:
      text.typeExaminationResult,

    prescription:
      text.typePrescription,

    image:
      text.typeImage,

    other:
      text.typeOther,
  };

  return (
    types[type] ||
    type ||
    text.notSpecified
  );
}

function getStatusText(
  certificate,
  text
) {
  const status =
    certificate?.display_status ||
    certificate?.status;

  const statuses = {
    active: text.statusActive,
    expired: text.statusExpired,
    cancelled:
      text.statusCancelled,
  };

  return (
    statuses[status] ||
    status ||
    text.notSpecified
  );
}

function getOrganizationName(
  certificate,
  text
) {
  return (
    clean(
      certificate?.organization?.name
    ) ||
    text.defaultOrganization
  );
}

function getDoctorName(
  certificate,
  text
) {
  return (
    clean(
      certificate?.doctor?.full_name
    ) ||
    text.defaultDoctor
  );
}

export default function Certificates() {
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

  const [certificates, setCertificates] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    downloadingId,
    setDownloadingId,
  ] = useState("");

  const [message, setMessage] =
    useState({
      type: "",
      text: "",
    });

  const loadCertificates =
    useCallback(async () => {
      setLoading(true);

      setMessage({
        type: "",
        text: "",
      });

      try {
        const response =
          await api.get(
            "/certificates"
          );

        setCertificates(
          extractArray(response).filter(
            isPatientCertificate
          )
        );
      } catch (error) {
        setCertificates([]);

        setMessage({
          type: "error",
          text: getErrorMessage(
            error,
            text.loadFailed
          ),
        });
      } finally {
        setLoading(false);
      }
    }, [text.loadFailed]);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  async function handleDownload(
    certificate
  ) {
    if (!certificate?.id) {
      setMessage({
        type: "error",
        text:
          text.documentIdMissing,
      });

      return;
    }

    setDownloadingId(
      certificate.id
    );

    setMessage({
      type: "",
      text: "",
    });

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
          text.signedUrlMissing
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
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          text.openFailed
        ),
      });
    } finally {
      setDownloadingId("");
    }
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
          onClick={loadCertificates}
          disabled={loading}
          style={{
            ...styles.refreshButton,

            ...(loading
              ? styles.disabled
              : {}),
          }}
        >
          <RiRefreshLine />

          {loading
            ? text.refreshing
            : text.refresh}
        </button>
      </header>

      {message.text && (
        <div
          style={{
            ...styles.alert,

            ...(message.type ===
            "error"
              ? styles.errorAlert
              : styles.successAlert),
          }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div style={styles.emptyState}>
          {text.loadingDocuments}
        </div>
      ) : certificates.length === 0 ? (
        <div style={styles.emptyState}>
          {text.emptyDocuments}
        </div>
      ) : (
        <div style={styles.grid}>
          {certificates.map(
            (certificate) => {
              const DocumentIcon =
                getDocumentIcon(
                  certificate.file_name
                );

              const isExpired =
                (
                  certificate.display_status ||
                  certificate.status
                ) === "expired";

              return (
                <article
                  key={certificate.id}
                  style={styles.card}
                >
                  <div
                    style={
                      styles.cardHeader
                    }
                  >
                    <div
                      style={
                        styles.iconBox
                      }
                    >
                      <DocumentIcon
                        style={
                          styles.icon
                        }
                      />
                    </div>

                    <div
                      style={
                        styles.cardHeading
                      }
                    >
                      <h2
                        style={
                          styles.cardTitle
                        }
                      >
                        {certificate.title ||
                          text.defaultDocument}
                      </h2>

                      <span
                        style={{
                          ...styles.status,

                          ...(isExpired
                            ? styles.expiredStatus
                            : styles.activeStatus),
                        }}
                      >
                        {getStatusText(
                          certificate,
                          text
                        )}
                      </span>
                    </div>
                  </div>

                  <InfoRow
                    label={text.type}
                    value={getCertificateTypeText(
                      certificate.certificate_type,
                      text
                    )}
                    emptyText={text.notSpecified}
                  />

                  <InfoRow
                    label={text.organization}
                    value={getOrganizationName(
                      certificate,
                      text
                    )}
                    emptyText={text.notSpecified}
                  />

                  <InfoRow
                    label={text.doctor}
                    value={getDoctorName(
                      certificate,
                      text
                    )}
                    emptyText={text.notSpecified}
                  />

                  <InfoRow
                    label={text.issueDate}
                    value={formatDate(
                      certificate.issue_date ||
                        certificate.created_at?.slice(
                          0,
                          10
                        ),
                      locale,
                      text
                    )}
                    emptyText={text.notSpecified}
                  />

                  {certificate.valid_until && (
                    <InfoRow
                      label={text.validUntil}
                      value={formatDate(
                        certificate.valid_until,
                        locale,
                        text
                      )}
                      warning
                      emptyText={text.notSpecified}
                    />
                  )}

                  <div
                    style={
                      styles.fileInfo
                    }
                  >
                    <span
                      style={
                        styles.fileName
                      }
                    >
                      {certificate.file_name ||
                        text.defaultFile}
                    </span>

                    {certificate.file_size && (
                      <span
                        style={
                          styles.fileSize
                        }
                      >
                        {formatFileSize(
                          certificate.file_size,
                          text
                        )}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        certificate
                      )
                    }
                    disabled={
                      downloadingId ===
                      certificate.id
                    }
                    style={{
                      ...styles.downloadButton,

                      ...(downloadingId ===
                      certificate.id
                        ? styles.disabled
                        : {}),
                    }}
                  >
                    <RiDownload2Line />

                    {downloadingId ===
                    certificate.id
                      ? text.gettingFile
                      : text.viewDownload}
                  </button>
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  warning = false,
  emptyText,
}) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>
        {label}
      </span>

      <strong
        style={{
          ...styles.infoValue,

          ...(warning
            ? styles.warningValue
            : {}),
        }}
      >
        {value || emptyText}
      </strong>
    </div>
  );
}

const styles = {
  container: {
    padding: "40px",
    color: "#ffffff",
    fontFamily:
      "'Outfit', 'Inter', sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "18px",
    marginBottom: "30px",
  },

  title: {
    margin: "0 0 8px",
    fontSize: "32px",
    fontWeight: 800,
  },

  subtitle: {
    maxWidth: "720px",
    margin: 0,
    color: "#94a3b8",
    fontSize: "15px",
    lineHeight: 1.5,
  },

  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 15px",
    border:
      "1px solid rgba(99,102,241,0.3)",
    borderRadius: "10px",
    background:
      "rgba(99,102,241,0.1)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  alert: {
    marginBottom: "22px",
    padding: "13px 16px",
    border: "1px solid",
    borderRadius: "11px",
  },

  errorAlert: {
    color: "#fca5a5",
    borderColor:
      "rgba(239,68,68,0.3)",
    background:
      "rgba(239,68,68,0.1)",
  },

  successAlert: {
    color: "#6ee7b7",
    borderColor:
      "rgba(16,185,129,0.3)",
    background:
      "rgba(16,185,129,0.1)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(310px, 1fr))",
    gap: "20px",
  },

  card: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "24px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    borderRadius: "18px",
    background:
      "rgba(30,41,59,0.45)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    marginBottom: "14px",
  },

  iconBox: {
    width: "46px",
    height: "46px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "12px",
    background:
      "rgba(16,185,129,0.12)",
  },

  icon: {
    color: "#34d399",
    fontSize: "25px",
  },

  cardHeading: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    margin: "0 0 6px",
    fontSize: "18px",
    fontWeight: 700,
    overflowWrap: "anywhere",
  },

  status: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: 700,
  },

  activeStatus: {
    color: "#6ee7b7",
    background:
      "rgba(16,185,129,0.1)",
  },

  expiredStatus: {
    color: "#fbbf24",
    background:
      "rgba(245,158,11,0.1)",
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    padding: "9px 0",
    borderBottom:
      "1px solid rgba(255,255,255,0.05)",
  },

  infoLabel: {
    color: "#64748b",
    fontSize: "12px",
  },

  infoValue: {
    maxWidth: "65%",
    color: "#cbd5e1",
    fontSize: "12px",
    textAlign: "right",
    overflowWrap: "anywhere",
  },

  warningValue: {
    color: "#fbbf24",
  },

  fileInfo: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginTop: "14px",
    padding: "10px 12px",
    borderRadius: "9px",
    background:
      "rgba(2,6,23,0.25)",
  },

  fileName: {
    color: "#cbd5e1",
    fontSize: "11px",
    overflowWrap: "anywhere",
  },

  fileSize: {
    flexShrink: 0,
    color: "#64748b",
    fontSize: "10px",
  },

  downloadButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    marginTop: "16px",
    padding: "11px 16px",
    border: "none",
    borderRadius: "10px",
    background:
      "linear-gradient(90deg, #4f46e5, #6366f1)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },

  disabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  emptyState: {
    padding: "35px",
    border:
      "1px solid rgba(255,255,255,0.06)",
    borderRadius: "16px",
    background:
      "rgba(30,41,59,0.35)",
    color: "#94a3b8",
    textAlign: "center",
  },
};
