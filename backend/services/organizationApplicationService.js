import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function cleanText(value = "") {
  return String(value).trim();
}

function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

const allowedApplicationTypes = [
  "open_organization",
  "update_organization",
  "chief_doctor_access",
];

const allowedOrganizationTypes = [
  "gov_polyclinics",
  "gov_hospitals",
  "private_clinics",
];

export async function createOrganizationApplication(payload) {
  const applicationType = cleanText(payload.applicationType || "open_organization");
  const organizationName = cleanText(payload.organizationName);
  const organizationType = cleanText(payload.organizationType);

  const bin = onlyDigits(payload.bin);
  const city = cleanText(payload.city);
  const address = cleanText(payload.address);
  const chiefDoctorFullName = cleanText(payload.chiefDoctorFullName);

  const senderFullName = cleanText(payload.senderFullName);
  const senderPosition = cleanText(payload.senderPosition);
  const senderPhone = cleanText(payload.senderPhone);
  const senderEmail = cleanText(payload.senderEmail);

  const medicalLicenseInfo = cleanText(payload.medicalLicenseInfo);
  const registrationDocumentInfo = cleanText(payload.registrationDocumentInfo);
  const chiefDoctorOrderInfo = cleanText(payload.chiefDoctorOrderInfo);
  const additionalDocumentsInfo = cleanText(payload.additionalDocumentsInfo);

  const comment = cleanText(payload.comment);

  if (!allowedApplicationTypes.includes(applicationType)) {
    return {
      success: false,
      status: 400,
      message: "Неверный тип заявки.",
    };
  }

  if (!organizationName) {
    return {
      success: false,
      status: 400,
      message: "Введите название организации.",
    };
  }

  if (!allowedOrganizationTypes.includes(organizationType)) {
    return {
      success: false,
      status: 400,
      message: "Неверный тип организации.",
    };
  }

  if (!bin || bin.length !== 12) {
    return {
      success: false,
      status: 400,
      message: "БИН должен состоять из 12 цифр.",
    };
  }

  if (!city) {
    return {
      success: false,
      status: 400,
      message: "Введите город.",
    };
  }

  if (!address) {
    return {
      success: false,
      status: 400,
      message: "Введите адрес организации.",
    };
  }

  if (!chiefDoctorFullName) {
    return {
      success: false,
      status: 400,
      message: "Введите ФИО главного врача.",
    };
  }

  if (!senderFullName) {
    return {
      success: false,
      status: 400,
      message: "Введите ФИО отправителя заявки.",
    };
  }

  const { data: applicationNumber, error: numberError } = await supabase.rpc(
    "generate_application_number"
  );

  if (numberError || !applicationNumber) {
    console.error("GENERATE APPLICATION NUMBER ERROR:", numberError);

    return {
      success: false,
      status: 500,
      message: "Не удалось создать номер заявки.",
    };
  }

  const { data, error } = await supabase
    .from("organization_applications")
    .insert({
      application_number: applicationNumber,

      application_type: applicationType,

      organization_name: organizationName,
      organization_type: organizationType,

      bin,
      city,
      address,
      chief_doctor_full_name: chiefDoctorFullName,

      sender_full_name: senderFullName,
      sender_position: senderPosition || null,
      sender_phone: senderPhone || null,
      sender_email: senderEmail || null,

      medical_license_info: medicalLicenseInfo || null,
      registration_document_info: registrationDocumentInfo || null,
      chief_doctor_order_info: chiefDoctorOrderInfo || null,
      additional_documents_info: additionalDocumentsInfo || null,

      comment: comment || null,

      status: "new",
    })
    .select(
      `
      id,
      application_number,
      application_type,
      organization_name,
      organization_type,
      bin,
      city,
      address,
      chief_doctor_full_name,
      sender_full_name,
      sender_position,
      sender_phone,
      sender_email,
      medical_license_info,
      registration_document_info,
      chief_doctor_order_info,
      additional_documents_info,
      comment,
      status,
      created_at
      `
    )
    .single();

  if (error) {
    console.error("CREATE ORGANIZATION APPLICATION ERROR:", error);

    if (error.code === "23505") {
      return {
        success: false,
        status: 409,
        message: "Заявка с таким БИН или номером уже существует.",
      };
    }

    return {
      success: false,
      status: 500,
      message: "Ошибка создания заявки.",
    };
  }

  await supabase.from("organization_application_history").insert({
    application_id: data.id,
    admin_id: null,
    action: "application_created",
    old_status: null,
    new_status: "new",
    comment: "Заявка отправлена организацией.",
  });

  return {
    success: true,
    status: 201,
    message: "Заявка успешно отправлена.",
    application: {
      id: data.id,
      applicationNumber: data.application_number,
      organizationName: data.organization_name,
      organizationType: data.organization_type,
      bin: data.bin,
      city: data.city,
      address: data.address,
      chiefDoctorFullName: data.chief_doctor_full_name,
      status: data.status,
      createdAt: data.created_at,
    },
  };
}

export async function getOrganizationApplications(currentAdmin) {
  let query = supabase
    .from("organization_applications")
    .select(
      `
      id,
      application_number,
      application_type,
      organization_name,
      organization_type,
      bin,
      city,
      address,
      chief_doctor_full_name,
      sender_full_name,
      sender_position,
      sender_phone,
      sender_email,
      medical_license_info,
      registration_document_info,
      chief_doctor_order_info,
      additional_documents_info,
      comment,
      review_comment,
      assigned_admin_id,
      status,
      created_at,
      updated_at,
      assigned_at,
      reviewed_at,
      approved_at,
      rejected_at,
      assigned_admin:site_admins!organization_applications_assigned_admin_id_fkey (
        id,
        full_name,
        username,
        category
      )
      `
    )
    .order("created_at", { ascending: false });

  if (currentAdmin.role !== "super_admin") {
    query = query
      .eq("organization_type", currentAdmin.category)
      .or(`assigned_admin_id.eq.${currentAdmin.id},assigned_admin_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("GET ORGANIZATION APPLICATIONS ERROR:", error);

    return {
      success: false,
      status: 500,
      message: "Ошибка получения заявок.",
    };
  }

  return {
    success: true,
    status: 200,
    applications: data || [],
  };
}

export async function getSupportAdminsForApplications(currentAdmin) {
  if (currentAdmin.role !== "super_admin") {
    return {
      success: false,
      status: 403,
      message: "Недостаточно прав.",
    };
  }

  const { data, error } = await supabase
    .from("site_admins")
    .select("id, full_name, username, category, role, is_active")
    .eq("role", "site_support")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET SUPPORT ADMINS ERROR:", error);

    return {
      success: false,
      status: 500,
      message: "Ошибка получения админов.",
    };
  }

  return {
    success: true,
    status: 200,
    admins: data || [],
  };
}

export async function assignApplicationAdmin({
  currentAdmin,
  applicationId,
  assignedAdminId,
}) {
  if (currentAdmin.role !== "super_admin") {
    return {
      success: false,
      status: 403,
      message: "Назначать ответственного может только главный админ.",
    };
  }

  const { data: application, error: appError } = await supabase
    .from("organization_applications")
    .select("id, organization_type, status, assigned_admin_id")
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    return {
      success: false,
      status: 404,
      message: "Заявка не найдена.",
    };
  }

  const { data: admin, error: adminError } = await supabase
    .from("site_admins")
    .select("id, role, category, is_active")
    .eq("id", assignedAdminId)
    .single();

  if (adminError || !admin) {
    return {
      success: false,
      status: 404,
      message: "Админ не найден.",
    };
  }

  if (admin.role !== "site_support" || !admin.is_active) {
    return {
      success: false,
      status: 400,
      message: "Можно назначить только активного обычного админа.",
    };
  }

  if (admin.category !== application.organization_type) {
    return {
      success: false,
      status: 400,
      message: "Категория админа не совпадает с типом организации.",
    };
  }

  const oldStatus = application.status;
  const newStatus =
    oldStatus === "new" || oldStatus === "needs_fix"
      ? "assigned"
      : oldStatus;

  const { data, error } = await supabase
    .from("organization_applications")
    .update({
      assigned_admin_id: assignedAdminId,
      status: newStatus,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select("*")
    .single();

  if (error) {
    console.error("ASSIGN APPLICATION ERROR:", error);

    return {
      success: false,
      status: 500,
      message: "Ошибка назначения админа.",
    };
  }

  await supabase.from("organization_application_history").insert({
    application_id: applicationId,
    admin_id: currentAdmin.id,
    action: "application_assigned",
    old_status: oldStatus,
    new_status: newStatus,
    comment: `Назначен ответственный админ.`,
  });

  return {
    success: true,
    status: 200,
    application: data,
  };
}

export async function updateApplicationStatus({
  currentAdmin,
  applicationId,
  status,
  reviewComment,
}) {
  const allowedStatuses = [
    "new",
    "assigned",
    "in_progress",
    "needs_fix",
    "resubmitted",
    "waiting_eds",
    "approved",
    "rejected",
  ];

  if (!allowedStatuses.includes(status)) {
    return {
      success: false,
      status: 400,
      message: "Неверный статус заявки.",
    };
  }

  const { data: application, error: appError } = await supabase
    .from("organization_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    return {
      success: false,
      status: 404,
      message: "Заявка не найдена.",
    };
  }

  if (currentAdmin.role !== "super_admin") {
    const isAssignedToMe = application.assigned_admin_id === currentAdmin.id;
    const sameCategory = application.organization_type === currentAdmin.category;

    if (!isAssignedToMe && !sameCategory) {
      return {
        success: false,
        status: 403,
        message: "Нет доступа к этой заявке.",
      };
    }
  }

  const updateData = {
    status,
    review_comment: reviewComment || application.review_comment || null,
    updated_at: new Date().toISOString(),
  };

  if (status === "in_progress") {
    updateData.reviewed_at = new Date().toISOString();
  }

  if (status === "approved") {
    updateData.approved_at = new Date().toISOString();
  }

  if (status === "rejected") {
    updateData.rejected_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("organization_applications")
    .update(updateData)
    .eq("id", applicationId)
    .select("*")
    .single();

  if (error) {
    console.error("UPDATE APPLICATION STATUS ERROR:", error);

    return {
      success: false,
      status: 500,
      message: "Ошибка изменения статуса.",
    };
  }

  await supabase.from("organization_application_history").insert({
    application_id: applicationId,
    admin_id: currentAdmin.id,
    action: "application_status_changed",
    old_status: application.status,
    new_status: status,
    comment: reviewComment || null,
  });

  return {
    success: true,
    status: 200,
    application: data,
  };
}