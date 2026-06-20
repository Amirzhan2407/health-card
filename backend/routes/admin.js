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

    // 1. Delete all appointments
    const { error: appErr } = await supabase.from("organization_appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("1. Appointments deleted:", !appErr, appErr?.message);

    // 2. Delete all employee documents
    const { error: docErr } = await supabase.from("organization_employee_documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("2. Employee documents deleted:", !docErr, docErr?.message);

    // 3. Delete all employees
    const { error: empErr } = await supabase.from("organization_employees").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("3. Employees deleted:", !empErr, empErr?.message);

    // 4. Delete all departments
    const { error: deptErr } = await supabase.from("organization_departments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("4. Departments deleted:", !deptErr, deptErr?.message);

    // 5. Delete all organization users (portal staff)
    const { error: usrErr } = await supabase.from("organization_users").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("5. Organization users deleted:", !usrErr, usrErr?.message);

    // 6. Delete all organizations
    const { error: orgErr } = await supabase.from("organizations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("6. Organizations deleted:", !orgErr, orgErr?.message);

    // 7. Delete all application history
    const { error: histErr } = await supabase.from("organization_application_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("7. Application history deleted:", !histErr, histErr?.message);

    // 8. Delete all application documents
    const { error: appDocErr } = await supabase.from("organization_application_documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("8. Application documents deleted:", !appDocErr, appDocErr?.message);

    // 9. Delete all organization applications
    const { error: appFormErr } = await supabase.from("organization_applications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("9. Applications deleted:", !appFormErr, appFormErr?.message);

    // 10. Delete all patient accounts (app_users)
    const { error: patErr } = await supabase.from("app_users").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("10. Patient users deleted:", !patErr, patErr?.message);

    // 11. Delete support chat messages
    const { error: msgErr } = await supabase.from("admin_channel_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("11. Support messages deleted:", !msgErr, msgErr?.message);

    // 12. Delete support chat channels
    const { error: chanErr } = await supabase.from("admin_channels").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("12. Support channels deleted:", !chanErr, chanErr?.message);

    // 13. Delete audit logs
    const { error: logErr } = await supabase.from("admin_audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("13. Audit logs deleted:", !logErr, logErr?.message);

    // 14. Keep only the oldest admin in site_admins
    const { data: admins, error: fetchErr } = await supabase.from("site_admins").select("id, username").order("created_at", { ascending: true });
    
    let admErr = null;
    if (fetchErr || !admins || admins.length === 0) {
      console.error("Could not fetch admins to clean:", fetchErr?.message);
      admErr = fetchErr || new Error("No admins found in database");
    } else {
      const adminToKeep = admins[0];
      console.log(`Keeping oldest admin: ${adminToKeep.username} (${adminToKeep.id})`);
      const { error: delErr } = await supabase.from("site_admins").delete().neq("id", adminToKeep.id);
      admErr = delErr;
    }
    console.log("14. Other support admins deleted:", !admErr, admErr?.message);

    if (appErr || docErr || empErr || deptErr || usrErr || orgErr || histErr || appDocErr || appFormErr || patErr || msgErr || chanErr || logErr || admErr) {
      return res.status(500).json({
        success: false,
        message: "Некоторые таблицы не удалось очистить. Проверьте консоль бэкенда.",
        errors: {
          appErr: appErr?.message,
          docErr: docErr?.message,
          empErr: empErr?.message,
          deptErr: deptErr?.message,
          usrErr: usrErr?.message,
          orgErr: orgErr?.message,
          histErr: histErr?.message,
          appDocErr: appDocErr?.message,
          appFormErr: appFormErr?.message,
          patErr: patErr?.message,
          msgErr: msgErr?.message,
          chanErr: chanErr?.message,
          logErr: logErr?.message,
          admErr: admErr?.message
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "База данных успешно очищена с сохранением единственного суперадминистратора."
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