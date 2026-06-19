import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jrjwyifwhagixngqgayn.supabase.co";
const supabaseKey = "sb_publishable_dDu_VhMvk1H11Y-nzOs0IA_e_kqEuX4";
const supabase = createClient(supabaseUrl, supabaseKey);

const rolesToTest = [
  "chief",
  "chief_doctor",
  "admin",
  "organization_admin",
  "hr",
  "doctor",
  "nurse",
  "employee",
  "registrar",
  "deputy_chief_doctor",
  "department_head"
];

async function testRole(role) {
  const dummyUser = {
    organization_id: "00000000-0000-0000-0000-000000000000", // dummy uuid
    city: "Test",
    bin: "123456789012",
    full_name: "Test User",
    phone: "123",
    email: "test@test.com",
    role: role,
    login: "test_" + role + "_" + Math.floor(Math.random() * 1000),
    password_hash: "hash",
    must_change_password: true,
    status: "active"
  };

  const { data, error } = await supabase
    .from("organization_users")
    .insert(dummyUser);

  if (error) {
    console.log(`Role "${role}": Failed. Code: ${error.code}, Message: ${error.message}`);
  } else {
    console.log(`Role "${role}": SUCCESS!`);
  }
}

async function run() {
  for (const role of rolesToTest) {
    await testRole(role);
  }
}

run();
