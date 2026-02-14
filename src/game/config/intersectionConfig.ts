/**
 * IntersectionConfig — Data-driven map configuration.
 *
 * The Intersection is the first config loaded into the traffic engine.
 * The Overpass would be a second config. Same engine, different data.
 */

export type TrafficDirection = 'north' | 'south' | 'east' | 'west';
export type LightColor = 'green' | 'yellow' | 'red';

export interface LightPhase {
  /** Which directions have green */
  greenDirections: TrafficDirection[];
  /** Duration of this phase in milliseconds */
  duration: number;
  /** Light color for the green directions (others are red) */
  color: LightColor;
}

export interface LaneDefinition {
  direction: TrafficDirection;
  /** Lane index (0 = right lane, 1 = left lane for that direction) */
  laneIndex: number;
  /** World coordinates for spawn point */
  spawnX: number;
  spawnY: number;
  /** World coordinates for despawn point (off screen) */
  despawnX: number;
  despawnY: number;
  /** Stop position (where cars wait at red lights) */
  stopX: number;
  stopY: number;
}

export interface IntersectionMapConfig {
  /** World dimensions */
  worldWidth: number;
  worldHeight: number;

  /** Intersection center point */
  centerX: number;
  centerY: number;

  /** Road width (total, both lanes) */
  roadWidth: number;

  /** Lane width (single lane) */
  laneWidth: number;

  /** Traffic light cycle phases */
  lightCycle: LightPhase[];

  /** Lane definitions for car spawning/movement */
  lanes: LaneDefinition[];

  /** Car spawning config */
  spawnRateMs: { min: number; max: number };
  carSpeed: { min: number; max: number };

  /** Player position */
  playerX: number;
  playerY: number;

  /** Session duration in seconds */
  sessionDuration: number;
}

// Road geometry constants
const ROAD_WIDTH = 160; // Total road width (2 lanes)
const LANE_WIDTH = 80;  // Single lane width
const WORLD_W = 1920;
const WORLD_H = 1280;
const CENTER_X = WORLD_W / 2;
const CENTER_Y = WORLD_H / 2;

// Stop lines: just outside the intersection box
const STOP_OFFSET = ROAD_WIDTH / 2 + 30;

export const INTERSECTION_CONFIG: IntersectionMapConfig = {
  worldWidth: WORLD_W,
  worldHeight: WORLD_H,
  centerX: CENTER_X,
  centerY: CENTER_Y,
  roadWidth: ROAD_WIDTH,
  laneWidth: LANE_WIDTH,

  // ~30 second full rotation, 4 phases
  lightCycle: [
    { greenDirections: ['north', 'south'], duration: 10000, color: 'green' },
    { greenDirections: [],                 duration: 2500,  color: 'red' },    // all red
    { greenDirections: ['east', 'west'],   duration: 10000, color: 'green' },
    { greenDirections: [],                 duration: 2500,  color: 'red' },    // all red
  ],

  lanes: [
    // Northbound (driving up) — right side of vertical road
    {
      direction: 'north',
      laneIndex: 0,
      spawnX: CENTER_X + LANE_WIDTH / 2,
      spawnY: WORLD_H + 50,
      despawnX: CENTER_X + LANE_WIDTH / 2,
      despawnY: -50,
      stopX: CENTER_X + LANE_WIDTH / 2,
      stopY: CENTER_Y + STOP_OFFSET,
    },
    // Southbound (driving down) — left side of vertical road
    {
      direction: 'south',
      laneIndex: 0,
      spawnX: CENTER_X - LANE_WIDTH / 2,
      spawnY: -50,
      despawnX: CENTER_X - LANE_WIDTH / 2,
      despawnY: WORLD_H + 50,
      stopX: CENTER_X - LANE_WIDTH / 2,
      stopY: CENTER_Y - STOP_OFFSET,
    },
    // Eastbound (driving right) — bottom of horizontal road
    {
      direction: 'east',
      laneIndex: 0,
      spawnX: -50,
      spawnY: CENTER_Y + LANE_WIDTH / 2,
      despawnX: WORLD_W + 50,
      despawnY: CENTER_Y + LANE_WIDTH / 2,
      stopX: CENTER_X - STOP_OFFSET,
      stopY: CENTER_Y + LANE_WIDTH / 2,
    },
    // Westbound (driving left) — top of horizontal road
    {
      direction: 'west',
      laneIndex: 0,
      spawnX: WORLD_W + 50,
      spawnY: CENTER_Y - LANE_WIDTH / 2,
      despawnX: -50,
      despawnY: CENTER_Y - LANE_WIDTH / 2,
      stopX: CENTER_X + STOP_OFFSET,
      stopY: CENTER_Y - LANE_WIDTH / 2,
    },
  ],

  spawnRateMs: { min: 1200, max: 2800 },
  carSpeed: { min: 150, max: 250 },

  // Player stands at bottom-right corner of intersection
  playerX: CENTER_X + ROAD_WIDTH / 2 + 60,
  playerY: CENTER_Y + ROAD_WIDTH / 2 + 60,

  sessionDuration: 180, // 3 minutes
};
