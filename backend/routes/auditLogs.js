import express from "express";
import { verifyAdminToken } from "../services/adminService.js";
import { getAuditLogs } from "../services/auditLogService.js";

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
    const result = await getAuditLogs({
      currentAdmin: req.admin,
      filters: req.query,
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("GET AUDIT LOGS ROUTE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения журнала.",
    });
  }
});

export default router;