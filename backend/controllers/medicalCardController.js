
import { supabase } from "../config/supabaseClient.js";

console.log("[Clinic OS] medicalCardController загружен");

const EDITABLE_APPOINTMENT_STATUSES = [
  "in_progress",
  "waiting_finish_confirmation",
];

const UPCOMING_APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
];

const HISTORICAL_APPOINTMENT_STATUSES = [
  "completed",
];

const MEDICAL_CARD_VIEW_WINDOW_MINUTES = 20;

const DOCTOR_MEDICAL_PROFILE_FIELDS = [
  "blood_type",
  "rh_factor",
  "allergies",
  "chronic_conditions",
  "surgeries",
  "contraindications",
  "important_notes",
  "analyses",
];

const VISIT_FIELDS = [
  "complaints",
  "symptoms",
  "examination_results",
  "preliminary_diagnosis",
  "final_diagnosis",
  "treatment",
  "recommendations",
  "comment",
];

const ALLOWED_BLOOD_TYPES = [
  "O(I)",
  "A(II)",
  "B(III)",
  "AB(IV)",
];

const ALLOWED_RH_FACTORS = [
  "positive",
  "negative",
];

function clean(value) {
  return String(value ?? "").trim();
}

function hasOwn(object, field) {
  return Object.prototype.hasOwnProperty.call(
    object || {},
    field
  );
}

function createControllerError(
  message,
  statusCode = 500
) {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}

function getUserRole(user) {
  return clean(
    user?.role ||
      user?.user?.role ||
      user?.profile?.role ||
      user?.user_metadata?.role ||
      user?.app_metadata?.role
  ).toLowerCase();
}

function getDoctorId(user) {
  return clean(
    user?.doctor_id ||
      user?.doctorId ||
      user?.user?.doctor_id ||
      user?.user?.doctorId ||
      user?.profile?.doctor_id ||
      user?.profile?.doctorId
  );
}

function isDoctorUser(user) {
  return (
    getUserRole(user) === "doctor" ||
    Boolean(getDoctorId(user))
  );
}

function uniqueIds(values) {
  return [
    ...new Set(
      values
        .map((value) => clean(value))
        .filter(Boolean)
    ),
  ];
}

function getBirthDate(profile) {
  return (
    profile?.birth_date ||
    profile?.date_of_birth ||
    profile?.birthday ||
    profile?.dob ||
    null
  );
}

function calculateAge(birthDate) {
  if (!birthDate) {
    return null;
  }

  const value =
    String(birthDate).length === 10
      ? `${birthDate}T00:00:00`
      : birthDate;

  const birth = new Date(value);

  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const monthDifference =
    today.getMonth() -
    birth.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() < birth.getDate()
    )
  ) {
    age -= 1;
  }

  return age >= 0
    ? age
    : null;
}

function normalizePatientProfile(profile) {
  if (!profile) {
    return null;
  }

  const birthDate =
    getBirthDate(profile);

  return {
    id:
      profile.id ||
      null,

    username:
      profile.username ||
      "",

    iin:
      profile.iin ||
      profile.identity_number ||
      "",

    full_name:
      profile.full_name ||
      profile.name ||
      profile.display_name ||
      "",

    birth_date:
      birthDate,

    gender:
      profile.gender ||
      "",

    phone:
      profile.phone ||
      profile.phone_number ||
      "",

    email:
      profile.email ||
      "",

    status:
      profile.status ||
      "",

    role:
      profile.role ||
      "",

    created_at:
      profile.created_at ||
      null,

    updated_at:
      profile.updated_at ||
      null,

    age:
      calculateAge(
        birthDate
      ),
  };
}

function selectAllowedFields(
  body,
  allowedFields
) {
  const result = {};

  for (const field of allowedFields) {
    if (!hasOwn(body, field)) {
      continue;
    }

    result[field] =
      body[field] === null
        ? null
        : clean(body[field]);
  }

  return result;
}

/*
 * Дата и время записи.
 * Казахстан использует UTC+5.
 */
function getAppointmentDateTime(
  appointment
) {
  const date = clean(
    appointment?.date
  );

  const time = clean(
    appointment?.time
  ).slice(0, 5);

  if (!date || !time) {
    return null;
  }

  const result = new Date(
    `${date}T${time}:00+05:00`
  );

  if (
    Number.isNaN(
      result.getTime()
    )
  ) {
    return null;
  }

  return result;
}

/*
 * Определяем доступ к медицинской карте.
 *
 * locked  — до открытия карты осталось больше 20 минут;
 * preview — карта доступна только для просмотра;
 * active  — приём начался, врач может редактировать;
 * closed  — карта недоступна врачу.
 */
function getMedicalCardAccessInfo(
  appointment
) {
  if (!appointment) {
    return {
      can_view: false,
      can_edit: false,
      access_state: "closed",
      view_available_at: null,
      minutes_until_view: null,
    };
  }

  if (
    EDITABLE_APPOINTMENT_STATUSES.includes(
      appointment.status
    )
  ) {
    return {
      can_view: true,
      can_edit: true,
      access_state: "active",
      view_available_at: null,
      minutes_until_view: 0,
    };
  }

  if (
    HISTORICAL_APPOINTMENT_STATUSES.includes(
      appointment.status
    )
  ) {
    return {
      can_view: true,
      can_edit: false,
      access_state: "history",
      view_available_at: null,
      minutes_until_view: 0,
    };
  }

  if (
    UPCOMING_APPOINTMENT_STATUSES.includes(
      appointment.status
    )
  ) {
    const appointmentDateTime =
      getAppointmentDateTime(
        appointment
      );

    if (!appointmentDateTime) {
      return {
        can_view: false,
        can_edit: false,
        access_state: "closed",
        view_available_at: null,
        minutes_until_view: null,
      };
    }

    const viewAvailableAt =
      new Date(
        appointmentDateTime.getTime() -
          MEDICAL_CARD_VIEW_WINDOW_MINUTES *
            60 *
            1000
      );

    const millisecondsUntilView =
      viewAvailableAt.getTime() -
      Date.now();

    return {
      can_view:
        millisecondsUntilView <= 0,

      can_edit: false,

      access_state:
        millisecondsUntilView <= 0
          ? "preview"
          : "locked",

      view_available_at:
        viewAvailableAt.toISOString(),

      minutes_until_view:
        millisecondsUntilView > 0
          ? Math.ceil(
              millisecondsUntilView /
                60000
            )
          : 0,
    };
  }

  return {
    can_view: false,
    can_edit: false,
    access_state: "closed",
    view_available_at: null,
    minutes_until_view: null,
  };
}

/*
 * Выбираем ближайшую будущую запись.
 */
function findUpcomingAppointmentFromList(
  appointments
) {
  const now = Date.now();

  return (
    [
      ...(appointments || []),
    ]
      .filter((appointment) => {
        if (
          !UPCOMING_APPOINTMENT_STATUSES.includes(
            appointment?.status
          )
        ) {
          return false;
        }

        const dateTime =
          getAppointmentDateTime(
            appointment
          );

        if (!dateTime) {
          return true;
        }

        /*
         * Оставляем запись ещё на пять минут,
         * если статус не успел обновиться.
         */
        return (
          dateTime.getTime() >=
          now - 5 * 60 * 1000
        );
      })
      .sort((first, second) => {
        const firstDate =
          getAppointmentDateTime(
            first
          );

        const secondDate =
          getAppointmentDateTime(
            second
          );

        return (
          (
            firstDate?.getTime() ||
            Number.MAX_SAFE_INTEGER
          ) -
          (
            secondDate?.getTime() ||
            Number.MAX_SAFE_INTEGER
          )
        );
      })[0] ||
    null
  );
}

async function getPatientProfile({
  patientId,
  iin,
}) {
  let query = supabase
    .from("profiles")
    .select("*")
    .eq(
      "role",
      "patient"
    );

  if (patientId) {
    query = query.eq(
      "id",
      patientId
    );
  } else if (iin) {
    query = query.eq(
      "iin",
      iin
    );
  } else {
    throw createControllerError(
      "Не указан идентификатор пациента.",
      400
    );
  }

  const {
    data: profile,
    error,
  } = await query.maybeSingle();

  if (error) {
    throw createControllerError(
      `Ошибка получения профиля пациента: ${error.message}`
    );
  }

  if (!profile) {
    throw createControllerError(
      "Профиль пациента не найден.",
      404
    );
  }

  return normalizePatientProfile(
    profile
  );
}

/*
 * Получение конкретной записи.
 * Используется страницей «Приём пациента».
 */
async function findAppointmentByIdForDoctor({
  appointmentId,
  doctorId,
  patientId,
}) {
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
      date,
      time,
      reason,
      status,
      actual_start_time,
      actual_end_time
    `)
    .eq(
      "id",
      appointmentId
    )
    .eq(
      "doctor_id",
      doctorId
    )
    .eq(
      "patient_id",
      patientId
    )
    .maybeSingle();

  if (error) {
    throw createControllerError(
      `Ошибка получения записи: ${error.message}`
    );
  }

  if (!appointment) {
    throw createControllerError(
      "Запись не найдена или принадлежит другому врачу.",
      403
    );
  }

  return appointment;
}

async function findActiveAppointment(
  doctorId,
  patientId
) {
  const {
    data,
    error,
  } = await supabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      doctor_id,
      organization_id,
      date,
      time,
      reason,
      status,
      actual_start_time,
      actual_end_time
    `)
    .eq(
      "doctor_id",
      doctorId
    )
    .eq(
      "patient_id",
      patientId
    )
    .in(
      "status",
      EDITABLE_APPOINTMENT_STATUSES
    )
    .order(
      "actual_start_time",
      {
        ascending: false,
        nullsFirst: false,
      }
    )
    .order(
      "date",
      {
        ascending: false,
      }
    )
    .order(
      "time",
      {
        ascending: false,
      }
    )
    .limit(1);

  if (error) {
    throw createControllerError(
      `Ошибка проверки активного приёма: ${error.message}`
    );
  }

  return data?.[0] || null;
}

async function findUpcomingAppointment(
  doctorId,
  patientId
) {
  const {
    data,
    error,
  } = await supabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      doctor_id,
      organization_id,
      date,
      time,
      reason,
      status,
      actual_start_time,
      actual_end_time
    `)
    .eq(
      "doctor_id",
      doctorId
    )
    .eq(
      "patient_id",
      patientId
    )
    .in(
      "status",
      UPCOMING_APPOINTMENT_STATUSES
    )
    .order(
      "date",
      {
        ascending: true,
      }
    )
    .order(
      "time",
      {
        ascending: true,
      }
    );

  if (error) {
    throw createControllerError(
      `Ошибка получения предстоящей записи: ${error.message}`
    );
  }

  return findUpcomingAppointmentFromList(
    data
  );
}

async function findLatestHistoricalAppointment(
  doctorId,
  patientId
) {
  const {
    data,
    error,
  } = await supabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      doctor_id,
      organization_id,
      date,
      time,
      reason,
      status,
      actual_start_time,
      actual_end_time
    `)
    .eq(
      "doctor_id",
      doctorId
    )
    .eq(
      "patient_id",
      patientId
    )
    .in(
      "status",
      HISTORICAL_APPOINTMENT_STATUSES
    )
    .order(
      "actual_end_time",
      {
        ascending: false,
        nullsFirst: false,
      }
    )
    .order(
      "date",
      {
        ascending: false,
      }
    )
    .order(
      "time",
      {
        ascending: false,
      }
    )
    .limit(1);

  if (error) {
    throw createControllerError(
      `Ошибка получения истории приёмов: ${error.message}`
    );
  }

  return data?.[0] || null;
}

async function findLatestDoctorPatientAppointment(
  doctorId,
  patientId
) {
  const {
    data,
    error,
  } = await supabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      doctor_id,
      organization_id,
      date,
      time,
      reason,
      status,
      actual_start_time,
      actual_end_time
    `)
    .eq(
      "doctor_id",
      doctorId
    )
    .eq(
      "patient_id",
      patientId
    )
    .order(
      "date",
      {
        ascending: false,
      }
    )
    .order(
      "time",
      {
        ascending: false,
      }
    )
    .limit(1);

  if (error) {
    throw createControllerError(
      `Ошибка проверки связи врача с пациентом: ${error.message}`
    );
  }

  return data?.[0] || null;
}

/*
 * Проверка права врача на изменение карты.
 * Изменять карту можно только после начала приёма.
 */
async function verifyEditableAppointment({
  user,
  patientId,
  appointmentId,
}) {
  if (
    !isDoctorUser(user)
  ) {
    throw createControllerError(
      "Изменять медицинскую карту может только врач.",
      403
    );
  }

  const doctorId =
    getDoctorId(user);

  if (!doctorId) {
    throw createControllerError(
      "Не удалось определить профиль врача.",
      403
    );
  }

  let query = supabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      doctor_id,
      organization_id,
      date,
      time,
      reason,
      status,
      actual_start_time,
      actual_end_time
    `)
    .eq(
      "doctor_id",
      doctorId
    )
    .eq(
      "patient_id",
      patientId
    )
    .in(
      "status",
      EDITABLE_APPOINTMENT_STATUSES
    );

  if (appointmentId) {
    query = query.eq(
      "id",
      appointmentId
    );
  }

  const {
    data,
    error,
  } = await query.limit(1);

  if (error) {
    throw createControllerError(
      `Ошибка проверки приёма: ${error.message}`
    );
  }

  const appointment =
    data?.[0];

  if (!appointment) {
    throw createControllerError(
      "Редактирование разрешено только во время активного приёма.",
      403
    );
  }

  return appointment;
}

/*
 * Список пациентов врача.
 */
export async function getDoctorPatients(
  req,
  res,
  next
) {
  try {
    if (
      !isDoctorUser(
        req.user
      )
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Список пациентов доступен только врачу.",
        });
    }

    const doctorId =
      getDoctorId(req.user);

    if (!doctorId) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Не удалось определить профиль врача.",
        });
    }

    const search = clean(
      req.query?.search
    ).toLowerCase();

    const {
      data: appointments,
      error:
        appointmentsError,
    } = await supabase
      .from("appointments")
      .select(`
        id,
        patient_id,
        doctor_id,
        organization_id,
        date,
        time,
        status,
        reason,
        created_at,
        updated_at,
        actual_start_time,
        actual_end_time
      `)
      .eq(
        "doctor_id",
        doctorId
      )
      .order(
        "date",
        {
          ascending: false,
        }
      )
      .order(
        "time",
        {
          ascending: false,
        }
      );

    if (appointmentsError) {
      throw createControllerError(
        `Ошибка получения записей врача: ${appointmentsError.message}`
      );
    }

    const patientIds =
      uniqueIds(
        (
          appointments || []
        ).map(
          (appointment) =>
            appointment.patient_id
        )
      );

    if (
      patientIds.length === 0
    ) {
      return res
        .status(200)
        .json({
          success: true,
          data: [],
        });
    }

    const {
      data: rawProfiles,
      error:
        profilesError,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq(
        "role",
        "patient"
      )
      .in(
        "id",
        patientIds
      );

    if (profilesError) {
      throw createControllerError(
        `Ошибка получения пациентов: ${profilesError.message}`
      );
    }

    const appointmentsByPatient =
      new Map();

    for (
      const appointment of
      appointments || []
    ) {
      const key =
        String(
          appointment.patient_id
        );

      const list =
        appointmentsByPatient.get(
          key
        ) || [];

      list.push(
        appointment
      );

      appointmentsByPatient.set(
        key,
        list
      );
    }

    const patients = (
      rawProfiles || []
    )
      .map((rawProfile) => {
        const profile =
          normalizePatientProfile(
            rawProfile
          );

        const patientAppointments =
          appointmentsByPatient.get(
            String(
              profile.id
            )
          ) || [];

        const activeAppointment =
          patientAppointments.find(
            (appointment) =>
              EDITABLE_APPOINTMENT_STATUSES.includes(
                appointment.status
              )
          ) ||
          null;

        const upcomingAppointment =
          findUpcomingAppointmentFromList(
            patientAppointments
          );

        const historicalAppointment =
          patientAppointments.find(
            (appointment) =>
              HISTORICAL_APPOINTMENT_STATUSES.includes(
                appointment.status
              )
          ) ||
          null;

        const accessAppointment =
          activeAppointment ||
          upcomingAppointment ||
          historicalAppointment ||
          patientAppointments[0] ||
          null;

        const accessInfo =
          activeAppointment
            ? getMedicalCardAccessInfo(
                activeAppointment
              )
            : {
                can_view: true,
                can_edit: false,
                access_state: "view",
                view_available_at: null,
                minutes_until_view: 0,
              };

        return {
          ...profile,

          appointment_count:
            patientAppointments.length,

          last_appointment:
            patientAppointments[0] ||
            null,

          active_appointment:
            activeAppointment,

          upcoming_appointment:
            upcomingAppointment,

          historical_appointment:
            historicalAppointment,

          can_view:
            accessInfo.can_view,

          can_edit:
            accessInfo.can_edit,

          card_access_state:
            accessInfo.access_state,

          card_view_available_at:
            accessInfo.view_available_at,

          minutes_until_card_view:
            accessInfo.minutes_until_view,
        };
      })
      .filter((patient) => {
        if (!search) {
          return true;
        }

        return (
          clean(
            patient.full_name
          )
            .toLowerCase()
            .includes(
              search
            ) ||
          clean(
            patient.iin
          )
            .toLowerCase()
            .includes(
              search
            ) ||
          clean(
            patient.email
          )
            .toLowerCase()
            .includes(
              search
            )
        );
      })
      .sort((first, second) => {
        if (
          first.can_edit !==
          second.can_edit
        ) {
          return first.can_edit
            ? -1
            : 1;
        }

        if (
          first.can_view !==
          second.can_view
        ) {
          return first.can_view
            ? -1
            : 1;
        }

        const firstUpcoming =
          getAppointmentDateTime(
            first.upcoming_appointment
          );

        const secondUpcoming =
          getAppointmentDateTime(
            second.upcoming_appointment
          );

        if (
          firstUpcoming &&
          !secondUpcoming
        ) {
          return -1;
        }

        if (
          !firstUpcoming &&
          secondUpcoming
        ) {
          return 1;
        }

        if (
          firstUpcoming &&
          secondUpcoming &&
          firstUpcoming.getTime() !==
            secondUpcoming.getTime()
        ) {
          return (
            firstUpcoming.getTime() -
            secondUpcoming.getTime()
          );
        }

        return clean(
          first.full_name
        ).localeCompare(
          clean(
            second.full_name
          ),
          "ru"
        );
      });

    return res
      .status(200)
      .json({
        success: true,
        data: patients,
      });
  } catch (error) {
    next(error);
  }
}

/*
 * Получение медицинской карты.
 */
export async function getMedicalCard(
  req,
  res,
  next
) {
  try {
    const user = req.user;
    const userRole =
      getUserRole(user);

    if (!user) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Требуется авторизация.",
        });
    }

    if (
      [
        "support",
        "organization_admin",
      ].includes(
        userRole
      )
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Административные роли не имеют доступа к медицинским картам.",
        });
    }

    let targetPatientId =
      clean(
        req.params
          ?.patientId ||
          req.query
            ?.patientId
      );

    const iin =
      clean(
        req.query?.iin
      );

    const requestedAppointmentId =
      clean(
        req.query
          ?.appointmentId
      );

    /*
     * Пациент может видеть только свою карту.
     */
    if (
      userRole ===
      "patient"
    ) {
      if (
        targetPatientId &&
        String(
          targetPatientId
        ) !==
          String(
            user.id
          )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Вы можете просматривать только собственную медицинскую карту.",
          });
      }

      targetPatientId =
        clean(
          user.id
        );
    }

    if (
      isDoctorUser(
        user
      ) &&
      !targetPatientId &&
      !iin
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Не выбран пациент.",
        });
    }

    const profile =
      await getPatientProfile({
        patientId:
          targetPatientId,

        iin:
          targetPatientId
            ? ""
            : iin,
      });

    const patientId =
      profile.id;

    let activeAppointment =
      null;

    let upcomingAppointment =
      null;

    let historicalAppointment =
      null;

    let accessAppointment =
      null;

    let doctorAccessInfo =
      getMedicalCardAccessInfo(
        null
      );

    /*
     * Проверка доступа врача.
     */
    if (
      isDoctorUser(
        user
      )
    ) {
      const doctorId =
        getDoctorId(user);

      if (!doctorId) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Не удалось определить профиль врача.",
          });
      }

      /*
       * Если открываем карту со страницы
       * конкретного приёма, проверяем именно
       * эту запись.
       */
      if (
        requestedAppointmentId
      ) {
        accessAppointment =
          await findAppointmentByIdForDoctor({
            appointmentId:
              requestedAppointmentId,

            doctorId,

            patientId,
          });

        if (
          EDITABLE_APPOINTMENT_STATUSES.includes(
            accessAppointment.status
          )
        ) {
          activeAppointment =
            accessAppointment;
        } else if (
          UPCOMING_APPOINTMENT_STATUSES.includes(
            accessAppointment.status
          )
        ) {
          upcomingAppointment =
            accessAppointment;
        } else if (
          HISTORICAL_APPOINTMENT_STATUSES.includes(
            accessAppointment.status
          )
        ) {
          historicalAppointment =
            accessAppointment;
        }
      } else {
        /*
         * Общая страница «Медицинские карты».
         *
         * Здесь врач может в любой момент
         * просматривать карту пациента,
         * который когда-либо записывался
         * именно к этому врачу.
         *
         * Ограничение «за 20 минут»
         * применяется только при открытии
         * карты из конкретной записи,
         * когда передан appointmentId.
         */
        const relationshipAppointment =
          await findLatestDoctorPatientAppointment(
            doctorId,
            patientId
          );

        if (!relationshipAppointment) {
          return res
            .status(403)
            .json({
              success: false,
              message:
                "Медицинская карта доступна только пациентам, которые записывались к этому врачу.",
            });
        }

        activeAppointment =
          await findActiveAppointment(
            doctorId,
            patientId
          );

        upcomingAppointment =
          activeAppointment
            ? null
            : await findUpcomingAppointment(
                doctorId,
                patientId
              );

        historicalAppointment =
          await findLatestHistoricalAppointment(
            doctorId,
            patientId
          );

        accessAppointment =
          activeAppointment ||
          upcomingAppointment ||
          historicalAppointment ||
          relationshipAppointment;

        doctorAccessInfo =
          activeAppointment
            ? getMedicalCardAccessInfo(
                activeAppointment
              )
            : {
                can_view: true,
                can_edit: false,
                access_state: "view",
                view_available_at: null,
                minutes_until_view: 0,
              };
      }

      /*
       * Строгая проверка времени действует
       * только при открытии карты из
       * конкретной записи календаря.
       */
      if (requestedAppointmentId) {
        doctorAccessInfo =
          getMedicalCardAccessInfo(
            accessAppointment
          );

        if (
          !doctorAccessInfo.can_view
        ) {
          const message =
            doctorAccessInfo.access_state ===
            "locked"
              ? `Медицинская карта откроется за ${MEDICAL_CARD_VIEW_WINDOW_MINUTES} минут до начала приёма.`
              : "Медицинская карта недоступна для этой записи.";

          return res
            .status(403)
            .json({
              success: false,
              message,

              data: {
                appointment:
                  accessAppointment,

                access_state:
                  doctorAccessInfo.access_state,

                view_available_at:
                  doctorAccessInfo.view_available_at,

                minutes_until_view:
                  doctorAccessInfo.minutes_until_view,

                view_window_minutes:
                  MEDICAL_CARD_VIEW_WINDOW_MINUTES,
              },
            });
        }
      }
    }

    const [
      medicalProfileResult,
      metricsResult,
      visitsResult,
      certificatesResult,
    ] = await Promise.all([
      supabase
        .from(
          "patient_medical_profiles"
        )
        .select("*")
        .eq(
          "patient_id",
          patientId
        )
        .maybeSingle(),

      supabase
        .from(
          "health_metrics"
        )
        .select("*")
        .eq(
          "patient_id",
          patientId
        )
        .order(
          "measured_at",
          {
            ascending: false,
          }
        ),

      supabase
        .from(
          "visit_records"
        )
        .select("*")
        .eq(
          "patient_id",
          patientId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),

      supabase
        .from(
          "medical_certificates"
        )
        .select("*")
        .eq(
          "patient_id",
          patientId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),
    ]);

    if (
      medicalProfileResult.error
    ) {
      throw createControllerError(
        `Ошибка получения общих данных медицинской карты: ${medicalProfileResult.error.message}`
      );
    }

    if (
      metricsResult.error
    ) {
      throw createControllerError(
        `Ошибка получения показателей здоровья: ${metricsResult.error.message}`
      );
    }

    if (
      visitsResult.error
    ) {
      throw createControllerError(
        `Ошибка получения истории приёмов: ${visitsResult.error.message}`
      );
    }

    if (
      certificatesResult.error
    ) {
      throw createControllerError(
        `Ошибка получения справок: ${certificatesResult.error.message}`
      );
    }

    const visits = (
      visitsResult.data || []
    ).map((visit) => ({
      ...visit,
      visit_documents: [],
    }));

    const doctorCanEdit =
      isDoctorUser(
        user
      ) &&
      doctorAccessInfo.can_edit;

    return res
      .status(200)
      .json({
        success: true,

        data: {
          profile,

          medical_profile:
            medicalProfileResult.data ||
            null,

          metrics:
            metricsResult.data ||
            [],

          visits,

          certificates:
            certificatesResult.data ||
            [],

          permissions: {
            can_view: true,

            can_edit:
              doctorCanEdit,

            can_edit_full_name:
              false,

            can_edit_iin:
              false,

            can_edit_birth_date:
              false,

            can_edit_gender:
              false,

            can_edit_email:
              false,

            mode:
              doctorCanEdit
                ? "edit"
                : "view",
          },

          active_appointment:
            activeAppointment,

          active_appointment_id:
            activeAppointment?.id ||
            null,

          upcoming_appointment:
            upcomingAppointment,

          historical_appointment:
            historicalAppointment,

          access_appointment:
            accessAppointment,

          card_access: {
            state:
              userRole ===
              "patient"
                ? "owner"
                : doctorAccessInfo.access_state,

            view_window_minutes:
              MEDICAL_CARD_VIEW_WINDOW_MINUTES,

            view_available_at:
              doctorAccessInfo.view_available_at,

            minutes_until_view:
              doctorAccessInfo.minutes_until_view,
          },

          appointment_state:
            activeAppointment
              ? "active"
              : upcomingAppointment
                ? "upcoming"
                : historicalAppointment
                  ? "history"
                  : "none",
        },
      });
  } catch (error) {
    next(error);
  }
}

/*
 * Пациент может только просматривать карту.
 */
export async function updateOwnMedicalProfile(
  req,
  res,
  next
) {
  try {
    return res
      .status(403)
      .json({
        success: false,

        message:
          "Пациент может только просматривать медицинскую карту. Изменения вносит врач во время активного приёма.",
      });
  } catch (error) {
    next(error);
  }
}

/*
 * Изменение общих медицинских данных врачом.
 */
export async function updateMedicalProfile(
  req,
  res,
  next
) {
  try {
    const patientId =
      clean(
        req.params
          ?.patientId
      );

    if (!patientId) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Не указан patientId.",
        });
    }

    const appointment =
      await verifyEditableAppointment({
        user:
          req.user,

        patientId,

        appointmentId:
          clean(
            req.body
              ?.appointmentId ||
            req.query
              ?.appointmentId
          ),
      });

    const updateData =
      selectAllowedFields(
        req.body || {},
        DOCTOR_MEDICAL_PROFILE_FIELDS
      );

    if (
      Object.keys(
        updateData
      ).length === 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Не переданы медицинские данные для изменения.",
        });
    }

    /*
     * Получаем текущие сведения
     * о группе крови.
     */
    const {
      data:
        currentMedicalProfile,

      error:
        currentProfileError,
    } = await supabase
      .from(
        "patient_medical_profiles"
      )
      .select(
        "blood_type, rh_factor"
      )
      .eq(
        "patient_id",
        patientId
      )
      .maybeSingle();

    if (
      currentProfileError
    ) {
      throw createControllerError(
        `Ошибка проверки группы крови: ${currentProfileError.message}`
      );
    }

    const currentBloodType =
      clean(
        currentMedicalProfile
          ?.blood_type
      );

    const currentRhFactor =
      clean(
        currentMedicalProfile
          ?.rh_factor
      );

    const nextBloodType =
      hasOwn(
        updateData,
        "blood_type"
      )
        ? clean(
            updateData
              .blood_type
          )
        : currentBloodType;

    const nextRhFactor =
      hasOwn(
        updateData,
        "rh_factor"
      )
        ? clean(
            updateData
              .rh_factor
          )
        : currentRhFactor;

    const bloodDataChanged =
      nextBloodType !==
        currentBloodType ||
      nextRhFactor !==
        currentRhFactor;

    /*
     * При изменении группы крови
     * требуется подтверждение врача.
     */
    if (bloodDataChanged) {
      if (
        !nextBloodType ||
        !nextRhFactor
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Для сохранения выберите и группу крови, и резус-фактор.",
          });
      }

      if (
        !ALLOWED_BLOOD_TYPES.includes(
          nextBloodType
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Указана некорректная группа крови.",
          });
      }

      if (
        !ALLOWED_RH_FACTORS.includes(
          nextRhFactor
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Указан некорректный резус-фактор.",
          });
      }

      const bloodDataVerified =
        req.body
          ?.bloodDataVerified ===
          true ||
        clean(
          req.body
            ?.bloodDataVerified
        ).toLowerCase() ===
          "true";

      if (
        !bloodDataVerified
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Подтвердите, что группа крови и резус-фактор сверены с официальным результатом анализа пациента.",
          });
      }
    }

    const doctorId =
      getDoctorId(
        req.user
      );

    const now =
      new Date().toISOString();

    const {
      data:
        medicalProfile,

      error,
    } = await supabase
      .from(
        "patient_medical_profiles"
      )
      .upsert(
        {
          patient_id:
            patientId,

          ...updateData,

          updated_by_doctor_id:
            doctorId,

          updated_by_appointment_id:
            appointment.id,

          updated_at:
            now,
        },
        {
          onConflict:
            "patient_id",
        }
      )
      .select("*")
      .single();

    if (error) {
      throw createControllerError(
        `Ошибка обновления медицинской карты: ${error.message}`
      );
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Медицинские сведения пациента обновлены.",

        data:
          medicalProfile,
      });
  } catch (error) {
    next(error);
  }
}

/*
 * Сохранение протокола текущего приёма.
 */
export async function saveCurrentVisit(
  req,
  res,
  next
) {
  try {
    const patientId =
      clean(
        req.params
          ?.patientId
      );

    const appointmentId =
      clean(
        req.params
          ?.appointmentId ||
        req.body
          ?.appointmentId
      );

    if (!patientId) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Не указан patientId.",
        });
    }

    if (!appointmentId) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Не указан appointmentId.",
        });
    }

    const appointment =
      await verifyEditableAppointment({
        user:
          req.user,

        patientId,

        appointmentId,
      });

    const visitData =
      selectAllowedFields(
        req.body || {},
        VISIT_FIELDS
      );

    if (
      Object.keys(
        visitData
      ).length === 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Не переданы данные текущего приёма.",
        });
    }

    const doctorId =
      getDoctorId(
        req.user
      );

    const now =
      new Date().toISOString();

    const {
      data: visit,
      error,
    } = await supabase
      .from(
        "visit_records"
      )
      .upsert(
        {
          appointment_id:
            appointment.id,

          patient_id:
            patientId,

          doctor_id:
            doctorId,

          organization_id:
            appointment.organization_id,

          ...visitData,

          updated_at:
            now,
        },
        {
          onConflict:
            "appointment_id",
        }
      )
      .select("*")
      .single();

    if (error) {
      throw createControllerError(
        `Ошибка сохранения данных приёма: ${error.message}`
      );
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Данные текущего приёма сохранены.",

        data:
          visit,
      });
  } catch (error) {
    next(error);
  }
}
