import { createClient } from "@supabase/supabase-js";
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
  const allowedRoles = ["super_admin", "site_support", "support_admin"];
  if (!allowedRoles.includes(currentAdmin.role)) {
    return {
      success: false,
      status: 403,
      message: "Недостаточно прав.",
    };
  }

  const { data, error } = await supabase
    .from("site_admins")
    .select(
      `
      id,
      full_name,
      username,
      employee_number,
      birth_date,
      role,
      category,
      is_active,
      must_set_password,
      password_created_at,
      created_at,
      last_login_at
      `
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET STAFF ERROR:", error);

    return {
      success: false,
      status: 500,
      message: "Ошибка получения админов.",
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
  birthDate,
  role,
  category,
  ip,
  userAgent,
}) {
  const allowedRoles = ["super_admin", "site_support", "support_admin"];
  if (!allowedRoles.includes(currentAdmin.role)) {
    return {
      success: false,
      status: 403,
      message: "Недостаточно прав.",
    };
  }

  if (!fullName || !username || !role || !category) {
    return {
      success: false,
      status: 400,
      message: "Заполните ФИО, логин, роль и категорию.",
    };
  }

  if (!birthDate) {
    return {
      success: false,
      status: 400,
      message: "Укажите дату рождения.",
    };
  }

  const allowedRoles = ["super_admin", "site_support"];

  if (!allowedRoles.includes(role)) {
    return {
      success: false,
      status: 400,
      message: "Неверная роль.",
    };
  }

  const allowedCategories = [
    "all",
    "gov_polyclinics",
    "gov_hospitals",
    "private_clinics",
  ];

  if (!allowedCategories.includes(category)) {
    return {
      success: false,
      status: 400,
      message: "Неверная категория.",
    };
  }

  // Убран лимит на категорию all для site_support

  const cleanUsername = normalizeUsername(username);

  const { data: employeeNumberData, error: numberError } = await supabase.rpc(
    "generate_admin_employee_number"
  );

  if (numberError || !employeeNumberData) {
    console.error("GENERATE EMPLOYEE NUMBER ERROR:", numberError);

    return {
      success: false,
      status: 500,
      message: "Не удалось создать уникальный номер.",
    };
  }

  const { data, error } = await supabase
    .from("site_admins")
    .insert({
      full_name: fullName.trim(),
      username: cleanUsername,
      birth_date: birthDate,
      employee_number: employeeNumberData,
      password_hash: null,
      role,
      category: role === "super_admin" ? "all" : category,
      is_active: true,
      must_set_password: true,
      password_created_at: null,
      failed_attempts: 0,
      locked_until: null,
      created_by: currentAdmin.id,
    })
    .select(
      `
      id,
      full_name,
      username,
      employee_number,
      birth_date,
      role,
      category,
      is_active,
      must_set_password,
      created_at
      `
    )
    .single();

  if (error) {
    console.error("CREATE STAFF ERROR:", error);

    if (error.code === "23505") {
      return {
        success: false,
        status: 409,
        message: "Такой логин или уникальный номер уже существует.",
      };
    }

    return {
      success: false,
      status: 500,
      message: "Ошибка создания админа.",
    };
  }

  await addAuditLog({
    adminId: currentAdmin.id,
    action: "admin_created",
    details: {
      createdAdminId: data.id,
      username: data.username,
      employeeNumber: data.employee_number,
      role: data.role,
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
      employeeNumber: data.employee_number,
      birthDate: data.birth_date,
      role: data.role,
      category: data.category,
      isActive: data.is_active,
      mustSetPassword: data.must_set_password,
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
  const allowedRoles = ["super_admin", "site_support", "support_admin"];
  if (!allowedRoles.includes(currentAdmin.role)) {
    return {
      success: false,
      status: 403,
      message: "Недостаточно прав.",
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
    .select(
      `
      id,
      full_name,
      username,
      employee_number,
      birth_date,
      role,
      category,
      is_active,
      must_set_password
      `
    )
    .single();

  if (error || !data) {
    console.error("CHANGE STAFF STATUS ERROR:", error);

    return {
      success: false,
      status: 404,
      message: "Админ не найден.",
    };
  }

  await addAuditLog({
    adminId: currentAdmin.id,
    action: "admin_status_changed",
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
      employeeNumber: data.employee_number,
      birthDate: data.birth_date,
      role: data.role,
      category: data.category,
      isActive: data.is_active,
      mustSetPassword: data.must_set_password,
    },
  };
}



export async function checkAdminUsername({ username }) {
  const cleanUsername = normalizeUsername(username);

  if (!cleanUsername) {
    return {
      success: false,
      status: 400,
      message: "Введите название аккаунта.",
    };
  }

  const { data: admin, error } = await supabase
    .from("site_admins")
    .select(
      "id, full_name, username, role, category, is_active, password_hash, must_set_password"
    )
    .eq("username", cleanUsername)
    .single();

  if (error || !admin) {
    return {
      success: false,
      status: 404,
      message: "Такой аккаунт не найден.",
    };
  }

  if (!admin.is_active) {
    return {
      success: false,
      status: 403,
      message: "Аккаунт администратора заблокирован.",
    };
  }

  if (!admin.password_hash || admin.must_set_password) {
    return {
      success: true,
      status: 200,
      needPasswordCreate: true,
      message: "У вас ещё нет пароля. Введите уникальный номер и создайте пароль.",
      admin: {
        username: admin.username,
        fullName: admin.full_name,
      },
    };
  }

  return {
    success: true,
    status: 200,
    needPasswordCreate: false,
    message: "Введите пароль для входа.",
  };
}

export async function createInitialAdminPassword({
  username,
  employeeNumber,
  password,
  repeatPassword,
  ip,
  userAgent,
}) {
  const cleanUsername = normalizeUsername(username);

  if (!cleanUsername || !employeeNumber || !password || !repeatPassword) {
    return {
      success: false,
      status: 400,
      message: "Заполните логин, уникальный номер и пароль.",
    };
  }

  if (password !== repeatPassword) {
    return {
      success: false,
      status: 400,
      message: "Пароли не совпадают.",
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      status: 400,
      message: "Пароль должен быть минимум 8 символов.",
    };
  }

  if (!/^[0-9]+$/.test(employeeNumber)) {
    return {
      success: false,
      status: 400,
      message: "Уникальный номер должен состоять только из цифр.",
    };
  }

  const { data: admins, error } = await supabase.rpc(
    "set_site_admin_password",
    {
      input_username: cleanUsername,
      input_employee_number: employeeNumber,
      input_password: password,
    }
  );

  if (error) {
    console.error("SET ADMIN PASSWORD ERROR:", error);

    return {
      success: false,
      status: 500,
      message: "Ошибка создания пароля.",
    };
  }

  const admin = admins?.[0];

  if (!admin) {
    return {
      success: false,
      status: 400,
      message: "Неверный логин или уникальный номер.",
    };
  }

  await addAuditLog({
    adminId: admin.id,
    action: "admin_password_created",
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
    message: "Пароль создан. Выполнен вход в систему.",
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