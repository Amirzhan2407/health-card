import fs from 'fs';

const filePath = 'C:/dev/health-card/frontend/src/organization/govClinic/GovClinicEmployee.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Tab rendering blocks in GovClinicEmployee.jsx:');
let activeBlock = null;
let indent = 0;
lines.forEach((line, index) => {
  if (line.includes('currentTab ===') || line.includes('isDepartmentHead &&') || line.includes('isDeputyChief &&')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
