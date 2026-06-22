import { supabase } from "../config/supabaseClient.js";

// Allowed MIME types for medical documents and certificates
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Middleware to validate file uploads (size, mime type)
 */
export function validateUpload(req, res, next) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Файл для загрузки не найден.",
      });
    }

    // 1. Check size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: "Размер файла превышает допустимый лимит 10 МБ.",
      });
    }

    // 2. Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Недопустимый формат файла. Разрешены только изображения, PDF, Word и текстовые файлы.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to check access permissions to private buckets (medical-documents and certificates)
 */
export async function authorizeFileAccess(req, res, next) {
  try {
    const { bucketName, filePath } = req.body || req.query || req.params;
    const user = req.user;

    if (!bucketName || !filePath) {
      return res.status(400).json({
        success: false,
        message: "Не указан bucketName или filePath.",
      });
    }

    // 1. Role boundaries: Support and Org Admin cannot read medical documents/certificates
    if (user.role === "support" || user.role === "organization_admin") {
      return res.status(403).json({
        success: false,
        message: "Доступ запрещен. Ваша роль не позволяет просматривать медицинские данные.",
      });
    }

    // 2. Patient and Doctor boundaries
    if (bucketName === "medical-documents") {
      // Find visit document and its visit record to verify ownership/organization boundaries
      // First, find the visit_documents record by matching file_url/filePath
      const { data: doc, error: docError } = await supabase
        .from("visit_documents")
        .select("id, visit_record_id")
        .eq("file_url", filePath)
        .maybeSingle();

      if (docError || !doc) {
        return res.status(404).json({
          success: false,
          message: "Файл не найден в базе данных.",
        });
      }

      // Query visit record
      const { data: record, error: recordError } = await supabase
        .from("visit_records")
        .select("patient_id, organization_id")
        .eq("id", doc.visit_record_id)
        .maybeSingle();

      if (recordError || !record) {
        return res.status(404).json({
          success: false,
          message: "Связанная запись приема не найдена.",
        });
      }

      if (user.role === "patient") {
        if (record.patient_id !== user.id) {
          return res.status(403).json({
            success: false,
            message: "Доступ запрещен. Вы можете просматривать только собственные медицинские документы.",
          });
        }
      } else if (user.role === "doctor") {
        if (record.organization_id !== user.organization_id) {
          return res.status(403).json({
            success: false,
            message: "Доступ запрещен. Документ принадлежит пациенту другой организации.",
          });
        }
      }
    } else if (bucketName === "certificates") {
      // Find certificate record
      const { data: cert, error: certError } = await supabase
        .from("medical_certificates")
        .select("patient_id, organization_id")
        .eq("file_url", filePath)
        .maybeSingle();

      if (certError || !cert) {
        return res.status(404).json({
          success: false,
          message: "Сертификат не найден в базе данных.",
        });
      }

      if (user.role === "patient") {
        if (cert.patient_id !== user.id) {
          return res.status(403).json({
            success: false,
            message: "Доступ запрещен. Вы можете просматривать только собственные медицинские сертификаты.",
          });
        }
      } else if (user.role === "doctor") {
        if (cert.organization_id !== user.organization_id) {
          return res.status(403).json({
            success: false,
            message: "Доступ запрещен. Сертификат выдан в другой организации.",
          });
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Неизвестный тип хранилища.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}
