import jwt from "jsonwebtoken";
import { supabase } from "../config/supabaseClient.js";

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "your_jwt_secret_here";

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    let token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    // Fallback to cookie access token if header is not present
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Доступ запрещен. Отсутствует токен авторизации.",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Недействительный или просроченный токен.",
      });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Неверная структура токена.",
      });
    }

    // Load actual profile from database (zero-trust JWT claims)
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", decoded.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return res.status(403).json({
        success: false,
        message: "Профиль пользователя не найден в базе данных.",
      });
    }

    if (profile.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Доступ заблокирован. Учетная запись неактивна.",
      });
    }

    // Populate user object
    req.user = {
      id: profile.id,
      iin: profile.iin,
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      preferredLanguage: profile.preferred_language || "ru",
    };

    // If user is doctor or organization admin, populate organization details
    if (profile.role === "doctor" || profile.role === "organization_admin") {
      const { data: member, error: memberErr } = await supabase
        .from("organization_members")
        .select("id, organization_id, status")
        .eq("profile_id", profile.id)
        .eq("status", "active")
        .maybeSingle();

      if (memberErr || !member) {
        return res.status(403).json({
          success: false,
          message: "Пользователь не привязан к активной организации.",
        });
      }

      req.user.organization_id = member.organization_id;
      req.user.member_id = member.id;

      // If doctor, load doctor specific ID
      if (profile.role === "doctor") {
        const { data: doc, error: docErr } = await supabase
          .from("doctors")
          .select("id, specialty_id, room_id")
          .eq("member_id", member.id)
          .eq("status", "active")
          .maybeSingle();

        if (docErr || !doc) {
          return res.status(403).json({
            success: false,
            message: "Профиль врача не найден или архивирован.",
          });
        }
        req.user.doctor_id = doc.id;
        req.user.specialty_id = doc.specialty_id;
        req.user.room_id = doc.room_id;
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка аутентификации.",
    });
  }
}

export function requireRoles(roles = []) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Недостаточно прав для выполнения операции.",
      });
    }
    next();
  };
}

export function requireOrganizationBoundary(req, res, next) {
  // Support and Patient roles bypass standard organization boundary limits
  if (req.user.role === "support" || req.user.role === "patient") {
    return next();
  }

  const headerOrgId = req.headers["x-organization-id"];
  const targetOrgId = headerOrgId || req.params.organizationId || req.query.organizationId;

  if (!targetOrgId || req.user.organization_id !== targetOrgId) {
    return res.status(403).json({
      success: false,
      message: "Ошибка доступа. Попытка доступа к ресурсам чужой организации.",
    });
  }

  next();
}
