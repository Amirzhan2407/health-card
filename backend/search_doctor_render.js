import fs from 'fs';

const filePath = 'C:/dev/health-card/frontend/src/organization/govClinic/GovClinicEmployee.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Searching for currentTab references:');
lines.forEach((line, index) => {
  if (line.includes('currentTab ===')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
