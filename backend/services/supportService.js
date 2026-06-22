
import { randomUUID } from "node:crypto";
import { supabase } from "../config/supabaseClient.js";

const SUPPORT_BUCKET =
  process.env.SUPPORT_ATTACHMENTS_BUCKET ||
  "support-attachments";

const ALLOWED_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

function createServiceError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeFileName(fileName = "attachment") {
  return String(fileName)
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

function normalizeConversationId(value) {
  const id = String(value || "").trim();

  if (!id) {
    throw createServiceError(
      "Идентификатор обращения не указан.",
      400
    );
  }

  return id;
}

function normalizeStatus(value) {
  const status = String(value || "").trim();

  if (!ALLOWED_STATUSES.includes(status)) {
    throw createServiceError(
      "Недопустимый статус обращения.",
      400
    );
  }

  return status;
}

async function uploadAttachment({
  conversationId,
  organizationId,
  file,
}) {
  if (!file) {
    return null;
  }

  if (!file.buffer) {
    throw createServiceError(
      "Не удалось прочитать прикреплённый файл.",
      400
    );
  }

  const safeName = sanitizeFileName(
    file.originalname
  );

  const folder =
    organizationId || "support";

  const storagePath = [
    folder,
    conversationId,
    `${Date.now()}-${randomUUID()}-${safeName}`,
  ].join("/");

  const { error } = await supabase.storage
    .from(SUPPORT_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType:
        file.mimetype ||
        "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw createServiceError(
      `Не удалось загрузить вложение: ${error.message}`,
      500
    );
  }

  return {
    path: storagePath,
    name: file.originalname || safeName,
    mimeType:
      file.mimetype ||
      "application/octet-stream",
    size: Number(file.size || 0),
  };
}

async function removeAttachment(storagePath) {
  if (!storagePath) {
    return;
  }

  try {
    await supabase.storage
      .from(SUPPORT_BUCKET)
      .remove([storagePath]);
  } catch {
    // Ошибка очистки файла не должна скрывать основную ошибку.
  }
}

async function createSignedAttachmentUrl(
  storagePath
) {
  if (!storagePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(SUPPORT_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error) {
    return null;
  }

  return data?.signedUrl || null;
}

async function enrichMessageAttachment(message) {
  if (!message) {
    return message;
  }

  if (!message.attachment_path) {
    return message;
  }

  const signedUrl =
    await createSignedAttachmentUrl(
      message.attachment_path
    );

  return {
    ...message,
    attachment_url:
      signedUrl ||
      message.attachment_url ||
      null,
  };
}

async function enrichMessages(messages = []) {
  return Promise.all(
    messages.map(enrichMessageAttachment)
  );
}

async function touchConversation(conversationId) {
  const { error } = await supabase
    .from("support_conversations")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (error) {
    throw createServiceError(error.message);
  }
}

async function createNotificationSafe(payload) {
  try {
    await supabase
      .from("notifications")
      .insert(payload);
  } catch {
    // Уведомление вспомогательное и не должно отменять
    // создание обращения или отправку сообщения.
  }
}

export async function createConversation({
  organizationId,
  createdBy,
  subject,
  description,
  attachment = null,
}) {
  if (!organizationId) {
    throw createServiceError(
      "Медицинская организация не указана.",
      400
    );
  }

  if (!createdBy) {
    throw createServiceError(
      "Пользователь не определён.",
      401
    );
  }

  const now = new Date().toISOString();

  const { data: conversation, error } =
    await supabase
      .from("support_conversations")
      .insert({
        organization_id: organizationId,
        created_by: createdBy,
        subject,
        description:
          description || null,
        status: "open",
        created_at: now,
        updated_at: now,
      })
      .select(`
        *,
        organization:organizations (
          id,
          name,
          bin,
          city
        )
      `)
      .single();

  if (error) {
    throw createServiceError(error.message);
  }

  let uploadedAttachment = null;

  try {
    uploadedAttachment =
      await uploadAttachment({
        conversationId: conversation.id,
        organizationId,
        file: attachment,
      });

    if (description || uploadedAttachment) {
      const message = await postMessage({
        conversationId: conversation.id,
        senderId: createdBy,
        senderRole: "organization_admin",
        messageText: description || "",
        attachment: null,
        uploadedAttachment,
        skipTouch: true,
      });

      conversation.messages = [message];
    } else {
      conversation.messages = [];
    }

    await createNotificationSafe({
      recipient_role: "support",
      organization_id: organizationId,
      title: "Новое обращение",
      message: `Поступило новое обращение: ${subject}`,
      type: "support_ticket_created",
      link: `/support/conversations`,
      is_read: false,
      created_at: now,
    });

    return conversation;
  } catch (serviceError) {
    await removeAttachment(
      uploadedAttachment?.path
    );

    await supabase
      .from("support_conversations")
      .delete()
      .eq("id", conversation.id);

    throw serviceError;
  }
}

export async function listConversations({
  organizationId = null,
  status = null,
  viewerId = null,
  viewerRole = null,
} = {}) {
  let query = supabase
    .from("support_conversations")
    .select(`
      *,
      organization:organizations (
        id,
        name,
        bin,
        city,
        status
      ),
      created_by_profile:profiles!support_conversations_created_by_fkey (
        id,
        full_name,
        role
      )
    `)
    .order("updated_at", {
      ascending: false,
    });

  if (organizationId) {
    query = query.eq(
      "organization_id",
      organizationId
    );
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data: conversations, error } =
    await query;

  if (error) {
    throw createServiceError(error.message);
  }

  const list = conversations || [];

  if (
    list.length === 0 ||
    !viewerRole
  ) {
    return list.map((conversation) => ({
      ...conversation,
      unread_count: 0,
    }));
  }

  const conversationIds = list.map(
    (conversation) => conversation.id
  );

  let unreadQuery = supabase
    .from("support_messages")
    .select(
      "id, conversation_id, sender_id, sender_role"
    )
    .in(
      "conversation_id",
      conversationIds
    )
    .eq("is_read", false);

  if (viewerRole) {
    unreadQuery = unreadQuery.neq(
      "sender_role",
      viewerRole
    );
  } else if (viewerId) {
    unreadQuery = unreadQuery.neq(
      "sender_id",
      viewerId
    );
  }

  const {
    data: unreadMessages,
    error: unreadError,
  } = await unreadQuery;

  if (unreadError) {
    throw createServiceError(
      unreadError.message
    );
  }

  const unreadCountByConversation =
    new Map();

  for (const message of unreadMessages || []) {
    const currentCount =
      unreadCountByConversation.get(
        message.conversation_id
      ) || 0;

    unreadCountByConversation.set(
      message.conversation_id,
      currentCount + 1
    );
  }

  return list.map((conversation) => ({
    ...conversation,
    unread_count:
      unreadCountByConversation.get(
        conversation.id
      ) || 0,
  }));
}

export async function getConversationDetails(
  conversationId
) {
  const id =
    normalizeConversationId(
      conversationId
    );

  const { data: conversation, error } =
    await supabase
      .from("support_conversations")
      .select(`
        *,
        organization:organizations (
          id,
          name,
          bin,
          city,
          status
        ),
        created_by_profile:profiles!support_conversations_created_by_fkey (
          id,
          full_name,
          role
        )
      `)
      .eq("id", id)
      .maybeSingle();

  if (error) {
    throw createServiceError(error.message);
  }

  if (!conversation) {
    throw createServiceError(
      "Обращение не найдено.",
      404
    );
  }

  const { data: messages, error: messagesError } =
    await supabase
      .from("support_messages")
      .select(`
        *,
        sender:profiles (
          id,
          full_name,
          role
        )
      `)
      .eq("conversation_id", id)
      .order("created_at", {
        ascending: true,
      });

  if (messagesError) {
    throw createServiceError(
      messagesError.message
    );
  }

  return {
    ...conversation,
    messages: await enrichMessages(
      messages || []
    ),
  };
}

export async function postMessage({
  conversationId,
  senderId,
  senderRole,
  messageText = "",
  attachment = null,
  uploadedAttachment = null,
  skipTouch = false,
}) {
  const id =
    normalizeConversationId(
      conversationId
    );

  if (!senderId) {
    throw createServiceError(
      "Отправитель сообщения не определён.",
      401
    );
  }

  const { data: conversation, error: conversationError } =
    await supabase
      .from("support_conversations")
      .select(
        "id, organization_id, status"
      )
      .eq("id", id)
      .maybeSingle();

  if (conversationError) {
    throw createServiceError(
      conversationError.message
    );
  }

  if (!conversation) {
    throw createServiceError(
      "Обращение не найдено.",
      404
    );
  }

  if (conversation.status === "closed") {
    throw createServiceError(
      "Закрытое обращение не принимает новые сообщения.",
      409
    );
  }

  let attachmentData =
    uploadedAttachment;

  if (!attachmentData && attachment) {
    attachmentData =
      await uploadAttachment({
        conversationId: id,
        organizationId:
          conversation.organization_id,
        file: attachment,
      });
  }

  const now = new Date().toISOString();

  const insertPayload = {
    conversation_id: id,
    sender_id: senderId,
    sender_role: senderRole,
    message_text:
      messageText || "",
    attachment_path:
      attachmentData?.path || null,
    attachment_name:
      attachmentData?.name || null,
    attachment_type:
      attachmentData?.mimeType || null,
    attachment_size:
      attachmentData?.size || null,
    is_read: false,
    created_at: now,
  };

  const { data: message, error } =
    await supabase
      .from("support_messages")
      .insert(insertPayload)
      .select(`
        *,
        sender:profiles (
          id,
          full_name,
          role
        )
      `)
      .single();

  if (error) {
    if (
      attachmentData &&
      !uploadedAttachment
    ) {
      await removeAttachment(
        attachmentData.path
      );
    }

    throw createServiceError(error.message);
  }

  if (!skipTouch) {
    await touchConversation(id);
  }

  const recipientRole =
    senderRole === "support"
      ? "organization_admin"
      : "support";

  await createNotificationSafe({
    recipient_role: recipientRole,
    organization_id:
      conversation.organization_id,
    title: "Новое сообщение техподдержки",
    message:
      senderRole === "support"
        ? "Техническая поддержка ответила на обращение."
        : "В обращении появилось новое сообщение.",
    type: "support_message",
    link:
      senderRole === "support"
        ? "/org-admin/support"
        : "/support/conversations",
    is_read: false,
    created_at: now,
  });

  return enrichMessageAttachment(message);
}

export async function updateConversationStatus({
  conversationId,
  status,
  changedBy,
}) {
  const id =
    normalizeConversationId(
      conversationId
    );

  const normalizedStatus =
    normalizeStatus(status);

  const now = new Date().toISOString();

  const updatePayload = {
    status: normalizedStatus,
    updated_at: now,
  };

  if (normalizedStatus === "resolved") {
    updatePayload.resolved_at = now;
    updatePayload.resolved_by =
      changedBy || null;
    updatePayload.closed_at = null;
  }

  if (normalizedStatus === "closed") {
    updatePayload.closed_at = now;
    updatePayload.closed_by =
      changedBy || null;
  }

  if (
    normalizedStatus === "open" ||
    normalizedStatus === "in_progress"
  ) {
    updatePayload.closed_at = null;
    updatePayload.closed_by = null;

    if (normalizedStatus === "open") {
      updatePayload.resolved_at = null;
      updatePayload.resolved_by = null;
    }
  }

  const { data: conversation, error } =
    await supabase
      .from("support_conversations")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        *,
        organization:organizations (
          id,
          name,
          bin,
          city,
          status
        )
      `)
      .maybeSingle();

  if (error) {
    throw createServiceError(error.message);
  }

  if (!conversation) {
    throw createServiceError(
      "Обращение не найдено.",
      404
    );
  }

  await createNotificationSafe({
    recipient_role:
      "organization_admin",
    organization_id:
      conversation.organization_id,
    title:
      "Изменён статус обращения",
    message:
      `Статус обращения «${conversation.subject}» изменён на ${normalizedStatus}.`,
    type:
      "support_status_changed",
    link: "/org-admin/support",
    is_read: false,
    created_at: now,
  });

  return conversation;
}

export async function markConversationRead({
  conversationId,
  userId,
  userRole,
}) {
  const id =
    normalizeConversationId(
      conversationId
    );

  let query = supabase
    .from("support_messages")
    .update({
      is_read: true,
      read_at:
        new Date().toISOString(),
    })
    .eq("conversation_id", id)
    .eq("is_read", false);

  if (userRole) {
    query = query.neq(
      "sender_role",
      userRole
    );
  } else if (userId) {
    query = query.neq(
      "sender_id",
      userId
    );
  }

  const { error } = await query;

  if (error) {
    throw createServiceError(error.message);
  }

  return true;
}

