import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminToken } from "../services/adminService.js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function safeStatus(value, fallback = 200) {
  const code = Number(value);
  return Number.isInteger(code) && code >= 100 && code <= 599 ? code : fallback;
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

function requireAdminAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Нет токена авторизации.",
      });
    }

    req.admin = verifyAdminToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Неверный или просроченный токен.",
    });
  }
}

function normalizeStatus(status) {
  if (!status || status === "all") return null;
  return String(status).trim();
}

function normalizeCategory(value = "") {
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

async function safeSelectDocuments(applicationId) {
  const possibleTables = [
    "organization_application_documents",
    "application_documents",
    "organization_documents",
  ];

  for (const table of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });

      if (!error) {
        return data || [];
      }
    } catch {
      continue;
    }
  }

  return [];
}

async function safeSelectHistory(applicationId) {
  const possibleTables = [
    "organization_application_history",
    "application_history",
    "organization_change_history",
  ];

  for (const table of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });

      if (!error) {
        return data || [];
      }
    } catch {
      continue;
    }
  }

  return [];
}

async function safeInsertHistory({
  applicationId,
  adminId,
  action,
  oldStatus,
  newStatus,
  comment,
}) {
  const possibleTables = [
    "organization_application_history",
    "application_history",
  ];

  for (const table of possibleTables) {
    try {
      const { error } = await supabase.from(table).insert({
        application_id: applicationId,
        admin_id: adminId || null,
        action,
        old_status: oldStatus || null,
        new_status: newStatus || null,
        comment: comment || null,
      });

      if (!error) return true;
    } catch {
      continue;
    }
  }

  return false;
}

async function safeInsertAuditLog({
  adminId,
  action,
  entityType,
  entityId,
  title,
  details,
  oldData,
  newData,
}) {
  try {
    await supabase.from("admin_audit_logs").insert({
      admin_id: adminId || null,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      title: title || null,
      details: details || null,
      old_data: oldData || null,
      new_data: newData || null,
    });
  } catch {
    return false;
  }

  return true;
}

async function getApplicationsForAdmin(req, res) {
  try {
    const status = normalizeStatus(req.query.status);

    let query = supabase
      .from("organization_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (req.admin?.role !== "super_admin") {
      const adminId = req.admin?.id;

      query = query.or(
        `assigned_admin_id.eq.${adminId},assigned_admin_id.is.null`
      );
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      applications: data || [],
    });
  } catch (error) {
    console.error("GET APPLICATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения заявок.",
    });
  }
}

async function getApplicationById(req, res) {
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
      req.admin?.role !== "super_admin" &&
      application.assigned_admin_id &&
      application.assigned_admin_id !== req.admin?.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Нет доступа к этой заявке.",
      });
    }

    const documents = await safeSelectDocuments(id);
    const history = await safeSelectHistory(id);

    return res.status(200).json({
      success: true,
      application,
      documents,
      history,
    });
  } catch (error) {
    console.error("GET APPLICATION BY ID ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения заявки.",
    });
  }
}

async function updateApplicationStatus(req, res) {
  try {
    const { id } = req.params;
    const status = req.body.status;
    const comment =
      req.body.reviewComment || req.body.comment || req.body.review_comment || "";

    const allowedStatuses = [
      "new",
      "assigned",
      "in_progress",
      "needs_fix",
      "resent",
      "waiting_eds",
      "approved",
      "rejected",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Неверный статус заявки.",
      });
    }

    if (status === "rejected" && !String(comment).trim()) {
      return res.status(400).json({
        success: false,
        message: "При отклонении заявки нужно указать причину.",
      });
    }

    const { data: currentApplication, error: currentError } = await supabase
      .from("organization_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (currentError || !currentApplication) {
      return res.status(404).json({
        success: false,
        message: "Заявка не найдена.",
      });
    }

    const updatePayload = {
      status,
      review_comment: comment || null,
    };

    const { data: updatedApplication, error: updateError } = await supabase
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

    await safeInsertHistory({
      applicationId: id,
      adminId: req.admin?.id || null,
      action: "application_status_changed",
      oldStatus: currentApplication.status,
      newStatus: status,
      comment,
    });

    await safeInsertAuditLog({
      adminId: req.admin?.id || null,
      action: "application_status_changed",
      entityType: "organization_application",
      entityId: id,
      title: "Изменён статус заявки",
      details: `Статус изменён: ${currentApplication.status || "—"} → ${status}`,
      oldData: currentApplication,
      newData: updatedApplication,
    });

    return res.status(200).json({
      success: true,
      message: "Статус заявки обновлён.",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("UPDATE APPLICATION STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка изменения статуса заявки.",
    });
  }
}

async function assignApplication(req, res) {
  try {
    const { id } = req.params;

    const assignedAdminId =
      req.body.assignedAdminId || req.body.adminId || req.body.assigned_admin_id;

    const comment =
      req.body.comment || "Заявка назначена ответственному администратору.";

    if (!assignedAdminId) {
      return res.status(400).json({
        success: false,
        message: "Не выбран администратор.",
      });
    }

    if (req.admin?.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Назначать ответственного может только главный админ.",
      });
    }

    const { data: currentApplication, error: currentError } = await supabase
      .from("organization_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (currentError || !currentApplication) {
      return res.status(404).json({
        success: false,
        message: "Заявка не найдена.",
      });
    }

    const { data: updatedApplication, error: updateError } = await supabase
      .from("organization_applications")
      .update({
        assigned_admin_id: assignedAdminId,
        status:
          currentApplication.status === "new" ||
          currentApplication.status === null
            ? "assigned"
            : currentApplication.status,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: updateError.message,
      });
    }

    await safeInsertHistory({
      applicationId: id,
      adminId: req.admin?.id || null,
      action: "application_assigned",
      oldStatus: currentApplication.status,
      newStatus: updatedApplication.status,
      comment,
    });

    await safeInsertAuditLog({
      adminId: req.admin?.id || null,
      action: "application_assigned",
      entityType: "organization_application",
      entityId: id,
      title: "Заявка назначена администратору",
      details: comment,
      oldData: currentApplication,
      newData: updatedApplication,
    });

    return res.status(200).json({
      success: true,
      message: "Заявка назначена.",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("ASSIGN APPLICATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка назначения заявки.",
    });
  }
}

async function getSupportAdmins(req, res) {
  try {
    const possibleTables = ["admins", "admin_users"];

    for (const table of possibleTables) {
      try {
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
      } catch {
        continue;
      }
    }

    return res.status(200).json({
      success: true,
      admins: [],
    });
  } catch (error) {
    console.error("GET SUPPORT ADMINS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения админов.",
    });
  }
}

/**
 * ВАЖНО:
 * Сначала идут конкретные routes:
 * /admin
 * /support-admins
 * /admin/:id
 *
 * И только потом /:id
 */

router.get("/admin", requireAdminAuth, getApplicationsForAdmin);
router.get("/support-admins", requireAdminAuth, getSupportAdmins);

router.get("/admin/:id", requireAdminAuth, getApplicationById);
router.patch("/admin/:id/status", requireAdminAuth, updateApplicationStatus);

router.get("/", requireAdminAuth, getApplicationsForAdmin);
router.get("/:id", requireAdminAuth, getApplicationById);

router.patch("/:id/status", requireAdminAuth, updateApplicationStatus);
router.patch("/:id/assign", requireAdminAuth, assignApplication);

export default router;