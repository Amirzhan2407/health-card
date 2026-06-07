import express from "express";
import { supabase } from "../lib/supabaseAdmin.js";
import { requireAdminAuth } from "../middleware/requireAdminAuth.js";

const router = express.Router();

const CATEGORIES = [
  {
    key: "state_polyclinic",
    title: "Государственные поликлиники",
  },
  {
    key: "state_hospital",
    title: "Государственные больницы",
  },
  {
    key: "private_clinic",
    title: "Частные клиники",
  },
];

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

function emptyStats() {
  return {
    total: 0,
    opened: 0,
    notOpened: 0,
    inProcess: 0,
    waitingEds: 0,
    rejected: 0,
  };
}

function groupStatus(status) {
  const value = String(status || "").toLowerCase();

  if (["active", "opened", "connected", "approved"].includes(value)) {
    return "opened";
  }

  if (["waiting_eds", "not_confirmed", "eds_waiting"].includes(value)) {
    return "waitingEds";
  }

  if (["new", "assigned", "in_progress", "process"].includes(value)) {
    return "inProcess";
  }

  if (["rejected", "blocked", "closed"].includes(value)) {
    return "rejected";
  }

  return "notOpened";
}

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    let orgQuery = supabase
      .from("organizations")
      .select("id, organization_type, status, assigned_admin_id");

    let appQuery = supabase
      .from("organization_applications")
      .select("id, status, application_type, organization_type, assigned_admin_id");

    if (req.admin.role !== "super_admin") {
      orgQuery = orgQuery.eq("assigned_admin_id", req.admin.id);
      appQuery = appQuery.or(
        `assigned_admin_id.eq.${req.admin.id},assigned_admin_id.is.null`
      );
    }

    const { data: organizations, error: orgError } = await orgQuery;
    const { data: applications, error: appError } = await appQuery;

    if (orgError || appError) {
      return res.status(500).json({
        success: false,
        message: orgError?.message || appError?.message,
      });
    }

    const categoryStats = CATEGORIES.map((category) => ({
      ...category,
      stats: emptyStats(),
    }));

    for (const org of organizations || []) {
      const category = categoryStats.find(
        (item) => item.key === normalizeCategory(org.organization_type)
      );

      if (!category) continue;

      category.stats.total += 1;
      category.stats[groupStatus(org.status)] += 1;
    }

    const applicationStats = {
      total: applications?.length || 0,
      new: 0,
      assigned: 0,
      in_progress: 0,
      needs_fix: 0,
      waiting_eds: 0,
      approved: 0,
      rejected: 0,
    };

    for (const app of applications || []) {
      if (applicationStats[app.status] !== undefined) {
        applicationStats[app.status] += 1;
      }
    }

    return res.status(200).json({
      success: true,
      dashboard: {
        categoryStats,
        applicationStats,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения статистики.",
    });
  }
});

export default router;