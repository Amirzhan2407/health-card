import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jrjwyifwhagixngqgayn.supabase.co';
const supabaseKey = 'sb_publishable_dDu_VhMvk1H11Y-nzOs0IA_e_kqEuX4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Connecting to Supabase using anon key...');
  const { data, error } = await supabase
    .from('organizations')
    .select('id, organization_name')
    .limit(5);

  if (error) {
    console.error('Error fetching organizations:', error.message);
  } else {
    console.log('Successfully fetched organizations:', data);
  }
}

run();
