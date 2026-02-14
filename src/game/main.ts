import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig';

/**
 * Boot the Phaser game into the specified container element.
 *
 * Called from the Astro page's client-side script.
 * This is the single entry point from the site shell into the game engine.
 */
export function bootGame(containerId: string): Phaser.Game {
  const config = createGameConfig(containerId);
  const game = new Phaser.Game(config);

  // Handle page visibility — pause/resume game when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.scene.scenes.forEach((scene) => {
        if (scene.scene.isActive()) {
          scene.scene.pause();
        }
      });
    } else {
      game.scene.scenes.forEach((scene) => {
        if (scene.scene.isPaused()) {
          scene.scene.resume();
        }
      });
    }
  });

  return game;
}
