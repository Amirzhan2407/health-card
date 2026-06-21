import fs from 'fs';

const filePath = 'C:/dev/health-card/backend/routes/organizationStructure.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Searching for finish routes:');
lines.forEach((line, index) => {
  if (line.includes('appointments/:id/request-finish') || line.includes('appointments/:id/finish')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
