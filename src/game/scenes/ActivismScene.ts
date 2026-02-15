import Phaser from 'phaser';
import { PALETTE, FONTS } from '../config/paletteConfig';
import { drawScissorCutRect, drawPaperShadow, applyPaperGrain } from '../utils/paperArt';

/**
 * ActivismScene — Post-game activism payload.
 *
 * Paper craft aesthetic: kraft paper background, marker fonts,
 * scissor-cut resource cards, neobrutalist buttons.
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

    // ============================================================
    // BACKGROUND — Kraft paper (darker warm brown)
    // ============================================================

    this.cameras.main.setBackgroundColor(0x8b7355);

    // Paper grain overlay
    const grain = applyPaperGrain(this, 0, 0, width, height, 0.05);
    grain.setDepth(100);

    let y = 0;

    // ============================================================
    // HERO TEXT — STAGGERED REVEAL
    // ============================================================

    y = 60;

    const line1 = this.add.text(cx, y, 'This was a game.', {
      fontFamily: FONTS.ui,
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#f5f0e8',
      align: 'center',
    });
    line1.setOrigin(0.5, 0);
    line1.setAlpha(0);

    y += 50;

    const line2 = this.add.text(cx, y, 'This is also real.', {
      fontFamily: FONTS.ui,
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
      fontFamily: FONTS.ui,
      fontSize: '16px',
      color: '#d4c4a8',
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
    // RESOURCE LINKS — Paper cutout cards with scissor-cut edges
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
    // PLAY AGAIN BUTTON — Neobrutalist
    // ============================================================

    const btnY = Math.max(
      resourceStartY + RESOURCES.length * (resourceHeight + resourceGap) + 30,
      height - 80,
    );

    // Hard offset shadow
    const playAgainShadow = this.add.rectangle(cx + 3, btnY + 3, 280, 56, PALETTE.markerBlack);
    playAgainShadow.setAlpha(0);

    const playAgainBg = this.add.rectangle(cx, btnY, 280, 56, PALETTE.stoplightGreen);
    playAgainBg.setStrokeStyle(3, PALETTE.markerBlack, 1);
    playAgainBg.setInteractive({ useHandCursor: true });
    playAgainBg.setAlpha(0);

    const playAgainText = this.add.text(cx, btnY, 'PLAY AGAIN', {
      fontFamily: FONTS.ui,
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#1a1a1a',
    });
    playAgainText.setOrigin(0.5);
    playAgainText.setAlpha(0);

    // Fade in after resources
    this.tweens.add({
      targets: [playAgainBg, playAgainText, playAgainShadow],
      alpha: 1,
      duration: 600,
      delay: 3000,
    });

    playAgainBg.on('pointerover', () => playAgainBg.setFillStyle(0x16a34a));
    playAgainBg.on('pointerout', () => playAgainBg.setFillStyle(PALETTE.stoplightGreen));
    playAgainBg.on('pointerdown', () => {
      // Press into shadow
      playAgainBg.setPosition(cx + 2, btnY + 2);
      playAgainShadow.setVisible(false);
      this.time.delayedCall(100, () => {
        this.scene.start('SignCraftScene');
      });
    });

    // Prevent context menu
    this.input.mouse?.disableContextMenu();

    console.log('[HFD] ActivismScene created. Paper craft aesthetic active.');
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

    // Paper cutout card with scissor-cut edges and drop shadow
    const cardG = this.add.graphics();

    // Draw shadow first
    drawPaperShadow(cardG, x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight);

    // Scissor-cut rectangle
    drawScissorCutRect(
      cardG,
      x - btnWidth / 2,
      y - btnHeight / 2,
      btnWidth,
      btnHeight,
      PALETTE.paperWhite,
    );

    cardG.setAlpha(0);

    // Colored left accent bar (keep existing color logic)
    const accent = this.add.rectangle(x - btnWidth / 2 + 3, y, 4, btnHeight - 8, resource.color);
    accent.setAlpha(0);

    const labelText = this.add.text(x - btnWidth / 2 + 20, y - 12, `${resource.emoji}  ${resource.label}`, {
      fontFamily: FONTS.ui,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#1a1a1a',
    });
    labelText.setOrigin(0, 0);
    labelText.setAlpha(0);

    const descText = this.add.text(x - btnWidth / 2 + 20, y + 10, resource.description, {
      fontFamily: FONTS.ui,
      fontSize: '13px',
      color: '#92400e',
      wordWrap: { width: btnWidth - 60 },
    });
    descText.setOrigin(0, 0);
    descText.setAlpha(0);

    // Arrow indicator for links
    let arrow: Phaser.GameObjects.Text | null = null;
    if (resource.url) {
      arrow = this.add.text(x + btnWidth / 2 - 20, y, '\u2192', {
        fontFamily: FONTS.ui,
        fontSize: '22px',
        color: '#92400e',
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
      targets: [cardG, accent, labelText, descText],
      alpha: 1,
      duration: 500,
      delay: fadeDelay,
    });

    // Make interactive — use an invisible rectangle for hit area since we draw with Graphics
    if (resource.url) {
      const hitArea = this.add.rectangle(x, y, btnWidth, btnHeight, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });

      hitArea.on('pointerover', () => {
        // Redraw with highlighted edge
        cardG.clear();
        drawPaperShadow(cardG, x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight);
        drawScissorCutRect(
          cardG,
          x - btnWidth / 2,
          y - btnHeight / 2,
          btnWidth,
          btnHeight,
          0xe8e0d0,
          resource.color,
        );
      });

      hitArea.on('pointerout', () => {
        cardG.clear();
        drawPaperShadow(cardG, x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight);
        drawScissorCutRect(
          cardG,
          x - btnWidth / 2,
          y - btnHeight / 2,
          btnWidth,
          btnHeight,
          PALETTE.paperWhite,
        );
      });

      hitArea.on('pointerdown', () => {
        window.open(resource.url!, '_blank', 'noopener,noreferrer');
      });
    }
  }
}
