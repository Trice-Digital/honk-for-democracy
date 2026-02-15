import Phaser from 'phaser';

/**
 * BootScene — Paper Mario cutout loading screen.
 *
 * Phase 9 visual overhaul: Cardboard/craft-table background,
 * Bangers font title, paper cutout progress bar with marker outlines.
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

    // Cardboard background
    this.cameras.main.setBackgroundColor('#b8956a');

    // Paper cutout card in center
    const cardG = this.add.graphics();
    const cardW = Math.min(500, width - 40);
    const cardH = 280;
    const cardX = centerX - cardW / 2;
    const cardY = centerY - cardH / 2;

    // Hard shadow
    cardG.fillStyle(0x1a1a1a, 0.4);
    cardG.fillRoundedRect(cardX + 5, cardY + 5, cardW, cardH, 4);
    // Paper white card
    cardG.fillStyle(0xf5f0e8, 0.95);
    cardG.fillRoundedRect(cardX, cardY, cardW, cardH, 4);
    // Marker outline
    cardG.lineStyle(3.5, 0x1a1a1a, 0.9);
    cardG.strokeRoundedRect(cardX, cardY, cardW, cardH, 4);

    // Title text (Bangers font, paper cutout style)
    this.add
      .text(centerX, centerY - 80, 'HONK FOR\nDEMOCRACY', {
        fontFamily: "'Bangers', cursive",
        fontSize: '52px',
        color: '#1a1a1a',
        align: 'center',
        lineSpacing: 4,
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    // Tagline (Patrick Hand font)
    this.add
      .text(centerX, centerY, 'Stand Up. Speak Out.', {
        fontFamily: "'Patrick Hand', cursive",
        fontSize: '22px',
        color: '#3a3a3a',
        align: 'center',
      })
      .setOrigin(0.5);

    // Loading bar background (paper cutout)
    const barWidth = Math.min(350, width - 80);
    const barHeight = 28;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 50;

    const barBg = this.add.graphics();
    barBg.fillStyle(0xdddddd, 1);
    barBg.fillRect(barX, barY, barWidth, barHeight);
    barBg.lineStyle(3, 0x1a1a1a, 0.9);
    barBg.strokeRect(barX, barY, barWidth, barHeight);

    // Loading bar fill
    const barFill = this.add.graphics();

    // "Loading" text (Bangers)
    const loadingText = this.add
      .text(centerX, barY + barHeight + 24, 'LOADING...', {
        fontFamily: "'Bangers', cursive",
        fontSize: '18px',
        color: '#92400e',
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    // Progress callback
    this.load.on('progress', (value: number) => {
      barFill.clear();
      barFill.fillStyle(0xfbbf24, 1);
      barFill.fillRect(barX + 2, barY + 2, (barWidth - 4) * value, barHeight - 4);
      loadingText.setText(`LOADING... ${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      loadingText.setText('READY!');
      loadingText.setColor('#22c55e');
    });
  }

  private loadAssets(): void {
    // Phase 1: Generate placeholder textures directly (no file loading needed).
    const graphics = this.add.graphics();
    graphics.fillStyle(0x3b82f6, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('placeholder-dot', 32, 32);
    graphics.destroy();
  }
}
