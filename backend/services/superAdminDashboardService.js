import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

function normalizeCategory(value = "") {
  const map = {
    gov_polyclinics: "state_polyclinic",
    gov_polyclinic: "state_polyclinic",
    state_polyclinic: "state_polyclinic",

    gov_hospitals: "state_hospital",
    gov_hospital: "state_hospital",
    state_hospital: "state_hospital",

    private_clinics: "private_clinic",
    private_clinic: "private_clinic",
  };

  return map[value] || value || "unknown";
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

function statusToGroup(status = "") {
  const value = String(status || "").toLowerCase();

  if (["active", "opened", "connected", "approved"].includes(value)) {
    return "opened";
  }

  if (["waiting_eds", "eds_waiting", "not_confirmed"].includes(value)) {
    return "waitingEds";
  }

  if (["in_progress", "process", "pending", "new"].includes(value)) {
    return "inProcess";
  }

  if (["rejected", "blocked", "closed"].includes(value)) {
    return "rejected";
  }

  return "notOpened";
}

export async function getSuperAdminDashboard(currentAdmin) {
  const allAccessRoles = ["super_admin", "site_support", "support_admin"];
  if (!allAccessRoles.includes(currentAdmin?.role)) {
    return {
      success: false,
      status: 403,
      message: "Недостаточно прав.",
    };
  }

  const { data: organizations, error: orgError } = await supabase
    .from("organizations")
    .select("id, organization_type, status, eds_status");

  if (orgError) {
    return {
      success: false,
      status: 500,
      message: orgError.message,
    };
  }

  const { data: applications, error: appError } = await supabase
    .from("organization_applications")
    .select("id, application_type, organization_type, status, created_at");

  if (appError) {
    return {
      success: false,
      status: 500,
      message: appError.message,
    };
  }

  const categoryStats = CATEGORIES.map((category) => ({
    ...category,
    stats: emptyStats(),
  }));

  for (const org of organizations || []) {
    const categoryKey = normalizeCategory(org.organization_type);
    const category = categoryStats.find((item) => item.key === categoryKey);

    if (!category) continue;

    category.stats.total += 1;

    const group = statusToGroup(org.status || org.eds_status);
    category.stats[group] += 1;
  }

  const applicationStats = {
    total: applications?.length || 0,
    new: 0,
    in_progress: 0,
    approved: 0,
    rejected: 0,
    new_organization: 0,
    change_organization_data: 0,
    change_chief_doctor: 0,
  };

  for (const app of applications || []) {
    if (applicationStats[app.status] !== undefined) {
      applicationStats[app.status] += 1;
    }

    if (applicationStats[app.application_type] !== undefined) {
      applicationStats[app.application_type] += 1;
    }
  }

  return {
    success: true,
    status: 200,
    dashboard: {
      categoryStats,
      applicationStats,
    },
  };
}