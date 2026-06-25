
import * as appointmentService from "../services/appointmentService.js";
import { supabase } from "../config/supabaseClient.js";

function clean(value) {
  return String(value ?? "").trim();
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

function createMap(rows = []) {
  return new Map(
    rows.map((row) => [
      String(row.id),
      row,
    ])
  );
}

function getDoctorId(user) {
  return clean(
    user?.doctor_id ||
      user?.doctorId
  );
}

function getOrganizationId(user) {
  return clean(
    user?.organization_id ||
      user?.organizationId
  );
}

async function loadRowsByIds(
  table,
  select,
  ids
) {
  const normalizedIds = uniqueIds(ids);

  if (normalizedIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(table)
    .select(select)
    .in("id", normalizedIds);

  if (error) {
    throw new Error(
      `Ошибка получения данных из ${table}: ${error.message}`
    );
  }

  return data || [];
}

async function hydrateAppointments(
  appointments = []
) {
  if (appointments.length === 0) {
    return [];
  }

  const patientIds = uniqueIds(
    appointments.map(
      (appointment) =>
        appointment.patient_id
    )
  );

  const doctorIds = uniqueIds(
    appointments.map(
      (appointment) =>
        appointment.doctor_id
    )
  );

  const organizationIds = uniqueIds(
    appointments.map(
      (appointment) =>
        appointment.organization_id
    )
  );

  const [
    doctors,
    organizations,
  ] = await Promise.all([
    loadRowsByIds(
      "doctors",
      `
        id,
        member_id,
        specialty_id,
        room_id,
        status
      `,
      doctorIds
    ),

    loadRowsByIds(
      "organizations",
      `
        id,
        name,
        city,
        address,
        status
      `,
      organizationIds
    ),
  ]);

  const doctorMap = createMap(doctors);
  const organizationMap =
    createMap(organizations);

  const memberIds = uniqueIds(
    doctors.map(
      (doctor) => doctor.member_id
    )
  );

  const specialtyIds = uniqueIds(
    doctors.map(
      (doctor) =>
        doctor.specialty_id
    )
  );

  const [members, specialties] =
    await Promise.all([
      loadRowsByIds(
        "organization_members",
        `
          id,
          organization_id,
          profile_id,
          role,
          status
        `,
        memberIds
      ),

      loadRowsByIds(
        "specialties",
        `
          id,
          name_ru,
          name_kk,
          status
        `,
        specialtyIds
      ),
    ]);

  const memberMap = createMap(members);
  const specialtyMap =
    createMap(specialties);

  const doctorProfileIds = uniqueIds(
    members.map(
      (member) => member.profile_id
    )
  );

  const allProfileIds = uniqueIds([
    ...patientIds,
    ...doctorProfileIds,
  ]);

  const profiles = await loadRowsByIds(
    "profiles",
    `
      id,
      username,
      full_name,
      iin,
      email,
      phone,
      role,
      status
    `,
    allProfileIds
  );

  const profileMap = createMap(profiles);

  return appointments.map(
    (appointment) => {
      const doctor = doctorMap.get(
        String(
          appointment.doctor_id || ""
        )
      );

      const member = doctor
        ? memberMap.get(
            String(
              doctor.member_id || ""
            )
          )
        : null;

      const specialty = doctor
        ? specialtyMap.get(
            String(
              doctor.specialty_id || ""
            )
          )
        : null;

      const patientProfile =
        profileMap.get(
          String(
            appointment.patient_id || ""
          )
        ) || null;

      const doctorProfile = member
        ? profileMap.get(
            String(
              member.profile_id || ""
            )
          ) || null
        : null;

      const organization =
        organizationMap.get(
          String(
            appointment.organization_id ||
              ""
          )
        ) || null;

      return {
        ...appointment,

        profiles: patientProfile,
        patient: patientProfile,

        doctors: doctor
          ? {
              ...doctor,

              specialties:
                specialty || null,

              organization_members:
                member
                  ? {
                      ...member,
                      profiles:
                        doctorProfile,
                    }
                  : null,
            }
          : null,

        doctor: doctor
          ? {
              ...doctor,
              specialty:
                specialty || null,
              profile:
                doctorProfile,
              member,
            }
          : null,

        organizations:
          organization,

        organization,
      };
    }
  );
}

export async function bookAppointment(
  req,
  res,
  next
) {
  try {
    const patientId = req.user.id;

    const {
      organizationId,
      doctorId,
      date,
      time,
      reason,
      notificationEmail,
    } = req.body;

    if (
      !organizationId ||
      !doctorId ||
      !date ||
      !time
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organizationId, doctorId, date и time обязательны в теле запроса.",
      });
    }

    const appointment =
      await appointmentService.createAppointment(
        patientId,
        organizationId,
        doctorId,
        date,
        time,
        reason,
        notificationEmail
      );

    return res.status(201).json({
      success: true,

      message: appointment.email_sent
        ? "Запись успешно создана. Электронный талон и QR-код отправлены на почту."
        : "Запись создана, но письмо отправить не удалось.",

      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmPatientAppointment(
  req,
  res,
  next
) {
  try {
    const appointmentId = clean(
      req.params?.id
    );

    const patientId = req.user.id;

    const appointment =
      await appointmentService.confirmAppointment(
        appointmentId,
        patientId
      );

    return res.status(200).json({
      success: true,
      message:
        "Запись на приём подтверждена.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelAppointment(
  req,
  res,
  next
) {
  try {
    const appointmentId = clean(
      req.params?.id
    );

    const userId = req.user.id;
    const role = req.user.role;

    const appointment =
      await appointmentService.cancelAppointment(
        appointmentId,
        userId,
        role
      );

    return res.status(200).json({
      success: true,
      message:
        "Приём успешно отменён.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAppointments(
  req,
  res,
  next
) {
  try {
    const user = req.user;

    const date = clean(
      req.query?.date
    );

    const status = clean(
      req.query?.status
    );

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
        qr_token,
        actual_start_time,
        actual_end_time,
        cancellation_reason,
        cancelled_by,
        created_at,
        updated_at
      `);

    if (user.role === "patient") {
      query = query.eq(
        "patient_id",
        user.id
      );
    } else if (
      user.role === "doctor"
    ) {
      const doctorId =
        getDoctorId(user);

      if (!doctorId) {
        return res.status(403).json({
          success: false,
          message:
            "Не удалось определить профиль врача.",
        });
      }

      query = query.eq(
        "doctor_id",
        doctorId
      );
    } else if (
      user.role ===
      "organization_admin"
    ) {
      const organizationId =
        getOrganizationId(user);

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message:
            "Администратор не привязан к организации.",
        });
      }

      query = query.eq(
        "organization_id",
        organizationId
      );
    }

    if (date) {
      query = query.eq("date", date);
    }

    if (status) {
      query = query.eq(
        "status",
        status
      );
    }

    const {
      data: appointments,
      error,
    } = await query
      .order("date", {
        ascending: true,
      })
      .order("time", {
        ascending: true,
      });

    if (error) {
      throw new Error(
        `Ошибка получения записей: ${error.message}`
      );
    }

    const hydratedAppointments =
      await hydrateAppointments(
        appointments || []
      );

    return res.status(200).json({
      success: true,
      data: hydratedAppointments,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAppointmentDetails(
  req,
  res,
  next
) {
  try {
    const appointmentId = clean(
      req.params?.id
    );

    const user = req.user;

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
        qr_token,
        actual_start_time,
        actual_end_time,
        cancellation_reason,
        cancelled_by,
        created_at,
        updated_at
      `)
      .eq("id", appointmentId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Ошибка получения записи: ${error.message}`
      );
    }

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message:
          "Запись на приём не найдена.",
      });
    }

    if (
      user.role === "patient" &&
      String(appointment.patient_id) !==
        String(user.id)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Доступ запрещён. Вы не являетесь владельцем записи.",
      });
    }

    if (
      user.role === "doctor" &&
      String(appointment.doctor_id) !==
        String(getDoctorId(user))
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Доступ запрещён. Вы не лечащий врач этого приёма.",
      });
    }

    if (
      user.role ===
        "organization_admin" &&
      String(
        appointment.organization_id
      ) !==
        String(
          getOrganizationId(user)
        )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Доступ запрещён к приёму другой клиники.",
      });
    }

    const [hydratedAppointment] =
      await hydrateAppointments([
        appointment,
      ]);

    return res.status(200).json({
      success: true,
      data: hydratedAppointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function requestStartCode(
  req,
  res,
  next
) {
  try {
    const appointmentId = clean(
      req.params?.id
    );

    const doctorId =
      getDoctorId(req.user);

    if (!doctorId) {
      return res.status(403).json({
        success: false,
        message:
          "Не удалось определить профиль врача.",
      });
    }

    const {
      data: appointment,
      error,
    } = await supabase
      .from("appointments")
      .select("id, doctor_id")
      .eq("id", appointmentId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Ошибка проверки записи: ${error.message}`
      );
    }

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message:
          "Запись на приём не найдена.",
      });
    }

    if (
      String(
        appointment.doctor_id
      ) !== String(doctorId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Доступ запрещён. Вы не лечащий врач.",
      });
    }

    const code =
      await appointmentService.generateStartCode(
        appointmentId
      );

    return res.status(200).json({
      success: true,
      message:
        "Код начала приёма успешно сгенерирован.",
      code,
    });
  } catch (error) {
    next(error);
  }
}

export async function startAppointmentSession(
  req,
  res,
  next
) {
  try {
    const appointmentId = clean(
      req.params?.id
    );

    const doctorId =
      getDoctorId(req.user);

    const {
      code,
      qrToken,
    } = req.body;

    const appointment =
      await appointmentService.startAppointment(
        appointmentId,
        doctorId,
        code,
        qrToken
      );

    return res.status(200).json({
      success: true,
      message:
        "Приём успешно начат.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function requestFinishCode(
  req,
  res,
  next
) {
  try {
    const appointmentId = clean(
      req.params?.id
    );

    const doctorId =
      getDoctorId(req.user);

    const result =
      await appointmentService.initiateFinishAppointment(
        appointmentId,
        doctorId
      );

    return res.status(200).json({
      success: true,
      message: result.message,
      code: result.code,
    });
  } catch (error) {
    next(error);
  }
}

export async function finishAppointmentSession(
  req,
  res,
  next
) {
  try {
    const appointmentId = clean(
      req.params?.id
    );

    const doctorId =
      getDoctorId(req.user);

    const {
      code,
      complaints,
      symptoms,
      preliminaryDiagnosis,
      finalDiagnosis,
      treatment,
      recommendations,
      comment,
    } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан код подтверждения.",
      });
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

    const result =
      await appointmentService.completeAppointment(
        appointmentId,
        doctorId,
        code,
        visitDetails
      );

    return res.status(200).json({
      success: true,
      message:
        "Приём успешно завершён, медицинская карта обновлена.",
      data: result.record,
    });
  } catch (error) {
    next(error);
  }
}

export async function setAppointmentNoShow(
  req,
  res,
  next
) {
  try {
    const appointmentId = clean(
      req.params?.id
    );

    const doctorId =
      getDoctorId(req.user);

    const appointment =
      await appointmentService.markNoShow(
        appointmentId,
        doctorId
      );

    return res.status(200).json({
      success: true,
      message:
        "Пациенту установлен статус неявки.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}
