

import express from "express";
import multer from "multer";
import crypto from "crypto";
import { supabase } from "../lib/supabaseAdmin.js";
import { sendOrganizationAccessEmail } from "../services/emailService.js";

const router = express.Router();

const upload = multer({
storage: multer.memoryStorage(),
limits: {
fileSize: 30 * 1024 * 1024,
},
});

const BUCKET_NAME = "organization-documents";

function hashPassword(password) {
if (!password) return null;

const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");

return salt + ":" + hash;
}

function generatePassword() {
const a = Math.random().toString(36).slice(2, 6).toUpperCase();
const b = Math.random().toString(36).slice(2, 6).toUpperCase();

return a + "-" + b;
}

function getOrganizationId(req) {
return (
req.headers["x-organization-id"] ||
req.query.organization_id ||
req.query.organizationId ||
(req.body && req.body.organization_id) ||
(req.body && req.body.organizationId) ||
null
);
}

function safeText(value) {
if (value === undefined || value === null) return "";
return String(value).trim();
}

function safeFileName(name) {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const baseName = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;

  const ru = {
    'а':'a', 'б':'b', 'в':'v', 'г':'g', 'д':'d', 'е':'e', 'ё':'e', 'ж':'zh', 
    'з':'z', 'is':'i', 'и':'i', 'й':'y', 'к':'k', 'л':'l', 'м':'m', 'н':'n', 'о':'o', 
    'п':'p', 'р':'r', 'с':'s', 'т':'t', 'у':'u', 'ф':'f', 'х':'h', 'ц':'ts', 
    'ч':'ch', 'ш':'sh', 'щ':'sch', 'ъ':'', 'ы':'y', 'ь':'', 'э':'e', 'ю':'yu', 'я':'ya',
    'А':'A', 'Б':'B', 'В':'V', 'Г':'G', 'Д':'D', 'Е':'E', 'Ё':'E', 'Ж':'ZH', 
    'З':'Z', 'И':'I', 'Й':'Y', 'К':'K', 'Л':'L', 'M':'M', 'Н':'N', 'О':'O', 
    'П':'P', 'Р':'R', 'С':'S', 'Т':'T', 'У':'U', 'Ф':'F', 'Х':'H', 'Ц':'TS', 
    'Ч':'CH', 'Ш':'SH', 'Щ':'SCH', 'Ъ':'', 'Ы':'Y', 'Ь':'', 'Э':'E', 'Ю':'YU', 'Я':'YA'
  };
  
  let newName = "";
  for (let i = 0; i < baseName.length; i++) {
    const char = baseName[i];
    newName += ru[char] !== undefined ? ru[char] : char;
  }

  newName = newName
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);

  return newName + ext.toLowerCase().replace(/[^.a-z0-9]/g, "");
}

function getRoleByPosition(position) {
const value = String(position || "").toLowerCase();

if (value.includes("отдел кадров")) return "hr";
if (value.includes("заместитель")) return "deputy_chief_doctor";
if (value.includes("завед")) return "department_head";
if (value.includes("регистратор")) return "registrar";
if (value.includes("медсестр")) return "nurse";
if (value.includes("врач")) return "doctor";
if (value.includes("администратор")) return "organization_admin";

return "employee";
}

router.get("/departments", async (req, res) => {
try {
const organizationId = getOrganizationId(req);


if (!organizationId) {
  return res.status(400).json({
    success: false,
    message: "organization_id не указан.",
  });
}

const { data, error } = await supabase
  .from("organization_departments")
  .select("*")
  .eq("organization_id", organizationId)
  .order("created_at", { ascending: true });

if (error) {
  return res.status(500).json({
    success: false,
    message: error.message,
  });
}

return res.status(200).json({
  success: true,
  departments: data || [],
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка получения отделений.",
});
}
});

router.post("/departments", async (req, res) => {
try {
const organizationId = getOrganizationId(req);
const name = safeText(req.body.name);
const floor = safeText(req.body.floor);
const rooms = safeText(req.body.rooms);


if (!organizationId || !name) {
  return res.status(400).json({
    success: false,
    message: "Название отделения обязательно.",
  });
}

const { data, error } = await supabase
  .from("organization_departments")
  .insert({
    organization_id: organizationId,
    name,
    floor,
    rooms,
  })
  .select("*")
  .single();

if (error) {
  return res.status(500).json({
    success: false,
    message: error.message,
  });
}

return res.status(201).json({
  success: true,
  department: data,
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка добавления отделения.",
});
}
});

router.get("/employees", async (req, res) => {
try {
const organizationId = getOrganizationId(req);
const status = req.query.status ? String(req.query.status) : null;


if (!organizationId) {
  return res.status(400).json({
    success: false,
    message: "organization_id не указан.",
  });
}

let query = supabase
  .from("organization_employees")
  .select("*, organization_departments(name)")
  .eq("organization_id", organizationId)
  .order("created_at", { ascending: true });

if (status && status !== "all") {
  query = query.eq("status", status);
}

const { data: employees, error } = await query;

if (error) {
  return res.status(500).json({
    success: false,
    message: error.message,
  });
}

const employeeIds = (employees || []).map((item) => item.id);

let documents = [];

if (employeeIds.length > 0) {
  const { data: docs, error: docsError } = await supabase
    .from("organization_employee_documents")
    .select("*")
    .in("employee_id", employeeIds)
    .order("created_at", { ascending: true });

  if (!docsError) {
    documents = docs || [];
  }
}

const employeesWithDocuments = (employees || []).map((employee) => {
  const employeeDocuments = documents.filter((doc) => {
    return doc.employee_id === employee.id;
  });

  return {
    ...employee,
    department: employee.organization_departments ? employee.organization_departments.name : (employee.department || "—"),
    documents: employeeDocuments,
  };
});

return res.status(200).json({
  success: true,
  employees: employeesWithDocuments,
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка получения сотрудников.",
});
}
});

router.post("/employees", async (req, res) => {
try {
const organizationId = getOrganizationId(req);


const fullName = safeText(req.body.full_name || req.body.fullName);
const age = safeText(req.body.age);
const phone = safeText(req.body.phone);
const email = safeText(req.body.email).toLowerCase();
const position = safeText(req.body.position);
const department = safeText(req.body.department);
const departmentId = req.body.department_id || req.body.departmentId || null;
const cabinet = safeText(req.body.cabinet);
const role = safeText(req.body.role) || getRoleByPosition(position);
const status = safeText(req.body.status) || "active";

if (!organizationId) {
  return res.status(400).json({
    success: false,
    message: "organization_id не указан.",
  });
}

if (!fullName || !position || !departmentId) {
  return res.status(400).json({
    success: false,
    message: "ФИО, должность и отделение обязательны.",
  });
}

const { data: employee, error } = await supabase
  .from("organization_employees")
  .insert({
    organization_id: organizationId,
    department_id: departmentId,
    full_name: fullName,
    age,
    phone,
    email,
    position,
    cabinet,
    login: null,
    password_hash: null,
    must_change_password: true,
    status,
    updated_at: new Date().toISOString(),
  })
  .select("*")
  .single();

if (error) {
  return res.status(500).json({
    success: false,
    message: error.message,
  });
}

return res.status(201).json({
  success: true,
  message: "Сотрудник добавлен.",
  employee,
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка добавления сотрудника.",
});
}
});

router.patch("/employees/:id", async (req, res) => {
try {
const employeeId = req.params.id;


const payload = {};

if (req.body.full_name !== undefined || req.body.fullName !== undefined) {
  payload.full_name = safeText(req.body.full_name || req.body.fullName);
}

if (req.body.age !== undefined) payload.age = safeText(req.body.age);
if (req.body.phone !== undefined) payload.phone = safeText(req.body.phone);

if (req.body.email !== undefined) {
  payload.email = safeText(req.body.email).toLowerCase();
}

if (req.body.position !== undefined) {
  payload.position = safeText(req.body.position);
}


if (req.body.department_id !== undefined || req.body.departmentId !== undefined) {
  payload.department_id = req.body.department_id || req.body.departmentId || null;
}

if (req.body.cabinet !== undefined) {
  payload.cabinet = safeText(req.body.cabinet);
}

if (req.body.status !== undefined) {
  payload.status = safeText(req.body.status);
}

if (req.body.dismissed_at !== undefined) {
  payload.dismissed_at = req.body.dismissed_at || null;
}

payload.updated_at = new Date().toISOString();

const { data: currentEmployee } = await supabase
  .from("organization_employees")
  .select("*")
  .eq("id", employeeId)
  .maybeSingle();

const { data: updatedEmployee, error } = await supabase
  .from("organization_employees")
  .update(payload)
  .eq("id", employeeId)
  .select("*")
  .single();

if (error) {
  return res.status(500).json({
    success: false,
    message: error.message,
  });
}

if (currentEmployee && currentEmployee.login && payload.status) {
  await supabase
    .from("organization_users")
    .update({
      status:
        payload.status === "dismissed" || payload.status === "blocked"
          ? "blocked"
          : "active",
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", currentEmployee.organization_id)
    .eq("login", currentEmployee.login);
}

return res.status(200).json({
  success: true,
  message: "Данные сотрудника обновлены.",
  employee: updatedEmployee,
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка изменения сотрудника.",
});
}
});

router.delete("/employees/:id", async (req, res) => {
try {
const employeeId = req.params.id;


const { data: employee, error: employeeError } = await supabase
  .from("organization_employees")
  .select("*")
  .eq("id", employeeId)
  .maybeSingle();

if (employeeError || !employee) {
  return res.status(404).json({
    success: false,
    message: "Сотрудник не найден.",
  });
}

await supabase
  .from("organization_employee_documents")
  .delete()
  .eq("employee_id", employeeId);

if (employee.login) {
  await supabase
    .from("organization_users")
    .delete()
    .eq("organization_id", employee.organization_id)
    .eq("login", employee.login);
}

const { error } = await supabase
  .from("organization_employees")
  .delete()
  .eq("id", employeeId);

if (error) {
  return res.status(500).json({
    success: false,
    message: error.message,
  });
}

return res.status(200).json({
  success: true,
  message: "Сотрудник удалён.",
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка удаления сотрудника.",
});
}
});

router.post("/employee-documents", upload.any(), async (req, res) => {
try {
const organizationId = getOrganizationId(req);
const employeeId = req.body.employee_id || req.body.employeeId;


if (!organizationId || !employeeId) {
  return res.status(400).json({
    success: false,
    message: "organization_id и employee_id обязательны.",
  });
}

const uploadedDocuments = [];

for (let index = 0; index < (req.files || []).length; index += 1) {
  const file = req.files[index];
  const documentType = file.fieldname || "document";
  const fileName = safeFileName(file.originalname);
  const filePath =
    organizationId +
    "/employees/" +
    employeeId +
    "/" +
    documentType +
    "/" +
    Date.now() +
    "-" +
    index +
    "-" +
    fileName;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    return res.status(500).json({
      success: false,
      message: uploadError.message,
    });
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  const { data: document, error: documentError } = await supabase
    .from("organization_employee_documents")
    .insert({
      organization_id: organizationId,
      employee_id: employeeId,
      file_name: documentType + "__" + safeFileName(file.originalname),
      file_url: publicUrlData ? publicUrlData.publicUrl : null,
    })
    .select("*")
    .single();

  if (documentError) {
    return res.status(500).json({
      success: false,
      message: documentError.message,
    });
  }

  uploadedDocuments.push(document);
}

return res.status(201).json({
  success: true,
  message: "Документы загружены.",
  documents: uploadedDocuments,
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка загрузки документов.",
});
}
});

router.patch("/employees/:id/chief-approve", async (req, res) => {
try {
const organizationId = getOrganizationId(req);
const employeeId = req.params.id;


if (!organizationId || !employeeId) {
  return res.status(400).json({
    success: false,
    message: "organization_id и сотрудник обязательны.",
  });
}

const { data: updatedEmployee, error } = await supabase
  .from("organization_employees")
  .update({
    status: "approved_for_access",
    updated_at: new Date().toISOString(),
  })
  .eq("id", employeeId)
  .eq("organization_id", organizationId)
  .select("*")
  .single();

if (error) {
  return res.status(500).json({
    success: false,
    message: error.message,
  });
}

return res.status(200).json({
  success: true,
  message: "Сотрудник одобрен.",
  employee: updatedEmployee,
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка одобрения сотрудника.",
});
}
});

router.patch("/employees/:id/chief-reject", async (req, res) => {
try {
const organizationId = getOrganizationId(req);
const employeeId = req.params.id;
const rejectReason = safeText(req.body.rejectReason || req.body.reason);


if (!organizationId || !employeeId) {
  return res.status(400).json({
    success: false,
    message: "organization_id и сотрудник обязательны.",
  });
}

const { data: updatedEmployee, error } = await supabase
  .from("organization_employees")
  .update({
    status: "rejected_by_chief",
    rejection_reason: rejectReason || null,
    updated_at: new Date().toISOString(),
  })
  .eq("id", employeeId)
  .eq("organization_id", organizationId)
  .select("*")
  .single();

if (error) {
  return res.status(500).json({
    success: false,
    message: error.message,
  });
}

return res.status(200).json({
  success: true,
  message: "Сотрудник отклонён.",
  employee: updatedEmployee,
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка отклонения сотрудника.",
});
}
});

router.post("/employees/:id/access", async (req, res) => {
try {
const organizationId = getOrganizationId(req);
const employeeId = req.params.id;


const login = safeText(req.body.login);
const tempPassword = safeText(req.body.tempPassword) || generatePassword();

if (!organizationId || !employeeId || !login || !tempPassword) {
  return res.status(400).json({
    success: false,
    message: "organization_id, сотрудник, логин и пароль обязательны.",
  });
}

const { data: employee, error: employeeError } = await supabase
  .from("organization_employees")
  .select("*")
  .eq("id", employeeId)
  .eq("organization_id", organizationId)
  .single();

if (employeeError || !employee) {
  return res.status(404).json({
    success: false,
    message: "Сотрудник не найден.",
  });
}

const passwordHash = hashPassword(tempPassword);
let role = employee.role || getRoleByPosition(employee.position);
if (role === "chief" || role === "chief_doctor") {
  role = "chief_doctor";
} else if (role === "admin" || role === "organization_admin") {
  role = "organization_admin";
} else if (role === "hr") {
  role = "hr";
} else if (["doctor", "nurse", "registrar", "department_head", "deputy_chief_doctor"].includes(role)) {
  // Keep the role as is
} else {
  role = "employee";
}

// Map the role to a DB-compatible value to satisfy organization_users_role_check constraint
let dbRole = "employee";
if (role === "chief_doctor" || role === "chief") {
  dbRole = "chief_doctor";
} else if (role === "organization_admin" || role === "admin") {
  dbRole = "organization_admin";
} else if (role === "hr") {
  dbRole = "hr";
} else {
  dbRole = "employee";
}

const { data: updatedEmployee, error: updateError } = await supabase
  .from("organization_employees")
  .update({
    login,
    password_hash: passwordHash,
    must_change_password: true,
    status: "active",
    updated_at: new Date().toISOString(),
  })
  .eq("id", employeeId)
  .eq("organization_id", organizationId)
  .select("*")
  .single();

if (updateError) {
  return res.status(500).json({
    success: false,
    message: updateError.message,
  });
}

const { error: userError } = await supabase.from("organization_users").upsert(
  {
    organization_id: organizationId,
    application_id: employee.application_id || null,
    city: req.body.city || employee.city || "",
    bin: req.body.bin || employee.bin || "",
    full_name: employee.full_name,
    phone: employee.phone || "",
    email: employee.email || "",
    role: dbRole,
    login,
    password_hash: passwordHash,
    must_change_password: true,
    status: "active",
    updated_at: new Date().toISOString(),
  },
  {
    onConflict: "organization_id,login",
  }
);

if (userError) {
  return res.status(500).json({
    success: false,
    message: userError.message,
  });
}

if (employee.email) {
  try {
    const { data: organization } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    const roleLabels = {
      chief_doctor: "Главный врач",
      organization_admin: "Администратор организации",
      hr: "Кадровый специалист",
      registrar: "Регистратор",
      nurse: "Медсестра / медбрат",
      doctor: "Врач",
      employee: "Сотрудник"
    };

    const resolvedRole = employee.role || getRoleByPosition(employee.position);
    const roleLabel = roleLabels[resolvedRole] || employee.position || "Сотрудник";

    await sendOrganizationAccessEmail({
      to: employee.email,
      application: {
        organization_name: organization?.organization_name || "Медицинская организация",
        application_number: organization?.application_number || "не указан"
      },
      fullName: employee.full_name,
      roleLabel: roleLabel,
      login: login,
      tempPassword: tempPassword
    });
  } catch (emailErr) {
    console.error("Ошибка отправки письма сотруднику:", emailErr);
  }
}

return res.status(200).json({
  success: true,
  message: "Доступ сотруднику создан.",
  tempPassword,
  employee: updatedEmployee,
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка создания доступа.",
});
}
});

router.patch("/employees/:id/reset-password", async (req, res) => {
try {
const organizationId = getOrganizationId(req);
const employeeId = req.params.id;
const tempPassword = safeText(req.body.tempPassword) || generatePassword();


if (!organizationId || !employeeId) {
  return res.status(400).json({
    success: false,
    message: "organization_id и сотрудник обязательны.",
  });
}

const { data: employee, error: employeeError } = await supabase
  .from("organization_employees")
  .select("*")
  .eq("id", employeeId)
  .eq("organization_id", organizationId)
  .single();

if (employeeError || !employee) {
  return res.status(404).json({
    success: false,
    message: "Сотрудник не найден.",
  });
}

if (!employee.login) {
  return res.status(400).json({
    success: false,
    message: "У сотрудника ещё нет логина.",
  });
}

const passwordHash = hashPassword(tempPassword);

const { data: updatedEmployee, error: updateError } = await supabase
  .from("organization_employees")
  .update({
    password_hash: passwordHash,
    must_change_password: true,
    updated_at: new Date().toISOString(),
  })
  .eq("id", employeeId)
  .eq("organization_id", organizationId)
  .select("*")
  .single();

if (updateError) {
  return res.status(500).json({
    success: false,
    message: updateError.message,
  });
}

const { error: userError } = await supabase
  .from("organization_users")
  .update({
    password_hash: passwordHash,
    must_change_password: true,
    updated_at: new Date().toISOString(),
  })
  .eq("organization_id", organizationId)
  .eq("login", employee.login);

if (userError) {
  return res.status(500).json({
    success: false,
    message: userError.message,
  });
}

return res.status(200).json({
  success: true,
  message: "Пароль сброшен.",
  tempPassword,
  employee: updatedEmployee,
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка сброса пароля.",
});
}
});

router.patch("/employees/:id/block", async (req, res) => {
try {
const organizationId = getOrganizationId(req);
const employeeId = req.params.id;


const { data: employee, error: employeeError } = await supabase
  .from("organization_employees")
  .select("*")
  .eq("id", employeeId)
  .eq("organization_id", organizationId)
  .single();

if (employeeError || !employee) {
  return res.status(404).json({
    success: false,
    message: "Сотрудник не найден.",
  });
}

const { data: updatedEmployee, error: updateError } = await supabase
  .from("organization_employees")
  .update({
    status: "blocked",
    updated_at: new Date().toISOString(),
  })
  .eq("id", employeeId)
  .eq("organization_id", organizationId)
  .select("*")
  .single();

if (updateError) {
  return res.status(500).json({
    success: false,
    message: updateError.message,
  });
}

if (employee.login) {
  await supabase
    .from("organization_users")
    .update({
      status: "blocked",
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("login", employee.login);
}

return res.status(200).json({
  success: true,
  message: "Доступ заблокирован.",
  employee: updatedEmployee,
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка блокировки доступа.",
});
}
});

router.patch("/employees/:id/unblock", async (req, res) => {
try {
const organizationId = getOrganizationId(req);
const employeeId = req.params.id;


const { data: employee, error: employeeError } = await supabase
  .from("organization_employees")
  .select("*")
  .eq("id", employeeId)
  .eq("organization_id", organizationId)
  .single();

if (employeeError || !employee) {
  return res.status(404).json({
    success: false,
    message: "Сотрудник не найден.",
  });
}

const { data: updatedEmployee, error: updateError } = await supabase
  .from("organization_employees")
  .update({
    status: "active",
    updated_at: new Date().toISOString(),
  })
  .eq("id", employeeId)
  .eq("organization_id", organizationId)
  .select("*")
  .single();

if (updateError) {
  return res.status(500).json({
    success: false,
    message: updateError.message,
  });
}

if (employee.login) {
  await supabase
    .from("organization_users")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("login", employee.login);
}

return res.status(200).json({
  success: true,
  message: "Доступ разблокирован.",
  employee: updatedEmployee,
});


} catch (error) {
return res.status(500).json({
success: false,
message: error.message || "Ошибка разблокировки доступа.",
});
}
});

export default router;
