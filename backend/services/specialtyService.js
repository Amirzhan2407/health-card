import { supabase } from "../config/supabaseClient.js";

export async function listSpecialties() {
  const { data: specialties, error } = await supabase
    .from("specialties")
    .select("*")
    .order("name_ru", { ascending: true });

  if (error) {
    throw new Error(`Ошибка получения специальностей: ${error.message}`);
  }
  return specialties;
}

export async function createSpecialty(data) {
  const { nameRu, nameKk } = data;
  if (!nameRu) {
    throw new Error("Название специальности на русском обязательно.");
  }

  const { data: specialty, error } = await supabase
    .from("specialties")
    .insert({
      name_ru: nameRu,
      name_kk: nameKk || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка создания специальности: ${error.message}`);
  }
  return specialty;
}

export async function updateSpecialty(id, data) {
  const { nameRu, nameKk } = data;
  const { data: specialty, error } = await supabase
    .from("specialties")
    .update({
      name_ru: nameRu,
      name_kk: nameKk,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка обновления специальности: ${error.message}`);
  }
  return specialty;
}
