import * as transferService from "../services/transferService.js";
import { supabase } from "../config/supabaseClient.js";

export async function proposeAppointmentTransfer(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { appointmentId, newDoctorId, newDate, newTime, reason } = req.body;

    if (!appointmentId || !newDoctorId || !newDate || !newTime) {
      return res.status(400).json({
        success: false,
        message: "appointmentId, newDoctorId, newDate и newTime обязательны.",
      });
    }

    const transfer = await transferService.proposeTransfer(
      appointmentId,
      orgId,
      newDoctorId,
      newDate,
      newTime,
      reason
    );

    return res.status(201).json({
      success: true,
      message: "Предложение переноса приема успешно отправлено пациенту.",
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
}

export async function acceptAppointmentTransfer(req, res, next) {
  try {
    const { id } = req.params;
    const patientId = req.user.id;

    const appointment = await transferService.acceptTransfer(id, patientId);
    return res.status(200).json({
      success: true,
      message: "Перенос приема успешно подтвержден.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function declineAppointmentTransfer(req, res, next) {
  try {
    const { id } = req.params;
    const patientId = req.user.id;

    const appointment = await transferService.declineTransfer(id, patientId);
    return res.status(200).json({
      success: true,
      message: "Перенос приема отклонен. Запись восстановлена в исходном виде.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTransfers(req, res, next) {
  try {
    const user = req.user;
    let query = supabase
      .from("appointment_transfers")
      .select(`
        *,
        appointment:appointments (
          patient_id,
          reason,
          patient:profiles (full_name)
        ),
        previous_doctor:doctors!previous_doctor_id (
          organization_members (profiles (full_name))
        ),
        new_doctor:doctors!new_doctor_id (
          organization_members (profiles (full_name))
        )
      `);

    if (user.role === "patient") {
      query = query.eq("appointment.patient_id", user.id);
    } else if (user.role === "organization_admin") {
      query = query.eq("appointment.organization_id", user.organization_id);
    } else if (user.role === "doctor") {
      query = query.or(`previous_doctor_id.eq.${user.doctor_id},new_doctor_id.eq.${user.doctor_id}`);
    } else {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }

    const { data: list, error } = await query;
    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
}
