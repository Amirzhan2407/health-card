import express from "express";
import crypto from "crypto";
import { supabase } from "../lib/supabaseAdmin.js";

const router = express.Router();

function hashPassword(password) {
  if (!password) return null;

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");

  return `${salt}:${hash}`;
}

function getOrganizationId(req) {
  return (
    req.headers["x-organization-id"] ||
    req.query.organizationId ||
    req.body.organizationId ||
    null
  );
}

router.get("/departments", async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "organizationId не указан.",
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
    const name = String(req.body.name || "").trim();
    const floor = String(req.body.floor || "").trim();
    const rooms = String(req.body.rooms || "").trim();

    if (!organizationId || !name || !floor || !rooms) {
      return res.status(400).json({
        success: false,
        message: "Заполните название отделения, этаж и кабинеты.",
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

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "organizationId не указан.",
      });
    }

    const { data: employees, error } = await supabase
      .from("organization_employees")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    const employeeIds = (employees || []).map((item) => item.id);

    let documents = [];

    if (employeeIds.length) {
      const { data: docs, error: docsError } = await supabase
        .from("organization_employee_documents")
        .select("*")
        .in("employee_id", employeeIds)
        .order("created_at", { ascending: true });

      if (docsError) {
        return res.status(500).json({
          success: false,
          message: docsError.message,
        });
      }

      documents = docs || [];
    }

    const employeesWithDocs = (employees || []).map((employee) => ({
      ...employee,
      documents: documents
        .filter((doc) => doc.employee_id === employee.id)
        .map((doc) => doc.file_name),
    }));

    return res.status(200).json({
      success: true,
      employees: employeesWithDocs,
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

    const fullName = String(req.body.fullName || "").trim();
    const age = String(req.body.age || "").trim();
    const phone = String(req.body.phone || "").trim();
    const email = String(req.body.email || "").trim();
    const position = String(req.body.position || "").trim();
    const departmentId = req.body.departmentId || null;
    const cabinet = String(req.body.cabinet || "").trim();
    const login = String(req.body.login || "").trim();
    const tempPassword = String(req.body.tempPassword || "").trim();
    const documents = Array.isArray(req.body.documents) ? req.body.documents : [];

    if (!organizationId || !fullName || !position || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "ФИО, должность и отделение обязательны.",
      });
    }

    const passwordHash = hashPassword(tempPassword);

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
        login: login || null,
        password_hash: passwordHash,
        must_change_password: true,
        status: "active",
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    if (documents.length) {
      const docsPayload = documents.map((fileName) => ({
        organization_id: organizationId,
        employee_id: employee.id,
        file_name: fileName,
        file_url: null,
      }));

      const { error: docsError } = await supabase
        .from("organization_employee_documents")
        .insert(docsPayload);

      if (docsError) {
        return res.status(500).json({
          success: false,
          message: docsError.message,
        });
      }
    }

    if (login && tempPassword) {
      await supabase.from("organization_users").upsert(
        {
          organization_id: organizationId,
          city: req.body.city || "",
          bin: req.body.bin || "",
          full_name: fullName,
          phone,
          email,
          role: "employee",
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
    }

    return res.status(201).json({
      success: true,
      employee: {
        ...employee,
        documents,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Ошибка добавления сотрудника.",
    });
  }
});

export default router;