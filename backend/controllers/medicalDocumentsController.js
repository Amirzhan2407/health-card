import * as storageService from "../services/storageService.js";
import { supabase } from "../config/supabaseClient.js";

export async function requestSignedUrl(req, res, next) {
  try {
    const { bucketName, filePath } = req.query;

    if (!bucketName || !filePath) {
      return res.status(400).json({
        success: false,
        message: "bucketName и filePath обязательны в query параметрах.",
      });
    }

    const signedUrl = await storageService.getSignedUrl(bucketName, filePath, 900); // 15 mins
    return res.status(200).json({ success: true, signedUrl });
  } catch (error) {
    next(error);
  }
}

export async function uploadVisitDocument(req, res, next) {
  try {
    const { visitRecordId } = req.body;
    const file = req.file;

    if (!visitRecordId || !file) {
      return res.status(400).json({
        success: false,
        message: "visitRecordId и файл обязательны для загрузки.",
      });
    }

    // 1. Verify doctor belongs to the organization of the visit record
    const { data: record, error: getErr } = await supabase
      .from("visit_records")
      .select("organization_id")
      .eq("id", visitRecordId)
      .single();

    if (getErr || record.organization_id !== req.user.organization_id) {
      return res.status(403).json({
        success: false,
        message: "Доступ запрещен. Запись приема принадлежит другой клинике.",
      });
    }

    // 2. Generate unique filename path inside bucket: visitRecordId/timestamp_originalname
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    const filePath = `${visitRecordId}/${Date.now()}_${cleanFileName}`;

    // 3. Upload to Supabase Storage
    await storageService.uploadFile("medical-documents", filePath, file.buffer, file.mimetype);

    // 4. Save metadata to database
    const { data: doc, error: dbErr } = await supabase
      .from("visit_documents")
      .insert({
        visit_record_id: visitRecordId,
        file_name: file.originalname,
        file_url: filePath,
        file_size: file.size,
        mime_type: file.mimetype,
      })
      .select("*")
      .single();

    if (dbErr) {
      // attempt storage cleanup
      try {
        await storageService.deleteFile("medical-documents", filePath);
      } catch (cleanErr) {
        console.error("Cleanup storage file failed:", cleanErr.message);
      }
      throw new Error(`Не удалось сохранить метаданные документа: ${dbErr.message}`);
    }

    return res.status(201).json({
      success: true,
      message: "Документ успешно загружен.",
      data: doc,
    });
  } catch (error) {
    next(error);
  }
}
