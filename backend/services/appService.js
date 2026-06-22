import { supabase } from "../config/supabaseClient.js";
import { hashPassword } from "../utils/crypto.js";
import { sendEmail } from "./emailService.js"; // will implement in stage 15, we can import or define mock/placeholder first

export async function createApplication(data) {
  const { organizationName, bin, city, address, contactEmail, contactPhone, adminName } = data;

  const { data: newApp, error } = await supabase
    .from("organization_applications")
    .insert({
      organization_name: organizationName,
      bin,
      city,
      address,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      admin_name: adminName,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка подачи заявки: ${error.message}`);
  }

  return newApp;
}

export async function listApplications(status) {
  let query = supabase.from("organization_applications").select("*");
  if (status) {
    query = query.eq("status", status);
  }
  
  const { data: apps, error } = await query.order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Ошибка получения списка заявок: ${error.message}`);
  }
  return apps;
}

export async function approveApplication(id) {
  // 1. Get application details
  const { data: app, error: getErr } = await supabase
    .from("organization_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (getErr || !app) {
    throw new Error("Заявка не найдена.");
  }

  if (app.status !== "pending") {
    throw new Error("Заявка уже обработана.");
  }

  // 2. Create organization
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({
      name: app.organization_name,
      bin: app.bin,
      city: app.city,
      address: app.address,
      status: "active",
    })
    .select("*")
    .single();

  if (orgErr) {
    throw new Error(`Ошибка создания организации: ${orgErr.message}`);
  }

  // 3. Create Admin profile
  // Generate random password
  const tempPassword = Math.random().toString(36).slice(-10);
  const passwordHash = hashPassword(tempPassword);

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .insert({
      full_name: app.admin_name,
      email: app.contact_email,
      phone: app.contact_phone,
      password_hash: passwordHash,
      role: "organization_admin",
      status: "active",
    })
    .select("*")
    .single();

  if (profileErr) {
    // Clean up org
    await supabase.from("organizations").delete().eq("id", org.id);
    throw new Error(`Ошибка создания профиля администратора: ${profileErr.message}`);
  }

  // 4. Create membership
  const { error: memberErr } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      profile_id: profile.id,
      role: "organization_admin",
      status: "active",
    });

  if (memberErr) {
    // Clean up
    await supabase.from("profiles").delete().eq("id", profile.id);
    await supabase.from("organizations").delete().eq("id", org.id);
    throw new Error(`Ошибка привязки администратора к организации: ${memberErr.message}`);
  }

  // 5. Update application status
  await supabase
    .from("organization_applications")
    .update({ status: "approved" })
    .eq("id", id);

  // 6. Send email notification with credentials
  try {
    if (sendEmail) {
      await sendEmail({
        to: app.contact_email,
        subject: "Ваша клиника успешно одобрена в Clinic OS!",
        text: `Здравствуйте! Ваша заявка одобрена.
Организация: ${org.name}
Логин (Email): ${profile.email}
Временный пароль: ${tempPassword}
Пожалуйста, измените временный пароль после первого входа.`,
      });
    }
  } catch (emailErr) {
    console.error("Не удалось отправить email с учетными данными:", emailErr.message);
  }

  return { org, profile };
}

export async function rejectApplication(id, reason) {
  if (!reason) {
    throw new Error("Необходимо указать причину отказа.");
  }

  const { data: app, error } = await supabase
    .from("organization_applications")
    .update({
      status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка отклонения заявки: ${error.message}`);
  }

  // Notify admin via email
  try {
    if (sendEmail) {
      await sendEmail({
        to: app.contact_email,
        subject: "Результат рассмотрения заявки клиники в Clinic OS",
        text: `Здравствуйте! К сожалению, ваша заявка для организации "${app.organization_name}" отклонена.
Причина отказа: ${reason}`,
      });
    }
  } catch (emailErr) {
    console.error("Не удалось отправить email об отказе:", emailErr.message);
  }

  return app;
}
