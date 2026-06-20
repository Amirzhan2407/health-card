import express from "express";
import {
  loginAdmin,
  verifyAdminToken,
  getStaffList,
  createStaffAdmin,
  changeStaffStatus,
  checkAdminUsername,
  createInitialAdminPassword,
} from "../services/adminService.js";
import { supabase } from "../lib/supabaseAdmin.js";

const router = express.Router();

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    ""
  );
}

function getUserAgent(req) {
  return req.headers["user-agent"] || "";
}

function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Нет токена авторизации.",
      });
    }

    const admin = verifyAdminToken(token);

    req.admin = admin;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Неверный или просроченный токен.",
    });
  }
}

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await loginAdmin({
      username,
      password,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера при входе.",
    });
  }
});


router.post("/check-username", async (req, res) => {
  try {
    const { username } = req.body;

    const result = await checkAdminUsername({
      username,
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("ADMIN CHECK USERNAME ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка проверки аккаунта.",
    });
  }
});

router.post("/create-password", async (req, res) => {
  try {
    const { username, employeeNumber, password, repeatPassword } = req.body;

    const result = await createInitialAdminPassword({
      username,
      employeeNumber,
      password,
      repeatPassword,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("ADMIN CREATE PASSWORD ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка создания пароля.",
    });
  }
});

router.get("/me", requireAdminAuth, async (req, res) => {
  return res.json({
    success: true,
    admin: req.admin,
  });
});

router.get("/staff", requireAdminAuth, async (req, res) => {
  try {
    const result = await getStaffList(req.admin);

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("ADMIN STAFF LIST ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения админов.",
    });
  }
});

router.post("/staff", requireAdminAuth, async (req, res) => {
  try {
    const { fullName, username, birthDate, role, category } = req.body;

    const result = await createStaffAdmin({
      currentAdmin: req.admin,
      fullName,
      username,
      birthDate,
      role,
      category,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("ADMIN STAFF CREATE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка создания админа.",
    });
  }
});

router.patch("/staff/:id/status", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const result = await changeStaffStatus({
      currentAdmin: req.admin,
      staffId: id,
      isActive,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("ADMIN STAFF STATUS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Ошибка изменения статуса.",
    });
  }
});

router.get("/clear-database-temp-route", async (req, res) => {
  try {
    const secret = req.query.secret;
    if (secret !== "clear123") {
      return res.status(403).json({ success: false, message: "Неверный секрет." });
    }

    console.log("=== DB CLEARANCE INITIATED ===");
    const results = {};

    // 1. Delete all appointments
    try {
      const { error } = await supabase.from("organization_appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.appointments = error ? error.message : "success";
    } catch (e) {
      results.appointments = e.message;
    }

    // 2. Delete all employee documents
    try {
      const { error } = await supabase.from("organization_employee_documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.employee_documents = error ? error.message : "success";
    } catch (e) {
      results.employee_documents = e.message;
    }

    // 3. Delete all employees
    try {
      const { error } = await supabase.from("organization_employees").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.employees = error ? error.message : "success";
    } catch (e) {
      results.employees = e.message;
    }

    // 4. Delete all departments
    try {
      const { error } = await supabase.from("organization_departments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.departments = error ? error.message : "success";
    } catch (e) {
      results.departments = e.message;
    }

    // 5. Delete all organization users (portal staff)
    try {
      const { error } = await supabase.from("organization_users").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.organization_users = error ? error.message : "success";
    } catch (e) {
      results.organization_users = e.message;
    }

    // 6. Delete all organizations
    try {
      const { error } = await supabase.from("organizations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.organizations = error ? error.message : "success";
    } catch (e) {
      results.organizations = e.message;
    }

    // 7. Delete all application history
    try {
      const { error } = await supabase.from("organization_application_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.application_history = error ? error.message : "success";
    } catch (e) {
      results.application_history = e.message;
    }

    // 8. Delete all application documents
    try {
      const { error } = await supabase.from("organization_application_documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.application_documents = error ? error.message : "success";
    } catch (e) {
      results.application_documents = e.message;
    }

    // 9. Delete all organization applications
    try {
      const { error } = await supabase.from("organization_applications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.applications = error ? error.message : "success";
    } catch (e) {
      results.applications = e.message;
    }

    // 10. Delete all patient accounts (app_users)
    try {
      const { error } = await supabase.from("app_users").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.app_users = error ? error.message : "success";
    } catch (e) {
      results.app_users = e.message;
    }

    // 11. Delete support chat messages
    try {
      const { error } = await supabase.from("admin_channel_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.channel_messages = error ? error.message : "success";
    } catch (e) {
      results.channel_messages = e.message;
    }

    // 12. Delete support chat channels
    try {
      const { error } = await supabase.from("admin_channels").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.channels = error ? error.message : "success";
    } catch (e) {
      results.channels = e.message;
    }

    // 13. Delete audit logs
    try {
      const { error } = await supabase.from("admin_audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.audit_logs = error ? error.message : "success";
    } catch (e) {
      results.audit_logs = e.message;
    }

    // 14. Keep only the oldest admin in site_admins
    try {
      const { data: admins, error: fetchErr } = await supabase.from("site_admins").select("id, username").order("created_at", { ascending: true });
      
      if (fetchErr || !admins || admins.length === 0) {
        console.error("Could not fetch admins to clean:", fetchErr?.message);
        results.site_admins = fetchErr ? fetchErr.message : "No admins found";
      } else {
        const adminToKeep = admins[0];
        console.log(`Keeping oldest admin: ${adminToKeep.username} (${adminToKeep.id})`);
        const { error: delErr } = await supabase.from("site_admins").delete().neq("id", adminToKeep.id);
        results.site_admins = delErr ? delErr.message : `success (kept ${adminToKeep.username})`;
      }
    } catch (e) {
      results.site_admins = e.message;
    }

    console.log("=== DB CLEARANCE COMPLETED ===", results);

    return res.status(200).json({
      success: true,
      message: "Операция очистки базы данных завершена.",
      results
    });
  } catch (error) {
    console.error("CLEAR DATABASE EXCEPTION:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка сервера при очистке."
    });
  }
});

export default router;