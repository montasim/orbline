// Static game content for Orbline: levels, skins, power-ups, achievements, daily challenges.

export const GAME_NAME = 'Orbline'

/** Hitbox sizes match the pre-redesign obstacles, so difficulty is unchanged. */
export type ObstacleType = 'boulder' | 'iceblock' | 'icespikes' | 'pillar' | 'flyer'

export interface BgTheme {
  /** top → horizon */
  skyGradient: [string, string, string]
  /** the two colours each aurora ribbon blends between */
  aurora: [string, string]
  peakColor: string
  midgroundColor: string
  groundColor: string
  /** glowing rim of the ice sheet; also tints obstacles */
  groundAccent: string
  crackColor: string
  /** 0–1: how heavy the snowfall is */
  snow: number
}

export interface Level {
  level: number
  name: string
  title: string
  minDistance: number
  maxDistance: number
  baseSpeed: number
  obstacleIntervalMin: number
  obstacleIntervalMax: number
  coinSpawnChance: number
  powerupSpawnChance: number
  allowedObstacles: ObstacleType[]
  bgTheme: BgTheme
}

export const LEVELS: Level[] = [
  {
    level: 1,
    name: 'Cub',
    title: 'Polar Dusk',
    minDistance: 0,
    maxDistance: 300,
    baseSpeed: 7,
    obstacleIntervalMin: 1200,
    obstacleIntervalMax: 1800,
    coinSpawnChance: 0.65,
    powerupSpawnChance: 0.14,
    allowedObstacles: ['boulder', 'iceblock'],
    bgTheme: {
      skyGradient: ['#050b1a', '#0b1a3a', '#1c2f5c'],
      aurora: ['#2dd4bf', '#a7f3d0'],
      peakColor: '#1b2a4a',
      midgroundColor: '#13213d',
      groundColor: '#dbeafe',
      groundAccent: '#5eead4',
      crackColor: 'rgba(56, 120, 160, 0.35)',
      snow: 0.35,
    },
  },
  {
    level: 2,
    name: 'Scout',
    title: 'Aurora Field',
    minDistance: 300,
    maxDistance: 800,
    baseSpeed: 8.8,
    obstacleIntervalMin: 950,
    obstacleIntervalMax: 1500,
    coinSpawnChance: 0.75,
    powerupSpawnChance: 0.18,
    allowedObstacles: ['boulder', 'iceblock', 'icespikes', 'flyer'],
    bgTheme: {
      skyGradient: ['#03100f', '#06302c', '#0c4a45'],
      aurora: ['#34d399', '#22d3ee'],
      peakColor: '#0f3a3a',
      midgroundColor: '#0a2a2b',
      groundColor: '#d1fae5',
      groundAccent: '#34d399',
      crackColor: 'rgba(20, 110, 100, 0.35)',
      snow: 0.2,
    },
  },
  {
    level: 3,
    name: 'Ranger',
    title: 'Blizzard Pass',
    minDistance: 800,
    maxDistance: 1500,
    baseSpeed: 10.6,
    obstacleIntervalMin: 800,
    obstacleIntervalMax: 1300,
    coinSpawnChance: 0.8,
    powerupSpawnChance: 0.22,
    allowedObstacles: ['iceblock', 'icespikes', 'pillar', 'flyer'],
    bgTheme: {
      skyGradient: ['#0e1420', '#26324a', '#4a5a78'],
      aurora: ['#93c5fd', '#e0e7ff'],
      peakColor: '#3a4660',
      midgroundColor: '#2a3550',
      groundColor: '#e2e8f0',
      groundAccent: '#93c5fd',
      crackColor: 'rgba(70, 90, 130, 0.4)',
      snow: 1,
    },
  },
  {
    level: 4,
    name: 'Legend',
    title: 'Starfall Summit',
    minDistance: 1500,
    maxDistance: Number.POSITIVE_INFINITY,
    baseSpeed: 12.6,
    obstacleIntervalMin: 680,
    obstacleIntervalMax: 1100,
    coinSpawnChance: 0.85,
    powerupSpawnChance: 0.25,
    allowedObstacles: ['boulder', 'iceblock', 'icespikes', 'pillar', 'flyer'],
    bgTheme: {
      skyGradient: ['#0a0418', '#1e0b3a', '#3b1460'],
      aurora: ['#e879f9', '#818cf8'],
      peakColor: '#2a1748',
      midgroundColor: '#1d1036',
      groundColor: '#ede9fe',
      groundAccent: '#f0abfc',
      crackColor: 'rgba(120, 70, 170, 0.35)',
      snow: 0.5,
    },
  },
]

export function levelForDistance(distance: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (distance >= LEVELS[i].minDistance) return LEVELS[i]
  }
  return LEVELS[0]
}

/** A runner-orb colourway: `color` is the core, `accent` the rim light and trail. */
export interface Skin {
  id: string
  name: string
  desc: string
  price: number
  color: string
  glowColor: string
  trailColor: string
  accent: string
  badge: string
}

export const SKINS: Skin[] = [
  {
    id: 'frost',
    name: 'Frost Orb',
    desc: 'A cool teal core that hums like glacier ice.',
    price: 0,
    color: '#14b8a6',
    glowColor: 'rgba(45, 212, 191, 0.8)',
    trailColor: 'rgba(45, 212, 191, 0.4)',
    accent: '#5eead4',
    badge: 'Classic',
  },
  {
    id: 'ember',
    name: 'Ember Orb',
    desc: 'A warm sunset glow that leaves a trail of sparks.',
    price: 250,
    color: '#f97316',
    glowColor: 'rgba(251, 146, 60, 0.8)',
    trailColor: 'rgba(251, 146, 60, 0.4)',
    accent: '#fdba74',
    badge: 'Warm',
  },
  {
    id: 'aurora',
    name: 'Aurora Orb',
    desc: 'Spun from the northern lights, shimmering magenta.',
    price: 500,
    color: '#c026d3',
    glowColor: 'rgba(232, 121, 249, 0.8)',
    trailColor: 'rgba(232, 121, 249, 0.4)',
    accent: '#f0abfc',
    badge: 'Mystic',
  },
  {
    id: 'starlit',
    name: 'Starlit Orb',
    desc: 'A legendary indigo core ringed in starlight gold.',
    price: 1000,
    color: '#4f46e5',
    glowColor: 'rgba(253, 224, 71, 0.9)',
    trailColor: 'rgba(253, 224, 71, 0.5)',
    accent: '#fde047',
    badge: 'Legendary',
  },
]

export const skinById = (id: string): Skin =>
  SKINS.find((s) => s.id === id) ?? SKINS[0]

export type IconName =
  | 'Award'
  | 'Trophy'
  | 'Shirt'
  | 'Zap'
  | 'Shield'
  | 'Flame'
  | 'Coins'
  | 'Footprints'
  | 'Crown'
  | 'Wind'
  | 'Magnet'

/** ids are referenced by engine logic; names/colours are presentation. */
export const POWERUPS = {
  SHIELD: {
    id: 'shield',
    name: 'Frost Ward',
    desc: 'An ice bubble that absorbs 1 crash',
    color: '#7dd3fc',
    glowColor: 'rgba(125, 211, 252, 0.9)',
    duration: 0,
    icon: 'Shield',
  },
  MAGNET: {
    id: 'magnet',
    name: 'Crystal Lure',
    desc: 'Draws nearby crystals to you',
    color: '#f0abfc',
    glowColor: 'rgba(240, 171, 252, 0.9)',
    duration: 8,
    icon: 'Magnet',
  },
  SPEED: {
    id: 'speedBoost',
    name: 'Aurora Rush',
    desc: 'Ride the lights: speed, invincibility & 2x score',
    color: '#5eead4',
    glowColor: 'rgba(94, 234, 212, 0.9)',
    duration: 5,
    icon: 'Zap',
  },
} as const

export type PowerupDef = (typeof POWERUPS)[keyof typeof POWERUPS]

export interface Achievement {
  id: string
  title: string
  desc: string
  reward: number
  icon: IconName
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_run', title: 'First Tracks', desc: 'Complete your first run', reward: 50, icon: 'Footprints' },
  { id: 'reach_500m', title: 'Trailblazer', desc: 'Reach 500m in a single run', reward: 100, icon: 'Flame' },
  { id: 'reach_1500m', title: 'Summit Seeker', desc: 'Reach Starfall Summit (1500m)', reward: 300, icon: 'Crown' },
  { id: 'double_jumper', title: 'Sky Hopper', desc: 'Perform 20 double jumps in one run', reward: 100, icon: 'Wind' },
  { id: 'coin_hoarder', title: 'Crystal Keeper', desc: 'Collect 100 crystals in total', reward: 150, icon: 'Coins' },
  { id: 'shield_savior', title: 'Frostbound', desc: 'Survive a crash with Frost Ward', reward: 120, icon: 'Shield' },
  { id: 'speed_demon', title: 'Northern Lights', desc: 'Use Aurora Rush 3 times', reward: 150, icon: 'Zap' },
]

export type DailyType = 'distance' | 'coins' | 'doubleJumps' | 'powerups'

export interface DailyTemplate {
  id: string
  title: string
  desc: string
  target: number
  reward: number
  type: DailyType
}

export const DAILY_CHALLENGES: DailyTemplate[] = [
  { id: 'daily_distance', title: 'Long Trek', desc: 'Reach 600m in any single run today', target: 600, reward: 150, type: 'distance' },
  { id: 'daily_coins', title: 'Crystal Gatherer', desc: 'Collect 40 crystals today', target: 40, reward: 120, type: 'coins' },
  { id: 'daily_jumps', title: 'Snow Acrobat', desc: 'Perform 25 double jumps today', target: 25, reward: 100, type: 'doubleJumps' },
  { id: 'daily_powerups', title: 'Charged Up', desc: 'Collect 4 power-ups today', target: 4, reward: 140, type: 'powerups' },
]

export interface Settings {
  soundEnabled: boolean
  musicEnabled: boolean
  particlesQuality: 'low' | 'medium' | 'high'
}

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  musicEnabled: true,
  particlesQuality: 'high',
}
