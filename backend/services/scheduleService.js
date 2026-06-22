import { supabase } from "../config/supabaseClient.js";

/**
 * Creates or updates standard schedule settings for a doctor
 */
export async function setStandardSchedule(doctorId, scheduleData) {
  const { workDays, workStart, workEnd, lunchStart, lunchEnd, slotDuration, startDate, endDate } = scheduleData;

  // Check if schedule already exists
  const { data: existing, error: getErr } = await supabase
    .from("doctor_schedules")
    .select("id")
    .eq("doctor_id", doctorId)
    .maybeSingle();

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from("doctor_schedules")
      .update({
        work_days: workDays,
        work_start: workStart || "09:00",
        work_end: workEnd || "18:00",
        lunch_start: lunchStart || "13:00",
        lunch_end: lunchEnd || "14:00",
        slot_duration: slotDuration || 30,
        start_date: startDate || new Date().toISOString().split("T")[0],
        end_date: endDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    result = data;
  } else {
    const { data, error } = await supabase
      .from("doctor_schedules")
      .insert({
        doctor_id: doctorId,
        work_days: workDays,
        work_start: workStart || "09:00",
        work_end: workEnd || "18:00",
        lunch_start: lunchStart || "13:00",
        lunch_end: lunchEnd || "14:00",
        slot_duration: slotDuration || 30,
        start_date: startDate || new Date().toISOString().split("T")[0],
        end_date: endDate || null,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    result = data;
  }

  return result;
}

/**
 * Adds an exception to a doctor's schedule (e.g. working weekend or holiday hours)
 */
export async function addScheduleException(doctorId, exceptionData) {
  const { exceptionDate, isWorking, workStart, workEnd, lunchStart, lunchEnd, slotDuration } = exceptionData;

  const { data, error } = await supabase
    .from("schedule_exceptions")
    .insert({
      doctor_id: doctorId,
      exception_date: exceptionDate,
      is_working: isWorking ?? false,
      work_start: workStart,
      work_end: workEnd,
      lunch_start: lunchStart,
      lunch_end: lunchEnd,
      slot_duration: slotDuration,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка добавления исключения: ${error.message}`);
  }
  return data;
}

/**
 * Registers a doctor's absence (vacation, sick leave, planned absence)
 */
export async function addDoctorAbsence(doctorId, absenceData) {
  const { absenceType, reason, startDate, endDate, comment } = absenceData;

  if (!["planned", "emergency"].includes(absenceType)) {
    throw new Error("Неверный тип отсутствия. Разрешено: planned, emergency.");
  }

  const { data, error } = await supabase
    .from("doctor_absences")
    .insert({
      doctor_id: doctorId,
      absence_type: absenceType,
      reason,
      start_date: startDate,
      end_date: endDate,
      comment,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка сохранения отсутствия: ${error.message}`);
  }
  return data;
}

/**
 * Generates slots for a doctor on a specific date, filtering out lunches, absences, past slots, and booked appointments.
 */
export async function generateDoctorSlots(doctorId, dateString) {
  // 1. Check absences first
  const { data: absences, error: absErr } = await supabase
    .from("doctor_absences")
    .select("*")
    .eq("doctor_id", doctorId);

  if (absErr) throw new Error(absErr.message);

  const targetDate = new Date(dateString);
  const isAbsent = absences.some((abs) => {
    const start = new Date(abs.start_date);
    const end = new Date(abs.end_date);
    // set times to midnight for comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return targetDate >= start && targetDate <= end;
  });

  if (isAbsent) {
    return []; // Doctor is absent today
  }

  // 2. Check exceptions
  const { data: exception, error: excErr } = await supabase
    .from("schedule_exceptions")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("exception_date", dateString)
    .maybeSingle();

  if (excErr) throw new Error(excErr.message);

  let workStart, workEnd, lunchStart, lunchEnd, slotDuration, isWorking;

  if (exception) {
    if (!exception.is_working) {
      return []; // Exception marks day off
    }
    workStart = exception.work_start;
    workEnd = exception.work_end;
    lunchStart = exception.lunch_start;
    lunchEnd = exception.lunch_end;
    slotDuration = exception.slot_duration;
    isWorking = true;
  } else {
    // 3. Load standard schedule
    const { data: schedule, error: schErr } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", doctorId)
      .maybeSingle();

    if (schErr) throw new Error(schErr.message);
    if (!schedule) {
      return []; // No schedule configured
    }

    // Check if targetDate falls within workDays (0 = Sunday, 6 = Saturday in JS; but let's check schema: work_days is integer array)
    // In PostgreSQL, 1 = Monday, 7 = Sunday usually, but JS getDay() is 0 = Sunday, 1 = Monday.
    // Let's standardise: 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, 7 = Sun.
    let jsDay = targetDate.getDay(); // 0-6
    let targetDayNum = jsDay === 0 ? 7 : jsDay; // map Sunday to 7

    if (!schedule.work_days.includes(targetDayNum)) {
      return []; // Non-working day
    }

    workStart = schedule.work_start;
    workEnd = schedule.work_end;
    lunchStart = schedule.lunch_start;
    lunchEnd = schedule.lunch_end;
    slotDuration = schedule.slot_duration;
    isWorking = true;
  }

  // 4. Generate candidate time slots
  const slots = [];
  const startMinutes = parseTimeToMinutes(workStart);
  const endMinutes = parseTimeToMinutes(workEnd);
  const lunchStartMin = lunchStart ? parseTimeToMinutes(lunchStart) : -1;
  const lunchEndMin = lunchEnd ? parseTimeToMinutes(lunchEnd) : -1;

  // Current date/time checks (to exclude past slots)
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let min = startMinutes; min < endMinutes; min += slotDuration) {
    // Exclude lunch hours
    if (lunchStartMin !== -1 && min >= lunchStartMin && min < lunchEndMin) {
      continue;
    }

    // Exclude past hours if date is today
    if (dateString === todayStr && min <= currentMinutes) {
      continue;
    }

    slots.push(formatMinutesToTime(min));
  }

  // 5. Query active appointments for this doctor on this day
  const { data: appointments, error: appErr } = await supabase
    .from("appointments")
    .select("time")
    .eq("doctor_id", doctorId)
    .eq("date", dateString)
    .in("status", ["scheduled", "confirmed", "transfer_pending", "in_progress", "waiting_finish_confirmation", "completed"]);

  if (appErr) throw new Error(appErr.message);

  const bookedTimes = appointments.map((app) => app.time);

  // 6. Return slots mapping availability flag
  return slots.map((time) => {
    return {
      time,
      isAvailable: !bookedTimes.includes(time),
    };
  });
}

// Helpers
function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
