import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function cleanText(value = "") {
  return String(value || "").trim();
}

export async function createAuditLog({
  adminId = null,
  action,
  entityType = null,
  entityId = null,
  title = null,
  details = null,
  oldData = null,
  newData = null,
}) {
  if (!action) {
    return {
      success: false,
      message: "Действие журнала не указано.",
    };
  }

  const { data, error } = await supabase
    .from("admin_audit_logs")
    .insert({
      admin_id: adminId,
      action: cleanText(action),
      entity_type: entityType,
      entity_id: entityId,
      title: title ? cleanText(title) : null,
      details: details ? cleanText(details) : null,
      old_data: oldData,
      new_data: newData,
    })
    .select("*")
    .single();

  if (error) {
    console.error("CREATE AUDIT LOG ERROR:", error.message);

    return {
      success: false,
      message: error.message || "Ошибка записи журнала.",
    };
  }

  return {
    success: true,
    log: data,
  };
}

export async function getAuditLogs({ currentAdmin, filters = {} }) {
  const isSuperAdmin = ["super_admin", "site_support", "support_admin"].includes(currentAdmin?.role);

  let query = supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(isSuperAdmin ? 300 : 150);

  if (!isSuperAdmin) {
    query = query.eq("admin_id", currentAdmin.id);
  }

  if (filters.action) {
    query = query.eq("action", filters.action);
  }

  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }

  if (filters.adminId && isSuperAdmin) {
    query = query.eq("admin_id", filters.adminId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("GET AUDIT LOGS ERROR:", error.message);

    return {
      success: false,
      status: 500,
      message: error.message || "Ошибка получения журнала.",
    };
  }

  return {
    success: true,
    status: 200,
    logs: data || [],
  };
}