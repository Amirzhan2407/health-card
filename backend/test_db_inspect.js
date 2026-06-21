import dotenv from "dotenv";
import fs from "fs";
import { supabase } from "./lib/supabaseAdmin.js";

const backendEnvPath = "./.env";
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

async function run() {
  console.log("Supabase URL:", process.env.SUPABASE_URL);
  
  // Let's get one row from organization_employees
  const { data: emp, error: empErr } = await supabase
    .from("organization_employees")
    .select("*")
    .limit(1);
    
  if (empErr) console.error("empErr:", empErr);
  else console.log("emp keys:", emp[0] ? Object.keys(emp[0]) : "empty");

  // Let's get one row from organization_users
  const { data: usr, error: usrErr } = await supabase
    .from("organization_users")
    .select("*")
    .limit(1);

  if (usrErr) console.error("usrErr:", usrErr);
  else console.log("usr keys:", usr[0] ? Object.keys(usr[0]) : "empty");
}

run();
