
import express from "express";
import multer from "multer";

import {
  getCertificates,
  createCertificate,
  getCertificateDownloadUrl,
} from "../controllers/certificatesController.js";

import {
  authenticateToken,
  requireRoles,
} from "../middleware/auth.js";

const router = express.Router();

const MAX_FILE_SIZE =
  20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "txt",
  "csv",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",

  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",

  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  "text/plain",
  "text/csv",

  /*
   * Некоторые браузеры и Windows
   * отправляют документы как octet-stream.
   * В этом случае дополнительно проверяется
   * расширение файла.
   */
  "application/octet-stream",
]);

function getFileExtension(fileName) {
  const normalizedName = String(
    fileName || ""
  )
    .trim()
    .toLowerCase();

  const parts =
    normalizedName.split(".");

  if (parts.length < 2) {
    return "";
  }

  return parts.at(-1);
}

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },

  fileFilter(req, file, callback) {
    const extension =
      getFileExtension(
        file.originalname
      );

    const mimeType = String(
      file.mimetype || ""
    )
      .trim()
      .toLowerCase();

    const extensionAllowed =
      ALLOWED_EXTENSIONS.has(
        extension
      );

    const mimeAllowed =
      ALLOWED_MIME_TYPES.has(
        mimeType
      );

    if (
      !extensionAllowed ||
      !mimeAllowed
    ) {
      const error = new Error(
        "Разрешены файлы PDF, JPG, JPEG, PNG, WEBP, GIF, DOC, DOCX, XLS, XLSX, TXT и CSV."
      );

      error.statusCode = 400;

      callback(error);
      return;
    }

    callback(null, true);
  },
});

router.use(authenticateToken);

/*
 * Пациент получает только собственные справки.
 *
 * Врач получает справки только конкретного
 * активного приёма:
 *
 * GET /api/certificates?appointmentId=UUID
 */
router.get(
  "/",
  getCertificates
);

/*
 * Получение временной ссылки
 * для открытия или скачивания файла.
 *
 * GET /api/certificates/:id/download
 */
router.get(
  "/:id/download",
  getCertificateDownloadUrl
);

/*
 * Врач добавляет справку или документ
 * во время активного приёма.
 *
 * Content-Type: multipart/form-data
 *
 * Поля:
 * appointmentId
 * title
 * certificateType
 * issueDate
 * validUntil
 * file
 */
router.post(
  "/",
  requireRoles(["doctor"]),
  upload.single("file"),
  createCertificate
);

export default router;

