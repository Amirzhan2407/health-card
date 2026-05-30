import express from "express";
import {
  loginAdmin,
  verifyAdminToken,
  getStaffList,
  createStaffAdmin,
  changeStaffStatus,
} from "../services/adminService.js";

const router = express.Router();

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    ""
  );
}

function getUserAgent(req) {
  return req.headers["user-agent"] || "";
}

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

    const admin = verifyAdminToken(token);

    req.admin = admin;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Неверный или просроченный токен.",
    });
  }
}

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await loginAdmin({
      username,
      password,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера при входе.",
    });
  }
});

router.get("/me", requireAdminAuth, async (req, res) => {
  return res.json({
    success: true,
    admin: req.admin,
  });
});

router.get("/staff", requireAdminAuth, async (req, res) => {
  try {
    const result = await getStaffList(req.admin);

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("ADMIN STAFF LIST ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения админов.",
    });
  }
});

router.post("/staff", requireAdminAuth, async (req, res) => {
  try {
    const { fullName, username, birthDate, role, category } = req.body;

    const result = await createStaffAdmin({
      currentAdmin: req.admin,
      fullName,
      username,
      birthDate,
      role,
      category,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("ADMIN STAFF CREATE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка создания админа.",
    });
  }
});

router.patch("/staff/:id/status", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const result = await changeStaffStatus({
      currentAdmin: req.admin,
      staffId: id,
      isActive,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("ADMIN STAFF STATUS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка изменения статуса.",
    });
  }
});

export default router;