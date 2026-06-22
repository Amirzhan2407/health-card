import { supabase } from "../config/supabaseClient.js";

export async function listRooms(departmentId) {
  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("department_id", departmentId)
    .order("number", { ascending: true });

  if (error) {
    throw new Error(`Ошибка получения кабинетов: ${error.message}`);
  }
  return rooms;
}

export async function createRoom(departmentId, number, name) {
  if (!number) {
    throw new Error("Номер кабинета обязателен.");
  }

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      department_id: departmentId,
      number,
      name: name || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка создания кабинета: ${error.message}`);
  }
  return room;
}

export async function updateRoom(roomId, number, name) {
  const { data: room, error } = await supabase
    .from("rooms")
    .update({ number, name })
    .eq("id", roomId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ошибка обновления кабинета: ${error.message}`);
  }
  return room;
}

export async function deleteRoom(roomId) {
  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", roomId);

  if (error) {
    throw new Error(`Ошибка удаления кабинета: ${error.message}`);
  }
  return { success: true };
}
