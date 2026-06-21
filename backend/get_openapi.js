import axios from 'axios';

async function run() {
  try {
    const res = await axios.get('https://jrjwyifwhagixngqgayn.supabase.co/rest/v1/', {
      headers: {
        'apikey': 'sb_publishable_dDu_VhMvk1H11Y-nzOs0IA_e_kqEuX4',
        'Authorization': 'Bearer sb_publishable_dDu_VhMvk1H11Y-nzOs0IA_e_kqEuX4'
      }
    });
    const schema = res.data;
    const def = schema.definitions.organization_employees;
    if (def) {
      console.log('Columns for organization_employees:');
      console.log(Object.keys(def.properties));
    } else {
      console.log('Definition not found. Available definitions:', Object.keys(schema.definitions));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
