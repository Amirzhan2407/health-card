
import crypto from "crypto";

import { supabase } from "../config/supabaseClient.js";
import { hashPassword } from "../utils/crypto.js";
import { AppError } from "../utils/errorHandler.js";

function clean(value) {
  return String(value ?? "").trim();
}

function relationOne(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeUsername(value) {
  return clean(value).toLowerCase();
}

function generateTemporaryPassword() {
  const randomPart = crypto
    .randomBytes(8)
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

function isMissingMustChangePasswordColumn(error) {
  const message = String(
    error?.message || ""
  ).toLowerCase();

  return (
    message.includes(
      "must_change_password"
    ) &&
    (
      message.includes("column") ||
      message.includes("schema cache") ||
      message.includes("could not find")
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
    options.mustChangePassword !==
    undefined
  ) {
    payload.must_change_password =
      Boolean(
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
    payload.must_change_password !==
      undefined &&
    isMissingMustChangePasswordColumn(
      result.error
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
    throw new Error(
      `Ошибка обновления профиля врача: ${
        result.error?.message ||
        "профиль не обновлён"
      }`
    );
  }

  return result.data;
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

  if (error) {
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
    .select(
      "id, name_ru, name_kk, status"
    )
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

async function getDoctorContext(
  doctorId
) {
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

export async function listDoctors(
  orgId,
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
      orgId
    );

  if (specialtyId) {
    query = query.eq(
      "specialty_id",
      specialtyId
    );
  }

  const { data: docs, error } =
    await query.order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Ошибка получения списка врачей: ${error.message}`
    );
  }

  return (docs || []).map((doc) => {
    const member = relationOne(
      doc.organization_members
    );

    const profile = relationOne(
      member?.profiles
    );

    const specialty = relationOne(
      doc.specialties
    );

    const room = relationOne(
      doc.rooms
    );

    return {
      id: doc.id,
      status: doc.status,

      specialtyId:
        doc.specialty_id || null,
      specialty,

      roomId: doc.room_id || null,
      room,

      departmentId:
        room?.department_id || null,

      memberId: member?.id || null,
      profileId: profile?.id || null,

      iin: profile?.iin || "",
      fullName:
        profile?.full_name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",

      username:
        profile?.username || null,

      profileStatus:
        profile?.status || "blocked",

      accessStatus: getAccessStatus(
        profile,
        doc.status
      ),

      accessIssued:
        Boolean(profile?.username),
    };
  });
}

export async function getDoctorById(
  id
) {
  const { data: doc, error } =
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
      .eq("id", id)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Ошибка получения врача: ${error.message}`
    );
  }

  if (!doc) {
    throw new AppError(
      "Врач не найден.",
      404
    );
  }

  const member = relationOne(
    doc.organization_members
  );

  const profile = relationOne(
    member?.profiles
  );

  const specialty = relationOne(
    doc.specialties
  );

  const room = relationOne(doc.rooms);

  return {
    id: doc.id,
    status: doc.status,

    specialtyId:
      doc.specialty_id || null,
    specialty,

    roomId: doc.room_id || null,
    room,

    departmentId:
      room?.department_id || null,

    organizationId:
      member?.organization_id || null,

    memberId: member?.id || null,
    profileId: profile?.id || null,

    iin: profile?.iin || "",
    fullName:
      profile?.full_name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",

    username:
      profile?.username || null,

    profileStatus:
      profile?.status || "blocked",

    accessStatus: getAccessStatus(
      profile,
      doc.status
    ),

    accessIssued:
      Boolean(profile?.username),
  };
}

export async function createDoctor(
  orgId,
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

  if (
    !normalizedIin ||
    !normalizedFullName
  ) {
    throw new AppError(
      "ИИН и ФИО обязательны для создания врача.",
      400
    );
  }

  if (
    !/^\d{12}$/.test(
      normalizedIin
    )
  ) {
    throw new AppError(
      "ИИН должен содержать 12 цифр.",
      400
    );
  }

  if (specialtyId) {
    await ensureSpecialtyExists(
      specialtyId
    );
  }

  if (roomId) {
    await ensureRoomBelongsToOrganization(
      orgId,
      roomId
    );
  }

  const {
    data: existingProfile,
    error: existingProfileError,
  } = await supabase
    .from("profiles")
    .select("id")
    .eq("iin", normalizedIin)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(
      `Ошибка проверки ИИН: ${existingProfileError.message}`
    );
  }

  if (existingProfile) {
    throw new AppError(
      "Пользователь с таким ИИН уже существует.",
      409
    );
  }

  const unavailablePassword =
    crypto
      .randomBytes(48)
      .toString("hex");

  const unavailablePasswordHash =
    hashPassword(
      unavailablePassword
    );

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .insert({
      username: null,
      iin: normalizedIin,
      full_name: normalizedFullName,
      email: clean(email) || null,
      phone: clean(phone) || null,
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
      organization_id: orgId,
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

    email: profile.email,

    specialtyId:
      doctor.specialty_id,

    roomId: doctor.room_id,

    username: null,
    accessStatus: "no_access",
    accessIssued: false,
  };
}

export async function updateDoctor(
  orgId,
  doctorId,
  data
) {
  const {
    specialtyId,
    roomId,
    status,
  } = data;

  await ensureDoctorBelongsToOrganization(
    orgId,
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
        orgId,
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
  orgId,
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
      orgId,
      doctorId
    );

  if (
    context.doctor.status ===
    "archived"
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

  await ensureUsernameAvailable(
    normalizedUsername,
    context.profile.id
  );

  const temporaryPassword =
    generateTemporaryPassword();

  const passwordHash =
    hashPassword(
      temporaryPassword
    );

  const updatedProfile =
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

  return {
    doctorId:
      context.doctor.id,

    profileId:
      updatedProfile.id,

    username:
      updatedProfile.username,

    temporaryPassword,

    accessStatus: "active",
    accessIssued: true,
  };
}

export async function resetDoctorPassword(
  orgId,
  doctorId
) {
  const context =
    await ensureDoctorBelongsToOrganization(
      orgId,
      doctorId
    );

  if (
    context.doctor.status ===
    "archived"
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

  const temporaryPassword =
    generateTemporaryPassword();

  const passwordHash =
    hashPassword(
      temporaryPassword
    );

  const updatedProfile =
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

  return {
    doctorId:
      context.doctor.id,

    profileId:
      updatedProfile.id,

    username:
      updatedProfile.username,

    temporaryPassword,

    accessStatus:
      updatedProfile.status ===
      "active"
        ? "active"
        : "blocked",

    accessIssued: true,
  };
}

export async function setDoctorAccessStatus(
  orgId,
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
      orgId,
      doctorId
    );

  if (
    context.doctor.status ===
    "archived"
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

  const updatedProfile =
    await updateProfile(
      context.profile.id,
      {
        status: accessStatus,
      }
    );

  if (accessStatus === "blocked") {
    await revokeProfileSessions(
      context.profile.id
    );
  }

  return {
    doctorId:
      context.doctor.id,

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

    accessIssued:
      Boolean(
        updatedProfile.username
      ),
  };
}

export async function archiveDoctor(
  orgId,
  doctorId
) {
  const context =
    await ensureDoctorBelongsToOrganization(
      orgId,
      doctorId
    );

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

