import fs from 'fs';
import path from 'path';

const scratchDir = 'C:\\Users\\yechs\\.gemini\\antigravity\\brain\\90819085-fedc-4f3a-8793-0ce650fa935c\\scratch';

if (fs.existsSync(scratchDir)) {
  const files = fs.readdirSync(scratchDir);
  console.log(`Found ${files.length} files in scratch.`);
  for (const file of files) {
    const fullPath = path.join(scratchDir, file);
    if (fs.statSync(fullPath).isFile() && file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('service') || content.includes('SERVICE') || content.includes('eyJ') || content.includes('sb_')) {
        console.log(`File matches: ${file}`);
        // Log lines that contain potential keys
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('key') || line.includes('Key') || line.includes('KEY') || line.includes('eyJ') || line.includes('sb_')) {
            console.log(`  Line ${index + 1}: ${line.substring(0, 150)}`);
          }
        });
      }
    }
  }
} else {
  console.log('Scratch dir not found');
}
