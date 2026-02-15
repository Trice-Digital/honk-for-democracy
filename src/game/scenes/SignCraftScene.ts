import Phaser from 'phaser';
import {
  SIGN_MATERIALS,
  SIGN_FONTS,
  SIGN_COLORS,
  type SignMaterial,
  type SignData,
  setSignData,
  scoreMessageQuality,
} from '../config/signConfig';
import { SignEditor } from '../../lib/signEditor';
import { generateMaterialTexture } from '../../lib/signMaterials';
import { DECORATIONS, getDecorationsByCategory, EMOJI_CATEGORIES, type EmojiDef } from '../../lib/signDecorations';

/**
 * SignCraftScene — Fabric.js sign creator (M2 Phase 8).
 *
 * Mounts a DOM overlay with:
 * - Full-screen Fabric.js canvas for sign editing
 * - Material picker (4 material thumbnails)
 * - Font picker (4 font buttons)
 * - Color picker (7 color swatches)
 * - Text input field (HTML input for native keyboard)
 * - "START PROTESTING" button (exports sign and transitions to gameplay)
 *
 * Architecture:
 * - Fabric.js lives in DOM overlay OVER the Phaser canvas
 * - Phaser never touches Fabric.js; Fabric.js never touches Phaser
 * - Bridge: PNG data URL stored in SignData via Phaser registry
 */
export class SignCraftScene extends Phaser.Scene {
  // DOM elements
  private overlayContainer: HTMLDivElement | null = null;
  private signEditor: SignEditor | null = null;
  private textInput: HTMLInputElement | null = null;
  private removeButton: HTMLButtonElement | null = null;

  // State
  private selectedMaterial: SignMaterial = SIGN_MATERIALS[0];
  private selectedFont: string = SIGN_FONTS[0];
  private selectedColor: string = SIGN_COLORS[0];
  private signMessage: string = '';
  private selectedDecorationTab: 'stickers' | 'tape' = 'stickers';
  private selectedEmojiCategory: string = 'protest';

  constructor() {
    super({ key: 'SignCraftScene' });
  }

  create(): void {
    // Set Phaser background (will be hidden by overlay)
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Mount DOM overlay with Fabric.js editor
    this.mountFabricOverlay();

    console.log('[HFD] SignCraftScene created. Fabric.js sign editor mounted.');
  }

  shutdown(): void {
    this.cleanupOverlay();
  }

  // ============================================================
  // DOM OVERLAY CREATION
  // ============================================================

  private mountFabricOverlay(): void {
    const canvas = this.game.canvas;
    const parent = canvas.parentElement ?? document.body;

    // Create full-screen overlay container
    const container = document.createElement('div');
    container.id = 'sign-editor-overlay';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.backgroundColor = '#b8956a'; // Cardboard/craft-table
    container.style.zIndex = '1000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.padding = '20px';
    container.style.boxSizing = 'border-box';
    container.style.overflow = 'auto';
    container.style.fontFamily = "'Patrick Hand', cursive, system-ui, sans-serif";

    // Title
    const title = document.createElement('h1');
    title.textContent = 'CRAFT YOUR SIGN';
    title.style.color = '#1a1a1a';
    title.style.fontSize = '36px';
    title.style.fontFamily = "'Bangers', cursive";
    title.style.fontWeight = 'normal';
    title.style.letterSpacing = '4px';
    title.style.margin = '0 0 8px 0';
    title.style.textAlign = 'center';
    container.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Pick your material, font, and color';
    subtitle.style.color = '#3a3a3a';
    subtitle.style.fontSize = '16px';
    subtitle.style.margin = '0 0 20px 0';
    subtitle.style.textAlign = 'center';
    container.appendChild(subtitle);

    // Material picker
    const materialSection = this.createMaterialPicker();
    container.appendChild(materialSection);

    // Text input
    const inputSection = this.createTextInput();
    container.appendChild(inputSection);

    // Sign canvas (Fabric.js)
    const canvasContainer = document.createElement('div');
    canvasContainer.style.margin = '20px 0';
    canvasContainer.style.position = 'relative';
    container.appendChild(canvasContainer);

    // Create SignEditor instance
    const editorWidth = Math.min(600, window.innerWidth - 40);
    const editorHeight = Math.min(400, (window.innerHeight * 0.4));

    this.signEditor = new SignEditor({
      container: canvasContainer,
      width: editorWidth,
      height: editorHeight,
    });

    // Set initial material
    this.signEditor.setMaterialById(this.selectedMaterial.id);

    // Font picker
    const fontSection = this.createFontPicker();
    container.appendChild(fontSection);

    // Color picker
    const colorSection = this.createColorPicker();
    container.appendChild(colorSection);

    // Decoration picker
    const decorationSection = this.createDecorationPicker();
    container.appendChild(decorationSection);

    // Start button
    const startButton = this.createStartButton();
    container.appendChild(startButton);

    // Append to parent
    parent.appendChild(container);
    this.overlayContainer = container;
  }

  // ============================================================
  // MATERIAL PICKER
  // ============================================================

  private createMaterialPicker(): HTMLElement {
    const section = document.createElement('div');
    section.style.marginBottom = '16px';
    section.style.width = '100%';
    section.style.maxWidth = '600px';

    const label = document.createElement('div');
    label.textContent = 'MATERIAL';
    label.style.color = '#1a1a1a';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';
    label.style.letterSpacing = '2px';
    label.style.marginBottom = '8px';
    label.style.textAlign = 'center';
    section.appendChild(label);

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.justifyContent = 'center';
    row.style.flexWrap = 'wrap';

    SIGN_MATERIALS.forEach((material, index) => {
      const btn = this.createMaterialButton(material, index === 0);
      row.appendChild(btn);
    });

    section.appendChild(row);
    return section;
  }

  private createMaterialButton(material: SignMaterial, selected: boolean): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.width = '120px';
    btn.style.height = '80px';
    btn.style.border = selected ? '3px solid #3b82f6' : '2px solid #4b5563';
    btn.style.borderRadius = '8px';
    btn.style.backgroundColor = '#f5f0e8';
    btn.style.cursor = 'pointer';
    btn.style.padding = '8px';
    btn.style.display = 'flex';
    btn.style.flexDirection = 'column';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.transition = 'all 0.2s';
    btn.dataset.materialId = material.id;

    // Material thumbnail (small canvas preview)
    const thumbnail = generateMaterialTexture(material.id, 60, 40);
    thumbnail.style.borderRadius = '4px';
    thumbnail.style.marginBottom = '4px';
    btn.appendChild(thumbnail);

    const name = document.createElement('div');
    name.textContent = material.label;
    name.style.color = '#ffffff';
    name.style.fontSize = '12px';
    name.style.fontWeight = 'bold';
    name.style.textAlign = 'center';
    btn.appendChild(name);

    btn.addEventListener('click', () => this.selectMaterial(material));

    btn.addEventListener('mouseenter', () => {
      if (!selected) {
        btn.style.borderColor = '#60a5fa';
      }
    });

    btn.addEventListener('mouseleave', () => {
      if (!selected) {
        btn.style.borderColor = '#4b5563';
      }
    });

    return btn;
  }

  private selectMaterial(material: SignMaterial): void {
    this.selectedMaterial = material;

    // Update button styles
    const buttons = this.overlayContainer?.querySelectorAll('[data-material-id]');
    buttons?.forEach((btn) => {
      const isSelected = (btn as HTMLElement).dataset.materialId === material.id;
      (btn as HTMLElement).style.border = isSelected ? '3px solid #3b82f6' : '2px solid #4b5563';
    });

    // Update canvas background
    if (this.signEditor) {
      this.signEditor.setMaterialById(material.id);
    }
  }

  // ============================================================
  // TEXT INPUT
  // ============================================================

  private createTextInput(): HTMLElement {
    const section = document.createElement('div');
    section.style.marginBottom = '16px';
    section.style.width = '100%';
    section.style.maxWidth = '600px';

    const label = document.createElement('div');
    label.textContent = 'YOUR MESSAGE';
    label.style.color = '#1a1a1a';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';
    label.style.letterSpacing = '2px';
    label.style.marginBottom = '8px';
    label.style.textAlign = 'center';
    section.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 60;
    input.placeholder = 'Type your protest message...';
    input.autocomplete = 'off';
    input.autocapitalize = 'characters';
    input.style.width = '100%';
    input.style.padding = '12px';
    input.style.fontSize = '18px';
    input.style.color = '#1a1a1a';
    input.style.backgroundColor = '#f5f0e8';
    input.style.border = '3px solid #1a1a1a';
    input.style.borderRadius = '8px';
    input.style.outline = 'none';
    input.style.fontFamily = 'system-ui, sans-serif';
    input.style.textAlign = 'center';
    input.style.boxSizing = 'border-box';

    input.addEventListener('input', () => {
      this.signMessage = input.value;
      if (this.signEditor) {
        this.signEditor.setText(this.signMessage);
      }
    });

    input.addEventListener('focus', () => {
      input.style.borderColor = '#60a5fa';
    });

    input.addEventListener('blur', () => {
      input.style.borderColor = '#3b82f6';
    });

    section.appendChild(input);
    this.textInput = input;

    return section;
  }

  // ============================================================
  // FONT PICKER
  // ============================================================

  private createFontPicker(): HTMLElement {
    const section = document.createElement('div');
    section.style.marginBottom = '16px';
    section.style.width = '100%';
    section.style.maxWidth = '600px';

    const label = document.createElement('div');
    label.textContent = 'FONT';
    label.style.color = '#1a1a1a';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';
    label.style.letterSpacing = '2px';
    label.style.marginBottom = '8px';
    label.style.textAlign = 'center';
    section.appendChild(label);

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.justifyContent = 'center';
    row.style.flexWrap = 'wrap';

    SIGN_FONTS.forEach((font, index) => {
      const btn = this.createFontButton(font, index === 0);
      row.appendChild(btn);
    });

    section.appendChild(row);
    return section;
  }

  private createFontButton(font: string, selected: boolean): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = font.replace(/\s/g, '\n');
    btn.style.minWidth = '120px';
    btn.style.padding = '12px 16px';
    btn.style.border = selected ? '3px solid #3b82f6' : '2px solid #4b5563';
    btn.style.borderRadius = '8px';
    btn.style.backgroundColor = '#f5f0e8';
    btn.style.color = '#1a1a1a';
    btn.style.fontSize = '14px';
    btn.style.fontFamily = font;
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.2s';
    btn.style.whiteSpace = 'pre-line';
    btn.style.lineHeight = '1.2';
    btn.dataset.font = font;

    btn.addEventListener('click', () => this.selectFont(font));

    btn.addEventListener('mouseenter', () => {
      if (!selected) {
        btn.style.borderColor = '#60a5fa';
      }
    });

    btn.addEventListener('mouseleave', () => {
      if (!selected) {
        btn.style.borderColor = '#4b5563';
      }
    });

    return btn;
  }

  private selectFont(font: string): void {
    this.selectedFont = font;

    // Update button styles
    const buttons = this.overlayContainer?.querySelectorAll('[data-font]');
    buttons?.forEach((btn) => {
      const isSelected = (btn as HTMLElement).dataset.font === font;
      (btn as HTMLElement).style.border = isSelected ? '3px solid #3b82f6' : '2px solid #4b5563';
    });

    // Update canvas text font
    if (this.signEditor) {
      this.signEditor.setFont(font);
    }
  }

  // ============================================================
  // COLOR PICKER
  // ============================================================

  private createColorPicker(): HTMLElement {
    const section = document.createElement('div');
    section.style.marginBottom = '24px';
    section.style.width = '100%';
    section.style.maxWidth = '600px';

    const label = document.createElement('div');
    label.textContent = 'COLOR';
    label.style.color = '#1a1a1a';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';
    label.style.letterSpacing = '2px';
    label.style.marginBottom = '8px';
    label.style.textAlign = 'center';
    section.appendChild(label);

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '12px';
    row.style.justifyContent = 'center';
    row.style.flexWrap = 'wrap';

    SIGN_COLORS.forEach((color, index) => {
      const btn = this.createColorButton(color, index === 0);
      row.appendChild(btn);
    });

    section.appendChild(row);
    return section;
  }

  private createColorButton(color: string, selected: boolean): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.width = '48px';
    btn.style.height = '48px';
    btn.style.borderRadius = '50%';
    btn.style.backgroundColor = color;
    btn.style.border = selected ? '4px solid #3b82f6' : '3px solid #4b5563';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.2s';
    btn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
    btn.dataset.color = color;

    btn.addEventListener('click', () => this.selectColor(color));

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });

    return btn;
  }

  private selectColor(color: string): void {
    this.selectedColor = color;

    // Update button styles
    const buttons = this.overlayContainer?.querySelectorAll('[data-color]');
    buttons?.forEach((btn) => {
      const isSelected = (btn as HTMLElement).dataset.color === color;
      (btn as HTMLElement).style.border = isSelected ? '4px solid #3b82f6' : '3px solid #4b5563';
    });

    // Update canvas text color
    if (this.signEditor) {
      this.signEditor.setTextColor(color);
    }
  }

  // ============================================================
  // DECORATION PICKER
  // ============================================================

  private createDecorationPicker(): HTMLElement {
    const section = document.createElement('div');
    section.style.marginBottom = '24px';
    section.style.width = '100%';
    section.style.maxWidth = '600px';

    const label = document.createElement('div');
    label.textContent = 'DECORATIONS';
    label.style.color = '#1a1a1a';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';
    label.style.letterSpacing = '2px';
    label.style.marginBottom = '8px';
    label.style.textAlign = 'center';
    section.appendChild(label);

    // Main tabs: Stickers | Tape
    const tabRow = document.createElement('div');
    tabRow.style.display = 'flex';
    tabRow.style.gap = '4px';
    tabRow.style.justifyContent = 'center';
    tabRow.style.marginBottom = '12px';

    const tabs = [
      { id: 'stickers' as const, label: 'Stickers' },
      { id: 'tape' as const, label: 'Tape' },
    ];

    tabs.forEach((tab, index) => {
      const tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      tabBtn.textContent = tab.label;
      tabBtn.style.padding = '8px 20px';
      tabBtn.style.fontSize = '14px';
      tabBtn.style.fontWeight = 'bold';
      tabBtn.style.border = 'none';
      tabBtn.style.borderBottom = index === 0 ? '3px solid #3b82f6' : '2px solid transparent';
      tabBtn.style.backgroundColor = 'transparent';
      tabBtn.style.color = index === 0 ? '#3b82f6' : '#9ca3af';
      tabBtn.style.cursor = 'pointer';
      tabBtn.style.transition = 'all 0.2s';
      tabBtn.dataset.mainTab = tab.id;

      tabBtn.addEventListener('click', () => this.selectDecorationTab(tab.id));
      tabRow.appendChild(tabBtn);
    });

    section.appendChild(tabRow);

    // Emoji sub-category pills (only visible when Stickers tab active)
    const emojiCatRow = document.createElement('div');
    emojiCatRow.id = 'emoji-category-row';
    emojiCatRow.style.display = 'flex';
    emojiCatRow.style.gap = '6px';
    emojiCatRow.style.justifyContent = 'center';
    emojiCatRow.style.flexWrap = 'wrap';
    emojiCatRow.style.marginBottom = '10px';

    EMOJI_CATEGORIES.forEach((cat, index) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.textContent = cat.label;
      pill.style.padding = '4px 12px';
      pill.style.fontSize = '12px';
      pill.style.fontWeight = 'bold';
      pill.style.border = 'none';
      pill.style.borderRadius = '12px';
      pill.style.backgroundColor = index === 0 ? '#3b82f6' : '#374151';
      pill.style.color = index === 0 ? '#ffffff' : '#9ca3af';
      pill.style.cursor = 'pointer';
      pill.style.transition = 'all 0.2s';
      pill.dataset.emojiCat = cat.id;

      pill.addEventListener('click', () => this.selectEmojiCategory(cat.id));
      emojiCatRow.appendChild(pill);
    });

    section.appendChild(emojiCatRow);

    // Decoration grid container
    const gridContainer = document.createElement('div');
    gridContainer.id = 'decoration-grid';
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = 'repeat(auto-fill, 44px)';
    gridContainer.style.gap = '4px';
    gridContainer.style.justifyContent = 'center';
    gridContainer.style.maxHeight = '160px';
    gridContainer.style.overflowY = 'auto';
    gridContainer.style.padding = '8px';
    gridContainer.style.backgroundColor = '#1e1e3a';
    gridContainer.style.borderRadius = '8px';
    gridContainer.style.border = '1px solid #374151';
    section.appendChild(gridContainer);

    // Remove Selected button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove Selected';
    removeBtn.style.marginTop = '12px';
    removeBtn.style.padding = '8px 16px';
    removeBtn.style.fontSize = '14px';
    removeBtn.style.fontWeight = 'bold';
    removeBtn.style.color = '#ffffff';
    removeBtn.style.backgroundColor = '#ef4444';
    removeBtn.style.border = '2px solid #dc2626';
    removeBtn.style.borderRadius = '8px';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.opacity = '0.5';
    removeBtn.style.transition = 'all 0.2s';
    removeBtn.disabled = true;

    removeBtn.addEventListener('click', () => {
      if (this.signEditor) {
        this.signEditor.removeSelected();
      }
    });

    // Enable/disable based on canvas selection
    if (this.signEditor) {
      this.signEditor.canvas.on('selection:created', () => {
        const activeObj = this.signEditor!.canvas.getActiveObject();
        const objData = (activeObj as any)?.data;
        const isDecoration = objData && (objData.decorationId || objData.isEmoji);
        removeBtn.disabled = !isDecoration;
        removeBtn.style.opacity = isDecoration ? '1' : '0.5';
        removeBtn.style.cursor = isDecoration ? 'pointer' : 'not-allowed';
      });

      this.signEditor.canvas.on('selection:updated', () => {
        const activeObj = this.signEditor!.canvas.getActiveObject();
        const objData = (activeObj as any)?.data;
        const isDecoration = objData && (objData.decorationId || objData.isEmoji);
        removeBtn.disabled = !isDecoration;
        removeBtn.style.opacity = isDecoration ? '1' : '0.5';
        removeBtn.style.cursor = isDecoration ? 'pointer' : 'not-allowed';
      });

      this.signEditor.canvas.on('selection:cleared', () => {
        removeBtn.disabled = true;
        removeBtn.style.opacity = '0.5';
        removeBtn.style.cursor = 'not-allowed';
      });
    }

    this.removeButton = removeBtn;
    section.appendChild(removeBtn);

    // Populate initial content
    this.updateDecorationGrid();

    return section;
  }

  private selectDecorationTab(tabId: 'stickers' | 'tape'): void {
    this.selectedDecorationTab = tabId;

    // Update main tab styles
    const mainTabs = this.overlayContainer?.querySelectorAll('[data-main-tab]');
    mainTabs?.forEach((tab) => {
      const isSelected = (tab as HTMLElement).dataset.mainTab === tabId;
      (tab as HTMLElement).style.borderBottom = isSelected ? '3px solid #3b82f6' : '2px solid transparent';
      (tab as HTMLElement).style.color = isSelected ? '#3b82f6' : '#9ca3af';
    });

    // Show/hide emoji category pills
    const emojiCatRow = this.overlayContainer?.querySelector('#emoji-category-row') as HTMLElement;
    if (emojiCatRow) {
      emojiCatRow.style.display = tabId === 'stickers' ? 'flex' : 'none';
    }

    this.updateDecorationGrid();
  }

  private selectEmojiCategory(categoryId: string): void {
    this.selectedEmojiCategory = categoryId;

    // Update pill styles
    const pills = this.overlayContainer?.querySelectorAll('[data-emoji-cat]');
    pills?.forEach((pill) => {
      const isSelected = (pill as HTMLElement).dataset.emojiCat === categoryId;
      (pill as HTMLElement).style.backgroundColor = isSelected ? '#3b82f6' : '#374151';
      (pill as HTMLElement).style.color = isSelected ? '#ffffff' : '#9ca3af';
    });

    this.updateDecorationGrid();
  }

  private updateDecorationGrid(): void {
    const gridContainer = this.overlayContainer?.querySelector('#decoration-grid') as HTMLElement;
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    if (this.selectedDecorationTab === 'stickers') {
      // Emoji picker grid
      const category = EMOJI_CATEGORIES.find((c) => c.id === this.selectedEmojiCategory);
      if (!category) return;

      // Use grid layout for emojis
      gridContainer.style.gridTemplateColumns = 'repeat(auto-fill, 44px)';

      category.emojis.forEach((emojiDef) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = emojiDef.emoji;
        btn.style.width = '44px';
        btn.style.height = '44px';
        btn.style.border = '1px solid transparent';
        btn.style.borderRadius = '8px';
        btn.style.backgroundColor = 'transparent';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '28px';
        btn.style.lineHeight = '1';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.transition = 'all 0.15s';
        btn.style.padding = '0';
        btn.title = emojiDef.label;

        btn.addEventListener('click', () => {
          if (this.signEditor) {
            this.signEditor.addEmoji(emojiDef);
          }
        });

        btn.addEventListener('mouseenter', () => {
          btn.style.backgroundColor = '#374151';
          btn.style.borderColor = '#3b82f6';
          btn.style.transform = 'scale(1.15)';
        });

        btn.addEventListener('mouseleave', () => {
          btn.style.backgroundColor = 'transparent';
          btn.style.borderColor = 'transparent';
          btn.style.transform = 'scale(1)';
        });

        gridContainer.appendChild(btn);
      });
    } else {
      // Tape decorations (SVG-based)
      gridContainer.style.gridTemplateColumns = 'repeat(auto-fill, 100px)';

      const tapeDecorations = getDecorationsByCategory('tape');
      tapeDecorations.forEach((decoration) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.width = '100px';
        btn.style.height = '44px';
        btn.style.border = '2px solid #4b5563';
        btn.style.borderRadius = '8px';
        btn.style.backgroundColor = '#f5f0e8';
        btn.style.cursor = 'pointer';
        btn.style.padding = '4px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.transition = 'all 0.2s';
        btn.title = decoration.label;

        const svg = document.createElement('div');
        svg.innerHTML = decoration.svgString;
        svg.style.width = '90px';
        svg.style.height = '24px';
        svg.style.pointerEvents = 'none';
        btn.appendChild(svg);

        btn.addEventListener('click', () => {
          if (this.signEditor) {
            this.signEditor.addDecoration(decoration);
          }
        });

        btn.addEventListener('mouseenter', () => {
          btn.style.borderColor = '#3b82f6';
          btn.style.transform = 'scale(1.05)';
        });

        btn.addEventListener('mouseleave', () => {
          btn.style.borderColor = '#4b5563';
          btn.style.transform = 'scale(1)';
        });

        gridContainer.appendChild(btn);
      });
    }
  }

  // ============================================================
  // START BUTTON
  // ============================================================

  private createStartButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'START PROTESTING';
    btn.style.width = '100%';
    btn.style.maxWidth = '400px';
    btn.style.padding = '18px 32px';
    btn.style.fontSize = '26px';
    btn.style.fontWeight = 'normal';
    btn.style.color = '#f5f0e8';
    btn.style.backgroundColor = '#ef4444';
    btn.style.border = '4px solid #1a1a1a';
    btn.style.borderRadius = '0';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'transform 0.1s, box-shadow 0.1s';
    btn.style.fontFamily = "'Bangers', cursive";
    btn.style.marginTop = '8px';
    btn.style.letterSpacing = '4px';
    btn.style.boxShadow = '6px 6px 0 #1a1a1a';
    btn.style.transform = 'rotate(0.5deg)';

    btn.addEventListener('click', () => this.launchGame());

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translate(3px, 3px) rotate(0.5deg)';
      btn.style.boxShadow = '3px 3px 0 #1a1a1a';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'rotate(0.5deg)';
      btn.style.boxShadow = '6px 6px 0 #1a1a1a';
    });

    return btn;
  }

  // ============================================================
  // EXPORT & TRANSITION
  // ============================================================

  private launchGame(): void {
    if (!this.signEditor) {
      console.error('[SignCraftScene] SignEditor not initialized');
      return;
    }

    // Export Fabric.js canvas to PNG data URL
    const signImageDataUrl = this.signEditor.exportToPNG();

    // Build sign data
    const message = this.signMessage.trim() || 'HONK!';
    let qualityScore = scoreMessageQuality(message);

    // Add effort bonus from customizations
    const defaultFont = SIGN_FONTS[0];
    const defaultColor = SIGN_COLORS[0];
    const defaultMaterial = SIGN_MATERIALS[0];

    if (this.selectedFont !== defaultFont) {
      qualityScore += 0.05;
    }
    if (this.selectedColor !== defaultColor) {
      qualityScore += 0.05;
    }
    if (this.signEditor.getDecorations().length > 0) {
      qualityScore += 0.05;
    }
    if (this.selectedMaterial.id !== defaultMaterial.id) {
      qualityScore += 0.05;
    }

    // Cap combined quality at 1.0
    qualityScore = Math.min(qualityScore, 1.0);

    const signData: SignData = {
      material: this.selectedMaterial,
      message,
      qualityScore,
      fontFamily: this.selectedFont,
      textColor: this.selectedColor,
      decorations: this.signEditor.getDecorations(),
      signImageDataUrl,
    };

    // Store in Phaser registry
    setSignData(this, signData);

    console.log('[SignCraftScene] Sign exported:', {
      message,
      material: this.selectedMaterial.id,
      font: this.selectedFont,
      color: this.selectedColor,
      decorationCount: this.signEditor.getDecorations().length,
      qualityScore,
      dataUrlLength: signImageDataUrl.length,
    });

    // Clean up overlay
    this.cleanupOverlay();

    // Transition to gameplay
    this.scene.start('IntersectionScene');
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  private cleanupOverlay(): void {
    if (this.signEditor) {
      this.signEditor.destroy();
      this.signEditor = null;
    }

    if (this.overlayContainer) {
      this.overlayContainer.remove();
      this.overlayContainer = null;
    }

    this.textInput = null;
  }
}
