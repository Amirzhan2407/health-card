
import crypto from "crypto";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";

import { supabase } from "../config/supabaseClient.js";
import { generateDoctorSlots } from "./scheduleService.js";
import { AppError } from "../utils/errorHandler.js";

import {
  sendAppointmentCreatedEmail,
  sendAppointmentFinishCodeEmail,
} from "./emailService.js";

const ACTIVE_APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "transfer_pending",
  "transferred",
  "in_progress",
  "waiting_finish_confirmation",
];

const DOCTOR_BLOCK_CANCELLABLE_STATUSES = [
  "scheduled",
  "confirmed",
  "transfer_pending",
  "transferred",
];

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeTime(value) {
  const normalized = clean(value);

  if (!normalized) {
    return "";
  }

  return normalized.slice(0, 5);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    clean(value)
  );
}

function generateNumericCode(length = 6) {
  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += crypto
      .randomInt(0, 10)
      .toString();
  }

  return code;
}

function hashCode(code) {
  return crypto
    .createHash("sha256")
    .update(clean(code))
    .digest("hex");
}

function getTodayInAstana() {
  const formatter =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Almaty",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const parts =
    formatter.formatToParts(
      new Date()
    );

  const values = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function getStartCodeExpiry(date) {
  const parsedDate = new Date(
    `${date}T23:59:59.999Z`
  );

  if (
    Number.isNaN(parsedDate.getTime())
  ) {
    const fallback = new Date();

    fallback.setDate(
      fallback.getDate() + 1
    );

    return fallback.toISOString();
  }

  /*
   * Дополнительный запас из-за разницы
   * часовых поясов сервера и Казахстана.
   */
  parsedDate.setDate(
    parsedDate.getDate() + 1
  );

  return parsedDate.toISOString();
}

function getScheduledDateTime(
  date,
  time
) {
  const normalizedTime =
    normalizeTime(time);

  /*
   * Казахстан использует UTC+5.
   */
  return new Date(
    `${date}T${normalizedTime}:00+05:00`
  );
}

function createServiceError(
  message,
  statusCode = 500
) {
  return new AppError(
    message,
    statusCode
  );
}

async function getRowById(
  table,
  id
) {
  if (!id) {
    return null;
  }

  const { data, error } =
    await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle();

  if (error) {
    throw createServiceError(
      `Ошибка получения данных из ${table}: ${error.message}`
    );
  }

  return data || null;
}

async function insertNotification({
  profileId,
  title,
  message,
  link,
}) {
  const normalizedProfileId =
    clean(profileId);

  if (!normalizedProfileId) {
    console.error(
      "[NOTIFICATION INSERT SKIPPED]",
      {
        reason:
          "Не указан profile_id получателя.",
        title,
        message,
        link,
      }
    );

    return null;
  }

  const payload = {
    profile_id:
      normalizedProfileId,

    title:
      clean(title) ||
      "Уведомление",

    message:
      clean(message),

    link:
      clean(link) || null,

    is_read: false,

    created_at:
      new Date().toISOString(),
  };

  const {
    data,
    error,
  } = await supabase
    .from("notifications")
    .insert(payload)
    .select(`
      id,
      profile_id,
      title,
      message,
      link,
      is_read,
      read_at,
      created_at
    `)
    .single();

  if (error) {
    console.error(
      "[NOTIFICATION INSERT ERROR]",
      {
        code:
          error.code,

        message:
          error.message,

        details:
          error.details,

        hint:
          error.hint,

        payload,
      }
    );

    return null;
  }

  console.log(
    "[NOTIFICATION INSERTED]",
    {
      id:
        data.id,

      profileId:
        data.profile_id,

      title:
        data.title,
    }
  );

  return data;
}

async function getDoctorProfileId(
  doctorId
) {
  const normalizedDoctorId =
    clean(doctorId);

  if (!normalizedDoctorId) {
    return "";
  }

  const {
    data: doctor,
    error: doctorError,
  } = await supabase
    .from("doctors")
    .select(`
      id,
      member_id
    `)
    .eq(
      "id",
      normalizedDoctorId
    )
    .maybeSingle();

  if (doctorError) {
    console.error(
      "[DOCTOR PROFILE LOOKUP ERROR]",
      doctorError.message
    );

    return "";
  }

  if (!doctor?.member_id) {
    console.error(
      "[DOCTOR PROFILE LOOKUP ERROR]",
      "У врача отсутствует member_id.",
      normalizedDoctorId
    );

    return "";
  }

  const {
    data: member,
    error: memberError,
  } = await supabase
    .from("organization_members")
    .select(`
      id,
      profile_id
    `)
    .eq(
      "id",
      doctor.member_id
    )
    .maybeSingle();

  if (memberError) {
    console.error(
      "[DOCTOR PROFILE LOOKUP ERROR]",
      memberError.message
    );

    return "";
  }

  return clean(
    member?.profile_id
  );
}

async function loadBookingContext(
  patientId,
  organizationId,
  doctorId
) {
  const [
    patient,
    organization,
    doctor,
  ] = await Promise.all([
    getRowById(
      "profiles",
      patientId
    ),

    getRowById(
      "organizations",
      organizationId
    ),

    getRowById(
      "doctors",
      doctorId
    ),
  ]);

  if (!patient) {
    throw createServiceError(
      "Профиль пациента не найден.",
      404
    );
  }

  if (patient.role !== "patient") {
    throw createServiceError(
      "Создавать запись может только пациент.",
      403
    );
  }

  if (!organization) {
    throw createServiceError(
      "Медицинская организация не найдена.",
      404
    );
  }

  if (
    clean(organization.status)
      .toLowerCase() !== "active"
  ) {
    throw createServiceError(
      "Медицинская организация сейчас недоступна для записи.",
      409
    );
  }

  if (!doctor) {
    throw createServiceError(
      "Врач не найден.",
      404
    );
  }

  if (
    ["blocked", "archived"].includes(
      clean(doctor.status)
        .toLowerCase()
    )
  ) {
    throw createServiceError(
      "Врач сейчас недоступен для записи.",
      409
    );
  }

  const memberId =
    doctor.member_id ||
    doctor.organization_member_id;

  const member =
    await getRowById(
      "organization_members",
      memberId
    );

  if (!member) {
    throw createServiceError(
      "Врач не привязан к медицинской организации.",
      409
    );
  }

  if (
    String(
      member.organization_id
    ) !== String(organizationId)
  ) {
    throw createServiceError(
      "Выбранный врач не работает в указанной организации.",
      409
    );
  }

  if (
    clean(member.status)
      .toLowerCase() !== "active"
  ) {
    throw createServiceError(
      "Доступ врача временно заблокирован.",
      409
    );
  }

  const [
    doctorProfile,
    specialty,
    room,
  ] = await Promise.all([
    getRowById(
      "profiles",
      member.profile_id
    ),

    getRowById(
      "specialties",
      doctor.specialty_id
    ),

    getRowById(
      "rooms",
      doctor.room_id
    ),
  ]);

  let department = null;

  if (room?.department_id) {
    department =
      await getRowById(
        "departments",
        room.department_id
      );
  }

  return {
    patient,
    organization,
    doctor,
    member,
    doctorProfile,
    specialty,
    room,
    department,
  };
}

function getOrganizationName(
  context
) {
  return (
    clean(context.organization?.name) ||
    clean(
      context.organization
        ?.organization_name
    ) ||
    "Медицинская организация"
  );
}

function getDoctorName(context) {
  return (
    clean(
      context.doctorProfile
        ?.full_name
    ) ||
    "Врач"
  );
}

function getSpecialtyName(
  context
) {
  return (
    clean(
      context.specialty?.name_ru
    ) ||
    clean(context.specialty?.name) ||
    clean(
      context.specialty?.name_kk
    ) ||
    "Специальность не указана"
  );
}

function getDepartmentName(
  context
) {
  return (
    clean(
      context.department?.name_ru
    ) ||
    clean(context.department?.name) ||
    clean(
      context.department?.name_kk
    ) ||
    ""
  );
}

function getRoomName(context) {
  const number =
    clean(context.room?.number) ||
    clean(
      context.room?.room_number
    );

  const name =
    clean(context.room?.name) ||
    clean(context.room?.room_name);

  if (number && name) {
    return `Кабинет ${number} — ${name}`;
  }

  if (number) {
    return `Кабинет ${number}`;
  }

  return name;
}

async function invalidateStartCodes(
  appointmentId
) {
  const { error } =
    await supabase
      .from(
        "appointment_start_codes"
      )
      .update({
        is_used: true,
      })
      .eq(
        "appointment_id",
        appointmentId
      )
      .eq("is_used", false);

  if (error) {
    throw createServiceError(
      `Не удалось деактивировать предыдущий код начала: ${error.message}`
    );
  }
}

async function createStartCodeRecord(
  appointmentId,
  appointmentDate
) {
  await invalidateStartCodes(
    appointmentId
  );

  const code =
    generateNumericCode(6);

  const expiresAt =
    getStartCodeExpiry(
      appointmentDate
    );

  const { data, error } =
    await supabase
      .from(
        "appointment_start_codes"
      )
      .insert({
        appointment_id:
          appointmentId,

        code,

        expires_at: expiresAt,

        is_used: false,
      })
      .select("*")
      .single();

  if (error) {
    throw createServiceError(
      `Не удалось создать код начала приёма: ${error.message}`
    );
  }

  return {
    record: data,
    code,
    expiresAt,
  };
}

async function invalidateFinishCodes(
  appointmentId
) {
  const { error } =
    await supabase
      .from(
        "appointment_finish_codes"
      )
      .update({
        is_used: true,
      })
      .eq(
        "appointment_id",
        appointmentId
      )
      .eq("is_used", false);

  if (error) {
    throw createServiceError(
      `Не удалось деактивировать предыдущий код завершения: ${error.message}`
    );
  }
}

async function createQrDataUrl({
  appointmentId,
  qrToken,
}) {
  const payload = JSON.stringify({
    type:
      "clinic_os_appointment_start",

    appointmentId,
    qrToken,
  });

  return QRCode.toDataURL(
    payload,
    {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 320,
      margin: 2,
    }
  );
}

export async function createAppointment(
  patientId,
  orgId,
  doctorId,
  date,
  time,
  reason,
  notificationEmail = ""
) {
  const normalizedPatientId =
    clean(patientId);

  const normalizedOrgId =
    clean(orgId);

  const normalizedDoctorId =
    clean(doctorId);

  const normalizedDate =
    clean(date);

  const normalizedTime =
    normalizeTime(time);

  const normalizedReason =
    clean(reason);

  if (
    !normalizedPatientId ||
    !normalizedOrgId ||
    !normalizedDoctorId ||
    !normalizedDate ||
    !normalizedTime
  ) {
    throw createServiceError(
      "Не заполнены обязательные данные записи.",
      400
    );
  }

  if (
    normalizedDate <
    getTodayInAstana()
  ) {
    throw createServiceError(
      "Нельзя записаться на прошедшую дату.",
      400
    );
  }

  const context =
    await loadBookingContext(
      normalizedPatientId,
      normalizedOrgId,
      normalizedDoctorId
    );

  const recipientEmail =
    clean(notificationEmail) ||
    clean(context.patient?.email);

  if (
    !isValidEmail(
      recipientEmail
    )
  ) {
    throw createServiceError(
      "Укажите корректную электронную почту для получения талона.",
      400
    );
  }

  const slots =
    await generateDoctorSlots(
      normalizedDoctorId,
      normalizedDate
    );

  const slot = slots.find(
    (item) =>
      normalizeTime(
        item.time ||
          item.startTime
      ) === normalizedTime
  );

  if (
    !slot ||
    !slot.isAvailable
  ) {
    throw createServiceError(
      "Выбранное время уже занято или недоступно. Выберите другой интервал.",
      409
    );
  }

  const qrToken = uuidv4();

  const {
    data: appointment,
    error: appointmentError,
  } = await supabase
    .from("appointments")
    .insert({
      patient_id:
        normalizedPatientId,

      doctor_id:
        normalizedDoctorId,

      organization_id:
        normalizedOrgId,

      date:
        normalizedDate,

      time:
        normalizedTime,

      reason:
        normalizedReason || null,

      status: "scheduled",

      qr_token: qrToken,
    })
    .select("*")
    .single();

  if (appointmentError) {
    if (
      appointmentError.code ===
      "23505"
    ) {
      throw createServiceError(
        "Выбранное время уже занято. Выберите другой интервал.",
        409
      );
    }

    throw createServiceError(
      `Ошибка создания записи: ${appointmentError.message}`
    );
  }

  let startCodeData;

  try {
    startCodeData =
      await createStartCodeRecord(
        appointment.id,
        normalizedDate
      );
  } catch (error) {
    await supabase
      .from("appointments")
      .delete()
      .eq("id", appointment.id);

    throw error;
  }

  let qrDataUrl = "";

  try {
    qrDataUrl =
      await createQrDataUrl({
        appointmentId:
          appointment.id,

        qrToken,
      });
  } catch (error) {
    console.error(
      "[QR GENERATION ERROR]",
      error?.message || error
    );
  }

  await insertNotification({
    profileId:
      normalizedPatientId,

    title:
      "Запись к врачу создана",

    message:
      `Вы записаны к врачу ${getDoctorName(
        context
      )} на ${normalizedDate} в ${normalizedTime}. ` +
      `Код начала приёма: ${startCodeData.code}.`,

    link:
      "/patient/appointments",
  });

  const doctorProfileId =
    await getDoctorProfileId(
      normalizedDoctorId
    );

  if (doctorProfileId) {
    await insertNotification({
      profileId:
        doctorProfileId,

      title:
        "Новая запись на приём",

      message:
        `${
          clean(
            context.patient?.full_name
          ) || "Пациент"
        } записался на приём ` +
        `${normalizedDate} в ${normalizedTime}.`,

      link:
        "/doctor",
    });
  } else {
    console.error(
      "[DOCTOR APPOINTMENT NOTIFICATION ERROR]",
      {
        doctorId:
          normalizedDoctorId,

        contextMemberId:
          context.member?.id ||
          null,

        contextProfileId:
          context.member?.profile_id ||
          context.doctorProfile?.id ||
          null,
      }
    );
  }

  let emailSent = false;
  let emailError = "";

  try {
    await sendAppointmentCreatedEmail({
      email: recipientEmail,

      patientName:
        context.patient?.full_name,

      appointmentId:
        appointment.id,

      organizationName:
        getOrganizationName(
          context
        ),

      doctorName:
        getDoctorName(context),

      specialtyName:
        getSpecialtyName(
          context
        ),

      departmentName:
        getDepartmentName(
          context
        ),

      roomName:
        getRoomName(context),

      date:
        normalizedDate,

      time:
        normalizedTime,

      startCode:
        startCodeData.code,

      qrDataUrl,
    });

    emailSent = true;
  } catch (error) {
    emailError =
      error?.message ||
      "Не удалось отправить письмо.";

    console.error(
      "[APPOINTMENT EMAIL ERROR]",
      emailError
    );
  }

  return {
    ...appointment,

    notification_email:
      recipientEmail,

    email_sent:
      emailSent,

    email_error:
      emailError || null,

    start_code:
      startCodeData.code,

    startCode:
      startCodeData.code,

    start_code_expires_at:
      startCodeData.expiresAt,

    qr_data_url:
      qrDataUrl,

    qrDataUrl,
  };
}

export async function confirmAppointment(
  id,
  patientId
) {
  const appointmentId =
    clean(id);

  const normalizedPatientId =
    clean(patientId);

  const {
    data: appointment,
    error: loadError,
  } = await supabase
    .from("appointments")
    .select(
      "id, status, patient_id"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (loadError) {
    throw createServiceError(
      `Ошибка получения записи: ${loadError.message}`
    );
  }

  if (!appointment) {
    throw createServiceError(
      "Запись на приём не найдена.",
      404
    );
  }

  if (
    String(
      appointment.patient_id
    ) !==
    String(normalizedPatientId)
  ) {
    throw createServiceError(
      "Вы можете подтверждать только собственные записи.",
      403
    );
  }

  if (
    appointment.status !==
    "scheduled"
  ) {
    throw createServiceError(
      `Невозможно подтвердить запись в статусе ${appointment.status}.`,
      409
    );
  }

  const {
    data: updated,
    error,
  } = await supabase
    .from("appointments")
    .update({
      status: "confirmed",

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .select("*")
    .single();

  if (error) {
    throw createServiceError(
      `Ошибка подтверждения записи: ${error.message}`
    );
  }

  return updated;
}

export async function cancelAppointment(
  id,
  userId,
  role
) {
  const appointmentId =
    clean(id);

  const normalizedUserId =
    clean(userId);

  const normalizedRole =
    clean(role);

  const {
    data: appointment,
    error: loadError,
  } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (loadError) {
    throw createServiceError(
      `Ошибка получения записи: ${loadError.message}`
    );
  }

  if (!appointment) {
    throw createServiceError(
      "Запись на приём не найдена.",
      404
    );
  }

  if (
    normalizedRole ===
      "patient" &&
    String(
      appointment.patient_id
    ) !== String(normalizedUserId)
  ) {
    throw createServiceError(
      "Вы можете отменить только собственную запись.",
      403
    );
  }

  if (
    [
      "doctor",
      "organization_admin",
    ].includes(normalizedRole)
  ) {
    const {
      data: member,
      error: memberError,
    } = await supabase
      .from(
        "organization_members"
      )
      .select(
        "organization_id"
      )
      .eq(
        "profile_id",
        normalizedUserId
      )
      .eq("status", "active")
      .maybeSingle();

    if (memberError) {
      throw createServiceError(
        `Ошибка проверки организации: ${memberError.message}`
      );
    }

    if (
      !member ||
      String(
        member.organization_id
      ) !==
        String(
          appointment.organization_id
        )
    ) {
      throw createServiceError(
        "Запись принадлежит другой организации.",
        403
      );
    }
  }

  const allowedStatuses = [
    "scheduled",
    "confirmed",
    "transfer_pending",
    "transferred",
  ];

  if (
    !allowedStatuses.includes(
      appointment.status
    )
  ) {
    throw createServiceError(
      `Невозможно отменить приём в статусе ${appointment.status}.`,
      409
    );
  }

  const newStatus =
    normalizedRole === "patient"
      ? "cancelled_by_patient"
      : "cancelled_by_organization";

  const {
    data: updated,
    error,
  } = await supabase
    .from("appointments")
    .update({
      status: newStatus,

      cancelled_by:
        normalizedUserId,

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .select("*")
    .single();

  if (error) {
    throw createServiceError(
      `Ошибка отмены записи: ${error.message}`
    );
  }

  await insertNotification({
    profileId:
      appointment.patient_id,

    title: "Запись отменена",

    message:
      normalizedRole === "patient"
        ? `Вы отменили запись на ${appointment.date} в ${normalizeTime(
            appointment.time
          )}.`
        : `Медицинская организация отменила запись на ${appointment.date} в ${normalizeTime(
            appointment.time
          )}.`,

    link:
      "/patient/appointments",
  });

  if (
    normalizedRole === "patient"
  ) {
    const doctorProfileId =
      await getDoctorProfileId(
        appointment.doctor_id
      );

    if (doctorProfileId) {
      const patient =
        await getRowById(
          "profiles",
          appointment.patient_id
        );

      await insertNotification({
        profileId:
          doctorProfileId,

        title:
          "Пациент отменил запись",

        message:
          `${
            clean(
              patient?.full_name
            ) || "Пациент"
          } отменил запись на ` +
          `${appointment.date} в ${normalizeTime(
            appointment.time
          )}.`,

        link:
          "/doctor",
      });
    }
  }

  return updated;
}


/*
 * Отменяет все будущие записи врача при блокировке доступа.
 *
 * Уже начатые, завершённые, отменённые записи и неявки
 * не изменяются. Каждому пациенту создаётся уведомление.
 */
export async function cancelFutureAppointmentsForDoctor(
  doctorId,
  cancelledByProfileId = ""
) {
  const normalizedDoctorId =
    clean(doctorId);

  const normalizedCancelledBy =
    clean(cancelledByProfileId);

  if (!normalizedDoctorId) {
    throw createServiceError(
      "Не указан идентификатор врача.",
      400
    );
  }

  const now = new Date();
  const today = getTodayInAstana();

  const {
    data: appointments,
    error: loadError,
  } = await supabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      doctor_id,
      organization_id,
      date,
      time,
      status
    `)
    .eq(
      "doctor_id",
      normalizedDoctorId
    )
    .gte("date", today)
    .in(
      "status",
      DOCTOR_BLOCK_CANCELLABLE_STATUSES
    );

  if (loadError) {
    throw createServiceError(
      `Не удалось получить будущие записи врача: ${loadError.message}`
    );
  }

  const futureAppointments =
    (appointments || []).filter(
      (appointment) => {
        const scheduledDateTime =
          getScheduledDateTime(
            appointment.date,
            appointment.time
          );

        return (
          !Number.isNaN(
            scheduledDateTime.getTime()
          ) &&
          scheduledDateTime.getTime() >=
            now.getTime()
        );
      }
    );

  if (
    futureAppointments.length === 0
  ) {
    return {
      cancelledCount: 0,
      appointmentIds: [],
      appointments: [],
    };
  }

  const appointmentIds =
    futureAppointments.map(
      (appointment) =>
        appointment.id
    );

  const updatePayload = {
    status:
      "cancelled_by_organization",

    updated_at:
      now.toISOString(),
  };

  if (normalizedCancelledBy) {
    updatePayload.cancelled_by =
      normalizedCancelledBy;
  }

  const {
    data: cancelledAppointments,
    error: updateError,
  } = await supabase
    .from("appointments")
    .update(updatePayload)
    .in("id", appointmentIds)
    .in(
      "status",
      DOCTOR_BLOCK_CANCELLABLE_STATUSES
    )
    .select(`
      id,
      patient_id,
      doctor_id,
      organization_id,
      date,
      time,
      status
    `);

  if (updateError) {
    throw createServiceError(
      `Не удалось отменить будущие записи врача: ${updateError.message}`
    );
  }

  const cancelledItems =
    cancelledAppointments || [];

  if (cancelledItems.length > 0) {
    const cancelledIds =
      cancelledItems.map(
        (appointment) =>
          appointment.id
      );

    const {
      error: codesError,
    } = await supabase
      .from(
        "appointment_start_codes"
      )
      .update({
        is_used: true,
      })
      .in(
        "appointment_id",
        cancelledIds
      )
      .eq("is_used", false);

    if (codesError) {
      console.error(
        "[DOCTOR BLOCK START CODES ERROR]",
        codesError.message
      );
    }
  }

  for (
    const appointment of
    cancelledItems
  ) {
    await insertNotification({
      profileId:
        appointment.patient_id,

      title:
        "Запись отменена",

      message:
        `Ваша запись на ${appointment.date} в ${normalizeTime(
          appointment.time
        )} отменена, потому что врач временно недоступен.`,

      link:
        "/patient/visits",
    });
  }

  return {
    cancelledCount:
      cancelledItems.length,

    appointmentIds:
      cancelledItems.map(
        (appointment) =>
          appointment.id
      ),

    appointments:
      cancelledItems,
  };
}


export async function generateStartCode(
  appointmentId
) {
  const normalizedId =
    clean(appointmentId);

  const {
    data: appointment,
    error,
  } = await supabase
    .from("appointments")
    .select(
      "id, date, status"
    )
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    throw createServiceError(
      `Ошибка получения записи: ${error.message}`
    );
  }

  if (!appointment) {
    throw createServiceError(
      "Запись на приём не найдена.",
      404
    );
  }

  if (
    ![
      "scheduled",
      "confirmed",
    ].includes(
      appointment.status
    )
  ) {
    throw createServiceError(
      "Для этой записи нельзя создать новый код начала.",
      409
    );
  }

  const result =
    await createStartCodeRecord(
      normalizedId,
      appointment.date
    );

  return result.code;
}

export async function startAppointment(
  id,
  doctorId,
  code,
  qrToken
) {
  const appointmentId =
    clean(id);

  const normalizedDoctorId =
    clean(doctorId);

  const normalizedCode =
    clean(code);

  const normalizedQrToken =
    clean(qrToken);

  if (!normalizedDoctorId) {
    throw createServiceError(
      "Не удалось определить врача.",
      403
    );
  }

  const {
    data: appointment,
    error: loadError,
  } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (loadError) {
    throw createServiceError(
      `Ошибка получения записи: ${loadError.message}`
    );
  }

  if (!appointment) {
    throw createServiceError(
      "Запись на приём не найдена.",
      404
    );
  }

  if (
    String(
      appointment.doctor_id
    ) !==
    String(normalizedDoctorId)
  ) {
    throw createServiceError(
      "Вы не являетесь лечащим врачом этого приёма.",
      403
    );
  }

  if (
    ![
      "scheduled",
      "confirmed",
    ].includes(
      appointment.status
    )
  ) {
    throw createServiceError(
      `Приём нельзя начать в статусе ${appointment.status}.`,
      409
    );
  }

  if (
    appointment.date !==
    getTodayInAstana()
  ) {
    throw createServiceError(
      "Начать приём можно только в назначенную дату.",
      409
    );
  }

  let verifiedByCode = false;

  if (normalizedQrToken) {
    if (
      clean(
        appointment.qr_token
      ) !== normalizedQrToken
    ) {
      throw createServiceError(
        "Неверный QR-код пациента.",
        400
      );
    }
  } else if (normalizedCode) {
    const {
      data: startCodes,
      error: startCodeError,
    } = await supabase
      .from(
        "appointment_start_codes"
      )
      .select("*")
      .eq(
        "appointment_id",
        appointmentId
      )
      .eq(
        "code",
        normalizedCode
      )
      .eq("is_used", false)
      .limit(1);

    if (startCodeError) {
      throw createServiceError(
        `Ошибка проверки кода начала: ${startCodeError.message}`
      );
    }

    const startCode =
      startCodes?.[0];

    if (!startCode) {
      throw createServiceError(
        "Неверный или уже использованный код начала приёма.",
        400
      );
    }

    if (
      new Date(
        startCode.expires_at
      ) < new Date()
    ) {
      throw createServiceError(
        "Срок действия кода начала приёма истёк.",
        410
      );
    }

    const { error: useCodeError } =
      await supabase
        .from(
          "appointment_start_codes"
        )
        .update({
          is_used: true,
        })
        .eq("id", startCode.id)
        .eq("is_used", false);

    if (useCodeError) {
      throw createServiceError(
        `Не удалось использовать код начала: ${useCodeError.message}`
      );
    }

    verifiedByCode = true;
  } else {
    throw createServiceError(
      "Введите цифровой код или отсканируйте QR-код.",
      400
    );
  }

  if (!verifiedByCode) {
    await invalidateStartCodes(
      appointmentId
    );
  }

  const now =
    new Date().toISOString();

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("appointments")
    .update({
      status: "in_progress",

      actual_start_time: now,

      updated_at: now,
    })
    .eq("id", appointmentId)
    .in("status", [
      "scheduled",
      "confirmed",
    ])
    .select("*")
    .maybeSingle();

  if (updateError) {
    throw createServiceError(
      `Ошибка начала приёма: ${updateError.message}`
    );
  }

  if (!updated) {
    throw createServiceError(
      "Запись уже была изменена. Обновите страницу.",
      409
    );
  }

  await insertNotification({
    profileId:
      appointment.patient_id,

    title: "Приём начался",

    message:
      "Врач подтвердил начало вашего приёма.",

    link:
      "/patient/appointments",
  });

  return updated;
}

export async function initiateFinishAppointment(
  id,
  doctorId
) {
  const appointmentId =
    clean(id);

  const normalizedDoctorId =
    clean(doctorId);

  const {
    data: appointment,
    error: loadError,
  } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (loadError) {
    throw createServiceError(
      `Ошибка получения записи: ${loadError.message}`
    );
  }

  if (!appointment) {
    throw createServiceError(
      "Запись на приём не найдена.",
      404
    );
  }

  if (
    String(
      appointment.doctor_id
    ) !==
    String(normalizedDoctorId)
  ) {
    throw createServiceError(
      "Вы не являетесь лечащим врачом.",
      403
    );
  }

  if (
    ![
      "in_progress",
      "waiting_finish_confirmation",
    ].includes(
      appointment.status
    )
  ) {
    throw createServiceError(
      "Запросить код завершения можно только после начала приёма.",
      409
    );
  }

  const context =
    await loadBookingContext(
      appointment.patient_id,
      appointment.organization_id,
      appointment.doctor_id
    );

  const recipientEmail =
    clean(context.patient?.email);

  if (
    !isValidEmail(
      recipientEmail
    )
  ) {
    throw createServiceError(
      "У пациента не указана корректная электронная почта.",
      400
    );
  }

  await invalidateFinishCodes(
    appointmentId
  );

  const code =
    generateNumericCode(4);

  const expiresMinutes = 10;

  const expiresAt =
    new Date(
      Date.now() +
        expiresMinutes *
          60 *
          1000
    );

  const {
    error: codeError,
  } = await supabase
    .from(
      "appointment_finish_codes"
    )
    .insert({
      appointment_id:
        appointmentId,

      code_hash:
        hashCode(code),

      expires_at:
        expiresAt.toISOString(),

      is_used: false,
    });

  if (codeError) {
    throw createServiceError(
      `Не удалось создать код завершения приёма: ${codeError.message}`
    );
  }

  if (
    appointment.status ===
    "in_progress"
  ) {
    const {
      error: statusError,
    } = await supabase
      .from("appointments")
      .update({
        status:
          "waiting_finish_confirmation",

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .eq(
        "status",
        "in_progress"
      );

    if (statusError) {
      throw createServiceError(
        `Не удалось изменить статус приёма: ${statusError.message}`
      );
    }
  }

  await insertNotification({
    profileId:
      appointment.patient_id,

    title:
      "Код завершения приёма",

    message:
      `Сообщите врачу код ${code}. ` +
      `Код действует ${expiresMinutes} минут.`,

    link:
      "/patient/appointments",
  });

  let emailSent = false;
  let emailError = "";

  try {
    await sendAppointmentFinishCodeEmail({
      email: recipientEmail,

      patientName:
        context.patient?.full_name,

      doctorName:
        getDoctorName(context),

      date:
        appointment.date,

      time:
        appointment.time,

      code,

      expiresMinutes,
    });

    emailSent = true;
  } catch (error) {
    emailError =
      error?.message ||
      "Не удалось отправить письмо.";

    console.error(
      "[FINISH EMAIL ERROR]",
      emailError
    );
  }

  const exposeCode =
    process.env.NODE_ENV !==
    "production";

  return {
    success: true,

    message: emailSent
      ? "Код завершения отправлен пациенту на почту и в уведомления."
      : "Код создан и отправлен пациенту во внутренние уведомления, но письмо отправить не удалось.",

    emailSent,

    emailError:
      emailError || null,

    expiresAt:
      expiresAt.toISOString(),

    code: exposeCode
      ? code
      : undefined,
  };
}

export async function completeAppointment(
  id,
  doctorId,
  code,
  visitDetails = {}
) {
  const appointmentId =
    clean(id);

  const normalizedDoctorId =
    clean(doctorId);

  const normalizedCode =
    clean(code);

  if (
    !/^\d{4}$/.test(
      normalizedCode
    )
  ) {
    throw createServiceError(
      "Введите четырёхзначный код завершения.",
      400
    );
  }

  const {
    data: appointment,
    error: loadError,
  } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (loadError) {
    throw createServiceError(
      `Ошибка получения записи: ${loadError.message}`
    );
  }

  if (!appointment) {
    throw createServiceError(
      "Запись на приём не найдена.",
      404
    );
  }

  if (
    String(
      appointment.doctor_id
    ) !==
    String(normalizedDoctorId)
  ) {
    throw createServiceError(
      "Доступ запрещён.",
      403
    );
  }

  if (
    appointment.status !==
    "waiting_finish_confirmation"
  ) {
    throw createServiceError(
      "Приём не ожидает подтверждения завершения.",
      409
    );
  }

  const {
    data: finishCodes,
    error: codeLoadError,
  } = await supabase
    .from(
      "appointment_finish_codes"
    )
    .select("*")
    .eq(
      "appointment_id",
      appointmentId
    )
    .eq(
      "code_hash",
      hashCode(normalizedCode)
    )
    .eq("is_used", false)
    .limit(1);

  if (codeLoadError) {
    throw createServiceError(
      `Ошибка проверки кода завершения: ${codeLoadError.message}`
    );
  }

  const finishCode =
    finishCodes?.[0];

  if (!finishCode) {
    throw createServiceError(
      "Неверный или уже использованный код завершения.",
      400
    );
  }

  if (
    new Date(
      finishCode.expires_at
    ) < new Date()
  ) {
    throw createServiceError(
      "Срок действия кода завершения истёк. Запросите новый код.",
      410
    );
  }

  const endTime =
    new Date().toISOString();

  const {
    complaints,
    symptoms,
    preliminaryDiagnosis,
    finalDiagnosis,
    treatment,
    recommendations,
    comment,
  } = visitDetails;

  const {
    data: record,
    error: recordError,
  } = await supabase
    .from("visit_records")
    .upsert(
      {
        appointment_id:
          appointmentId,

        patient_id:
          appointment.patient_id,

        doctor_id:
          appointment.doctor_id,

        organization_id:
          appointment.organization_id,

        complaints:
          clean(complaints) || null,

        symptoms:
          clean(symptoms) || null,

        preliminary_diagnosis:
          clean(
            preliminaryDiagnosis
          ) || null,

        final_diagnosis:
          clean(finalDiagnosis) ||
          null,

        treatment:
          clean(treatment) || null,

        recommendations:
          clean(recommendations) ||
          null,

        comment:
          clean(comment) || null,

        actual_start_time:
          appointment.actual_start_time,

        actual_end_time:
          endTime,
      },
      {
        onConflict:
          "appointment_id",
      }
    )
    .select("*")
    .single();

  if (recordError) {
    throw createServiceError(
      `Не удалось сохранить медицинскую запись: ${recordError.message}`
    );
  }

  const {
    data: updatedAppointment,
    error: appointmentError,
  } = await supabase
    .from("appointments")
    .update({
      status: "completed",

      actual_end_time:
        endTime,

      updated_at:
        endTime,
    })
    .eq("id", appointmentId)
    .eq(
      "status",
      "waiting_finish_confirmation"
    )
    .select("*")
    .maybeSingle();

  if (
    appointmentError ||
    !updatedAppointment
  ) {
    await supabase
      .from("visit_records")
      .delete()
      .eq(
        "appointment_id",
        appointmentId
      );

    throw createServiceError(
      appointmentError
        ? `Не удалось завершить приём: ${appointmentError.message}`
        : "Статус записи уже был изменён."
    );
  }

  const { error: useCodeError } =
    await supabase
      .from(
        "appointment_finish_codes"
      )
      .update({
        is_used: true,
      })
      .eq("id", finishCode.id)
      .eq("is_used", false);

  if (useCodeError) {
    console.error(
      "[FINISH CODE UPDATE ERROR]",
      useCodeError.message
    );
  }

  await insertNotification({
    profileId:
      appointment.patient_id,

    title: "Приём завершён",

    message:
      "Приём успешно завершён. Результаты доступны в истории посещений.",

    link:
      "/patient/appointments",
  });

  return {
    success: true,

    appointment:
      updatedAppointment,

    record,
  };
}

export async function markNoShow(
  id,
  doctorId
) {
  const appointmentId =
    clean(id);

  const normalizedDoctorId =
    clean(doctorId);

  const {
    data: appointment,
    error: loadError,
  } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (loadError) {
    throw createServiceError(
      `Ошибка получения записи: ${loadError.message}`
    );
  }

  if (!appointment) {
    throw createServiceError(
      "Запись на приём не найдена.",
      404
    );
  }

  if (
    String(
      appointment.doctor_id
    ) !==
    String(normalizedDoctorId)
  ) {
    throw createServiceError(
      "Вы не являетесь лечащим врачом.",
      403
    );
  }

  if (
    ![
      "scheduled",
      "confirmed",
    ].includes(
      appointment.status
    )
  ) {
    throw createServiceError(
      `Нельзя отметить неявку в статусе ${appointment.status}.`,
      409
    );
  }

  const scheduledStart =
    getScheduledDateTime(
      appointment.date,
      appointment.time
    );

  if (
    Number.isNaN(
      scheduledStart.getTime()
    )
  ) {
    throw createServiceError(
      "Некорректная дата или время записи."
    );
  }

  const allowedAt = new Date(
    scheduledStart.getTime() +
      10 * 60 * 1000
  );

  const now = new Date();

  if (now < allowedAt) {
    const remainingMinutes =
      Math.ceil(
        (allowedAt.getTime() -
          now.getTime()) /
          60000
      );

    throw createServiceError(
      `Отметить неявку можно через 10 минут после назначенного времени. Осталось ${remainingMinutes} мин.`,
      409
    );
  }

  const {
    data: updated,
    error,
  } = await supabase
    .from("appointments")
    .update({
      status: "no_show",

      updated_at:
        now.toISOString(),
    })
    .eq("id", appointmentId)
    .in("status", [
      "scheduled",
      "confirmed",
    ])
    .select("*")
    .maybeSingle();

  if (error) {
    throw createServiceError(
      `Ошибка установки неявки: ${error.message}`
    );
  }

  if (!updated) {
    throw createServiceError(
      "Статус записи уже изменён.",
      409
    );
  }

  await insertNotification({
    profileId:
      appointment.patient_id,

    title:
      "Пациент не пришёл на приём",

    message:
      "Врач отметил, что вы не пришли на приём в течение 10 минут после назначенного времени.",

    link:
      "/patient/appointments",
  });

  return updated;
}


/*
 * Автоматически завершает приёмы,
 * для которых код завершения истёк.
 *
 * Данные приёма уже были сохранены
 * перед запросом кода, поэтому здесь
 * ничего не удаляется и не перезаписывается.
 */
export async function autoCompleteExpiredAppointments() {
  const now =
    new Date().toISOString();

  const {
    data: expiredCodes,
    error: codesError,
  } = await supabase
    .from(
      "appointment_finish_codes"
    )
    .select(
      "id, appointment_id, expires_at"
    )
    .eq(
      "is_used",
      false
    )
    .lte(
      "expires_at",
      now
    );

  if (codesError) {
    throw createServiceError(
      `Ошибка поиска истёкших кодов завершения: ${codesError.message}`
    );
  }

  const appointmentIds = [
    ...new Set(
      (expiredCodes || [])
        .map(
          (item) =>
            clean(
              item.appointment_id
            )
        )
        .filter(Boolean)
    ),
  ];

  if (
    appointmentIds.length === 0
  ) {
    return 0;
  }

  const {
    data: appointments,
    error: appointmentsError,
  } = await supabase
    .from("appointments")
    .select(
      "id, patient_id, status"
    )
    .in(
      "id",
      appointmentIds
    )
    .eq(
      "status",
      "waiting_finish_confirmation"
    );

  if (appointmentsError) {
    throw createServiceError(
      `Ошибка получения незавершённых приёмов: ${appointmentsError.message}`
    );
  }

  let completedCount = 0;

  for (
    const appointment of
    appointments || []
  ) {
    const endTime =
      new Date().toISOString();

    const {
      data: completedAppointment,
      error: completeError,
    } = await supabase
      .from("appointments")
      .update({
        status:
          "completed",

        actual_end_time:
          endTime,

        updated_at:
          endTime,
      })
      .eq(
        "id",
        appointment.id
      )
      .eq(
        "status",
        "waiting_finish_confirmation"
      )
      .select(
        "id, patient_id"
      )
      .maybeSingle();

    if (completeError) {
      console.error(
        "[AUTO COMPLETE APPOINTMENT ERROR]",
        appointment.id,
        completeError.message
      );

      continue;
    }

    /*
     * Приём мог быть завершён вручную
     * между запросом и обновлением.
     */
    if (!completedAppointment) {
      continue;
    }

    /*
     * Не меняем медицинские сведения.
     * Только фиксируем время завершения
     * уже сохранённого протокола.
     */
    const {
      error: visitError,
    } = await supabase
      .from("visit_records")
      .update({
        actual_end_time:
          endTime,
      })
      .eq(
        "appointment_id",
        appointment.id
      );

    if (visitError) {
      console.error(
        "[AUTO COMPLETE VISIT ERROR]",
        appointment.id,
        visitError.message
      );
    }

    const {
      error: codesUpdateError,
    } = await supabase
      .from(
        "appointment_finish_codes"
      )
      .update({
        is_used:
          true,
      })
      .eq(
        "appointment_id",
        appointment.id
      )
      .eq(
        "is_used",
        false
      );

    if (codesUpdateError) {
      console.error(
        "[AUTO COMPLETE CODE ERROR]",
        appointment.id,
        codesUpdateError.message
      );
    }

    await insertNotification({
      profileId:
        appointment.patient_id,

      title:
        "Приём завершён автоматически",

      message:
        "Код подтверждения не был введён в течение 10 минут. Приём завершён, сохранённые врачом данные добавлены в медицинскую карту.",

      link:
        "/patient/visits",
    });

    completedCount += 1;
  }

  return completedCount;
}

