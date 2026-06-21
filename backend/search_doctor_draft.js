import fs from 'fs';

const filePath = 'C:/dev/health-card/backend/routes/organizationStructure.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Searching for draft references in backend organizationStructure.js:');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('draft') || line.toLowerCase().includes('consultation')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
