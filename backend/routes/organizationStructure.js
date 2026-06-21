

import express from "express";
import multer from "multer";
import crypto from "crypto";

import { supabase } from "../lib/supabaseAdmin.js";
import { sendOrganizationAccessEmail, sendAppointmentBookingEmail } from "../services/emailService.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

const upload = multer({
storage: multer.memoryStorage(),
limits: {
fileSize: 30 * 1024 * 1024,
},
});

const BUCKET_NAME = "organization-documents";

// GET /api/organization-structure/public/organizations (Public Route)
router.get("/public/organizations", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, organization_name, bin, city, status")
      .in("status", ["approved", "waiting_first_login"]);

    if (error) {
      const { data: rawData, error: rawError } = await supabase
        .from("organizations")
        .select("id, organization_name, bin, city");
      if (rawError) throw rawError;
      return res.status(200).json({ success: true, organizations: rawData || [] });
    }

    return res.status(200).json({ success: true, organizations: data || [] });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения списка организаций.",
    });
  }
});

// Protect all subsequent routes with Bearer JWT check
router.use(authenticateToken);







function calculateAge(birthDateStr) {
  if (!birthDateStr) return "";
  try {
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return String(age);
  } catch (e) {
    return "";
  }
}

function checkAuth(req, res, allowedRoles) {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Не авторизован." });
    return null;
  }
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({ success: false, message: "Доступ запрещен." });
    return null;
  }
  
  const ctx = {
    role: req.user.role,
    userId: req.user.id
  };
  
  if (req.user.role === "organization_admin") {
    ctx.organizationId = req.user.organization_id;
  } else if (req.user.role === "doctor") {
    ctx.organizationId = req.user.organization_id;
    ctx.employeeId = req.user.id;
  } else if (req.user.role === "patient") {
    ctx.patientIin = req.user.iin;
  } else if (req.user.role === "support") {
    ctx.organizationId = req.headers["x-organization-id"] || req.query.organization_id || req.body?.organization_id;
    ctx.employeeId = req.query.employee_id || req.body?.employee_id;
    ctx.patientIin = req.query.patient_iin || req.body?.patient_iin;
  }
  
  return ctx;
}

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
  if (value.includes("врач") || value.includes("doctor")) return "doctor";
  if (value.includes("администратор") || value.includes("admin")) return "organization_admin";
  return "doctor"; // Врач по умолчанию
}


async function checkCabinetOverlap(
  employeeId,
  cabinet,
  organizationId,
  workStart,
  workEnd,
  workDays
) {
  if (!cabinet || !organizationId) {
    return false;
  }

  const normalizedWorkDays = Array.isArray(workDays)
    ? workDays.map(Number)
    : [];

  if (
    !workStart ||
    !workEnd ||
    normalizedWorkDays.length === 0
  ) {
    return false;
  }

  let employeesQuery = supabase
    .from("organization_employees")
    .select("id, full_name")
    .eq("organization_id", organizationId)
    .eq("cabinet", cabinet)
    .eq("status", "active");

  if (employeeId) {
    employeesQuery = employeesQuery.neq("id", employeeId);
  }

  const {
    data: otherEmployees,
    error: employeesError,
  } = await employeesQuery;

  if (employeesError) {
    throw new Error(
      employeesError.message ||
        "Не удалось проверить занятость кабинета."
    );
  }

  if (!otherEmployees || otherEmployees.length === 0) {
    return false;
  }

  const otherEmployeeIds = otherEmployees.map(
    (employee) => employee.id
  );

  const {
    data: schedules,
    error: schedulesError,
  } = await supabase
    .from("doctor_schedules")
    .select(
      "employee_id, work_days, work_start, work_end"
    )
    .in("employee_id", otherEmployeeIds);

  if (schedulesError) {
    throw new Error(
      schedulesError.message ||
        "Не удалось загрузить графики врачей."
    );
  }

  for (const otherEmployee of otherEmployees) {
    const schedule = (schedules || []).find(
      (item) =>
        String(item.employee_id) ===
        String(otherEmployee.id)
    );

    // Если у врача нет сохранённого графика,
    // его не учитываем при сравнении времени.
    if (!schedule) {
      continue;
    }

    const scheduleWorkDays = Array.isArray(
      schedule.work_days
    )
      ? schedule.work_days.map(Number)
      : [];

    const daysIntersect = normalizedWorkDays.some(
      (day) => scheduleWorkDays.includes(day)
    );

    if (!daysIntersect) {
      continue;
    }

    const timesIntersect =
      workStart < schedule.work_end &&
      workEnd > schedule.work_start;

    if (timesIntersect) {
      return (
        `Кабинет ${cabinet} уже занят врачом ` +
        `${otherEmployee.full_name} в это время ` +
        `(${schedule.work_start}–${schedule.work_end}, ` +
        `дни: ${scheduleWorkDays.join(", ")}).`
      );
    }
  }

  return false;
}



router.get("/departments", async (req, res) => {
try {
const ctx = checkAuth(req, res, ["organization_admin", "doctor", "support", "patient"]);
if (!ctx) return;
const organizationId = ctx.organizationId;


if (!organizationId) {
  return res.status(400).json({
    success: false,
    message: "organization_id не указан.",
  });
}

let { data, error } = await supabase
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

// Auto-initialize standard departments if list is empty


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
const ctx = checkAuth(req, res, ["organization_admin", "support"]);
if (!ctx) return;
const organizationId = ctx.organizationId;
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
const ctx = checkAuth(req, res, ["organization_admin", "doctor", "support", "patient"]);
if (!ctx) return;
const organizationId = ctx.organizationId;
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
  const employeeDocuments = documents.filter(
    (document) => document.employee_id === employee.id
  );

  return {
    ...employee,
    department: employee.organization_departments
      ? employee.organization_departments.name
      : employee.department || "—",
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
const ctx = checkAuth(req, res, ["organization_admin", "support"]);
if (!ctx) return;
const organizationId = ctx.organizationId;

const fullName = safeText(req.body.full_name || req.body.fullName);
const birthDate = safeText(req.body.birth_date || req.body.birthDate);
const age = req.body.age ? safeText(req.body.age) : (birthDate ? calculateAge(birthDate) : "");
const phone = safeText(req.body.phone);
const email = safeText(req.body.email).toLowerCase();
const specialty = safeText(req.body.specialty || req.body.position);
const position = specialty;
const department = safeText(req.body.department);
const departmentId = req.body.department_id || req.body.departmentId || null;
const cabinet = safeText(req.body.cabinet);
const status = safeText(req.body.status) || "active";

    // Validate email and phone formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Неверный формат email." });
    }

    const phoneRegex = /^\+?[0-9\s()+-]{10,20}$/;
    if (phone && !phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: "Неверный формат номера телефона." });
    }

    // Uniqueness checks across the whole database table organization_employees
    if (email) {
      const { data: existingEmail } = await supabase
        .from("organization_employees")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existingEmail) {
        return res.status(400).json({ success: false, message: "Сотрудник с такой почтой уже зарегистрирован в системе." });
      }
    }

    if (phone) {
      const { data: existingPhone } = await supabase
        .from("organization_employees")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      if (existingPhone) {
        return res.status(400).json({ success: false, message: "Сотрудник с таким номером телефона уже зарегистрирован в системе." });
      }
    }

if (!organizationId) {
  return res.status(400).json({
    success: false,
    message: "organization_id не указан.",
  });
}

    if (!fullName || !specialty || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "ФИО, специальность и отделение обязательны.",
      });
    }

    const workStart = req.body.work_start || req.body.workStart || "08:00";
    const workEnd = req.body.work_end || req.body.workEnd || "17:00";
    const workDays = req.body.work_days || [1, 2, 3, 4, 5];

    const overlapError = await checkCabinetOverlap(null, cabinet, organizationId, workStart, workEnd, workDays);
    if (overlapError) {
      return res.status(400).json({
        success: false,
        message: overlapError
      });
    }

    const { data: employee, error } = await supabase
  .from("organization_employees")
  .insert({
    organization_id: organizationId,
    department_id: departmentId,
    full_name: fullName,
    age,
    birth_date: birthDate || null,
    phone,
    email,
    position,
    specialty,
    cabinet,
    role: "doctor",
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
const ctx = checkAuth(req, res, ["organization_admin", "support"]);
if (!ctx) return;
const employeeId = req.params.id;

if (ctx.role === "organization_admin") {
  const { data: empCheck } = await supabase
    .from("organization_employees")
    .select("organization_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
    return res.status(403).json({ success: false, message: "Доступ запрещен." });
  }
}


const payload = {};

if (req.body.full_name !== undefined || req.body.fullName !== undefined) {
  payload.full_name = safeText(req.body.full_name || req.body.fullName);
}

if (req.body.birth_date !== undefined || req.body.birthDate !== undefined) {
  payload.birth_date = safeText(req.body.birth_date || req.body.birthDate);
  payload.age = calculateAge(payload.birth_date);
} else if (req.body.age !== undefined) {
  payload.age = safeText(req.body.age);
}

if (req.body.phone !== undefined) payload.phone = safeText(req.body.phone);

if (req.body.email !== undefined) {
  payload.email = safeText(req.body.email).toLowerCase();
}

if (req.body.specialty !== undefined || req.body.position !== undefined) {
  payload.specialty = safeText(req.body.specialty || req.body.position);
  payload.position = payload.specialty;
}

if (req.body.department_id !== undefined || req.body.departmentId !== undefined) {
  payload.department_id = req.body.department_id || req.body.departmentId || null;
}

if (req.body.cabinet !== undefined) {
  payload.cabinet = safeText(req.body.cabinet);
}


if (req.body.status === "dismissed") {
  payload.status = "dismissed";
  payload.dismissed_at = new Date().toISOString();
} else if (req.body.status !== undefined) {
  payload.status = safeText(req.body.status);
}



if (req.body.dismissed_at !== undefined) {
  payload.dismissed_at = req.body.dismissed_at || null;
}

payload.updated_at = new Date().toISOString();

if (payload.email) {
  const email = payload.email;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Неверный формат email." });
  }
  const { data: existingEmail } = await supabase
    .from("organization_employees")
    .select("id")
    .eq("email", email)
    .neq("id", employeeId)
    .maybeSingle();
  if (existingEmail) {
    return res.status(400).json({ success: false, message: "Сотрудник с такой почтой уже зарегистрирован в системе." });
  }
}

if (payload.phone) {
  const phone = payload.phone;
  const phoneRegex = /^\+?[0-9\s()+-]{10,20}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ success: false, message: "Неверный формат номера телефона." });
  }
  const { data: existingPhone } = await supabase
    .from("organization_employees")
    .select("id")
    .eq("phone", phone)
    .neq("id", employeeId)
    .maybeSingle();
  if (existingPhone) {
    return res.status(400).json({ success: false, message: "Сотрудник с таким номером телефона уже зарегистрирован в системе." });
  }
}

const { data: currentEmployee } = await supabase
  .from("organization_employees")
  .select("*")
  .eq("id", employeeId)
  .maybeSingle();


if (
  currentEmployee &&
  payload.cabinet !== undefined &&
  payload.cabinet !== currentEmployee.cabinet
) {
  const { data: doctorSchedule, error: scheduleError } = await supabase
    .from("doctor_schedules")
    .select("*")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (scheduleError) {
    return res.status(500).json({
      success: false,
      code: "SCHEDULE_LOAD_FAILED",
      message:
        scheduleError.message ||
        "Не удалось загрузить график врача.",
    });
  }

  if (doctorSchedule) {
    const overlapError = await checkCabinetOverlap(
      employeeId,
      payload.cabinet,
      currentEmployee.organization_id,
      doctorSchedule.work_start,
      doctorSchedule.work_end,
      doctorSchedule.work_days
    );

    if (overlapError) {
      return res.status(400).json({
        success: false,
        message: overlapError,
      });
    }
  }
}



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


if (
  currentEmployee &&
  currentEmployee.login &&
  payload.status === "dismissed"
) {
  await supabase
    .from("organization_users")
    .update({
      status: "blocked",
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", currentEmployee.organization_id)
    .eq("login", currentEmployee.login);
} else if (
  currentEmployee &&
  currentEmployee.login &&
  payload.status
) {
  await supabase
    .from("organization_users")
    .update({
      status:
        payload.status === "blocked"
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
  const ctx = checkAuth(req, res, ["organization_admin", "support"]);
  if (!ctx) return;
  const employeeId = req.params.id;

  if (ctx.role === "organization_admin") {
    const { data: empCheck } = await supabase
      .from("organization_employees")
      .select("organization_id")
      .eq("id", employeeId)
      .maybeSingle();
    if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }
  }
  return res.status(405).json({
    success: false,
    code: "PHYSICAL_DELETE_DISABLED",
    message:
      "Физическое удаление врача запрещено. Используйте архивирование.",
  });
});


router.post("/employee-documents", upload.any(), async (req, res) => {
try {
const ctx = checkAuth(req, res, ["organization_admin", "support"]);
if (!ctx) return;
const organizationId = ctx.organizationId;
const employeeId = req.body.employee_id || req.body.employeeId;

if (ctx.role === "organization_admin") {
  const { data: empCheck } = await supabase
    .from("organization_employees")
    .select("organization_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
    return res.status(403).json({ success: false, message: "Доступ запрещен." });
  }
}


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





router.post("/employees/:id/access", async (req, res) => {
try {
const ctx = checkAuth(req, res, ["organization_admin", "support"]);
if (!ctx) return;
const organizationId = ctx.organizationId;
const employeeId = req.params.id;

if (ctx.role === "organization_admin") {
  const { data: empCheck } = await supabase
    .from("organization_employees")
    .select("organization_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
    return res.status(403).json({ success: false, message: "Доступ запрещен." });
  }
}


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
const dbRole = "doctor";

const { data: updatedEmployee, error: updateError } = await supabase
  .from("organization_employees")
  .update({
    login,
    password_hash: passwordHash,
    role: "doctor",
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
    role: "doctor",
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

    const roleLabel = "Врач";

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
const ctx = checkAuth(req, res, ["organization_admin", "support"]);
if (!ctx) return;
const organizationId = ctx.organizationId;
const employeeId = req.params.id;

if (ctx.role === "organization_admin") {
  const { data: empCheck } = await supabase
    .from("organization_employees")
    .select("organization_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
    return res.status(403).json({ success: false, message: "Доступ запрещен." });
  }
}
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
const ctx = checkAuth(req, res, ["organization_admin", "support"]);
if (!ctx) return;
const organizationId = ctx.organizationId;
const employeeId = req.params.id;

if (ctx.role === "organization_admin") {
  const { data: empCheck } = await supabase
    .from("organization_employees")
    .select("organization_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
    return res.status(403).json({ success: false, message: "Доступ запрещен." });
  }
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
const ctx = checkAuth(req, res, ["organization_admin", "support"]);
if (!ctx) return;
const organizationId = ctx.organizationId;
const employeeId = req.params.id;

if (ctx.role === "organization_admin") {
  const { data: empCheck } = await supabase
    .from("organization_employees")
    .select("organization_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
    return res.status(403).json({ success: false, message: "Доступ запрещен." });
  }
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

// Persistent JSON fallback for appointments if DB table does not exist








// GET /api/organization-structure/appointments
router.get("/appointments", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "doctor", "support"]);
    if (!ctx) return;
    let employeeId = req.query.employee_id || req.query.employeeId;
    let organizationId = ctx.organizationId;

    if (ctx.role === "doctor") {
      employeeId = ctx.employeeId;
    } else if (ctx.role === "organization_admin") {
      if (employeeId) {
        const { data: empCheck } = await supabase
          .from("organization_employees")
          .select("organization_id")
          .eq("id", employeeId)
          .maybeSingle();
        if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
          return res.status(403).json({ success: false, message: "Доступ запрещен." });
        }
      }
    } else if (ctx.role === "support") {
      organizationId = req.query.organization_id || req.query.organizationId;
      employeeId = req.query.employee_id || req.query.employeeId;
    }
    const date = req.query.date;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (!employeeId && !organizationId) {
      return res.status(400).json({
        success: false,
        message: "employee_id или organization_id обязателен.",
      });
    }

    
let query = supabase
  .from("organization_appointments")
  .select("*");

if (employeeId) {
  query = query.eq("employee_id", employeeId);
} else {
  query = query.eq("organization_id", organizationId);
}

if (date) {
  query = query.eq("date", date);
} else {
  if (startDate) {
    query = query.gte("date", startDate);
  }

  if (endDate) {
    query = query.lte("date", endDate);
  }
}

query = query
  .order("date", { ascending: true })
  .order("time", { ascending: true });

const { data: appointments, error } = await query;

if (error) {
  return res.status(500).json({
    success: false,
    code: "APPOINTMENTS_LOAD_FAILED",
    message:
      error.message ||
      "Не удалось загрузить записи.",
  });
}
    return res.status(200).json({
      success: true,
      appointments: appointments || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения записей.",
    });
  }
});

// GET /api/organization-structure/appointments/patient/:iin
router.get("/appointments/patient/:iin", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["patient", "doctor", "organization_admin", "support"]);
    if (!ctx) return;
    let iin = req.params.iin;
    if (ctx.role === "patient") {
      iin = ctx.patientIin;
    }
    if (!iin) {
      return res.status(400).json({
        success: false,
        message: "ИИН обязателен.",
      });
    }

    const { data: appointments, error } = await supabase
      .from("organization_appointments")
      .eq("patient_iin", iin)
      .order("date", { ascending: false })
      .order("time", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message || "Не удалось загрузить записи.",
      });
    }

    if (appointments.length === 0) {
      return res.status(200).json({
        success: true,
        appointments: [],
      });
    }

    const orgIds = [...new Set(appointments.map(a => a.organization_id).filter(Boolean))];
    const empIds = [...new Set(appointments.map(a => a.employee_id).filter(Boolean))];

    let organizations = [];
    let employees = [];

    if (orgIds.length > 0) {
      try {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, organization_name")
          .in("id", orgIds);
        organizations = orgs || [];
      } catch (e) {}
    }

    if (empIds.length > 0) {
      try {
        const { data: emps } = await supabase
          .from("organization_employees")
          .select("id, full_name, position, cabinet")
          .in("id", empIds);
        employees = emps || [];
      } catch (e) {}
    }

    const orgMap = Object.fromEntries(organizations.map(o => [o.id, o]));
    const empMap = Object.fromEntries(employees.map(e => [e.id, e]));

    

    const formatted = appointments.map(app => {
      const org = orgMap[app.organization_id];
      const emp = empMap[app.employee_id];
      return {
        ...app,
        
        organization_name: org ? org.organization_name : "Медицинская организация",
        doctor_name: emp ? emp.full_name : "Врач",
        doctor_position: emp ? emp.position : "",
        cabinet: app.cabinet || (emp ? emp.cabinet : "") || "—"
      };
    });

    return res.status(200).json({
      success: true,
      appointments: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения истории посещений.",
    });
  }
});

// POST /api/organization-structure/appointments
router.post("/appointments", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["patient", "organization_admin", "support"]);
    if (!ctx) return;
    let patient_iin = req.body.patient_iin;
    let organization_id = req.body.organization_id;
    if (ctx.role === "patient") {
      patient_iin = ctx.patientIin;
    } else if (ctx.role === "organization_admin") {
      organization_id = ctx.organizationId;
    }
    const {
      employee_id,
      patient_name,
      patient_phone,
      patient_email,
      date,
      time,
      reason,
      cabinet,
      comment
    } = req.body;

    if (!organization_id || !employee_id || !patient_name || !patient_iin || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Организация, сотрудник, ФИО, ИИН, дата и время обязательны.",
      });
    }

    // Check for double booking
    const { data: existingApp, error: checkErr } = await supabase
      .from("organization_appointments")
      .select("id")
      .eq("employee_id", employee_id)
      .eq("date", date)
      .eq("time", time)
      .not("status", "in", '("cancelled","rejected")')
      .maybeSingle();

    if (checkErr) {
      return res.status(500).json({
        success: false,
        message: "Ошибка проверки доступности времени: " + checkErr.message,
      });
    }

    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: "Этот временной слот уже занят другим пациентом. Пожалуйста, выберите другое время.",
      });
    }

    const verification_code = Math.floor(1000 + Math.random() * 9000).toString();

    const newApp = {
      id: crypto.randomUUID ? crypto.randomUUID() : "app-" + Date.now(),
      organization_id,
      employee_id,
      patient_name,
      patient_iin,
      patient_phone: patient_phone || "",
      patient_email: patient_email || "",
      date,
      time,
      reason: reason || "Прием к врачу",
      status: "scheduled",
      cabinet: cabinet || "",
      comment: comment || "",
      verification_code,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: savedApp, error: insertErr } = await supabase
      .from("organization_appointments")
      .insert(newApp)
      .select("*")
      .single();

    if (insertErr) {
      return res.status(500).json({
        success: false,
        message: "Не удалось создать запись на прием: " + insertErr.message,
      });
    }

    // Load organization name and doctor name for email details
    let orgName = "Медицинская организация";
    let docName = "Врач";

    try {
      const { data: org } = await supabase.from("organizations").select("organization_name").eq("id", organization_id).maybeSingle();
      if (org) orgName = org.organization_name;

      const { data: emp } = await supabase.from("organization_employees").select("full_name, cabinet").eq("id", employee_id).maybeSingle();
      if (emp) {
        docName = emp.full_name;
        if (!cabinet && emp.cabinet) {
          savedApp.cabinet = emp.cabinet;
          await supabase.from("organization_appointments").update({ cabinet: emp.cabinet }).eq("id", savedApp.id);
        }
      }
    } catch (metaErr) {
      console.warn("Meta lookup failed:", metaErr.message);
    }

    // Send email notification to client
    if (patient_email) {
      try {
        await sendAppointmentBookingEmail({
          to: patient_email,
          patientName: patient_name,
          organizationName: orgName,
          doctorName: docName,
          date,
          time,
          cabinet: savedApp.cabinet || cabinet || "—",
          appointmentId: savedApp.id,
          verificationCode: savedApp.verification_code || verification_code
        });
      } catch (emailErr) {
        console.error("Booking email dispatch failed:", emailErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Запись на прием успешно создана.",
      appointment: savedApp,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка записи на прием.",
    });
  }
});

// PATCH /api/organization-structure/appointments/:id/status
router.patch("/appointments/:id/status", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["patient", "doctor", "organization_admin", "support"]);
    if (!ctx) return;
    const appId = req.params.id;
    const { status, verificationCode } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Статус обязателен.",
      });
    }

    // Fetch current appointment to check code
    const { data: appointment, error: fetchErr } = await supabase
      .from("organization_appointments")
      .select("*")
      .eq("id", appId)
      .maybeSingle();

    if (fetchErr) {
      return res.status(500).json({
        success: false,
        message: "Ошибка базы данных при получении записи: " + fetchErr.message,
      });
    }

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Запись не найдена.",
      });
    }

    if (ctx.role === "patient" && appointment.patient_iin !== ctx.patientIin) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }
    if (ctx.role === "doctor" && appointment.employee_id !== ctx.employeeId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }
    if (ctx.role === "organization_admin" && appointment.organization_id !== ctx.organizationId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }

    if (status === "completed") {
      const expectedCode = String(appointment.verification_code || "").trim();
      const providedCode = String(verificationCode || "").trim();
      if (expectedCode && expectedCode !== providedCode) {
        return res.status(400).json({
          success: false,
          message: "Неверный код подтверждения визита. Пожалуйста, введите правильный 4-значный код из талона пациента.",
        });
      }
    }

    const { data, error: updateErr } = await supabase
      .from("organization_appointments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", appId)
      .select("*")
      .single();

    if (updateErr) {
      return res.status(500).json({
        success: false,
        message: "Не удалось обновить статус записи: " + updateErr.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Статус записи обновлен.",
      appointment: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка обновления статуса.",
    });
  }
});

// GET /api/organization-structure/support-messages
router.get("/support-messages", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const organizationId = ctx.organizationId;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "organization_id не указан.",
      });
    }

    const { data, error } = await supabase
      .from("admin_channel_messages")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      messages: data || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка получения сообщений поддержки.",
    });
  }
});

// POST /api/organization-structure/support-messages
router.post("/support-messages", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const organizationId = ctx.organizationId;
    const { message, senderUsername, senderFullName } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "organization_id не указан.",
      });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: "Сообщение не может быть пустым.",
      });
    }

    const { data, error } = await supabase
      .from("admin_channel_messages")
      .insert({
        organization_id: organizationId,
        sender_username: senderUsername || "admin",
        sender_full_name: senderFullName || "Администратор организации",
        sender_role: "organization_admin",
        message: String(message).trim(),
        created_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка отправки сообщения поддержки.",
    });
  }
});

// POST /api/organization-structure/support-upload
router.post("/support-upload", upload.any(), async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const organizationId = ctx.organizationId;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "organization_id не указан.",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Файл не прикреплен.",
      });
    }

    const file = req.files[0];
    const fileName = safeFileName(file.originalname);
    const filePath =
      organizationId +
      "/support/" +
      Date.now() +
      "_" +
      fileName;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return res.status(201).json({
      success: true,
      file_url: publicUrlData ? publicUrlData.publicUrl : null,
      file_name: fileName
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка загрузки документа.",
    });
  }
});

// POST /api/organization-structure/employees/:id/schedule
router.post("/employees/:id/schedule", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const employeeId = req.params.id;

    if (ctx.role === "organization_admin") {
      const { data: empCheck } = await supabase
        .from("organization_employees")
        .select("organization_id")
        .eq("id", employeeId)
        .maybeSingle();
      if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
        return res.status(403).json({ success: false, message: "Доступ запрещен." });
      }
    }
    const { work_days, work_start, work_end, lunch_start, lunch_end, slot_duration, start_date, end_date, daily_schedules } = req.body;

    const schedule = {
      employee_id: employeeId,
      work_days: work_days || [1, 2, 3, 4, 5],
      work_start: work_start || "09:00",
      work_end: work_end || "18:00",
      lunch_start: lunch_start || "13:00",
      lunch_end: lunch_end || "14:00",
      slot_duration: slot_duration || 30,
      start_date: start_date || new Date().toISOString().split('T')[0],
      end_date: end_date || null,
      daily_schedules: daily_schedules || null
    };

    

    const { data, error } = await supabase
      .from("doctor_schedules")
      .upsert(schedule, { onConflict: "employee_id" })
      .select("*")
      .single();

    
if (error) {
  return res.status(500).json({
    success: false,
    code: "SCHEDULE_SAVE_FAILED",
    message: error.message || "Не удалось сохранить график врача.",
  });
}



    return res.status(200).json({
      success: true,
      message: "Рабочий график успешно сохранен.",
      schedule: data
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/organization-structure/employees/:id/schedule
router.get("/employees/:id/schedule", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "doctor", "support", "patient"]);
    if (!ctx) return;
    const employeeId = req.params.id;

    if (ctx.role === "doctor" && employeeId !== ctx.employeeId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }
    const { data, error } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (error) {
  return res.status(500).json({
    success: false,
    code: "SCHEDULE_LOAD_FAILED",
    message: error.message,
  });
}

if (!data) {
  return res.status(200).json({
    success: true,
    schedule: null,
  });
}

    return res.status(200).json({ success: true, schedule: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/organization-structure/employees/:id/slots
router.get("/employees/:id/slots", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "doctor", "support", "patient"]);
    if (!ctx) return;
    const employeeId = req.params.id;
    const dateStr = req.query.date;
    if (!dateStr) {
      return res.status(400).json({ success: false, message: "date обязателен." });
    }
const { data: schedule, error: scheduleError } = await supabase
  .from("doctor_schedules")
  .select("*")
  .eq("employee_id", employeeId)
  .maybeSingle();

if (scheduleError) {
  return res.status(500).json({
    success: false,
    code: "SCHEDULE_LOAD_FAILED",
    message:
      scheduleError.message ||
      "Не удалось загрузить график врача.",
  });
}

if (!schedule) {
  return res.status(200).json({
    success: true,
    slots: [],
  });
}


    const targetDate = new Date(dateStr + "T00:00:00");
    const dayOfWeek = targetDate.getDay();
    const mappedDay = dayOfWeek === 0 ? 7 : dayOfWeek;

    if (schedule.start_date && dateStr < schedule.start_date) {
      return res.status(200).json({ success: true, slots: [] });
    }
    if (schedule.end_date && dateStr > schedule.end_date) {
      return res.status(200).json({ success: true, slots: [] });
    }

    // 1. Check schedule_exceptions table
    let exception = null;
    try {
      const { data: dbEx } = await supabase
        .from("schedule_exceptions")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("exception_date", dateStr)
        .maybeSingle();
      if (dbEx) exception = dbEx;
    } catch (e) {}

    let workStart = schedule.work_start;
    let workEnd = schedule.work_end;
    let lunchStart = schedule.lunch_start;
    let lunchEnd = schedule.lunch_end;
    let slotDuration = schedule.slot_duration;
    let isWorking = schedule.work_days.includes(mappedDay);

    if (exception) {
      if (!exception.is_working) {
        return res.status(200).json({ success: true, slots: [] });
      }
      if (exception.work_start) workStart = exception.work_start;
      if (exception.work_end) workEnd = exception.work_end;
      if (exception.lunch_start) lunchStart = exception.lunch_start;
      if (exception.lunch_end) lunchEnd = exception.lunch_end;
      if (exception.slot_duration) slotDuration = exception.slot_duration;
      isWorking = true;
    } else {
      // Look up daily_schedules
      if (schedule.daily_schedules && schedule.daily_schedules[String(mappedDay)]) {
        const daily = schedule.daily_schedules[String(mappedDay)];
        if (daily.work_start) workStart = daily.work_start;
        if (daily.work_end) workEnd = daily.work_end;
        if (daily.lunch_start) lunchStart = daily.lunch_start;
        if (daily.lunch_end) lunchEnd = daily.lunch_end;
        if (daily.slot_duration) slotDuration = daily.slot_duration;
      }
    }

    if (!isWorking) {
      return res.status(200).json({ success: true, slots: [] });
    }

    try {
      const { data: absences } = await supabase
        .from("doctor_absences")
        .select("*")
        .eq("employee_id", employeeId)
        .lte("start_date", dateStr)
        .gte("end_date", dateStr);

      if (absences && absences.length > 0) {
        return res.status(200).json({ success: true, slots: [] });
      }
    } catch (e) {}

    let bookedTimes = [];
    try {
      const { data: appointments } = await supabase
        .from("organization_appointments")
        .select("time")
        .eq("employee_id", employeeId)
        .eq("date", dateStr)
        .not("status", "in", '("cancelled","rejected")');
      if (appointments) {
        bookedTimes = appointments.map(a => a.time);
      }
    } catch (e) {
      console.error("Failed to query appointments:", e.message);
    }

    const slots = [];
    const [startH, startM] = workStart.split(":").map(Number);
    const [endH, endM] = workEnd.split(":").map(Number);
    const [lunchStartH, lunchStartM] = lunchStart.split(":").map(Number);
    const [lunchEndH, lunchEndM] = lunchEnd.split(":").map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const lunchStartMinutes = lunchStartH * 60 + lunchStartM;
    const lunchEndMinutes = lunchEndH * 60 + lunchEndM;
    const duration = Number(slotDuration);


    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    while (currentMinutes + duration <= endMinutes) {
      const slotEndMinutes = currentMinutes + duration;

const isLunch =
  currentMinutes < lunchEndMinutes &&
  slotEndMinutes > lunchStartMinutes;
      if (!isLunch) {
        const slotHour = Math.floor(currentMinutes / 60);
        const slotMin = currentMinutes % 60;
        const timeLabel = `${String(slotHour).padStart(2, "0")}:${String(slotMin).padStart(2, "0")}`;

        let isPast = false;
        if (dateStr === todayStr) {
          const [nowH, nowM] = [now.getHours(), now.getMinutes()];
          if (slotHour < nowH || (slotHour === nowH && slotMin <= nowM)) {
            isPast = true;
          }
        } else if (dateStr < todayStr) {
          isPast = true;
        }

        const isBooked = bookedTimes.includes(timeLabel);

        slots.push({
          time: timeLabel,
          available: !isBooked && !isPast,
          reason: isBooked ? "occupied" : (isPast ? "past" : "available")
        });
      }
      currentMinutes += duration;
    }

    return res.status(200).json({ success: true, slots });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/organization-structure/employees/:id/absence
router.post("/employees/:id/absence", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const employeeId = req.params.id;

    if (ctx.role === "organization_admin") {
      const { data: empCheck } = await supabase
        .from("organization_employees")
        .select("organization_id")
        .eq("id", employeeId)
        .maybeSingle();
      if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
        return res.status(403).json({ success: false, message: "Доступ запрещен." });
      }
    }
    const { absence_type, reason, start_date, end_date, comment } = req.body;

    if (!absence_type || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: "Тип отсутствия, дата начала и окончания обязательны." });
    }

    const { data: absence, error } = await supabase
      .from("doctor_absences")
      .insert({
        employee_id: employeeId,
        absence_type,
        reason,
        start_date,
        end_date,
        comment
      })
      .select("*")
      .single();

    if (error) throw error;

    if (absence_type === "emergency") {
      await supabase
        .from("organization_employees")
        .update({ absence_status: "emergency_sick" })
        .eq("id", employeeId);
    } else {
      await supabase
        .from("organization_employees")
        .update({ absence_status: "planned_vacation" })
        .eq("id", employeeId);
    }

    let affectedAppointments = [];
    try {
      const { data: apps } = await supabase
        .from("organization_appointments")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("date", start_date)
        .lte("date", end_date)
        .not("status", "in", '("cancelled","completed","no_show","rejected")');
      affectedAppointments = apps || [];
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: "Отсутствие успешно зарегистрировано.",
      absence,
      affectedAppointmentsCount: affectedAppointments.length,
      affectedAppointments
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/organization-structure/employees/:id/absence
router.get("/employees/:id/absence", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "doctor", "support", "patient"]);
    if (!ctx) return;
    const employeeId = req.params.id;

    if (ctx.role === "doctor" && employeeId !== ctx.employeeId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }
    const { data, error } = await supabase
      .from("doctor_absences")
      .select("*")
      .eq("employee_id", employeeId)
      .order("start_date", { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, absences: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/organization-structure/employees/:id/absence/:absenceId
router.delete("/employees/:id/absence/:absenceId", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const { id, absenceId } = req.params;

    if (ctx.role === "organization_admin") {
      const { data: empCheck } = await supabase
        .from("organization_employees")
        .select("organization_id")
        .eq("id", id)
        .maybeSingle();
      if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
        return res.status(403).json({ success: false, message: "Доступ запрещен." });
      }
    }
    const { error } = await supabase.from("doctor_absences").delete().eq("id", absenceId);
    if (error) throw error;

    await supabase.from("organization_employees").update({ absence_status: "active" }).eq("id", id);

    return res.status(200).json({ success: true, message: "Отсутствие снято. Врач снова работает." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/organization-structure/employees/:id/exceptions
router.post("/employees/:id/exceptions", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const employeeId = req.params.id;

    if (ctx.role === "organization_admin") {
      const { data: empCheck } = await supabase
        .from("organization_employees")
        .select("organization_id")
        .eq("id", employeeId)
        .maybeSingle();
      if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
        return res.status(403).json({ success: false, message: "Доступ запрещен." });
      }
    }
    const { exception_date, is_working, work_start, work_end, lunch_start, lunch_end, slot_duration } = req.body;

    if (!exception_date) {
      return res.status(400).json({ success: false, message: "Дата исключения обязательна." });
    }

    const { data: exception, error } = await supabase
      .from("schedule_exceptions")
      .insert({
        employee_id: employeeId,
        exception_date,
        is_working: is_working !== undefined ? is_working : true,
        work_start,
        work_end,
        lunch_start,
        lunch_end,
        slot_duration
      })
      .select("*")
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Исключение из графика успешно зарегистрировано.",
      exception
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/organization-structure/employees/:id/exceptions
router.get("/employees/:id/exceptions", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "doctor", "support", "patient"]);
    if (!ctx) return;
    const employeeId = req.params.id;

    if (ctx.role === "doctor" && employeeId !== ctx.employeeId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }
    const { data, error } = await supabase
      .from("schedule_exceptions")
      .select("*")
      .eq("employee_id", employeeId)
      .order("exception_date", { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, exceptions: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/organization-structure/employees/:id/exceptions/:exceptionId
router.delete("/employees/:id/exceptions/:exceptionId", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const { exceptionId } = req.params;

    if (ctx.role === "organization_admin") {
      const { data: exCheck } = await supabase
        .from("schedule_exceptions")
        .select("employee_id")
        .eq("id", exceptionId)
        .maybeSingle();
      if (exCheck) {
        const { data: empCheck } = await supabase
          .from("organization_employees")
          .select("organization_id")
          .eq("id", exCheck.employee_id)
          .maybeSingle();
        if (!empCheck || empCheck.organization_id !== ctx.organizationId) {
          return res.status(403).json({ success: false, message: "Доступ запрещен." });
        }
      }
    }
    const { error } = await supabase.from("schedule_exceptions").delete().eq("id", exceptionId);
    if (error) throw error;

    return res.status(200).json({ success: true, message: "Исключение удалено." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/organization-structure/appointments/:id/transfer
router.post("/appointments/:id/transfer", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const appointmentId = req.params.id;
    const { new_doctor_id, new_date, new_time, transfer_reason } = req.body;

    if (!new_doctor_id || !new_date || !new_time) {
      return res.status(400).json({ success: false, message: "Врач, дата и время переноса обязательны." });
    }

    const { data: currentApp, error: fetchErr } = await supabase
      .from("organization_appointments")
      .select("*")
      .eq("id", appointmentId)
      .single();

    if (fetchErr || !currentApp) {
      return res.status(404).json({ success: false, message: "Запись не найдена." });
    }

    if (ctx.role === "organization_admin" && currentApp.organization_id !== ctx.organizationId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }

    await supabase
      .from("appointment_transfers")
      .insert({
        appointment_id: appointmentId,
        previous_doctor_id: currentApp.employee_id,
        new_doctor_id,
        previous_date: currentApp.date,
        previous_time: currentApp.time,
        new_date,
        new_time,
        transfer_reason,
        status: "pending"
      });

    const { data: updatedApp, error: updateErr } = await supabase
      .from("organization_appointments")
      .update({
        status: "transfer_pending",
        employee_id: new_doctor_id,
        date: new_date,
        time: new_time,
        updated_at: new Date().toISOString()
      })
      .eq("id", appointmentId)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    const { data: newDoc } = await supabase.from("organization_employees").select("full_name").eq("id", new_doctor_id).maybeSingle();
    const { data: oldDoc } = await supabase.from("organization_employees").select("full_name").eq("id", currentApp.employee_id).maybeSingle();

    await supabase.from("notifications").insert({
      user_id: currentApp.patient_iin,
      title: "Предложен перенос записи",
      message: `Ваша запись перенесена от врача ${oldDoc?.full_name || "прежнего"} к врачу ${newDoc?.full_name || "новому"} на ${new_date} в ${new_time}. Причина: ${transfer_reason || "экстренное отсутствие врача"}. Подтвердите или отмените перенос.`,
      link: `/visits-history`
    });

    return res.status(200).json({ success: true, message: "Предложение о переносе успешно отправлено.", appointment: updatedApp });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/organization-structure/appointments/:id/start
router.post("/appointments/:id/start", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["doctor", "support"]);
    if (!ctx) return;
    const appointmentId = req.params.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Код обязателен." });
    }

    const { data: app, error } = await supabase
      .from("organization_appointments")
      .select("*")
      .eq("id", appointmentId)
      .single();

    if (error || !app) {
      return res.status(404).json({ success: false, message: "Запись не найдена." });
    }

    if (ctx.role === "doctor" && app.employee_id !== ctx.employeeId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }

    if (app.status === "cancelled" || app.status === "completed") {
      return res.status(400).json({ success: false, message: "Нельзя начать отмененную или завершенную запись." });
    }

    const expected = String(app.start_code || app.verification_code || "").trim();
    if (expected !== String(code).trim()) {
      return res.status(400).json({ success: false, message: "Неверный код талона/QR-кода." });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from("organization_appointments")
      .update({
        status: "in_progress",
        actual_start_time: now,
        updated_at: now
      })
      .eq("id", appointmentId)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    return res.status(200).json({ success: true, message: "Приём успешно начат.", appointment: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/organization-structure/appointments/:id/draft
router.post("/appointments/:id/draft", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["doctor", "support"]);
    if (!ctx) return;
    const appointmentId = req.params.id;
    const { draft } = req.body;

    const { data: app } = await supabase
      .from("organization_appointments")
      .select("employee_id")
      .eq("id", appointmentId)
      .maybeSingle();

    if (!app) {
      return res.status(404).json({ success: false, message: "Запись не найдена." });
    }

    if (ctx.role === "doctor" && app.employee_id !== ctx.employeeId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }

    const { error } = await supabase
      .from("organization_appointments")
      .update({ consultation_draft: draft })
      .eq("id", appointmentId);

    if (error) throw error;

    return res.status(200).json({ success: true, message: "Черновик сохранен." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/organization-structure/appointments/:id/draft
router.get("/appointments/:id/draft", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["doctor", "support"]);
    if (!ctx) return;
    const appointmentId = req.params.id;

    const { data: appCheck } = await supabase
      .from("organization_appointments")
      .select("employee_id")
      .eq("id", appointmentId)
      .maybeSingle();

    if (!appCheck) {
      return res.status(404).json({ success: false, message: "Запись не найдена." });
    }

    if (ctx.role === "doctor" && appCheck.employee_id !== ctx.employeeId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }

    const { data, error } = await supabase
      .from("organization_appointments")
      .select("consultation_draft")
      .eq("id", appointmentId)
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, draft: data?.consultation_draft || null });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/organization-structure/appointments/:id/request-finish
router.post("/appointments/:id/request-finish", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["doctor", "support"]);
    if (!ctx) return;
    const appointmentId = req.params.id;
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const { data: appCheck } = await supabase
      .from("organization_appointments")
      .select("employee_id")
      .eq("id", appointmentId)
      .maybeSingle();

    if (!appCheck) {
      return res.status(404).json({ success: false, message: "Запись не найдена." });
    }

    if (ctx.role === "doctor" && appCheck.employee_id !== ctx.employeeId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }

    const { error } = await supabase
      .from("organization_appointments")
      .update({ finish_code: otp, status: "waiting_finish_confirmation" })
      .eq("id", appointmentId);

    if (error) throw error;

    const { data: app } = await supabase.from("organization_appointments").select("*").eq("id", appointmentId).single();

    await supabase.from("notifications").insert({
      user_id: app.patient_iin,
      title: "Код завершения приёма",
      message: `Код подтверждения завершения приёма у врача: ${otp}. Передайте его врачу для подтверждения. Код действует 5 минут.`,
      link: `/visits-history`
    });

    return res.status(200).json({ success: true, message: "Код подтверждения отправлен пациенту.", otp });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/organization-structure/appointments/:id/finish
router.post("/appointments/:id/finish", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["doctor", "support"]);
    if (!ctx) return;
    const appointmentId = req.params.id;
    const { otp, complaints, symptoms, diagnosis, treatment, recommendations, comment, files } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: "Код подтверждения обязателен." });
    }

    const { data: app, error } = await supabase
      .from("organization_appointments")
      .select("*")
      .eq("id", appointmentId)
      .single();

    if (error || !app) {
      return res.status(404).json({ success: false, message: "Запись не найдена." });
    }

    if (ctx.role === "doctor" && app.employee_id !== ctx.employeeId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }

    if (String(app.finish_code).trim() !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: "Неверный код завершения приёма." });
    }

    const now = new Date().toISOString();

    const visitRecord = {
      appointment_id: appointmentId,
      patient_iin: app.patient_iin,
      doctor_id: app.employee_id,
      organization_id: app.organization_id,
      complaints,
      symptoms,
      diagnosis,
      treatment,
      recommendations,
      comment,
      files: files || [],
      actual_start_time: app.actual_start_time,
      actual_end_time: now,
      created_at: now
    };

    const { error: visitErr } = await supabase
      .from("visit_records")
      .upsert(visitRecord, { onConflict: "appointment_id" });

    const { data: updatedApp, error: updateErr } = await supabase
      .from("organization_appointments")
      .update({
        status: "completed",
        actual_end_time: now,
        updated_at: now
      })
      .eq("id", appointmentId)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    await supabase.from("notifications").insert({
      user_id: app.patient_iin,
      title: "Приём завершён",
      message: "Ваш приём успешно завершён. Результаты доступны в истории посещений.",
      link: `/visits-history`
    });

    return res.status(200).json({ success: true, message: "Приём успешно завершён.", appointment: updatedApp });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/organization-structure/appointments/:id/rate


// GET /api/organization-structure/employees/:id/reviews


// POST /api/organization-structure/appointments/:id/certificate
router.post("/appointments/:id/certificate", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["doctor", "support"]);
    if (!ctx) return;
    const appointmentId = req.params.id;
    const { title, certificate_type, file_url, valid_until } = req.body;

    if (!title || !certificate_type || !file_url) {
      return res.status(400).json({ success: false, message: "Название, тип справки и ссылка на файл обязательны." });
    }

    const { data: app } = await supabase
      .from("organization_appointments")
      .select("*")
      .eq("id", appointmentId)
      .single();

    if (!app) {
      return res.status(404).json({ success: false, message: "Запись не найдена." });
    }

    if (ctx.role === "doctor" && app.employee_id !== ctx.employeeId) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }

    const { data: cert, error } = await supabase
      .from("medical_certificates")
      .insert({
        patient_id: app.patient_iin,
        doctor_id: app.employee_id,
        organization_id: app.organization_id,
        title,
        certificate_type,
        file_url,
        valid_until
      })
      .select("*")
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, message: "Справка выписана.", certificate: cert });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/organization-structure/patients/:iin/certificates
router.get("/patients/:iin/certificates", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["patient", "doctor", "organization_admin", "support"]);
    if (!ctx) return;
    let iin = req.params.iin;
    if (ctx.role === "patient") {
      iin = ctx.patientIin;
    }
    const { data, error } = await supabase
      .from("medical_certificates")
      .select("*, organization:organizations(organization_name), doctor:organization_employees(full_name)")
      .eq("patient_id", iin)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, certificates: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/organization-structure/notifications/:userId
router.get("/notifications/:userId", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["patient", "doctor", "organization_admin", "support"]);
    if (!ctx) return;
    let userId = req.params.userId;
    if (ctx.role === "patient") {
      if (userId !== ctx.patientIin && userId !== ctx.userId) {
        return res.status(403).json({ success: false, message: "Доступ запрещен." });
      }
    } else if (ctx.role === "doctor" || ctx.role === "organization_admin") {
      if (userId !== ctx.userId) {
        return res.status(403).json({ success: false, message: "Доступ запрещен." });
      }
    }
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, notifications: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/organization-structure/notifications/:id/read
router.patch("/notifications/:id/read", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["patient", "doctor", "organization_admin", "support"]);
    if (!ctx) return;
    const { id } = req.params;

    if (ctx.role !== "support") {
      const { data: notif } = await supabase.from("notifications").select("user_id").eq("id", id).maybeSingle();
      if (notif && notif.user_id !== ctx.patientIin && notif.user_id !== ctx.userId) {
        return res.status(403).json({ success: false, message: "Доступ запрещен." });
      }
    }
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) throw error;
    return res.status(200).json({ success: true, message: "Уведомление прочитано." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/organization-structure/notifications/read-all/:userId
router.patch("/notifications/read-all/:userId", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["patient", "doctor", "organization_admin", "support"]);
    if (!ctx) return;
    let userId = req.params.userId;
    if (ctx.role === "patient") {
      if (userId !== ctx.patientIin && userId !== ctx.userId) {
        return res.status(403).json({ success: false, message: "Доступ запрещен." });
      }
    } else if (ctx.role === "doctor" || ctx.role === "organization_admin") {
      if (userId !== ctx.userId) {
        return res.status(403).json({ success: false, message: "Доступ запрещен." });
      }
    }
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId);

    if (error) throw error;
    return res.status(200).json({ success: true, message: "Все уведомления прочитаны." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/organization-structure/support/conversations
router.get("/support/conversations", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const organizationId = ctx.role === "organization_admin" ? ctx.organizationId : (getOrganizationId(req) || req.query.organization_id);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "organization_id обязателен." });
    }

    const { data, error } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, conversations: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/organization-structure/support/conversations
router.post("/support/conversations", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const organizationId = ctx.role === "organization_admin" ? ctx.organizationId : getOrganizationId(req);
    const { subject, description, senderName, senderId, messageText, attachmentUrl } = req.body;

    if (!organizationId || !subject || !description) {
      return res.status(400).json({ success: false, message: "Тема и описание проблемы обязательны." });
    }

    const { data: conv, error } = await supabase
      .from("support_conversations")
      .insert({
        organization_id: organizationId,
        subject,
        description,
        status: "open"
      })
      .select("*")
      .single();

    if (error) throw error;

    if (messageText || attachmentUrl) {
      await supabase
        .from("support_messages")
        .insert({
          conversation_id: conv.id,
          sender_type: "org_admin",
          sender_id: senderId || organizationId,
          sender_name: senderName || "Администратор",
          message_text: messageText || description,
          attachment_url: attachmentUrl
        });
    }

    return res.status(201).json({ success: true, message: "Обращение создано.", conversation: conv });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/organization-structure/support/conversations/:id/messages
router.get("/support/conversations/:id/messages", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const { id } = req.params;

    if (ctx.role === "organization_admin") {
      const { data: conv } = await supabase
        .from("support_conversations")
        .select("organization_id")
        .eq("id", id)
        .maybeSingle();
      if (!conv || conv.organization_id !== ctx.organizationId) {
        return res.status(403).json({ success: false, message: "Доступ запрещен." });
      }
    }
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return res.status(200).json({ success: true, messages: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/organization-structure/support/conversations/:id/messages
router.post("/support/conversations/:id/messages", async (req, res) => {
  try {
    const ctx = checkAuth(req, res, ["organization_admin", "support"]);
    if (!ctx) return;
    const { id } = req.params;

    if (ctx.role === "organization_admin") {
      const { data: conv } = await supabase
        .from("support_conversations")
        .select("organization_id")
        .eq("id", id)
        .maybeSingle();
      if (!conv || conv.organization_id !== ctx.organizationId) {
        return res.status(403).json({ success: false, message: "Доступ запрещен." });
      }
    }
    const { senderType, senderId, senderName, messageText, attachmentUrl } = req.body;

    const { data: msg, error } = await supabase
      .from("support_messages")
      .insert({
        conversation_id: id,
        sender_type: senderType || "org_admin",
        sender_id: senderId,
        sender_name: senderName || "Администратор",
        message_text: messageText,
        attachment_url: attachmentUrl
      })
      .select("*")
      .single();

    if (error) throw error;

    // Update conversation updated_at and reopen if closed
    await supabase
      .from("support_conversations")
      .update({ updated_at: new Date().toISOString(), status: "open" })
      .eq("id", id);

    return res.status(201).json({ success: true, message: msg });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});



export default router;
