import Phaser from 'phaser';

/**
 * ActivismScene — Post-game activism payload.
 *
 * Bridges the game to real-world action with impactful messaging
 * and functional resource links. This is the payload.
 */

interface ResourceLink {
  label: string;
  description: string;
  url: string | null;
  color: number;
  emoji: string;
}

const RESOURCES: ResourceLink[] = [
  {
    label: 'Know Your Rights',
    description: 'ACLU guide to protester rights',
    url: 'https://www.aclu.org/know-your-rights/protesters-rights',
    color: 0x3b82f6,
    emoji: '\u2696\uFE0F',
  },
  {
    label: 'Register to Vote',
    description: 'Check your registration or sign up',
    url: 'https://vote.gov',
    color: 0x22c55e,
    emoji: '\uD83D\uDDF3\uFE0F',
  },
  {
    label: 'Find Your Reps',
    description: 'Contact your elected officials',
    url: 'https://www.usa.gov/elected-officials',
    color: 0x8b5cf6,
    emoji: '\uD83C\uDFDB\uFE0F',
  },
  {
    label: 'Protest Safety',
    description: 'Wear layers, bring water, go with friends, tell someone where you\'ll be',
    url: null,
    color: 0xf97316,
    emoji: '\uD83D\uDEE1\uFE0F',
  },
];

export class ActivismScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ActivismScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.cameras.main.setBackgroundColor('#0a0a12');

    let y = 0;

    // ============================================================
    // HERO TEXT — STAGGERED REVEAL
    // ============================================================

    y = 60;

    const line1 = this.add.text(cx, y, 'This was a game.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
    });
    line1.setOrigin(0.5, 0);
    line1.setAlpha(0);

    y += 50;

    const line2 = this.add.text(cx, y, 'This is also real.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#fbbf24',
      align: 'center',
    });
    line2.setOrigin(0.5, 0);
    line2.setAlpha(0);

    y += 60;

    const contextText = this.add.text(cx, y,
      'People stand at intersections with signs every day.\n' +
      'They face the same reactions you just experienced.\n' +
      'Here\'s how you can support them \u2014 or join them.',
    {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#9ca3af',
      align: 'center',
      lineSpacing: 6,
      wordWrap: { width: width - 60 },
    });
    contextText.setOrigin(0.5, 0);
    contextText.setAlpha(0);

    // Staggered fade-in
    this.tweens.add({
      targets: line1,
      alpha: 1,
      duration: 800,
      delay: 300,
    });

    this.tweens.add({
      targets: line2,
      alpha: 1,
      duration: 800,
      delay: 1200,
    });

    this.tweens.add({
      targets: contextText,
      alpha: 1,
      duration: 600,
      delay: 2000,
    });

    // ============================================================
    // RESOURCE LINKS
    // ============================================================

    y += 75;

    const resourceStartY = y;
    const resourceHeight = 70;
    const resourceGap = 12;

    for (let i = 0; i < RESOURCES.length; i++) {
      const resource = RESOURCES[i];
      const ry = resourceStartY + i * (resourceHeight + resourceGap);
      this.createResourceButton(cx, ry, resource, width, 2200 + i * 200);
    }

    // ============================================================
    // PLAY AGAIN BUTTON
    // ============================================================

    const btnY = Math.max(
      resourceStartY + RESOURCES.length * (resourceHeight + resourceGap) + 30,
      height - 80,
    );

    const playAgainBg = this.add.rectangle(cx, btnY, 280, 56, 0x22c55e);
    playAgainBg.setStrokeStyle(2, 0xffffff, 0.3);
    playAgainBg.setInteractive({ useHandCursor: true });
    playAgainBg.setAlpha(0);

    const playAgainText = this.add.text(cx, btnY, 'Play Again', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    playAgainText.setOrigin(0.5);
    playAgainText.setAlpha(0);

    // Fade in after resources
    this.tweens.add({
      targets: [playAgainBg, playAgainText],
      alpha: 1,
      duration: 600,
      delay: 3000,
    });

    playAgainBg.on('pointerover', () => playAgainBg.setFillStyle(0x16a34a));
    playAgainBg.on('pointerout', () => playAgainBg.setFillStyle(0x22c55e));
    playAgainBg.on('pointerdown', () => {
      this.scene.start('SignCraftScene');
    });

    // Prevent context menu
    this.input.mouse?.disableContextMenu();

    console.log('[HFD] ActivismScene created. Phase 6 activism payload active.');
  }

  private createResourceButton(
    x: number,
    y: number,
    resource: ResourceLink,
    screenWidth: number,
    fadeDelay: number,
  ): void {
    const btnWidth = screenWidth - 60;
    const btnHeight = 64;

    const bg = this.add.rectangle(x, y, btnWidth, btnHeight, 0x1a1a2e);
    bg.setStrokeStyle(2, resource.color, 0.6);
    bg.setAlpha(0);

    // Colored left accent bar
    const accent = this.add.rectangle(x - btnWidth / 2 + 3, y, 4, btnHeight - 8, resource.color);
    accent.setAlpha(0);

    const labelText = this.add.text(x - btnWidth / 2 + 20, y - 12, `${resource.emoji}  ${resource.label}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    labelText.setOrigin(0, 0);
    labelText.setAlpha(0);

    const descText = this.add.text(x - btnWidth / 2 + 20, y + 10, resource.description, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#6b7280',
      wordWrap: { width: btnWidth - 60 },
    });
    descText.setOrigin(0, 0);
    descText.setAlpha(0);

    // Arrow indicator for links
    if (resource.url) {
      const arrow = this.add.text(x + btnWidth / 2 - 20, y, '\u2192', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#6b7280',
      });
      arrow.setOrigin(1, 0.5);
      arrow.setAlpha(0);

      this.tweens.add({
        targets: arrow,
        alpha: 1,
        duration: 500,
        delay: fadeDelay,
      });
    }

    // Fade in
    this.tweens.add({
      targets: [bg, accent, labelText, descText],
      alpha: 1,
      duration: 500,
      delay: fadeDelay,
    });

    // Make interactive
    if (resource.url) {
      bg.setInteractive({ useHandCursor: true });

      bg.on('pointerover', () => {
        bg.setStrokeStyle(2, resource.color, 1);
        bg.setFillStyle(0x222233);
      });

      bg.on('pointerout', () => {
        bg.setStrokeStyle(2, resource.color, 0.6);
        bg.setFillStyle(0x1a1a2e);
      });

      bg.on('pointerdown', () => {
        window.open(resource.url!, '_blank', 'noopener,noreferrer');
      });
    }
  }
}
