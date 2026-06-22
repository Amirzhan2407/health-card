import { supabase } from "../config/supabaseClient.js";

export async function listDepartments(orgId) {
  const { data: departments, error } = await supabase
    .from("departments")
    .select("*")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Ошибка получения отделений: ${error.message}`);
  }
  return departments;
}

export async function createDepartment(orgId, name) {
  if (!name) {
    throw new Error("Название отделения обязательно.");
  }

  const { data: dept, error } = await supabase
    .from("departments")
    .insert({
      organization_id: orgId,
      name,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка создания отделения: ${error.message}`);
  }
  return dept;
}

export async function updateDepartment(orgId, deptId, name) {
  if (!name) {
    throw new Error("Название отделения обязательно.");
  }

  const { data: dept, error } = await supabase
    .from("departments")
    .update({ name })
    .eq("id", deptId)
    .eq("organization_id", orgId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка обновления отделения: ${error.message}`);
  }
  return dept;
}

export async function deleteDepartment(orgId, deptId) {
  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", deptId)
    .eq("organization_id", orgId);

  if (error) {
    throw new Error(`Ошибка удаления отделения: ${error.message}`);
  }
  return { success: true };
}
