/**
 * SignMaterials — Procedural texture generation for sign backgrounds.
 *
 * Generates realistic material textures (cardboard, posterboard, foam board, wood)
 * as offscreen canvases that can be used as Fabric.js canvas backgrounds.
 *
 * Architecture: Pure canvas drawing, no dependencies.
 * Used by SignEditor.setMaterial() to render backgrounds.
 */

/**
 * Generate a procedural material texture on an offscreen canvas.
 *
 * @param materialId - Material ID: 'cardboard', 'posterboard', 'foamboard', 'wood'
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns HTMLCanvasElement with drawn texture
 */
export function generateMaterialTexture(
  materialId: string,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('[SignMaterials] Failed to get 2D context');
    return canvas;
  }

  switch (materialId) {
    case 'cardboard':
      drawCardboard(ctx, width, height);
      break;
    case 'posterboard':
      drawPosterboard(ctx, width, height);
      break;
    case 'foamboard':
      drawFoamBoard(ctx, width, height);
      break;
    case 'wood':
      drawWood(ctx, width, height);
      break;
    default:
      console.warn(`[SignMaterials] Unknown material ID: ${materialId}. Using posterboard.`);
      drawPosterboard(ctx, width, height);
  }

  return canvas;
}

/**
 * Draw cardboard texture:
 * - Tan base (#d4a574)
 * - Horizontal grain lines (darker, semi-transparent, varied spacing)
 * - Slight noise texture
 * - Torn/rough edges (jagged border)
 */
function drawCardboard(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Base color
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(0, 0, width, height);

  // Horizontal grain lines
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.15)';
  ctx.lineWidth = 1;

  for (let y = 0; y < height; y += 8 + Math.random() * 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }

  // Noise texture
  addNoise(ctx, width, height, 0.03);

  // Rough edges (jagged border)
  drawJaggedBorder(ctx, width, height, '#78350f', 3);
}

/**
 * Draw posterboard texture:
 * - Clean white (#ffffff)
 * - Very subtle paper grain
 * - Clean-cut edges (thin gray border)
 */
function drawPosterboard(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Base color
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Subtle paper grain (very light noise)
  addNoise(ctx, width, height, 0.01);

  // Clean border
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
}

/**
 * Draw foam board texture:
 * - Off-white (#f0f0f0)
 * - Subtle foam-core texture (dotted pattern)
 * - Thick, clean edges (darker border)
 */
function drawFoamBoard(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Base color
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, width, height);

  // Foam-core texture (subtle dots)
  ctx.fillStyle = 'rgba(55, 65, 81, 0.05)';
  for (let x = 0; x < width; x += 12) {
    for (let y = 0; y < height; y += 12) {
      ctx.beginPath();
      ctx.arc(x + Math.random() * 4, y + Math.random() * 4, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Thick border
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);
}

/**
 * Draw wood texture:
 * - Brown wood grain (#8B6914)
 * - Horizontal wavy grain lines (varying browns)
 * - Knot marks (small darker circles)
 * - Rough edges
 */
function drawWood(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Base color
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(0, 0, width, height);

  // Wood grain lines (wavy horizontal)
  const grainColors = ['#5C4033', '#6F4E37', '#78350f', '#A0522D'];

  for (let i = 0; i < 20; i++) {
    const y = (height / 20) * i + Math.random() * 20;
    ctx.strokeStyle = grainColors[Math.floor(Math.random() * grainColors.length)];
    ctx.globalAlpha = 0.2 + Math.random() * 0.3;
    ctx.lineWidth = 1 + Math.random() * 2;

    ctx.beginPath();
    ctx.moveTo(0, y);

    for (let x = 0; x < width; x += 10) {
      const yOffset = Math.sin(x / 30 + i) * 5;
      ctx.lineTo(x, y + yOffset);
    }

    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  // Knot marks (darker circles)
  const knotCount = 2 + Math.floor(Math.random() * 3);
  ctx.fillStyle = 'rgba(92, 64, 51, 0.4)';

  for (let i = 0; i < knotCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = 8 + Math.random() * 12;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner knot ring
    ctx.strokeStyle = 'rgba(60, 40, 30, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Rough edges
  drawJaggedBorder(ctx, width, height, '#5C4033', 4);
}

/**
 * Add subtle noise texture to canvas.
 */
function addNoise(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * intensity;
    data[i] += noise;     // R
    data[i + 1] += noise; // G
    data[i + 2] += noise; // B
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw jagged/rough border (for cardboard, wood).
 */
function drawJaggedBorder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  thickness: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const jagSize = 4;

  // Top edge
  ctx.beginPath();
  ctx.moveTo(0, jagSize / 2);
  for (let x = 0; x < width; x += jagSize) {
    ctx.lineTo(x, (Math.random() - 0.5) * jagSize);
  }
  ctx.stroke();

  // Bottom edge
  ctx.beginPath();
  ctx.moveTo(0, height - jagSize / 2);
  for (let x = 0; x < width; x += jagSize) {
    ctx.lineTo(x, height + (Math.random() - 0.5) * jagSize);
  }
  ctx.stroke();

  // Left edge
  ctx.beginPath();
  ctx.moveTo(jagSize / 2, 0);
  for (let y = 0; y < height; y += jagSize) {
    ctx.lineTo((Math.random() - 0.5) * jagSize, y);
  }
  ctx.stroke();

  // Right edge
  ctx.beginPath();
  ctx.moveTo(width - jagSize / 2, 0);
  for (let y = 0; y < height; y += jagSize) {
    ctx.lineTo(width + (Math.random() - 0.5) * jagSize, y);
  }
  ctx.stroke();
}
