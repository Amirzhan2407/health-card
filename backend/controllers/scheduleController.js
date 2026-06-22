
import { supabase } from "../config/supabaseClient.js";
import * as scheduleService from "../services/scheduleService.js";

function createControllerError(
  message,
  statusCode = 500
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function clean(value) {
  return String(value ?? "").trim();
}

function getUserRole(req) {
  return clean(req.user?.role).toLowerCase();
}

function getOrganizationId(req) {
  return clean(
    req.user?.organization_id ||
      req.user?.organizationId
  );
}

function getUserDoctorId(req) {
  return clean(
    req.user?.doctor_id ||
      req.user?.doctorId
  );
}

async function getDoctorOrganizationId(doctorId) {
  const { data: doctor, error: doctorError } =
    await supabase
      .from("doctors")
      .select("id, member_id")
      .eq("id", doctorId)
      .maybeSingle();

  if (doctorError) {
    throw createControllerError(
      `Ошибка проверки врача: ${doctorError.message}`
    );
  }

  if (!doctor) {
    throw createControllerError(
      "Врач не найден.",
      404
    );
  }

  if (!doctor.member_id) {
    throw createControllerError(
      "Врач не привязан к медицинской организации.",
      409
    );
  }

  const {
    data: organizationMember,
    error: memberError,
  } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("id", doctor.member_id)
    .maybeSingle();

  if (memberError) {
    throw createControllerError(
      `Ошибка проверки организации врача: ${memberError.message}`
    );
  }

  if (!organizationMember?.organization_id) {
    throw createControllerError(
      "Не удалось определить организацию врача.",
      409
    );
  }

  return clean(
    organizationMember.organization_id
  );
}

async function ensureDoctorAccess(req, doctorId) {
  const normalizedDoctorId = clean(doctorId);

  if (!normalizedDoctorId) {
    throw createControllerError(
      "doctorId обязателен.",
      400
    );
  }

  const role = getUserRole(req);

  if (role === "doctor") {
    const currentDoctorId =
      getUserDoctorId(req);

    if (
      !currentDoctorId ||
      currentDoctorId !== normalizedDoctorId
    ) {
      throw createControllerError(
        "Вы можете изменять расписание только своего профиля.",
        403
      );
    }

    return;
  }

  if (role === "organization_admin") {
    const organizationId =
      getOrganizationId(req);

    if (!organizationId) {
      throw createControllerError(
        "Администратор не привязан к организации.",
        403
      );
    }

    const doctorOrganizationId =
      await getDoctorOrganizationId(
        normalizedDoctorId
      );

    if (
      doctorOrganizationId !== organizationId
    ) {
      throw createControllerError(
        "Этот врач принадлежит другой медицинской организации.",
        403
      );
    }

    return;
  }

  throw createControllerError(
    "Недостаточно прав для управления расписанием.",
    403
  );
}

/**
 * Свободные и занятые интервалы врача.
 */
export async function getAvailableSlots(
  req,
  res,
  next
) {
  try {
    const doctorId = clean(
      req.query?.doctorId
    );

    const date = clean(req.query?.date);

    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message:
          "doctorId и date обязательны в query-параметрах.",
      });
    }

    const slots =
      await scheduleService.generateDoctorSlots(
        doctorId,
        date
      );

    return res.status(200).json({
      success: true,
      data: slots,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Получение сохранённого стандартного графика.
 */
export async function getStandardSchedule(
  req,
  res,
  next
) {
  try {
    const doctorId = clean(
      req.query?.doctorId
    );

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "doctorId обязателен.",
      });
    }

    await ensureDoctorAccess(req, doctorId);

    const schedule =
      await scheduleService.getStandardSchedule(
        doctorId
      );

    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Сохранение стандартного недельного графика.
 */
export async function saveStandardSchedule(
  req,
  res,
  next
) {
  try {
    const doctorId = clean(
      req.body?.doctorId
    );

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "doctorId обязателен.",
      });
    }

    await ensureDoctorAccess(req, doctorId);

    const schedule =
      await scheduleService.setStandardSchedule(
        doctorId,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        "Расписание врача успешно сохранено.",
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Временное изменение графика на конкретную дату.
 */
export async function saveScheduleException(
  req,
  res,
  next
) {
  try {
    const doctorId = clean(
      req.body?.doctorId
    );

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "doctorId обязателен.",
      });
    }

    await ensureDoctorAccess(req, doctorId);

    const exception =
      await scheduleService.addScheduleException(
        doctorId,
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "Изменение графика успешно сохранено.",
      data: exception,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Плановое или экстренное отсутствие врача.
 */
export async function saveDoctorAbsence(
  req,
  res,
  next
) {
  try {
    const doctorId = clean(
      req.body?.doctorId
    );

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "doctorId обязателен.",
      });
    }

    await ensureDoctorAccess(req, doctorId);

    const absence =
      await scheduleService.addDoctorAbsence(
        doctorId,
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "Период отсутствия врача успешно зарегистрирован.",
      data: absence,
    });
  } catch (error) {
    next(error);
  }
}

