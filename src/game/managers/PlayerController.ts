import Phaser from 'phaser';
import type { IntersectionMapConfig } from '../config/intersectionConfig';
import { GameStateManager } from '../systems/GameStateManager';
import { FatigueSystem } from '../systems/FatigueSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { ReactionSystem } from '../systems/ReactionSystem';
import { VisibilityCone } from '../entities/VisibilityCone';
import type { Car } from '../entities/Car';
import { ReactionFeedbackManager } from './ReactionFeedbackManager';
import { MenuManager } from './MenuManager';
import { PALETTE } from '../config/paletteConfig';

/**
 * PlayerController — Handles player input and action buttons.
 *
 * Responsibilities:
 * - Input handling (pointermove/pointerdown for cone rotation)
 * - Action buttons (Raise, Switch Arms, Rest) with neobrutalist press-into-shadow
 * - Raise sign mechanic (tap vs hold)
 * - Cone intersection detection + raise boost/deflect logic
 * - Cone width updates from fatigue system
 * - Raise button visual state updates (disabled while resting)
 */
export class PlayerController {
  private raiseHoldActive: boolean = false;
  private raiseTapTimer: Phaser.Time.TimerEvent | null = null;

  // Action button UI refs
  private raiseBtn!: Phaser.GameObjects.Container;
  private raiseBtnBg!: Phaser.GameObjects.Rectangle;
  private raiseBtnText!: Phaser.GameObjects.Text;
  private raiseBtnShadow!: Phaser.GameObjects.Graphics;

  private switchArmBtn!: Phaser.GameObjects.Container;
  private switchBtnBg!: Phaser.GameObjects.Rectangle;
  private switchBtnShadow!: Phaser.GameObjects.Graphics;

  private restBtn!: Phaser.GameObjects.Container;
  private restBtnBg!: Phaser.GameObjects.Rectangle;
  private restBtnText!: Phaser.GameObjects.Text;
  private restBtnShadow!: Phaser.GameObjects.Graphics;

  constructor(
    private scene: Phaser.Scene,
    private config: IntersectionMapConfig,
    private cone: VisibilityCone,
    private gameState: GameStateManager,
    private fatigueSystem: FatigueSystem,
    private audioSystem: AudioSystem,
    private reactionSystem: ReactionSystem,
    private reactionFeedback: ReactionFeedbackManager,
    private cars: () => Car[], // getter function since TrafficManager owns array
  ) {}

  /**
   * Setup input handlers (pointermove/pointerdown for cone rotation).
   * Must be called after MenuManager is created.
   */
  setupInput(menuManager: MenuManager): void {
    // --- Input: drag to rotate cone ---
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.gameState.isActive() || menuManager.getIsPaused()) return;

      // Convert screen pointer to world coordinates
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const dx = worldPoint.x - this.config.playerX;
      const dy = worldPoint.y - this.config.playerY;
      const angle = Math.atan2(dy, dx);
      this.cone.setDirection(angle);
    });

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.gameState.isActive() || menuManager.getIsPaused()) return;
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const dx = worldPoint.x - this.config.playerX;
      const dy = worldPoint.y - this.config.playerY;
      const angle = Math.atan2(dy, dx);
      this.cone.setDirection(angle);
    });
  }

  /**
   * Create action buttons (Raise, Switch Arms, Rest) at bottom of screen.
   */
  createActionButtons(viewW: number, viewH: number): void {
    const btnY = viewH - 80;
    const btnHeight = 48;
    const btnGap = 12;

    // --- RAISE button (center, large) --- Neobrutalist style
    const raiseBtnWidth = 140;

    // Shadow (behind the container, fixed position)
    this.raiseBtnShadow = this.scene.add.graphics();
    this.raiseBtnShadow.fillStyle(PALETTE.shadowDark, 0.5);
    this.raiseBtnShadow.fillRoundedRect(-raiseBtnWidth / 2 + 3, -btnHeight / 2 + 3, raiseBtnWidth, btnHeight, 4);
    this.raiseBtnShadow.setScrollFactor(0);
    this.raiseBtnShadow.setDepth(109);
    this.raiseBtnShadow.setPosition(viewW / 2, btnY);

    const raiseBg = this.scene.add.rectangle(0, 0, raiseBtnWidth, btnHeight, PALETTE.safetyYellow);
    raiseBg.setStrokeStyle(3, PALETTE.markerBlack, 1);
    const raiseText = this.scene.add.text(0, 0, 'RAISE', {
      fontFamily: "'Bangers', cursive",
      fontSize: '24px',
      color: '#1a1a1a',
      letterSpacing: 3,
    });
    raiseText.setOrigin(0.5);

    this.raiseBtn = this.scene.add.container(viewW / 2, btnY, [raiseBg, raiseText]);
    this.raiseBtn.setScrollFactor(0);
    this.raiseBtn.setDepth(110);
    this.raiseBtn.setSize(raiseBtnWidth, btnHeight);
    this.raiseBtn.setInteractive({ useHandCursor: true });
    this.raiseBtnBg = raiseBg;
    this.raiseBtnText = raiseText;

    // Raise button: supports both tap (auto-lower after 0.8s) and hold
    let raiseDownTime = 0;
    const HOLD_THRESHOLD = 200;
    const TAP_RAISE_DURATION = 800;

    this.raiseBtn.on('pointerdown', () => {
      if (!this.gameState.isActive()) return;
      raiseDownTime = this.scene.time.now;
      this.raiseHoldActive = true;
      this.fatigueSystem.setRaised(true);
      this.audioSystem.playRaiseSign();
      this.raiseBtnBg.setFillStyle(0xe89b0c);
      this.raiseBtnText.setText('RAISED!');
      // Press-into-shadow effect
      this.raiseBtn.setPosition(viewW / 2 + 2, btnY + 2);
    });

    this.raiseBtn.on('pointerup', () => {
      if (!this.raiseHoldActive) return;
      this.raiseHoldActive = false;
      // Restore position
      this.raiseBtn.setPosition(viewW / 2, btnY);
      const holdDuration = this.scene.time.now - raiseDownTime;

      if (holdDuration < HOLD_THRESHOLD) {
        if (this.raiseTapTimer) this.raiseTapTimer.destroy();
        this.raiseTapTimer = this.scene.time.delayedCall(TAP_RAISE_DURATION, () => {
          this.fatigueSystem.setRaised(false);
          this.raiseBtnBg.setFillStyle(PALETTE.safetyYellow);
          this.raiseBtnText.setText('RAISE');
          this.raiseTapTimer = null;
        });
      } else {
        this.fatigueSystem.setRaised(false);
        this.raiseBtnBg.setFillStyle(PALETTE.safetyYellow);
        this.raiseBtnText.setText('RAISE');
      }
    });

    this.raiseBtn.on('pointerout', () => {
      if (!this.raiseHoldActive) return;
      this.raiseHoldActive = false;
      this.raiseBtn.setPosition(viewW / 2, btnY);
      if (!this.raiseTapTimer) {
        this.fatigueSystem.setRaised(false);
        this.raiseBtnBg.setFillStyle(PALETTE.safetyYellow);
        this.raiseBtnText.setText('RAISE');
      }
    });

    // --- Switch Arms button (left of raise) --- Neobrutalist style
    const switchBtnWidth = 100;
    const switchX = viewW / 2 - raiseBtnWidth / 2 - btnGap - switchBtnWidth / 2;

    this.switchBtnShadow = this.scene.add.graphics();
    this.switchBtnShadow.fillStyle(PALETTE.shadowDark, 0.5);
    this.switchBtnShadow.fillRoundedRect(-switchBtnWidth / 2 + 3, -btnHeight / 2 + 3, switchBtnWidth, btnHeight, 4);
    this.switchBtnShadow.setScrollFactor(0);
    this.switchBtnShadow.setDepth(109);
    this.switchBtnShadow.setPosition(switchX, btnY);

    const switchBg = this.scene.add.rectangle(0, 0, switchBtnWidth, btnHeight, PALETTE.actionBlue);
    switchBg.setStrokeStyle(3, PALETTE.markerBlack, 1);
    this.switchBtnBg = switchBg;
    const switchText = this.scene.add.text(0, 0, 'SWITCH\nARMS', {
      fontFamily: "'Bangers', cursive",
      fontSize: '14px',
      color: '#f5f0e8',
      align: 'center',
      letterSpacing: 1,
    });
    switchText.setOrigin(0.5);

    this.switchArmBtn = this.scene.add.container(switchX, btnY, [switchBg, switchText]);
    this.switchArmBtn.setScrollFactor(0);
    this.switchArmBtn.setDepth(110);
    this.switchArmBtn.setSize(switchBtnWidth, btnHeight);
    this.switchArmBtn.setInteractive({ useHandCursor: true });
    this.switchArmBtn.on('pointerdown', () => {
      if (!this.gameState.isActive()) return;
      // Press-into-shadow
      this.switchArmBtn.setPosition(switchX + 2, btnY + 2);
      const switched = this.fatigueSystem.trySwitchArm();
      if (switched) {
        switchBg.setFillStyle(PALETTE.stoplightGreen);
        const arm = this.gameState.getState().activeArm;
        switchText.setText(`${arm === 'left' ? 'Left' : 'Right'}\nArm`);
        this.scene.time.delayedCall(500, () => {
          switchBg.setFillStyle(PALETTE.actionBlue);
          switchText.setText('SWITCH\nARMS');
        });
      } else {
        switchBg.setFillStyle(PALETTE.stoplightRed);
        this.scene.time.delayedCall(300, () => {
          switchBg.setFillStyle(PALETTE.actionBlue);
        });
      }
    });
    this.switchArmBtn.on('pointerup', () => {
      this.switchArmBtn.setPosition(switchX, btnY);
    });
    this.switchArmBtn.on('pointerout', () => {
      this.switchArmBtn.setPosition(switchX, btnY);
    });

    // --- Rest button (right of raise) --- Neobrutalist style
    const restBtnWidth = 100;
    const restX = viewW / 2 + raiseBtnWidth / 2 + btnGap + restBtnWidth / 2;

    this.restBtnShadow = this.scene.add.graphics();
    this.restBtnShadow.fillStyle(PALETTE.shadowDark, 0.5);
    this.restBtnShadow.fillRoundedRect(-restBtnWidth / 2 + 3, -btnHeight / 2 + 3, restBtnWidth, btnHeight, 4);
    this.restBtnShadow.setScrollFactor(0);
    this.restBtnShadow.setDepth(109);
    this.restBtnShadow.setPosition(restX, btnY);

    const restBg = this.scene.add.rectangle(0, 0, restBtnWidth, btnHeight, 0x6b7280);
    restBg.setStrokeStyle(3, PALETTE.markerBlack, 1);
    this.restBtnBg = restBg;
    const restText = this.scene.add.text(0, 0, 'REST', {
      fontFamily: "'Bangers', cursive",
      fontSize: '18px',
      color: '#f5f0e8',
      letterSpacing: 2,
    });
    restText.setOrigin(0.5);

    this.restBtn = this.scene.add.container(restX, btnY, [restBg, restText]);
    this.restBtn.setScrollFactor(0);
    this.restBtn.setDepth(110);
    this.restBtn.setSize(restBtnWidth, btnHeight);
    this.restBtn.setInteractive({ useHandCursor: true });
    this.restBtnText = restText;

    this.restBtn.on('pointerdown', () => {
      if (!this.gameState.isActive()) return;
      // Press-into-shadow
      this.restBtn.setPosition(restX + 2, btnY + 2);
      this.fatigueSystem.toggleRest();
      const isResting = this.gameState.getState().isResting;
      restBg.setFillStyle(isResting ? PALETTE.stoplightGreen : 0x6b7280);
      restText.setText(isResting ? 'Resting...' : 'REST');
    });
    this.restBtn.on('pointerup', () => {
      this.restBtn.setPosition(restX, btnY);
    });
    this.restBtn.on('pointerout', () => {
      this.restBtn.setPosition(restX, btnY);
    });
  }

  /**
   * Check for cone intersections with cars and handle reactions.
   * Handles raise boost/deflect logic.
   */
  checkConeIntersections(): void {
    const state = this.gameState.getState();
    // Reduce cone effectiveness while resting
    const visibilityFactor = this.fatigueSystem.getVisibilityFactor();

    for (const car of this.cars()) {
      if (!car.active || car.hasBeenReached) continue;

      if (this.cone.containsPoint(car.x, car.y)) {
        // While resting, only catch a fraction of cars
        if (visibilityFactor < 1.0 && Math.random() > visibilityFactor) {
          continue;
        }

        car.hasBeenReached = true;

        // Roll a reaction
        const event = this.reactionSystem.react(car.x, car.y);
        const reaction = event.reaction;

        // --- Raise sign mechanic ---
        let finalScoreValue = reaction.scoreValue;
        let wasDeflected = false;
        let wasRaiseBoosted = false;

        if (state.isRaised) {
          if (reaction.sentiment === 'positive' && reaction.scoreValue > 0) {
            // Raised during positive reaction = bonus!
            const raiseConfig = this.fatigueSystem.getRaiseConfig();
            finalScoreValue = Math.round(reaction.scoreValue * raiseConfig.raisePositiveBonus);
            wasRaiseBoosted = true;
          } else if (reaction.sentiment === 'negative' && reaction.scoreValue < 0) {
            // Raised during negative reaction = deflect!
            const raiseConfig = this.fatigueSystem.getRaiseConfig();
            finalScoreValue = raiseConfig.deflectScoreValue;
            wasDeflected = true;
            // Bonus confidence for the deflect
            this.gameState.addConfidence(raiseConfig.deflectConfidenceBonus);
          }
        }

        // Record in game state
        this.gameState.recordReaction(reaction.id, finalScoreValue);

        // Play reaction sound
        if (wasDeflected) {
          this.audioSystem.playDeflect();
        } else {
          this.audioSystem.playReactionSound(reaction.id);
        }

        // Show visual feedback
        this.reactionFeedback.showReactionFeedback(
          car, reaction, wasRaiseBoosted, wasDeflected, finalScoreValue
        );
      }
    }
  }

  /**
   * Update cone width from fatigue system.
   */
  updateConeFromFatigue(): void {
    const coneWidth = this.fatigueSystem.getConeWidth();
    this.cone.setConeWidth(coneWidth);
  }

  /**
   * Update raise button visual state (disabled while resting).
   */
  updateRaiseButtonState(): void {
    const state = this.gameState.getState();
    if (state.isResting) {
      this.raiseBtnBg.setAlpha(0.4);
    } else {
      this.raiseBtnBg.setAlpha(1);
    }
  }

  /**
   * Destroy controller resources.
   */
  destroy(): void {
    if (this.raiseTapTimer) {
      this.raiseTapTimer.destroy();
      this.raiseTapTimer = null;
    }
  }
}
