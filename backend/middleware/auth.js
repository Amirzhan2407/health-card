
import jwt from "jsonwebtoken";

import { supabase } from "../config/supabaseClient.js";

const JWT_SECRET = process.env.JWT_ACCESS_SECRET;

function normalizeRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeId(value) {
  return String(value || "").trim();
}

async function loadLegacyMembership(profileId) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, organization_id, status")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    /*
     * В новой структуре таблица organization_members
     * может отсутствовать или больше не использоваться.
     */
    if (
      error.code === "42P01" ||
      error.code === "42703"
    ) {
      return null;
    }

    throw error;
  }

  return data || null;
}

async function loadOrganization(organizationId) {
  if (!organizationId) {
    return null;
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id, status, bin")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function loadDoctorProfile(
  profileId,
  memberId = null
) {
  /*
   * Сначала пробуем новую структуру:
   * doctors.profile_id.
   */
  const byProfile = await supabase
    .from("doctors")
    .select(
      "id, specialty_id, room_id, department_id, status"
    )
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!byProfile.error && byProfile.data) {
    return byProfile.data;
  }

  if (
    byProfile.error &&
    !["42703", "42P01"].includes(
      byProfile.error.code
    )
  ) {
    throw byProfile.error;
  }

  /*
   * Поддержка старой структуры:
   * doctors.member_id.
   */
  if (!memberId) {
    return null;
  }

  const byMember = await supabase
    .from("doctors")
    .select(
      "id, specialty_id, room_id, department_id, status"
    )
    .eq("member_id", memberId)
    .maybeSingle();

  if (byMember.error) {
    if (
      ["42703", "42P01"].includes(
        byMember.error.code
      )
    ) {
      return null;
    }

    throw byMember.error;
  }

  return byMember.data || null;
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
      ? authHeader.slice(7)
      : "";

    if (
      !token &&
      req.cookies?.accessToken
    ) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Доступ запрещён. Отсутствует токен авторизации.",
      });
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

    if (!decoded?.id) {
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
      .eq("id", decoded.id)
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

    if (
      String(profile.status).toLowerCase() !==
      "active"
    ) {
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
      username: profile.username || null,
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
      /*
       * Новая структура использует
       * profiles.organization_id.
       */
      let organizationId =
        profile.organization_id || null;

      let membership = null;

      /*
       * Для старых профилей оставляем
       * резервную поддержку organization_members.
       */
      if (!organizationId) {
        membership =
          await loadLegacyMembership(
            profile.id
          );

        organizationId =
          membership?.organization_id ||
          null;
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

      if (
        String(
          organization.status || ""
        ).toLowerCase() === "blocked"
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
      }

      if (role === "doctor") {
        if (!membership) {
          membership =
            await loadLegacyMembership(
              profile.id
            );

          if (membership?.id) {
            req.user.member_id =
              membership.id;
          }
        }

        const doctor =
          await loadDoctorProfile(
            profile.id,
            membership?.id || null
          );

        if (
          !doctor ||
          String(
            doctor.status || "active"
          ).toLowerCase() !== "active"
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Профиль врача не найден или архивирован.",
          });
        }

        req.user.doctor_id =
          doctor.id;

        req.user.doctorId =
          doctor.id;

        req.user.specialty_id =
          doctor.specialty_id || null;

        req.user.room_id =
          doctor.room_id || null;

        req.user.department_id =
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

