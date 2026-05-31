import express from "express";
import multer from "multer";
import {
  createOrganizationApplication,
  getOrganizationApplications,
  getSupportAdminsForApplications,
  assignApplicationAdmin,
  updateApplicationStatus,
} from "../services/organizationApplicationService.js";
import { verifyAdminToken } from "../services/adminService.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error("Разрешены только PDF, JPG, PNG или WEBP документы.")
      );
    }

    cb(null, true);
  },
});

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

router.post(
  "/",
  upload.fields([
    { name: "medicalLicenseFile", maxCount: 1 },
    { name: "registrationDocumentFile", maxCount: 1 },
    { name: "chiefDoctorOrderFile", maxCount: 1 },
    { name: "additionalDocuments", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const result = await createOrganizationApplication(req.body, req.files);

      return res.status(result.status).json(result);
    } catch (error) {
      console.error("CREATE ORG APPLICATION ROUTE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Ошибка отправки заявки.",
      });
    }
  }
);

router.get("/admin", requireAdminAuth, async (req, res) => {
  try {
    const result = await getOrganizationApplications(req.admin);

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("GET ORG APPLICATIONS ROUTE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения заявок.",
    });
  }
});

router.get("/support-admins", requireAdminAuth, async (req, res) => {
  try {
    const result = await getSupportAdminsForApplications(req.admin);

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("GET SUPPORT ADMINS ROUTE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения админов.",
    });
  }
});

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
    console.error("ASSIGN ORG APPLICATION ROUTE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка назначения админа.",
    });
  }
});

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
    console.error("UPDATE ORG APPLICATION STATUS ROUTE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка изменения статуса.",
    });
  }
});

export default router;