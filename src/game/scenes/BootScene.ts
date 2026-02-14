import Phaser from 'phaser';

/**
 * BootScene — Asset preloader with loading screen.
 *
 * Displays a progress bar while game assets load,
 * then transitions to the GameScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingScreen();
    this.loadAssets();
  }

  create(): void {
    // Brief pause so the loading screen is visible even with fast loads
    this.time.delayedCall(400, () => {
      this.scene.start('SignCraftScene');
    });
  }

  private createLoadingScreen(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Title text
    this.add
      .text(centerX, centerY - 120, 'HONK FOR\nDEMOCRACY', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        color: '#ffffff',
        align: 'center',
        fontStyle: 'bold',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    // Tagline
    this.add
      .text(centerX, centerY + 10, 'Stand Up. Speak Out.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#b8c4d0',
        align: 'center',
      })
      .setOrigin(0.5);

    // Loading bar background
    const barWidth = 400;
    const barHeight = 24;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 80;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x2a2a4a, 1);
    barBg.fillRoundedRect(barX, barY, barWidth, barHeight, 12);

    // Loading bar fill
    const barFill = this.add.graphics();

    // "Loading" text
    const loadingText = this.add
      .text(centerX, barY + barHeight + 30, 'Loading...', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#8892a4',
      })
      .setOrigin(0.5);

    // Progress callback
    this.load.on('progress', (value: number) => {
      barFill.clear();
      barFill.fillStyle(0x3b82f6, 1);
      barFill.fillRoundedRect(barX, barY, barWidth * value, barHeight, 12);
      loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      loadingText.setText('Ready!');
    });
  }

  private loadAssets(): void {
    // Phase 1: Generate placeholder textures directly (no file loading needed).
    // Real game assets will be added in Phase 2+.
    const graphics = this.add.graphics();
    graphics.fillStyle(0x3b82f6, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('placeholder-dot', 32, 32);
    graphics.destroy();
  }
}
