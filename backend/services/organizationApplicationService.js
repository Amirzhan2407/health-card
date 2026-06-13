import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не настроены.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const BUCKET_NAME = "organization-documents";

function generateApplicationNumber() {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `APP-${year}-${randomPart}`;
}

function safeFileName(originalName = "document") {
  return String(originalName)
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 160);
}

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeApplicationType(value) {
  if (value === "change_chief_doctor") return "change_chief_doctor";
  if (value === "change_administrator") return "change_administrator";
  return "new_organization";
}

function getOrganizationTypeLabel(type) {
  const map = {
    state_polyclinic: "Государственная поликлиника",
    state_hospital: "Государственная больница",
    private_clinic: "Частная клиника",
    dentistry: "Стоматология",
    laboratory: "Медицинская лаборатория",
  };

  return map[type] || type || "Не указано";
}

function normalizeFiles(files) {
  if (!files) return {};

  const normalized = {};

  Object.entries(files).forEach(([key, value]) => {
    if (!value) return;
    normalized[key] = Array.isArray(value) ? value : [value];
  });

  return normalized;
}

function normalizeAdministrators(value) {
  if (!value) return [];

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((admin) => ({
        full_name: normalizeText(admin.full_name),
        phone: normalizeText(admin.phone),
      }))
      .filter((admin) => admin.full_name || admin.phone);
  } catch {
    return [];
  }
}

async function saveApplicationHistory({
  applicationId,
  action,
  oldStatus = null,
  newStatus = null,
  comment = null,
  adminId = null,
}) {
  const payload = {
    application_id: applicationId,
    action,
    old_status: oldStatus,
    new_status: newStatus,
    comment: normalizeText(comment),
  };

  if (adminId) payload.admin_id = adminId;

  const { error } = await supabase
    .from("organization_application_history")
    .insert(payload);

  if (error) {
    console.error("APPLICATION HISTORY ERROR:", error.message);
  }
}

async function uploadApplicationFile(applicationId, documentType, file, index = 0) {
  if (!file) return null;

  const fileName = safeFileName(file.originalname);
  const filePath = `${applicationId}/${documentType}/${Date.now()}-${index}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Ошибка загрузки файла "${file.originalname}": ${uploadError.message}`
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  const { data, error } = await supabase
    .from("organization_application_documents")
    .insert({
      application_id: applicationId,
      document_type: documentType,
      document_name: file.originalname,
      file_path: filePath,
      file_url: publicUrlData?.publicUrl || null,
      mime_type: file.mimetype,
      size_bytes: file.size,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка сохранения документа: ${error.message}`);
  }

  return data;
}

export async function createOrganizationApplication({ body, files }) {
  const applicationType = normalizeApplicationType(body.application_type);
  const applicationNumber = generateApplicationNumber();
  const administrators = normalizeAdministrators(body.administrators);

  const payload = {
    application_number: applicationNumber,
    application_type: applicationType,

    organization_name: normalizeText(body.organization_name),
    organization_type: normalizeText(body.organization_type),
    organization_type_label: getOrganizationTypeLabel(body.organization_type),
    bin: normalizeText(body.bin),
    city: normalizeText(body.city),
    address: normalizeText(body.address),
    organization_email: normalizeText(body.organization_email),

    chief_doctor_full_name: normalizeText(body.chief_doctor_full_name),
    chief_doctor_phone: normalizeText(body.chief_doctor_phone),

    previous_chief_doctor_full_name: normalizeText(
      body.previous_chief_doctor_full_name
    ),
    new_chief_doctor_full_name: normalizeText(body.new_chief_doctor_full_name),
    new_chief_doctor_phone: normalizeText(body.new_chief_doctor_phone),

    administrators,

    sender_full_name: normalizeText(body.sender_full_name),
    sender_phone: normalizeText(body.sender_phone),
    sender_email: normalizeText(body.sender_email),

    comment: normalizeText(body.comment),
    status: "new",
  };

  if (!payload.organization_name) throw new Error("Название организации обязательно.");
  if (!payload.organization_type) throw new Error("Тип организации обязателен.");
  if (!payload.bin) throw new Error("БИН организации обязателен.");
  if (!payload.city) throw new Error("Город обязателен.");
  if (!payload.address) throw new Error("Адрес организации обязателен.");
  if (!payload.organization_email) throw new Error("Корпоративная почта обязательна.");
  if (!payload.sender_full_name) throw new Error("ФИО отправителя обязательно.");
  if (!payload.sender_phone) throw new Error("Телефон отправителя обязателен.");
  if (!payload.sender_email) throw new Error("Email для ответа обязателен.");

  if (applicationType === "new_organization") {
    if (!payload.chief_doctor_full_name) {
      throw new Error("ФИО главного врача обязательно.");
    }

    if (!payload.chief_doctor_phone) {
      throw new Error("Телефон главного врача обязателен.");
    }

    if (administrators.length === 0) {
      throw new Error("Нужно указать хотя бы одного администратора.");
    }
  }

  if (applicationType === "change_chief_doctor") {
    if (!payload.previous_chief_doctor_full_name) {
      throw new Error("ФИО предыдущего главного врача обязательно.");
    }

    if (!payload.new_chief_doctor_full_name) {
      throw new Error("ФИО нового главного врача обязательно.");
    }

    if (!payload.new_chief_doctor_phone) {
      throw new Error("Телефон нового главного врача обязателен.");
    }
  }

  const { data: application, error } = await supabase
    .from("organization_applications")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка создания заявки: ${error.message}`);
  }

  const uploadedDocuments = [];
  const normalizedFiles = normalizeFiles(files);

  for (const [documentType, fileList] of Object.entries(normalizedFiles)) {
    for (let index = 0; index < fileList.length; index += 1) {
      const document = await uploadApplicationFile(
        application.id,
        documentType,
        fileList[index],
        index
      );

      if (document) uploadedDocuments.push(document);
    }
  }

  await saveApplicationHistory({
    applicationId: application.id,
    action: "application_created",
    newStatus: "new",
    comment: "Заявка отправлена организацией.",
  });

  return {
    application,
    documents: uploadedDocuments,
  };
}

export async function updateApplicationStatus({
  id,
  status,
  reviewComment,
  comment,
  adminId,
}) {
  const { data: currentApplication, error: currentError } = await supabase
    .from("organization_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (currentError) {
    throw new Error(`Заявка не найдена: ${currentError.message}`);
  }

  const { data: updatedApplication, error } = await supabase
    .from("organization_applications")
    .update({
      status,
      review_comment: normalizeText(reviewComment || comment),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка обновления статуса: ${error.message}`);
  }

  await saveApplicationHistory({
    applicationId: id,
    adminId,
    action: "application_status_changed",
    oldStatus: currentApplication.status,
    newStatus: status,
    comment: normalizeText(reviewComment || comment),
  });

  return updatedApplication;
}