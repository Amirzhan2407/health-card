export async function createOrganizationApplication(payload, files = {}) {
  const applicationType = cleanText(payload.applicationType || "open_organization");
  const organizationName = cleanText(payload.organizationName);
  const organizationType = cleanText(payload.organizationType);

  const bin = onlyDigits(payload.bin);
  const city = cleanText(payload.city);
  const address = cleanText(payload.address);
  const chiefDoctorFullName = cleanText(payload.chiefDoctorFullName);

  const senderFullName = cleanText(payload.senderFullName);
  const senderPhone = cleanText(payload.senderPhone);
  const senderEmail = cleanText(payload.senderEmail);

  const comment = cleanText(payload.comment);

  if (!allowedApplicationTypes.includes(applicationType)) {
    return { success: false, status: 400, message: "Неверный тип заявки." };
  }

  if (!organizationName) {
    return { success: false, status: 400, message: "Введите название организации." };
  }

  if (!allowedOrganizationTypes.includes(organizationType)) {
    return { success: false, status: 400, message: "Неверный тип организации." };
  }

  if (!bin || bin.length !== 12) {
    return { success: false, status: 400, message: "БИН должен состоять из 12 цифр." };
  }

  if (!city) {
    return { success: false, status: 400, message: "Введите город." };
  }

  if (!address) {
    return { success: false, status: 400, message: "Введите адрес организации." };
  }

  if (!chiefDoctorFullName) {
    return { success: false, status: 400, message: "Введите ФИО главного врача." };
  }

  if (!senderFullName) {
    return { success: false, status: 400, message: "Введите ФИО отправителя заявки." };
  }

  const requiredFiles = [
    ["medicalLicenseFile", "лицензию на медицинскую деятельность"],
    ["registrationDocumentFile", "документ о регистрации организации"],
    ["chiefDoctorOrderFile", "документ о назначении главного врача"],
  ];

  for (const [key, label] of requiredFiles) {
    if (!files[key]?.[0]) {
      return {
        success: false,
        status: 400,
        message: `Загрузите ${label}.`,
      };
    }
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
      sender_position: null,
      sender_phone: senderPhone || null,
      sender_email: senderEmail || null,

      medical_license_info: null,
      registration_document_info: null,
      chief_doctor_order_info: null,
      additional_documents_info: null,

      comment: comment || null,
      status: "new",
    })
    .select("*")
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

  const documentsToUpload = [
    {
      key: "medicalLicenseFile",
      type: "medical_license",
      files: files.medicalLicenseFile || [],
    },
    {
      key: "registrationDocumentFile",
      type: "registration_document",
      files: files.registrationDocumentFile || [],
    },
    {
      key: "chiefDoctorOrderFile",
      type: "chief_doctor_order",
      files: files.chiefDoctorOrderFile || [],
    },
    {
      key: "additionalDocuments",
      type: "other",
      files: files.additionalDocuments || [],
    },
  ];

  const uploadedDocs = [];

  for (const group of documentsToUpload) {
    for (const file of group.files) {
      const safeName = Buffer.from(file.originalname, "latin1")
        .toString("utf8")
        .replace(/[^\p{L}\p{N}._-]+/gu, "_");

      const filePath = `${data.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("organization-documents")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("UPLOAD DOCUMENT ERROR:", uploadError);

        return {
          success: false,
          status: 500,
          message: "Заявка создана, но произошла ошибка загрузки документа.",
        };
      }

      const { data: publicUrlData } = supabase.storage
        .from("organization-documents")
        .getPublicUrl(filePath);

      uploadedDocs.push({
        application_id: data.id,
        document_type: group.type,
        document_name: file.originalname,
        file_url: publicUrlData.publicUrl,
        file_path: filePath,
        mime_type: file.mimetype,
        file_size: file.size,
      });
    }
  }

  if (uploadedDocs.length > 0) {
    const { error: docsError } = await supabase
      .from("organization_application_documents")
      .insert(uploadedDocs);

    if (docsError) {
      console.error("SAVE DOCUMENTS ERROR:", docsError);

      return {
        success: false,
        status: 500,
        message: "Заявка создана, но документы не сохранились в базе.",
      };
    }
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