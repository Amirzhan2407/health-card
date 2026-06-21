import express from "express";
import { supabase } from "../lib/supabaseAdmin.js";
import { requireAdminAuth } from "../middleware/requireAdminAuth.js";
import { createAuditLog } from "../services/adminAuditService.js";

const router = express.Router();

function normalizeCategory(value) {
  const map = {
    gov_polyclinic: "state_polyclinic",
    gov_polyclinics: "state_polyclinic",
    state_polyclinic: "state_polyclinic",

    gov_hospital: "state_hospital",
    gov_hospitals: "state_hospital",
    state_hospital: "state_hospital",

    private_clinic: "private_clinic",
    private_clinics: "private_clinic",
  };

  return map[value] || value;
}

function roleLabel(role) {
  return "сотрудник техподдержки";
}

function getLogin(admin) {
  return (
    admin?.username ||
    admin?.login ||
    admin?.admin_login ||
    admin?.user_login ||
    admin?.email ||
    "admin"
  );
}

function getFullName(admin) {
  return (
    admin?.fullName ||
    admin?.full_name ||
    admin?.full_name_ru ||
    admin?.name ||
    admin?.fio ||
    "Без ФИО"
  );
}

function getRole(admin) {
  return admin?.role || admin?.admin_role || "admin";
}

function makeSenderLabel({ username, fullName, role }) {
  return `${username || "admin"}, ${fullName || "Без ФИО"} (${roleLabel(role)})`;
}

function canAccess(admin, category) {
  const allowedRoles = ["super_admin", "site_support", "support_admin"];
  if (allowedRoles.includes(admin.role)) return true;

  const adminCategory =
    admin.category ||
    admin.organization_type ||
    admin.assigned_category ||
    admin.support_category;

  if (!adminCategory) return true;

  return normalizeCategory(adminCategory) === normalizeCategory(category);
}

async function ensureChannels() {
  const channels = [
    {
      category: "state_polyclinic",
      title: "Канал государственных поликлиник",
      description: "Общий канал для админов государственных поликлиник.",
    },
    {
      category: "state_hospital",
      title: "Канал государственных больниц",
      description: "Общий канал для админов государственных больниц.",
    },
    {
      category: "private_clinic",
      title: "Канал частных клиник",
      description: "Общий канал для админов частных клиник.",
    },
  ];

  for (const channel of channels) {
    await supabase
      .from("admin_channels")
      .upsert(channel, { onConflict: "category" });
  }
}

async function findAdminById(adminId) {
  if (!adminId) return null;

  const tables = ["admins", "admin_users", "support_admins"];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .or(
          `id.eq.${adminId},admin_id.eq.${adminId},user_id.eq.${adminId},auth_user_id.eq.${adminId},uid.eq.${adminId}`
        )
        .maybeSingle();

      if (!error && data) return data;
    } catch {
      continue;
    }
  }

  return null;
}

async function enrichMessage(message) {
  if (
    message.sender_username ||
    message.sender_full_name ||
    message.sender_role
  ) {
    return {
      ...message,
      sender_label: makeSenderLabel({
        username: message.sender_username,
        fullName: message.sender_full_name,
        role: message.sender_role,
      }),
    };
  }

  const admin = await findAdminById(message.sender_admin_id);

  if (!admin) {
    return {
      ...message,
      sender_label: `Неизвестный админ (${message.sender_admin_id})`,
    };
  }

  return {
    ...message,
    sender_username: getLogin(admin),
    sender_full_name: getFullName(admin),
    sender_role: getRole(admin),
    sender_label: makeSenderLabel({
      username: getLogin(admin),
      fullName: getFullName(admin),
      role: getRole(admin),
    }),
  };
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    await ensureChannels();

    const { data, error } = await supabase
      .from("admin_channels")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    const channels =
      req.admin.role === "super_admin"
        ? data || []
        : (data || []).filter((item) => canAccess(req.admin, item.category));

    return res.status(200).json({
      success: true,
      channels,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения каналов.",
    });
  }
});

router.get("/:category/messages", requireAdminAuth, async (req, res) => {
  try {
    const category = normalizeCategory(req.params.category);

    if (!canAccess(req.admin, category)) {
      return res.status(403).json({
        success: false,
        message: "Нет доступа к этому каналу.",
      });
    }

    const { data: channel, error: channelError } = await supabase
      .from("admin_channels")
      .select("*")
      .eq("category", category)
      .single();

    if (channelError || !channel) {
      return res.status(404).json({
        success: false,
        message: "Канал не найден.",
      });
    }

    const { data: messages, error } = await supabase
      .from("admin_channel_messages")
      .select("*")
      .eq("channel_id", channel.id)
      .order("created_at", { ascending: true })
      .limit(300);

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    const enrichedMessages = [];

    for (const message of messages || []) {
      enrichedMessages.push(await enrichMessage(message));
    }

    return res.status(200).json({
      success: true,
      channel,
      messages: enrichedMessages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения сообщений.",
    });
  }
});

router.post("/:category/messages", requireAdminAuth, async (req, res) => {
  try {
    const category = normalizeCategory(req.params.category);
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Сообщение не может быть пустым.",
      });
    }

    if (!canAccess(req.admin, category)) {
      return res.status(403).json({
        success: false,
        message: "Нет доступа к этому каналу.",
      });
    }

    const { data: channel, error: channelError } = await supabase
      .from("admin_channels")
      .select("*")
      .eq("category", category)
      .single();

    if (channelError || !channel) {
      return res.status(404).json({
        success: false,
        message: "Канал не найден.",
      });
    }

    const username = getLogin(req.admin);
    const fullName = getFullName(req.admin);
    const role = getRole(req.admin);

    const { data, error } = await supabase
      .from("admin_channel_messages")
      .insert({
        channel_id: channel.id,
        sender_admin_id: req.admin.id,
        sender_username: username,
        sender_full_name: fullName,
        sender_role: role,
        message,
        application_id: req.body.applicationId || null,
        organization_id: req.body.organizationId || null,
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    const senderLabel = makeSenderLabel({
      username,
      fullName,
      role,
    });

    await createAuditLog({
      adminId: req.admin.id,
      action: "channel_message_sent",
      entityType: "admin_channel",
      entityId: channel.id,
      title: "Сообщение в канал",
      details: `${senderLabel}: ${message}`,
      newData: data,
    });

    return res.status(201).json({
      success: true,
      message: {
        ...data,
        sender_label: senderLabel,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка отправки сообщения.",
    });
  }
});

// GET /api/admin-channels/organization/:orgId/messages
router.get("/organization/:orgId/messages", requireAdminAuth, async (req, res) => {
  try {
    const { orgId } = req.params;

    const { data: messages, error } = await supabase
      .from("admin_channel_messages")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    const enrichedMessages = [];
    for (const message of messages || []) {
      if (message.sender_admin_id) {
        enrichedMessages.push(await enrichMessage(message));
      } else {
        // Message from organization admin
        enrichedMessages.push({
          ...message,
          sender_label: `${message.sender_full_name} (${message.sender_username || "Админ"})`
        });
      }
    }

    return res.status(200).json({
      success: true,
      messages: enrichedMessages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения сообщений организации.",
    });
  }
});

// POST /api/admin-channels/organization/:orgId/messages
router.post("/organization/:orgId/messages", requireAdminAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Сообщение не может быть пустым.",
      });
    }

    const username = getLogin(req.admin);
    const fullName = getFullName(req.admin);
    const role = getRole(req.admin);

    const { data, error } = await supabase
      .from("admin_channel_messages")
      .insert({
        sender_admin_id: req.admin.id,
        sender_username: username,
        sender_full_name: fullName,
        sender_role: role,
        message,
        organization_id: orgId,
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    const senderLabel = makeSenderLabel({
      username,
      fullName,
      role,
    });

    return res.status(201).json({
      success: true,
      message: {
        ...data,
        sender_label: senderLabel,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка отправки ответа.",
    });
  }
});

// GET /api/admin-channels/support/conversations
router.get("/support/conversations", requireAdminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("support_conversations")
      .select("*, organization:organizations(organization_name)")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, conversations: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin-channels/support/conversations/:id/messages
router.get("/support/conversations/:id/messages", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return res.status(200).json({ success: true, messages: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin-channels/support/conversations/:id/messages
router.post("/support/conversations/:id/messages", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { messageText, attachmentUrl } = req.body;

    const username = getLogin(req.admin);
    const fullName = getFullName(req.admin);

    const { data: msg, error } = await supabase
      .from("support_messages")
      .insert({
        conversation_id: id,
        sender_type: "support",
        sender_id: req.admin.id,
        sender_name: `${fullName} (${username})`,
        message_text: messageText,
        attachment_url: attachmentUrl
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabase
      .from("support_conversations")
      .update({ updated_at: new Date().toISOString(), status: "in_work" })
      .eq("id", id);

    return res.status(201).json({ success: true, message: msg });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/admin-channels/support/conversations/:id/status
router.patch("/support/conversations/:id/status", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["open", "in_work", "resolved", "closed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Некорректный статус." });
    }

    const { data, error } = await supabase
      .from("support_conversations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, conversation: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;