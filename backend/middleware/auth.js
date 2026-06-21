import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabaseAdmin.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Доступ запрещен. Отсутствует токен авторизации."
      });
    }

    // Try verifying custom JWT (for org admins, doctors, support)
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Strict role validation against database
      if (decoded.role === "doctor") {
        const { data: emp, error: empErr } = await supabase
          .from("organization_employees")
          .select("id, role, status, organization_id, full_name, login, email")
          .eq("id", decoded.id)
          .maybeSingle();

        if (empErr || !emp || emp.status === "dismissed" || emp.role !== "doctor") {
          return res.status(403).json({ success: false, message: "Недействительный аккаунт врача или доступ заблокирован." });
        }
        
        req.user = {
          id: emp.id,
          login: emp.login,
          role: "doctor",
          organization_id: emp.organization_id,
          email: emp.email,
          full_name: emp.full_name
        };
      } else if (decoded.role === "organization_admin") {
        const { data: orgUser, error: uErr } = await supabase
          .from("organization_users")
          .select("id, role, status, organization_id, full_name, login, email")
          .eq("id", decoded.id)
          .maybeSingle();

        if (uErr || !orgUser || orgUser.status !== "active" || orgUser.role !== "organization_admin") {
          return res.status(403).json({ success: false, message: "Недействительный аккаунт администратора или доступ заблокирован." });
        }

        req.user = {
          id: orgUser.id,
          login: orgUser.login,
          role: "organization_admin",
          organization_id: orgUser.organization_id,
          email: orgUser.email,
          full_name: orgUser.full_name
        };
      } else if (decoded.role === "support") {
        const { data: supportAdmin, error: sErr } = await supabase
          .from("site_admins")
          .select("id, role, is_active, username, full_name")
          .eq("id", decoded.id)
          .maybeSingle();

        if (sErr || !supportAdmin || !supportAdmin.is_active || supportAdmin.role !== "support") {
          return res.status(403).json({ success: false, message: "Недействительный аккаунт техподдержки или доступ заблокирован." });
        }

        req.user = {
          id: supportAdmin.id,
          login: supportAdmin.username,
          username: supportAdmin.username,
          fullName: supportAdmin.full_name,
          role: "support"
        };
      } else {
        return res.status(403).json({ success: false, message: "Недопустимая роль пользователя." });
      }

      return next();
    } catch (jwtErr) {
      // Custom JWT verification failed. Let's see if this is a Supabase Auth session token (for patients)
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(403).json({
          success: false,
          message: "Недействительный или просроченный токен."
        });
      }

      // Check if patient exists in app_users database table
      const { data: dbPat, error: patErr } = await supabase
        .from("app_users")
        .select("id, email, iin, full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (patErr || !dbPat) {
        return res.status(403).json({
          success: false,
          message: "Пациент не найден в базе данных."
        });
      }

      req.user = {
        id: dbPat.id,
        email: dbPat.email,
        role: "patient",
        iin: dbPat.iin,
        patientIin: dbPat.iin,
        full_name: dbPat.full_name,
        phone: dbPat.phone
      };
      return next();
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка аутентификации."
    });
  }
}

export function requireRoles(roles = []) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Недостаточно прав для выполнения операции."
      });
    }
    next();
  };
}
