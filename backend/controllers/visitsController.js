import { supabase } from "../config/supabaseClient.js";

export async function getVisits(req, res, next) {
  try {
    const user = req.user;
    const { patientId } = req.query;

    let query = supabase
      .from("visit_records")
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
        // Doctor views a specific patient's visits, must check organization boundaries
        // Verify patient belongs to doctor's organization appointments
        const { data: appointmentCount } = await supabase
          .from("appointments")
          .select("id")
          .eq("patient_id", patientId)
          .eq("organization_id", user.organization_id)
          .limit(1);

        if (!appointmentCount || appointmentCount.length === 0) {
          return res.status(403).json({
            success: false,
            message: "Доступ запрещен. Этот пациент не обслуживался в вашей организации.",
          });
        }
        query = query.eq("patient_id", patientId);
      } else {
        query = query.eq("doctor_id", user.doctor_id);
      }
    } else {
      // Org admin & Support cannot read medical visit history
      return res.status(403).json({
        success: false,
        message: "Доступ запрещен. У вашей роли нет прав на чтение медицинских данных.",
      });
    }

    const { data: visits, error } = await query.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true, data: visits });
  } catch (error) {
    next(error);
  }
}

export async function getVisitDetails(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user;

    const { data: visit, error } = await supabase
      .from("visit_records")
      .select(`
        *,
        patient:profiles (id, full_name, iin, gender, birth_date),
        doctor:doctors (
          id,
          specialties (name_ru),
          organization_members (
            profiles (full_name)
          )
        ),
        organization:organizations (name, city, address),
        visit_documents (*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !visit) {
      return res.status(404).json({ success: false, message: "Запись приема не найдена." });
    }

    // Role check
    if (user.role === "patient" && visit.patient_id !== user.id) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }
    if (user.role === "doctor" && visit.organization_id !== user.organization_id) {
      return res.status(403).json({ success: false, message: "Доступ запрещен. Пациент другой клиники." });
    }
    if (user.role === "support" || user.role === "organization_admin") {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }

    return res.status(200).json({ success: true, data: visit });
  } catch (error) {
    next(error);
  }
}

export async function updateVisit(req, res, next) {
  try {
    const { id } = req.params;
    const doctorId = req.user.doctor_id;
    const { complaints, symptoms, preliminaryDiagnosis, finalDiagnosis, treatment, recommendations, comment } = req.body;

    // Verify doctor ownership
    const { data: visit, error: getErr } = await supabase
      .from("visit_records")
      .select("doctor_id")
      .eq("id", id)
      .single();

    if (getErr || visit.doctor_id !== doctorId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен. Вы не являетесь лечащим врачом." });
    }

    const { data: updated, error } = await supabase
      .from("visit_records")
      .update({
        complaints,
        symptoms,
        preliminary_diagnosis: preliminaryDiagnosis,
        final_diagnosis: finalDiagnosis,
        treatment,
        recommendations,
        comment,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return res.status(200).json({
      success: true,
      message: "Запись приема успешно обновлена.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
