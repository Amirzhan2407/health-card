
import { supabase } from "../config/supabaseClient.js";

function createServiceError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value) {
  return String(value || "").trim();
}

export async function listOrganizations(status) {
  let query = supabase
    .from("organizations")
    .select("*");

  if (status) {
    query = query.eq(
      "status",
      normalizeText(status)
    );
  }

  const { data, error } = await query.order(
    "name",
    {
      ascending: true,
    }
  );

  if (error) {
    throw createServiceError(
      `Ошибка получения организаций: ${error.message}`
    );
  }

  return data || [];
}

export async function getOrganizationById(id) {
  const organizationId = normalizeText(id);

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw createServiceError(
      `Ошибка получения организации: ${error.message}`
    );
  }

  if (!data) {
    throw createServiceError(
      "Организация не найдена.",
      404
    );
  }

  return data;
}

export async function updateOrganization(
  id,
  input
) {
  const organizationId = normalizeText(id);

  const name = normalizeText(input?.name);
  const address = normalizeText(input?.address);
  const city = normalizeText(input?.city);

  if (!name) {
    throw createServiceError(
      "Название организации обязательно.",
      400
    );
  }

  const { data, error } = await supabase
    .from("organizations")
    .update({
      name,
      organization_name: name,
      address: address || null,
      city: city || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw createServiceError(
      `Ошибка обновления организации: ${error.message}`
    );
  }

  if (!data) {
    throw createServiceError(
      "Организация не найдена.",
      404
    );
  }

  return data;
}

export async function blockOrganization(
  id,
  status
) {
  const organizationId = normalizeText(id);
  const normalizedStatus =
    normalizeText(status).toLowerCase();

  if (
    !["active", "blocked"].includes(
      normalizedStatus
    )
  ) {
    throw createServiceError(
      "Разрешены только статусы active и blocked.",
      400
    );
  }

  const { data: organization, error } =
    await supabase
      .from("organizations")
      .update({
        status: normalizedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId)
      .select("*")
      .maybeSingle();

  if (error) {
    throw createServiceError(
      `Ошибка изменения статуса организации: ${error.message}`
    );
  }

  if (!organization) {
    throw createServiceError(
      "Организация не найдена.",
      404
    );
  }

  const profileStatus =
    normalizedStatus === "blocked"
      ? "blocked"
      : "active";

  const { error: profilesError } =
    await supabase
      .from("profiles")
      .update({
        status: profileStatus,
      })
      .eq("organization_id", organizationId);

  if (profilesError) {
    throw createServiceError(
      `Организация обновлена, но не удалось изменить доступ сотрудников: ${profilesError.message}`
    );
  }

  return organization;
}

export async function deleteOrganization(id) {
  const organizationId = normalizeText(id);

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("id, name, organization_name, bin")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    throw createServiceError(
      `Ошибка получения организации: ${organizationError.message}`
    );
  }

  if (!organization) {
    throw createServiceError(
      "Организация не найдена.",
      404
    );
  }

  const {
    data: organizationProfiles,
    error: profilesLoadError,
  } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("organization_id", organizationId);

  if (profilesLoadError) {
    throw createServiceError(
      `Ошибка получения сотрудников организации: ${profilesLoadError.message}`
    );
  }

  const profileIds = (
    organizationProfiles || []
  ).map((profile) => profile.id);

  /*
   * Удаляем сессии только пользователей
   * выбранной организации.
   * Аккаунт технической поддержки не затрагивается.
   */
  if (profileIds.length > 0) {
    const { error: sessionsError } =
      await supabase
        .from("user_refresh_tokens")
        .delete()
        .in("profile_id", profileIds);

    if (sessionsError) {
      throw createServiceError(
        `Не удалось удалить сессии сотрудников: ${sessionsError.message}`
      );
    }
  }

  /*
   * Получаем обращения организации,
   * чтобы сначала удалить сообщения.
   */
  const {
    data: conversations,
    error: conversationsLoadError,
  } = await supabase
    .from("support_conversations")
    .select("id")
    .eq("organization_id", organizationId);

  if (conversationsLoadError) {
    throw createServiceError(
      `Ошибка получения обращений организации: ${conversationsLoadError.message}`
    );
  }

  const conversationIds = (
    conversations || []
  ).map((conversation) => conversation.id);

  if (conversationIds.length > 0) {
    const { error: messagesError } =
      await supabase
        .from("support_messages")
        .delete()
        .in(
          "conversation_id",
          conversationIds
        );

    if (messagesError) {
      throw createServiceError(
        `Не удалось удалить сообщения поддержки: ${messagesError.message}`
      );
    }
  }

  const { error: conversationsError } =
    await supabase
      .from("support_conversations")
      .delete()
      .eq("organization_id", organizationId);

  if (conversationsError) {
    throw createServiceError(
      `Не удалось удалить обращения поддержки: ${conversationsError.message}`
    );
  }

  /*
   * Сначала удаляем уведомления профилей,
   * затем уведомления всей организации.
   */
  if (profileIds.length > 0) {
    const {
      error: profileNotificationsError,
    } = await supabase
      .from("notifications")
      .delete()
      .in("profile_id", profileIds);

    if (profileNotificationsError) {
      throw createServiceError(
        `Не удалось удалить уведомления сотрудников: ${profileNotificationsError.message}`
      );
    }
  }

  const {
    error: organizationNotificationsError,
  } = await supabase
    .from("notifications")
    .delete()
    .eq("organization_id", organizationId);

  if (organizationNotificationsError) {
    throw createServiceError(
      `Не удалось удалить уведомления организации: ${organizationNotificationsError.message}`
    );
  }

  /*
   * Удаляем администратора и остальных
   * пользователей организации.
   */
  const { error: profilesDeleteError } =
    await supabase
      .from("profiles")
      .delete()
      .eq("organization_id", organizationId);

  if (profilesDeleteError) {
    throw createServiceError(
      `Не удалось удалить учётные записи организации: ${profilesDeleteError.message}`
    );
  }

  /*
   * Удаляем связанную заявку по БИН,
   * чтобы этот БИН можно было использовать повторно.
   */
  if (organization.bin) {
    const { error: applicationDeleteError } =
      await supabase
        .from("organization_applications")
        .delete()
        .eq("bin", organization.bin);

    if (applicationDeleteError) {
      throw createServiceError(
        `Не удалось удалить заявку организации: ${applicationDeleteError.message}`
      );
    }
  }

  const { error: deleteError } = await supabase
    .from("organizations")
    .delete()
    .eq("id", organizationId);

  if (deleteError) {
    throw createServiceError(
      `Не удалось удалить организацию: ${deleteError.message}`
    );
  }

  return {
    id: organization.id,
    name:
      organization.name ||
      organization.organization_name,
    bin: organization.bin,
    deletedProfiles: profileIds.length,
  };
}

