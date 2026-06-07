import { createClient } from "@supabase/supabase-js";
import { createAuditLog } from "./auditLogService.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizeCategory(value = "") {
  const map = {
    gov_polyclinics: "state_polyclinic",
    gov_polyclinic: "state_polyclinic",
    state_polyclinic: "state_polyclinic",

    gov_hospitals: "state_hospital",
    gov_hospital: "state_hospital",
    state_hospital: "state_hospital",

    private_clinics: "private_clinic",
    private_clinic: "private_clinic",
  };

  return map[value] || value;
}

function canAccessChannel(admin, category) {
  if (admin?.role === "super_admin") return true;

  return normalizeCategory(admin?.category) === normalizeCategory(category);
}

export async function getAdminChannels(currentAdmin) {
  const { data, error } = await supabase
    .from("admin_channels")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return {
      success: false,
      status: 500,
      message: error.message,
    };
  }

  const channels =
    currentAdmin?.role === "super_admin"
      ? data || []
      : (data || []).filter((channel) =>
          canAccessChannel(currentAdmin, channel.category)
        );

  return {
    success: true,
    status: 200,
    channels,
  };
}

export async function getChannelMessages({ currentAdmin, category }) {
  if (!canAccessChannel(currentAdmin, category)) {
    return {
      success: false,
      status: 403,
      message: "Нет доступа к этому каналу.",
    };
  }

  const normalizedCategory = normalizeCategory(category);

  const { data: channel, error: channelError } = await supabase
    .from("admin_channels")
    .select("*")
    .eq("category", normalizedCategory)
    .single();

  if (channelError || !channel) {
    return {
      success: false,
      status: 404,
      message: "Канал не найден.",
    };
  }

  const { data, error } = await supabase
    .from("admin_channel_messages")
    .select("*")
    .eq("channel_id", channel.id)
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) {
    return {
      success: false,
      status: 500,
      message: error.message,
    };
  }

  return {
    success: true,
    status: 200,
    channel,
    messages: data || [],
  };
}

export async function sendChannelMessage({
  currentAdmin,
  category,
  message,
  applicationId = null,
  organizationId = null,
}) {
  if (!message || !String(message).trim()) {
    return {
      success: false,
      status: 400,
      message: "Сообщение не может быть пустым.",
    };
  }

  if (!canAccessChannel(currentAdmin, category)) {
    return {
      success: false,
      status: 403,
      message: "Нет доступа к этому каналу.",
    };
  }

  const normalizedCategory = normalizeCategory(category);

  const { data: channel, error: channelError } = await supabase
    .from("admin_channels")
    .select("*")
    .eq("category", normalizedCategory)
    .single();

  if (channelError || !channel) {
    return {
      success: false,
      status: 404,
      message: "Канал не найден.",
    };
  }

  const { data, error } = await supabase
    .from("admin_channel_messages")
    .insert({
      channel_id: channel.id,
      sender_admin_id: currentAdmin.id,
      message: String(message).trim(),
      application_id: applicationId,
      organization_id: organizationId,
    })
    .select("*")
    .single();

  if (error) {
    return {
      success: false,
      status: 500,
      message: error.message,
    };
  }

  await createAuditLog({
    adminId: currentAdmin.id,
    action: "channel_message_sent",
    entityType: "admin_channel",
    entityId: channel.id,
    title: "Сообщение отправлено в канал",
    details: `Канал: ${channel.title}`,
    newData: data,
  });

  return {
    success: true,
    status: 201,
    message: data,
  };
}