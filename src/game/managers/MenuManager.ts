import Phaser from 'phaser';
import { AudioSystem } from '../systems/AudioSystem';
import { AudioMixerSystem } from '../systems/AudioMixerSystem';
import { PALETTE } from '../config/paletteConfig';
import { drawPaperShadow, drawScissorCutRect } from '../utils/paperArt';

/**
 * MenuManager — Manages pause menu and mute button.
 *
 * Responsibilities:
 * - Mute button (top left neobrutalist card)
 * - Menu button (hamburger icon, below mute)
 * - Pause overlay (paper cutout panel with Resume/Restart/Quit)
 * - Pause state tracking
 */
export class MenuManager {
  private isPaused: boolean = false;
  private menuOverlay: Phaser.GameObjects.Container | null = null;
  private muteBtn!: Phaser.GameObjects.Text;
  private muteBtnBg!: Phaser.GameObjects.Graphics;

  constructor(
    private scene: Phaser.Scene,
    private audioSystem: AudioSystem,
    private mixerSystem: AudioMixerSystem,
  ) {}

  /**
   * Create mute button in top left.
   */
  createMuteButton(): void {
    // --- Settings/Mute button (top left, neobrutalist card) ---
    const muteShadow = this.scene.add.graphics();
    muteShadow.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    muteShadow.fillRoundedRect(18, 18, 42, 42, 4);
    muteShadow.setScrollFactor(0);
    muteShadow.setDepth(98);

    this.muteBtnBg = this.scene.add.graphics();
    this.muteBtnBg.fillStyle(PALETTE.paperWhite, 0.9);
    this.muteBtnBg.fillRoundedRect(15, 15, 42, 42, 4);
    this.muteBtnBg.lineStyle(3, PALETTE.markerBlack, 1);
    this.muteBtnBg.strokeRoundedRect(15, 15, 42, 42, 4);
    this.muteBtnBg.setScrollFactor(0);
    this.muteBtnBg.setDepth(99);

    this.muteBtn = this.scene.add.text(36, 36, '\uD83D\uDD0A', {
      fontSize: '20px',
    });
    this.muteBtn.setOrigin(0.5);
    this.muteBtn.setScrollFactor(0);
    this.muteBtn.setDepth(100);
    this.muteBtn.setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', () => {
      this.muteBtnBg.setPosition(2, 2);
      this.muteBtn.setPosition(38, 38);
    });
    this.muteBtn.on('pointerup', () => {
      this.muteBtnBg.setPosition(0, 0);
      this.muteBtn.setPosition(36, 36);
      const muted = this.audioSystem.toggleMute();
      this.mixerSystem.setMasterMute(muted);
      this.muteBtn.setText(muted ? '\uD83D\uDD07' : '\uD83D\uDD0A');
    });
    this.muteBtn.on('pointerout', () => {
      this.muteBtnBg.setPosition(0, 0);
      this.muteBtn.setPosition(36, 36);
    });
  }

  /**
   * Create menu button (hamburger icon) below mute button.
   */
  createMenuButton(_viewW: number, _viewH: number): void {
    const btnX = 15;
    const btnY = 65; // Below the mute button
    const btnSize = 36;

    // Shadow
    const menuShadow = this.scene.add.graphics();
    menuShadow.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    menuShadow.fillRoundedRect(btnX + 3, btnY + 3, btnSize, btnSize, 4);
    menuShadow.setScrollFactor(0);
    menuShadow.setDepth(104);

    // Button background (paper cutout)
    const menuBg = this.scene.add.graphics();
    menuBg.fillStyle(PALETTE.paperWhite, 0.9);
    menuBg.fillRoundedRect(btnX, btnY, btnSize, btnSize, 4);
    menuBg.lineStyle(2.5, PALETTE.markerBlack, 1);
    menuBg.strokeRoundedRect(btnX, btnY, btnSize, btnSize, 4);
    menuBg.setScrollFactor(0);
    menuBg.setDepth(105);

    // Hamburger icon (three marker lines)
    const iconG = this.scene.add.graphics();
    const cx = btnX + btnSize / 2;
    const cy = btnY + btnSize / 2;
    iconG.lineStyle(3, PALETTE.markerBlack, 0.9);
    for (let i = -1; i <= 1; i++) {
      const ly = cy + i * 7;
      iconG.beginPath();
      iconG.moveTo(cx - 9, ly);
      iconG.lineTo(cx + 9, ly);
      iconG.strokePath();
    }
    iconG.setScrollFactor(0);
    iconG.setDepth(106);

    // Interactive hit area
    const hitArea = this.scene.add.rectangle(cx, cy, btnSize, btnSize);
    hitArea.setScrollFactor(0);
    hitArea.setDepth(107);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.setAlpha(0.001); // Invisible but interactive

    hitArea.on('pointerdown', () => {
      this.toggleMenuOverlay();
    });
  }

  /**
   * Toggle menu overlay — creates or destroys the pause panel.
   */
  toggleMenuOverlay(): void {
    if (this.menuOverlay) {
      // Close overlay, resume
      this.menuOverlay.destroy();
      this.menuOverlay = null;
      this.isPaused = false;
      return;
    }

    // Open overlay, pause
    this.isPaused = true;

    const viewW = this.scene.scale.width;
    const viewH = this.scene.scale.height;

    // Dark overlay background
    const darkBg = this.scene.add.rectangle(0, 0, viewW, viewH, 0x000000, 0.6);
    darkBg.setOrigin(0, 0);

    // Paper cutout panel
    const panelW = 240;
    const panelH = 220;
    const panelX = viewW / 2 - panelW / 2;
    const panelY = viewH / 2 - panelH / 2;

    const panelG = this.scene.add.graphics();
    // Shadow
    drawPaperShadow(panelG, panelX, panelY, panelW, panelH);
    // Body
    drawScissorCutRect(panelG, panelX, panelY, panelW, panelH, PALETTE.cardboard);

    // Title: "PAUSED"
    const titleText = this.scene.add.text(viewW / 2, panelY + 30, 'PAUSED', {
      fontFamily: "'Bangers', cursive",
      fontSize: '32px',
      color: '#fbbf24',
      stroke: '#1a1a1a',
      strokeThickness: 4,
      letterSpacing: 3,
    });
    titleText.setOrigin(0.5);

    // Button factory
    const createMenuBtn = (
      y: number,
      label: string,
      fillColor: number,
      callback: () => void,
    ): Phaser.GameObjects.Container => {
      const bw = 180;
      const bh = 42;
      const bx = viewW / 2;

      const btnShadow = this.scene.add.graphics();
      btnShadow.fillStyle(PALETTE.shadowDark, 0.5);
      btnShadow.fillRoundedRect(-bw / 2 + 3, -bh / 2 + 3, bw, bh, 4);

      const bg = this.scene.add.rectangle(0, 0, bw, bh, fillColor);
      bg.setStrokeStyle(3, PALETTE.markerBlack, 1);

      const text = this.scene.add.text(0, 0, label, {
        fontFamily: "'Bangers', cursive",
        fontSize: '20px',
        color: '#f5f0e8',
        letterSpacing: 2,
      });
      text.setOrigin(0.5);

      const container = this.scene.add.container(bx, y, [btnShadow, bg, text]);
      container.setSize(bw, bh);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerdown', () => {
        container.setPosition(bx + 2, y + 2);
      });
      container.on('pointerup', () => {
        container.setPosition(bx, y);
        callback();
      });
      container.on('pointerout', () => {
        container.setPosition(bx, y);
      });

      return container;
    };

    const btnStartY = panelY + 75;
    const btnGap = 50;

    // Resume button
    const resumeBtn = createMenuBtn(btnStartY, 'RESUME', PALETTE.stoplightGreen, () => {
      this.toggleMenuOverlay();
    });

    // Restart button
    const restartBtn = createMenuBtn(btnStartY + btnGap, 'RESTART', PALETTE.actionBlue, () => {
      this.menuOverlay?.destroy();
      this.menuOverlay = null;
      this.isPaused = false;
      this.scene.scene.restart();
    });

    // Quit to Title button
    const quitBtn = createMenuBtn(btnStartY + btnGap * 2, 'QUIT TO TITLE', PALETTE.stoplightRed, () => {
      this.menuOverlay?.destroy();
      this.menuOverlay = null;
      this.isPaused = false;
      this.scene.scene.start('BootScene');
    });

    this.menuOverlay = this.scene.add.container(0, 0, [
      darkBg, panelG, titleText, resumeBtn, restartBtn, quitBtn,
    ]);
    this.menuOverlay.setScrollFactor(0);
    this.menuOverlay.setDepth(500);
  }

  /**
   * Get pause state.
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Destroy menu overlay if open.
   */
  destroy(): void {
    if (this.menuOverlay) {
      this.menuOverlay.destroy();
      this.menuOverlay = null;
    }
  }
}
