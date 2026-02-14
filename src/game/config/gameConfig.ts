import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { SignCraftScene } from '../scenes/SignCraftScene';
import { IntersectionScene } from '../scenes/IntersectionScene';
import { ScoreScene } from '../scenes/ScoreScene';
import { ActivismScene } from '../scenes/ActivismScene';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#1a1a2e',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 720,
      height: 1280,
    },
    input: {
      touch: {
        capture: true,
      },
    },
    dom: {
      createContainer: true,
    },
    scene: [BootScene, SignCraftScene, IntersectionScene, ScoreScene, ActivismScene],
    render: {
      pixelArt: false,
      antialias: true,
    },
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
  };
}
