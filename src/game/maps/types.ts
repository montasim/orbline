// A map ("region") is a complete visual world for the same game: speeds, distances, hitboxes and
// spawn rules come from LEVELS and are identical on every map, so difficulty and the server's
// anti-cheat bounds never depend on which map is played.
import type { Coin, Obstacle } from '../engine/obstacles'

/** Difficulty stage 0–3, i.e. LEVELS[tier]; maps restyle each stage. */
export type Tier = 0 | 1 | 2 | 3

/** Everything behind the runner: sky, light source, parallax layers, ground, weather. */
export interface Scene {
  resize(width: number, height: number, groundY: number): void
  /** called once per frame with the current world scroll speed (px/frame) */
  update(speed: number): void
  /** must paint every pixel (no clearRect is done before it) */
  draw(ctx: CanvasRenderingContext2D, tier: Tier): void
}

/** Optional per-map look for obstacles and pickups. Return false to fall back to the default art. */
export interface Skin {
  /** draw inside the obstacle's existing box (x, y, width, height); `type` keeps its gameplay meaning */
  drawObstacle?(ctx: CanvasRenderingContext2D, o: Obstacle, tier: Tier): boolean
  drawCrystal?(ctx: CanvasRenderingContext2D, c: Coin, tier: Tier): boolean
}

export interface TierStyle {
  /** shown in the HUD and level-up toast, e.g. "Polar Dusk" */
  title: string
  /** rank-style name, e.g. "Cub" */
  name: string
  /** the map's highlight colour at this stage: HUD chip, particles, level-up confetti */
  accent: string
}

export interface GameMap {
  id: string
  name: string
  tagline: string
  tiers: [TierStyle, TierStyle, TierStyle, TierStyle]
  /** three colours for the picker card: sky, land, accent */
  swatch: [string, string, string]
  /** what pickups are called on this map (the currency itself is shared) */
  crystalName: string
  createScene(width: number, height: number, groundY: number): Scene
  skin: Skin
}
