
import express from "express";
import multer from "multer";

import {
  createTicket,
  getTickets,
  getTicketDetails,
  addTicketMessage,
  changeTicketStatus,
  markTicketRead,
} from "../controllers/supportController.js";

import {
  authenticateToken,
  requireRoles,
} from "../middleware/auth.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, callback) => {
    const allowedMimeTypes = [
      "image/png",
      "image/jpeg",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new Error(
          "Разрешены только PNG, JPG, PDF, DOC и DOCX файлы."
        )
      );
    }

    callback(null, true);
  },
});

router.use(authenticateToken);

/**
 * Получение списка обращений.
 * Администратор организации видит только обращения своей организации.
 * Техническая поддержка видит все обращения.
 */
router.get(
  "/conversations",
  requireRoles([
    "organization_admin",
    "support",
  ]),
  getTickets
);

/**
 * Создание нового обращения.
 * Доступно только администратору организации.
 */
router.post(
  "/conversations",
  requireRoles([
    "organization_admin",
  ]),
  upload.single("attachment"),
  createTicket
);

/**
 * Получение конкретного обращения и сообщений.
 */
router.get(
  "/conversations/:id",
  requireRoles([
    "organization_admin",
    "support",
  ]),
  getTicketDetails
);

/**
 * Отправка сообщения с необязательным вложением.
 */
router.post(
  "/conversations/:id/messages",
  requireRoles([
    "organization_admin",
    "support",
  ]),
  upload.single("attachment"),
  addTicketMessage
);

/**
 * Отметка сообщений обращения как прочитанных.
 */
router.patch(
  "/conversations/:id/read",
  requireRoles([
    "organization_admin",
    "support",
  ]),
  markTicketRead
);

/**
 * Изменение статуса обращения.
 * Доступно только технической поддержке.
 */
router.patch(
  "/conversations/:id/status",
  requireRoles(["support"]),
  changeTicketStatus
);

export default router;

