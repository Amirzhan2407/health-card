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
  if (role === "super_admin") return "главный админ";
  if (role === "site_support") return "обычный админ";
  if (role === "support_admin") return "обычный админ";

  return "админ";
}

function getAdminLogin(admin) {
  return (
    admin?.username ||
    admin?.login ||
    admin?.email ||
    "admin"
  );
}

function getAdminFullName(admin) {
  return (
    admin?.full_name ||
    admin?.fullName ||
    admin?.name ||
    admin?.fio ||
    "Без ФИО"
  );
}

function getAdminDisplayLabel(admin) {
  if (!admin) return "Администратор";

  const login = getAdminLogin(admin);
  const fullName = getAdminFullName(admin);
  const role = roleLabel(admin.role);

  return `${login}, ${fullName} (${role})`;
}

function canAccess(admin, category) {
  if (admin.role === "super_admin") return true;

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

async function getAdminsMap() {
  const possibleTables = ["admins", "admin_users"];

  for (const table of possibleTables) {
    const { data, error } = await supabase.from(table).select("*");

    if (!error) {
      const map = new Map();

      for (const admin of data || []) {
        map.set(admin.id, {
          id: admin.id,
          label: getAdminDisplayLabel(admin),
          username: getAdminLogin(admin),
          fullName: getAdminFullName(admin),
          role: admin.role,
        });
      }

      return map;
    }
  }

  return new Map();
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

    const adminsMap = await getAdminsMap();

    const enrichedMessages = (messages || []).map((message) => {
      const sender = adminsMap.get(message.sender_admin_id);

      return {
        ...message,
        sender_label: sender?.label || "Администратор",
        sender_username: sender?.username || "",
        sender_full_name: sender?.fullName || "",
        sender_role: sender?.role || "",
      };
    });

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

    const { data, error } = await supabase
      .from("admin_channel_messages")
      .insert({
        channel_id: channel.id,
        sender_admin_id: req.admin.id,
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

    const senderLabel = getAdminDisplayLabel(req.admin);

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
        sender_username: getAdminLogin(req.admin),
        sender_full_name: getAdminFullName(req.admin),
        sender_role: req.admin.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка отправки сообщения.",
    });
  }
});

export default router;