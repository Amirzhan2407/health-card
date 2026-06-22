import { supabase } from "../config/supabaseClient.js";

export async function getMedicalCard(req, res, next) {
  try {
    const user = req.user;
    let targetPatientId = req.params.patientId || req.query.patientId;
    const { iin } = req.query;

    // 1. Role checks
    if (user.role === "support" || user.role === "organization_admin") {
      return res.status(403).json({
        success: false,
        message: "Доступ запрещен. Административные роли не имеют доступа к медицинским картам.",
      });
    }

    let patientProfile = null;

    if (user.role === "patient") {
      // Patients can only view their own card
      targetPatientId = user.id;
    }

    // 2. Fetch patient profile
    let query = supabase.from("profiles").select("id, iin, full_name, birth_date, gender, phone, email, status").eq("role", "patient");
    if (targetPatientId) {
      query = query.eq("id", targetPatientId);
    } else if (iin) {
      query = query.eq("iin", iin);
    } else {
      return res.status(400).json({ success: false, message: "Не указан patientId или ИИН пациента." });
    }

    const { data: profile, error: profErr } = await query.maybeSingle();
    if (profErr || !profile) {
      return res.status(404).json({ success: false, message: "Профиль пациента не найден." });
    }

    patientProfile = profile;
    const patientId = patientProfile.id;

    // 3. If doctor is requesting, check organization boundaries
    if (user.role === "doctor") {
      // Doctor can read if patient has ever booked an appointment in their organization
      const { data: appt, error: apptErr } = await supabase
        .from("appointments")
        .select("id")
        .eq("patient_id", patientId)
        .eq("organization_id", user.organization_id)
        .limit(1)
        .maybeSingle();

      if (apptErr || !appt) {
        return res.status(403).json({
          success: false,
          message: "Доступ запрещен. Пациент не имеет записей на прием в вашей клинике.",
        });
      }
    }

    // 4. Fetch health metrics
    const { data: metrics } = await supabase
      .from("health_metrics")
      .select("*")
      .eq("patient_id", patientId)
      .order("measured_at", { ascending: false });

    // 5. Fetch visit records (with documents)
    const { data: visits } = await supabase
      .from("visit_records")
      .select(`
        *,
        doctor:doctors (
          id,
          specialties (name_ru),
          organization_members (
            profiles (full_name)
          )
        ),
        organization:organizations (name),
        visit_documents (*)
      `)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    // 6. Fetch certificates
    const { data: certs } = await supabase
      .from("medical_certificates")
      .select(`
        *,
        doctor:doctors (
          id,
          specialties (name_ru),
          organization_members (
            profiles (full_name)
          )
        ),
        organization:organizations (name)
      `)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    // 7. Return assembled card
    return res.status(200).json({
      success: true,
      data: {
        profile: patientProfile,
        metrics: metrics || [],
        visits: visits || [],
        certificates: certs || [],
      },
    });
  } catch (error) {
    next(error);
  }
}
