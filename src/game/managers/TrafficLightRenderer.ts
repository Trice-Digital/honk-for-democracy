import Phaser from 'phaser';
import type { IntersectionMapConfig, TrafficDirection } from '../config/intersectionConfig';
import { TrafficLightSystem } from '../systems/TrafficLightSystem';
import { PALETTE } from '../config/paletteConfig';
import { drawPaperShadow, drawScissorCutRect, drawPopsicleStick } from '../utils/paperArt';

/**
 * TrafficLightRenderer — Renders traffic lights at intersection.
 *
 * Handles Paper Mario paper cutout traffic lights:
 * - Popsicle stick poles
 * - Paper cutout housings with scissor-cut edges
 * - 3-light displays (red/yellow/green) with active glows
 * - Containers for wobble animation
 * - Active circle tracking for phase change pulse
 */
export class TrafficLightRenderer {
  private lightGraphics!: Phaser.GameObjects.Graphics;
  private trafficLightContainers: Phaser.GameObjects.Container[] = [];
  private trafficLightActiveCircles: Phaser.GameObjects.Graphics[] = [];

  constructor(
    private scene: Phaser.Scene,
    private config: IntersectionMapConfig,
    private trafficLights: TrafficLightSystem,
  ) {
    // Create shared graphics layer for light drawing (redrawn each frame)
    this.lightGraphics = this.scene.add.graphics();
    this.lightGraphics.setDepth(11);
  }

  /**
   * Draw traffic lights — Paper cutout on popsicle stick mounts.
   * First call creates containers. Subsequent calls redraw light states.
   */
  draw(): void {
    const cx = this.config.centerX;
    const cy = this.config.centerY;
    const hw = this.config.roadWidth / 2;
    const offset = hw + 20;

    const positions: { px: number; py: number; armDx: number; armDy: number; direction: TrafficDirection }[] = [
      { px: cx + offset, py: cy - offset, armDx: -1, armDy: 0, direction: 'south' },
      { px: cx - offset, py: cy + offset, armDx: 1, armDy: 0, direction: 'north' },
      { px: cx + offset, py: cy + offset, armDx: 0, armDy: -1, direction: 'west' },
      { px: cx - offset, py: cy - offset, armDx: 0, armDy: 1, direction: 'east' },
    ];

    // First call: create containers. Subsequent calls: just redraw light graphics.
    const isFirstDraw = this.trafficLightContainers.length === 0;

    // Clear active circles tracking for phase change pulse
    this.trafficLightActiveCircles = [];

    // Redraw the shared graphics layer
    this.lightGraphics.clear();

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const color = this.trafficLights.getLightColor(pos.direction);

      if (isFirstDraw) {
        // Create a container at the pole position for wobble
        const container = this.scene.add.container(pos.px, pos.py);
        container.setDepth(10);
        this.trafficLightContainers.push(container);

        // Popsicle stick pole (vertical, from ground up to housing)
        const stickG = this.scene.add.graphics();
        drawPopsicleStick(stickG, -3, -30, 6, 30);
        container.add(stickG);
      }

      // Draw lights onto the shared graphics layer (redrawn each frame)
      const g = this.lightGraphics;

      // Housing dimensions
      const isHorizontal = pos.armDx !== 0;
      const housingW = isHorizontal ? 50 : 18;
      const housingH = isHorizontal ? 18 : 50;

      // Housing position: offset from pole toward intersection center
      const hx = pos.px + pos.armDx * 30 - housingW / 2;
      const hy = pos.py + pos.armDy * 30 - housingH / 2;

      // Drop shadow on housing
      drawPaperShadow(g, hx, hy, housingW, housingH);

      // Paper cutout housing (dark background)
      drawScissorCutRect(g, hx, hy, housingW, housingH, PALETTE.asphalt, PALETTE.markerBlack);

      // 3 light circles inside housing
      const spacing = 15;
      const lightDefs: { dx: number; dy: number; lc: string }[] = [
        { dx: isHorizontal ? -spacing : 0, dy: isHorizontal ? 0 : -spacing, lc: 'red' },
        { dx: 0, dy: 0, lc: 'yellow' },
        { dx: isHorizontal ? spacing : 0, dy: isHorizontal ? 0 : spacing, lc: 'green' },
      ];

      const lightCenterX = pos.px + pos.armDx * 30;
      const lightCenterY = pos.py + pos.armDy * 30;

      for (const light of lightDefs) {
        const lx = lightCenterX + light.dx;
        const ly = lightCenterY + light.dy;
        const isActive = light.lc === color;

        if (isActive) {
          // Glow halo behind active light (glow-through-paper effect)
          g.fillStyle(this.getLightHex(light.lc), 0.3);
          g.fillCircle(lx, ly, 10);

          // Active light circle — full brightness
          g.fillStyle(this.getLightHex(light.lc), 1);
          g.fillCircle(lx, ly, 6);

          // Glow on road surface
          g.fillStyle(this.getLightHex(light.lc), 0.06);
          g.fillEllipse(lx + pos.armDx * 20, ly + pos.armDy * 20, 50, 30);

          // Track active circle graphics for pulse on phase change
          const activeG = this.scene.add.graphics();
          activeG.fillStyle(this.getLightHex(light.lc), 1);
          activeG.fillCircle(lx, ly, 6);
          activeG.setDepth(11);
          this.trafficLightActiveCircles.push(activeG);

          // Auto-destroy the overlay after a brief moment (it's just for pulse tweening)
          this.scene.time.delayedCall(500, () => {
            if (activeG && activeG.active) activeG.destroy();
          });
        } else {
          // Inactive light — very dim
          g.fillStyle(this.getDimLightHex(light.lc), 0.15);
          g.fillCircle(lx, ly, 6);
        }

        // Light outline
        g.lineStyle(1.5, PALETTE.markerBlack, 0.8);
        g.strokeCircle(lx, ly, 6);
      }
    }
  }

  /**
   * Get traffic light containers for wobble animation.
   */
  getContainers(): Phaser.GameObjects.Container[] {
    return this.trafficLightContainers;
  }

  /**
   * Get active light circles for phase change pulse effect.
   */
  getActiveCircles(): Phaser.GameObjects.Graphics[] {
    return this.trafficLightActiveCircles;
  }

  private getLightHex(lc: string): number {
    switch (lc) {
      case 'red': return 0xef4444;
      case 'yellow': return 0xfbbf24;
      case 'green': return 0x22c55e;
      default: return 0x333333;
    }
  }

  private getDimLightHex(lc: string): number {
    switch (lc) {
      case 'red': return 0x6b2020;
      case 'yellow': return 0x6b5520;
      case 'green': return 0x206b30;
      default: return 0x333333;
    }
  }
}
