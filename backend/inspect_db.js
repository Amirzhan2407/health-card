import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const backendEnvPath = "./.env";
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("No Supabase URL/Key found in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users, error: usersError } = await supabase
    .from("organization_users")
    .select("role")
    .limit(100);
  
  if (usersError) {
    console.error("Error fetching users:", usersError);
  } else {
    const uniqueRoles = [...new Set(users.map(u => u.role))];
    console.log("Unique roles present in organization_users:", uniqueRoles);
  }

  const { data: employees, error: empError } = await supabase
    .from("organization_employees")
    .select("role")
    .limit(100);

  if (empError) {
    console.error("Error fetching employees:", empError);
  } else {
    const uniqueEmpRoles = [...new Set(employees.map(e => e.role))];
    console.log("Unique employee roles present in organization_employees:", uniqueEmpRoles);
  }
}

run();
