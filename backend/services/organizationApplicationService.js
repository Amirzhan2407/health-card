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

function normalizeApplicationType(value) {
  if (value === "change_chief_doctor") return "change_chief_doctor";
  return "new_organization";
}

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function getOrganizationTypeLabel(type) {
  const map = {
    state_polyclinic: "Государственная поликлиника",
    state_hospital: "Государственная больница",
    private_clinic: "Частная клиника",
  };

  return map[type] || type || "Не указано";
}

function getApplicationTypeLabel(type) {
  if (type === "change_chief_doctor") {
    return "Изменение главного врача организации";
  }

  return "Подключение новой организации";
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
    throw new Error(`Ошибка загрузки файла "${file.originalname}": ${uploadError.message}`);
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

async function saveApplicationHistory({
  applicationId,
  action,
  oldStatus = null,
  newStatus = null,
  comment = null,
  adminId = null,
}) {
  const { error } = await supabase.from("organization_application_history").insert({
    application_id: applicationId,
    admin_id: adminId,
    action,
    old_status: oldStatus,
    new_status: newStatus,
    comment,
  });

  if (error) {
    console.error("HISTORY INSERT ERROR:", error.message);
  }
}

export async function createOrganizationApplication({ body, files }) {
  const applicationType = normalizeApplicationType(body.application_type);

  const applicationNumber = generateApplicationNumber();

  const payload = {
    application_number: applicationNumber,
    application_type: applicationType,

    organization_name: normalizeText(body.organization_name),
    organization_type: normalizeText(body.organization_type),
    organization_type_label: getOrganizationTypeLabel(body.organization_type),
    bin: normalizeText(body.bin),
    city: normalizeText(body.city),
    address: normalizeText(body.address),

    chief_doctor_full_name: normalizeText(body.chief_doctor_full_name),

    previous_chief_doctor_full_name: normalizeText(
      body.previous_chief_doctor_full_name
    ),
    new_chief_doctor_full_name: normalizeText(body.new_chief_doctor_full_name),
    new_chief_doctor_phone: normalizeText(body.new_chief_doctor_phone),
    new_chief_doctor_email: normalizeText(body.new_chief_doctor_email),

    sender_full_name: normalizeText(body.sender_full_name),
    sender_phone: normalizeText(body.sender_phone),
    sender_email: normalizeText(body.sender_email),

    comment: normalizeText(body.comment),
    status: "new",
  };

  if (!payload.organization_name) {
    throw new Error("Название организации обязательно.");
  }

  if (!payload.bin) {
    throw new Error("БИН организации обязателен.");
  }

  if (!payload.sender_email) {
    throw new Error("Email для ответа обязателен.");
  }

  if (applicationType === "new_organization" && !payload.chief_doctor_full_name) {
    throw new Error("ФИО главного врача обязательно.");
  }

  if (
    applicationType === "change_chief_doctor" &&
    (!payload.previous_chief_doctor_full_name || !payload.new_chief_doctor_full_name)
  ) {
    throw new Error("Укажите предыдущего и нового главного врача.");
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

  const fileEntries = files || {};

  for (const [documentType, fileValue] of Object.entries(fileEntries)) {
    if (!fileValue) continue;

    if (Array.isArray(fileValue)) {
      for (let index = 0; index < fileValue.length; index += 1) {
        const document = await uploadApplicationFile(
          application.id,
          documentType,
          fileValue[index],
          index
        );

        if (document) uploadedDocuments.push(document);
      }
    } else {
      const document = await uploadApplicationFile(
        application.id,
        documentType,
        fileValue,
        0
      );

      if (document) uploadedDocuments.push(document);
    }
  }

  await saveApplicationHistory({
    applicationId: application.id,
    action: "application_created",
    newStatus: "new",
    comment:
      applicationType === "change_chief_doctor"
        ? "Заявка на изменение главного врача отправлена организацией."
        : "Заявка на подключение организации отправлена организацией.",
  });

  return {
    application,
    documents: uploadedDocuments,
  };
}

export async function getOrganizationApplications({ admin }) {
  let query = supabase
    .from("organization_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (admin?.role !== "super_admin" && admin?.category) {
    query = query.eq("organization_type", admin.category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Ошибка получения заявок: ${error.message}`);
  }

  return data || [];
}

export async function getOrganizationApplicationById(id) {
  const { data: application, error } = await supabase
    .from("organization_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Ошибка получения заявки: ${error.message}`);
  }

  const { data: documents, error: documentsError } = await supabase
    .from("organization_application_documents")
    .select("*")
    .eq("application_id", id)
    .order("created_at", { ascending: true });

  if (documentsError) {
    throw new Error(`Ошибка получения документов: ${documentsError.message}`);
  }

  const { data: history, error: historyError } = await supabase
    .from("organization_application_history")
    .select("*")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  if (historyError) {
    throw new Error(`Ошибка получения истории заявки: ${historyError.message}`);
  }

  return {
    application,
    documents: documents || [],
    history: history || [],
  };
}

export async function updateOrganizationApplicationStatus({
  id,
  status,
  reviewComment,
  adminId,
}) {
  const allowedStatuses = ["new", "in_progress", "approved", "rejected"];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Недопустимый статус заявки.");
  }

  const { data: currentApplication, error: currentError } = await supabase
    .from("organization_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (currentError) {
    throw new Error(`Заявка не найдена: ${currentError.message}`);
  }

  const oldStatus = currentApplication.status;

  const { data: updatedApplication, error } = await supabase
    .from("organization_applications")
    .update({
      status,
      review_comment: normalizeText(reviewComment),
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
    oldStatus,
    newStatus: status,
    comment: normalizeText(reviewComment),
  });

  return updatedApplication;
}

export async function saveApplicationEmailHistory({
  applicationId,
  status,
  success,
  message,
}) {
  await saveApplicationHistory({
    applicationId,
    action: success ? "application_email_sent" : "application_email_failed",
    oldStatus: status,
    newStatus: status,
    comment: message,
  });
}

export function formatApplicationForAdmin(application) {
  return {
    ...application,
    application_type_label: getApplicationTypeLabel(application.application_type),
    organization_type_label: getOrganizationTypeLabel(application.organization_type),
  };
}