  

import express from "express";
import crypto from "crypto";
import { supabase } from "../lib/supabaseAdmin.js";
import { requireAdminAuth } from "../middleware/requireAdminAuth.js";
import { createAuditLog } from "../services/adminAuditService.js";

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

function getRedirectPath(role) {
if (role === "chief_doctor" || role === "chief") {
return "/organization/gov-clinic/chief-doctor";
}

if (role === "organization_admin" || role === "admin") {
return "/organization/gov-clinic/system-admin";
}

if (role === "hr") {
return "/organization/gov-clinic/hr";
}

if (role === "deputy_chief_doctor") {
return "/organization/gov-clinic/chief-doctor";
}

if (role === "department_head") {
return "/organization/gov-clinic/doctor";
}

if (role === "registrar") {
return "/organization/gov-clinic/doctor";
}

return "/organization/gov-clinic/doctor";
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

const { data: user, error } = await supabase
  .from("organization_users")
  .select("*, organizations(*)")
  .ilike("city", city)
  .eq("bin", bin)
  .eq("login", login)
  .maybeSingle();

if (error || !user) {
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

return res.status(200).json({
  success: true,
  message: "Вход выполнен.",
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


if (!userId || !currentPassword || !newPassword) {
  return res.status(400).json({
    success: false,
    message: "Заполните все поля.",
  });
}

if (newPassword.length < 6) {
  return res.status(400).json({
    success: false,
    message: "Новый пароль должен быть минимум 6 символов.",
  });
}

const { data: user, error } = await supabase
  .from("organization_users")
  .select("*")
  .eq("id", userId)
  .single();

if (error || !user) {
  return res.status(404).json({
    success: false,
    message: "Пользователь не найден.",
  });
}

if (!verifyPassword(currentPassword, user.password_hash)) {
  return res.status(401).json({
    success: false,
    message: "Текущий пароль неверный.",
  });
}

const { error: updateError } = await supabase
  .from("organization_users")
  .update({
    password_hash: hashPassword(newPassword),
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

return res.status(200).json({
  success: true,
  message: "Пароль успешно изменён.",
  mustChangePassword: false,
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
    must_change_password: false,
  },
});


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
