import fs from 'fs';

const filePath = 'C:/dev/health-card/frontend/src/organization/govClinic/GovClinicEmployee.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Searching for tabs and state variables in GovClinicEmployee.jsx:');
lines.forEach((line, index) => {
  if (line.includes('tab ===') || line.includes('useState(') && (line.includes('active') || line.includes('draft') || line.includes('otp') || line.includes('code') || line.includes('rating'))) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
