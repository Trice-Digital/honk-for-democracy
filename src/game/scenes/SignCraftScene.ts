import Phaser from 'phaser';
import {
  SIGN_MATERIALS,
  SIGN_FONTS,
  SIGN_COLORS,
  PRESET_MESSAGES,
  getMaterialGroups,
  type SignMaterial,
  type SignData,
  setSignData,
  scoreMessageQuality,
} from '../config/signConfig';
import { SignEditor } from '../../lib/signEditor';
import { EMOJI_CATEGORIES, type EmojiDef } from '../../lib/signDecorations';

/**
 * SignCraftScene — Phase 13 UX Redesign
 *
 * Responsive two-column layout with tabbed controls (Material/Message/Decorate).
 * Sticky sign preview, randomize feature, neobrutalist Paper Mario styling.
 *
 * Architecture:
 * - Fabric.js lives in DOM overlay OVER the Phaser canvas
 * - Injected CSS for all styling (no inline styles except dynamic values)
 * - Bridge: PNG data URL stored in SignData via Phaser registry
 */
export class SignCraftScene extends Phaser.Scene {
  // DOM elements
  private overlayContainer: HTMLDivElement | null = null;
  private signEditor: SignEditor | null = null;
  private textInput: HTMLTextAreaElement | null = null;
  private styleElement: HTMLStyleElement | null = null;

  // State
  private selectedMaterial: SignMaterial = SIGN_MATERIALS[0];
  private selectedFont: string = SIGN_FONTS[0];
  private selectedColor: string = SIGN_COLORS[0];
  private signMessage: string = '';
  private activeTab: 'material' | 'message' | 'decorate' = 'material';
  private selectedEmojiCategory: string = 'protest';
  private placedStickers: Array<{ obj: any; emoji: string }> = [];

  constructor() {
    super({ key: 'SignCraftScene' });
  }

  create(): void {
    // Set Phaser background (hidden by overlay)
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Mount DOM overlay with Fabric.js editor
    this.mountFabricOverlay();

    console.log('[HFD] SignCraftScene created. Phase 13 redesign active.');
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

    // Inject CSS
    this.injectStyles();

    // Create full-screen overlay container
    const container = document.createElement('div');
    container.id = 'sign-editor-overlay';
    container.className = 'craft-overlay';

    // Main layout container
    const craftLayout = document.createElement('div');
    craftLayout.className = 'craft-layout';

    // ===== SIGN AREA (left/top) =====
    const signArea = document.createElement('div');
    signArea.className = 'sign-area';

    // Sign canvas container
    const signCanvas = document.createElement('div');
    signCanvas.className = 'sign-canvas paper-cut';
    signCanvas.id = 'sign-canvas-container';
    signArea.appendChild(signCanvas);

    // Create SignEditor instance (Fabric.js canvas)
    // Desktop: max 520px, Mobile: max 320px (matching mockup breakpoints)
    const isMobile = window.innerWidth < 768;
    const maxWidth = isMobile ? 320 : 520;
    const editorWidth = Math.min(maxWidth, window.innerWidth - 40);
    const editorHeight = Math.floor(editorWidth * 0.75); // 4:3 aspect ratio

    this.signEditor = new SignEditor({
      container: signCanvas,
      width: editorWidth,
      height: editorHeight,
    });

    // Set initial material and ghost text
    this.signEditor.setMaterialById(this.selectedMaterial.id);
    this.signEditor.setText('HONK FOR DEMOCRACY');
    // Set ghost text opacity and deselect so handles aren't visible
    if (this.signEditor.canvas) {
      const textObj = this.signEditor.canvas.getObjects().find((o: any) => o.data?.isTextObject);
      if (textObj) {
        textObj.set('opacity', 0.3);
      }
      this.signEditor.canvas.discardActiveObject();
      this.signEditor.canvas.renderAll();
    }

    // Buttons under sign
    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.gap = '0.5rem';
    buttonRow.style.alignItems = 'center';
    buttonRow.style.flexWrap = 'wrap';
    buttonRow.style.justifyContent = 'center';

    const randomizeBtn = document.createElement('button');
    randomizeBtn.className = 'randomize-btn';
    randomizeBtn.innerHTML = '<span class="dice">🎲</span> RANDOMIZE!';
    randomizeBtn.addEventListener('click', () => {
      // Visual feedback
      randomizeBtn.disabled = true;
      setTimeout(() => {
        randomizeBtn.disabled = false;
      }, 300);
      this.randomizeSign();
    });
    buttonRow.appendChild(randomizeBtn);

    const ctaBtn = document.createElement('button');
    ctaBtn.className = 'cta-btn';
    ctaBtn.innerHTML = '🪧 START PROTESTING!';
    ctaBtn.addEventListener('click', () => this.launchGame());
    buttonRow.appendChild(ctaBtn);

    signArea.appendChild(buttonRow);

    // Orientation hint
    const orientHint = document.createElement('div');
    orientHint.className = 'orient-hint';
    orientHint.innerHTML = `
      <p>🎲 <strong>Randomize</strong> for instant inspiration — or customize below</p>
      <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 0.2rem;">Pick your material, write your message, add stickers. Then hit the streets!</p>
    `;
    signArea.appendChild(orientHint);

    craftLayout.appendChild(signArea);

    // ===== CONTROLS AREA (right/bottom) =====
    const controlsArea = document.createElement('div');
    controlsArea.className = 'controls-area';

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';

    const tabs = [
      { id: 'material' as const, label: 'MATERIAL', num: '1' },
      { id: 'message' as const, label: 'MESSAGE', num: '2' },
      { id: 'decorate' as const, label: 'DECORATE', num: '3' },
    ];

    tabs.forEach((tab) => {
      const btn = document.createElement('button');
      btn.className = tab.id === 'material' ? 'tab-btn active' : 'tab-btn';
      btn.dataset.tab = tab.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', tab.id === 'material' ? 'true' : 'false');
      btn.setAttribute('aria-label', `${tab.label} tab`);
      btn.innerHTML = `<span class="tab-num">${tab.num}</span> ${tab.label}`;
      btn.addEventListener('click', () => this.switchTab(tab.id));
      tabBar.appendChild(btn);
    });

    controlsArea.appendChild(tabBar);

    // Tab content containers
    const tabMaterial = this.createMaterialTab();
    const tabMessage = this.createMessageTab();
    const tabDecorate = this.createDecorateTab();

    controlsArea.appendChild(tabMaterial);
    controlsArea.appendChild(tabMessage);
    controlsArea.appendChild(tabDecorate);

    craftLayout.appendChild(controlsArea);
    container.appendChild(craftLayout);

    // Append to parent
    parent.appendChild(container);
    this.overlayContainer = container;

    // Update placed stickers list after canvas is ready
    this.updatePlacedList();
  }

  // ============================================================
  // CSS INJECTION
  // ============================================================

  private injectStyles(): void {
    const style = document.createElement('style');
    style.id = 'sign-craft-styles';
    style.textContent = `
      /* Reset for overlay */
      #sign-editor-overlay * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

      /* Root variables */
      #sign-editor-overlay {
        --black: #1a1a1a;
        --yellow: #fbbf24;
        --kraft: #c5a059;
        --kraft-light: #d4b06a;
        --kraft-dark: #a3824f;
        --text: #1a1a1a;
        --text-muted: #3a3a3a;
        --paper: rgba(245, 240, 232, 0.75);
      }

      /* Overlay container */
      .craft-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        font-family: 'Patrick Hand', cursive, system-ui, sans-serif;
        color: var(--text);
        background: var(--kraft);
        background-image:
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)' opacity='0.12'/%3E%3C/svg%3E"),
          linear-gradient(135deg, #b8956a 0%, #a3824f 30%, #c5a059 60%, #b8956a 100%);
        background-size: 300px 300px, 100% 100%;
        overflow-x: hidden;
        overflow-y: auto;
      }

      /* Main layout */
      .craft-layout {
        max-width: 1100px;
        margin: 0 auto;
        padding: 1rem;
        padding-bottom: 2rem;
      }

      @media (min-width: 768px) {
        .craft-layout {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 24px;
          align-items: start;
          padding: 1.5rem 2rem;
          padding-bottom: 2rem;
        }
      }

      /* Sign area */
      .sign-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      @media (max-width: 767px) {
        .sign-area {
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--kraft);
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)' opacity='0.12'/%3E%3C/svg%3E"),
            linear-gradient(135deg, #b8956a 0%, #a3824f 30%, #c5a059 60%, #b8956a 100%);
          background-size: 300px 300px, 100% 100%;
          padding: 0.75rem 0 0.5rem;
          margin: 0 -1rem;
          padding-left: 1rem;
          padding-right: 1rem;
          border-bottom: 3px solid var(--black);
        }
      }

      @media (min-width: 768px) {
        .sign-area {
          position: sticky;
          top: 1.5rem;
        }
      }

      /* Sign canvas */
      .sign-canvas {
        border-radius: 4px;
        position: relative;
        overflow: hidden;
        transform: rotate(-1.5deg);
      }

      /* Neobrutalist primitives */
      .paper-cut {
        border: 3px solid var(--black);
        box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4);
        border-radius: 4px;
      }

      .paper-cut-sm {
        border: 2px solid var(--black);
        box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.35);
        border-radius: 4px;
      }

      .tape-strip {
        background: var(--paper);
        border: 1px solid rgba(26, 26, 26, 0.15);
        box-shadow: 1px 1px 0 rgba(26, 26, 26, 0.15);
        padding: 0.3rem 1rem;
      }

      /* Randomize button */
      .randomize-btn {
        font-family: 'Bangers', cursive;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1.8rem;
        font-size: 1.1rem;
        letter-spacing: 0.08em;
        color: var(--black);
        background: var(--yellow);
        border: 3px solid var(--black);
        border-radius: 4px;
        cursor: pointer;
        transition: transform 0.1s, box-shadow 0.1s;
        box-shadow: 3px 3px 0 var(--black);
      }

      .randomize-btn:hover {
        transform: translate(1px, 1px);
        box-shadow: 2px 2px 0 var(--black);
      }

      .randomize-btn:active {
        transform: translate(3px, 3px);
        box-shadow: 0 0 0 var(--black);
      }

      .randomize-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      @keyframes dice-shake {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-12deg); }
        75% { transform: rotate(12deg); }
      }

      .randomize-btn:hover .dice {
        animation: dice-shake 0.3s ease-in-out infinite;
      }

      /* CTA button */
      .cta-btn {
        font-family: 'Bangers', cursive;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        padding: 0.6rem 1.8rem;
        font-size: 1.1rem;
        letter-spacing: 0.08em;
        color: var(--black);
        background: var(--yellow);
        border: 3px solid var(--black);
        border-radius: 4px;
        cursor: pointer;
        transition: transform 0.1s, box-shadow 0.1s;
        box-shadow: 3px 3px 0 var(--black);
      }

      .cta-btn:hover {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--black);
      }

      .cta-btn:active {
        transform: translate(3px, 3px);
        box-shadow: 0 0 0 var(--black);
      }

      /* Orientation hint */
      .orient-hint {
        font-family: 'Patrick Hand', cursive;
        text-align: center;
        font-size: 0.9rem;
        color: var(--text-muted);
        line-height: 1.4;
        padding: 0.4rem 0.8rem;
      }

      /* Controls area */
      .controls-area {
        margin-top: 1rem;
      }

      @media (min-width: 768px) {
        .controls-area {
          margin-top: 0;
          max-height: calc(100vh - 3rem);
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--kraft-dark) transparent;
        }

        .controls-area::-webkit-scrollbar { width: 6px; }
        .controls-area::-webkit-scrollbar-track { background: transparent; }
        .controls-area::-webkit-scrollbar-thumb { background: var(--kraft-dark); border-radius: 3px; }
      }

      /* Tab bar */
      .tab-bar {
        display: flex;
        gap: 0.4rem;
        margin-bottom: 1rem;
        position: sticky;
        top: 0;
        z-index: 5;
        padding: 0.5rem 0;
      }

      @media (max-width: 767px) {
        .tab-bar {
          position: relative;
        }
      }

      @media (max-width: 374px) {
        .tab-bar {
          gap: 0.3rem;
        }
      }

      .tab-btn {
        font-family: 'Bangers', cursive;
        flex: 1;
        padding: 0.6rem 0.5rem;
        font-size: 1rem;
        letter-spacing: 0.1em;
        color: var(--text-muted);
        background: var(--kraft-dark);
        border: 2px solid var(--black);
        border-radius: 4px;
        cursor: pointer;
        transition: transform 0.1s, box-shadow 0.1s;
        box-shadow: 2px 2px 0 rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
      }

      .tab-btn:hover {
        background: var(--kraft-light);
      }

      .tab-btn.active {
        background: var(--yellow);
        color: var(--black);
      }

      .tab-num {
        font-size: 0.7rem;
        opacity: 0.5;
        font-family: 'Patrick Hand', cursive;
      }

      @media (max-width: 374px) {
        .tab-btn {
          font-size: 0.9rem;
          padding: 0.5rem 0.4rem;
        }
      }

      /* Tab content */
      .tab-content {
        display: none;
      }

      .tab-content.active {
        display: block;
      }

      /* Panel */
      .panel {
        background: rgba(163, 130, 79, 0.5);
        border: 3px solid var(--black);
        border-radius: 4px;
        box-shadow: 4px 4px 0 rgba(0,0,0,0.4);
        padding: 1.2rem;
        margin-bottom: 1rem;
      }

      .panel-title {
        font-family: 'Bangers', cursive;
        font-size: 1.15rem;
        letter-spacing: 0.12em;
        color: var(--black);
        margin-bottom: 0.8rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }

      .panel-title .tape-label {
        display: inline-block;
        transform: rotate(-1deg);
      }

      .section-label {
        font-family: 'Patrick Hand', cursive;
        font-size: 1rem;
        color: var(--text-muted);
        font-weight: bold;
        margin-bottom: 0.4rem;
        margin-top: 0.8rem;
      }

      .section-label:first-of-type {
        margin-top: 0;
      }

      /* Material swatches */
      .swatch-row {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
        margin-bottom: 0.5rem;
      }

      .swatch {
        width: 52px;
        height: 52px;
        border: 2px solid var(--black);
        border-radius: 4px;
        box-shadow: 2px 2px 0 rgba(0,0,0,0.35);
        cursor: pointer;
        transition: transform 0.1s;
        position: relative;
      }

      .swatch:hover {
        transform: scale(1.08);
      }

      .swatch.selected {
        outline: 3px solid var(--yellow);
        outline-offset: 2px;
      }

      .swatch.selected::after {
        content: '✓';
        position: absolute;
        bottom: 1px;
        right: 3px;
        font-size: 0.7rem;
        color: var(--black);
        font-weight: bold;
      }

      .swatch:focus-visible,
      .color-dot:focus-visible,
      .font-card:focus-visible {
        outline: 2px solid var(--yellow);
        outline-offset: 2px;
      }

      /* Text input */
      .text-input {
        font-family: 'Patrick Hand', cursive;
        width: 100%;
        padding: 0.7rem;
        font-size: 1.1rem;
        color: var(--text);
        background: var(--paper);
        border: 2px solid var(--black);
        border-radius: 4px;
        box-shadow: 2px 2px 0 rgba(0,0,0,0.35);
        resize: none;
      }

      .text-input:focus {
        outline: 2px solid var(--yellow);
        outline-offset: 1px;
      }

      .text-input::placeholder {
        color: #999;
      }

      .char-count {
        font-family: 'Patrick Hand', cursive;
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: var(--text-muted);
        margin-top: 0.3rem;
      }

      /* Color dots */
      .color-row {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .color-dot {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 2px solid var(--black);
        cursor: pointer;
        transition: transform 0.1s;
        box-shadow: 1px 1px 0 rgba(0,0,0,0.3);
      }

      .color-dot:hover {
        transform: scale(1.15);
      }

      .color-dot.selected {
        outline: 3px solid var(--yellow);
        outline-offset: 2px;
      }

      /* Font cards */
      .font-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }

      .font-card {
        padding: 0.6rem 0.5rem;
        text-align: center;
        background: var(--paper);
        border: 2px solid var(--black);
        border-radius: 4px;
        box-shadow: 2px 2px 0 rgba(0,0,0,0.35);
        cursor: pointer;
        transition: transform 0.1s, box-shadow 0.1s;
        line-height: 1.2;
      }

      .font-card:hover {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 rgba(0,0,0,0.35);
      }

      .font-card.selected {
        background: var(--yellow);
      }

      .font-card .font-name {
        font-family: 'Patrick Hand', cursive;
        font-size: 0.7rem;
        color: var(--text-muted);
        margin-top: 0.2rem;
      }

      /* Font preview text */
      .fp-bangers { font-family: 'Bangers', cursive; font-size: 1.3rem; }
      .fp-marker { font-family: 'Permanent Marker', cursive; font-size: 1.1rem; }
      .fp-bungee { font-family: 'Bungee', cursive; font-size: 0.95rem; }
      .fp-caveat { font-family: 'Caveat', cursive; font-size: 1.3rem; font-weight: 700; }
      .fp-fredoka { font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; }
      .fp-protest { font-family: 'Protest Guerrilla', cursive; font-size: 1.1rem; }
      .fp-rubik { font-family: 'Rubik Mono One', monospace; font-size: 0.75rem; }
      .fp-shrikhand { font-family: 'Shrikhand', serif; font-size: 1.05rem; }

      /* Sticker section */
      .pill-row {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        margin-bottom: 0.8rem;
      }

      .pill {
        font-family: 'Bangers', cursive;
        font-size: 0.8rem;
        letter-spacing: 0.08em;
        padding: 0.25rem 0.8rem;
        border: 2px solid var(--black);
        border-radius: 999px;
        cursor: pointer;
        background: var(--kraft-dark);
        color: var(--text-muted);
        box-shadow: 1px 1px 0 rgba(0,0,0,0.3);
        transition: transform 0.1s;
      }

      .pill:hover {
        transform: scale(1.05);
      }

      .pill.active {
        background: var(--yellow);
        color: var(--black);
      }

      .sticker-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 0.5rem;
        text-align: center;
      }

      .sticker-item {
        font-size: 1.8rem;
        cursor: pointer;
        transition: transform 0.1s;
        user-select: none;
        padding: 0.2rem;
        border-radius: 4px;
      }

      .sticker-item:hover {
        background: rgba(251, 191, 36, 0.3);
      }

      .sticker-item:active {
        transform: scale(1.3);
      }

      .placed-list {
        margin-top: 0.8rem;
        padding-top: 0.6rem;
        border-top: 2px dashed var(--kraft-dark);
      }

      .placed-tag {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        background: var(--paper);
        border: 2px solid var(--black);
        border-radius: 4px;
        padding: 0.2rem 0.5rem;
        margin: 0.2rem;
        font-size: 0.9rem;
        box-shadow: 1px 1px 0 rgba(0,0,0,0.25);
      }

      .placed-tag button {
        background: none;
        border: none;
        color: #dc2626;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: bold;
        padding: 0 0.15rem;
        font-family: 'Patrick Hand', cursive;
      }

      .placed-tag button:hover {
        color: #b91c1c;
      }

      .hint {
        font-family: 'Patrick Hand', cursive;
        font-size: 0.85rem;
        color: var(--text-muted);
        text-align: center;
        margin-top: 0.5rem;
        font-style: italic;
      }
    `;

    document.head.appendChild(style);
    this.styleElement = style;
  }

  // ============================================================
  // TAB CREATION
  // ============================================================

  private createMaterialTab(): HTMLElement {
    const tab = document.createElement('div');
    tab.id = 'tab-material';
    tab.className = 'tab-content active';

    const panel = document.createElement('div');
    panel.className = 'panel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<span class="tape-strip tape-label">📦 PICK YOUR MATERIAL</span>';
    panel.appendChild(title);

    const groups = getMaterialGroups();
    groups.forEach((group) => {
      const label = document.createElement('div');
      label.className = 'section-label';
      label.textContent = `${group.emoji} ${group.label}`;
      panel.appendChild(label);

      const row = document.createElement('div');
      row.className = 'swatch-row';

      group.materials.forEach((material, index) => {
        const swatch = document.createElement('div');
        swatch.className = material.id === this.selectedMaterial.id ? 'swatch selected' : 'swatch';
        swatch.dataset.materialId = material.id;
        swatch.title = material.label;
        swatch.setAttribute('role', 'button');
        swatch.setAttribute('aria-label', `Material: ${material.label}`);
        swatch.setAttribute('tabindex', '0');

        // Set background (handle gradients)
        if (material.baseColor.startsWith('linear-gradient')) {
          swatch.style.background = material.baseColor;
        } else {
          swatch.style.backgroundColor = material.baseColor;
        }

        swatch.addEventListener('click', () => this.selectMaterial(material));
        // Keyboard accessibility
        swatch.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.selectMaterial(material);
          }
        });
        row.appendChild(swatch);
      });

      panel.appendChild(row);
    });

    tab.appendChild(panel);
    return tab;
  }

  private createMessageTab(): HTMLElement {
    const tab = document.createElement('div');
    tab.id = 'tab-message';
    tab.className = 'tab-content';

    // Text input panel
    const textPanel = document.createElement('div');
    textPanel.className = 'panel';

    const textTitle = document.createElement('div');
    textTitle.className = 'panel-title';
    textTitle.innerHTML = '<span class="tape-strip tape-label">✏️ YOUR MESSAGE</span>';
    textPanel.appendChild(textTitle);

    const textarea = document.createElement('textarea');
    textarea.className = 'text-input';
    textarea.rows = 2;
    textarea.maxLength = 60;
    textarea.placeholder = 'HONK FOR DEMOCRACY';
    textarea.addEventListener('input', () => this.onTextInput());
    textPanel.appendChild(textarea);

    const charCount = document.createElement('div');
    charCount.className = 'char-count';
    charCount.innerHTML = '<span>Tap to edit</span><span><span id="char-count">0</span>/60</span>';
    textPanel.appendChild(charCount);

    this.textInput = textarea;
    tab.appendChild(textPanel);

    // Color panel
    const colorPanel = document.createElement('div');
    colorPanel.className = 'panel';

    const colorTitle = document.createElement('div');
    colorTitle.className = 'panel-title';
    colorTitle.innerHTML = '<span class="tape-strip tape-label">🎨 TEXT COLOR</span>';
    colorPanel.appendChild(colorTitle);

    const colorRow = document.createElement('div');
    colorRow.className = 'color-row';

    const colorNames: Record<string, string> = {
      '#1a1a1a': 'Black',
      '#DC143C': 'Crimson Red',
      '#1E90FF': 'Dodger Blue',
      '#FFFFFF': 'White',
      '#228B22': 'Forest Green',
      '#8B008B': 'Dark Magenta',
      '#FFD700': 'Gold',
      '#fbbf24': 'Yellow',
      '#FF8C00': 'Dark Orange',
      '#FF1493': 'Hot Pink',
    };

    SIGN_COLORS.forEach((color, index) => {
      const dot = document.createElement('div');
      dot.className = index === 0 ? 'color-dot selected' : 'color-dot';
      dot.style.backgroundColor = color;
      dot.dataset.color = color;
      dot.title = colorNames[color] || color;
      dot.setAttribute('role', 'button');
      dot.setAttribute('aria-label', `Text color: ${colorNames[color] || color}`);
      dot.setAttribute('tabindex', '0');
      dot.addEventListener('click', () => this.selectColor(color));
      // Keyboard accessibility
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectColor(color);
        }
      });
      colorRow.appendChild(dot);
    });

    colorPanel.appendChild(colorRow);
    tab.appendChild(colorPanel);

    // Font panel
    const fontPanel = document.createElement('div');
    fontPanel.className = 'panel';

    const fontTitle = document.createElement('div');
    fontTitle.className = 'panel-title';
    fontTitle.innerHTML = '<span class="tape-strip tape-label">🔤 FONT</span>';
    fontPanel.appendChild(fontTitle);

    const fontGrid = document.createElement('div');
    fontGrid.className = 'font-grid';

    const fontClassMap: Record<string, string> = {
      'Bangers': 'fp-bangers',
      'Permanent Marker': 'fp-marker',
      'Bungee': 'fp-bungee',
      'Caveat': 'fp-caveat',
      'Fredoka': 'fp-fredoka',
      'Protest Guerrilla': 'fp-protest',
      'Rubik Mono One': 'fp-rubik',
      'Shrikhand': 'fp-shrikhand',
    };

    const fontLabelMap: Record<string, string> = {
      'Bangers': 'Bangers',
      'Permanent Marker': 'Marker',
      'Bungee': 'Bungee',
      'Caveat': 'Caveat',
      'Fredoka': 'Fredoka',
      'Protest Guerrilla': 'Protest',
      'Rubik Mono One': 'Rubik Mono',
      'Shrikhand': 'Shrikhand',
    };

    SIGN_FONTS.forEach((font, index) => {
      const card = document.createElement('div');
      card.className = index === 0 ? 'font-card selected' : 'font-card';
      card.dataset.font = font;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Font: ${fontLabelMap[font] || font}`);
      card.setAttribute('tabindex', '0');

      const preview = document.createElement('div');
      preview.className = fontClassMap[font] || '';
      preview.textContent = 'HONK!';
      card.appendChild(preview);

      const name = document.createElement('div');
      name.className = 'font-name';
      name.textContent = fontLabelMap[font] || font;
      card.appendChild(name);

      card.addEventListener('click', () => this.selectFont(font));
      // Keyboard accessibility
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectFont(font);
        }
      });
      fontGrid.appendChild(card);
    });

    fontPanel.appendChild(fontGrid);
    tab.appendChild(fontPanel);

    return tab;
  }

  private createDecorateTab(): HTMLElement {
    const tab = document.createElement('div');
    tab.id = 'tab-decorate';
    tab.className = 'tab-content';

    const panel = document.createElement('div');
    panel.className = 'panel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<span class="tape-strip tape-label">⭐ STICKERS</span>';
    panel.appendChild(title);

    // Category pills
    const pillRow = document.createElement('div');
    pillRow.className = 'pill-row';

    EMOJI_CATEGORIES.forEach((cat, index) => {
      const pill = document.createElement('button');
      pill.className = index === 0 ? 'pill active' : 'pill';
      pill.textContent = cat.label;
      pill.dataset.category = cat.id;
      pill.addEventListener('click', () => this.selectEmojiCategory(cat.id));
      pillRow.appendChild(pill);
    });

    panel.appendChild(pillRow);

    // Sticker grid
    const grid = document.createElement('div');
    grid.className = 'sticker-grid';
    grid.id = 'sticker-grid';
    panel.appendChild(grid);

    // Populate grid with initial category (Protest) directly since overlayContainer isn't set yet
    const initialCategory = EMOJI_CATEGORIES.find((c) => c.id === this.selectedEmojiCategory);
    if (initialCategory) {
      initialCategory.emojis.forEach((emojiDef) => {
        const item = document.createElement('div');
        item.className = 'sticker-item';
        item.textContent = emojiDef.emoji;
        item.title = emojiDef.label;
        item.addEventListener('click', () => this.addSticker(emojiDef));
        grid.appendChild(item);
      });
    }

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Tap a sticker to place it on your sign';
    panel.appendChild(hint);

    // Placed list
    const placedList = document.createElement('div');
    placedList.className = 'placed-list';
    placedList.id = 'placed-list';
    placedList.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem; font-weight: bold;">On your sign:</div><div id="placed-tags"></div>';
    panel.appendChild(placedList);

    tab.appendChild(panel);
    return tab;
  }

  // ============================================================
  // TAB SWITCHING
  // ============================================================

  private switchTab(tabId: 'material' | 'message' | 'decorate'): void {
    this.activeTab = tabId;

    // Update tab buttons
    const buttons = this.overlayContainer?.querySelectorAll('.tab-btn');
    buttons?.forEach((btn) => {
      const isActive = (btn as HTMLElement).dataset.tab === tabId;
      if (isActive) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    // Update tab content
    const tabs = this.overlayContainer?.querySelectorAll('.tab-content');
    tabs?.forEach((tab) => {
      if (tab.id === `tab-${tabId}`) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Auto-focus textarea when switching to Message tab (iOS-friendly)
    if (tabId === 'message' && this.textInput) {
      // Delay to ensure tab transition completes
      setTimeout(() => {
        this.textInput?.focus();
      }, 100);
    }
  }

  // ============================================================
  // MATERIAL SELECTION
  // ============================================================

  private selectMaterial(material: SignMaterial): void {
    this.selectedMaterial = material;

    // Update swatch styles
    const swatches = this.overlayContainer?.querySelectorAll('.swatch');
    swatches?.forEach((swatch) => {
      const isSelected = (swatch as HTMLElement).dataset.materialId === material.id;
      if (isSelected) {
        swatch.classList.add('selected');
      } else {
        swatch.classList.remove('selected');
      }
    });

    // Update canvas background
    if (this.signEditor) {
      this.signEditor.setMaterialById(material.id);
    }
  }

  // ============================================================
  // TEXT INPUT
  // ============================================================

  private onTextInput(): void {
    if (!this.textInput || !this.signEditor) return;

    const text = this.textInput.value;
    this.signMessage = text;

    // Update char count
    const charCountSpan = this.overlayContainer?.querySelector('#char-count');
    if (charCountSpan) {
      charCountSpan.textContent = String(text.length);
    }

    // Update sign editor
    if (text.trim()) {
      // Clear ghost state
      const textObj = this.signEditor.canvas.getObjects().find((o: any) => o.data?.isTextObject);
      if (textObj) {
        textObj.set('opacity', 1);
      }
      this.signEditor.setText(text);
    } else {
      // Restore ghost text
      const textObj = this.signEditor.canvas.getObjects().find((o: any) => o.data?.isTextObject);
      if (textObj) {
        textObj.set('opacity', 0.3);
      }
      this.signEditor.setText('HONK FOR DEMOCRACY');
    }
  }

  // ============================================================
  // COLOR SELECTION
  // ============================================================

  private selectColor(color: string): void {
    this.selectedColor = color;

    // Update dot styles
    const dots = this.overlayContainer?.querySelectorAll('.color-dot');
    dots?.forEach((dot) => {
      const isSelected = (dot as HTMLElement).dataset.color === color;
      if (isSelected) {
        dot.classList.add('selected');
      } else {
        dot.classList.remove('selected');
      }
    });

    // Update canvas text color
    if (this.signEditor) {
      this.signEditor.setTextColor(color);
    }
  }

  // ============================================================
  // FONT SELECTION
  // ============================================================

  private selectFont(font: string): void {
    this.selectedFont = font;

    // Update card styles
    const cards = this.overlayContainer?.querySelectorAll('.font-card');
    cards?.forEach((card) => {
      const isSelected = (card as HTMLElement).dataset.font === font;
      if (isSelected) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    // Update canvas text font
    if (this.signEditor) {
      this.signEditor.setFont(font);
    }
  }

  // ============================================================
  // EMOJI CATEGORY SELECTION
  // ============================================================

  private selectEmojiCategory(categoryId: string): void {
    this.selectedEmojiCategory = categoryId;

    // Update pill styles
    const pills = this.overlayContainer?.querySelectorAll('.pill');
    pills?.forEach((pill) => {
      const isActive = (pill as HTMLElement).dataset.category === categoryId;
      if (isActive) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    // Update grid
    this.updateStickerGrid();
  }

  private updateStickerGrid(): void {
    const grid = this.overlayContainer?.querySelector('#sticker-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const category = EMOJI_CATEGORIES.find((c) => c.id === this.selectedEmojiCategory);
    if (!category) return;

    category.emojis.forEach((emojiDef) => {
      const item = document.createElement('div');
      item.className = 'sticker-item';
      item.textContent = emojiDef.emoji;
      item.title = emojiDef.label;
      item.addEventListener('click', () => this.addSticker(emojiDef));
      grid.appendChild(item);
    });
  }

  private addSticker(emojiDef: EmojiDef): void {
    if (!this.signEditor) return;

    this.signEditor.addEmoji(emojiDef);

    // Track placed sticker
    const activeObj = this.signEditor.canvas.getActiveObject();
    if (activeObj) {
      this.placedStickers.push({ obj: activeObj, emoji: emojiDef.emoji });
      this.updatePlacedList();
    }
  }

  private updatePlacedList(): void {
    const tagsContainer = this.overlayContainer?.querySelector('#placed-tags');
    if (!tagsContainer) return;

    tagsContainer.innerHTML = '';

    if (this.placedStickers.length === 0) {
      tagsContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">No stickers yet</span>';
      return;
    }

    this.placedStickers.forEach((sticker, index) => {
      const tag = document.createElement('span');
      tag.className = 'placed-tag';
      tag.innerHTML = `${sticker.emoji} <button data-index="${index}">✕</button>`;

      const removeBtn = tag.querySelector('button');
      removeBtn?.addEventListener('click', () => this.removeSticker(index));

      tagsContainer.appendChild(tag);
    });
  }

  private removeSticker(index: number): void {
    if (!this.signEditor) return;

    const sticker = this.placedStickers[index];
    if (sticker) {
      this.signEditor.canvas.remove(sticker.obj);
      this.signEditor.canvas.renderAll();
      this.placedStickers.splice(index, 1);
      this.updatePlacedList();
    }
  }

  // ============================================================
  // RANDOMIZE
  // ============================================================

  private randomizeSign(): void {
    if (!this.signEditor) return;

    // 1. Random material
    const randomMaterial = SIGN_MATERIALS[Math.floor(Math.random() * SIGN_MATERIALS.length)];
    this.selectMaterial(randomMaterial);

    // 2. Random font
    const randomFont = SIGN_FONTS[Math.floor(Math.random() * SIGN_FONTS.length)];
    this.selectFont(randomFont);

    // 3. Random color (contrast-aware)
    const isLight = this.isLightMaterial(randomMaterial.id);
    const darkColors = ['#1a1a1a', '#DC143C', '#1E90FF', '#228B22', '#8B008B'];
    const lightColors = ['#FFFFFF', '#fbbf24', '#FF8C00', '#FF1493'];
    const colorPool = isLight ? darkColors : lightColors;
    const randomColor = colorPool[Math.floor(Math.random() * colorPool.length)];
    this.selectColor(randomColor);

    // 4. Random message
    const randomMessage = PRESET_MESSAGES[Math.floor(Math.random() * PRESET_MESSAGES.length)];
    if (this.textInput) {
      this.textInput.value = randomMessage;
      this.signMessage = randomMessage;

      // Update char count
      const charCountSpan = this.overlayContainer?.querySelector('#char-count');
      if (charCountSpan) {
        charCountSpan.textContent = String(randomMessage.length);
      }

      // Update sign editor (clear ghost)
      const textObj = this.signEditor.canvas.getObjects().find((o: any) => o.data?.isTextObject);
      if (textObj) {
        textObj.set('opacity', 1);
      }
      this.signEditor.setText(randomMessage);
    }

    // 5. Random stickers (0-3)
    // Clear existing stickers
    this.placedStickers.forEach((sticker) => {
      this.signEditor!.canvas.remove(sticker.obj);
    });
    this.placedStickers = [];

    const stickerCount = Math.floor(Math.random() * 4); // 0-3
    const allEmojis = EMOJI_CATEGORIES.flatMap((cat) => cat.emojis);

    for (let i = 0; i < stickerCount; i++) {
      const randomEmoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];
      this.signEditor.addEmoji(randomEmoji);

      const activeObj = this.signEditor.canvas.getActiveObject();
      if (activeObj) {
        this.placedStickers.push({ obj: activeObj, emoji: randomEmoji.emoji });
      }
    }

    this.updatePlacedList();

    console.log('[SignCraftScene] Randomized sign:', {
      material: randomMaterial.id,
      font: randomFont,
      color: randomColor,
      message: randomMessage,
      stickerCount,
    });
  }

  private isLightMaterial(materialId: string): boolean {
    const lightMaterials = [
      'posterboard',
      'posterboard-yellow',
      'posterboard-pink',
      'posterboard-sky',
      'foamboard',
      'foamboard-green',
      'foamboard-purple',
    ];
    return lightMaterials.includes(materialId);
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
    const message = this.signMessage.trim() || 'HONK FOR DEMOCRACY';
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

    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    this.textInput = null;
    this.placedStickers = [];
  }
}
