import Phaser from 'phaser';
import type { GameStateManager } from './GameStateManager';
import type { WeatherSystem } from './WeatherSystem';
import type { DifficultyConfig } from '../config/difficultyConfig';
import {
  type EventType,
  type EventScheduleConfig,
  type CopCheckConfig,
  type CopDialogueOption,
  type KarmaPhase,
  EVENT_SCHEDULE_DEFAULTS,
  COP_CHECK_SCENARIOS,
  KARMA_DEFAULTS,
} from '../config/eventConfig';
import { PALETTE } from '../config/paletteConfig';
import {
  drawPaperShadow,
  drawScissorCutRect,
} from '../utils/paperArt';

/**
 * EventSystem — Schedules and executes mid-game events.
 *
 * Events overlay on gameplay without fully stopping traffic flow.
 * The system uses a timer + probability model: after a minimum time,
 * events have a chance to fire each second. Guaranteed events are
 * forced before the session ends if they haven't triggered naturally.
 *
 * Integrates with:
 * - GameStateManager (time, confidence, score, state)
 * - WeatherSystem (rain trigger)
 * - ConfidenceSystem (indirect, via confidence changes)
 * - IntersectionScene (UI overlays)
 *
 * @stateAccess Uses getState() for full snapshot (needs multiple fields: isSessionActive, confidence, timeRemaining). Also uses getElapsed() individually.
 */

export type EventState = 'idle' | 'copCheck' | 'weather' | 'karma';

export class EventSystem extends Phaser.Events.EventEmitter {
  private gameState: GameStateManager;
  private weatherSystem: WeatherSystem;
  private config: EventScheduleConfig;
  private difficulty: DifficultyConfig;
  private scene: Phaser.Scene;

  // Scheduling state
  private eventsTriggered: EventType[] = [];
  private lastEventTime: number = 0;
  private nextEventMinTime: number;
  private currentEventState: EventState = 'idle';
  private isEventActive: boolean = false;

  // Cop check state
  private copCheckUI: Phaser.GameObjects.Container | null = null;
  private copAutoResolveTimer: number = 0;
  private activeCopScenario: CopCheckConfig | null = null;

  // Karma state
  private karmaPhaseIndex: number = 0;
  private karmaPhaseTimer: number = 0;
  private karmaUI: Phaser.GameObjects.Container | null = null;

  constructor(
    scene: Phaser.Scene,
    gameState: GameStateManager,
    weatherSystem: WeatherSystem,
    difficulty: DifficultyConfig,
    config?: Partial<EventScheduleConfig>,
  ) {
    super();
    this.scene = scene;
    this.gameState = gameState;
    this.weatherSystem = weatherSystem;
    this.difficulty = difficulty;
    this.config = { ...EVENT_SCHEDULE_DEFAULTS, ...config };

    // Randomize when first event can fire
    this.nextEventMinTime = Phaser.Math.Between(
      this.config.firstEventMinTime,
      this.config.firstEventMaxTime,
    );

    console.log(`[HFD] EventSystem initialized. First event window: ${this.nextEventMinTime}s`);

    if (import.meta.env.DEV) {
      if (this.config.minEventSpacing <= 0) {
        console.warn('[HFD] EventSystem: minEventSpacing should be positive');
      }
      if (this.config.maxEventsPerSession < 1) {
        console.warn('[HFD] EventSystem: maxEventsPerSession should be >= 1');
      }
      if (this.difficulty.eventFrequencyMultiplier < 0.1 || this.difficulty.eventFrequencyMultiplier > 5.0) {
        console.warn(`[HFD] EventSystem: eventFrequencyMultiplier ${this.difficulty.eventFrequencyMultiplier} outside sane range (0.1-5.0)`);
      }
    }
  }

  /**
   * Called every frame. Handles event scheduling and active event updates.
   */
  update(delta: number): void {
    const state = this.gameState.getState();
    if (!state.isSessionActive) return;

    const deltaSec = delta / 1000;
    const elapsed = this.gameState.getElapsed();

    // Update active event
    if (this.isEventActive) {
      this.updateActiveEvent(deltaSec);
      return;
    }

    // Check if we should trigger an event
    this.checkEventTrigger(elapsed, deltaSec, state);
  }

  /**
   * Check if conditions are met to trigger a new event.
   *
   * Called each frame when no event is currently active. Evaluates multiple
   * conditions in priority order:
   *
   * 1. **Minimum time window**: Bail if before nextEventMinTime
   * 2. **Max events cap**: Bail if hit maxEventsPerSession (but checkGuaranteedEvents still runs)
   * 3. **Minimum spacing**: Bail if < minEventSpacing seconds since last event
   * 4. **Guaranteed event urgency**: If < 30s remaining, force any guaranteed events that haven't fired yet
   * 5. **Probability roll**: baseTriggerChancePerSecond * eventFrequencyMultiplier * deltaSec
   *
   * The guaranteed event urgency check at <30s overrides the max-events cap via checkGuaranteedEvents().
   * Probability is a per-frame chance: e.g. 0.02/sec * 1.0 * 0.016s = 0.00032 per frame.
   */
  private checkEventTrigger(
    elapsed: number,
    deltaSec: number,
    state: Readonly<ReturnType<GameStateManager['getState']>>,
  ): void {
    // Haven't reached minimum time yet
    if (elapsed < this.nextEventMinTime) return;

    // Hit max events
    if (this.eventsTriggered.length >= this.config.maxEventsPerSession) {
      // But check if guaranteed events need to fire
      this.checkGuaranteedEvents(elapsed, state);
      return;
    }

    // Minimum spacing between events
    if (elapsed - this.lastEventTime < this.config.minEventSpacing && this.lastEventTime > 0) {
      return;
    }

    // Check for guaranteed events that need to happen before session ends
    const timeRemaining = state.timeRemaining;
    if (timeRemaining < 30) {
      // Urgency: force a guaranteed event if one hasn't fired
      for (const evt of this.config.guaranteedEvents) {
        if (!this.eventsTriggered.includes(evt)) {
          if (this.canTriggerEvent(evt, state, elapsed)) {
            this.triggerEvent(evt);
            return;
          }
        }
      }
    }

    // Probability roll (scaled by difficulty)
    const triggerChance = this.config.baseTriggerChancePerSecond
      * this.difficulty.eventFrequencyMultiplier
      * deltaSec;

    if (Math.random() < triggerChance) {
      const eventType = this.pickEventType(state, elapsed);
      if (eventType) {
        this.triggerEvent(eventType);
      }
    }
  }

  /**
   * Force guaranteed events if they haven't happened yet.
   */
  private checkGuaranteedEvents(
    elapsed: number,
    state: Readonly<ReturnType<GameStateManager['getState']>>,
  ): void {
    const timeRemaining = state.timeRemaining;
    if (timeRemaining > 20) return;

    for (const evt of this.config.guaranteedEvents) {
      if (!this.eventsTriggered.includes(evt)) {
        if (this.canTriggerEvent(evt, state, elapsed)) {
          this.triggerEvent(evt);
          return;
        }
      }
    }
  }

  /**
   * Pick which event type to trigger based on weights and eligibility.
   *
   * Filters all event types through canTriggerEvent() to determine which are currently eligible,
   * then performs weighted random selection from the eligible pool.
   *
   * Weights are pulled from config.eventWeights and used directly (NOT normalized).
   * For example: { copCheck: 0.5, weather: 0.3, karma: 0.2 } → total weight 1.0
   *
   * Returns null if no event types are eligible (all exhausted or blocked by constraints).
   */
  private pickEventType(
    state: Readonly<ReturnType<GameStateManager['getState']>>,
    elapsed: number,
  ): EventType | null {
    const eligible: { type: EventType; weight: number }[] = [];

    for (const [type, weight] of Object.entries(this.config.eventWeights) as [EventType, number][]) {
      if (this.canTriggerEvent(type, state, elapsed)) {
        eligible.push({ type, weight });
      }
    }

    if (eligible.length === 0) return null;

    // Weighted random selection
    const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const e of eligible) {
      roll -= e.weight;
      if (roll <= 0) return e.type;
    }

    return eligible[eligible.length - 1].type;
  }

  /**
   * Check if a specific event type can trigger right now.
   *
   * Per-type constraints that gate eligibility:
   *
   * - **copCheck**: Blocked when confidence < copCheckMinConfidence (don't pile on struggling player)
   * - **weather**: One per session only. Blocked if weather already triggered OR if it's currently raining.
   * - **karma**: Requires karmaMinTime elapsed (mid-to-late game event). One per session only.
   * - **default**: Always eligible (future event types pass by default)
   *
   * Returns true if this specific event can fire right now, false otherwise.
   */
  private canTriggerEvent(
    type: EventType,
    state: Readonly<ReturnType<GameStateManager['getState']>>,
    elapsed: number,
  ): boolean {
    switch (type) {
      case 'copCheck':
        // Don't pile on when player is struggling
        return state.confidence >= this.config.copCheckMinConfidence;

      case 'weather':
        // Only one weather event per session, and not if it's already raining
        return !this.eventsTriggered.includes('weather') && !this.weatherSystem.isRaining();

      case 'karma':
        // Karma is a mid-to-late game event, max once per session
        return elapsed >= this.config.karmaMinTime && !this.eventsTriggered.includes('karma');

      default:
        return true;
    }
  }

  // ============================================================
  // EVENT TRIGGERING
  // ============================================================

  /**
   * Force-trigger a specific event (dev-only, bypasses scheduling).
   *
   * Called by DevControls to manually trigger events for testing.
   * Ends any currently active event first, then triggers the specified event
   * immediately, bypassing all canTriggerEvent checks.
   */
  forceTrigger(type: EventType): void {
    console.log(`[HFD-DEV] Force-triggered event: ${type}`);

    // End current event if one is active
    if (this.isEventActive) {
      this.endEvent();
    }

    // Trigger the event directly
    this.triggerEvent(type);
  }

  /**
   * Trigger a specific event.
   */
  private triggerEvent(type: EventType): void {
    this.eventsTriggered.push(type);
    this.lastEventTime = this.gameState.getElapsed();
    this.isEventActive = true;
    this.currentEventState = type;

    console.log(`[HFD] Event triggered: ${type} at ${this.lastEventTime.toFixed(1)}s`);
    this.emit('eventStarted', type);

    switch (type) {
      case 'copCheck':
        this.startCopCheck();
        break;
      case 'weather':
        this.startWeatherEvent();
        break;
      case 'karma':
        this.startKarmaEvent();
        break;
    }
  }

  /**
   * Update the currently active event.
   */
  private updateActiveEvent(deltaSec: number): void {
    switch (this.currentEventState) {
      case 'copCheck':
        this.updateCopCheck(deltaSec);
        break;
      case 'karma':
        this.updateKarma(deltaSec);
        break;
      case 'weather':
        // Weather runs in the background via WeatherSystem
        // Event is "done" immediately — weather continues via its own system
        this.endEvent();
        break;
    }
  }

  /**
   * End the current event and return to idle.
   */
  private endEvent(): void {
    const prevState = this.currentEventState;
    this.isEventActive = false;
    this.currentEventState = 'idle';
    this.emit('eventEnded', prevState);
  }

  // ============================================================
  // COP CHECK EVENT
  // ============================================================

  private startCopCheck(): void {
    // Pick a random scenario
    const scenarioIndex = Math.floor(Math.random() * COP_CHECK_SCENARIOS.length);
    this.activeCopScenario = COP_CHECK_SCENARIOS[scenarioIndex];
    this.copAutoResolveTimer = this.activeCopScenario.autoResolveTime;

    this.showCopCheckUI(this.activeCopScenario);
  }

  private showCopCheckUI(scenario: CopCheckConfig): void {
    const viewW = this.scene.scale.width;
    const viewH = this.scene.scale.height;

    this.copCheckUI = this.scene.add.container(0, 0);
    this.copCheckUI.setScrollFactor(0);
    this.copCheckUI.setDepth(180);

    // Semi-transparent backdrop
    const backdrop = this.scene.add.rectangle(viewW / 2, viewH / 2, viewW, viewH, 0x000000, 0.6);
    this.copCheckUI.add(backdrop);

    // --- Paper cutout dialogue panel ---
    const cardW = Math.min(viewW - 40, 500);
    const cardH = Math.min(viewH - 80, 480);
    const cardX = viewW / 2;
    const cardY = viewH / 2;
    const cardLeft = cardX - cardW / 2;
    const cardTop = cardY - cardH / 2;

    // Hard offset drop shadow (paper lifted off table)
    const panelShadow = this.scene.add.graphics();
    drawPaperShadow(panelShadow, cardLeft, cardTop, cardW, cardH);
    this.copCheckUI.add(panelShadow);

    // Cardboard panel with scissor-cut edges
    const panelGraphics = this.scene.add.graphics();
    drawScissorCutRect(panelGraphics, cardLeft, cardTop, cardW, cardH, PALETTE.cardboard, PALETTE.markerBlack);
    this.copCheckUI.add(panelGraphics);

    // Inner paper area (slightly inset, lighter)
    const innerPadding = 8;
    const innerGraphics = this.scene.add.graphics();
    innerGraphics.fillStyle(PALETTE.paperWhite, 0.9);
    innerGraphics.fillRoundedRect(
      cardLeft + innerPadding, cardTop + innerPadding,
      cardW - innerPadding * 2, cardH - innerPadding * 2, 2,
    );
    this.copCheckUI.add(innerGraphics);

    // Speaker badge — paper cutout, dark background, white text
    const badgeW = 110;
    const badgeH = 28;
    const badgeX = cardLeft + 20;
    const badgeY = cardTop - 6;

    const badgeShadow = this.scene.add.graphics();
    drawPaperShadow(badgeShadow, badgeX, badgeY, badgeW, badgeH, 2, 2);
    this.copCheckUI.add(badgeShadow);

    const badgeGraphics = this.scene.add.graphics();
    drawScissorCutRect(badgeGraphics, badgeX, badgeY, badgeW, badgeH, PALETTE.actionBlue, PALETTE.markerBlack);
    this.copCheckUI.add(badgeGraphics);

    const badgeText = this.scene.add.text(badgeX + badgeW / 2, badgeY + badgeH / 2, 'POLICE', {
      fontFamily: "'Bangers', cursive",
      fontSize: '16px',
      color: '#ffffff',
      letterSpacing: 3,
    });
    badgeText.setOrigin(0.5);
    this.copCheckUI.add(badgeText);

    // Description
    const desc = this.scene.add.text(cardX, cardTop + 40, scenario.description, {
      fontFamily: "'Bangers', cursive",
      fontSize: '14px',
      color: '#6b7280',
    });
    desc.setOrigin(0.5);
    this.copCheckUI.add(desc);

    // Cop's opening line — marker-style on paper
    const copLine = this.scene.add.text(cardX, cardTop + 80, scenario.openingLine, {
      fontFamily: "'Bangers', cursive",
      fontSize: '18px',
      color: '#1a1a1a',
      wordWrap: { width: cardW - 50 },
      align: 'center',
    });
    copLine.setOrigin(0.5);
    this.copCheckUI.add(copLine);

    // --- Neobrutalist choice buttons ---
    const btnStartY = cardTop + 140;
    const btnWidth = cardW - 60;
    const btnHeight = 56;
    const btnGap = 12;

    scenario.options.forEach((option, index) => {
      const btnY = btnStartY + index * (btnHeight + btnGap);
      const btnLeft = cardX - btnWidth / 2;

      // Button shadow (hard offset, neobrutalist)
      const btnShadowGfx = this.scene.add.graphics();
      btnShadowGfx.fillStyle(PALETTE.shadowDark, 0.5);
      btnShadowGfx.fillRoundedRect(btnLeft + 3, btnY + 3, btnWidth, btnHeight, 4);
      this.copCheckUI!.add(btnShadowGfx);

      // Button background using Graphics for explicit hit area
      const btnGfx = this.scene.add.graphics();
      btnGfx.fillStyle(PALETTE.paperWhite);
      btnGfx.fillRoundedRect(btnLeft, btnY, btnWidth, btnHeight, 4);
      btnGfx.lineStyle(3, PALETTE.markerBlack, 1);
      btnGfx.strokeRoundedRect(btnLeft, btnY, btnWidth, btnHeight, 4);

      // CRITICAL: Explicit hit area matching visual bounds exactly
      btnGfx.setInteractive(
        new Phaser.Geom.Rectangle(btnLeft, btnY, btnWidth, btnHeight),
        Phaser.Geom.Rectangle.Contains,
      );
      (btnGfx as Phaser.GameObjects.Graphics & { input: { cursor: string } }).input.cursor = 'pointer';
      this.copCheckUI!.add(btnGfx);

      const btnText = this.scene.add.text(cardX, btnY + btnHeight / 2, option.text, {
        fontFamily: "'Bangers', cursive",
        fontSize: '14px',
        color: '#1a1a1a',
        wordWrap: { width: btnWidth - 24 },
        align: 'center',
      });
      btnText.setOrigin(0.5);
      this.copCheckUI!.add(btnText);

      // Hover: highlight with safety yellow
      btnGfx.on('pointerover', () => {
        btnGfx.clear();
        btnGfx.fillStyle(PALETTE.safetyYellow);
        btnGfx.fillRoundedRect(btnLeft, btnY, btnWidth, btnHeight, 4);
        btnGfx.lineStyle(3, PALETTE.markerBlack, 1);
        btnGfx.strokeRoundedRect(btnLeft, btnY, btnWidth, btnHeight, 4);
      });
      btnGfx.on('pointerout', () => {
        btnGfx.clear();
        btnGfx.fillStyle(PALETTE.paperWhite);
        btnGfx.fillRoundedRect(btnLeft, btnY, btnWidth, btnHeight, 4);
        btnGfx.lineStyle(3, PALETTE.markerBlack, 1);
        btnGfx.strokeRoundedRect(btnLeft, btnY, btnWidth, btnHeight, 4);
      });
      btnGfx.on('pointerdown', () => {
        this.resolveCopCheck(option);
      });
    });

    // Timer indicator
    const timerText = this.scene.add.text(
      cardX, cardTop + cardH - 25,
      `Respond within ${scenario.autoResolveTime}s...`,
      {
        fontFamily: "'Bangers', cursive",
        fontSize: '13px',
        color: '#6b7280',
      },
    );
    timerText.setOrigin(0.5);
    timerText.setName('copTimerText');
    this.copCheckUI.add(timerText);
  }

  private resolveCopCheck(option: CopDialogueOption): void {
    if (!this.copCheckUI || !this.activeCopScenario) return;

    // Apply effects
    this.gameState.addConfidence(option.confidenceChange);
    if (option.scoreChange !== 0) {
      this.gameState.addScore(option.scoreChange);
    }

    // Show cop's reply
    this.showCopReply(option);
  }

  private showCopReply(option: CopDialogueOption): void {
    // Destroy old UI
    if (this.copCheckUI) {
      this.copCheckUI.destroy();
      this.copCheckUI = null;
    }

    const viewW = this.scene.scale.width;
    const viewH = this.scene.scale.height;

    this.copCheckUI = this.scene.add.container(0, 0);
    this.copCheckUI.setScrollFactor(0);
    this.copCheckUI.setDepth(180);

    const backdrop = this.scene.add.rectangle(viewW / 2, viewH / 2, viewW, viewH, 0x000000, 0.5);
    this.copCheckUI.add(backdrop);

    // --- Paper cutout result card ---
    const cardW = Math.min(viewW - 40, 460);
    const cardH = 220;
    const cardX = viewW / 2;
    const cardY = viewH / 2 - 30;
    const cardLeft = cardX - cardW / 2;
    const cardTop = cardY - cardH / 2;

    const borderColor = option.isCorrect ? PALETTE.stoplightGreen : PALETTE.stoplightRed;

    // Hard offset drop shadow
    const panelShadow = this.scene.add.graphics();
    drawPaperShadow(panelShadow, cardLeft, cardTop, cardW, cardH);
    this.copCheckUI.add(panelShadow);

    // Cardboard panel with scissor-cut edges
    const panelGraphics = this.scene.add.graphics();
    drawScissorCutRect(panelGraphics, cardLeft, cardTop, cardW, cardH, PALETTE.cardboard, PALETTE.markerBlack);
    this.copCheckUI.add(panelGraphics);

    // Inner paper with colored border (green=correct, red=wrong)
    const innerPad = 8;
    const innerGfx = this.scene.add.graphics();
    innerGfx.fillStyle(PALETTE.paperWhite, 0.95);
    innerGfx.fillRoundedRect(
      cardLeft + innerPad, cardTop + innerPad,
      cardW - innerPad * 2, cardH - innerPad * 2, 2,
    );
    innerGfx.lineStyle(3, borderColor, 1);
    innerGfx.strokeRoundedRect(
      cardLeft + innerPad, cardTop + innerPad,
      cardW - innerPad * 2, cardH - innerPad * 2, 2,
    );
    this.copCheckUI.add(innerGfx);

    // Result label
    const resultLabel = option.isCorrect
      ? 'FIRST AMENDMENT PROTECTED!'
      : 'That wasn\'t your best move...';
    const resultColorHex = option.isCorrect ? '#22c55e' : '#ef4444';

    const result = this.scene.add.text(cardX, cardTop + 35, resultLabel, {
      fontFamily: "'Bangers', cursive",
      fontSize: '20px',
      color: resultColorHex,
      stroke: '#1a1a1a',
      strokeThickness: 1,
    });
    result.setOrigin(0.5);
    this.copCheckUI.add(result);

    // Cop reply — marker style on paper
    const reply = this.scene.add.text(cardX, cardTop + 80, option.copReply, {
      fontFamily: "'Bangers', cursive",
      fontSize: '16px',
      color: '#1a1a1a',
      wordWrap: { width: cardW - 50 },
      align: 'center',
    });
    reply.setOrigin(0.5);
    this.copCheckUI.add(reply);

    // Confidence/score change indicator
    const changeLines: string[] = [];
    if (option.confidenceChange > 0) changeLines.push(`Confidence +${option.confidenceChange}%`);
    if (option.confidenceChange < 0) changeLines.push(`Confidence ${option.confidenceChange}%`);
    if (option.scoreChange > 0) changeLines.push(`Score +${option.scoreChange}`);
    if (option.scoreChange < 0) changeLines.push(`Score ${option.scoreChange}`);

    if (changeLines.length > 0) {
      const changes = this.scene.add.text(cardX, cardTop + 120, changeLines.join('  |  '), {
        fontFamily: "'Bangers', cursive",
        fontSize: '15px',
        color: resultColorHex,
        stroke: '#1a1a1a',
        strokeThickness: 1,
      });
      changes.setOrigin(0.5);
      this.copCheckUI.add(changes);
    }

    // Educational note for correct answer
    if (option.isCorrect) {
      const note = this.scene.add.text(
        cardX, cardTop + 155,
        'The First Amendment protects peaceful protest in public spaces.',
        {
          fontFamily: "'Bangers', cursive",
          fontSize: '13px',
          color: '#6b7280',
          wordWrap: { width: cardW - 50 },
          align: 'center',
        },
      );
      note.setOrigin(0.5);
      this.copCheckUI.add(note);
    }

    // Auto-dismiss after time penalty
    this.scene.time.delayedCall(option.timePenalty * 1000, () => {
      this.dismissCopCheck();
    });
  }

  private dismissCopCheck(): void {
    if (this.copCheckUI) {
      this.copCheckUI.destroy();
      this.copCheckUI = null;
    }
    this.activeCopScenario = null;
    this.endEvent();
  }

  private updateCopCheck(deltaSec: number): void {
    if (!this.activeCopScenario) return;

    this.copAutoResolveTimer -= deltaSec;

    // Update timer text
    if (this.copCheckUI) {
      const timerText = this.copCheckUI.getByName('copTimerText') as Phaser.GameObjects.Text;
      if (timerText) {
        const remaining = Math.ceil(this.copAutoResolveTimer);
        timerText.setText(`Respond within ${remaining}s...`);
        if (remaining <= 5) {
          timerText.setColor('#ef4444');
        }
      }
    }

    if (this.copAutoResolveTimer <= 0) {
      // Auto-resolve: player froze up
      this.gameState.addConfidence(this.activeCopScenario.autoResolvePenalty);
      this.showCopReply({
        text: '(You froze up)',
        isCorrect: false,
        confidenceChange: this.activeCopScenario.autoResolvePenalty,
        scoreChange: 0,
        copReply: '"...I\'ll be back." The officer walks away.',
        timePenalty: 3,
      });
    }
  }

  // ============================================================
  // WEATHER EVENT
  // ============================================================

  private startWeatherEvent(): void {
    // Trigger rain through WeatherSystem
    this.weatherSystem.startRain();

    // Show weather notification banner
    this.showEventBanner('It\'s starting to rain...', '#3b82f6', 3);
  }

  // ============================================================
  // KARMA EVENT — MAGA Truck Burnout Sequence
  // ============================================================

  private startKarmaEvent(): void {
    this.karmaPhaseIndex = 0;
    this.karmaPhaseTimer = 0;
    this.playKarmaPhase(0);
  }

  private playKarmaPhase(index: number): void {
    const phases = KARMA_DEFAULTS.phases;
    if (index >= phases.length) {
      // Sequence complete
      this.gameState.addConfidence(KARMA_DEFAULTS.totalConfidenceBoost);
      this.endEvent();
      return;
    }

    const phase = phases[index];
    this.karmaPhaseIndex = index;
    this.karmaPhaseTimer = phase.duration;

    // Apply phase effects
    if (phase.confidenceChange !== 0) {
      this.gameState.addConfidence(phase.confidenceChange);
    }
    if (phase.scoreChange !== 0) {
      this.gameState.addScore(phase.scoreChange);
    }

    // Show phase banner
    this.showKarmaBanner(phase);
  }

  private showKarmaBanner(phase: KarmaPhase): void {
    // Remove previous banner
    if (this.karmaUI) {
      this.karmaUI.destroy();
      this.karmaUI = null;
    }

    const viewW = this.scene.scale.width;
    const viewH = this.scene.scale.height;

    this.karmaUI = this.scene.add.container(0, 0);
    this.karmaUI.setScrollFactor(0);
    this.karmaUI.setDepth(170);

    // Banner across top-center — paper cutout style
    const bannerW = Math.min(viewW - 20, 600);
    const bannerH = 64;
    const bannerY = viewH * 0.2;
    const bannerLeft = (viewW - bannerW) / 2;
    const bannerTop = bannerY - bannerH / 2;

    // Determine fill color based on confidence change
    let fillColor = PALETTE.cardboard;
    if (phase.confidenceChange > 15) {
      fillColor = PALETTE.stoplightGreen;
    } else if (phase.confidenceChange < -5) {
      fillColor = PALETTE.stoplightRed;
    }

    // Hard offset shadow
    const shadowGfx = this.scene.add.graphics();
    drawPaperShadow(shadowGfx, bannerLeft, bannerTop, bannerW, bannerH);
    this.karmaUI.add(shadowGfx);

    // Scissor-cut paper banner
    const bannerGfx = this.scene.add.graphics();
    drawScissorCutRect(bannerGfx, bannerLeft, bannerTop, bannerW, bannerH, fillColor, PALETTE.markerBlack);
    this.karmaUI.add(bannerGfx);

    const text = this.scene.add.text(viewW / 2, bannerY, phase.bannerText, {
      fontFamily: "'Bangers', cursive",
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: bannerW - 30 },
      align: 'center',
      stroke: '#1a1a1a',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    this.karmaUI.add(text);

    // Score popup if applicable
    if (phase.scoreChange !== 0) {
      const sign = phase.scoreChange > 0 ? '+' : '';
      const scoreText = this.scene.add.text(
        viewW / 2, bannerY + bannerH / 2 + 18,
        `${sign}${phase.scoreChange}`,
        {
          fontFamily: "'Bangers', cursive",
          fontSize: '24px',
          color: phase.scoreChange > 0 ? '#22c55e' : '#ef4444',
          stroke: '#1a1a1a',
          strokeThickness: 3,
        },
      );
      scoreText.setOrigin(0.5);
      this.karmaUI.add(scoreText);

      this.scene.tweens.add({
        targets: scoreText,
        y: bannerY + bannerH / 2 + 8,
        alpha: 0,
        duration: 1500,
        delay: 500,
        ease: 'Quad.easeOut',
      });
    }
  }

  private updateKarma(deltaSec: number): void {
    this.karmaPhaseTimer -= deltaSec;

    if (this.karmaPhaseTimer <= 0) {
      // Advance to next phase
      this.playKarmaPhase(this.karmaPhaseIndex + 1);

      // If all phases done, clean up karma UI
      if (this.karmaPhaseIndex >= KARMA_DEFAULTS.phases.length) {
        if (this.karmaUI) {
          // Fade out the final banner
          this.scene.tweens.add({
            targets: this.karmaUI,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
              if (this.karmaUI) {
                this.karmaUI.destroy();
                this.karmaUI = null;
              }
            },
          });
        }
      }
    }
  }

  // ============================================================
  // SHARED UI HELPERS
  // ============================================================

  /**
   * Show a brief notification banner (for weather, etc).
   */
  private showEventBanner(text: string, color: string, duration: number): void {
    const viewW = this.scene.scale.width;

    // Paper cutout notification banner
    const bannerW = Math.min(viewW - 40, 400);
    const bannerH = 44;
    const bannerX = viewW / 2;
    const bannerY = 120;
    const bannerLeft = bannerX - bannerW / 2;
    const bannerTop = bannerY - bannerH / 2;

    const bannerContainer = this.scene.add.container(0, 0);
    bannerContainer.setScrollFactor(0);
    bannerContainer.setDepth(160);

    // Shadow
    const shadowGfx = this.scene.add.graphics();
    drawPaperShadow(shadowGfx, bannerLeft, bannerTop, bannerW, bannerH, 2, 2);
    bannerContainer.add(shadowGfx);

    // Scissor-cut cardboard banner
    const bannerGfx = this.scene.add.graphics();
    drawScissorCutRect(bannerGfx, bannerLeft, bannerTop, bannerW, bannerH, PALETTE.cardboard, PALETTE.markerBlack);
    bannerContainer.add(bannerGfx);

    const bannerText = this.scene.add.text(bannerX, bannerY, text, {
      fontFamily: "'Bangers', cursive",
      fontSize: '18px',
      color,
      stroke: '#1a1a1a',
      strokeThickness: 2,
    });
    bannerText.setOrigin(0.5);
    bannerContainer.add(bannerText);

    this.scene.tweens.add({
      targets: bannerContainer,
      alpha: 0,
      y: -20,
      duration: 1000,
      delay: duration * 1000,
      ease: 'Quad.easeOut',
      onComplete: () => bannerContainer.destroy(),
    });
  }

  // ============================================================
  // GETTERS
  // ============================================================

  getEventState(): EventState {
    return this.currentEventState;
  }

  isEventInProgress(): boolean {
    return this.isEventActive;
  }

  getEventsTriggered(): EventType[] {
    return [...this.eventsTriggered];
  }

  destroy(): void {
    if (this.copCheckUI) {
      this.copCheckUI.destroy();
      this.copCheckUI = null;
    }
    if (this.karmaUI) {
      this.karmaUI.destroy();
      this.karmaUI = null;
    }
    this.removeAllListeners();
  }
}
