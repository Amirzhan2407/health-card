import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jrjwyifwhagixngqgayn.supabase.co';
const supabaseKey = 'sb_publishable_dDu_VhMvk1H11Y-nzOs0IA_e_kqEuX4';

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'organizations',
  'organization_users',
  'organization_employees',
  'organization_departments',
  'organization_appointments',
  'doctor_ratings',
  'doctor_absences',
  'appointment_transfers',
  'medical_certificates',
  'support_conversations',
  'support_messages',
  'notifications',
  'doctor_schedules'
];

async function run() {
  console.log('Checking database tables:');
  for (const t of tables) {
    try {
      const { count, error } = await supabase
        .from(t)
        .select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Table "${t}": ERROR: ${error.message}`);
      } else {
        console.log(`Table "${t}": ${count} rows`);
      }
    } catch (e) {
      console.log(`Table "${t}": EXCEPTION: ${e.message}`);
    }
  }
}

run();
