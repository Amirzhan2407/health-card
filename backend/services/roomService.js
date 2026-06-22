
import { supabase } from "../config/supabaseClient.js";

function serviceError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function clean(value) {
  return String(value ?? "").trim();
}

async function getOrganizationDepartment(
  organizationId,
  departmentId
) {
  const { data, error } = await supabase
    .from("departments")
    .select("id, organization_id, name, status")
    .eq("id", departmentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw serviceError(
      `Ошибка проверки отделения: ${error.message}`
    );
  }

  if (!data) {
    throw serviceError(
      "Отделение не найдено или принадлежит другой организации.",
      404
    );
  }

  return data;
}

export async function listRooms(
  organizationId,
  departmentId = null
) {
  const orgId = clean(organizationId);
  const deptId = clean(departmentId);

  if (!orgId) {
    throw serviceError(
      "Не определена организация пользователя.",
      400
    );
  }

  let query = supabase
    .from("rooms")
    .select("*")
    .eq("organization_id", orgId)
    .order("number", { ascending: true });

  if (deptId) {
    query = query.eq("department_id", deptId);
  }

  const { data, error } = await query;

  if (error) {
    throw serviceError(
      `Ошибка получения кабинетов: ${error.message}`
    );
  }

  return data || [];
}

export async function createRoom(
  organizationId,
  input
) {
  const orgId = clean(organizationId);
  const departmentId = clean(
    input?.departmentId
  );
  const number = clean(input?.number);
  const name = clean(input?.name);

  if (!orgId) {
    throw serviceError(
      "Администратор не привязан к организации.",
      403
    );
  }

  if (!departmentId) {
    throw serviceError(
      "Выберите отделение.",
      400
    );
  }

  if (!number) {
    throw serviceError(
      "Номер кабинета обязателен.",
      400
    );
  }

  const department =
    await getOrganizationDepartment(
      orgId,
      departmentId
    );

  const {
    data: existingRoom,
    error: existingError,
  } = await supabase
    .from("rooms")
    .select("id")
    .eq(
      "organization_id",
      department.organization_id
    )
    .eq("number", number)
    .maybeSingle();

  if (existingError) {
    throw serviceError(
      `Ошибка проверки кабинета: ${existingError.message}`
    );
  }

  if (existingRoom) {
    throw serviceError(
      `Кабинет №${number} уже существует.`,
      409
    );
  }

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      organization_id:
        department.organization_id,
      department_id: department.id,
      number,
      name: name || null,
      status: "active",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw serviceError(
        `Кабинет №${number} уже существует.`,
        409
      );
    }

    throw serviceError(
      `Ошибка создания кабинета: ${error.message}`
    );
  }

  return data;
}

export async function updateRoom(
  organizationId,
  roomId,
  input
) {
  const orgId = clean(organizationId);
  const normalizedRoomId = clean(roomId);
  const departmentId = clean(
    input?.departmentId
  );
  const number = clean(input?.number);
  const name = clean(input?.name);

  if (!orgId) {
    throw serviceError(
      "Администратор не привязан к организации.",
      403
    );
  }

  if (!normalizedRoomId) {
    throw serviceError(
      "Не указан кабинет.",
      400
    );
  }

  if (!departmentId) {
    throw serviceError(
      "Выберите отделение.",
      400
    );
  }

  if (!number) {
    throw serviceError(
      "Номер кабинета обязателен.",
      400
    );
  }

  const department =
    await getOrganizationDepartment(
      orgId,
      departmentId
    );

  const {
    data: duplicateRoom,
    error: duplicateError,
  } = await supabase
    .from("rooms")
    .select("id")
    .eq("organization_id", orgId)
    .eq("number", number)
    .neq("id", normalizedRoomId)
    .maybeSingle();

  if (duplicateError) {
    throw serviceError(
      `Ошибка проверки кабинета: ${duplicateError.message}`
    );
  }

  if (duplicateRoom) {
    throw serviceError(
      `Кабинет №${number} уже существует.`,
      409
    );
  }

  const { data, error } = await supabase
    .from("rooms")
    .update({
      organization_id:
        department.organization_id,
      department_id: department.id,
      number,
      name: name || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", normalizedRoomId)
    .eq("organization_id", orgId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw serviceError(
      `Ошибка обновления кабинета: ${error.message}`
    );
  }

  if (!data) {
    throw serviceError(
      "Кабинет не найден.",
      404
    );
  }

  return data;
}

export async function deleteRoom(
  organizationId,
  roomId
) {
  const orgId = clean(organizationId);
  const normalizedRoomId = clean(roomId);

  if (!orgId || !normalizedRoomId) {
    throw serviceError(
      "Не указан кабинет или организация.",
      400
    );
  }

  const { data: room, error: roomError } =
    await supabase
      .from("rooms")
      .select("id, number")
      .eq("id", normalizedRoomId)
      .eq("organization_id", orgId)
      .maybeSingle();

  if (roomError) {
    throw serviceError(
      `Ошибка проверки кабинета: ${roomError.message}`
    );
  }

  if (!room) {
    throw serviceError(
      "Кабинет не найден.",
      404
    );
  }

  const { error: doctorsError } =
    await supabase
      .from("doctors")
      .update({
        room_id: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("room_id", normalizedRoomId);

  if (doctorsError) {
    throw serviceError(
      `Ошибка отвязки врачей: ${doctorsError.message}`
    );
  }

  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", normalizedRoomId)
    .eq("organization_id", orgId);

  if (error) {
    throw serviceError(
      `Ошибка удаления кабинета: ${error.message}`
    );
  }

  return {
    success: true,
    id: room.id,
    number: room.number,
  };
}
