import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Standard Supabase client for production
let realSupabase = null;
if (supabaseUrl && supabaseServiceKey && supabaseServiceKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE") {
  realSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
}

// Custom PostgreSQL Staging client builder
class PostgresQueryBuilder {
  constructor(table, pool) {
    this.table = table;
    this.pool = pool;
    this.action = "select";
    this.filters = [];
    this.columns = "*";
    this.actionData = null;
    this.limitVal = null;
    this.orderByCol = null;
    this.orderByAsc = true;
    this.upsertOnConflict = null;
  }

  select(cols = "*") {
    this.columns = cols;
    return this;
  }

  eq(col, val) {
    this.filters.push({ type: "eq", col, val });
    return this;
  }

  neq(col, val) {
    this.filters.push({ type: "neq", col, val });
    return this;
  }

  in(col, vals) {
    this.filters.push({ type: "in", col, vals });
    return this;
  }

  or(expr) {
    this.filters.push({ type: "or", expr });
    return this;
  }

  gte(col, val) {
    this.filters.push({ type: "gte", col, val });
    return this;
  }

  lte(col, val) {
    this.filters.push({ type: "lte", col, val });
    return this;
  }

  order(col, options = { ascending: true }) {
    this.orderByCol = col;
    this.orderByAsc = options.ascending !== false;
    return this;
  }

  limit(n) {
    this.limitVal = n;
    return this;
  }

  insert(data) {
    this.action = "insert";
    this.actionData = data;
    return this;
  }

  update(data) {
    this.action = "update";
    this.actionData = data;
    return this;
  }

  upsert(data, options = {}) {
    this.action = "upsert";
    this.actionData = data;
    if (options.onConflict) {
      this.upsertOnConflict = options.onConflict;
    }
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  async execute() {
    let queryText = "";
    const values = [];
    let valCounter = 1;

    // Helper to build WHERE clause
    const buildWhere = () => {
      if (this.filters.length === 0) return "";
      const parts = [];
      for (const filter of this.filters) {
        if (filter.type === "eq") {
          parts.push(`"${filter.col}" = $${valCounter++}`);
          values.push(filter.val);
        } else if (filter.type === "neq") {
          parts.push(`"${filter.col}" != $${valCounter++}`);
          values.push(filter.val);
        } else if (filter.type === "in") {
          const placeholders = filter.vals.map(() => `$${valCounter++}`);
          parts.push(`"${filter.col}" IN (${placeholders.join(", ")})`);
          values.push(...filter.vals);
        } else if (filter.type === "or") {
          // e.g. "status.eq.confirmed,status.eq.scheduled"
          const subparts = filter.expr.split(",");
          const orConditions = subparts.map(part => {
            const match = part.match(/^(\w+)\.(eq|neq)\.(.+)$/);
            if (match) {
              const col = match[1];
              const op = match[2] === "eq" ? "=" : "!=";
              const val = match[3];
              values.push(val);
              return `"${col}" ${op} $${valCounter++}`;
            }
            return "FALSE";
          });
          parts.push(`(${orConditions.join(" OR ")})`);
        } else if (filter.type === "gte") {
          parts.push(`"${filter.col}" >= $${valCounter++}`);
          values.push(filter.val);
        } else if (filter.type === "lte") {
          parts.push(`"${filter.col}" <= $${valCounter++}`);
          values.push(filter.val);
        }
      }
      return "WHERE " + parts.join(" AND ");
    };

    if (this.action === "select") {
      queryText = `SELECT * FROM "${this.table}" ${buildWhere()}`;
      if (this.orderByCol) {
        queryText += ` ORDER BY "${this.orderByCol}" ${this.orderByAsc ? "ASC" : "DESC"}`;
      }
      if (this.limitVal) {
        queryText += ` LIMIT ${this.limitVal}`;
      }
    } else if (this.action === "insert") {
      const rows = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
      const keys = Object.keys(rows[0]);
      const valueSets = [];
      for (const r of rows) {
        const set = [];
        for (const k of keys) {
          set.push(`$${valCounter++}`);
          values.push(r[k]);
        }
        valueSets.push(`(${set.join(", ")})`);
      }
      queryText = `INSERT INTO "${this.table}" (${keys.map(k => `"${k}"`).join(", ")}) VALUES ${valueSets.join(", ")} RETURNING *`;
    } else if (this.action === "update") {
      const keys = Object.keys(this.actionData);
      const setParts = keys.map(k => `"${k}" = $${valCounter++}`);
      values.push(...keys.map(k => this.actionData[k]));
      queryText = `UPDATE "${this.table}" SET ${setParts.join(", ")} ${buildWhere()} RETURNING *`;
    } else if (this.action === "upsert") {
      const rows = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
      const keys = Object.keys(rows[0]);
      const valueSets = [];
      for (const r of rows) {
        const set = [];
        for (const k of keys) {
          set.push(`$${valCounter++}`);
          values.push(r[k]);
        }
        valueSets.push(`(${set.join(", ")})`);
      }
      const conflictCol = this.upsertOnConflict || "id";
      const updateParts = keys.filter(k => k !== conflictCol).map(k => `"${k}" = EXCLUDED."${k}"`);
      queryText = `INSERT INTO "${this.table}" (${keys.map(k => `"${k}"`).join(", ")}) VALUES ${valueSets.join(", ")} `;
      if (updateParts.length > 0) {
        queryText += `ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updateParts.join(", ")} `;
      } else {
        queryText += `ON CONFLICT ("${conflictCol}") DO NOTHING `;
      }
      queryText += `RETURNING *`;
    } else if (this.action === "delete") {
      queryText = `DELETE FROM "${this.table}" ${buildWhere()} RETURNING *`;
    }

    const res = await this.pool.query(queryText, values);
    let data = res.rows;

    // Attach relational details for specific tables if they are queried
    if (this.action === "select" && data.length > 0) {
      if (this.table === "visit_records") {
        for (const row of data) {
          // Attach doctor info
          const docRes = await this.pool.query(`
            SELECT d.id, s.name_ru as specialty_name, p.full_name as doctor_name
            FROM doctors d
            LEFT JOIN specialties s ON s.id = d.specialty_id
            LEFT JOIN organization_members m ON m.id = d.member_id
            LEFT JOIN profiles p ON p.id = m.profile_id
            WHERE d.id = $1
          `, [row.doctor_id]);
          if (docRes.rows[0]) {
            row.doctor = {
              id: docRes.rows[0].id,
              specialties: { name_ru: docRes.rows[0].specialty_name },
              organization_members: { profiles: { full_name: docRes.rows[0].doctor_name } }
            };
          }
          // Attach organization info
          const orgRes = await this.pool.query(`SELECT name FROM organizations WHERE id = $1`, [row.organization_id]);
          if (orgRes.rows[0]) {
            row.organization = { name: orgRes.rows[0].name };
          }
          // Attach visit documents
          const docsRes = await this.pool.query(`SELECT * FROM visit_documents WHERE visit_record_id = $1`, [row.id]);
          row.visit_documents = docsRes.rows;
        }
      } else if (this.table === "medical_certificates") {
        for (const row of data) {
          // Attach doctor info
          const docRes = await this.pool.query(`
            SELECT d.id, s.name_ru as specialty_name, p.full_name as doctor_name
            FROM doctors d
            LEFT JOIN specialties s ON s.id = d.specialty_id
            LEFT JOIN organization_members m ON m.id = d.member_id
            LEFT JOIN profiles p ON p.id = m.profile_id
            WHERE d.id = $1
          `, [row.doctor_id]);
          if (docRes.rows[0]) {
            row.doctor = {
              id: docRes.rows[0].id,
              specialties: { name_ru: docRes.rows[0].specialty_name },
              organization_members: { profiles: { full_name: docRes.rows[0].doctor_name } }
            };
          }
          // Attach organization info
          const orgRes = await this.pool.query(`SELECT name FROM organizations WHERE id = $1`, [row.organization_id]);
          if (orgRes.rows[0]) {
            row.organization = { name: orgRes.rows[0].name };
          }
        }
      } else if (this.table === "appointment_transfers") {
        for (const row of data) {
          const apptRes = await this.pool.query(`SELECT * FROM appointments WHERE id = $1`, [row.appointment_id]);
          row.appointment = apptRes.rows[0] || null;
        }
      } else if (this.table === "doctors") {
        for (const row of data) {
          const memRes = await this.pool.query(`
            SELECT organization_id, role, status
            FROM organization_members
            WHERE id = $1
          `, [row.member_id]);
          row.organization_members = memRes.rows[0] || null;
        }
      }

    }

    if (this.action === "insert" || this.action === "update" || this.action === "upsert") {
      // If single row action, extract it if not array expected
      return Array.isArray(this.actionData) ? data : data[0];
    }
    return data;
  }

  // Promise-like interface
  async then(onFulfilled, onRejected) {
    try {
      const data = await this.execute();
      return onFulfilled({ data, error: null });
    } catch (error) {
      if (onRejected) {
        return onRejected({ data: null, error });
      }
      return { data: null, error };
    }
  }

  async single() {
    try {
      const data = await this.execute();
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        return { data: null, error: { message: "Not found", code: "PGRST116" } };
      }
      return { data: row, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async maybeSingle() {
    try {
      const data = await this.execute();
      const row = Array.isArray(data) ? data[0] : data;
      return { data: row || null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

// PostgreSQL Connection Pool
let pool = null;
if (process.env.USE_LOCAL_DB === "true") {
  pool = new pg.Pool({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "clinic_os_staging",
  });
}

// Hybrid client exporter
export const supabase = (process.env.USE_LOCAL_DB === "true") ? {
  from: (table) => new PostgresQueryBuilder(table, pool),
  storage: {
    from: (bucketName) => ({
      upload: async (filePath, fileBuffer, options) => {
        return { data: { path: filePath }, error: null };
      },
      createSignedUrl: async (filePath, expiresInSeconds) => {
        const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
        return {
          data: {
            signedUrl: `https://supabase.co/storage/v1/object/sign/${bucketName}/${filePath}?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJnZW5lcmF0ZWQtYnkiOiJjbGluaWMtb3MiLCJleHAiOiR7ZXhwaXJlc0F0fX0.signature`
          },
          error: null
        };
      },
      remove: async (paths) => {
        return { data: paths.map(p => ({ name: p })), error: null };
      }
    })
  }
} : realSupabase;
