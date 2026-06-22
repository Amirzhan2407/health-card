import { supabase } from "../config/supabaseClient.js";

export async function listOrganizations(status) {
  let query = supabase.from("organizations").select("*");
  if (status) {
    query = query.eq("status", status);
  }
  const { data: orgs, error } = await query.order("name", { ascending: true });
  if (error) {
    throw new Error(`Ошибка получения клиник: ${error.message}`);
  }
  return orgs;
}

export async function getOrganizationById(id) {
  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !org) {
    throw new Error("Организация не найдена.");
  }
  return org;
}

export async function updateOrganization(id, data) {
  const { name, address, city } = data;
  const { data: org, error } = await supabase
    .from("organizations")
    .update({ name, address, city, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка обновления организации: ${error.message}`);
  }
  return org;
}

export async function blockOrganization(id, status) {
  if (!["active", "blocked"].includes(status)) {
    throw new Error("Неверный статус организации.");
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка изменения статуса организации: ${error.message}`);
  }

  // If blocked, also block all profiles that belong to this organization!
  if (status === "blocked") {
    // Get all profile IDs
    const { data: members } = await supabase
      .from("organization_members")
      .select("profile_id")
      .eq("organization_id", id);

    if (members && members.length > 0) {
      const profileIds = members.map(m => m.profile_id);
      await supabase
        .from("profiles")
        .update({ status: "blocked" })
        .in("id", profileIds);
    }
  }

  return org;
}
