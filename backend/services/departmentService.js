
import { supabase } from "../config/supabaseClient.js";

function createServiceError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value) {
  return String(value || "").trim();
}

export async function listDepartments(organizationId) {
  const normalizedOrganizationId =
    normalizeText(organizationId);

  if (!normalizedOrganizationId) {
    throw createServiceError(
      "Не указана медицинская организация.",
      400
    );
  }

  const { data, error } = await supabase
    .from("departments")
    .select(
      `
        id,
        organization_id,
        name,
        description,
        status,
        created_at,
        updated_at
      `
    )
    .eq(
      "organization_id",
      normalizedOrganizationId
    )
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw createServiceError(
      `Ошибка получения отделений: ${error.message}`
    );
  }

  return data || [];
}

export async function createDepartment(
  organizationId,
  input
) {
  const normalizedOrganizationId =
    normalizeText(organizationId);

  const name = normalizeText(input?.name);
  const description = normalizeText(
    input?.description
  );

  if (!normalizedOrganizationId) {
    throw createServiceError(
      "Не указана медицинская организация.",
      400
    );
  }

  if (!name) {
    throw createServiceError(
      "Название отделения обязательно.",
      400
    );
  }

  const {
    data: existingDepartment,
    error: existingError,
  } = await supabase
    .from("departments")
    .select("id")
    .eq(
      "organization_id",
      normalizedOrganizationId
    )
    .ilike("name", name)
    .maybeSingle();

  if (existingError) {
    throw createServiceError(
      `Ошибка проверки отделения: ${existingError.message}`
    );
  }

  if (existingDepartment) {
    throw createServiceError(
      "Отделение с таким названием уже существует.",
      409
    );
  }

  const { data, error } = await supabase
    .from("departments")
    .insert({
      organization_id:
        normalizedOrganizationId,
      name,
      description: description || null,
      status: "active",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw createServiceError(
        "Отделение с таким названием уже существует.",
        409
      );
    }

    throw createServiceError(
      `Ошибка создания отделения: ${error.message}`
    );
  }

  return data;
}

export async function updateDepartment(
  organizationId,
  departmentId,
  input
) {
  const normalizedOrganizationId =
    normalizeText(organizationId);

  const normalizedDepartmentId =
    normalizeText(departmentId);

  const name = normalizeText(input?.name);
  const description = normalizeText(
    input?.description
  );

  if (
    !normalizedOrganizationId ||
    !normalizedDepartmentId
  ) {
    throw createServiceError(
      "Не указано отделение или организация.",
      400
    );
  }

  if (!name) {
    throw createServiceError(
      "Название отделения обязательно.",
      400
    );
  }

  const {
    data: existingDepartment,
    error: existingError,
  } = await supabase
    .from("departments")
    .select("id")
    .eq(
      "organization_id",
      normalizedOrganizationId
    )
    .ilike("name", name)
    .neq("id", normalizedDepartmentId)
    .maybeSingle();

  if (existingError) {
    throw createServiceError(
      `Ошибка проверки отделения: ${existingError.message}`
    );
  }

  if (existingDepartment) {
    throw createServiceError(
      "Другое отделение с таким названием уже существует.",
      409
    );
  }

  const { data, error } = await supabase
    .from("departments")
    .update({
      name,
      description: description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", normalizedDepartmentId)
    .eq(
      "organization_id",
      normalizedOrganizationId
    )
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw createServiceError(
        "Отделение с таким названием уже существует.",
        409
      );
    }

    throw createServiceError(
      `Ошибка обновления отделения: ${error.message}`
    );
  }

  if (!data) {
    throw createServiceError(
      "Отделение не найдено или принадлежит другой организации.",
      404
    );
  }

  return data;
}

export async function deleteDepartment(
  organizationId,
  departmentId
) {
  const normalizedOrganizationId =
    normalizeText(organizationId);

  const normalizedDepartmentId =
    normalizeText(departmentId);

  if (
    !normalizedOrganizationId ||
    !normalizedDepartmentId
  ) {
    throw createServiceError(
      "Не указано отделение или организация.",
      400
    );
  }

  const {
    data: department,
    error: getError,
  } = await supabase
    .from("departments")
    .select("id, name")
    .eq("id", normalizedDepartmentId)
    .eq(
      "organization_id",
      normalizedOrganizationId
    )
    .maybeSingle();

  if (getError) {
    throw createServiceError(
      `Ошибка получения отделения: ${getError.message}`
    );
  }

  if (!department) {
    throw createServiceError(
      "Отделение не найдено или принадлежит другой организации.",
      404
    );
  }

  /*
   * Перед удалением освобождаем кабинеты.
   * Кабинеты не удаляются, но перестают относиться
   * к удалённому отделению.
   */
  const { error: roomsError } = await supabase
    .from("rooms")
    .update({
      department_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq(
      "organization_id",
      normalizedOrganizationId
    )
    .eq(
      "department_id",
      normalizedDepartmentId
    );

  if (roomsError) {
    throw createServiceError(
      `Не удалось освободить кабинеты отделения: ${roomsError.message}`
    );
  }

  const { error: deleteError } = await supabase
    .from("departments")
    .delete()
    .eq("id", normalizedDepartmentId)
    .eq(
      "organization_id",
      normalizedOrganizationId
    );

  if (deleteError) {
    throw createServiceError(
      `Ошибка удаления отделения: ${deleteError.message}`
    );
  }

  return {
    success: true,
    id: department.id,
    name: department.name,
  };
}

