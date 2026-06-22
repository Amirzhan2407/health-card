import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../config/supabaseClient.js";
import { generateDoctorSlots } from "./scheduleService.js";

// Helper to generate a random numeric code
function generateNumericCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

// Helper to hash code
function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export async function createAppointment(patientId, orgId, doctorId, date, time, reason) {
  // Check slot availability
  const slots = await generateDoctorSlots(doctorId, date);
  const slot = slots.find((s) => s.time === time);
  if (!slot || !slot.isAvailable) {
    throw new Error("Выбранный временной слот недоступен для записи.");
  }

  // Generate QR token
  const qrToken = uuidv4();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      organization_id: orgId,
      date,
      time,
      reason,
      status: "scheduled",
      qr_token: qrToken,
    })
    .select("*")
    .single();

  if (error) {
    // If DB double-booking constraint triggers
    if (error.code === "23505") {
      throw new Error("Этот временной слот уже забронирован другим пациентом.");
    }
    throw new Error(`Ошибка создания записи: ${error.message}`);
  }

  return appointment;
}

export async function confirmAppointment(id, patientId) {
  const { data: appointment, error: getErr } = await supabase
    .from("appointments")
    .select("id, status, patient_id")
    .eq("id", id)
    .single();

  if (getErr || !appointment) {
    throw new Error("Запись приема не найдена.");
  }

  if (appointment.patient_id !== patientId) {
    throw new Error("Вы можете подтверждать только собственные записи.");
  }

  if (appointment.status !== "scheduled") {
    throw new Error(`Невозможно подтвердить запись в статусе: ${appointment.status}`);
  }

  const { data: updated, error } = await supabase
    .from("appointments")
    .update({
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return updated;
}

export async function cancelAppointment(id, userId, role) {
  const { data: appointment, error: getErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();

  if (getErr || !appointment) {
    throw new Error("Запись приема не найдена.");
  }

  // Permission check
  if (role === "patient" && appointment.patient_id !== userId) {
    throw new Error("Доступ запрещен. Вы можете отменить только собственную запись.");
  }

  // Doctors and admins must match organization
  if (role === "doctor" || role === "organization_admin") {
    // Check doctor organization
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (!member || member.organization_id !== appointment.organization_id) {
      throw new Error("Доступ запрещен. Запись принадлежит другой организации.");
    }
  }

  const allowedToCancel = ["scheduled", "confirmed", "transfer_pending"];
  if (!allowedToCancel.includes(appointment.status)) {
    throw new Error(`Невозможно отменить прием в текущем статусе: ${appointment.status}`);
  }

  const newStatus = role === "patient" ? "cancelled_by_patient" : "cancelled_by_organization";

  const { data: updated, error } = await supabase
    .from("appointments")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return updated;
}

/**
 * Generate a 6-digit start code for patient check-in
 */
export async function generateStartCode(appointmentId) {
  const code = generateNumericCode(6);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Valid for 15 mins

  const { error } = await supabase
    .from("appointment_start_codes")
    .insert({
      appointment_id: appointmentId,
      code,
      expires_at: expiresAt.toISOString(),
    });

  if (error) throw new Error("Не удалось сгенерировать код начала приема.");
  return code;
}

/**
 * Doctor starts appointment by validating QR token or code
 */
export async function startAppointment(id, doctorId, code, qrToken) {
  const { data: appointment, error: getErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();

  if (getErr || !appointment) {
    throw new Error("Запись приема не найдена.");
  }

  if (appointment.doctor_id !== doctorId) {
    throw new Error("Доступ запрещен. Вы не являетесь лечащим врачом для этого приема.");
  }

  if (!["scheduled", "confirmed"].includes(appointment.status)) {
    throw new Error(`Прием не может быть начат в статусе: ${appointment.status}`);
  }

  // Validate either qr_token or code
  let isValid = false;

  if (qrToken) {
    if (appointment.qr_token === qrToken) {
      isValid = true;
    } else {
      throw new Error("Неверный QR-код пациента.");
    }
  } else if (code) {
    const { data: startCode, error } = await supabase
      .from("appointment_start_codes")
      .select("*")
      .eq("appointment_id", id)
      .eq("code", code)
      .eq("is_used", false)
      .maybeSingle();

    if (error || !startCode) {
      throw new Error("Неверный код начала приема.");
    }

    if (new Date(startCode.expires_at) < new Date()) {
      throw new Error("Срок действия кода начала приема истек.");
    }

    // Mark code as used
    await supabase
      .from("appointment_start_codes")
      .update({ is_used: true })
      .eq("id", startCode.id);

    isValid = true;
  } else {
    throw new Error("Не предоставлен код подтверждения или QR-токен.");
  }

  if (isValid) {
    const { data: updated, error } = await supabase
      .from("appointments")
      .update({
        status: "in_progress",
        actual_start_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return updated;
  }
}

/**
 * Transition appointment to waiting_finish_confirmation and generate finish code for patient
 */
export async function initiateFinishAppointment(id, doctorId) {
  const { data: appointment, error: getErr } = await supabase
    .from("appointments")
    .select("status, doctor_id")
    .eq("id", id)
    .single();

  if (getErr || !appointment) {
    throw new Error("Запись приема не найдена.");
  }

  if (appointment.doctor_id !== doctorId) {
    throw new Error("Доступ запрещен. Вы не являетесь лечащим врачом.");
  }

  if (appointment.status !== "in_progress") {
    throw new Error("Завершение приема можно инициировать только в статусе: в процессе.");
  }

  // Transition status
  await supabase
    .from("appointments")
    .update({
      status: "waiting_finish_confirmation",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Generate 4-digit code and hash it
  const code = generateNumericCode(4);
  const codeHash = hashCode(code);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Valid for 10 mins

  const { error } = await supabase
    .from("appointment_finish_codes")
    .insert({
      appointment_id: id,
      code_hash: codeHash,
      expires_at: expiresAt.toISOString(),
    });

  if (error) throw new Error("Не удалось сгенерировать код завершения приема.");

  // In production, this code is sent to the patient. For local/development, we log it or return it in development mode.
  console.log(`[FINISH CODE GENERATED] Appointment: ${id}, Code: ${code}`);

  return { success: true, message: "Код подтверждения отправлен пациенту.", code }; // Return code for test/dev convenience
}

/**
 * Complete the appointment by validating the finish code and saving visit record notes
 */
export async function completeAppointment(id, doctorId, code, visitDetails) {
  const { data: appointment, error: getErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();

  if (getErr || !appointment) {
    throw new Error("Запись приема не найдена.");
  }

  if (appointment.doctor_id !== doctorId) {
    throw new Error("Доступ запрещен.");
  }

  if (appointment.status !== "waiting_finish_confirmation") {
    throw new Error("Для завершения приема статус должен быть: ожидает подтверждения завершения.");
  }

  // Validate finish code
  const codeHash = hashCode(code);
  const { data: finishCode, error } = await supabase
    .from("appointment_finish_codes")
    .select("*")
    .eq("appointment_id", id)
    .eq("code_hash", codeHash)
    .eq("is_used", false)
    .maybeSingle();

  if (error || !finishCode) {
    // CRITICAL constraint: status remains 'waiting_finish_confirmation' on mismatch
    throw new Error("Неверный код завершения приема. Прием остается в статусе ожидания подтверждения.");
  }

  if (new Date(finishCode.expires_at) < new Date()) {
    throw new Error("Срок действия кода завершения приема истек.");
  }

  // Mark code as used
  await supabase
    .from("appointment_finish_codes")
    .update({ is_used: true })
    .eq("id", finishCode.id);

  // Complete appointment status
  const endTime = new Date().toISOString();
  await supabase
    .from("appointments")
    .update({
      status: "completed",
      actual_end_time: endTime,
      updated_at: endTime,
    })
    .eq("id", id);

  // Save visit records notes
  const { complaints, symptoms, preliminaryDiagnosis, finalDiagnosis, treatment, recommendations, comment } = visitDetails;

  const { data: record, error: recordErr } = await supabase
    .from("visit_records")
    .insert({
      appointment_id: id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      organization_id: appointment.organization_id,
      complaints,
      symptoms,
      preliminary_diagnosis: preliminaryDiagnosis,
      final_diagnosis: finalDiagnosis,
      treatment,
      recommendations,
      comment,
      actual_start_time: appointment.actual_start_time,
      actual_end_time: endTime,
    })
    .select("*")
    .single();

  if (recordErr) {
    throw new Error(`Прием завершен, но не удалось сохранить медицинскую запись: ${recordErr.message}`);
  }

  return { success: true, record };
}

export async function markNoShow(id, doctorId) {
  const { data: appointment, error: getErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();

  if (getErr || !appointment) {
    throw new Error("Запись приема не найдена.");
  }

  if (appointment.doctor_id !== doctorId) {
    throw new Error("Доступ запрещен. Вы не являетесь лечащим врачом.");
  }

  if (!["scheduled", "confirmed"].includes(appointment.status)) {
    throw new Error(`Невозможно отметить неявку для приема в статусе: ${appointment.status}`);
  }

  // Verify time: scheduled date + time + 10 minutes
  const [hours, minutes] = appointment.time.split(":").map(Number);
  const scheduledStart = new Date(appointment.date);
  scheduledStart.setHours(hours, minutes, 0, 0);

  const tenMinutesLater = new Date(scheduledStart.getTime() + 10 * 60 * 1000);
  const now = new Date();

  if (now < tenMinutesLater) {
    const diffMs = tenMinutesLater - now;
    const diffMins = Math.ceil(diffMs / (60 * 1000));
    throw new Error(`Отметить неявку можно только через 10 минут после начала приема (осталось ${diffMins} мин).`);
  }

  // Update status to no_show
  const { data: updated, error } = await supabase
    .from("appointments")
    .update({
      status: "no_show",
      updated_at: now.toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  // Trigger notification to patient
  try {
    await supabase
      .from("notifications")
      .insert({
        profile_id: appointment.patient_id,
        title: "Неявка на прием",
        message: `Зарегистрирована неявка на ваш прием от ${appointment.date} в ${appointment.time}.`,
        link: `/patient/appointments`,
      });
  } catch (notifErr) {
    console.error("Не удалось отправить уведомление о неявке:", notifErr.message);
  }

  return updated;
}

