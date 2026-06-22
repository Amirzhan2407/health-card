import { supabase } from "../config/supabaseClient.js";
import { generateDoctorSlots } from "./scheduleService.js";

export async function proposeTransfer(appointmentId, orgId, newDoctorId, newDate, newTime, reason) {
  // 1. Fetch appointment details
  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();

  if (apptErr || !appt) {
    throw new Error("Запись приема не найдена.");
  }

  if (appt.organization_id !== orgId) {
    throw new Error("Доступ запрещен. Запись относится к другой организации.");
  }

  if (!["scheduled", "confirmed"].includes(appt.status)) {
    throw new Error(`Невозможно перенести прием в статусе: ${appt.status}`);
  }

  // 2. Validate new slot is available
  const slots = await generateDoctorSlots(newDoctorId, newDate);
  const slot = slots.find((s) => s.time === newTime);
  if (!slot || !slot.isAvailable) {
    throw new Error("Предлагаемый слот недоступен для записи у нового врача.");
  }

  // 3. Create transfer record
  const { data: transfer, error: transferErr } = await supabase
    .from("appointment_transfers")
    .insert({
      appointment_id: appointmentId,
      previous_doctor_id: appt.doctor_id,
      new_doctor_id: newDoctorId,
      previous_date: appt.date,
      previous_time: appt.time,
      new_date: newDate,
      new_time: newTime,
      transfer_reason: reason,
      status: "pending",
    })
    .select("*")
    .single();

  if (transferErr) throw new Error(transferErr.message);

  // 4. Update appointment status to transfer_pending
  await supabase
    .from("appointments")
    .update({ status: "transfer_pending" })
    .eq("id", appointmentId);

  // 5. Send notification to patient
  try {
    await supabase
      .from("notifications")
      .insert({
        profile_id: appt.patient_id,
        title: "Предложение переноса приема",
        message: `Вам предложен перенос приема от клиники на новую дату: ${newDate} в ${newTime}. Пожалуйста, подтвердите перенос в кабинете.`,
        link: `/patient/appointments`,
      });
  } catch (notifErr) {
    console.error("Не удалось отправить уведомление о переносе:", notifErr.message);
  }

  return transfer;
}

export async function acceptTransfer(transferId, patientId) {
  // 1. Fetch transfer details
  const { data: transfer, error: getErr } = await supabase
    .from("appointment_transfers")
    .select(`
      *,
      appointment:appointments (*)
    `)
    .eq("id", transferId)
    .single();

  if (getErr || !transfer) {
    throw new Error("Запись предложения переноса не найдена.");
  }

  if (transfer.appointment.patient_id !== patientId) {
    throw new Error("Доступ запрещен. Вы можете принимать только свои переносы.");
  }

  if (transfer.status !== "pending") {
    throw new Error("Предложение переноса уже обработано.");
  }

  // 2. Validate new slot is still available (concurrency protection)
  const slots = await generateDoctorSlots(transfer.new_doctor_id, transfer.new_date);
  const slot = slots.find((s) => s.time === transfer.new_time);
  if (!slot || !slot.isAvailable) {
    // If unavailable, auto decline and revert appointment status
    await supabase
      .from("appointment_transfers")
      .update({ status: "declined" })
      .eq("id", transferId);

    await supabase
      .from("appointments")
      .update({ status: "confirmed" }) // Revert status
      .eq("id", transfer.appointment_id);

    throw new Error("Выбранный временной слот уже занят. Перенос отклонен.");
  }

  // 3. Update transfer status
  await supabase
    .from("appointment_transfers")
    .update({ status: "confirmed" })
    .eq("id", transferId);

  // 4. Update appointment details (status transitions to transferred then we set confirmed)
  // Transition check: status transitions to transferred upon patient confirmation before updating details.
  const { data: updatedAppt, error: updateErr } = await supabase
    .from("appointments")
    .update({
      status: "transferred", // Stage 13 specific transition status
      doctor_id: transfer.new_doctor_id,
      date: transfer.new_date,
      time: transfer.new_time,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transfer.appointment_id)
    .select("*")
    .single();

  if (updateErr) throw new Error(updateErr.message);

  // Re-confirm appointment under new doctor
  await supabase
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", transfer.appointment_id);

  return updatedAppt;
}

export async function declineTransfer(transferId, patientId) {
  const { data: transfer, error: getErr } = await supabase
    .from("appointment_transfers")
    .select(`
      *,
      appointment:appointments (*)
    `)
    .eq("id", transferId)
    .single();

  if (getErr || !transfer) {
    throw new Error("Предложение переноса не найдено.");
  }

  if (transfer.appointment.patient_id !== patientId) {
    throw new Error("Доступ запрещен.");
  }

  if (transfer.status !== "pending") {
    throw new Error("Предложение переноса уже обработано.");
  }

  // Update transfer to declined
  await supabase
    .from("appointment_transfers")
    .update({ status: "declined" })
    .eq("id", transferId);

  // Revert appointment to confirmed/scheduled
  const { data: updatedAppt } = await supabase
    .from("appointments")
    .update({
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", transfer.appointment_id)
    .select("*")
    .single();

  return updatedAppt;
}
