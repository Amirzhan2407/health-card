import express from "express";
import { verifyAdminToken } from "../services/adminService.js";
import { getSuperAdminDashboard } from "../services/superAdminDashboardService.js";

const router = express.Router();

function requireAdminAuth(req, res, next) {
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

    req.admin = verifyAdminToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Неверный или просроченный токен.",
    });
  }
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const result = await getSuperAdminDashboard(req.admin);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("SUPER ADMIN DASHBOARD ROUTE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения главной панели.",
    });
  }
});

export default router;