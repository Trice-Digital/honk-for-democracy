/**
 * Paper Mario Protest — Procedural Paper Cutout Drawing Utilities
 *
 * Shared drawing functions for the paper cutout aesthetic.
 * All functions are pure utility — they draw onto provided Graphics objects.
 * No scene management, no state.
 */

import Phaser from "phaser";
import { PALETTE } from "../config/paletteConfig";

// ---------------------------------------------------------------------------
// Shadows — hard-offset, no blur, "paper lifted off the table"
// ---------------------------------------------------------------------------

/**
 * Draw a rectangular paper shadow (hard offset, no blur).
 * Creates the "paper lifted off the table" look.
 */
export function drawPaperShadow(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  offsetX: number = PALETTE.shadowOffsetX,
  offsetY: number = PALETTE.shadowOffsetY,
): void {
  g.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
  g.fillRect(x + offsetX, y + offsetY, width, height);
}

/**
 * Draw a circular paper shadow (hard offset, no blur).
 * Same as drawPaperShadow but for circular cutouts.
 */
export function drawPaperShadowCircle(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  offsetX: number = PALETTE.shadowOffsetX,
  offsetY: number = PALETTE.shadowOffsetY,
): void {
  g.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
  g.fillCircle(x + offsetX, y + offsetY, radius);
}

// ---------------------------------------------------------------------------
// Scissor-Cut Edges — slightly imperfect outlines via random vertex offsets
// ---------------------------------------------------------------------------

/**
 * Generate wobbled intermediate points between two points.
 * Adds 2-3 intermediate points per edge, each offset perpendicular to the
 * edge direction by a small random amount (-1.5 to +1.5 pixels).
 */
function wobbleEdge(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number }[] {
  const numIntermediatePoints = 2 + Math.floor(Math.random() * 2); // 2 or 3
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Perpendicular direction (normalized)
  const len = Math.sqrt(dx * dx + dy * dy);
  const perpX = len > 0 ? -dy / len : 0;
  const perpY = len > 0 ? dx / len : 0;

  const points: { x: number; y: number }[] = [];
  for (let i = 1; i <= numIntermediatePoints; i++) {
    const t = i / (numIntermediatePoints + 1);
    const wobble = (Math.random() - 0.5) * 3; // -1.5 to +1.5
    points.push({
      x: x1 + dx * t + perpX * wobble,
      y: y1 + dy * t + perpY * wobble,
    });
  }
  return points;
}

/**
 * Draw a rectangle with slightly wobbly scissor-cut edges.
 * Generates 4 corner points with intermediate wobbled points per edge.
 */
export function drawScissorCutRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: number,
  strokeColor: number = PALETTE.markerBlack,
): void {
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];

  // Build full polygon with wobbled edges between corners
  const allPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < corners.length; i++) {
    const current = corners[i];
    const next = corners[(i + 1) % corners.length];
    allPoints.push(current);
    allPoints.push(...wobbleEdge(current.x, current.y, next.x, next.y));
  }

  drawScissorCutPolygon(g, allPoints, fillColor, strokeColor);
}

/**
 * Draw an arbitrary polygon with scissor-cut wobbly edges.
 * Takes polygon vertices, adds wobble between each pair.
 * Used for car shapes, character shapes, etc.
 */
export function drawScissorCutPolygon(
  g: Phaser.GameObjects.Graphics,
  points: { x: number; y: number }[],
  fillColor: number,
  strokeColor: number = PALETTE.markerBlack,
): void {
  if (points.length < 3) return;

  g.fillStyle(fillColor);
  g.lineStyle(2, strokeColor, 1);

  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i].x, points[i].y);
  }
  g.closePath();
  g.fillPath();
  g.strokePath();
}

// ---------------------------------------------------------------------------
// Paper Grain — low-opacity fiber texture overlay
// ---------------------------------------------------------------------------

/**
 * Create a Graphics object with low-opacity random short lines and dots
 * that simulate cardboard fiber grain texture.
 * Returns the graphics object so caller can set depth/position.
 */
export function applyPaperGrain(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number = 0.04,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.setPosition(x, y);

  const grainColor = PALETTE.markerBlack;

  // Draw random short lines (fiber strands)
  const numLines = Math.floor((width * height) / 200);
  for (let i = 0; i < numLines; i++) {
    const lx = Math.random() * width;
    const ly = Math.random() * height;
    const angle = Math.random() * Math.PI;
    const len = 2 + Math.random() * 4;
    g.lineStyle(1, grainColor, alpha);
    g.beginPath();
    g.moveTo(lx, ly);
    g.lineTo(lx + Math.cos(angle) * len, ly + Math.sin(angle) * len);
    g.strokePath();
  }

  // Draw random dots (paper imperfections)
  const numDots = Math.floor((width * height) / 600);
  g.fillStyle(grainColor, alpha * 0.8);
  for (let i = 0; i < numDots; i++) {
    const dx = Math.random() * width;
    const dy = Math.random() * height;
    g.fillCircle(dx, dy, 0.5 + Math.random() * 0.5);
  }

  return g;
}

// ---------------------------------------------------------------------------
// Popsicle Stick — rounded rectangle with subtle wood grain
// ---------------------------------------------------------------------------

/**
 * Draw a popsicle stick (rounded rectangle in craftBrown with wood grain lines).
 * Used for traffic light poles, sign posts, clock mounts.
 */
export function drawPopsicleStick(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const radius = Math.min(width, height) * 0.3;
  const darkerBrown = 0x7a350c;

  // Fill the stick body
  g.fillStyle(PALETTE.craftBrown);
  g.fillRoundedRect(x, y, width, height, radius);

  // Stroke the outline
  g.lineStyle(1.5, darkerBrown, 0.6);
  g.strokeRoundedRect(x, y, width, height, radius);

  // Add 2-3 subtle horizontal wood grain lines
  const numGrainLines = 2 + Math.floor(Math.random() * 2);
  g.lineStyle(1, 0xb8860b, 0.15); // lighter brown, low alpha
  for (let i = 0; i < numGrainLines; i++) {
    const gy = y + height * (0.25 + (i / numGrainLines) * 0.5);
    const inset = radius * 0.5;
    g.beginPath();
    g.moveTo(x + inset, gy);
    g.lineTo(x + width - inset, gy);
    g.strokePath();
  }
}

// ---------------------------------------------------------------------------
// Masking Tape Strip — semi-transparent off-white strip with ragged edges
// ---------------------------------------------------------------------------

/**
 * Draw a masking tape strip between two points.
 * Slightly off-white, semi-transparent, with ragged edges.
 * Used for lane markings instead of painted lines.
 */
export function drawMaskingTapeStrip(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tapeWidth: number = 8,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;

  // Perpendicular direction
  const perpX = (-dy / len) * (tapeWidth / 2);
  const perpY = (dx / len) * (tapeWidth / 2);

  // Four corners of the tape strip
  const corners = [
    { x: x1 + perpX, y: y1 + perpY },
    { x: x2 + perpX, y: y2 + perpY },
    { x: x2 - perpX, y: y2 - perpY },
    { x: x1 - perpX, y: y1 - perpY },
  ];

  // Build wobbled polygon for ragged tape edges
  const allPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < corners.length; i++) {
    const current = corners[i];
    const next = corners[(i + 1) % corners.length];
    allPoints.push(current);
    allPoints.push(...wobbleEdge(current.x, current.y, next.x, next.y));
  }

  // Off-white semi-transparent tape
  const tapeColor = 0xf0ead6;
  g.fillStyle(tapeColor, 0.55);
  g.beginPath();
  g.moveTo(allPoints[0].x, allPoints[0].y);
  for (let i = 1; i < allPoints.length; i++) {
    g.lineTo(allPoints[i].x, allPoints[i].y);
  }
  g.closePath();
  g.fillPath();
}

// ---------------------------------------------------------------------------
// Wobble Animation — idle paper wobble via sine wave
// ---------------------------------------------------------------------------

/**
 * Returns baseValue offset by a sine wave. Used for idle paper wobble animation.
 * @param baseValue - The base value (e.g., rotation in radians)
 * @param time - Current time in ms (e.g., scene.time.now)
 * @param amplitude - Wobble amplitude in the same unit as baseValue (default 0.026 rad ≈ 1.5°)
 * @param frequency - Wobble frequency (default 0.002)
 */
export function wobbleSine(
  baseValue: number,
  time: number,
  amplitude: number = 0.026,
  frequency: number = 0.002,
): number {
  return baseValue + Math.sin(time * frequency) * amplitude;
}
