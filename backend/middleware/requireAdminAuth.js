import { verifyAdminToken } from "../services/adminService.js";
import { supabase } from "../lib/supabaseAdmin.js";

export async function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Нет токена авторизации.",
      });
    }

    const decoded = verifyAdminToken(token);

    // Validate role and active status in DB
    const { data: admin, error } = await supabase
      .from("site_admins")
      .select("id, role, is_active, username, full_name")
      .eq("id", decoded.id)
      .maybeSingle();

    if (error || !admin || !admin.is_active || admin.role !== "support") {
      return res.status(403).json({
        success: false,
        message: "Доступ запрещен. Недействительный аккаунт поддержки.",
      });
    }

    req.admin = {
      id: admin.id,
      username: admin.username,
      fullName: admin.full_name,
      role: admin.role
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Неверный или просроченный токен.",
    });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (!req.admin || req.admin.role !== "support") {
    return res.status(403).json({
      success: false,
      message: "Доступ только для администратора техподдержки.",
    });
  }

  return next();
}