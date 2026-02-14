/**
 * SignEditor — Fabric.js canvas sign editor for creative sign crafting.
 *
 * Manages:
 * - Interactive Fabric.js canvas with draggable text
 * - Font selection (4+ protest-ready fonts)
 * - Color picking (7+ marker/paint colors)
 * - Material backgrounds (procedural textures)
 * - PNG export for Phaser gameplay integration
 *
 * Architecture boundary: Pure TypeScript, no Phaser dependency.
 * SignCraftScene creates DOM overlay and mounts this editor.
 */

import { Canvas, FabricText, FabricImage } from 'fabric';

export interface SignEditorOptions {
  container: HTMLElement;
  width: number;
  height: number;
  onChange?: () => void;
}

export const SIGN_FONTS = [
  'Permanent Marker',  // Hand-drawn protest sign energy (Google Fonts)
  'Impact',            // Classic bold block letters
  'Courier New',       // Stencil-like monospace
  'Comic Sans MS',     // Casual/fun handwritten
];

export const SIGN_COLORS = [
  '#1a1a1a',  // Black (Sharpie)
  '#dc2626',  // Red
  '#2563eb',  // Blue
  '#ffffff',  // White
  '#16a34a',  // Green
  '#7c3aed',  // Purple
  '#ca8a04',  // Gold
];

/**
 * SignEditor — Fabric.js canvas sign editor.
 */
export class SignEditor {
  public canvas: Canvas;
  private canvasElement: HTMLCanvasElement;
  private textObject: FabricText;
  private onChange?: () => void;

  // Editor state
  private currentFont: string = SIGN_FONTS[0];
  private currentColor: string = SIGN_COLORS[0];
  private currentText: string = '';

  constructor(options: SignEditorOptions) {
    const { container, width, height, onChange } = options;

    this.onChange = onChange;

    // Preload Permanent Marker font from Google Fonts
    this.preloadGoogleFont('Permanent Marker');

    // Create canvas element
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.width = width;
    this.canvasElement.height = height;
    container.appendChild(this.canvasElement);

    // Initialize Fabric.js canvas
    this.canvas = new Canvas(this.canvasElement, {
      width,
      height,
      backgroundColor: '#f0f0f0',
      selection: false, // Disable group selection box
    });

    // Create initial text object (centered, draggable)
    this.textObject = new FabricText('', {
      left: width / 2,
      top: height / 2,
      fontFamily: this.currentFont,
      fontSize: 48,
      fill: this.currentColor,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      hasControls: true,
      hasBorders: true,
      lockScalingX: false,
      lockScalingY: false,
      lockRotation: true, // No rotation for now
    });

    this.canvas.add(this.textObject);
    this.canvas.setActiveObject(this.textObject);

    // Listen for text object changes (drag, scale, etc.)
    this.textObject.on('modified', () => {
      this.notifyChange();
    });

    this.canvas.renderAll();
  }

  /**
   * Preload a Google Font by adding a <link> tag to document head.
   */
  private preloadGoogleFont(fontName: string): void {
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;

    // Check if already loaded
    const existing = document.querySelector(`link[href="${fontUrl}"]`);
    if (existing) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    document.head.appendChild(link);
  }

  /**
   * Update text content.
   */
  public setText(text: string): void {
    this.currentText = text;
    this.textObject.set('text', text);

    // Auto-size font based on text length
    const len = text.length;
    let fontSize = 48;

    if (len > 40) fontSize = 24;
    else if (len > 30) fontSize = 32;
    else if (len > 20) fontSize = 40;
    else fontSize = 48;

    this.textObject.set('fontSize', fontSize);

    this.canvas.renderAll();
    this.notifyChange();
  }

  /**
   * Set font family.
   */
  public setFont(fontFamily: string): void {
    if (!SIGN_FONTS.includes(fontFamily)) {
      console.warn(`[SignEditor] Font "${fontFamily}" not in SIGN_FONTS. Using anyway.`);
    }

    this.currentFont = fontFamily;
    this.textObject.set('fontFamily', fontFamily);
    this.canvas.renderAll();
    this.notifyChange();
  }

  /**
   * Set text color.
   */
  public setTextColor(color: string): void {
    if (!SIGN_COLORS.includes(color)) {
      console.warn(`[SignEditor] Color "${color}" not in SIGN_COLORS. Using anyway.`);
    }

    this.currentColor = color;
    this.textObject.set('fill', color);
    this.canvas.renderAll();
    this.notifyChange();
  }

  /**
   * Set material background (accepts a material texture canvas).
   * Converts canvas to fabric.Image and sets as background.
   */
  public async setMaterial(materialCanvas: HTMLCanvasElement): Promise<void> {
    const dataUrl = materialCanvas.toDataURL('image/png');

    return new Promise((resolve) => {
      FabricImage.fromURL(dataUrl).then((img) => {
        if (!img) {
          console.error('[SignEditor] Failed to load material texture as FabricImage');
          resolve();
          return;
        }

        // Scale image to fit canvas
        img.scaleToWidth(this.canvas.width!);
        img.scaleToHeight(this.canvas.height!);

        this.canvas.setBackgroundImage(img, () => {
          this.canvas.renderAll();
          this.notifyChange();
          resolve();
        });
      });
    });
  }

  /**
   * Export canvas to PNG data URL.
   */
  public exportToPNG(): string {
    return this.canvas.toDataURL({ format: 'png', quality: 1 });
  }

  /**
   * Clean up canvas and DOM elements.
   */
  public destroy(): void {
    this.canvas.dispose();
    this.canvasElement.remove();
  }

  private notifyChange(): void {
    if (this.onChange) {
      this.onChange();
    }
  }
}
