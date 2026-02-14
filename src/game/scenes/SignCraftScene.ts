import Phaser from 'phaser';
import {
  SIGN_MATERIALS,
  type SignMaterial,
  type SignData,
  setSignData,
  scoreMessageQuality,
} from '../config/signConfig';

/**
 * SignCraftScene — Pre-game creative expression scene.
 *
 * Player picks a sign material, types a custom message,
 * sees a preview, then launches into IntersectionScene.
 * Sign data is stored in Phaser registry for cross-scene access.
 */
export class SignCraftScene extends Phaser.Scene {
  // State
  private selectedMaterial: SignMaterial = SIGN_MATERIALS[0];
  private signMessage: string = '';

  // UI elements
  private materialButtons: Phaser.GameObjects.Container[] = [];
  private previewBoard!: Phaser.GameObjects.Rectangle;
  private previewStroke!: Phaser.GameObjects.Rectangle;
  private previewText!: Phaser.GameObjects.Text;
  private previewStick!: Phaser.GameObjects.Rectangle;
  private qualityText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private messagePromptText!: Phaser.GameObjects.Text;

  // DOM input
  private inputElement: HTMLInputElement | null = null;

  constructor() {
    super({ key: 'SignCraftScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // ============================================================
    // TITLE
    // ============================================================

    this.add
      .text(cx, 50, 'CRAFT YOUR SIGN', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5, 0);

    this.add
      .text(cx, 100, 'Pick your material and write your message', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#8892a4',
        align: 'center',
      })
      .setOrigin(0.5, 0);

    // ============================================================
    // MATERIAL PICKER
    // ============================================================

    this.add
      .text(cx, 150, 'MATERIAL', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#6b7280',
        letterSpacing: 4,
      })
      .setOrigin(0.5, 0);

    const materialStartY = 185;
    const materialHeight = 80;
    const materialGap = 12;

    SIGN_MATERIALS.forEach((material, index) => {
      const y = materialStartY + index * (materialHeight + materialGap);
      const btn = this.createMaterialButton(cx, y, material, index === 0);
      this.materialButtons.push(btn);
    });

    // ============================================================
    // MESSAGE INPUT
    // ============================================================

    const inputY = materialStartY + 3 * (materialHeight + materialGap) + 20;

    this.add
      .text(cx, inputY, 'YOUR MESSAGE', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#6b7280',
        letterSpacing: 4,
      })
      .setOrigin(0.5, 0);

    this.messagePromptText = this.add
      .text(cx, inputY + 30, 'Tap here to type your message', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#4b5563',
        align: 'center',
      })
      .setOrigin(0.5, 0);

    // Input background (tappable area)
    const inputBg = this.add.rectangle(cx, inputY + 55, width - 80, 50, 0x2a2a4a);
    inputBg.setStrokeStyle(2, 0x3b82f6, 0.5);
    inputBg.setInteractive({ useHandCursor: true });

    // The typed message display (shown on canvas, mirrors DOM input)
    const messageDisplay = this.add
      .text(cx, inputY + 55, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: width - 100 },
      })
      .setOrigin(0.5);

    // Create hidden DOM input for native keyboard support
    this.createDOMInput(inputBg, messageDisplay);

    inputBg.on('pointerdown', () => {
      if (this.inputElement) {
        this.inputElement.focus();
      }
    });

    // ============================================================
    // SIGN PREVIEW
    // ============================================================

    const previewY = inputY + 120;

    this.add
      .text(cx, previewY, 'PREVIEW', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#6b7280',
        letterSpacing: 4,
      })
      .setOrigin(0.5, 0);

    const signCenterY = previewY + 100;

    // Sign stick
    this.previewStick = this.add.rectangle(cx, signCenterY + 60, 6, 80, 0x92400e);

    // Sign board (outer stroke)
    this.previewStroke = this.add.rectangle(cx, signCenterY, 280, 120, this.selectedMaterial.strokeColor);

    // Sign board (inner fill)
    this.previewBoard = this.add.rectangle(cx, signCenterY, 274, 114, this.selectedMaterial.boardColor);

    // Sign text
    this.previewText = this.add.text(cx, signCenterY, 'Your message here...', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: this.selectedMaterial.textColor,
      align: 'center',
      wordWrap: { width: 250 },
    });
    this.previewText.setOrigin(0.5);

    // Quality indicator
    this.qualityText = this.add.text(cx, signCenterY + 75, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#6b7280',
      align: 'center',
    });
    this.qualityText.setOrigin(0.5, 0);

    // ============================================================
    // START BUTTON
    // ============================================================

    const buttonY = Math.min(signCenterY + 160, height - 80);

    this.startButton = this.createStartButton(cx, buttonY);

    // ============================================================
    // HANDLE RESIZE
    // ============================================================

    this.scale.on('resize', () => {
      // Reposition DOM input if it exists
      this.repositionDOMInput();
    });

    // Prevent context menu
    this.input.mouse?.disableContextMenu();

    console.log('[HFD] SignCraftScene created. Phase 3 sign crafting active.');
  }

  shutdown(): void {
    // Clean up DOM input when leaving scene
    if (this.inputElement) {
      this.inputElement.remove();
      this.inputElement = null;
    }
  }

  // ============================================================
  // MATERIAL BUTTON
  // ============================================================

  private createMaterialButton(
    x: number,
    y: number,
    material: SignMaterial,
    selected: boolean,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const { width } = this.scale;
    const btnWidth = width - 80;
    const btnHeight = 72;

    // Background
    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, selected ? 0x1e3a5f : 0x2a2a4a);
    bg.setStrokeStyle(2, selected ? 0x3b82f6 : 0x4b5563, selected ? 1 : 0.5);

    // Material color swatch
    const swatch = this.add.rectangle(-btnWidth / 2 + 30, 0, 32, 32, material.boardColor);
    swatch.setStrokeStyle(2, material.strokeColor);

    // Material name
    const nameText = this.add.text(-btnWidth / 2 + 60, -14, material.label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    });

    // Description
    const descText = this.add.text(-btnWidth / 2 + 60, 10, material.description, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#9ca3af',
    });

    // Style label (right side)
    const styleText = this.add.text(btnWidth / 2 - 16, 0, material.styleLabel, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: selected ? '#60a5fa' : '#6b7280',
      align: 'right',
    });
    styleText.setOrigin(1, 0.5);

    container.add([bg, swatch, nameText, descText, styleText]);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
      this.selectMaterial(material);
    });

    // Store refs for updating selection state
    (container as any)._bg = bg;
    (container as any)._styleText = styleText;
    (container as any)._materialId = material.id;

    return container;
  }

  private selectMaterial(material: SignMaterial): void {
    this.selectedMaterial = material;

    // Update button visuals
    for (const btn of this.materialButtons) {
      const isSelected = (btn as any)._materialId === material.id;
      const bg = (btn as any)._bg as Phaser.GameObjects.Rectangle;
      const styleText = (btn as any)._styleText as Phaser.GameObjects.Text;

      bg.setFillStyle(isSelected ? 0x1e3a5f : 0x2a2a4a);
      bg.setStrokeStyle(2, isSelected ? 0x3b82f6 : 0x4b5563, isSelected ? 1 : 0.5);
      styleText.setColor(isSelected ? '#60a5fa' : '#6b7280');
    }

    // Update preview
    this.updatePreview();
  }

  // ============================================================
  // DOM INPUT
  // ============================================================

  private createDOMInput(
    inputBg: Phaser.GameObjects.Rectangle,
    messageDisplay: Phaser.GameObjects.Text,
  ): void {
    // Create a hidden input element overlaid on the canvas
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 60;
    input.placeholder = 'Type your protest message...';
    input.autocomplete = 'off';
    input.autocapitalize = 'characters';

    // Style to be invisible but functional
    input.style.position = 'absolute';
    input.style.opacity = '0';
    input.style.fontSize = '22px';
    input.style.width = '1px';
    input.style.height = '1px';
    input.style.border = 'none';
    input.style.outline = 'none';
    input.style.background = 'transparent';
    input.style.color = 'transparent';
    input.style.caretColor = 'transparent';
    // Position off-screen but still focusable
    input.style.left = '-9999px';
    input.style.top = '0';

    // Find the game canvas parent and append
    const canvas = this.game.canvas;
    const parent = canvas.parentElement ?? document.body;
    parent.style.position = 'relative';
    parent.appendChild(input);

    this.inputElement = input;

    // Sync input to display
    input.addEventListener('input', () => {
      this.signMessage = input.value;
      const displayMsg = this.signMessage || '';

      messageDisplay.setText(displayMsg);

      // Update prompt visibility
      if (displayMsg.length > 0) {
        this.messagePromptText.setVisible(false);
      } else {
        this.messagePromptText.setVisible(true);
      }

      this.updatePreview();
    });

    // Show visual focus state
    input.addEventListener('focus', () => {
      inputBg.setStrokeStyle(2, 0x3b82f6, 1);
      if (this.signMessage.length === 0) {
        this.messagePromptText.setText('Type your message...');
        this.messagePromptText.setColor('#60a5fa');
      }
    });

    input.addEventListener('blur', () => {
      inputBg.setStrokeStyle(2, 0x3b82f6, 0.5);
      if (this.signMessage.length === 0) {
        this.messagePromptText.setText('Tap here to type your message');
        this.messagePromptText.setColor('#4b5563');
        this.messagePromptText.setVisible(true);
      }
    });
  }

  private repositionDOMInput(): void {
    // DOM input stays off-screen; no repositioning needed
  }

  // ============================================================
  // PREVIEW
  // ============================================================

  private updatePreview(): void {
    const material = this.selectedMaterial;

    // Update board colors
    this.previewBoard.setFillStyle(material.boardColor);
    this.previewStroke.setFillStyle(material.strokeColor);

    // Update text
    const message = this.signMessage.trim() || 'Your message here...';
    this.previewText.setText(message);
    this.previewText.setColor(material.textColor);

    // Auto-size font based on message length
    if (message.length > 30) {
      this.previewText.setFontSize(16);
    } else if (message.length > 20) {
      this.previewText.setFontSize(20);
    } else {
      this.previewText.setFontSize(24);
    }

    // Quality score
    if (this.signMessage.trim().length > 0) {
      const quality = scoreMessageQuality(this.signMessage);
      const qualityLabel = this.getQualityLabel(quality);
      this.qualityText.setText(`Sign Rating: ${qualityLabel}`);
      this.qualityText.setVisible(true);
    } else {
      this.qualityText.setVisible(false);
    }
  }

  private getQualityLabel(score: number): string {
    if (score >= 0.8) return '★★★ POWERFUL';
    if (score >= 0.6) return '★★☆ STRONG';
    if (score >= 0.4) return '★☆☆ DECENT';
    return '☆☆☆ BASIC';
  }

  // ============================================================
  // START BUTTON
  // ============================================================

  private createStartButton(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 280, 60, 0x22c55e);
    bg.setStrokeStyle(2, 0xffffff, 0.3);

    const text = this.add.text(0, 0, 'START PROTESTING', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    text.setOrigin(0.5);

    container.add([bg, text]);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => bg.setFillStyle(0x16a34a));
    bg.on('pointerout', () => bg.setFillStyle(0x22c55e));

    bg.on('pointerdown', () => {
      this.launchGame();
    });

    return container;
  }

  private launchGame(): void {
    // Build sign data
    const message = this.signMessage.trim() || 'HONK!';
    const qualityScore = scoreMessageQuality(message);

    const signData: SignData = {
      material: this.selectedMaterial,
      message,
      qualityScore,
    };

    // Store in registry for IntersectionScene to read
    setSignData(this, signData);

    // Clean up DOM input
    if (this.inputElement) {
      this.inputElement.remove();
      this.inputElement = null;
    }

    // Transition to gameplay
    this.scene.start('IntersectionScene');
  }
}
