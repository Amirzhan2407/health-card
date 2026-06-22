import { supabase } from "../config/supabaseClient.js";

// Helper to calculate BMI if height and weight metrics are present
async function autoCalculateBMI(patientId) {
  try {
    // Get latest height
    const { data: heightData } = await supabase
      .from("health_metrics")
      .select("value")
      .eq("patient_id", patientId)
      .eq("metric_type", "height")
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get latest weight
    const { data: weightData } = await supabase
      .from("health_metrics")
      .select("value")
      .eq("patient_id", patientId)
      .eq("metric_type", "weight")
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (heightData && weightData) {
      const heightInMeters = Number(heightData.value) / 100;
      const weight = Number(weightData.value);
      if (heightInMeters > 0) {
        const bmi = Number((weight / (heightInMeters * heightInMeters)).toFixed(2));
        
        // Insert BMI metric
        await supabase
          .from("health_metrics")
          .insert({
            patient_id: patientId,
            metric_type: "bmi",
            value: bmi,
            unit: "kg/m2",
          });
      }
    }
  } catch (error) {
    console.error("Error auto calculating BMI:", error.message);
  }
}

export async function getMetrics(req, res, next) {
  try {
    const user = req.user;
    const { patientId, metricType } = req.query;

    let query = supabase.from("health_metrics").select("*");

    if (user.role === "patient") {
      query = query.eq("patient_id", user.id);
    } else if (user.role === "doctor") {
      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: "Необходимо указать patientId.",
        });
      }
      query = query.eq("patient_id", patientId);
    } else {
      return res.status(403).json({
        success: false,
        message: "Доступ запрещен. У вашей роли нет доступа к показателям здоровья.",
      });
    }

    if (metricType) {
      query = query.eq("metric_type", metricType);
    }

    const { data: metrics, error } = await query.order("measured_at", { ascending: false });
    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
}

export async function addMetric(req, res, next) {
  try {
    const user = req.user;
    let { patientId, metricType, value, unit, measuredAt } = req.body;

    // Default to self if patient
    if (user.role === "patient") {
      patientId = user.id;
    } else if (user.role === "doctor") {
      if (!patientId) {
        return res.status(400).json({ success: false, message: "patientId обязателен." });
      }
    } else {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }

    if (!metricType || value === undefined) {
      return res.status(400).json({
        success: false,
        message: "metricType и value обязательны в теле запроса.",
      });
    }

    const { data: metric, error } = await supabase
      .from("health_metrics")
      .insert({
        patient_id: patientId,
        metric_type: metricType,
        value: Number(value),
        unit: unit || null,
        measured_at: measuredAt || new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    // If height or weight, recalculate BMI
    if (metricType === "height" || metricType === "weight") {
      await autoCalculateBMI(patientId);
    }

    return res.status(201).json({
      success: true,
      message: "Показатель здоровья успешно сохранен.",
      data: metric,
    });
  } catch (error) {
    next(error);
  }
}
