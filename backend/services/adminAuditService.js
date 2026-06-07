import { supabase } from "../lib/supabaseAdmin.js";

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
  try {
    await supabase.from("admin_audit_logs").insert({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      title,
      details,
      old_data: oldData,
      new_data: newData,
    });
  } catch (error) {
    console.error("AUDIT LOG ERROR:", error.message);
  }
}

export async function getAuditLogs({ admin }) {
  let query = supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (admin.role !== "super_admin") {
    query = query.eq("admin_id", admin.id);
  }

  const { data, error } = await query;

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
    logs: data || [],
  };
}