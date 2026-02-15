import Phaser from 'phaser';
import type { IntersectionMapConfig } from '../config/intersectionConfig';
import { PALETTE } from '../config/paletteConfig';
import {
  drawPaperShadow,
  drawPaperShadowCircle,
  drawScissorCutRect,
  drawMaskingTapeStrip,
  drawPopsicleStick,
} from '../utils/paperArt';

// Magic numbers extracted as constants
const SIDEWALK_WIDTH = 18;
const CROSSWALK_STRIPE_WIDTH = 7;
const CROSSWALK_GAP = 5;

/**
 * IntersectionRenderer — Renders static intersection scenery.
 *
 * Handles all Paper Mario construction paper diorama rendering:
 * - Sky, grass, sidewalks, roads
 * - Lane markings (masking tape)
 * - Crosswalks and stop lines
 * - Buildings with window cutouts
 * - Trees with animated canopies
 * - Environmental dressing
 *
 * All static scenery is baked to a single texture for performance.
 * Returns tree canopies as separate images for wobble animation.
 */
export class IntersectionRenderer {
  constructor(
    private scene: Phaser.Scene,
    private config: IntersectionMapConfig,
  ) {}

  /**
   * Render all static scenery and return tree canopies for animation.
   * Bakes static scenery to texture to eliminate per-frame triangulation.
   */
  render(): Phaser.GameObjects.Image[] {
    const cx = this.config.centerX;
    const cy = this.config.centerY;
    const rw = this.config.roadWidth;
    const hw = rw / 2;
    const ww = this.config.worldWidth;
    const wh = this.config.worldHeight;
    const swW = SIDEWALK_WIDTH;

    const treeCanopies: Phaser.GameObjects.Image[] = [];

    // All static scenery drawn to one Graphics, then baked to texture.
    const g = this.scene.add.graphics();

    // =========================================================
    // Layer 0: Sky / background (muted blue construction paper)
    // =========================================================
    g.fillStyle(PALETTE.skyBlue, 1);
    g.fillRect(0, 0, ww, wh);

    // =========================================================
    // Layer 1: Grass / ground corners (construction paper green)
    // Four quadrants outside the road cross, each slightly varied
    // =========================================================
    const grassShades = [
      PALETTE.grassGreen,
      PALETTE.grassGreen + 0x060806,
      PALETTE.grassGreen - 0x080608,
      PALETTE.grassGreen + 0x040404,
    ];

    // Top-left grass
    drawScissorCutRect(g, 0, 0, cx - hw - swW, cy - hw - swW, grassShades[0]);
    // Top-right grass
    drawScissorCutRect(g, cx + hw + swW, 0, ww - cx - hw - swW, cy - hw - swW, grassShades[1]);
    // Bottom-left grass
    drawScissorCutRect(g, 0, cy + hw + swW, cx - hw - swW, wh - cy - hw - swW, grassShades[2]);
    // Bottom-right grass
    drawScissorCutRect(g, cx + hw + swW, cy + hw + swW, ww - cx - hw - swW, wh - cy - hw - swW, grassShades[3]);

    // =========================================================
    // Layer 2: Sidewalks (construction paper tan borders)
    // =========================================================

    // Horizontal sidewalks (above and below horizontal road)
    drawScissorCutRect(g, 0, cy - hw - swW, cx - hw, swW, PALETTE.sidewalkTan);
    drawScissorCutRect(g, cx + hw, cy - hw - swW, ww - cx - hw, swW, PALETTE.sidewalkTan);
    drawScissorCutRect(g, 0, cy + hw, cx - hw, swW, PALETTE.sidewalkTan);
    drawScissorCutRect(g, cx + hw, cy + hw, ww - cx - hw, swW, PALETTE.sidewalkTan);

    // Vertical sidewalks (left and right of vertical road)
    drawScissorCutRect(g, cx - hw - swW, 0, swW, cy - hw - swW, PALETTE.sidewalkTan);
    drawScissorCutRect(g, cx + hw, 0, swW, cy - hw - swW, PALETTE.sidewalkTan);
    drawScissorCutRect(g, cx - hw - swW, cy + hw + swW, swW, wh - cy - hw - swW, PALETTE.sidewalkTan);
    drawScissorCutRect(g, cx + hw, cy + hw + swW, swW, wh - cy - hw - swW, PALETTE.sidewalkTan);

    // =========================================================
    // Layer 3: Roads (dark asphalt construction paper)
    // =========================================================

    // Vertical road
    drawScissorCutRect(g, cx - hw, 0, rw, wh, PALETTE.asphalt);
    // Horizontal road
    drawScissorCutRect(g, 0, cy - hw, ww, rw, PALETTE.asphalt);

    // Center intersection box (slightly lighter asphalt)
    const centerAsphalt = PALETTE.asphalt + 0x0a0a0a;
    g.fillStyle(centerAsphalt, 1);
    g.fillRect(cx - hw, cy - hw, rw, rw);

    // =========================================================
    // Layer 4: Lane markings (masking tape strips)
    // =========================================================

    // Vertical center dashes (top approach — heading toward intersection)
    for (let y = 15; y < cy - hw - 10; y += 55) {
      const dashLen = 38 + Math.random() * 10;
      drawMaskingTapeStrip(g, cx, y, cx, y + dashLen, 6);
    }
    // Vertical center dashes (bottom approach)
    for (let y = cy + hw + 15; y < wh - 10; y += 55) {
      const dashLen = 38 + Math.random() * 10;
      drawMaskingTapeStrip(g, cx, y, cx, y + dashLen, 6);
    }
    // Horizontal center dashes (left approach)
    for (let x = 15; x < cx - hw - 10; x += 55) {
      const dashLen = 38 + Math.random() * 10;
      drawMaskingTapeStrip(g, x, cy, x + dashLen, cy, 6);
    }
    // Horizontal center dashes (right approach)
    for (let x = cx + hw + 15; x < ww - 10; x += 55) {
      const dashLen = 38 + Math.random() * 10;
      drawMaskingTapeStrip(g, x, cy, x + dashLen, cy, 6);
    }

    // =========================================================
    // Layer 4b: Crosswalks (wider masking tape strips)
    // =========================================================

    // Top crosswalk (horizontal stripes across vertical road)
    for (let i = 0; i < 4; i++) {
      const stripeY = cy - hw - swW + 2 + i * (CROSSWALK_STRIPE_WIDTH + CROSSWALK_GAP);
      drawMaskingTapeStrip(g, cx - hw + 6, stripeY, cx + hw - 6, stripeY, CROSSWALK_STRIPE_WIDTH);
    }
    // Bottom crosswalk
    for (let i = 0; i < 4; i++) {
      const stripeY = cy + hw + 2 + i * (CROSSWALK_STRIPE_WIDTH + CROSSWALK_GAP);
      drawMaskingTapeStrip(g, cx - hw + 6, stripeY, cx + hw - 6, stripeY, CROSSWALK_STRIPE_WIDTH);
    }
    // Left crosswalk (vertical stripes across horizontal road)
    for (let i = 0; i < 4; i++) {
      const stripeX = cx - hw - swW + 2 + i * (CROSSWALK_STRIPE_WIDTH + CROSSWALK_GAP);
      drawMaskingTapeStrip(g, stripeX, cy - hw + 6, stripeX, cy + hw - 6, CROSSWALK_STRIPE_WIDTH);
    }
    // Right crosswalk
    for (let i = 0; i < 4; i++) {
      const stripeX = cx + hw + 2 + i * (CROSSWALK_STRIPE_WIDTH + CROSSWALK_GAP);
      drawMaskingTapeStrip(g, stripeX, cy - hw + 6, stripeX, cy + hw - 6, CROSSWALK_STRIPE_WIDTH);
    }

    // =========================================================
    // Layer 4c: Stop lines (wider masking tape)
    // =========================================================
    const stopOff = hw + 3;
    drawMaskingTapeStrip(g, cx - hw + 4, cy - stopOff, cx + hw - 4, cy - stopOff, 8);
    drawMaskingTapeStrip(g, cx - hw + 4, cy + stopOff, cx + hw - 4, cy + stopOff, 8);
    drawMaskingTapeStrip(g, cx - stopOff, cy - hw + 4, cx - stopOff, cy + hw - 4, 8);
    drawMaskingTapeStrip(g, cx + stopOff, cy - hw + 4, cx + stopOff, cy + hw - 4, 8);

    // =========================================================
    // Layer 5: Corner environmental dressing
    // =========================================================

    // --- Buildings (paper cutout facades with scissor-cut edges) ---
    const buildingColors = [
      PALETTE.sidewalkTan - 0x101010,
      PALETTE.cardboard,
      PALETTE.sidewalkTan + 0x080808,
      PALETTE.cardboard - 0x101008,
    ];

    // Helper: draw a paper cutout building with shadow and window cutouts
    const drawBuilding = (bx: number, by: number, bw: number, bh: number, color: number) => {
      drawPaperShadow(g, bx, by, bw, bh);
      drawScissorCutRect(g, bx, by, bw, bh, color);
      const winRows = Math.max(1, Math.floor(bh / 30));
      const winCols = Math.max(1, Math.floor(bw / 35));
      const winW = 12;
      const winH = 14;
      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const wx = bx + 10 + c * (bw - 20) / Math.max(1, winCols);
          const wy = by + 10 + r * (bh - 20) / Math.max(1, winRows);
          g.fillStyle(PALETTE.asphalt, 0.6);
          g.fillRect(wx, wy, winW, winH);
        }
      }
    };

    drawBuilding(cx - hw - swW - 180, cy - hw - swW - 160, 130, 90, buildingColors[0]);
    drawBuilding(cx - hw - swW - 100, cy - hw - swW - 60, 70, 50, buildingColors[1]);
    drawBuilding(cx + hw + swW + 40, cy - hw - swW - 170, 120, 80, buildingColors[2]);
    drawBuilding(cx + hw + swW + 170, cy - hw - swW - 130, 100, 70, buildingColors[3]);
    drawBuilding(cx - hw - swW - 170, cy + hw + swW + 40, 110, 80, buildingColors[1]);
    drawBuilding(cx + hw + swW + 60, cy + hw + swW + 50, 130, 90, buildingColors[0]);

    // --- Trees ---
    const treePositions = [
      { tx: cx - hw - swW - 60, ty: cy - hw - swW - 30, r: 18 },
      { tx: cx - hw - swW - 280, ty: cy - hw - swW - 100, r: 15 },
      { tx: cx + hw + swW + 250, ty: cy + hw + swW + 90, r: 20 },
      { tx: cx + hw + swW + 90, ty: cy - hw - swW - 80, r: 16 },
      { tx: cx - hw - swW - 120, ty: cy + hw + swW + 160, r: 17 },
    ];

    for (const tree of treePositions) {
      // Trunk drawn onto main graphics (gets baked)
      drawPopsicleStick(g, tree.tx - 3, tree.ty - 5, 6, 20);

      // Canopy — bake to texture for wobble animation
      const canopyG = this.scene.add.graphics();
      const pad = 8;
      const dim = (tree.r + pad) * 2;
      const cx2 = tree.r + pad;
      const cy2 = tree.r + pad;
      drawPaperShadowCircle(canopyG, cx2, cy2, tree.r);
      canopyG.fillStyle(PALETTE.grassGreen + (Math.random() > 0.5 ? 0x0a0a06 : -0x060604), 0.92);
      canopyG.fillCircle(cx2, cy2, tree.r);
      canopyG.lineStyle(2, PALETTE.markerBlack, 0.7);
      canopyG.strokeCircle(cx2, cy2, tree.r);

      const texKey = `treeCanopy_${tree.tx}_${tree.ty}`;
      canopyG.generateTexture(texKey, dim, dim);
      canopyG.destroy();

      const canopyImg = this.scene.add.image(tree.tx, tree.ty, texKey);
      canopyImg.setDepth(5);
      treeCanopies.push(canopyImg);
    }

    // =========================================================
    // BAKE: Convert single Graphics → texture → Image.
    // Eliminates per-frame earcut polygon triangulation.
    // =========================================================
    g.generateTexture('staticScenery', ww, wh);
    g.destroy();

    const sceneryImg = this.scene.add.image(0, 0, 'staticScenery');
    sceneryImg.setOrigin(0, 0);
    sceneryImg.setDepth(0);

    return treeCanopies;
  }
}
