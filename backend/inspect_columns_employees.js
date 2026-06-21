import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jrjwyifwhagixngqgayn.supabase.co';
const supabaseKey = 'sb_publishable_dDu_VhMvk1H11Y-nzOs0IA_e_kqEuX4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('organization_employees')
    .select('age')
    .limit(1);
  if (error) {
    console.log('Error selecting age column:', error.message, error.code);
  } else {
    console.log('Successfully selected age column! Column exists.');
  }
}

run();
