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
      req.user = decoded;
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
      req.user = {
        id: user.id,
        email: user.email,
        role: "patient",
        iin: user.user_metadata?.iin
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
