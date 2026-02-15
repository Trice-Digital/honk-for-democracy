/**
 * Generate OG preview image for social media sharing.
 * Run: node scripts/generate-og-image.js
 * Output: public/og-image.png (1200x630)
 *
 * Paper Mario protest aesthetic:
 *   cardboard #c5a059, paperWhite #f5f0e8,
 *   safetyYellow #fbbf24, markerBlack #1a1a1a
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 630;

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// --- Colors ---
const cardboard = '#c5a059';
const paperWhite = '#f5f0e8';
const safetyYellow = '#fbbf24';
const markerBlack = '#1a1a1a';
const shadowColor = 'rgba(0,0,0,0.35)';

// --- Background: cardboard fill ---
ctx.fillStyle = cardboard;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// --- Paper grain texture (subtle random short lines) ---
ctx.strokeStyle = 'rgba(0,0,0,0.06)';
ctx.lineWidth = 1;
const rng = (seed) => {
  // simple deterministic pseudo-random for reproducibility
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
};
const rand = rng(42);
for (let i = 0; i < 600; i++) {
  const x = rand() * WIDTH;
  const y = rand() * HEIGHT;
  const len = 8 + rand() * 20;
  const angle = rand() * Math.PI;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
  ctx.stroke();
}

// --- Darker grain streaks (horizontal, like real cardboard) ---
ctx.strokeStyle = 'rgba(100,70,30,0.08)';
ctx.lineWidth = 2;
for (let i = 0; i < 80; i++) {
  const y = rand() * HEIGHT;
  const x = rand() * WIDTH * 0.3;
  const len = 100 + rand() * 400;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + len, y + (rand() - 0.5) * 4);
  ctx.stroke();
}

// --- Main title: "HONK FOR DEMOCRACY" ---
const titleText = 'HONK FOR';
const titleText2 = 'DEMOCRACY';
const titleSize = 96;

ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// Shadow offset
const shadowX = 5;
const shadowY = 5;

// Line 1: "HONK FOR"
const line1Y = HEIGHT * 0.33;
ctx.font = `bold ${titleSize}px Impact, sans-serif`;

// Drop shadow
ctx.fillStyle = shadowColor;
ctx.fillText(titleText, WIDTH / 2 + shadowX, line1Y + shadowY);

// Stroke (outline)
ctx.strokeStyle = markerBlack;
ctx.lineWidth = 6;
ctx.strokeText(titleText, WIDTH / 2, line1Y);

// Fill
ctx.fillStyle = paperWhite;
ctx.fillText(titleText, WIDTH / 2, line1Y);

// Line 2: "DEMOCRACY"
const line2Y = HEIGHT * 0.50;
ctx.font = `bold ${titleSize + 10}px Impact, sans-serif`;

// Drop shadow
ctx.fillStyle = shadowColor;
ctx.fillText(titleText2, WIDTH / 2 + shadowX, line2Y + shadowY);

// Stroke
ctx.strokeStyle = markerBlack;
ctx.lineWidth = 6;
ctx.strokeText(titleText2, WIDTH / 2, line2Y);

// Fill
ctx.fillStyle = paperWhite;
ctx.fillText(titleText2, WIDTH / 2, line2Y);

// --- Subtitle: "A Protest Simulator" ---
ctx.font = 'bold 36px Impact, sans-serif';
const subY = HEIGHT * 0.66;

ctx.fillStyle = 'rgba(0,0,0,0.25)';
ctx.fillText('A Protest Simulator', WIDTH / 2 + 3, subY + 3);

ctx.fillStyle = safetyYellow;
ctx.fillText('A Protest Simulator', WIDTH / 2, subY);

// --- Tagline: "Craft your sign. Stand your ground." ---
ctx.font = '26px Impact, sans-serif';
const tagY = HEIGHT * 0.80;

ctx.fillStyle = 'rgba(0,0,0,0.2)';
ctx.fillText('Craft your sign. Stand your ground.', WIDTH / 2 + 2, tagY + 2);

ctx.fillStyle = paperWhite;
ctx.fillText('Craft your sign. Stand your ground.', WIDTH / 2, tagY);

// --- Border: rough construction-paper edge ---
ctx.strokeStyle = markerBlack;
ctx.lineWidth = 6;
ctx.strokeRect(20, 20, WIDTH - 40, HEIGHT - 40);

// Inner yellow accent line
ctx.strokeStyle = safetyYellow;
ctx.lineWidth = 2;
ctx.strokeRect(28, 28, WIDTH - 56, HEIGHT - 56);

// --- Save ---
const outPath = path.join(__dirname, '..', 'public', 'og-image.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buffer);
console.log(`OG image saved to ${outPath} (${buffer.length} bytes)`);
