import express from "express";
import { supabase } from "../lib/supabaseAdmin.js";
import { requireAdminAuth } from "../middleware/requireAdminAuth.js";
import { createAuditLog } from "../services/adminAuditService.js";

const router = express.Router();

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    let query = supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (req.admin.role !== "super_admin") {
      query = query.eq("assigned_admin_id", req.admin.id);
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
      organizations: data || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения организаций.",
    });
  }
});

router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: "Организация не найдена.",
      });
    }

    if (
      req.admin.role !== "super_admin" &&
      data.assigned_admin_id !== req.admin.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Нет доступа к организации.",
      });
    }

    return res.status(200).json({
      success: true,
      organization: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения организации.",
    });
  }
});

router.patch("/:id", requireAdminAuth, async (req, res) => {
  try {
    const { data: current, error: currentError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (currentError || !current) {
      return res.status(404).json({
        success: false,
        message: "Организация не найдена.",
      });
    }

    if (
      req.admin.role !== "super_admin" &&
      current.assigned_admin_id !== req.admin.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Нет доступа к организации.",
      });
    }

    const allowedFields = [
      "organization_name",
      "organization_type",
      "organization_type_label",
      "bin",
      "city",
      "address",
      "chief_doctor_full_name",
      "chief_doctor_email",
      "chief_doctor_phone",
      "organization_email",
      "organization_phone",
      "status",
      "assigned_admin_id",
    ];

    const payload = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    }

    payload.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("organizations")
      .update(payload)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    await createAuditLog({
      adminId: req.admin.id,
      action: "organization_updated",
      entityType: "organization",
      entityId: req.params.id,
      title: "Данные организации изменены",
      details: updated.organization_name,
      oldData: current,
      newData: updated,
    });

    return res.status(200).json({
      success: true,
      organization: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка изменения организации.",
    });
  }
});

export default router;