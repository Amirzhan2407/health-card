import * as scheduleService from "../services/scheduleService.js";

export async function getAvailableSlots(req, res, next) {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: "doctorId и date обязательны в query параметрах.",
      });
    }

    const slots = await scheduleService.generateDoctorSlots(doctorId, date);
    return res.status(200).json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
}

export async function saveStandardSchedule(req, res, next) {
  try {
    const { doctorId } = req.body;
    if (!doctorId) {
      return res.status(400).json({ success: false, message: "doctorId обязателен." });
    }

    const schedule = await scheduleService.setStandardSchedule(doctorId, req.body);
    return res.status(200).json({
      success: true,
      message: "Стандартное расписание врача успешно сохранено.",
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
}

export async function saveScheduleException(req, res, next) {
  try {
    const { doctorId } = req.body;
    if (!doctorId) {
      return res.status(400).json({ success: false, message: "doctorId обязателен." });
    }

    const exception = await scheduleService.addScheduleException(doctorId, req.body);
    return res.status(201).json({
      success: true,
      message: "Исключение из расписания успешно сохранено.",
      data: exception,
    });
  } catch (error) {
    next(error);
  }
}

export async function saveDoctorAbsence(req, res, next) {
  try {
    const { doctorId } = req.body;
    if (!doctorId) {
      return res.status(400).json({ success: false, message: "doctorId обязателен." });
    }

    // Doctor can configure their own absence, Org Admin can configure any
    if (req.user.role === "doctor" && req.user.doctor_id !== doctorId) {
      return res.status(403).json({
        success: false,
        message: "Доступ запрещен. Вы можете настраивать отсутствие только для себя.",
      });
    }

    const absence = await scheduleService.addDoctorAbsence(doctorId, req.body);
    return res.status(201).json({
      success: true,
      message: "Период отсутствия врача успешно зарегистрирован.",
      data: absence,
    });
  } catch (error) {
    next(error);
  }
}
