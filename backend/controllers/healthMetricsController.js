
import { supabase } from "../config/supabaseClient.js";

const ACTIVE_APPOINTMENT_STATUSES = [
  "in_progress",
  "waiting_finish_confirmation",
];

const METRIC_CONFIG = {
  weight: {
    unit: "кг",
    min: 2,
    max: 500,
  },

  height: {
    unit: "см",
    min: 30,
    max: 280,
  },

  bmi: {
    unit: "кг/м²",
    min: 5,
    max: 100,
  },

  pulse: {
    unit: "уд/мин",
    min: 20,
    max: 300,
  },

  blood_sugar: {
    unit: "ммоль/л",
    min: 1,
    max: 50,
  },

  hemoglobin: {
    unit: "г/л",
    min: 20,
    max: 250,
  },

  systolic_pressure: {
    unit: "мм рт. ст.",
    min: 50,
    max: 300,
  },

  diastolic_pressure: {
    unit: "мм рт. ст.",
    min: 20,
    max: 200,
  },

  /*
   * Поддержка старых названий,
   * если они уже использовались в базе.
   */
  blood_pressure_systolic: {
    unit: "мм рт. ст.",
    min: 50,
    max: 300,
  },

  blood_pressure_diastolic: {
    unit: "мм рт. ст.",
    min: 20,
    max: 200,
  },

  temperature: {
    unit: "°C",
    min: 30,
    max: 45,
  },

  oxygen_saturation: {
    unit: "%",
    min: 40,
    max: 100,
  },

  vision_left: {
    unit: "",
    min: 0,
    max: 2,
  },

  vision_right: {
    unit: "",
    min: 0,
    max: 2,
  },
};

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeMetricType(metricType) {
  const type = clean(metricType);

  const aliases = {
    blood_pressure_systolic:
      "systolic_pressure",

    blood_pressure_diastolic:
      "diastolic_pressure",
  };

  return aliases[type] || type;
}

function createControllerError(
  message,
  statusCode = 500
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeNumber(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number = Number(
    String(value)
      .trim()
      .replace(",", ".")
  );

  return Number.isFinite(number)
    ? number
    : null;
}

function normalizeMeasuredAt(value) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createControllerError(
      "Некорректная дата измерения.",
      400
    );
  }

  const maximumFutureTime =
    Date.now() + 5 * 60 * 1000;

  if (
    date.getTime() >
    maximumFutureTime
  ) {
    throw createControllerError(
      "Дата измерения не может находиться в будущем.",
      400
    );
  }

  return date.toISOString();
}

function validateMetricValue(
  metricType,
  value
) {
  const normalizedType =
    normalizeMetricType(metricType);

  const config =
    METRIC_CONFIG[normalizedType];

  if (!config) {
    throw createControllerError(
      `Неподдерживаемый тип показателя: ${metricType}.`,
      400
    );
  }

  const normalizedValue =
    normalizeNumber(value);

  if (normalizedValue === null) {
    throw createControllerError(
      "Введите корректное числовое значение.",
      400
    );
  }

  if (
    normalizedValue < config.min ||
    normalizedValue > config.max
  ) {
    throw createControllerError(
      `Значение показателя выходит за допустимый диапазон: ${config.min}–${config.max} ${config.unit}.`,
      400
    );
  }

  return normalizedValue;
}

async function verifyDoctorTemporaryAccess({
  user,
  patientId,
  appointmentId,
}) {
  if (!user?.doctor_id) {
    throw createControllerError(
      "Не удалось определить профиль врача.",
      403
    );
  }

  if (!appointmentId) {
    throw createControllerError(
      "Для доступа врача необходимо указать appointmentId.",
      400
    );
  }

  const {
    data: appointment,
    error,
  } = await supabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      doctor_id,
      organization_id,
      status
    `)
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) {
    throw createControllerError(
      `Ошибка проверки записи: ${error.message}`
    );
  }

  if (!appointment) {
    throw createControllerError(
      "Запись на приём не найдена.",
      404
    );
  }

  if (
    String(appointment.doctor_id) !==
    String(user.doctor_id)
  ) {
    throw createControllerError(
      "Запись принадлежит другому врачу.",
      403
    );
  }

  if (
    String(appointment.patient_id) !==
    String(patientId)
  ) {
    throw createControllerError(
      "Запись принадлежит другому пациенту.",
      403
    );
  }

  if (
    user.organization_id &&
    String(
      appointment.organization_id
    ) !==
      String(user.organization_id)
  ) {
    throw createControllerError(
      "Запись принадлежит другой организации.",
      403
    );
  }

  if (
    !ACTIVE_APPOINTMENT_STATUSES.includes(
      appointment.status
    )
  ) {
    throw createControllerError(
      "Доступ врача к показателям разрешён только во время активного приёма.",
      403
    );
  }

  return appointment;
}

async function resolvePatientAccess({
  user,
  requestedPatientId,
  appointmentId,
}) {
  if (!user) {
    throw createControllerError(
      "Пользователь не авторизован.",
      401
    );
  }

  if (user.role === "patient") {
    return user.id;
  }

  if (user.role === "doctor") {
    const patientId = clean(
      requestedPatientId
    );

    if (!patientId) {
      throw createControllerError(
        "Для врача необходимо указать patientId.",
        400
      );
    }

    await verifyDoctorTemporaryAccess({
      user,
      patientId,
      appointmentId,
    });

    return patientId;
  }

  throw createControllerError(
    "У вашей роли нет доступа к показателям здоровья.",
    403
  );
}

async function getLatestMetric(
  patientId,
  metricType
) {
  const { data, error } =
    await supabase
      .from("health_metrics")
      .select(`
        id,
        value,
        measured_at
      `)
      .eq("patient_id", patientId)
      .eq("metric_type", metricType)
      .order("measured_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    throw createControllerError(
      `Ошибка получения последнего показателя: ${error.message}`
    );
  }

  return data || null;
}

async function autoCalculateBMI(
  patientId,
  measuredAt
) {
  try {
    const [
      heightMetric,
      weightMetric,
    ] = await Promise.all([
      getLatestMetric(
        patientId,
        "height"
      ),

      getLatestMetric(
        patientId,
        "weight"
      ),
    ]);

    if (
      !heightMetric ||
      !weightMetric
    ) {
      return null;
    }

    const heightInMeters =
      Number(heightMetric.value) / 100;

    const weight =
      Number(weightMetric.value);

    if (
      !Number.isFinite(
        heightInMeters
      ) ||
      !Number.isFinite(weight) ||
      heightInMeters <= 0 ||
      weight <= 0
    ) {
      return null;
    }

    const bmi = Number(
      (
        weight /
        (heightInMeters *
          heightInMeters)
      ).toFixed(2)
    );

    if (
      bmi <
        METRIC_CONFIG.bmi.min ||
      bmi >
        METRIC_CONFIG.bmi.max
    ) {
      return null;
    }

    const {
      data,
      error,
    } = await supabase
      .from("health_metrics")
      .insert({
        patient_id: patientId,
        metric_type: "bmi",
        value: bmi,
        unit:
          METRIC_CONFIG.bmi.unit,
        measured_at:
          measuredAt ||
          new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error(
        "[BMI CALCULATION ERROR]",
        error.message
      );

      return null;
    }

    return data;
  } catch (error) {
    console.error(
      "[BMI CALCULATION ERROR]",
      error?.message || error
    );

    return null;
  }
}

export async function getMetrics(
  req,
  res,
  next
) {
  try {
    const {
      patientId,
      metricType,
      appointmentId,
      limit,
    } = req.query;

    const resolvedPatientId =
      await resolvePatientAccess({
        user: req.user,
        requestedPatientId:
          patientId,
        appointmentId,
      });

    let query = supabase
      .from("health_metrics")
      .select("*")
      .eq(
        "patient_id",
        resolvedPatientId
      );

    if (
      metricType ===
      "blood_pressure"
    ) {
      query = query.in(
        "metric_type",
        [
          "systolic_pressure",
          "diastolic_pressure",
          "blood_pressure_systolic",
          "blood_pressure_diastolic",
        ]
      );
    } else if (metricType) {
      const normalizedType =
        normalizeMetricType(
          metricType
        );

      if (
        !METRIC_CONFIG[
          normalizedType
        ]
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Указан неизвестный тип показателя.",
        });
      }

      query = query.eq(
        "metric_type",
        normalizedType
      );
    }

    query = query.order(
      "measured_at",
      {
        ascending: false,
      }
    );

    const normalizedLimit =
      Number(limit);

    if (
      Number.isInteger(
        normalizedLimit
      ) &&
      normalizedLimit > 0
    ) {
      query = query.limit(
        Math.min(
          normalizedLimit,
          500
        )
      );
    }

    const {
      data: metrics,
      error,
    } = await query;

    if (error) {
      throw createControllerError(
        `Ошибка получения показателей: ${error.message}`
      );
    }

    return res.status(200).json({
      success: true,
      data: metrics || [],
    });
  } catch (error) {
    next(error);
  }
}

export async function addMetric(
  req,
  res,
  next
) {
  try {
    const body = req.body || {};

    const {
      patientId,
      appointmentId,
      metricType,
      value,
      systolic,
      diastolic,
      measuredAt,
    } = body;

    const resolvedPatientId =
      await resolvePatientAccess({
        user: req.user,
        requestedPatientId:
          patientId,
        appointmentId,
      });

    const receivedType =
      clean(metricType);

    if (!receivedType) {
      return res.status(400).json({
        success: false,
        message:
          "metricType обязателен.",
      });
    }

    const normalizedType =
      normalizeMetricType(
        receivedType
      );

    const normalizedMeasuredAt =
      normalizeMeasuredAt(
        measuredAt
      );

    /*
     * Поддержка одного общего запроса:
     * metricType: "blood_pressure",
     * systolic: 120,
     * diastolic: 80.
     */
    if (
      normalizedType ===
      "blood_pressure"
    ) {
      const systolicValue =
        validateMetricValue(
          "systolic_pressure",
          systolic
        );

      const diastolicValue =
        validateMetricValue(
          "diastolic_pressure",
          diastolic
        );

      if (
        systolicValue <=
        diastolicValue
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Верхнее давление должно быть больше нижнего.",
        });
      }

      const {
        data,
        error,
      } = await supabase
        .from("health_metrics")
        .insert([
          {
            patient_id:
              resolvedPatientId,

            metric_type:
              "systolic_pressure",

            value:
              systolicValue,

            unit:
              METRIC_CONFIG
                .systolic_pressure
                .unit,

            measured_at:
              normalizedMeasuredAt,
          },

          {
            patient_id:
              resolvedPatientId,

            metric_type:
              "diastolic_pressure",

            value:
              diastolicValue,

            unit:
              METRIC_CONFIG
                .diastolic_pressure
                .unit,

            measured_at:
              normalizedMeasuredAt,
          },
        ])
        .select("*");

      if (error) {
        throw createControllerError(
          `Ошибка сохранения давления: ${error.message}`
        );
      }

      return res.status(201).json({
        success: true,
        message:
          "Артериальное давление успешно сохранено.",
        data: data || [],
      });
    }

    if (
      normalizedType === "bmi"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ИМТ рассчитывается автоматически после добавления роста и веса.",
      });
    }

    const normalizedValue =
      validateMetricValue(
        normalizedType,
        value
      );

    const config =
      METRIC_CONFIG[
        normalizedType
      ];

    const {
      data: metric,
      error,
    } = await supabase
      .from("health_metrics")
      .insert({
        patient_id:
          resolvedPatientId,

        metric_type:
          normalizedType,

        value:
          normalizedValue,

        unit:
          config.unit || null,

        measured_at:
          normalizedMeasuredAt,
      })
      .select("*")
      .single();

    if (error) {
      throw createControllerError(
        `Ошибка сохранения показателя: ${error.message}`
      );
    }

    let bmiMetric = null;

    if (
      normalizedType === "height" ||
      normalizedType === "weight"
    ) {
      bmiMetric =
        await autoCalculateBMI(
          resolvedPatientId,
          normalizedMeasuredAt
        );
    }

    return res.status(201).json({
      success: true,

      message:
        bmiMetric
          ? "Показатель сохранён. Индекс массы тела пересчитан автоматически."
          : "Показатель здоровья успешно сохранён.",

      data: {
        metric,
        bmi: bmiMetric,
      },
    });
  } catch (error) {
    next(error);
  }
}
