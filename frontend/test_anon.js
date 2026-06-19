import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jrjwyifwhagixngqgayn.supabase.co";
const supabaseKey = "sb_publishable_dDu_VhMvk1H11Y-nzOs0IA_e_kqEuX4";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from("organization_users")
    .select("role")
    .limit(10);
  
  if (error) {
    console.error("Read Error:", error);
  } else {
    console.log("Users roles:", data);
  }
}

run();
