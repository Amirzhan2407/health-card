
import { supabase } from "../config/supabaseClient.js";

const ACTIVE_APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "transfer_pending",
  "transferred",
  "in_progress",
  "waiting_finish_confirmation",
  "completed",
];

const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

function createServiceError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function clean(value) {
  return String(value ?? "").trim();
}

async function getDoctorProfileId(
  doctorId
) {
  const {
    data: doctor,
    error: doctorError,
  } = await supabase
    .from("doctors")
    .select("id, member_id")
    .eq("id", doctorId)
    .maybeSingle();

  if (doctorError) {
    throw createServiceError(
      `Ошибка получения профиля врача: ${doctorError.message}`
    );
  }

  if (!doctor) {
    throw createServiceError(
      "Врач не найден.",
      404
    );
  }

  if (!doctor.member_id) {
    throw createServiceError(
      "Врач не привязан к сотруднику организации.",
      409
    );
  }

  const {
    data: member,
    error: memberError,
  } = await supabase
    .from("organization_members")
    .select("profile_id")
    .eq("id", doctor.member_id)
    .maybeSingle();

  if (memberError) {
    throw createServiceError(
      `Ошибка получения профиля врача: ${memberError.message}`
    );
  }

  if (!member?.profile_id) {
    throw createServiceError(
      "Профиль врача не найден.",
      409
    );
  }

  return member.profile_id;
}

async function insertDoctorNotificationSafe({
  doctorId,
  title,
  message,
  link = "/doctor",
}) {
  try {
    const profileId =
      await getDoctorProfileId(
        doctorId
      );

    const payload = {
      profile_id:
        profileId,

      title:
        clean(title) ||
        "Уведомление",

      message:
        clean(message),

      link:
        clean(link) || "/doctor",

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
        "[DOCTOR SCHEDULE NOTIFICATION ERROR]",
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

      return false;
    }

    console.log(
      "[DOCTOR SCHEDULE NOTIFICATION INSERTED]",
      {
        id:
          data.id,

        profileId:
          data.profile_id,

        title:
          data.title,
      }
    );

    return true;
  } catch (error) {
    console.error(
      "[DOCTOR SCHEDULE NOTIFICATION EXCEPTION]",
      error?.message || error
    );

    return false;
  }
}

function normalizeDoctorId(value) {
  const doctorId = clean(value);

  if (!doctorId) {
    throw createServiceError(
      "Не указан идентификатор врача.",
      400
    );
  }

  return doctorId;
}

function normalizeDate(value, fieldName) {
  const date = clean(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createServiceError(
      `${fieldName} должна быть указана в формате ГГГГ-ММ-ДД.`,
      400
    );
  }

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    throw createServiceError(
      `${fieldName} содержит некорректную дату.`,
      400
    );
  }

  return date;
}

function normalizeOptionalDate(value, fieldName) {
  const date = clean(value);

  if (!date) {
    return null;
  }

  return normalizeDate(date, fieldName);
}

function normalizeTime(
  value,
  fieldName,
  fallback = null
) {
  const normalizedValue = clean(value || fallback);

  if (!normalizedValue) {
    return null;
  }

  const match = normalizedValue.match(
    /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/
  );

  if (!match) {
    throw createServiceError(
      `${fieldName} должно быть указано в формате ЧЧ:ММ.`,
      400
    );
  }

  return `${match[1]}:${match[2]}`;
}

function normalizeSlotDuration(
  value,
  fallback = 30
) {
  const duration = Number(value ?? fallback);

  if (
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 480
  ) {
    throw createServiceError(
      "Продолжительность приёма должна составлять от 5 до 480 минут.",
      400
    );
  }

  return duration;
}

function parseTimeToMinutes(time) {
  const normalizedTime = normalizeTime(
    time,
    "Время"
  );

  const [hours, minutes] = normalizedTime
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(2, "0")}`;
}

function normalizeStoredTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${day}`;
}

function getDayNumber(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const jsDay = date.getDay();

  return jsDay === 0 ? 7 : jsDay;
}

function validateWorkingPeriod({
  workStart,
  workEnd,
  lunchStart,
  lunchEnd,
}) {
  const workStartMinutes =
    parseTimeToMinutes(workStart);

  const workEndMinutes =
    parseTimeToMinutes(workEnd);

  if (workEndMinutes <= workStartMinutes) {
    throw createServiceError(
      "Время окончания работы должно быть позже времени начала.",
      400
    );
  }

  if (
    Boolean(lunchStart) !== Boolean(lunchEnd)
  ) {
    throw createServiceError(
      "Необходимо указать и начало, и окончание обеда.",
      400
    );
  }

  if (lunchStart && lunchEnd) {
    const lunchStartMinutes =
      parseTimeToMinutes(lunchStart);

    const lunchEndMinutes =
      parseTimeToMinutes(lunchEnd);

    if (
      lunchEndMinutes <= lunchStartMinutes
    ) {
      throw createServiceError(
        "Окончание обеда должно быть позже его начала.",
        400
      );
    }

    if (
      lunchStartMinutes < workStartMinutes ||
      lunchEndMinutes > workEndMinutes
    ) {
      throw createServiceError(
        "Обед должен находиться внутри рабочего времени.",
        400
      );
    }
  }
}

function normalizeWorkingDay(
  rawDay,
  defaults
) {
  const isWorking =
    rawDay?.isWorking === true ||
    rawDay?.is_working === true;

  if (!isWorking) {
    return {
      isWorking: false,
    };
  }

  const workStart = normalizeTime(
    rawDay?.workStart ??
      rawDay?.work_start,
    "Начало рабочего дня",
    defaults.workStart
  );

  const workEnd = normalizeTime(
    rawDay?.workEnd ??
      rawDay?.work_end,
    "Окончание рабочего дня",
    defaults.workEnd
  );

  const lunchStart = normalizeTime(
    rawDay?.lunchStart ??
      rawDay?.lunch_start,
    "Начало обеда",
    defaults.lunchStart
  );

  const lunchEnd = normalizeTime(
    rawDay?.lunchEnd ??
      rawDay?.lunch_end,
    "Окончание обеда",
    defaults.lunchEnd
  );

  const slotDuration =
    normalizeSlotDuration(
      rawDay?.slotDuration ??
        rawDay?.slot_duration,
      defaults.slotDuration
    );

  validateWorkingPeriod({
    workStart,
    workEnd,
    lunchStart,
    lunchEnd,
  });

  return {
    isWorking: true,
    workStart,
    workEnd,
    lunchStart,
    lunchEnd,
    slotDuration,
  };
}

function buildDaySchedules(scheduleData) {
  const defaults = {
    workStart: normalizeTime(
      scheduleData?.workStart,
      "Начало рабочего дня",
      "09:00"
    ),
    workEnd: normalizeTime(
      scheduleData?.workEnd,
      "Окончание рабочего дня",
      "18:00"
    ),
    lunchStart: normalizeTime(
      scheduleData?.lunchStart,
      "Начало обеда",
      "13:00"
    ),
    lunchEnd: normalizeTime(
      scheduleData?.lunchEnd,
      "Окончание обеда",
      "14:00"
    ),
    slotDuration: normalizeSlotDuration(
      scheduleData?.slotDuration,
      30
    ),
  };

  validateWorkingPeriod(defaults);

  const rawDaySchedules =
    scheduleData?.daySchedules &&
    typeof scheduleData.daySchedules ===
      "object"
      ? scheduleData.daySchedules
      : null;

  const requestedWorkDays = Array.isArray(
    scheduleData?.workDays
  )
    ? scheduleData.workDays
        .map(Number)
        .filter((day) =>
          DAY_NUMBERS.includes(day)
        )
    : [1, 2, 3, 4, 5];

  const daySchedules = {};
  const workDays = [];

  for (const dayNumber of DAY_NUMBERS) {
    let rawDay;

    if (rawDaySchedules) {
      rawDay =
        rawDaySchedules[String(dayNumber)] ??
        rawDaySchedules[dayNumber] ??
        {
          isWorking: false,
        };
    } else {
      rawDay = {
        isWorking:
          requestedWorkDays.includes(dayNumber),
        ...defaults,
      };
    }

    const normalizedDay =
      normalizeWorkingDay(rawDay, defaults);

    daySchedules[String(dayNumber)] =
      normalizedDay;

    if (normalizedDay.isWorking) {
      workDays.push(dayNumber);
    }
  }

  if (workDays.length === 0) {
    throw createServiceError(
      "Выберите хотя бы один рабочий день.",
      400
    );
  }

  const firstWorkingDay =
    daySchedules[String(workDays[0])];

  return {
    workDays,
    daySchedules,
    workStart: firstWorkingDay.workStart,
    workEnd: firstWorkingDay.workEnd,
    lunchStart:
      firstWorkingDay.lunchStart || null,
    lunchEnd:
      firstWorkingDay.lunchEnd || null,
    slotDuration:
      firstWorkingDay.slotDuration,
  };
}

async function ensureDoctorExists(doctorId) {
  const { data, error } = await supabase
    .from("doctors")
    .select("id")
    .eq("id", doctorId)
    .maybeSingle();

  if (error) {
    throw createServiceError(
      `Ошибка проверки врача: ${error.message}`
    );
  }

  if (!data) {
    throw createServiceError(
      "Врач не найден.",
      404
    );
  }

  return data;
}

export async function getStandardSchedule(
  doctorId
) {
  const normalizedDoctorId =
    normalizeDoctorId(doctorId);

  const { data, error } = await supabase
    .from("doctor_schedules")
    .select("*")
    .eq("doctor_id", normalizedDoctorId)
    .maybeSingle();

  if (error) {
    throw createServiceError(
      `Ошибка получения расписания: ${error.message}`
    );
  }

  return data || null;
}

/**
 * Создание или обновление стандартного графика.
 */
export async function setStandardSchedule(
  doctorId,
  scheduleData
) {
  const normalizedDoctorId =
    normalizeDoctorId(doctorId);

  await ensureDoctorExists(normalizedDoctorId);

  const normalizedSchedule =
    buildDaySchedules(scheduleData);

  const startDate = normalizeDate(
    scheduleData?.startDate ||
      getLocalDateString(),
    "Дата начала действия расписания"
  );

  const endDate = normalizeOptionalDate(
    scheduleData?.endDate,
    "Дата окончания действия расписания"
  );

  if (endDate && endDate < startDate) {
    throw createServiceError(
      "Дата окончания расписания не может быть раньше даты начала.",
      400
    );
  }

  const payload = {
    doctor_id: normalizedDoctorId,
    work_days: normalizedSchedule.workDays,
    work_start:
      normalizedSchedule.workStart,
    work_end: normalizedSchedule.workEnd,
    lunch_start:
      normalizedSchedule.lunchStart,
    lunch_end: normalizedSchedule.lunchEnd,
    slot_duration:
      normalizedSchedule.slotDuration,
    start_date: startDate,
    end_date: endDate,
    day_schedules:
      normalizedSchedule.daySchedules,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("doctor_schedules")
    .upsert(payload, {
      onConflict: "doctor_id",
    })
    .select("*")
    .single();

  if (error) {
    throw createServiceError(
      `Ошибка сохранения расписания: ${error.message}`
    );
  }

  await insertDoctorNotificationSafe({
    doctorId: normalizedDoctorId,

    title:
      "Расписание врача обновлено",

    message:
      `Администратор обновил ваш стандартный график. ` +
      `Дата начала: ${startDate}` +
      (endDate
        ? `. Дата окончания: ${endDate}.`
        : "."),

    link: "/doctor",
  });

  return data;
}

/**
 * Разовое изменение графика на конкретную дату.
 */
export async function addScheduleException(
  doctorId,
  exceptionData
) {
  const normalizedDoctorId =
    normalizeDoctorId(doctorId);

  await ensureDoctorExists(normalizedDoctorId);

  const exceptionDate = normalizeDate(
    exceptionData?.exceptionDate,
    "Дата изменения графика"
  );

  const isWorking =
    exceptionData?.isWorking === true;

  let workStart = null;
  let workEnd = null;
  let lunchStart = null;
  let lunchEnd = null;
  let slotDuration = null;

  if (isWorking) {
    workStart = normalizeTime(
      exceptionData?.workStart,
      "Начало рабочего дня",
      "09:00"
    );

    workEnd = normalizeTime(
      exceptionData?.workEnd,
      "Окончание рабочего дня",
      "18:00"
    );

    lunchStart = normalizeTime(
      exceptionData?.lunchStart,
      "Начало обеда"
    );

    lunchEnd = normalizeTime(
      exceptionData?.lunchEnd,
      "Окончание обеда"
    );

    slotDuration = normalizeSlotDuration(
      exceptionData?.slotDuration,
      30
    );

    validateWorkingPeriod({
      workStart,
      workEnd,
      lunchStart,
      lunchEnd,
    });
  }

  const { data, error } = await supabase
    .from("schedule_exceptions")
    .upsert(
      {
        doctor_id: normalizedDoctorId,
        exception_date: exceptionDate,
        is_working: isWorking,
        work_start: workStart,
        work_end: workEnd,
        lunch_start: lunchStart,
        lunch_end: lunchEnd,
        slot_duration: slotDuration,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "doctor_id,exception_date",
      }
    )
    .select("*")
    .single();

  if (error) {
    throw createServiceError(
      `Ошибка сохранения изменения графика: ${error.message}`
    );
  }

  await insertDoctorNotificationSafe({
    doctorId: normalizedDoctorId,

    title:
      "Изменение графика врача",

    message: isWorking
      ? `На ${exceptionDate} установлен рабочий день с ${workStart} до ${workEnd}.`
      : `На ${exceptionDate} установлен выходной день.`,

    link: "/doctor",
  });

  return data;
}

/**
 * Плановое или экстренное отсутствие врача.
 */
export async function addDoctorAbsence(
  doctorId,
  absenceData
) {
  const normalizedDoctorId =
    normalizeDoctorId(doctorId);

  await ensureDoctorExists(normalizedDoctorId);

  const absenceType = clean(
    absenceData?.absenceType
  );

  if (
    !["planned", "emergency"].includes(
      absenceType
    )
  ) {
    throw createServiceError(
      "Допустимые типы отсутствия: planned или emergency.",
      400
    );
  }

  const startDate = normalizeDate(
    absenceData?.startDate,
    "Дата начала отсутствия"
  );

  const endDate = normalizeDate(
    absenceData?.endDate,
    "Дата окончания отсутствия"
  );

  if (endDate < startDate) {
    throw createServiceError(
      "Дата окончания отсутствия не может быть раньше даты начала.",
      400
    );
  }

  const reason = clean(absenceData?.reason);
  const comment = clean(absenceData?.comment);

  if (!reason) {
    throw createServiceError(
      "Укажите причину отсутствия врача.",
      400
    );
  }

  const { data, error } = await supabase
    .from("doctor_absences")
    .insert({
      doctor_id: normalizedDoctorId,
      absence_type: absenceType,
      reason,
      start_date: startDate,
      end_date: endDate,
      comment: comment || null,
    })
    .select("*")
    .single();

  if (error) {
    throw createServiceError(
      `Ошибка сохранения отсутствия: ${error.message}`
    );
  }

  await insertDoctorNotificationSafe({
    doctorId: normalizedDoctorId,

    title:
      "Добавлен период отсутствия",

    message:
      `В ваш график добавлено отсутствие с ${startDate} по ${endDate}. ` +
      `Причина: ${reason}.`,

    link: "/doctor",
  });

  return data;
}

function getStandardDayConfiguration(
  schedule,
  dayNumber
) {
  const detailedDay =
    schedule?.day_schedules?.[
      String(dayNumber)
    ];

  if (
    detailedDay &&
    typeof detailedDay === "object"
  ) {
    if (!detailedDay.isWorking) {
      return {
        isWorking: false,
      };
    }

    return {
      isWorking: true,
      workStart: normalizeStoredTime(
        detailedDay.workStart
      ),
      workEnd: normalizeStoredTime(
        detailedDay.workEnd
      ),
      lunchStart: normalizeStoredTime(
        detailedDay.lunchStart
      ),
      lunchEnd: normalizeStoredTime(
        detailedDay.lunchEnd
      ),
      slotDuration: Number(
        detailedDay.slotDuration
      ),
    };
  }

  const workDays = Array.isArray(
    schedule?.work_days
  )
    ? schedule.work_days.map(Number)
    : [];

  if (!workDays.includes(dayNumber)) {
    return {
      isWorking: false,
    };
  }

  return {
    isWorking: true,
    workStart: normalizeStoredTime(
      schedule.work_start
    ),
    workEnd: normalizeStoredTime(
      schedule.work_end
    ),
    lunchStart: normalizeStoredTime(
      schedule.lunch_start
    ),
    lunchEnd: normalizeStoredTime(
      schedule.lunch_end
    ),
    slotDuration: Number(
      schedule.slot_duration
    ),
  };
}

/**
 * Автоматическое формирование интервалов.
 */
export async function generateDoctorSlots(
  doctorId,
  dateString
) {
  const normalizedDoctorId =
    normalizeDoctorId(doctorId);

  const targetDate = normalizeDate(
    dateString,
    "Дата приёма"
  );

  const {
    data: activeAbsences,
    error: absenceError,
  } = await supabase
    .from("doctor_absences")
    .select("id")
    .eq("doctor_id", normalizedDoctorId)
    .lte("start_date", targetDate)
    .gte("end_date", targetDate)
    .limit(1);

  if (absenceError) {
    throw createServiceError(
      `Ошибка проверки отсутствия врача: ${absenceError.message}`
    );
  }

  if (
    Array.isArray(activeAbsences) &&
    activeAbsences.length > 0
  ) {
    return [];
  }

  const { data: schedule, error: scheduleError } =
    await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", normalizedDoctorId)
      .maybeSingle();

  if (scheduleError) {
    throw createServiceError(
      `Ошибка получения расписания: ${scheduleError.message}`
    );
  }

  const {
    data: exception,
    error: exceptionError,
  } = await supabase
    .from("schedule_exceptions")
    .select("*")
    .eq("doctor_id", normalizedDoctorId)
    .eq("exception_date", targetDate)
    .maybeSingle();

  if (exceptionError) {
    throw createServiceError(
      `Ошибка получения изменения графика: ${exceptionError.message}`
    );
  }

  if (!schedule && !exception) {
    return [];
  }

  if (
    schedule &&
    targetDate < schedule.start_date
  ) {
    return [];
  }

  if (
    schedule?.end_date &&
    targetDate > schedule.end_date
  ) {
    return [];
  }

  const dayNumber =
    getDayNumber(targetDate);

  const standardDay = schedule
    ? getStandardDayConfiguration(
        schedule,
        dayNumber
      )
    : {
        isWorking: false,
      };

  let dayConfiguration;

  if (exception) {
    if (!exception.is_working) {
      return [];
    }

    dayConfiguration = {
      isWorking: true,
      workStart: normalizeStoredTime(
        exception.work_start ||
          standardDay.workStart
      ),
      workEnd: normalizeStoredTime(
        exception.work_end ||
          standardDay.workEnd
      ),
      lunchStart: normalizeStoredTime(
        exception.lunch_start ??
          standardDay.lunchStart
      ),
      lunchEnd: normalizeStoredTime(
        exception.lunch_end ??
          standardDay.lunchEnd
      ),
      slotDuration: Number(
        exception.slot_duration ||
          standardDay.slotDuration ||
          30
      ),
    };
  } else {
    dayConfiguration = standardDay;
  }

  if (!dayConfiguration.isWorking) {
    return [];
  }

  const workStart =
    normalizeTime(
      dayConfiguration.workStart,
      "Начало рабочего дня"
    );

  const workEnd =
    normalizeTime(
      dayConfiguration.workEnd,
      "Окончание рабочего дня"
    );

  const lunchStart =
    normalizeTime(
      dayConfiguration.lunchStart,
      "Начало обеда"
    );

  const lunchEnd =
    normalizeTime(
      dayConfiguration.lunchEnd,
      "Окончание обеда"
    );

  const slotDuration =
    normalizeSlotDuration(
      dayConfiguration.slotDuration,
      30
    );

  validateWorkingPeriod({
    workStart,
    workEnd,
    lunchStart,
    lunchEnd,
  });

  const startMinutes =
    parseTimeToMinutes(workStart);

  const endMinutes =
    parseTimeToMinutes(workEnd);

  const lunchStartMinutes = lunchStart
    ? parseTimeToMinutes(lunchStart)
    : null;

  const lunchEndMinutes = lunchEnd
    ? parseTimeToMinutes(lunchEnd)
    : null;

  const now = new Date();
  const today = getLocalDateString(now);
  const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

  const candidateSlots = [];

  for (
    let slotStart = startMinutes;
    slotStart + slotDuration <= endMinutes;
    slotStart += slotDuration
  ) {
    const slotEnd =
      slotStart + slotDuration;

    const overlapsLunch =
      lunchStartMinutes !== null &&
      lunchEndMinutes !== null &&
      slotStart < lunchEndMinutes &&
      slotEnd > lunchStartMinutes;

    if (overlapsLunch) {
      continue;
    }

    if (
      targetDate === today &&
      slotStart <= currentMinutes
    ) {
      continue;
    }

    candidateSlots.push({
      time: formatMinutesToTime(slotStart),
      startTime:
        formatMinutesToTime(slotStart),
      endTime: formatMinutesToTime(slotEnd),
    });
  }

  const {
    data: appointments,
    error: appointmentsError,
  } = await supabase
    .from("appointments")
    .select("time, status")
    .eq("doctor_id", normalizedDoctorId)
    .eq("date", targetDate)
    .in(
      "status",
      ACTIVE_APPOINTMENT_STATUSES
    );

  if (appointmentsError) {
    throw createServiceError(
      `Ошибка проверки занятых интервалов: ${appointmentsError.message}`
    );
  }

  const bookedTimes = new Set(
    (appointments || []).map((appointment) =>
      normalizeStoredTime(appointment.time)
    )
  );

  return candidateSlots.map((slot) => ({
    ...slot,
    isAvailable: !bookedTimes.has(slot.time),
    status: bookedTimes.has(slot.time)
      ? "busy"
      : "available",
  }));
}
