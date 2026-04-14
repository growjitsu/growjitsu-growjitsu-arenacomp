import { CardGenerator } from './src/services/cardGenerator.js';
import fs from 'fs';
import path from 'path';

async function generate() {
  try {
    console.log('Generating logo...');
    const buffer = await CardGenerator.generateLogoOnly();
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }
    fs.writeFileSync(path.join(publicDir, 'logo-og.png'), buffer);
    console.log('Logo saved to public/logo-og.png');
  } catch (err) {
    console.error('Error:', err);
  }
}

generate();
