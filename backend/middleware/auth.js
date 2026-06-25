
import jwt from "jsonwebtoken";

import { supabase } from "../config/supabaseClient.js";

const JWT_SECRET =
  process.env.JWT_ACCESS_SECRET;

function normalizeRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeId(value) {
  return String(value || "").trim();
}

function isMissingStructureError(error) {
  return ["42703", "42P01"].includes(
    String(error?.code || "")
  );
}

async function loadLegacyMembership(
  profileId
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select(`
      id,
      organization_id,
      profile_id,
      role,
      status
    `)
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    if (isMissingStructureError(error)) {
      return null;
    }

    throw error;
  }

  return data || null;
}

async function loadOrganization(
  organizationId
) {
  if (!organizationId) {
    return null;
  }

  const { data, error } = await supabase
    .from("organizations")
    .select(`
      id,
      status,
      bin
    `)
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function loadDoctorDepartmentId(
  roomId
) {
  if (!roomId) {
    return null;
  }

  const { data, error } = await supabase
    .from("rooms")
    .select("department_id")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    if (isMissingStructureError(error)) {
      return null;
    }

    throw error;
  }

  return data?.department_id || null;
}

async function enrichDoctorProfile(doctor) {
  if (!doctor) {
    return null;
  }

  const departmentId =
    await loadDoctorDepartmentId(
      doctor.room_id
    );

  return {
    ...doctor,
    department_id: departmentId,
  };
}

async function loadDoctorByProfileId(
  profileId
) {
  const { data, error } = await supabase
    .from("doctors")
    .select(`
      id,
      specialty_id,
      room_id,
      status
    `)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    /*
     * В текущей структуре doctors.profile_id
     * может отсутствовать. Тогда используем
     * связь через organization_members.
     */
    if (isMissingStructureError(error)) {
      return null;
    }

    throw error;
  }

  return enrichDoctorProfile(data);
}

async function loadDoctorByMemberId(
  memberId
) {
  if (!memberId) {
    return null;
  }

  const { data, error } = await supabase
    .from("doctors")
    .select(`
      id,
      specialty_id,
      room_id,
      status
    `)
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) {
    if (isMissingStructureError(error)) {
      return null;
    }

    throw error;
  }

  return enrichDoctorProfile(data);
}

async function loadDoctorProfile(
  profileId,
  memberId = null
) {
  /*
   * Сначала поддерживаем вариант,
   * где doctors напрямую содержит profile_id.
   */
  const doctorByProfile =
    await loadDoctorByProfileId(profileId);

  if (doctorByProfile) {
    return doctorByProfile;
  }

  /*
   * Основная структура текущего проекта:
   *
   * profiles
   *   -> organization_members
   *   -> doctors
   */
  return loadDoctorByMemberId(memberId);
}

export async function authenticateToken(
  req,
  res,
  next
) {
  try {
    const authHeader =
      req.headers.authorization || "";

    let token = authHeader.startsWith(
      "Bearer "
    )
      ? authHeader.slice(7).trim()
      : "";

    if (
      !token &&
      req.cookies?.accessToken
    ) {
      token = String(
        req.cookies.accessToken
      ).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Доступ запрещён. Отсутствует токен авторизации.",
      });
    }

    if (!JWT_SECRET) {
      throw new Error(
        "Переменная JWT_ACCESS_SECRET не настроена."
      );
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        JWT_SECRET
      );
    } catch {
      return res.status(401).json({
        success: false,
        message:
          "Недействительный или просроченный токен.",
      });
    }

    const profileId = normalizeId(
      decoded?.id
    );

    if (!profileId) {
      return res.status(401).json({
        success: false,
        message:
          "Неверная структура токена.",
      });
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return res.status(401).json({
        success: false,
        message:
          "Профиль пользователя не найден.",
      });
    }

    const profileStatus = String(
      profile.status || ""
    ).toLowerCase();

    if (profileStatus !== "active") {
      return res.status(403).json({
        success: false,
        message:
          "Доступ заблокирован. Учётная запись неактивна.",
      });
    }

    const role = normalizeRole(
      profile.role
    );

    req.user = {
      id: profile.id,

      username:
        profile.username || null,

      iin: profile.iin || null,

      fullName:
        profile.full_name || null,

      full_name:
        profile.full_name || null,

      email: profile.email || null,
      phone: profile.phone || null,

      role,

      preferredLanguage:
        profile.preferred_language ||
        "ru",

      preferred_language:
        profile.preferred_language ||
        "ru",

      organization_id:
        profile.organization_id || null,

      organizationId:
        profile.organization_id || null,
    };

    if (
      role === "organization_admin" ||
      role === "doctor"
    ) {
      let organizationId =
        normalizeId(
          profile.organization_id
        );

      let membership = null;

      /*
       * В текущей базе организация врача
       * определяется через organization_members.
       */
      if (!organizationId) {
        membership =
          await loadLegacyMembership(
            profile.id
          );

        organizationId = normalizeId(
          membership?.organization_id
        );
      }

      /*
       * Даже если organization_id есть в profiles,
       * членство всё равно требуется врачу,
       * поскольку doctors связан через member_id.
       */
      if (
        role === "doctor" &&
        !membership
      ) {
        membership =
          await loadLegacyMembership(
            profile.id
          );

        if (!organizationId) {
          organizationId = normalizeId(
            membership?.organization_id
          );
        }
      }

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message:
            "Пользователь не привязан к медицинской организации.",
        });
      }

      const organization =
        await loadOrganization(
          organizationId
        );

      if (!organization) {
        return res.status(403).json({
          success: false,
          message:
            "Медицинская организация не найдена.",
        });
      }

      const organizationStatus =
        String(
          organization.status || ""
        ).toLowerCase();

      if (
        organizationStatus === "blocked"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Медицинская организация заблокирована.",
        });
      }

      req.user.organization_id =
        organizationId;

      req.user.organizationId =
        organizationId;

      req.user.organization_bin =
        organization.bin || null;

      if (membership?.id) {
        req.user.member_id =
          membership.id;

        req.user.memberId =
          membership.id;
      }

      if (role === "doctor") {
        if (!membership?.id) {
          return res.status(403).json({
            success: false,
            message:
              "Профиль врача не привязан к организации.",
          });
        }

        const doctor =
          await loadDoctorProfile(
            profile.id,
            membership.id
          );

        if (!doctor) {
          return res.status(403).json({
            success: false,
            message:
              "Профиль врача не найден.",
          });
        }

        const doctorStatus =
          String(
            doctor.status || ""
          ).toLowerCase();

        if (
          doctorStatus !== "active"
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Профиль врача архивирован или заблокирован.",
          });
        }

        req.user.doctor_id =
          doctor.id;

        req.user.doctorId =
          doctor.id;

        req.user.specialty_id =
          doctor.specialty_id || null;

        req.user.specialtyId =
          doctor.specialty_id || null;

        req.user.room_id =
          doctor.room_id || null;

        req.user.roomId =
          doctor.room_id || null;

        req.user.department_id =
          doctor.department_id || null;

        req.user.departmentId =
          doctor.department_id || null;
      }
    }

    return next();
  } catch (error) {
    console.error(
      "Ошибка middleware авторизации:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Ошибка аутентификации.",
    });
  }
}

export function requireRoles(
  roles = []
) {
  const allowedRoles = roles.map(
    normalizeRole
  );

  return (req, res, next) => {
    const currentRole =
      normalizeRole(req.user?.role);

    if (
      !currentRole ||
      !allowedRoles.includes(
        currentRole
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Недостаточно прав для выполнения операции.",
      });
    }

    return next();
  };
}

export function requireOrganizationBoundary(
  req,
  res,
  next
) {
  const role = normalizeRole(
    req.user?.role
  );

  if (
    role === "support" ||
    role === "patient"
  ) {
    return next();
  }

  const userOrganizationId =
    normalizeId(
      req.user?.organization_id ||
        req.user?.organizationId
    );

  const targetOrganizationId =
    normalizeId(
      req.headers[
        "x-organization-id"
      ] ||
        req.params?.organizationId ||
        req.params?.organization_id ||
        req.params?.id ||
        req.query?.organizationId ||
        req.query?.organization_id ||
        req.body?.organizationId ||
        req.body?.organization_id
    );

  if (!userOrganizationId) {
    return res.status(403).json({
      success: false,
      message:
        "Пользователь не привязан к организации.",
    });
  }

  if (
    targetOrganizationId &&
    userOrganizationId !==
      targetOrganizationId
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Попытка доступа к данным другой организации.",
    });
  }

  return next();
}

