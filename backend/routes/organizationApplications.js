import express from "express";
import { supabase } from "../lib/supabaseAdmin.js";
import { requireAdminAuth } from "../middleware/requireAdminAuth.js";
import { createAuditLog } from "../services/adminAuditService.js";

const router = express.Router();

const ALLOWED_STATUSES = [
  "new",
  "assigned",
  "in_progress",
  "needs_fix",
  "resent",
  "waiting_eds",
  "approved",
  "rejected",
];

function normalizeStatus(status) {
  if (!status || status === "all" || status === "undefined") return null;
  return String(status).trim();
}

function normalizeApplicationType(type) {
  if (type === "change_chief_doctor") return "change_chief_doctor";
  if (type === "change_organization_data") return "change_organization_data";
  return "new_organization";
}

async function getDocuments(applicationId) {
  const tables = [
    "organization_application_documents",
    "application_documents",
    "organization_documents",
  ];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false });

    if (!error) return data || [];
  }

  return [];
}

async function getHistory(applicationId) {
  const tables = [
    "organization_application_history",
    "application_history",
    "organization_change_history",
  ];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false });

    if (!error) return data || [];
  }

  return [];
}

async function insertHistory({
  applicationId,
  adminId,
  action,
  oldStatus,
  newStatus,
  comment,
}) {
  const tables = ["organization_application_history", "application_history"];

  for (const table of tables) {
    const { error } = await supabase.from(table).insert({
      application_id: applicationId,
      admin_id: adminId || null,
      action,
      old_status: oldStatus || null,
      new_status: newStatus || null,
      comment: comment || null,
    });

    if (!error) return true;
  }

  return false;
}

async function createOrganizationFromApplication(application, adminId) {
  const payload = {
    application_id: application.id,
    organization_name: application.organization_name,
    organization_type: application.organization_type,
    organization_type_label: application.organization_type_label,
    bin: application.bin,
    city: application.city,
    address: application.address,
    chief_doctor_full_name:
      application.new_chief_doctor_full_name ||
      application.chief_doctor_full_name,
    chief_doctor_email:
      application.new_chief_doctor_email || application.chief_doctor_email,
    chief_doctor_phone:
      application.new_chief_doctor_phone || application.chief_doctor_phone,
    organization_email:
      application.organization_email || application.sender_email,
    organization_phone:
      application.organization_phone || application.sender_phone,
    status: "waiting_eds",
    assigned_admin_id: application.assigned_admin_id || adminId || null,
    eds_status: "not_confirmed",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("organizations")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("CREATE ORGANIZATION ERROR:", error.message);
    return null;
  }

  await supabase
    .from("organization_applications")
    .update({
      organization_id: data.id,
      status: "waiting_eds",
    })
    .eq("id", application.id);

  return data;
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const status = normalizeStatus(req.query.status);

    let query = supabase
      .from("organization_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (req.admin.role !== "super_admin") {
      query = query.or(
        `assigned_admin_id.eq.${req.admin.id},assigned_admin_id.is.null`
      );
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    const applications = (data || []).map((item) => ({
      ...item,
      application_type: normalizeApplicationType(item.application_type),
    }));

    return res.status(200).json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error("GET APPLICATIONS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения заявок.",
    });
  }
});

router.get("/admin", requireAdminAuth, async (req, res) => {
  req.url = "/";
  return router.handle(req, res);
});

router.get("/support-admins", requireAdminAuth, async (req, res) => {
  try {
    const tables = ["admins", "admin_users"];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .in("role", ["site_support", "support_admin"])
        .order("created_at", { ascending: false });

      if (!error) {
        return res.status(200).json({
          success: true,
          admins: data || [],
        });
      }
    }

    return res.status(200).json({
      success: true,
      admins: [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения админов.",
    });
  }
});

router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: application, error } = await supabase
      .from("organization_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !application) {
      return res.status(404).json({
        success: false,
        message: "Заявка не найдена.",
      });
    }

    if (
      req.admin.role !== "super_admin" &&
      application.assigned_admin_id &&
      application.assigned_admin_id !== req.admin.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Нет доступа к этой заявке.",
      });
    }

    const documents = await getDocuments(id);
    const history = await getHistory(id);

    return res.status(200).json({
      success: true,
      application: {
        ...application,
        application_type: normalizeApplicationType(application.application_type),
      },
      documents,
      history,
    });
  } catch (error) {
    console.error("GET APPLICATION ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения заявки.",
    });
  }
});

router.patch("/:id/status", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const status = req.body.status;
    const comment =
      req.body.reviewComment || req.body.comment || req.body.review_comment || "";

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Неверный статус заявки.",
      });
    }

    if (status === "rejected" && !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "При отклонении заявки нужно указать причину.",
      });
    }

    const { data: current, error: currentError } = await supabase
      .from("organization_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (currentError || !current) {
      return res.status(404).json({
        success: false,
        message: "Заявка не найдена.",
      });
    }

    const updatePayload = {
      status,
      review_comment: comment || null,
    };

    const { data: updated, error: updateError } = await supabase
      .from("organization_applications")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: updateError.message,
      });
    }

    await insertHistory({
      applicationId: id,
      adminId: req.admin.id,
      action: "application_status_changed",
      oldStatus: current.status,
      newStatus: status,
      comment,
    });

    await createAuditLog({
      adminId: req.admin.id,
      action: "application_status_changed",
      entityType: "organization_application",
      entityId: id,
      title: "Изменён статус заявки",
      details: `${current.status || "—"} → ${status}`,
      oldData: current,
      newData: updated,
    });

    let organization = null;

    if (status === "approved") {
      organization = await createOrganizationFromApplication(updated, req.admin.id);
    }

    return res.status(200).json({
      success: true,
      message: "Статус заявки обновлён.",
      application: updated,
      organization,
    });
  } catch (error) {
    console.error("UPDATE APPLICATION STATUS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка изменения статуса заявки.",
    });
  }
});

router.patch("/:id/assign", requireAdminAuth, async (req, res) => {
  try {
    if (req.admin.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Назначать ответственного может только главный админ.",
      });
    }

    const { id } = req.params;
    const assignedAdminId =
      req.body.assignedAdminId || req.body.adminId || req.body.assigned_admin_id;

    if (!assignedAdminId) {
      return res.status(400).json({
        success: false,
        message: "Не выбран администратор.",
      });
    }

    const { data: current, error: currentError } = await supabase
      .from("organization_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (currentError || !current) {
      return res.status(404).json({
        success: false,
        message: "Заявка не найдена.",
      });
    }

    const { data: updated, error } = await supabase
      .from("organization_applications")
      .update({
        assigned_admin_id: assignedAdminId,
        status: current.status === "new" ? "assigned" : current.status,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    await insertHistory({
      applicationId: id,
      adminId: req.admin.id,
      action: "application_assigned",
      oldStatus: current.status,
      newStatus: updated.status,
      comment: "Заявка назначена ответственному администратору.",
    });

    await createAuditLog({
      adminId: req.admin.id,
      action: "application_assigned",
      entityType: "organization_application",
      entityId: id,
      title: "Заявка назначена",
      details: "Назначен ответственный администратор.",
      oldData: current,
      newData: updated,
    });

    return res.status(200).json({
      success: true,
      message: "Заявка назначена.",
      application: updated,
    });
  } catch (error) {
    console.error("ASSIGN APPLICATION ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка назначения заявки.",
    });
  }
});

export default router;