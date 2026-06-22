import { supabase } from "../config/supabaseClient.js";

export async function listMembers(orgId, status) {
  let query = supabase
    .from("organization_members")
    .select(`
      id,
      organization_id,
      profile_id,
      role,
      status,
      created_at,
      profiles (
        id,
        iin,
        full_name,
        email,
        phone,
        status
      )
    `)
    .eq("organization_id", orgId);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: members, error } = await query;
  if (error) {
    throw new Error(`Ошибка получения сотрудников: ${error.message}`);
  }
  return members;
}

export async function addMember(orgId, profileId, role) {
  if (!["doctor", "organization_admin"].includes(role)) {
    throw new Error("Неверная роль для сотрудника организации.");
  }

  const { data: member, error } = await supabase
    .from("organization_members")
    .insert({
      organization_id: orgId,
      profile_id: profileId,
      role,
      status: "active",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка добавления сотрудника: ${error.message}`);
  }

  return member;
}

export async function updateMemberStatus(orgId, memberId, status) {
  if (!["active", "blocked", "archived"].includes(status)) {
    throw new Error("Неверный статус сотрудника.");
  }

  const { data: member, error } = await supabase
    .from("organization_members")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("organization_id", orgId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка изменения статуса сотрудника: ${error.message}`);
  }

  return member;
}

export async function deleteMember(orgId, memberId) {
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", orgId);

  if (error) {
    throw new Error(`Ошибка удаления сотрудника: ${error.message}`);
  }

  return { success: true };
}
