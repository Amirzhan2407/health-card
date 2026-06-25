
import crypto from "crypto";

import { supabase } from "../config/supabaseClient.js";
import * as storageService from "../services/storageService.js";

const CERTIFICATES_BUCKET = "medical-certificates";

const ACTIVE_VISIT_STATUSES = [
  "in_progress",
  "waiting_finish_confirmation",
];

const DOCUMENT_SCOPES = new Set([
  "medical_card",
  "certificate",
]);

const CERTIFICATE_DOCUMENT_TYPES =
  new Set([
    "health_status",
    "sick_leave",
    "medical_certificate",
    "education",
    "employment",
    "sports",
  ]);



const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "txt",
  "csv",
]);

const MIME_BY_EXTENSION = {
  pdf: "application/pdf",

  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",

  doc: "application/msword",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  xls: "application/vnd.ms-excel",
  xlsx:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  txt: "text/plain",
  csv: "text/csv",
};

function clean(value) {
  return String(value ?? "").trim();
}
function resolveDocumentScope(
  documentScope,
  certificateType
) {
  const normalizedScope =
    clean(documentScope);

  if (normalizedScope) {
    if (
      !DOCUMENT_SCOPES.has(
        normalizedScope
      )
    ) {
      throw createControllerError(
        "Некорректный раздел документа.",
        400
      );
    }

    return normalizedScope;
  }

  return CERTIFICATE_DOCUMENT_TYPES.has(
    clean(certificateType)
  )
    ? "certificate"
    : "medical_card";
}

function createControllerError(
  message,
  statusCode = 500
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    clean(value)
  );
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    clean(value)
  );
}

function getFileExtension(fileName) {
  const normalizedName = clean(fileName).toLowerCase();
  const parts = normalizedName.split(".");

  if (parts.length < 2) {
    return "";
  }

  return parts[parts.length - 1];
}

function resolveMimeType(file) {
  const extension = getFileExtension(
    file?.originalname
  );

  return (
    MIME_BY_EXTENSION[extension] ||
    clean(file?.mimetype).toLowerCase() ||
    "application/octet-stream"
  );
}

function sanitizeFileName(value) {
  const originalName =
    clean(value) || "medical-document";

  const extension =
    getFileExtension(originalName);

  const baseName = originalName
    .replace(/\.[^.]+$/, "")
    .replace(
      /[^a-zA-Z0-9а-яА-ЯёЁ._-]/g,
      "_"
    )
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);

  if (!extension) {
    return baseName || "medical-document";
  }

  return `${
    baseName || "medical-document"
  }.${extension}`;
}

function getTodayDate() {
  const formatter =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Almaty",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const parts = formatter.formatToParts(
    new Date()
  );

  const values = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
}

async function getAppointment(
  appointmentId
) {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      doctor_id,
      organization_id,
      status,
      date,
      time
    `)
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) {
    throw createControllerError(
      `Ошибка получения записи на приём: ${error.message}`
    );
  }

  if (!data) {
    throw createControllerError(
      "Запись на приём не найдена.",
      404
    );
  }

  return data;
}

async function verifyDoctorAppointmentAccess({
  appointmentId,
  doctorId,
  organizationId,
}) {
  const appointment =
    await getAppointment(appointmentId);

  if (
    String(appointment.doctor_id) !==
    String(doctorId)
  ) {
    throw createControllerError(
      "Эта запись принадлежит другому врачу.",
      403
    );
  }

  if (
    String(appointment.organization_id) !==
    String(organizationId)
  ) {
    throw createControllerError(
      "Запись принадлежит другой медицинской организации.",
      403
    );
  }

  if (
    !ACTIVE_VISIT_STATUSES.includes(
      appointment.status
    )
  ) {
    throw createControllerError(
      "Добавлять и просматривать документы врач может только во время активного приёма.",
      409
    );
  }

  return appointment;
}


async function createPatientNotification({
  patientId,
  title,
  documentScope,
}) {
  const isCertificate =
    documentScope === "certificate";

  const { error } = await supabase
    .from("notifications")
    .insert({
      profile_id: patientId,

      title: isCertificate
        ? "Добавлена медицинская справка"
        : "Добавлен документ в медицинскую карту",

      message: isCertificate
        ? `Врач добавил справку «${title}». Она доступна во вкладке «Справки».`
        : `Врач добавил документ «${title}» в медицинскую карту.`,

      link: isCertificate
        ? "/patient/certificates"
        : "/patient/medical-card",
    });

  if (error) {
    console.error(
      "[CERTIFICATE NOTIFICATION ERROR]",
      error.message
    );
  }
}



async function hydrateCertificates(
  certificates
) {
  if (
    !Array.isArray(certificates) ||
    certificates.length === 0
  ) {
    return [];
  }

  const doctorIds = [
    ...new Set(
      certificates
        .map((item) => item.doctor_id)
        .filter(Boolean)
    ),
  ];

  const organizationIds = [
    ...new Set(
      certificates
        .map(
          (item) =>
            item.organization_id
        )
        .filter(Boolean)
    ),
  ];

  const doctorsResult =
    doctorIds.length > 0
      ? await supabase
          .from("doctors")
          .select(`
            id,
            member_id,
            specialty_id
          `)
          .in("id", doctorIds)
      : {
          data: [],
          error: null,
        };

  if (doctorsResult.error) {
    throw createControllerError(
      `Ошибка получения врачей: ${doctorsResult.error.message}`
    );
  }

  const doctors =
    doctorsResult.data || [];

  const memberIds = [
    ...new Set(
      doctors
        .map(
          (doctor) =>
            doctor.member_id
        )
        .filter(Boolean)
    ),
  ];

  const specialtyIds = [
    ...new Set(
      doctors
        .map(
          (doctor) =>
            doctor.specialty_id
        )
        .filter(Boolean)
    ),
  ];

  const [
    membersResult,
    specialtiesResult,
    organizationsResult,
  ] = await Promise.all([
    memberIds.length > 0
      ? supabase
          .from("organization_members")
          .select("id, profile_id")
          .in("id", memberIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    specialtyIds.length > 0
      ? supabase
          .from("specialties")
          /*
           * В твоей таблице specialties
           * нет столбца name.
           */
          .select(
            "id, name_ru, name_kk"
          )
          .in("id", specialtyIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    organizationIds.length > 0
      ? supabase
          .from("organizations")
          .select(
            "id, name, organization_name"
          )
          .in("id", organizationIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  if (membersResult.error) {
    throw createControllerError(
      `Ошибка получения сотрудников: ${membersResult.error.message}`
    );
  }

  if (specialtiesResult.error) {
    throw createControllerError(
      `Ошибка получения специальностей: ${specialtiesResult.error.message}`
    );
  }

  if (organizationsResult.error) {
    throw createControllerError(
      `Ошибка получения организаций: ${organizationsResult.error.message}`
    );
  }

  const profileIds = [
    ...new Set(
      (membersResult.data || [])
        .map(
          (member) =>
            member.profile_id
        )
        .filter(Boolean)
    ),
  ];

  const profilesResult =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", profileIds)
      : {
          data: [],
          error: null,
        };

  if (profilesResult.error) {
    throw createControllerError(
      `Ошибка получения профилей врачей: ${profilesResult.error.message}`
    );
  }

  const doctorsMap = new Map(
    doctors.map((doctor) => [
      doctor.id,
      doctor,
    ])
  );

  const membersMap = new Map(
    (membersResult.data || []).map(
      (member) => [
        member.id,
        member,
      ]
    )
  );

  const specialtiesMap = new Map(
    (specialtiesResult.data || []).map(
      (specialty) => [
        specialty.id,
        specialty,
      ]
    )
  );

  const profilesMap = new Map(
    (profilesResult.data || []).map(
      (profile) => [
        profile.id,
        profile,
      ]
    )
  );

  const organizationsMap = new Map(
    (
      organizationsResult.data || []
    ).map((organization) => [
      organization.id,
      organization,
    ])
  );

  return certificates.map(
    (certificate) => {
      const doctor =
        doctorsMap.get(
          certificate.doctor_id
        ) || null;

      const member = doctor
        ? membersMap.get(
            doctor.member_id
          ) || null
        : null;

      const doctorProfile = member
        ? profilesMap.get(
            member.profile_id
          ) || null
        : null;

      const specialty = doctor
        ? specialtiesMap.get(
            doctor.specialty_id
          ) || null
        : null;

      const organization =
        organizationsMap.get(
          certificate.organization_id
        ) || null;

      const isExpired =
        certificate.valid_until &&
        certificate.valid_until <
          getTodayDate();

      return {
        ...certificate,

        display_status:
          isExpired
            ? "expired"
            : certificate.status,

        doctor: {
          id: certificate.doctor_id,

          full_name:
            doctorProfile?.full_name ||
            "Врач",

          specialty:
            specialty?.name_ru ||
            specialty?.name_kk ||
            "",
        },

        organization: {
          id:
            certificate.organization_id,

          name:
            organization?.name ||
            organization
              ?.organization_name ||
            "Медицинская организация",
        },
      };
    }
  );
}

export async function getCertificates(
  req,
  res,
  next
) {
  try {
    const user = req.user;

    let query = supabase
      .from("medical_certificates")
      .select("*");

    if (user.role === "patient") {
  query = query
    .eq(
      "patient_id",
      user.id
    )
    .eq(
      "document_scope",
      "certificate"
    );
}
    else if (
      user.role === "doctor"
    ) {
      const appointmentId = clean(
        req.query?.appointmentId
      );

      if (!appointmentId) {
        return res.status(400).json({
          success: false,
          message:
            "Для врача параметр appointmentId обязателен.",
        });
      }

      await verifyDoctorAppointmentAccess({
        appointmentId,
        doctorId: user.doctor_id,
        organizationId:
          user.organization_id,
      });

      query = query.eq(
        "appointment_id",
        appointmentId
      );
    } else {
      return res.status(403).json({
        success: false,
        message:
          "У вашей роли нет доступа к медицинским справкам.",
      });
    }

    const {
      data: certificates,
      error,
    } = await query.order(
      "created_at",
      {
        ascending: false,
      }
    );

    if (error) {
      throw createControllerError(
        `Ошибка получения документов: ${error.message}`
      );
    }

    let hydrated =
      certificates || [];

    try {
      hydrated =
        await hydrateCertificates(
          certificates || []
        );
    } catch (hydrateError) {
      /*
       * Метаданные врача не должны мешать
       * пациенту увидеть уже сохранённый файл.
       */
      console.error(
        "[CERTIFICATE HYDRATE ERROR]",
        hydrateError?.message ||
          hydrateError
      );
    }

    return res.status(200).json({
      success: true,
      data: hydrated,
    });
  } catch (error) {
    next(error);
  }
}


export async function createCertificate(
  req,
  res,
  next
) {
  let uploadedFilePath = "";

  try {
    const doctorId = clean(
      req.user?.doctor_id
    );

    const organizationId = clean(
      req.user?.organization_id
    );

    const body = req.body || {};

    const {
      appointmentId,
      title,
      certificateType,
      documentScope,
      issueDate,
      validUntil,
    } = body;

    const file = req.file;

    if (!doctorId) {
      throw createControllerError(
        "Не удалось определить профиль врача.",
        403
      );
    }

    if (!organizationId) {
      throw createControllerError(
        "Не удалось определить медицинскую организацию врача.",
        403
      );
    }

    if (!isValidUuid(appointmentId)) {
      throw createControllerError(
        "Некорректный идентификатор записи.",
        400
      );
    }

    const normalizedTitle =
      clean(title);

    const normalizedType =
      clean(certificateType);

    const normalizedScope =
      resolveDocumentScope(
        documentScope,
        normalizedType
      );

    if (!normalizedTitle) {
      throw createControllerError(
        "Введите название справки или документа.",
        400
      );
    }

    if (!normalizedType) {
      throw createControllerError(
        "Выберите тип справки или документа.",
        400
      );
    }

    if (!file) {
      throw createControllerError(
        "Прикрепите файл.",
        400
      );
    }

    const extension =
      getFileExtension(
        file.originalname
      );

    if (
      !ALLOWED_EXTENSIONS.has(
        extension
      )
    ) {
      throw createControllerError(
        "Разрешены файлы PDF, JPG, JPEG, PNG, WEBP, GIF, DOC, DOCX, XLS, XLSX, TXT и CSV.",
        400
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw createControllerError(
        "Размер файла не должен превышать 20 МБ.",
        400
      );
    }

    const mimeType =
      resolveMimeType(file);

    const normalizedIssueDate =
      clean(issueDate) ||
      getTodayDate();

    const normalizedValidUntil =
      clean(validUntil);

    if (
      !isValidDate(
        normalizedIssueDate
      )
    ) {
      throw createControllerError(
        "Некорректная дата выдачи.",
        400
      );
    }

    if (
      normalizedValidUntil &&
      !isValidDate(
        normalizedValidUntil
      )
    ) {
      throw createControllerError(
        "Некорректный срок действия.",
        400
      );
    }

    if (
      normalizedValidUntil &&
      normalizedValidUntil <
        normalizedIssueDate
    ) {
      throw createControllerError(
        "Срок действия не может быть раньше даты выдачи.",
        400
      );
    }

    const appointment =
      await verifyDoctorAppointmentAccess({
        appointmentId,
        doctorId,
        organizationId,
      });

    const safeFileName =
      sanitizeFileName(
        file.originalname
      );

    uploadedFilePath = [
      organizationId,
      appointment.patient_id,
      appointment.id,
      `${Date.now()}_${crypto.randomUUID()}_${safeFileName}`,
    ].join("/");

    await storageService.uploadFile(
      CERTIFICATES_BUCKET,
      uploadedFilePath,
      file.buffer,
      mimeType
    );

    const {
      data: certificate,
      error: insertError,
    } = await supabase
      .from("medical_certificates")
      .insert({
        appointment_id:
          appointment.id,

        patient_id:
          appointment.patient_id,

        doctor_id:
          doctorId,

        organization_id:
          organizationId,

        title:
          normalizedTitle,

        certificate_type:
          normalizedType,

        document_scope:
          normalizedScope,

        issue_date:
          normalizedIssueDate,

        valid_until:
          normalizedValidUntil ||
          null,

        file_url:
          uploadedFilePath,

        file_name:
          file.originalname,

        file_size:
          file.size,

        mime_type:
          mimeType,

        status:
          "active",
      })
      .select("*")
      .single();

    if (insertError) {
      try {
        await storageService.deleteFile(
          CERTIFICATES_BUCKET,
          uploadedFilePath
        );
      } catch (cleanupError) {
        console.error(
          "[CERTIFICATE STORAGE CLEANUP ERROR]",
          cleanupError?.message ||
            cleanupError
        );
      }

      uploadedFilePath = "";

      throw createControllerError(
        `Не удалось сохранить документ: ${insertError.message}`
      );
    }

    uploadedFilePath = "";

    await createPatientNotification({
      patientId:
        appointment.patient_id,

      title:
        normalizedTitle,

      documentScope:
        normalizedScope,
    });

    let responseCertificate =
      certificate;

    try {
      const hydrated =
        await hydrateCertificates([
          certificate,
        ]);

      responseCertificate =
        hydrated[0] ||
        certificate;
    } catch (hydrateError) {
      console.error(
        "[CERTIFICATE HYDRATE ERROR]",
        hydrateError?.message ||
          hydrateError
      );
    }

    return res.status(201).json({
      success: true,

      message:
        normalizedScope ===
        "certificate"
          ? "Справка успешно добавлена пациенту."
          : "Документ успешно добавлен в медицинскую карту.",

      data:
        responseCertificate,
    });
  } catch (error) {
    if (uploadedFilePath) {
      try {
        await storageService.deleteFile(
          CERTIFICATES_BUCKET,
          uploadedFilePath
        );
      } catch (cleanupError) {
        console.error(
          "[CERTIFICATE FINAL CLEANUP ERROR]",
          cleanupError?.message ||
            cleanupError
        );
      }
    }

    next(error);
  }
}



export async function getCertificateDownloadUrl(
  req,
  res,
  next
) {
  try {
    const certificateId = clean(
      req.params?.id
    );

    if (
      !isValidUuid(
        certificateId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Некорректный идентификатор документа.",
      });
    }

    const {
      data: certificate,
      error,
    } = await supabase
      .from("medical_certificates")
      .select("*")
      .eq("id", certificateId)
      .maybeSingle();

    if (error) {
      throw createControllerError(
        `Ошибка получения документа: ${error.message}`
      );
    }

    if (!certificate) {
      throw createControllerError(
        "Документ не найден.",
        404
      );
    }

    if (
      req.user.role === "patient"
    ) {
      if (
        String(
          certificate.patient_id
        ) !== String(req.user.id)
      ) {
        throw createControllerError(
          "Вы можете скачивать только собственные документы.",
          403
        );
      }
    } else if (
      req.user.role === "doctor"
    ) {
      await verifyDoctorAppointmentAccess({
        appointmentId:
          certificate.appointment_id,

        doctorId:
          req.user.doctor_id,

        organizationId:
          req.user.organization_id,
      });
    } else {
      throw createControllerError(
        "Доступ к документу запрещён.",
        403
      );
    }

    const signedUrl =
      await storageService.getSignedUrl(
        CERTIFICATES_BUCKET,
        certificate.file_url,
        900
      );

    return res.status(200).json({
      success: true,

      data: {
        certificateId:
          certificate.id,

        fileName:
          certificate.file_name,

        mimeType:
          certificate.mime_type,

        signedUrl,

        expiresIn: 900,
      },
    });
  } catch (error) {
    next(error);
  }
}

