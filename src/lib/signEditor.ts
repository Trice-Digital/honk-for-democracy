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

import { Canvas, FabricText, FabricImage, FabricObject } from 'fabric';
import { generateMaterialTexture } from './signMaterials';
import { SIGN_FONTS, SIGN_COLORS } from '../game/config/signConfig';
import type { DecorationDef, EmojiDef } from './signDecorations';

export interface SignEditorOptions {
  container: HTMLElement;
  width: number;
  height: number;
  onChange?: () => void;
}

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

  // Track decorations on canvas
  private decorations: Map<string, string> = new Map(); // object id -> decoration id

  constructor(options: SignEditorOptions) {
    const { container, width, height, onChange } = options;

    this.onChange = onChange;

    // Preload Google Fonts (skip system/web-safe fonts like Impact, Courier New, Comic Sans MS, Georgia)
    const googleFonts = ['Permanent Marker', 'Bangers', 'Rubik Mono One', 'Bungee'];
    for (const font of googleFonts) {
      this.preloadGoogleFont(font);
    }

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
      lockRotation: true, // No rotation for simplicity
      // Mark as text object (not deletable)
      data: { isTextObject: true },
    });

    this.canvas.add(this.textObject);
    this.canvas.setActiveObject(this.textObject);

    // Mobile-friendly resize handles for all objects
    Canvas.prototype.set({
      cornerSize: 20,
      touchCornerSize: 40,
    });

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
   * Set material background by material ID.
   * Generates procedural texture and sets as canvas background.
   */
  public async setMaterialById(materialId: string): Promise<void> {
    const materialCanvas = generateMaterialTexture(
      materialId,
      this.canvas.width!,
      this.canvas.height!,
    );
    return this.setMaterial(materialCanvas);
  }

  /**
   * Set material background (accepts a material texture canvas).
   * Converts canvas to fabric.Image and sets as background.
   */
  public async setMaterial(materialCanvas: HTMLCanvasElement): Promise<void> {
    const dataUrl = materialCanvas.toDataURL('image/png');

    const img = await FabricImage.fromURL(dataUrl);
    if (!img) {
      console.error('[SignEditor] Failed to load material texture as FabricImage');
      return;
    }

    // Scale image to fill entire canvas (set each axis independently)
    const canvasW = this.canvas.width!;
    const canvasH = this.canvas.height!;
    img.set({
      scaleX: canvasW / (img.width || canvasW),
      scaleY: canvasH / (img.height || canvasH),
    });

    // Fabric.js v6+/v7: set backgroundImage property directly (setBackgroundImage was removed)
    this.canvas.backgroundImage = img;
    this.canvas.renderAll();
    this.notifyChange();
  }

  /**
   * Add a decoration to the canvas.
   */
  public async addDecoration(decoration: DecorationDef): Promise<void> {
    // Convert SVG string to data URL
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(decoration.svgString);

    return new Promise((resolve) => {
      FabricImage.fromURL(dataUrl).then((img) => {
        if (!img) {
          console.error('[SignEditor] Failed to load decoration SVG as FabricImage');
          resolve();
          return;
        }

        // Center decoration on canvas initially
        const centerX = this.canvas.width! / 2;
        const centerY = this.canvas.height! / 2;

        // Configure decoration object
        img.set({
          left: centerX,
          top: centerY,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: true, // No rotation for simplicity
          // Scale to default size
          scaleX: decoration.defaultWidth / (img.width || 100),
          scaleY: decoration.defaultHeight / (img.height || 100),
          // Custom data
          data: {
            decorationId: decoration.id,
          },
        });

        // Add to canvas
        this.canvas.add(img);
        this.canvas.setActiveObject(img);

        // Track decoration
        const imgData = (img as any).data;
        if (imgData && imgData.decorationId) {
          const objId = (img as any).__uid || String(Date.now());
          this.decorations.set(objId, imgData.decorationId);
        }

        this.canvas.renderAll();
        this.notifyChange();
        resolve();
      });
    });
  }

  /**
   * Add an emoji sticker to the canvas as a FabricText object.
   * Emoji renders natively (no SVG needed), fully draggable/scalable.
   */
  public addEmoji(emojiDef: EmojiDef): void {
    const centerX = this.canvas.width! / 2;
    const centerY = this.canvas.height! / 2;

    // Offset slightly so multiple emojis don't stack exactly
    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = (Math.random() - 0.5) * 40;

    const emojiText = new FabricText(emojiDef.emoji, {
      left: centerX + offsetX,
      top: centerY + offsetY,
      fontSize: 48,
      originX: 'center',
      originY: 'center',
      selectable: true,
      hasControls: true,
      hasBorders: true,
      lockRotation: true,
      data: {
        decorationId: `emoji-${emojiDef.emoji}`,
        isEmoji: true,
      },
    });

    this.canvas.add(emojiText);
    this.canvas.setActiveObject(emojiText);

    // Track as decoration
    const objId = String(Date.now()) + Math.random();
    this.decorations.set(objId, `emoji-${emojiDef.emoji}`);

    this.canvas.renderAll();
    this.notifyChange();
  }

  /**
   * Remove the currently selected object (if it's a decoration).
   * Text object cannot be removed.
   */
  public removeSelected(): void {
    const activeObj = this.canvas.getActiveObject();

    if (!activeObj) {
      console.log('[SignEditor] No object selected to remove');
      return;
    }

    // Protect text object from deletion
    const objData = (activeObj as any).data;
    if (objData && objData.isTextObject) {
      console.log('[SignEditor] Cannot remove text object');
      return;
    }

    // Check if it's a decoration
    if (objData && objData.decorationId) {
      const objId = (activeObj as any).__uid;
      this.decorations.delete(objId);
      this.canvas.remove(activeObj);
      this.canvas.renderAll();
      this.notifyChange();
      console.log('[SignEditor] Removed decoration:', objData.decorationId);
    } else {
      console.log('[SignEditor] Selected object is not a decoration');
    }
  }

  /**
   * Get list of decoration IDs currently on the canvas.
   */
  public getDecorations(): string[] {
    return Array.from(this.decorations.values());
  }

  /**
   * Export canvas to PNG data URL.
   * All objects (text + decorations + background) are included automatically.
   */
  public exportToPNG(): string {
    return this.canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
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
