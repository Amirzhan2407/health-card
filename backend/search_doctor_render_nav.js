import fs from 'fs';

const filePath = 'C:/dev/health-card/frontend/src/organization/govClinic/GovClinicEmployee.jsx';
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  console.log('Searching for start/finish/draft function definitions:');
  lines.forEach((line, index) => {
    if (line.includes('function') && (line.includes('start') || line.includes('finish') || line.includes('draft') || line.includes('verification') || line.includes('rate') || line.includes('cert'))) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
} else {
  console.log('File does not exist');
}
