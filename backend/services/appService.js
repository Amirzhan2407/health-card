
import crypto from "node:crypto";

import { supabase } from "../config/supabaseClient.js";
import { hashPassword } from "../utils/crypto.js";
import { sendEmail } from "./emailService.js";

function createServiceError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function generateTemporaryPassword() {
  const randomPart = crypto
    .randomBytes(6)
    .toString("base64url")
    .slice(0, 8);

  return `Clinic!${randomPart}Aa1`;
}

async function createNotificationSafe(payload) {
  try {
    const { error } = await supabase
      .from("notifications")
      .insert(payload);

    if (error) {
      console.warn(
        "Не удалось создать уведомление:",
        error.message
      );
    }
  } catch (error) {
    console.warn(
      "Не удалось создать уведомление:",
      error.message
    );
  }
}

export async function createApplication(data) {
  const organizationName = normalizeText(
    data?.organizationName
  );

  const bin = normalizeText(data?.bin);
  const city = normalizeText(data?.city);
  const address = normalizeText(data?.address);

  const contactEmail = normalizeEmail(
    data?.contactEmail
  );

  const contactPhone = normalizeText(
    data?.contactPhone
  );

  const adminName = normalizeText(
    data?.adminName
  );

  const {
    data: existingApplications,
    error: existingError,
  } = await supabase
    .from("organization_applications")
    .select("id, status")
    .eq("bin", bin)
    .in("status", ["pending", "approved"])
    .limit(1);

  if (existingError) {
    throw createServiceError(
      `Ошибка проверки заявки: ${existingError.message}`
    );
  }

  if (existingApplications?.length > 0) {
    const existingStatus =
      existingApplications[0].status;

    throw createServiceError(
      existingStatus === "approved"
        ? "Организация с таким БИН уже подключена."
        : "Заявка организации с таким БИН уже находится на рассмотрении.",
      409
    );
  }

  const { data: newApplication, error } =
    await supabase
      .from("organization_applications")
      .insert({
        organization_name: organizationName,
        bin,
        city,
        address: address || null,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        admin_name: adminName,
        status: "pending",
      })
      .select("*")
      .single();

  if (error || !newApplication) {
    throw createServiceError(
      `Ошибка подачи заявки: ${
        error?.message || "заявка не создана"
      }`
    );
  }

  await createNotificationSafe({
    recipient_role: "support",
    title: "Новая заявка поликлиники",
    message: `Организация «${organizationName}» отправила заявку на подключение.`,
    type: "organization_application_created",
    link: "/support",
    is_read: false,
    created_at: new Date().toISOString(),
  });

  return newApplication;
}

export async function listApplications(status = null) {
  let query = supabase
    .from("organization_applications")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (status) {
    query = query.eq(
      "status",
      normalizeText(status)
    );
  }

  const { data, error } = await query;

  if (error) {
    throw createServiceError(
      `Ошибка получения списка заявок: ${error.message}`
    );
  }

  return data || [];
}


export async function approveApplication(
  id,
  adminUsername
) {
  const applicationId = normalizeText(id);

  const username = normalizeText(
    adminUsername
  ).toLowerCase();

  if (!username) {
    throw createServiceError(
      "Техническая поддержка должна указать логин администратора.",
      400
    );
  }

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    throw createServiceError(
      "Логин должен содержать от 3 до 30 латинских букв, цифр или символов . _ -",
      400
    );
  }

  const { data: application, error: getError } =
    await supabase
      .from("organization_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();

  if (getError) {
    throw createServiceError(getError.message);
  }

  if (!application) {
    throw createServiceError(
      "Заявка не найдена.",
      404
    );
  }

  if (application.status !== "pending") {
    throw createServiceError(
      "Заявка уже обработана.",
      409
    );
  }

  const {
    data: existingOrganization,
    error: existingOrganizationError,
  } = await supabase
    .from("organizations")
    .select("id")
    .eq("bin", application.bin)
    .maybeSingle();

  if (existingOrganizationError) {
    throw createServiceError(
      existingOrganizationError.message
    );
  }

  if (existingOrganization) {
    throw createServiceError(
      "Организация с таким БИН уже существует.",
      409
    );
  }

  const {
    data: existingUsernameProfile,
    error: existingUsernameError,
  } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUsernameError) {
    throw createServiceError(
      existingUsernameError.message
    );
  }

  if (existingUsernameProfile) {
    throw createServiceError(
      "Этот логин уже занят. Укажите другой логин.",
      409
    );
  }

  const adminEmail = normalizeEmail(
    application.contact_email
  );

 
const {
  data: existingEmailProfile,
  error: existingEmailError,
} = await supabase
  .from("profiles")
  .select("id")
  .eq("email", adminEmail)
  .maybeSingle();

if (existingEmailError) {
  throw createServiceError(
    existingEmailError.message
  );
}

/*
  Один Email может уже принадлежать техподдержке.
  Администратор организации всё равно входит
  по логину, БИН и паролю.

  Письмо с доступами отправляется на contact_email,
  но повторно сохранять занятый Email в profiles нельзя.
*/
const profileEmail = existingEmailProfile
  ? null
  : adminEmail;



  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .insert({
      name: application.organization_name,
      organization_name:
        application.organization_name,
      bin: application.bin,
      city: application.city,
      address: application.address || null,
      email: adminEmail,
      phone:
        application.contact_phone || null,
      status: "active",
    })
    .select("*")
    .single();

  if (organizationError || !organization) {
    throw createServiceError(
      `Ошибка создания организации: ${
        organizationError?.message ||
        "организация не создана"
      }`
    );
  }

  const temporaryPassword =
    generateTemporaryPassword();

  const passwordHash = hashPassword(
    temporaryPassword
  );

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      
.insert({
  username,
  email: null,
  full_name: application.admin_name,
  password_hash: passwordHash,
  role: "organization_admin",
  status: "active",
  preferred_language: "ru",
  organization_id: organization.id,
})


      .select(
        "id, username, email, full_name, role, status, organization_id"
      )
      .single();

  if (profileError || !profile) {
    await supabase
      .from("organizations")
      .delete()
      .eq("id", organization.id);

    throw createServiceError(
      `Ошибка создания администратора: ${
        profileError?.message ||
        "профиль не создан"
      }`
    );
  }

  const {
    data: updatedApplication,
    error: applicationUpdateError,
  } = await supabase
    .from("organization_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", applicationId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (
    applicationUpdateError ||
    !updatedApplication
  ) {
    await supabase
      .from("profiles")
      .delete()
      .eq("id", profile.id);

    await supabase
      .from("organizations")
      .delete()
      .eq("id", organization.id);

    throw createServiceError(
      `Не удалось завершить одобрение заявки: ${
        applicationUpdateError?.message ||
        "статус заявки не изменён"
      }`
    );
  }

  let emailSent = false;

  try {
    await sendEmail({
      to: adminEmail,
      subject:
        "Ваша поликлиника подключена к Clinic OS",

      text: `Здравствуйте, ${application.admin_name}!

Заявка организации «${application.organization_name}» одобрена.

Данные для входа администратора:

БИН организации: ${application.bin}
Логин: ${username}
Временный пароль: ${temporaryPassword}

Для входа выберите «Администратор поликлиники» и введите логин, БИН организации и временный пароль.

После первого входа необходимо изменить временный пароль.

Clinic OS`,

      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#1e293b">
          <h2>Поликлиника подключена к Clinic OS</h2>

          <p>
            Здравствуйте,
            <b>${application.admin_name}</b>!
          </p>

          <p>
            Заявка организации
            <b>«${application.organization_name}»</b>
            успешно одобрена.
          </p>

          <div
            style="
              margin:20px 0;
              padding:18px;
              border-radius:12px;
              background:#f1f5f9;
              border:1px solid #cbd5e1;
            "
          >
            <p style="margin-top:0">
              <b>Данные для входа администратора:</b>
            </p>

            <p>
              БИН организации:
              <b>${application.bin}</b>
              <br>

              Логин:
              <b>${username}</b>
              <br>

              Временный пароль:
              <b>${temporaryPassword}</b>
            </p>
          </div>

          <p>
            Для входа выберите
            <b>«Администратор поликлиники»</b>
            и введите логин, БИН организации и временный пароль.
          </p>

          <p>
            После первого входа необходимо изменить временный пароль.
          </p>
        </div>
      `,
    });

    emailSent = true;
  } catch (emailError) {
    console.error(
      "Не удалось отправить письмо администратору:",
      emailError.message
    );
  }

  await createNotificationSafe({
    profile_id: profile.id,
    recipient_role: "organization_admin",
    organization_id: organization.id,
    title: "Организация подключена",
    message:
      "Ваша медицинская организация успешно подключена к Clinic OS.",
    type: "organization_approved",
    link: "/org-admin",
    is_read: false,
    created_at: new Date().toISOString(),
  });

  return {
    organization,
    profile,
    application: updatedApplication,
    emailSent,

    temporaryCredentials: {
      bin: application.bin,
      login: username,
      password: temporaryPassword,
    },
  };
}



export async function rejectApplication(
  id,
  reason
) {
  const applicationId = normalizeText(id);
  const rejectionReason = normalizeText(reason);

  if (!rejectionReason) {
    throw createServiceError(
      "Необходимо указать причину отказа.",
      400
    );
  }

  const { data: existingApplication, error: getError } =
    await supabase
      .from("organization_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();

  if (getError) {
    throw createServiceError(getError.message);
  }

  if (!existingApplication) {
    throw createServiceError(
      "Заявка не найдена.",
      404
    );
  }

  if (existingApplication.status !== "pending") {
    throw createServiceError(
      "Заявка уже обработана.",
      409
    );
  }

  const { data: application, error } =
    await supabase
      .from("organization_applications")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

  if (error || !application) {
    throw createServiceError(
      `Ошибка отклонения заявки: ${
        error?.message ||
        "статус заявки не изменён"
      }`
    );
  }

  try {
    await sendEmail({
      to: application.contact_email,
      subject:
        "Результат рассмотрения заявки Clinic OS",
      text: `Здравствуйте!

Заявка организации «${application.organization_name}» отклонена.

Причина:
${rejectionReason}

После исправления замечаний вы сможете отправить новую заявку.`,
    });
  } catch (emailError) {
    console.error(
      "Не удалось отправить письмо об отказе:",
      emailError.message
    );
  }

  return application;
}

