  

import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabaseAdmin.js";
import { requireAdminAuth } from "../middleware/requireAdminAuth.js";
import { createAuditLog } from "../services/adminAuditService.js";
import { sendOrganizationAccessEmail } from "../services/emailService.js";


const router = express.Router();

function hashPassword(password) {
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
return `${salt}:${hash}`;
}

function verifyPassword(password, savedHash) {
if (!password || !savedHash) return false;

const [salt, hash] = String(savedHash).split(":");
if (!salt || !hash) return false;

const checkHash = crypto
.scryptSync(String(password), salt, 64)
.toString("hex");

return hash === checkHash;
}

function getRoleByPosition(position) {
  const value = String(position || "").toLowerCase();
  if (value.includes("врач") || value.includes("doctor")) return "doctor";
  if (value.includes("администратор") || value.includes("admin")) return "organization_admin";
  return "doctor"; // Врач по умолчанию
}

function getRedirectPath(role) {
  if (role === "organization_admin" || role === "admin") {
    return "/organization/gov-clinic/system-admin";
  }
  return "/organization/gov-clinic/employee";
}

router.post("/login", async (req, res) => {
  try {
    const city = String(req.body.city || "").trim();
    const bin = String(req.body.bin || "").trim();
    const login = String(req.body.login || "").trim();
    const password = String(req.body.password || "");

    if (!city || !bin || !login || !password) {
      return res.status(400).json({
        success: false,
        message: "Город, БИН, логин и пароль обязательны.",
      });
    }

    let user = null;
    const { data: dbUser, error: userError } = await supabase
      .from("organization_users")
      .select("*, organizations(*)")
      .ilike("city", city)
      .eq("bin", bin)
      .eq("login", login)
      .maybeSingle();

    if (dbUser && !userError) {
      user = dbUser;
      if (user.role === "employee") {
        const { data: emp } = await supabase
          .from("organization_employees")
          .select("*")
          .eq("login", user.login)
          .eq("organization_id", user.organization_id)
          .maybeSingle();

        if (emp) {
          const resolvedRole = getRoleByPosition(emp.position);
          if (resolvedRole && resolvedRole !== "employee") {
            user.role = resolvedRole;
          }
        }
      }
    } else {
      // Fallback: search in organization_employees
      const { data: emp, error: empError } = await supabase
        .from("organization_employees")
        .select("*, organizations!inner(*)")
        .eq("login", login)
        .ilike("organizations.city", city)
        .eq("organizations.bin", bin)
        .maybeSingle();

      if (emp && !empError) {
        const resolvedRole = getRoleByPosition(emp.position) || "employee";
        user = {
          id: emp.id,
          organization_id: emp.organization_id,
          full_name: emp.full_name,
          email: emp.email,
          role: resolvedRole,
          login: emp.login,
          city: city,
          bin: bin,
          must_change_password: emp.must_change_password,
          status: emp.status,
          password_hash: emp.password_hash,
          organizations: emp.organizations,
        };
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Пользователь не найден.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Аккаунт отключён.",
      });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({
        success: false,
        message: "Неверный пароль.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        login: user.login,
        role: user.role,
        organization_id: user.organization_id
      },
      process.env.JWT_SECRET || "your_jwt_secret_here",
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      success: true,
      message: "Вход выполнен.",
      token,
      mustChangePassword: user.must_change_password,
      redirectPath: getRedirectPath(user.role),
      user: {
        id: user.id,
        organization_id: user.organization_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        login: user.login,
        city: user.city,
        bin: user.bin,
        must_change_password: user.must_change_password,
      },
      organization: user.organizations || null,
    });


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка входа.",
});
}
});

router.post("/change-password", async (req, res) => {
  try {
    const userId = req.body.userId;
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Новый пароль обязателен.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Новый пароль должен быть минимум 6 символов.",
      });
    }

    let isEmployee = false;
    let { data: user, error } = await supabase
      .from("organization_users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!user || error) {
      const { data: emp, error: empError } = await supabase
        .from("organization_employees")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (emp && !empError) {
        user = emp;
        isEmployee = true;
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден.",
      });
    }

    const mustChange = user.must_change_password;
    if (!mustChange) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Укажите текущий пароль.",
        });
      }
      if (!verifyPassword(currentPassword, user.password_hash)) {
        return res.status(401).json({
          success: false,
          message: "Текущий пароль неверный.",
        });
      }
    }

    const newHash = hashPassword(newPassword);

    if (isEmployee) {
      const { error: updateError } = await supabase
        .from("organization_employees")
        .update({
          password_hash: newHash,
          must_change_password: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        return res.status(500).json({
          success: false,
          message: updateError.message,
        });
      }

      const resolvedRole = getRoleByPosition(user.position) || "doctor";
      const token = jwt.sign(
        {
          id: user.id,
          login: user.login,
          role: resolvedRole,
          organization_id: user.organization_id
        },
        process.env.JWT_SECRET || "your_jwt_secret_here",
        { expiresIn: "24h" }
      );
      return res.status(200).json({
        success: true,
        message: "Пароль успешно изменён.",
        token,
        mustChangePassword: false,
        redirectPath: getRedirectPath(resolvedRole),
        user: {
          id: user.id,
          organization_id: user.organization_id,
          full_name: user.full_name,
          email: user.email,
          role: resolvedRole,
          login: user.login,
          must_change_password: false,
        },
      });
    } else {
      const { error: updateError } = await supabase
        .from("organization_users")
        .update({
          password_hash: newHash,
          must_change_password: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        return res.status(500).json({
          success: false,
          message: updateError.message,
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          login: user.login,
          role: user.role,
          organization_id: user.organization_id
        },
        process.env.JWT_SECRET || "your_jwt_secret_here",
        { expiresIn: "24h" }
      );
      return res.status(200).json({
        success: true,
        message: "Пароль успешно изменён.",
        token,
        mustChangePassword: false,
        redirectPath: getRedirectPath(user.role),
        user: {
          id: user.id,
          organization_id: user.organization_id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          login: user.login,
          must_change_password: false,
        },
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка смены пароля.",
    });
  }
});

router.get("/", requireAdminAuth, async (req, res) => {
try {
let query = supabase
.from("organizations")
.select("*")
.order("created_at", { ascending: false });


const allAccessRoles = ["super_admin", "site_support", "support_admin"];
if (!allAccessRoles.includes(req.admin.role)) {
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

    // Auto credential reset logic on email changes
    try {
      const { data: existingUsers } = await supabase
        .from("organization_users")
        .select("*")
        .eq("organization_id", req.params.id);

      // Check chief doctor email change
      if (req.body.chief_doctor_email !== undefined && req.body.chief_doctor_email !== current.chief_doctor_email) {
        const newEmail = String(req.body.chief_doctor_email).trim().toLowerCase();
        if (newEmail) {
          const tempPassword = Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
          const login = newEmail.split("@")[0] + "_" + Math.floor(1000 + Math.random() * 9000);
          const passwordHash = hashPassword(tempPassword);
          const existingChief = (existingUsers || []).find(u => u.role === "chief_doctor");

          if (existingChief) {
            await supabase
              .from("organization_users")
              .update({
                email: newEmail,
                login,
                password_hash: passwordHash,
                must_change_password: true,
                full_name: updated.chief_doctor_full_name || current.chief_doctor_full_name || "Главный врач",
                phone: updated.chief_doctor_phone || current.chief_doctor_phone || "",
                status: "active",
                updated_at: new Date().toISOString()
              })
              .eq("id", existingChief.id);
          } else {
            await supabase
              .from("organization_users")
              .insert({
                organization_id: req.params.id,
                city: updated.city || current.city,
                bin: updated.bin || current.bin,
                full_name: updated.chief_doctor_full_name || current.chief_doctor_full_name || "Главный врач",
                phone: updated.chief_doctor_phone || current.chief_doctor_phone || "",
                email: newEmail,
                role: "chief_doctor",
                login,
                password_hash: passwordHash,
                must_change_password: true,
                status: "active",
                updated_at: new Date().toISOString()
              });
          }

          try {
            await sendOrganizationAccessEmail({
              to: newEmail,
              application: {
                organization_name: updated.organization_name,
                application_number: "обновлен"
              },
              fullName: updated.chief_doctor_full_name || current.chief_doctor_full_name || "Главный врач",
              roleLabel: "Главный врач",
              login,
              tempPassword
            });
          } catch (emailErr) {
            console.error("Error sending chief doctor access email:", emailErr.message);
          }
        }
      }

      // Check organization admin email change
      if (req.body.organization_email !== undefined && req.body.organization_email !== current.organization_email) {
        const newEmail = String(req.body.organization_email).trim().toLowerCase();
        if (newEmail) {
          const tempPassword = Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
          const login = newEmail.split("@")[0] + "_" + Math.floor(1000 + Math.random() * 9000);
          const passwordHash = hashPassword(tempPassword);
          const existingAdmin = (existingUsers || []).find(u => u.role === "organization_admin");

          if (existingAdmin) {
            await supabase
              .from("organization_users")
              .update({
                email: newEmail,
                login,
                password_hash: passwordHash,
                must_change_password: true,
                full_name: "Администратор клиники",
                phone: updated.organization_phone || current.organization_phone || "",
                status: "active",
                updated_at: new Date().toISOString()
              })
              .eq("id", existingAdmin.id);
          } else {
            await supabase
              .from("organization_users")
              .insert({
                organization_id: req.params.id,
                city: updated.city || current.city,
                bin: updated.bin || current.bin,
                full_name: "Администратор клиники",
                phone: updated.organization_phone || current.organization_phone || "",
                email: newEmail,
                role: "organization_admin",
                login,
                password_hash: passwordHash,
                must_change_password: true,
                status: "active",
                updated_at: new Date().toISOString()
              });
          }

          try {
            await sendOrganizationAccessEmail({
              to: newEmail,
              application: {
                organization_name: updated.organization_name,
                application_number: "обновлен"
              },
              fullName: "Администратор клиники",
              roleLabel: "Администратор организации",
              login,
              tempPassword
            });
          } catch (emailErr) {
            console.error("Error sending admin access email:", emailErr.message);
          }
        }
      }
    } catch (dbErr) {
      console.error("Error resetting organization credentials:", dbErr.message);
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

router.patch("/profile/language", async (req, res) => {
  try {
    const { userId, language, role } = req.body;
    if (!userId || !language) {
      return res.status(400).json({ success: false, message: "userId and language are required" });
    }

    if (role === "doctor" || role === "employee") {
      await supabase
        .from("organization_employees")
        .update({ preferred_language: language })
        .eq("id", userId);
    } else {
      await supabase
        .from("organization_users")
        .update({ preferred_language: language })
        .eq("id", userId);
    }
    return res.status(200).json({ success: true, message: "Preferred language saved in profile." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/auth/patient-token", async (req, res) => {
  try {
    const { iin, id } = req.body;
    if (!iin || !id) {
      return res.status(400).json({ success: false, message: "ИИН и ID обязательны." });
    }
    
    // Check if the user exists in app_users
    const { data: user, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("iin", iin)
      .eq("id", id)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ success: false, message: "Неверный ИИН или ID." });
    }

    const token = jwt.sign(
      { id: user.id, iin: user.iin, role: "patient" },
      process.env.JWT_SECRET || "your_jwt_secret_here",
      { expiresIn: "24h" }
    );

    return res.status(200).json({ success: true, token });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
