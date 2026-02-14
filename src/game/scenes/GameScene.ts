import Phaser from 'phaser';

/**
 * GameScene — Placeholder game scene for Phase 1.
 *
 * Proves the full pipeline works:
 * - Canvas renders
 * - Scene transitions work (BootScene -> GameScene)
 * - Touch/mouse input is captured
 * - No browser gesture interference
 */
export class GameScene extends Phaser.Scene {
  private touchIndicator!: Phaser.GameObjects.Arc;
  private touchTrail!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    this.add
      .text(centerX, 100, 'HONK FOR DEMOCRACY', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '42px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(centerX, 160, 'Phase 1 — Game Boot', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#8892a4',
      })
      .setOrigin(0.5);

    // Instructions
    this.add
      .text(centerX, centerY - 40, 'Touch or click anywhere\nto test input capture', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#b8c4d0',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    // Touch trail graphics
    this.touchTrail = this.add.graphics();

    // Touch indicator — follows finger/mouse
    this.touchIndicator = this.add.circle(centerX, centerY + 100, 24, 0x3b82f6, 0.8);
    this.touchIndicator.setStrokeStyle(3, 0xffffff, 0.9);
    this.touchIndicator.setVisible(false);

    // Status text — shows touch coordinates
    this.statusText = this.add
      .text(centerX, height - 120, 'Waiting for input...', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#6b7280',
        align: 'center',
      })
      .setOrigin(0.5);

    // Canvas dimensions info
    this.add
      .text(centerX, height - 60, `Canvas: ${width}x${height} | Scale: FIT | Base: 720x1280`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#4b5563',
      })
      .setOrigin(0.5);

    // Input handlers
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.touchIndicator.setPosition(pointer.x, pointer.y);
      this.touchIndicator.setVisible(true);
      this.statusText.setText(
        `Input: (${Math.round(pointer.x)}, ${Math.round(pointer.y)})\n` +
          `Type: ${pointer.wasTouch ? 'Touch' : 'Mouse'} | Down: ${pointer.isDown}`
      );

      // Draw trail when pointer is down
      if (pointer.isDown) {
        this.touchTrail.fillStyle(0x3b82f6, 0.3);
        this.touchTrail.fillCircle(pointer.x, pointer.y, 12);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.touchIndicator.setFillStyle(0xef4444, 0.9);
      this.touchIndicator.setPosition(pointer.x, pointer.y);
      this.touchIndicator.setVisible(true);

      // Pulse animation
      this.tweens.add({
        targets: this.touchIndicator,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 150,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    });

    this.input.on('pointerup', () => {
      this.touchIndicator.setFillStyle(0x3b82f6, 0.8);

      // Clear trail after a delay
      this.time.delayedCall(1000, () => {
        this.touchTrail.clear();
      });
    });

    // Prevent context menu on right-click/long-press
    this.input.mouse?.disableContextMenu();

    // Log to confirm game is running
    console.log('[HFD] GameScene created. Touch input active. Phase 1 boot complete.');
  }
}
