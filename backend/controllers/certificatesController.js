import { supabase } from "../config/supabaseClient.js";

export async function getCertificates(req, res, next) {
  try {
    const user = req.user;
    const { patientId } = req.query;

    let query = supabase
      .from("medical_certificates")
      .select(`
        *,
        patient:profiles (id, full_name, iin),
        doctor:doctors (
          id,
          specialties (name_ru),
          organization_members (
            profiles (full_name)
          )
        ),
        organization:organizations (name)
      `);

    if (user.role === "patient") {
      query = query.eq("patient_id", user.id);
    } else if (user.role === "doctor") {
      if (patientId) {
        query = query.eq("patient_id", patientId).eq("organization_id", user.organization_id);
      } else {
        query = query.eq("organization_id", user.organization_id);
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Доступ запрещен. У вашей роли нет прав на чтение медицинских сертификатов.",
      });
    }

    const { data: certs, error } = await query.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true, data: certs });
  } catch (error) {
    next(error);
  }
}

export async function createCertificate(req, res, next) {
  try {
    const doctorId = req.user.doctor_id;
    const orgId = req.user.organization_id;
    const { patientId, title, certificateType, fileUrl, validUntil } = req.body;

    if (!patientId || !title || !certificateType || !fileUrl) {
      return res.status(400).json({
        success: false,
        message: "patientId, title, certificateType и fileUrl обязательны.",
      });
    }

    const { data: cert, error } = await supabase
      .from("medical_certificates")
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        organization_id: orgId,
        title,
        certificate_type: certificateType,
        file_url: fileUrl,
        valid_until: validUntil || null,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return res.status(201).json({
      success: true,
      message: "Медицинская справка/сертификат успешно выдан.",
      data: cert,
    });
  } catch (error) {
    next(error);
  }
}
