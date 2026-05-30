import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET;

const LOCK_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

function normalizeUsername(username = "") {
  return String(username).trim();
}

function createToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      username: admin.username,
      fullName: admin.full_name,
      role: admin.role,
      category: admin.category,
    },
    JWT_SECRET,
    {
      expiresIn: "8h",
    }
  );
}

export function verifyAdminToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function addAuditLog({ adminId, action, details, ip, userAgent }) {
  try {
    await supabase.from("admin_audit_logs").insert({
      admin_id: adminId || null,
      action,
      details: details || {},
      ip_address: ip || null,
      user_agent: userAgent || null,
    });
  } catch (error) {
    console.error("AUDIT LOG ERROR:", error.message);
  }
}

export async function loginAdmin({ username, password, ip, userAgent }) {
  const cleanUsername = normalizeUsername(username);

  if (!cleanUsername || !password) {
    return {
      success: false,
      status: 400,
      message: "Введите название аккаунта и пароль.",
    };
  }

  const { data: foundAdmins, error: checkError } = await supabase.rpc(
    "check_site_admin_password",
    {
      input_username: cleanUsername,
      input_password: password,
    }
  );

  if (checkError) {
    console.error("PASSWORD CHECK ERROR:", checkError);

    return {
      success: false,
      status: 500,
      message: "Ошибка проверки пароля.",
    };
  }

  const admin = foundAdmins?.[0];

  if (!admin) {
    const { data: existingAdmin } = await supabase
      .from("site_admins")
      .select("id, failed_attempts")
      .eq("username", cleanUsername)
      .single();

    if (existingAdmin) {
      const failedAttempts = Number(existingAdmin.failed_attempts || 0) + 1;

      const updateData = {
        failed_attempts: failedAttempts,
        updated_at: new Date().toISOString(),
      };

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCK_MINUTES);

        updateData.locked_until = lockedUntil.toISOString();
      }

      await supabase
        .from("site_admins")
        .update(updateData)
        .eq("id", existingAdmin.id);

      await addAuditLog({
        adminId: existingAdmin.id,
        action: "admin_login_failed",
        details: {
          username: cleanUsername,
          failedAttempts,
        },
        ip,
        userAgent,
      });
    }

    return {
      success: false,
      status: 401,
      message: "Неверный аккаунт или пароль.",
    };
  }

  if (!admin.is_active) {
    return {
      success: false,
      status: 403,
      message: "Аккаунт администратора заблокирован.",
    };
  }

  if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    return {
      success: false,
      status: 423,
      message: "Слишком много попыток входа. Попробуйте позже.",
    };
  }

  await supabase
    .from("site_admins")
    .update({
      failed_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", admin.id);

  await addAuditLog({
    adminId: admin.id,
    action: "admin_login_success",
    details: {
      username: cleanUsername,
    },
    ip,
    userAgent,
  });

  const token = createToken(admin);

  return {
    success: true,
    status: 200,
    token,
    admin: {
      id: admin.id,
      fullName: admin.full_name,
      username: admin.username,
      role: admin.role,
      category: admin.category,
    },
  };
}

export async function getStaffList(currentAdmin) {
  if (currentAdmin.role !== "super_admin") {
    return {
      success: false,
      status: 403,
      message: "Недостаточно прав.",
    };
  }

  const { data, error } = await supabase
    .from("site_admins")
    .select(
      "id, full_name, username, role, category, is_active, created_at, last_login_at"
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET STAFF ERROR:", error);

    return {
      success: false,
      status: 500,
      message: "Ошибка получения сотрудников.",
    };
  }

  return {
    success: true,
    status: 200,
    staff: data,
  };
}

export async function createStaffAdmin({
  currentAdmin,
  fullName,
  username,
  password,
  category,
  ip,
  userAgent,
}) {
  if (currentAdmin.role !== "super_admin") {
    return {
      success: false,
      status: 403,
      message: "Только главный админ может добавлять сотрудников.",
    };
  }

  if (!fullName || !username || !password || !category) {
    return {
      success: false,
      status: 400,
      message: "Заполните ФИО, аккаунт, пароль и категорию.",
    };
  }

  const allowedCategories = [
    "gov_polyclinics",
    "gov_hospitals",
    "private_clinics",
    "medical_centers",
    "labs",
  ];

  if (!allowedCategories.includes(category)) {
    return {
      success: false,
      status: 400,
      message: "Неверная категория.",
    };
  }

  const cleanUsername = normalizeUsername(username);

  const passwordHash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from("site_admins")
    .insert({
      full_name: fullName.trim(),
      username: cleanUsername,
      password_hash: passwordHash,
      role: "site_support",
      category,
      is_active: true,
      failed_attempts: 0,
      locked_until: null,
      created_by: currentAdmin.id,
    })
    .select("id, full_name, username, role, category, is_active, created_at")
    .single();

  if (error) {
    console.error("CREATE STAFF ERROR:", error);

    if (error.code === "23505") {
      return {
        success: false,
        status: 409,
        message: "Такой аккаунт уже существует.",
      };
    }

    return {
      success: false,
      status: 500,
      message: "Ошибка создания администратора.",
    };
  }

  await addAuditLog({
    adminId: currentAdmin.id,
    action: "admin_staff_created",
    details: {
      createdAdminId: data.id,
      username: data.username,
      category: data.category,
    },
    ip,
    userAgent,
  });

  return {
    success: true,
    status: 201,
    admin: {
      id: data.id,
      fullName: data.full_name,
      username: data.username,
      role: data.role,
      category: data.category,
      isActive: data.is_active,
      createdAt: data.created_at,
    },
  };
}

export async function changeStaffStatus({
  currentAdmin,
  staffId,
  isActive,
  ip,
  userAgent,
}) {
  if (currentAdmin.role !== "super_admin") {
    return {
      success: false,
      status: 403,
      message: "Только главный админ может менять статус сотрудников.",
    };
  }

  if (currentAdmin.id === staffId) {
    return {
      success: false,
      status: 400,
      message: "Нельзя заблокировать самого себя.",
    };
  }

  const { data, error } = await supabase
    .from("site_admins")
    .update({
      is_active: Boolean(isActive),
      updated_at: new Date().toISOString(),
    })
    .eq("id", staffId)
    .neq("role", "super_admin")
    .select("id, full_name, username, role, category, is_active")
    .single();

  if (error || !data) {
    console.error("CHANGE STAFF STATUS ERROR:", error);

    return {
      success: false,
      status: 404,
      message: "Сотрудник не найден.",
    };
  }

  await addAuditLog({
    adminId: currentAdmin.id,
    action: "admin_staff_status_changed",
    details: {
      staffId,
      isActive,
    },
    ip,
    userAgent,
  });

  return {
    success: true,
    status: 200,
    admin: {
      id: data.id,
      fullName: data.full_name,
      username: data.username,
      role: data.role,
      category: data.category,
      isActive: data.is_active,
    },
  };
}