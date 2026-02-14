import Phaser from 'phaser';
import type { TrafficDirection, LaneDefinition } from '../config/intersectionConfig';

/**
 * Car entity — Reusable car that drives through the intersection.
 *
 * Same car entity works on any map. Position, speed, direction,
 * and lane are configurable. Cars are pooled for performance.
 */

// Car colors for visual variety
const CAR_COLORS = [
  0x3b82f6, // blue
  0xef4444, // red
  0x22c55e, // green
  0xfbbf24, // yellow
  0x8b5cf6, // purple
  0xf97316, // orange
  0x64748b, // slate
  0xffffff, // white
  0x1e293b, // dark
  0x14b8a6, // teal
];

export class Car extends Phaser.GameObjects.Container {
  public direction: TrafficDirection;
  public lane: LaneDefinition;
  public speed: number;
  public hasBeenReached: boolean = false;
  public hasPassed: boolean = false;
  public isStopped: boolean = false;

  private carBody: Phaser.GameObjects.Rectangle;
  private carWindshield: Phaser.GameObjects.Rectangle;
  private carWidth: number = 30;
  private carLength: number = 50;

  constructor(scene: Phaser.Scene, lane: LaneDefinition, speed: number) {
    super(scene, lane.spawnX, lane.spawnY);

    this.direction = lane.direction;
    this.lane = lane;
    this.speed = speed;

    // Rotate car based on direction
    const isVertical = this.direction === 'north' || this.direction === 'south';

    const bodyW = isVertical ? this.carWidth : this.carLength;
    const bodyH = isVertical ? this.carLength : this.carWidth;

    // Random car color
    const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];

    // Car body
    this.carBody = scene.add.rectangle(0, 0, bodyW, bodyH, color);
    this.carBody.setStrokeStyle(2, 0x000000, 0.5);
    this.add(this.carBody);

    // Windshield (front of car)
    const wsW = isVertical ? bodyW * 0.7 : bodyW * 0.2;
    const wsH = isVertical ? bodyH * 0.2 : bodyH * 0.7;
    let wsX = 0;
    let wsY = 0;

    switch (this.direction) {
      case 'north': wsY = -bodyH * 0.25; break;
      case 'south': wsY = bodyH * 0.25; break;
      case 'east':  wsX = bodyW * 0.25; break;
      case 'west':  wsX = -bodyW * 0.25; break;
    }

    this.carWindshield = scene.add.rectangle(wsX, wsY, wsW, wsH, 0x87ceeb, 0.8);
    this.add(this.carWindshield);

    scene.add.existing(this);
  }

  update(_time: number, delta: number): void {
    if (this.isStopped) return;

    const moveAmount = this.speed * (delta / 1000);

    switch (this.direction) {
      case 'north':
        this.y -= moveAmount;
        break;
      case 'south':
        this.y += moveAmount;
        break;
      case 'east':
        this.x += moveAmount;
        break;
      case 'west':
        this.x -= moveAmount;
        break;
    }
  }

  /** Check if car has moved off screen */
  isOffScreen(worldWidth: number, worldHeight: number): boolean {
    const margin = 100;
    return (
      this.x < -margin ||
      this.x > worldWidth + margin ||
      this.y < -margin ||
      this.y > worldHeight + margin
    );
  }

  /** Check if car should stop at a red light */
  shouldStop(isGreen: boolean): boolean {
    if (isGreen) {
      this.isStopped = false;
      return false;
    }

    // Check if car is approaching the stop line
    const threshold = 10;
    switch (this.direction) {
      case 'north':
        if (this.y > this.lane.stopY - threshold && this.y < this.lane.stopY + this.carLength) {
          this.isStopped = true;
          return true;
        }
        break;
      case 'south':
        if (this.y < this.lane.stopY + threshold && this.y > this.lane.stopY - this.carLength) {
          this.isStopped = true;
          return true;
        }
        break;
      case 'east':
        if (this.x < this.lane.stopX + threshold && this.x > this.lane.stopX - this.carLength) {
          this.isStopped = true;
          return true;
        }
        break;
      case 'west':
        if (this.x > this.lane.stopX - threshold && this.x < this.lane.stopX + this.carLength) {
          this.isStopped = true;
          return true;
        }
        break;
    }

    return false;
  }

  /** Check if car is past the stop line (already in intersection) */
  isPastStopLine(): boolean {
    switch (this.direction) {
      case 'north': return this.y < this.lane.stopY;
      case 'south': return this.y > this.lane.stopY;
      case 'east':  return this.x > this.lane.stopX;
      case 'west':  return this.x < this.lane.stopX;
    }
  }

  /** Reset for object pool reuse */
  resetCar(lane: LaneDefinition, speed: number): void {
    this.direction = lane.direction;
    this.lane = lane;
    this.speed = speed;
    this.x = lane.spawnX;
    this.y = lane.spawnY;
    this.hasBeenReached = false;
    this.hasPassed = false;
    this.isStopped = false;
    this.setActive(true);
    this.setVisible(true);
  }

  getBounds(): Phaser.Geom.Rectangle {
    const isVertical = this.direction === 'north' || this.direction === 'south';
    const w = isVertical ? this.carWidth : this.carLength;
    const h = isVertical ? this.carLength : this.carWidth;
    return new Phaser.Geom.Rectangle(this.x - w / 2, this.y - h / 2, w, h);
  }
}
