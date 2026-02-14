import Phaser from 'phaser';
import type { SignMaterial } from '../config/signConfig';

/**
 * Player entity — The protester standing at the intersection.
 *
 * Fixed position, holds a sign, has a visibility cone.
 * Procedural graphics (no external assets).
 * Sign appearance is driven by SignData from the crafting scene.
 */

export class Player extends Phaser.GameObjects.Container {
  private head: Phaser.GameObjects.Arc;
  private torso: Phaser.GameObjects.Rectangle;
  private signPost: Phaser.GameObjects.Rectangle;
  private signBoard: Phaser.GameObjects.Rectangle;
  private signText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Legs (two small rectangles)
    const leftLeg = scene.add.rectangle(-8, 25, 8, 20, 0x1e40af);
    const rightLeg = scene.add.rectangle(8, 25, 8, 20, 0x1e40af);
    this.add([leftLeg, rightLeg]);

    // Torso
    this.torso = scene.add.rectangle(0, 8, 24, 26, 0x2563eb);
    this.add(this.torso);

    // Head
    this.head = scene.add.circle(0, -12, 12, 0xfbbf24);
    this.add(this.head);

    // Sign post (extends upward)
    this.signPost = scene.add.rectangle(-20, -30, 4, 40, 0x92400e);
    this.add(this.signPost);

    // Sign board
    this.signBoard = scene.add.rectangle(-20, -56, 60, 30, 0xd4a574);
    this.signBoard.setStrokeStyle(2, 0x78350f);
    this.add(this.signBoard);

    // Sign text
    this.signText = scene.add.text(-20, -56, 'HONK!', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#1a1a1a',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 54 },
    });
    this.signText.setOrigin(0.5);
    this.add(this.signText);

    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
  }

  /** Set the sign message displayed on the player's sign */
  setSignMessage(message: string): void {
    // Truncate to fit sign board
    const display = message.length > 20 ? message.slice(0, 20) + '...' : message;
    this.signText.setText(display);

    // Auto-size font based on length
    if (display.length > 15) {
      this.signText.setFontSize(8);
    } else if (display.length > 10) {
      this.signText.setFontSize(10);
    } else {
      this.signText.setFontSize(12);
    }
  }

  /** Update sign board appearance to match the selected material */
  setSignMaterial(material: SignMaterial): void {
    this.signBoard.setFillStyle(material.boardColor);
    this.signBoard.setStrokeStyle(2, material.strokeColor);
    this.signText.setColor(material.textColor);
  }
}
