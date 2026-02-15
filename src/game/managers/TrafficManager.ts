import Phaser from 'phaser';
import type { IntersectionMapConfig, LaneDefinition } from '../config/intersectionConfig';
import type { DifficultyConfig } from '../config/difficultyConfig';
import { TrafficLightSystem } from '../systems/TrafficLightSystem';
import { Car } from '../entities/Car';

/**
 * TrafficManager — Handles car spawning, pooling, and updates.
 *
 * Responsibilities:
 * - Spawn cars on lanes based on spawn timers
 * - Pool destroyed cars for reuse
 * - Update all active cars
 * - Detect car-ahead for queue behavior
 * - Remove off-screen cars
 */
export class TrafficManager {
  private cars: Car[] = [];
  private carPool: Car[] = [];
  private spawnTimers: Map<string, number> = new Map();

  constructor(
    private scene: Phaser.Scene,
    private config: IntersectionMapConfig,
    private difficulty: DifficultyConfig,
    private trafficLights: TrafficLightSystem,
  ) {}

  /**
   * Initialize spawn timers for all lanes.
   * Must be called after construction, before update.
   */
  initSpawnTimers(): void {
    for (const lane of this.config.lanes) {
      const key = `${lane.direction}-${lane.laneIndex}`;
      this.spawnTimers.set(key, this.getRandomSpawnDelay());
    }
  }

  /**
   * Update spawn timers and spawn new cars.
   */
  updateSpawning(delta: number): void {
    for (const lane of this.config.lanes) {
      const key = `${lane.direction}-${lane.laneIndex}`;
      let timer = this.spawnTimers.get(key)!;
      timer -= delta;

      if (timer <= 0) {
        const isGreen = this.trafficLights.isGreen(lane.direction);
        const shouldSpawn = isGreen || Math.random() < 0.3;

        if (shouldSpawn) {
          this.spawnCar(lane);
        }

        this.spawnTimers.set(key, this.getRandomSpawnDelay());
      } else {
        this.spawnTimers.set(key, timer);
      }
    }
  }

  /**
   * Update all active cars: stop logic, movement, cleanup.
   */
  updateCars(time: number, delta: number): void {
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];

      if (!car.active) continue;

      const isGreen = this.trafficLights.isGreen(car.direction);

      if (!car.isPastStopLine()) {
        const carAhead = this.findCarAhead(car);
        if (carAhead && carAhead.isStopped) {
          const dist = this.getDistanceBetweenCars(car, carAhead);
          if (dist < 70) {
            car.isStopped = true;
          }
        } else {
          car.shouldStop(isGreen);
        }
      } else {
        car.isStopped = false;
      }

      car.update(time, delta);

      if (car.isOffScreen(this.config.worldWidth, this.config.worldHeight)) {
        // Note: missed car tracking happens in PlayerController via cone intersection
        car.setActive(false);
        car.setVisible(false);
        this.cars.splice(i, 1);
        this.carPool.push(car);
      }
    }
  }

  /**
   * Get all active cars (for cone intersection detection).
   */
  getCars(): Car[] {
    return this.cars;
  }

  /**
   * Find the car directly ahead in the same lane.
   */
  findCarAhead(car: Car): Car | null {
    let closest: Car | null = null;
    let closestDist = Infinity;

    for (const other of this.cars) {
      if (other === car || !other.active || other.direction !== car.direction) continue;
      if (other.lane.laneIndex !== car.lane.laneIndex) continue;

      let ahead = false;
      switch (car.direction) {
        case 'north': ahead = other.y < car.y; break;
        case 'south': ahead = other.y > car.y; break;
        case 'east':  ahead = other.x > car.x; break;
        case 'west':  ahead = other.x < car.x; break;
      }

      if (ahead) {
        const dist = this.getDistanceBetweenCars(car, other);
        if (dist < closestDist) {
          closestDist = dist;
          closest = other;
        }
      }
    }

    return closest;
  }

  /**
   * Calculate distance between two cars.
   */
  getDistanceBetweenCars(a: Car, b: Car): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Destroy all cars and pooled cars.
   */
  destroy(): void {
    for (const car of this.cars) {
      car.destroy();
    }
    for (const car of this.carPool) {
      car.destroy();
    }
    this.cars = [];
    this.carPool = [];
  }

  private getRandomSpawnDelay(): number {
    const { min, max } = this.config.spawnRateMs;
    const base = Phaser.Math.Between(min, max);
    return base / this.difficulty.trafficDensityMultiplier;
  }

  private getRandomCarSpeed(): number {
    const { min, max } = this.config.carSpeed;
    const base = Phaser.Math.Between(min, max);
    return base * this.difficulty.trafficSpeedMultiplier;
  }

  private spawnCar(lane: LaneDefinition): void {
    const tooClose = this.cars.some((car) => {
      if (!car.active || car.direction !== lane.direction) return false;
      const dx = car.x - lane.spawnX;
      const dy = car.y - lane.spawnY;
      return Math.sqrt(dx * dx + dy * dy) < 80;
    });

    if (tooClose) return;

    const speed = this.getRandomCarSpeed();

    // Reuse pooled car if available, otherwise create new
    const pooled = this.carPool.pop();
    if (pooled) {
      pooled.resetCar(lane, speed);
      pooled.setDepth(8);
      this.cars.push(pooled);
    } else {
      const car = new Car(this.scene, lane, speed);
      car.setDepth(8);
      this.cars.push(car);
    }
  }
}
