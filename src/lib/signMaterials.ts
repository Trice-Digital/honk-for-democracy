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
    // Cardboard variants
    case 'cardboard':
      drawCardboard(ctx, width, height, '#c4956a');
      break;
    case 'cardboard-red':
      drawCardboard(ctx, width, height, '#b85c4a');
      break;
    case 'cardboard-blue':
      drawCardboard(ctx, width, height, '#6a8fb8');
      break;
    case 'cardboard-green':
      drawCardboard(ctx, width, height, '#7a9a6a');
      break;

    // Posterboard variants
    case 'posterboard':
      drawPosterboard(ctx, width, height, '#f5f0e8');
      break;
    case 'posterboard-yellow':
      drawPosterboard(ctx, width, height, '#fbbf24');
      break;
    case 'posterboard-pink':
      drawPosterboard(ctx, width, height, '#f472b6');
      break;
    case 'posterboard-sky':
      drawPosterboard(ctx, width, height, '#7dd3fc');
      break;

    // Foam Board variants
    case 'foamboard':
      drawFoamBoard(ctx, width, height, '#e8e8e8');
      break;
    case 'foamboard-green':
      drawFoamBoard(ctx, width, height, '#86efac');
      break;
    case 'foamboard-purple':
      drawFoamBoard(ctx, width, height, '#c4b5fd');
      break;

    // Wood Plank variants
    case 'wood':
      drawWood(ctx, width, height, '#DEB887');
      break;
    case 'wood-dark':
      drawWood(ctx, width, height, '#8B7355', ['#5C4033', '#3B2B1F', '#4A3728', '#6B5744']);
      break;

    default:
      console.warn(`[SignMaterials] Unknown material ID: ${materialId}. Using posterboard.`);
      drawPosterboard(ctx, width, height, '#f5f0e8');
  }

  return canvas;
}

/**
 * Draw cardboard texture:
 * - Tan base (default #c4956a, or custom color)
 * - Horizontal grain lines (darker, semi-transparent, varied spacing)
 * - Slight noise texture
 * - Torn/rough edges (jagged border)
 */
function drawCardboard(ctx: CanvasRenderingContext2D, width: number, height: number, baseColor: string = '#c4956a'): void {
  // Base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Horizontal grain lines (darken the base color for grain)
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
 * - Clean white (default #f5f0e8, or custom color)
 * - Very subtle paper grain
 * - Clean-cut edges (thin gray border)
 */
function drawPosterboard(ctx: CanvasRenderingContext2D, width: number, height: number, baseColor: string = '#f5f0e8'): void {
  // Base color
  ctx.fillStyle = baseColor;
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
 * - Off-white (default #e8e8e8, or custom color)
 * - Subtle foam-core texture (dotted pattern)
 * - Thick, clean edges (darker border)
 */
function drawFoamBoard(ctx: CanvasRenderingContext2D, width: number, height: number, baseColor: string = '#e8e8e8'): void {
  // Base color
  ctx.fillStyle = baseColor;
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
 * - Brown wood grain (default #DEB887 light, or darker variant)
 * - Horizontal wavy grain lines (varying browns)
 * - Knot marks (small darker circles)
 * - Rough edges
 */
function drawWood(ctx: CanvasRenderingContext2D, width: number, height: number, baseColor: string = '#DEB887', grainColors?: string[]): void {
  // Base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Wood grain lines (wavy horizontal)
  const grains = grainColors || ['#5C4033', '#6F4E37', '#78350f', '#A0522D'];

  for (let i = 0; i < 20; i++) {
    const y = (height / 20) * i + Math.random() * 20;
    ctx.strokeStyle = grains[Math.floor(Math.random() * grains.length)];
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
