import fs from 'fs';

const filePath = 'C:/dev/health-card/frontend/src/organization/govClinic/GovClinicEmployee.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Searching for API fetch calls in GovClinicEmployee.jsx:');
lines.forEach((line, index) => {
  if (line.includes('fetch(') || line.includes('API_URL') || line.includes('/start') || line.includes('/finish')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
