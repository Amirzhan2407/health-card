import express from "express";
import {
  createOrganizationApplication,
  getOrganizationApplications,
  getSupportAdminsForApplications,
  assignApplicationAdmin,
  updateApplicationStatus,
} from "../services/organizationApplicationService.js";
import { verifyAdminToken } from "../services/adminService.js";

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

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Неверный или просроченный токен.",
    });
  }
}

/*
  Публичная отправка заявки организацией.
  Токен админа не нужен.
*/
router.post("/", async (req, res) => {
  try {
    const result = await createOrganizationApplication(req.body);

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("CREATE ORG APPLICATION ROUTE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка отправки заявки.",
    });
  }
});

/*
  Список заявок для админки.
*/
router.get("/admin", requireAdminAuth, async (req, res) => {
  try {
    const result = await getOrganizationApplications(req.admin);

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("GET ORG APPLICATIONS ROUTE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения заявок.",
    });
  }
});

/*
  Список обычных админов для назначения заявки.
*/
router.get("/support-admins", requireAdminAuth, async (req, res) => {
  try {
    const result = await getSupportAdminsForApplications(req.admin);

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("GET SUPPORT ADMINS ROUTE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения админов.",
    });
  }
});

/*
  Назначить обычного админа на заявку.
*/
router.patch("/:id/assign", requireAdminAuth, async (req, res) => {
  try {
    const { assignedAdminId } = req.body;

    const result = await assignApplicationAdmin({
      currentAdmin: req.admin,
      applicationId: req.params.id,
      assignedAdminId,
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("ASSIGN ORG APPLICATION ROUTE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка назначения админа.",
    });
  }
});

/*
  Изменить статус заявки.
*/
router.patch("/:id/status", requireAdminAuth, async (req, res) => {
  try {
    const { status, reviewComment } = req.body;

    const result = await updateApplicationStatus({
      currentAdmin: req.admin,
      applicationId: req.params.id,
      status,
      reviewComment,
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("UPDATE ORG APPLICATION STATUS ROUTE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка изменения статуса.",
    });
  }
});

export default router;