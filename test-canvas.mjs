import { createCanvas } from 'canvas';
import fs from 'fs';

const canvas = createCanvas(1200, 630);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#050505';
ctx.fillRect(0, 0, 1200, 630);

// Simple Logo
ctx.fillStyle = '#3B82F6';
ctx.font = 'bold 120px Arial';
ctx.textAlign = 'center';
ctx.fillText('ARENACOMP', 600, 350);

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('test-logo.png', buffer);
console.log('Logo generated successfully');
