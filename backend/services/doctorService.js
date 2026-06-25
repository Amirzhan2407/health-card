
import crypto from "crypto";

import { supabase } from "../config/supabaseClient.js";
import { hashPassword } from "../utils/crypto.js";
import { AppError } from "../utils/errorHandler.js";
import { sendDoctorAccessEmail } from "./emailService.js";

import {
  cancelFutureAppointmentsForDoctor,
} from "./appointmentService.js";

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function normalizeUsername(value) {
  return clean(value).toLowerCase();
}

function relationOne(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function generateTemporaryPassword() {
  const randomPart = crypto
    .randomBytes(9)
    .toString("base64url");

  return `A${randomPart}z7!`;
}

function getAccessStatus(profile, doctorStatus) {
  if (doctorStatus === "archived") {
    return "archived";
  }

  if (!profile?.username) {
    return "no_access";
  }

  if (profile.status !== "active") {
    return "blocked";
  }

  return "active";
}

function isUniqueViolation(error) {
  return String(error?.code || "") === "23505";
}

function isMissingColumnError(
  error,
  columnName
) {
  const message = String(
    error?.message || ""
  ).toLowerCase();

  const normalizedColumnName = String(
    columnName || ""
  ).toLowerCase();

  return (
    message.includes(normalizedColumnName) &&
    (
      message.includes("column") ||
      message.includes("schema cache") ||
      message.includes("could not find")
    )
  );
}

function isMissingTableError(
  error,
  tableName
) {
  const message = String(
    error?.message || ""
  ).toLowerCase();

  return (
    message.includes(
      String(tableName || "").toLowerCase()
    ) &&
    (
      message.includes("relation") ||
      message.includes("does not exist") ||
      message.includes("schema cache")
    )
  );
}

async function updateProfile(
  profileId,
  fields,
  options = {}
) {
  const payload = {
    ...fields,
    updated_at: new Date().toISOString(),
  };

  if (
    options.mustChangePassword !== undefined
  ) {
    payload.must_change_password = Boolean(
      options.mustChangePassword
    );
  }

  let result = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", profileId)
    .select(`
      id,
      username,
      iin,
      full_name,
      email,
      phone,
      role,
      status
    `)
    .single();

  if (
    result.error &&
    payload.must_change_password !== undefined &&
    isMissingColumnError(
      result.error,
      "must_change_password"
    )
  ) {
    const fallbackPayload = {
      ...payload,
    };

    delete fallbackPayload.must_change_password;

    result = await supabase
      .from("profiles")
      .update(fallbackPayload)
      .eq("id", profileId)
      .select(`
        id,
        username,
        iin,
        full_name,
        email,
        phone,
        role,
        status
      `)
      .single();
  }

  if (result.error || !result.data) {
    if (isUniqueViolation(result.error)) {
      const errorMessage = String(
        result.error?.message || ""
      ).toLowerCase();

      if (
        errorMessage.includes("username")
      ) {
        throw new AppError(
          "Такой логин уже используется другим пользователем.",
          409
        );
      }

      if (errorMessage.includes("iin")) {
        throw new AppError(
          "Пользователь с таким ИИН уже существует.",
          409
        );
      }
    }

    throw new Error(
      `Ошибка обновления профиля врача: ${
        result.error?.message ||
        "профиль не обновлён"
      }`
    );
  }

  return result.data;
}

async function getProfileSecurityState(
  profileId
) {
  let result = await supabase
    .from("profiles")
    .select(`
      id,
      username,
      password_hash,
      role,
      status,
      must_change_password
    `)
    .eq("id", profileId)
    .single();

  let mustChangePasswordSupported = true;

  if (
    result.error &&
    isMissingColumnError(
      result.error,
      "must_change_password"
    )
  ) {
    mustChangePasswordSupported = false;

    result = await supabase
      .from("profiles")
      .select(`
        id,
        username,
        password_hash,
        role,
        status
      `)
      .eq("id", profileId)
      .single();
  }

  if (result.error || !result.data) {
    throw new Error(
      `Не удалось получить текущие данные доступа врача: ${
        result.error?.message ||
        "профиль не найден"
      }`
    );
  }

  return {
    id: result.data.id,
    username:
      result.data.username || null,

    passwordHash:
      result.data.password_hash,

    role: result.data.role,
    status: result.data.status,

    mustChangePasswordSupported,

    mustChangePassword:
      mustChangePasswordSupported
        ? Boolean(
            result.data
              .must_change_password
          )
        : false,
  };
}

async function restoreProfileSecurityState(
  state
) {
  const options =
    state.mustChangePasswordSupported
      ? {
          mustChangePassword:
            state.mustChangePassword,
        }
      : {};

  return updateProfile(
    state.id,
    {
      username: state.username,
      password_hash:
        state.passwordHash,
      role: state.role,
      status: state.status,
    },
    options
  );
}

async function revokeProfileSessions(
  profileId
) {
  const { error } = await supabase
    .from("user_refresh_tokens")
    .update({
      is_revoked: true,
      revoked_at:
        new Date().toISOString(),
    })
    .eq("profile_id", profileId)
    .eq("is_revoked", false);

  if (
    error &&
    !isMissingTableError(
      error,
      "user_refresh_tokens"
    )
  ) {
    throw new Error(
      `Не удалось завершить активные сессии врача: ${error.message}`
    );
  }
}

async function ensureSpecialtyExists(
  specialtyId
) {
  const normalizedSpecialtyId =
    clean(specialtyId);

  if (!normalizedSpecialtyId) {
    return null;
  }

  const { data, error } = await supabase
    .from("specialties")
    .select(`
      id,
      name_ru,
      name_kk,
      status
    `)
    .eq("id", normalizedSpecialtyId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Ошибка проверки специальности: ${error.message}`
    );
  }

  if (!data) {
    throw new AppError(
      "Выбранная специальность не найдена.",
      404
    );
  }

  if (
    data.status &&
    data.status !== "active"
  ) {
    throw new AppError(
      "Выбранная специальность недоступна.",
      409
    );
  }

  return data;
}

async function ensureRoomBelongsToOrganization(
  organizationId,
  roomId
) {
  const normalizedRoomId = clean(roomId);

  if (!normalizedRoomId) {
    return null;
  }

  const { data, error } = await supabase
    .from("rooms")
    .select(`
      id,
      organization_id,
      department_id,
      number,
      name,
      status
    `)
    .eq("id", normalizedRoomId)
    .eq(
      "organization_id",
      organizationId
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Ошибка проверки кабинета: ${error.message}`
    );
  }

  if (!data) {
    throw new AppError(
      "Кабинет не найден или принадлежит другой организации.",
      404
    );
  }

  if (
    data.status &&
    data.status !== "active"
  ) {
    throw new AppError(
      "Выбранный кабинет недоступен.",
      409
    );
  }

  if (!data.department_id) {
    throw new AppError(
      "Выбранный кабинет не привязан к отделению.",
      409
    );
  }

  return data;
}

async function ensureIinAvailable(iin) {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      status
    `)
    .eq("iin", iin)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Ошибка проверки ИИН: ${error.message}`
    );
  }

  if (data) {
    throw new AppError(
      "Пользователь с таким ИИН уже существует.",
      409
    );
  }
}

async function ensureUsernameAvailable(
  username,
  currentProfileId
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Ошибка проверки логина: ${error.message}`
    );
  }

  if (
    data &&
    String(data.id) !==
      String(currentProfileId)
  ) {
    throw new AppError(
      "Этот логин уже используется другим пользователем.",
      409
    );
  }
}

async function getDoctorContext(doctorId) {
  const { data, error } = await supabase
    .from("doctors")
    .select(`
      id,
      member_id,
      status,
      organization_members (
        id,
        organization_id,
        profile_id,
        status,
        profiles (
          id,
          username,
          iin,
          full_name,
          email,
          phone,
          role,
          status
        )
      )
    `)
    .eq("id", doctorId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Ошибка проверки врача: ${error.message}`
    );
  }

  if (!data) {
    throw new AppError(
      "Врач не найден.",
      404
    );
  }

  const member = relationOne(
    data.organization_members
  );

  if (!member?.organization_id) {
    throw new AppError(
      "Врач не привязан к медицинской организации.",
      409
    );
  }

  const profile = relationOne(
    member.profiles
  );

  if (!profile?.id) {
    throw new AppError(
      "Профиль врача не найден.",
      409
    );
  }

  return {
    doctor: data,
    member,
    profile,
    organizationId:
      member.organization_id,
  };
}

async function ensureDoctorBelongsToOrganization(
  organizationId,
  doctorId
) {
  const context =
    await getDoctorContext(doctorId);

  if (
    String(context.organizationId) !==
    String(organizationId)
  ) {
    throw new AppError(
      "Врач принадлежит другой организации.",
      403
    );
  }

  return context;
}

export async function listDoctors(
  organizationId,
  specialtyId
) {
  let query = supabase
    .from("doctors")
    .select(`
      id,
      status,
      created_at,
      specialty_id,
      room_id,
      specialties (
        id,
        name_ru,
        name_kk,
        status
      ),
      rooms (
        id,
        organization_id,
        department_id,
        number,
        name,
        status
      ),
      organization_members!inner (
        id,
        organization_id,
        status,
        profiles (
          id,
          username,
          iin,
          full_name,
          email,
          phone,
          status
        )
      )
    `)
    .eq(
      "organization_members.organization_id",
      organizationId
    );

  if (specialtyId) {
    query = query.eq(
      "specialty_id",
      specialtyId
    );
  }

  const { data: doctors, error } =
    await query.order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Ошибка получения списка врачей: ${error.message}`
    );
  }

  return (doctors || []).map((doctor) => {
    const member = relationOne(
      doctor.organization_members
    );

    const profile = relationOne(
      member?.profiles
    );

    const specialty = relationOne(
      doctor.specialties
    );

    const room = relationOne(
      doctor.rooms
    );

    return {
      id: doctor.id,
      status: doctor.status,

      specialtyId:
        doctor.specialty_id || null,

      specialty,

      roomId:
        doctor.room_id || null,

      room,

      departmentId:
        room?.department_id || null,

      memberId:
        member?.id || null,

      memberStatus:
        member?.status || null,

      profileId:
        profile?.id || null,

      iin: profile?.iin || "",

      fullName:
        profile?.full_name || "",

      email:
        profile?.email || "",

      phone:
        profile?.phone || "",

      username:
        profile?.username || null,

      profileStatus:
        profile?.status || "blocked",

      accessStatus: getAccessStatus(
        profile,
        doctor.status
      ),

      accessIssued: Boolean(
        profile?.username
      ),
    };
  });
}

export async function getDoctorById(
  doctorId
) {
  const { data: doctor, error } =
    await supabase
      .from("doctors")
      .select(`
        id,
        status,
        specialty_id,
        room_id,
        specialties (
          id,
          name_ru,
          name_kk,
          status
        ),
        rooms (
          id,
          organization_id,
          department_id,
          number,
          name,
          status
        ),
        organization_members (
          id,
          organization_id,
          status,
          profiles (
            id,
            username,
            iin,
            full_name,
            email,
            phone,
            status
          )
        )
      `)
      .eq("id", doctorId)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Ошибка получения врача: ${error.message}`
    );
  }

  if (!doctor) {
    throw new AppError(
      "Врач не найден.",
      404
    );
  }

  const member = relationOne(
    doctor.organization_members
  );

  const profile = relationOne(
    member?.profiles
  );

  const specialty = relationOne(
    doctor.specialties
  );

  const room = relationOne(
    doctor.rooms
  );

  return {
    id: doctor.id,
    status: doctor.status,

    specialtyId:
      doctor.specialty_id || null,

    specialty,

    roomId:
      doctor.room_id || null,

    room,

    departmentId:
      room?.department_id || null,

    organizationId:
      member?.organization_id || null,

    memberId:
      member?.id || null,

    memberStatus:
      member?.status || null,

    profileId:
      profile?.id || null,

    iin: profile?.iin || "",

    fullName:
      profile?.full_name || "",

    email:
      profile?.email || "",

    phone:
      profile?.phone || "",

    username:
      profile?.username || null,

    profileStatus:
      profile?.status || "blocked",

    accessStatus: getAccessStatus(
      profile,
      doctor.status
    ),

    accessIssued: Boolean(
      profile?.username
    ),
  };
}

export async function createDoctor(
  organizationId,
  data
) {
  const {
    iin,
    fullName,
    email,
    phone,
    specialtyId,
    roomId,
  } = data;

  const normalizedIin = clean(iin);

  const normalizedFullName =
    clean(fullName);

  const normalizedEmail =
    normalizeEmail(email);

  const normalizedPhone =
    clean(phone) || null;

  if (
    !normalizedIin ||
    !normalizedFullName ||
    !normalizedEmail
  ) {
    throw new AppError(
      "ИИН, ФИО и электронная почта обязательны.",
      400
    );
  }

  if (!/^\d{12}$/.test(normalizedIin)) {
    throw new AppError(
      "ИИН должен содержать ровно 12 цифр.",
      400
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizedEmail
    )
  ) {
    throw new AppError(
      "Укажите корректную электронную почту.",
      400
    );
  }

  await ensureIinAvailable(
    normalizedIin
  );

  if (specialtyId) {
    await ensureSpecialtyExists(
      specialtyId
    );
  }

  if (roomId) {
    await ensureRoomBelongsToOrganization(
      organizationId,
      roomId
    );
  }

  const unavailablePassword = crypto
    .randomBytes(48)
    .toString("hex");

  const unavailablePasswordHash =
    hashPassword(unavailablePassword);

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .insert({
      username: null,
      iin: normalizedIin,
      full_name: normalizedFullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password_hash:
        unavailablePasswordHash,
      role: "doctor",
      status: "blocked",
      preferred_language: "ru",
    })
    .select(`
      id,
      username,
      iin,
      full_name,
      email,
      phone,
      role,
      status
    `)
    .single();

  if (profileError || !profile) {
    if (isUniqueViolation(profileError)) {
      const errorMessage = String(
        profileError?.message || ""
      ).toLowerCase();

      if (errorMessage.includes("iin")) {
        throw new AppError(
          "Пользователь с таким ИИН уже существует.",
          409
        );
      }

      if (
        errorMessage.includes("username")
      ) {
        throw new AppError(
          "Пользователь с таким логином уже существует.",
          409
        );
      }

      throw new AppError(
        "Профиль с такими данными уже существует.",
        409
      );
    }

    throw new Error(
      `Ошибка создания профиля врача: ${
        profileError?.message ||
        "профиль не создан"
      }`
    );
  }

  const {
    data: member,
    error: memberError,
  } = await supabase
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      profile_id: profile.id,
      role: "doctor",
      status: "active",
    })
    .select("*")
    .single();

  if (memberError || !member) {
    await supabase
      .from("profiles")
      .delete()
      .eq("id", profile.id);

    throw new Error(
      `Ошибка добавления врача в организацию: ${
        memberError?.message ||
        "сотрудник не создан"
      }`
    );
  }

  const {
    data: doctor,
    error: doctorError,
  } = await supabase
    .from("doctors")
    .insert({
      member_id: member.id,
      specialty_id:
        specialtyId || null,
      room_id: roomId || null,
      status: "active",
    })
    .select("*")
    .single();

  if (doctorError || !doctor) {
    await supabase
      .from("organization_members")
      .delete()
      .eq("id", member.id);

    await supabase
      .from("profiles")
      .delete()
      .eq("id", profile.id);

    throw new Error(
      `Ошибка создания записи врача: ${
        doctorError?.message ||
        "запись врача не создана"
      }`
    );
  }

  return {
    id: doctor.id,
    profileId: profile.id,
    memberId: member.id,

    fullName:
      profile.full_name,

    email:
      profile.email,

    specialtyId:
      doctor.specialty_id,

    roomId:
      doctor.room_id,

    username: null,
    accessStatus: "no_access",
    accessIssued: false,
  };
}

export async function updateDoctor(
  organizationId,
  doctorId,
  data
) {
  const {
    specialtyId,
    roomId,
    status,
  } = data;

  await ensureDoctorBelongsToOrganization(
    organizationId,
    doctorId
  );

  if (
    specialtyId !== undefined &&
    specialtyId !== null &&
    specialtyId !== ""
  ) {
    await ensureSpecialtyExists(
      specialtyId
    );
  }

  let selectedRoom = null;

  if (
    roomId !== undefined &&
    roomId !== null &&
    roomId !== ""
  ) {
    selectedRoom =
      await ensureRoomBelongsToOrganization(
        organizationId,
        roomId
      );
  }

  const updateFields = {
    updated_at:
      new Date().toISOString(),
  };

  if (specialtyId !== undefined) {
    updateFields.specialty_id =
      specialtyId || null;
  }

  if (roomId !== undefined) {
    updateFields.room_id =
      selectedRoom?.id || null;
  }

  if (status !== undefined) {
    updateFields.status = status;
  }

  const {
    data: updatedDoctor,
    error: updateError,
  } = await supabase
    .from("doctors")
    .update(updateFields)
    .eq("id", doctorId)
    .select(`
      id,
      status,
      specialty_id,
      room_id,
      specialties (
        id,
        name_ru,
        name_kk
      ),
      rooms (
        id,
        organization_id,
        department_id,
        number,
        name
      )
    `)
    .single();

  if (updateError || !updatedDoctor) {
    throw new Error(
      `Ошибка обновления врача: ${
        updateError?.message ||
        "врач не обновлён"
      }`
    );
  }

  const specialty = relationOne(
    updatedDoctor.specialties
  );

  const room = relationOne(
    updatedDoctor.rooms
  );

  return {
    id: updatedDoctor.id,
    status: updatedDoctor.status,

    specialtyId:
      updatedDoctor.specialty_id ||
      null,

    specialty,

    roomId:
      updatedDoctor.room_id || null,

    room,

    departmentId:
      room?.department_id || null,
  };
}

export async function grantDoctorAccess(
  organizationId,
  doctorId,
  username
) {
  const normalizedUsername =
    normalizeUsername(username);

  if (
    !/^[\p{L}\p{N}._-]{3,30}$/u.test(
      normalizedUsername
    )
  ) {
    throw new AppError(
      "Логин должен содержать от 3 до 30 букв, цифр или символов . _ -",
      400
    );
  }

  const context =
    await ensureDoctorBelongsToOrganization(
      organizationId,
      doctorId
    );

  if (
    context.doctor.status === "archived"
  ) {
    throw new AppError(
      "Нельзя выдать доступ архивному врачу.",
      409
    );
  }

  if (context.profile.username) {
    throw new AppError(
      "Доступ этому врачу уже был выдан. Используйте сброс пароля.",
      409
    );
  }

  if (!clean(context.profile.email)) {
    throw new AppError(
      "У врача не указана электронная почта.",
      409
    );
  }

  await ensureUsernameAvailable(
    normalizedUsername,
    context.profile.id
  );

  const previousSecurityState =
    await getProfileSecurityState(
      context.profile.id
    );

  const temporaryPassword =
    generateTemporaryPassword();

  const passwordHash =
    hashPassword(temporaryPassword);

  let updatedProfile;

  try {
    updatedProfile =
      await updateProfile(
        context.profile.id,
        {
          username:
            normalizedUsername,

          password_hash:
            passwordHash,

          role: "doctor",
          status: "active",
        },
        {
          mustChangePassword: true,
        }
      );

    await revokeProfileSessions(
      context.profile.id
    );

    await sendDoctorAccessEmail({
      email:
        context.profile.email,

      fullName:
        context.profile.full_name,

      username:
        updatedProfile.username,

      temporaryPassword,

      isPasswordReset: false,
    });
  } catch (error) {
    try {
      await restoreProfileSecurityState(
        previousSecurityState
      );
    } catch (rollbackError) {
      console.error(
        "[DOCTOR ACCESS ROLLBACK ERROR]",
        rollbackError?.message ||
          rollbackError
      );
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      `Не удалось выдать доступ врачу: ${
        error?.message ||
        "неизвестная ошибка"
      }`,
      502
    );
  }

  return {
    doctorId:
      context.doctor.id,

    profileId:
      updatedProfile.id,

    username:
      updatedProfile.username,

    temporaryPassword,

    email:
      context.profile.email,

    emailSent: true,
    accessStatus: "active",
    accessIssued: true,
  };
}

export async function resetDoctorPassword(
  organizationId,
  doctorId
) {
  const context =
    await ensureDoctorBelongsToOrganization(
      organizationId,
      doctorId
    );

  if (
    context.doctor.status === "archived"
  ) {
    throw new AppError(
      "Нельзя сбросить пароль архивному врачу.",
      409
    );
  }

  if (!context.profile.username) {
    throw new AppError(
      "Сначала выдайте врачу доступ.",
      409
    );
  }

  if (!clean(context.profile.email)) {
    throw new AppError(
      "У врача не указана электронная почта.",
      409
    );
  }

  const previousSecurityState =
    await getProfileSecurityState(
      context.profile.id
    );

  const temporaryPassword =
    generateTemporaryPassword();

  const passwordHash =
    hashPassword(temporaryPassword);

  let updatedProfile;

  try {
    updatedProfile =
      await updateProfile(
        context.profile.id,
        {
          password_hash:
            passwordHash,
        },
        {
          mustChangePassword: true,
        }
      );

    await revokeProfileSessions(
      context.profile.id
    );

    await sendDoctorAccessEmail({
      email:
        context.profile.email,

      fullName:
        context.profile.full_name,

      username:
        updatedProfile.username,

      temporaryPassword,

      isPasswordReset: true,
    });
  } catch (error) {
    try {
      await restoreProfileSecurityState(
        previousSecurityState
      );
    } catch (rollbackError) {
      console.error(
        "[DOCTOR PASSWORD ROLLBACK ERROR]",
        rollbackError?.message ||
          rollbackError
      );
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      `Не удалось создать новый временный пароль: ${
        error?.message ||
        "неизвестная ошибка"
      }`,
      502
    );
  }

  return {
    doctorId:
      context.doctor.id,

    profileId:
      updatedProfile.id,

    username:
      updatedProfile.username,

    temporaryPassword,

    email:
      context.profile.email,

    emailSent: true,

    accessStatus:
      updatedProfile.status ===
      "active"
        ? "active"
        : "blocked",

    accessIssued: true,
  };
}

export async function setDoctorAccessStatus(
  organizationId,
  doctorId,
  accessStatus
) {
  if (
    !["active", "blocked"].includes(
      accessStatus
    )
  ) {
    throw new AppError(
      "Некорректный статус доступа.",
      400
    );
  }

  const context =
    await ensureDoctorBelongsToOrganization(
      organizationId,
      doctorId
    );

  if (
    context.doctor.status === "archived"
  ) {
    throw new AppError(
      "Нельзя изменить доступ архивного врача.",
      409
    );
  }

  if (
    accessStatus === "active" &&
    !context.profile.username
  ) {
    throw new AppError(
      "Сначала выдайте врачу логин и временный пароль.",
      409
    );
  }

  const previousDoctorStatus =
    context.doctor.status;

  const now =
    new Date().toISOString();

  /*
   * Меняем статус не только профиля,
   * но и карточки врача.
   *
   * Это не позволит пациентам создавать
   * новые записи к заблокированному врачу.
   */
  const {
    data: updatedDoctor,
    error: doctorUpdateError,
  } = await supabase
    .from("doctors")
    .update({
      status: accessStatus,
      updated_at: now,
    })
    .eq("id", doctorId)
    .select("id, status")
    .single();

  if (
    doctorUpdateError ||
    !updatedDoctor
  ) {
    throw new Error(
      `Не удалось изменить статус врача: ${
        doctorUpdateError?.message ||
        "карточка врача не обновлена"
      }`
    );
  }

  let updatedProfile;

  try {
    updatedProfile =
      await updateProfile(
        context.profile.id,
        {
          status: accessStatus,
        }
      );
  } catch (error) {
    /*
     * Если профиль обновить не получилось,
     * возвращаем карточке прежний статус.
     */
    const {
      error: rollbackError,
    } = await supabase
      .from("doctors")
      .update({
        status:
          previousDoctorStatus,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", doctorId);

    if (rollbackError) {
      console.error(
        "[DOCTOR STATUS ROLLBACK ERROR]",
        rollbackError.message
      );
    }

    throw error;
  }

  if (accessStatus === "blocked") {
    await revokeProfileSessions(
      context.profile.id
    );
  }

  return {
    doctorId:
      updatedDoctor.id,

    doctorStatus:
      updatedDoctor.status,

    profileId:
      updatedProfile.id,

    username:
      updatedProfile.username,

    profileStatus:
      updatedProfile.status,

    accessStatus:
      updatedProfile.username
        ? updatedProfile.status ===
          "active"
          ? "active"
          : "blocked"
        : "no_access",

    accessIssued: Boolean(
      updatedProfile.username
    ),
  };
}
export async function blockDoctorAccessAndCancelAppointments(
  organizationId,
  doctorId,
  cancelledByProfileId = ""
) {
  /*
   * Сначала блокируем врача и закрываем
   * его активные авторизационные сессии.
   */
  const doctor =
    await setDoctorAccessStatus(
      organizationId,
      doctorId,
      "blocked"
    );

  /*
   * После блокировки отменяем только
   * будущие активные записи.
   *
   * Завершённые и уже начатые приёмы
   * эта функция не изменяет.
   */
  const cancellation =
    await cancelFutureAppointmentsForDoctor(
      doctorId,
      cancelledByProfileId
    );

  return {
    ...doctor,

    cancelledAppointmentsCount:
      cancellation.cancelledCount,

    cancelledAppointmentIds:
      cancellation.appointmentIds,
  };
}

export async function archiveDoctor(
  organizationId,
  doctorId
) {
  const context =
    await ensureDoctorBelongsToOrganization(
      organizationId,
      doctorId
    );

  if (
    context.doctor.status === "archived"
  ) {
    throw new AppError(
      "Врач уже находится в архиве.",
      409
    );
  }

  const {
    data: archivedDoctor,
    error: archiveError,
  } = await supabase
    .from("doctors")
    .update({
      status: "archived",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", doctorId)
    .select("id, status")
    .single();

  if (
    archiveError ||
    !archivedDoctor
  ) {
    throw new Error(
      `Ошибка архивирования врача: ${
        archiveError?.message ||
        "врач не архивирован"
      }`
    );
  }

  await updateProfile(
    context.profile.id,
    {
      status: "blocked",
    }
  );

  await revokeProfileSessions(
    context.profile.id
  );

  return {
    id: archivedDoctor.id,
    status: archivedDoctor.status,
    accessStatus: "archived",
  };
}

export async function restoreDoctor(
  organizationId,
  doctorId
) {
  const context =
    await ensureDoctorBelongsToOrganization(
      organizationId,
      doctorId
    );

  if (
    context.doctor.status !== "archived"
  ) {
    throw new AppError(
      "Врач не находится в архиве.",
      409
    );
  }

  const nextProfileStatus =
    context.profile.username
      ? "active"
      : "blocked";

  const {
    data: restoredDoctor,
    error: restoreError,
  } = await supabase
    .from("doctors")
    .update({
      status: "active",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", doctorId)
    .select("id, status")
    .single();

  if (
    restoreError ||
    !restoredDoctor
  ) {
    throw new Error(
      `Ошибка восстановления врача: ${
        restoreError?.message ||
        "врач не восстановлен"
      }`
    );
  }

  const {
    error: memberUpdateError,
  } = await supabase
    .from("organization_members")
    .update({
      status: "active",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", context.member.id);

  if (memberUpdateError) {
    await supabase
      .from("doctors")
      .update({
        status: "archived",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", doctorId);

    throw new Error(
      `Не удалось восстановить членство врача: ${memberUpdateError.message}`
    );
  }

  try {
    const updatedProfile =
      await updateProfile(
        context.profile.id,
        {
          status: nextProfileStatus,
        }
      );

    return {
      id: restoredDoctor.id,
      status: restoredDoctor.status,

      profileStatus:
        updatedProfile.status,

      username:
        updatedProfile.username,

      accessStatus:
        updatedProfile.username
          ? updatedProfile.status ===
            "active"
            ? "active"
            : "blocked"
          : "no_access",

      accessIssued: Boolean(
        updatedProfile.username
      ),
    };
  } catch (error) {
    await supabase
      .from("doctors")
      .update({
        status: "archived",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", doctorId);

    await supabase
      .from("organization_members")
      .update({
        status:
          context.member.status ||
          "active",

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", context.member.id);

    throw error;
  }
}

export async function deleteDoctorPermanently(
  organizationId,
  doctorId
) {
  const context =
    await ensureDoctorBelongsToOrganization(
      organizationId,
      doctorId
    );

  if (
    context.doctor.status !== "archived"
  ) {
    throw new AppError(
      "Перед полным удалением врач должен быть отправлен в архив.",
      409
    );
  }

  const { data, error } = await supabase.rpc(
    "delete_doctor_permanently",
    {
      p_doctor_id: doctorId,

      p_organization_id:
        organizationId,
    }
  );

  if (error) {
    const errorMessage = String(
      error.message || ""
    );

    if (
      errorMessage.includes(
        "есть записи"
      ) ||
      errorMessage.includes(
        "история приёмов"
      ) ||
      errorMessage.includes(
        "должен быть отправлен в архив"
      )
    ) {
      throw new AppError(
        errorMessage,
        409
      );
    }

    if (
      error.code === "P0002" ||
      errorMessage.includes(
        "Врач не найден"
      )
    ) {
      throw new AppError(
        "Врач не найден или принадлежит другой организации.",
        404
      );
    }

    throw new Error(
      `Ошибка полного удаления врача: ${errorMessage}`
    );
  }

  return (
    data || {
      success: true,
      doctorId,
    }
  );
}

