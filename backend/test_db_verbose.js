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
  console.log('Detailed table check:');
  for (const t of tables) {
    const res = await supabase.from(t).select('*').limit(1);
    console.log(`Table "${t}": status=${res.status}, statusText=${res.statusText}, hasError=${!!res.error}, error=${res.error ? JSON.stringify(res.error) : 'none'}, hasData=${!!res.data}, count=${res.data ? res.data.length : 'N/A'}`);
  }
}

run();
