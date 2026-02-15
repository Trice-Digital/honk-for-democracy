/**
 * ShareCardGenerator — Canvas API image compositor for social share cards.
 *
 * Generates a 1080x1080 Polaroid-style PNG from the player's sign image,
 * score, grade, and intersection name. Matches the Paper Mario protest
 * aesthetic: construction paper texture, hard-offset shadows, Bangers font,
 * masking tape accent.
 *
 * Pure DOM/Canvas — zero Phaser dependency. Lives in src/lib/ alongside
 * other non-Phaser modules (SignEditor, etc.).
 */

import { SHARE_CONFIG } from '../game/config/shareConfig';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ShareCardOptions {
  /** PNG data URL from Fabric.js sign creator */
  signImageDataUrl: string;
  /** Final game score */
  score: number;
  /** Grade letter, e.g. "A", "S", "B" */
  gradeLabel: string;
  /** Hex color for grade badge, e.g. "#22c55e" */
  gradeColor: string;
  /** Intersection name shown in caption (defaults to config value) */
  intersectionName?: string;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate a 1080x1080 Polaroid-style share card as a PNG data URL.
 *
 * Returns an empty string on failure (with console.error).
 */
export async function generateShareCard(options: ShareCardOptions): Promise<string> {
  try {
    const cfg = SHARE_CONFIG;
    const { width, height } = cfg.canvas;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');

    // Wait for Bangers font (already loaded by Layout.astro via Google Fonts CDN)
    await waitForFont('Bangers');

    // 1. Background — cardboard with paper grain
    drawBackground(ctx, width, height, cfg);

    // 2. Polaroid frame with hard-offset shadow
    const frame = computeFrameRect(cfg);
    drawFrame(ctx, frame, cfg);

    // 3. Sign image
    const signImg = await loadImage(options.signImageDataUrl);
    const signRect = drawSignImage(ctx, signImg, frame, cfg);

    // 4. Tape accent
    drawTapeAccent(ctx, frame, cfg);

    // 5. Caption text
    const intersectionName = options.intersectionName ?? cfg.defaultIntersectionName;
    const captionY = drawCaption(ctx, intersectionName, signRect, frame, cfg);

    // 6. Score + grade badge
    const scoreY = drawScore(ctx, options.gradeLabel, options.gradeColor, options.score, captionY, frame, cfg);

    // 7. Branding
    drawBranding(ctx, frame, cfg, scoreY);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('[ShareCardGenerator] Failed to generate share card:', err);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function computeFrameRect(cfg: typeof SHARE_CONFIG): Rect {
  return {
    x: cfg.frame.inset,
    y: cfg.frame.inset,
    w: cfg.canvas.width - cfg.frame.inset * 2,
    h: cfg.canvas.height - cfg.frame.inset * 2,
  };
}

// ---------------------------------------------------------------------------
// Drawing: Background + paper grain
// ---------------------------------------------------------------------------

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cfg: typeof SHARE_CONFIG,
): void {
  // Solid cardboard fill
  ctx.fillStyle = cfg.background.color;
  ctx.fillRect(0, 0, w, h);

  // Procedural paper grain (ported from paperArt.ts applyPaperGrain)
  const area = w * h;
  const grainColor = cfg.background.grainColor;
  const alpha = cfg.background.grainAlpha;

  // Random short lines (fiber strands)
  const numLines = Math.floor(area / cfg.background.grainLineDensity);
  ctx.strokeStyle = hexWithAlpha(grainColor, alpha);
  ctx.lineWidth = 1;
  for (let i = 0; i < numLines; i++) {
    const lx = Math.random() * w;
    const ly = Math.random() * h;
    const angle = Math.random() * Math.PI;
    const len = 2 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + Math.cos(angle) * len, ly + Math.sin(angle) * len);
    ctx.stroke();
  }

  // Random dots (paper imperfections)
  const numDots = Math.floor(area / cfg.background.grainDotDensity);
  ctx.fillStyle = hexWithAlpha(grainColor, alpha * 0.8);
  for (let i = 0; i < numDots; i++) {
    const dx = Math.random() * w;
    const dy = Math.random() * h;
    const r = 0.5 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Drawing: Polaroid frame
// ---------------------------------------------------------------------------

function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: Rect,
  cfg: typeof SHARE_CONFIG,
): void {
  const { shadow, borderWidth, borderColor, color } = cfg.frame;

  // Hard-offset shadow (drawn first, behind the frame)
  ctx.fillStyle = hexWithAlpha(shadow.color, shadow.alpha);
  ctx.fillRect(
    frame.x + shadow.offsetX,
    frame.y + shadow.offsetY,
    frame.w,
    frame.h,
  );

  // White frame fill
  ctx.fillStyle = color;
  ctx.fillRect(frame.x, frame.y, frame.w, frame.h);

  // Frame border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
}

// ---------------------------------------------------------------------------
// Drawing: Sign image
// ---------------------------------------------------------------------------

function drawSignImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  frame: Rect,
  cfg: typeof SHARE_CONFIG,
): Rect {
  const siCfg = cfg.signImage;
  const pad = cfg.frame.padding;

  // Available area for sign image
  const areaX = frame.x + pad;
  const areaY = frame.y + pad + siCfg.topOffset;
  const areaW = frame.w - pad * 2;
  const maxW = Math.min(siCfg.maxWidth, areaW);
  const maxH = siCfg.maxHeight;

  let drawW: number;
  let drawH: number;

  if (img) {
    // Preserve aspect ratio
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    drawW = img.naturalWidth * scale;
    drawH = img.naturalHeight * scale;
  } else {
    // Placeholder
    drawW = maxW * 0.7;
    drawH = maxH * 0.7;
  }

  const drawX = areaX + (areaW - drawW) / 2;
  const drawY = areaY;

  if (img) {
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    // Placeholder rect
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(drawX, drawY, drawW, drawH);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = "bold 36px 'Bangers', 'Impact', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOUR SIGN', drawX + drawW / 2, drawY + drawH / 2);
  }

  // Thin border for definition
  ctx.strokeStyle = siCfg.borderColor;
  ctx.lineWidth = siCfg.borderWidth;
  ctx.strokeRect(drawX, drawY, drawW, drawH);

  return { x: drawX, y: drawY, w: drawW, h: drawH };
}

// ---------------------------------------------------------------------------
// Drawing: Tape accent
// ---------------------------------------------------------------------------

function drawTapeAccent(
  ctx: CanvasRenderingContext2D,
  frame: Rect,
  cfg: typeof SHARE_CONFIG,
): void {
  const tape = cfg.tape;
  const angleRad = (tape.angleDeg * Math.PI) / 180;

  // Position: top-right corner of frame
  const cx = frame.x + frame.w - 40;
  const cy = frame.y + 20;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);

  // Build wobbled tape rectangle
  const hw = tape.width / 2;
  const hh = tape.height / 2;

  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  // Add wobble to each edge
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < corners.length; i++) {
    const curr = corners[i];
    const next = corners[(i + 1) % corners.length];
    points.push(curr);
    points.push(...wobbleEdge(curr.x, curr.y, next.x, next.y, tape.wobblePoints, tape.wobbleAmount));
  }

  ctx.fillStyle = hexWithAlpha(tape.color, tape.alpha);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Drawing: Caption text
// ---------------------------------------------------------------------------

function drawCaption(
  ctx: CanvasRenderingContext2D,
  intersectionName: string,
  signRect: Rect,
  frame: Rect,
  cfg: typeof SHARE_CONFIG,
): number {
  const cap = cfg.caption;
  const text = cap.template.replace('{intersectionName}', intersectionName);
  const maxWidth = frame.w - cfg.frame.padding * 2;

  ctx.fillStyle = cap.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Shrink font if text is too wide
  let fontSize = cap.fontSize;
  ctx.font = `${fontSize}px ${cap.font}`;
  while (ctx.measureText(text).width > maxWidth && fontSize > cap.minFontSize) {
    fontSize -= 2;
    ctx.font = `${fontSize}px ${cap.font}`;
  }

  const y = signRect.y + signRect.h + cap.topGap;
  const cx = frame.x + frame.w / 2;
  ctx.fillText(text, cx, y, maxWidth);

  return y + fontSize + 4;
}

// ---------------------------------------------------------------------------
// Drawing: Score + grade badge
// ---------------------------------------------------------------------------

function drawScore(
  ctx: CanvasRenderingContext2D,
  gradeLabel: string,
  gradeColor: string,
  score: number,
  captionBottomY: number,
  frame: Rect,
  cfg: typeof SHARE_CONFIG,
): number {
  const sc = cfg.score;
  const cx = frame.x + frame.w / 2;
  const y = captionBottomY + sc.topGap;

  // Grade badge: filled circle with letter
  const badgeCx = cx - 60;
  const badgeCy = y + sc.gradeCircleRadius;

  // Circle fill
  ctx.fillStyle = gradeColor;
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, sc.gradeCircleRadius, 0, Math.PI * 2);
  ctx.fill();

  // Circle border
  ctx.strokeStyle = sc.gradeCircleBorderColor;
  ctx.lineWidth = sc.gradeCircleBorderWidth;
  ctx.stroke();

  // Grade letter inside circle
  ctx.fillStyle = '#ffffff';
  ctx.font = `${sc.gradeFontSize}px ${sc.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(gradeLabel, badgeCx, badgeCy + 2);

  // Score number + "pts" to the right of badge
  ctx.fillStyle = sc.scoreColor;
  ctx.font = `${sc.scoreFontSize}px ${sc.font}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${score} ${sc.ptsLabel}`, badgeCx + sc.gradeCircleRadius + 16, badgeCy + 2);

  return badgeCy + sc.gradeCircleRadius + 8;
}

// ---------------------------------------------------------------------------
// Drawing: Branding
// ---------------------------------------------------------------------------

function drawBranding(
  ctx: CanvasRenderingContext2D,
  frame: Rect,
  cfg: typeof SHARE_CONFIG,
  scoreBottomY: number,
): void {
  const br = cfg.branding;
  const cx = frame.x + frame.w / 2;

  // Place branding at bottom of frame, but not above score
  const frameBottom = frame.y + frame.h - cfg.frame.padding - br.bottomGap;
  const y = Math.max(scoreBottomY + 12, frameBottom - br.fontSize);

  ctx.fillStyle = br.color;
  ctx.font = `${br.fontSize}px ${br.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(br.text, cx, y + br.fontSize);
}

// ---------------------------------------------------------------------------
// Utility: Font readiness
// ---------------------------------------------------------------------------

async function waitForFont(family: string, timeoutMs: number = 3000): Promise<void> {
  if (typeof document === 'undefined') return;

  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);

    // Double-check the specific font loaded
    if (!document.fonts.check(`16px '${family}'`)) {
      console.warn(`[ShareCardGenerator] Font '${family}' not available, using fallback`);
    }
  } catch {
    // Fonts API not supported — fallback will be used
  }
}

// ---------------------------------------------------------------------------
// Utility: Load image from data URL
// ---------------------------------------------------------------------------

function loadImage(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('[ShareCardGenerator] Failed to load sign image, using placeholder');
      resolve(null);
    };
    img.src = dataUrl;
  });
}

// ---------------------------------------------------------------------------
// Utility: Wobble edge (ported from paperArt.ts for Canvas 2D)
// ---------------------------------------------------------------------------

function wobbleEdge(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  numPoints: number = 3,
  amplitude: number = 1.5,
): { x: number; y: number }[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const perpX = len > 0 ? -dy / len : 0;
  const perpY = len > 0 ? dx / len : 0;

  const points: { x: number; y: number }[] = [];
  for (let i = 1; i <= numPoints; i++) {
    const t = i / (numPoints + 1);
    const wobble = (Math.random() - 0.5) * amplitude * 2;
    points.push({
      x: x1 + dx * t + perpX * wobble,
      y: y1 + dy * t + perpY * wobble,
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Utility: Hex color with alpha as CSS rgba()
// ---------------------------------------------------------------------------

function hexWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
