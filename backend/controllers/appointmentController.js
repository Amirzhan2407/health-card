import * as appointmentService from "../services/appointmentService.js";
import { supabase } from "../config/supabaseClient.js";

export async function bookAppointment(req, res, next) {
  try {
    const patientId = req.user.id;
    const { organizationId, doctorId, date, time, reason } = req.body;

    if (!organizationId || !doctorId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "organizationId, doctorId, date и time обязательны в теле запроса.",
      });
    }

    const appointment = await appointmentService.createAppointment(
      patientId,
      organizationId,
      doctorId,
      date,
      time,
      reason
    );

    return res.status(201).json({
      success: true,
      message: "Вы успешно записались на прием.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmPatientAppointment(req, res, next) {
  try {
    const { id } = req.params;
    const patientId = req.user.id;
    const appointment = await appointmentService.confirmAppointment(id, patientId);
    return res.status(200).json({
      success: true,
      message: "Запись приема подтверждена.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelAppointment(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    const appointment = await appointmentService.cancelAppointment(id, userId, role);
    return res.status(200).json({
      success: true,
      message: "Прием успешно отменен.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAppointments(req, res, next) {
  try {
    const user = req.user;
    const { date, status } = req.query;

    let query = supabase
      .from("appointments")
      .select(`
        id,
        date,
        time,
        reason,
        status,
        qr_token,
        profiles (
          id,
          full_name,
          iin,
          phone
        ),
        doctors (
          id,
          specialties (name_ru),
          organization_members (
            profiles (full_name)
          )
        ),
        organizations (name, city, address)
      `);

    // Role boundaries checks
    if (user.role === "patient") {
      query = query.eq("patient_id", user.id);
    } else if (user.role === "doctor") {
      query = query.eq("doctor_id", user.doctor_id);
    } else if (user.role === "organization_admin") {
      query = query.eq("organization_id", user.organization_id);
    } // support sees all

    if (date) {
      query = query.eq("date", date);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data: list, error } = await query.order("date", { ascending: true }).order("time", { ascending: true });
    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
}

export async function getAppointmentDetails(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user;

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select(`
        *,
        patient:profiles_new!patient_id (*),
        doctor:doctors_new!doctor_id (
          *,
          specialty:specialties_new (*),
          member:organization_members_new (
            profile:profiles_new (*)
          )
        ),
        organization:organizations_new (*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !appointment) {
      return res.status(404).json({ success: false, message: "Запись приема не найдена." });
    }

    // Security role bounds check
    if (user.role === "patient" && appointment.patient_id !== user.id) {
      return res.status(403).json({ success: false, message: "Доступ запрещен. Вы не являетесь владельцем записи." });
    }
    if (user.role === "doctor" && appointment.doctor_id !== user.doctor_id) {
      return res.status(403).json({ success: false, message: "Доступ запрещен. Вы не лечащий врач этого приема." });
    }
    if (user.role === "organization_admin" && appointment.organization_id !== user.organization_id) {
      return res.status(403).json({ success: false, message: "Доступ запрещен к приему другой клиники." });
    }

    return res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
}

export async function requestStartCode(req, res, next) {
  try {
    const { id } = req.params;
    const doctorId = req.user.doctor_id;

    // Verify doctor ownership
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("doctor_id")
      .eq("id", id)
      .single();

    if (error || appointment.doctor_id !== doctorId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен. Вы не лечащий врач." });
    }

    const code = await appointmentService.generateStartCode(id);
    return res.status(200).json({
      success: true,
      message: "Код начала приема успешно сгенерирован.",
      code, // return code for development/testing convenience
    });
  } catch (error) {
    next(error);
  }
}

export async function startAppointmentSession(req, res, next) {
  try {
    const { id } = req.params;
    const doctorId = req.user.doctor_id;
    const { code, qrToken } = req.body;

    const appointment = await appointmentService.startAppointment(id, doctorId, code, qrToken);
    return res.status(200).json({
      success: true,
      message: "Прием успешно начат.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function requestFinishCode(req, res, next) {
  try {
    const { id } = req.params;
    const doctorId = req.user.doctor_id;

    const result = await appointmentService.initiateFinishAppointment(id, doctorId);
    return res.status(200).json({
      success: true,
      message: result.message,
      code: result.code, // return code for development/testing convenience
    });
  } catch (error) {
    next(error);
  }
}

export async function finishAppointmentSession(req, res, next) {
  try {
    const { id } = req.params;
    const doctorId = req.user.doctor_id;
    const { code, complaints, symptoms, preliminaryDiagnosis, finalDiagnosis, treatment, recommendations, comment } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Не указан код подтверждения." });
    }

    const visitDetails = {
      complaints,
      symptoms,
      preliminaryDiagnosis,
      finalDiagnosis,
      treatment,
      recommendations,
      comment,
    };

    const result = await appointmentService.completeAppointment(id, doctorId, code, visitDetails);
    return res.status(200).json({
      success: true,
      message: "Прием успешно завершен, медицинская карта обновлена.",
      data: result.record,
    });
  } catch (error) {
    next(error);
  }
}

export async function setAppointmentNoShow(req, res, next) {
  try {
    const { id } = req.params;
    const doctorId = req.user.doctor_id;

    const appointment = await appointmentService.markNoShow(id, doctorId);
    return res.status(200).json({
      success: true,
      message: "Пациенту отмечен статус неявки.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

