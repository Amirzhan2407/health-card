import { supabase } from "../config/supabaseClient.js";

export async function createConversation(orgId, userId, subject, description) {
  const { data: conv, error } = await supabase
    .from("support_conversations")
    .insert({
      organization_id: orgId,
      subject,
      description,
      status: "open",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  // Auto-post the first message with description
  if (description) {
    await supabase
      .from("support_messages")
      .insert({
        conversation_id: conv.id,
        sender_id: userId,
        message_text: description,
      });
  }

  return conv;
}

export async function listConversations(orgId = null) {
  let query = supabase
    .from("support_conversations")
    .select(`
      *,
      organization:organizations (name)
    `);

  if (orgId) {
    query = query.eq("organization_id", orgId);
  }

  const { data: list, error } = await query.order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return list;
}

export async function getConversationDetails(id) {
  const { data: conv, error: getErr } = await supabase
    .from("support_conversations")
    .select(`
      *,
      organization:organizations (name)
    `)
    .eq("id", id)
    .maybeSingle();

  if (getErr || !conv) {
    throw new Error("Тикет поддержки не найден.");
  }

  // Fetch messages
  const { data: messages, error: msgErr } = await supabase
    .from("support_messages")
    .select(`
      *,
      sender:profiles (id, full_name, role)
    `)
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (msgErr) throw new Error(msgErr.message);

  return {
    ...conv,
    messages: messages || [],
  };
}

export async function postMessage(conversationId, senderId, text, attachmentUrl) {
  const { data: message, error } = await supabase
    .from("support_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      message_text: text,
      attachment_url: attachmentUrl || null,
    })
    .select(`
      *,
      sender:profiles (id, full_name, role)
    `)
    .single();

  if (error) throw new Error(error.message);

  // Update conversation updated_at
  await supabase
    .from("support_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return message;
}

export async function updateConversationStatus(id, status) {
  if (!["open", "in_work", "resolved", "closed"].includes(status)) {
    throw new Error("Недопустимый статус тикета.");
  }

  const { data: conv, error } = await supabase
    .from("support_conversations")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return conv;
}
