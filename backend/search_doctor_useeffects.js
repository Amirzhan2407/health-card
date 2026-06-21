import fs from 'fs';

const filePath = 'C:/dev/health-card/frontend/src/organization/govClinic/GovClinicEmployee.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Searching for useEffect blocks in GovClinicEmployee.jsx:');
lines.forEach((line, index) => {
  if (line.includes('useEffect(')) {
    console.log(`${index + 1}: ${line.trim()}`);
    // Print next 5 lines
    for (let j = 1; j <= 5; j++) {
      if (lines[index + j]) {
        console.log(`  + ${index + j + 1}: ${lines[index + j].trim()}`);
      }
    }
  }
});
