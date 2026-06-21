import fs from 'fs';

const filePath = 'C:/dev/health-card/backend/routes/organizationStructure.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Searching for overlap references:');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('overlap') || line.toLowerCase().includes('cabinet')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
