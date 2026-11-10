// Static game content: levels, skins, power-ups, achievements, daily challenges.

export type ObstacleType = 'stone' | 'crate' | 'spikes' | 'laser' | 'drone'

export interface BgTheme {
  skyGradient: [string, string, string]
  mountainColor: string
  midgroundColor: string
  groundColor: string
  groundAccent: string
  moonColor: string
  moonGlow: string
  gridColor: string
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
    name: 'Beginner',
    title: 'Twilight Forest',
    minDistance: 0,
    maxDistance: 300,
    baseSpeed: 7,
    obstacleIntervalMin: 1200,
    obstacleIntervalMax: 1800,
    coinSpawnChance: 0.65,
    powerupSpawnChance: 0.14,
    allowedObstacles: ['stone', 'crate'],
    bgTheme: {
      skyGradient: ['#070712', '#151028', '#23153c'],
      mountainColor: '#0f0c1d',
      midgroundColor: '#17132a',
      groundColor: '#100c22',
      groundAccent: '#a855f7',
      moonColor: '#e9d5ff',
      moonGlow: 'rgba(168, 85, 247, 0.4)',
      gridColor: 'rgba(168, 85, 247, 0.15)',
    },
  },
  {
    level: 2,
    name: 'Intermediate',
    title: 'Neon Metropolis',
    minDistance: 300,
    maxDistance: 800,
    baseSpeed: 8.8,
    obstacleIntervalMin: 950,
    obstacleIntervalMax: 1500,
    coinSpawnChance: 0.75,
    powerupSpawnChance: 0.18,
    allowedObstacles: ['stone', 'crate', 'spikes', 'drone'],
    bgTheme: {
      skyGradient: ['#040a16', '#091c30', '#0a2a44'],
      mountainColor: '#051424',
      midgroundColor: '#0b263e',
      groundColor: '#071828',
      groundAccent: '#00f5ff',
      moonColor: '#a5f3fc',
      moonGlow: 'rgba(0, 245, 255, 0.4)',
      gridColor: 'rgba(0, 245, 255, 0.18)',
    },
  },
  {
    level: 3,
    name: 'Advanced',
    title: 'Crimson Citadel',
    minDistance: 800,
    maxDistance: 1500,
    baseSpeed: 10.6,
    obstacleIntervalMin: 800,
    obstacleIntervalMax: 1300,
    coinSpawnChance: 0.8,
    powerupSpawnChance: 0.22,
    allowedObstacles: ['crate', 'spikes', 'laser', 'drone'],
    bgTheme: {
      skyGradient: ['#120408', '#2d0912', '#440f1a'],
      mountainColor: '#20070e',
      midgroundColor: '#320b16',
      groundColor: '#1a050b',
      groundAccent: '#ef4444',
      moonColor: '#fca5a5',
      moonGlow: 'rgba(239, 68, 68, 0.45)',
      gridColor: 'rgba(239, 68, 68, 0.2)',
    },
  },
  {
    level: 4,
    name: 'Shadow Master',
    title: 'Abyssal Void',
    minDistance: 1500,
    maxDistance: Number.POSITIVE_INFINITY,
    baseSpeed: 12.6,
    obstacleIntervalMin: 680,
    obstacleIntervalMax: 1100,
    coinSpawnChance: 0.85,
    powerupSpawnChance: 0.25,
    allowedObstacles: ['stone', 'crate', 'spikes', 'laser', 'drone'],
    bgTheme: {
      skyGradient: ['#080410', '#180728', '#2b0b42'],
      mountainColor: '#120420',
      midgroundColor: '#220838',
      groundColor: '#0d0317',
      groundAccent: '#eab308',
      moonColor: '#fde047',
      moonGlow: 'rgba(234, 179, 8, 0.5)',
      gridColor: 'rgba(234, 179, 8, 0.25)',
    },
  },
]

export function levelForDistance(distance: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (distance >= LEVELS[i].minDistance) return LEVELS[i]
  }
  return LEVELS[0]
}

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
    id: 'ninja',
    name: 'Shadow Shinobi',
    desc: 'The stealth master clad in midnight silk and violet mist.',
    price: 0,
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    trailColor: 'rgba(168, 85, 247, 0.4)',
    accent: '#c084fc',
    badge: 'Classic',
  },
  {
    id: 'cyber',
    name: 'Neon Phantom',
    desc: 'Augmented cyber-runner powered by hyper-charged turquoise energy.',
    price: 250,
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.8)',
    trailColor: 'rgba(6, 182, 212, 0.4)',
    accent: '#22d3ee',
    badge: 'Cyber',
  },
  {
    id: 'specter',
    name: 'Crimson Specter',
    desc: 'A fiery demon shadow that leaves scorched embers with each jump.',
    price: 500,
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.8)',
    trailColor: 'rgba(239, 68, 68, 0.4)',
    accent: '#f87171',
    badge: 'Infernal',
  },
  {
    id: 'gold',
    name: 'Solar Sovereign',
    desc: 'Legendary shadow forged in pure solar gold and divine light.',
    price: 1000,
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.9)',
    trailColor: 'rgba(234, 179, 8, 0.5)',
    accent: '#fde047',
    badge: 'Mythic',
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

export const POWERUPS = {
  SHIELD: {
    id: 'shield',
    name: 'Shadow Aegis',
    desc: 'Absorbs 1 fatal collision',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.9)',
    duration: 0,
    icon: 'Shield',
  },
  MAGNET: {
    id: 'magnet',
    name: 'Orb Magnet',
    desc: 'Pulls all nearby coins to you',
    color: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.9)',
    duration: 8,
    icon: 'Magnet',
  },
  SPEED: {
    id: 'speedBoost',
    name: 'Shadow Rush',
    desc: 'Hyper speed, invincibility & 2x score',
    color: '#00f5ff',
    glowColor: 'rgba(0, 245, 255, 0.9)',
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
  { id: 'first_run', title: 'First Shadow Step', desc: 'Complete your first run', reward: 50, icon: 'Footprints' },
  { id: 'reach_500m', title: 'Shadow Apprentice', desc: 'Reach 500m in a single run', reward: 100, icon: 'Flame' },
  { id: 'reach_1500m', title: 'Shadow Master', desc: 'Reach 1500m & conquer Level 4', reward: 300, icon: 'Crown' },
  { id: 'double_jumper', title: 'Sky Walker', desc: 'Perform 20 double jumps in one game', reward: 100, icon: 'Wind' },
  { id: 'coin_hoarder', title: 'Golden Shadow', desc: 'Collect 100 coins in total', reward: 150, icon: 'Coins' },
  { id: 'shield_savior', title: 'Iron Will', desc: 'Absorb a fatal hit using your Shield', reward: 120, icon: 'Shield' },
  { id: 'speed_demon', title: 'Sonic Rift', desc: 'Use Speed Boost power-up 3 times', reward: 150, icon: 'Zap' },
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
  { id: 'daily_distance', title: 'Distance Dash', desc: 'Reach 600m in any single run today', target: 600, reward: 150, type: 'distance' },
  { id: 'daily_coins', title: 'Orb Harvester', desc: 'Collect 40 coins today', target: 40, reward: 120, type: 'coins' },
  { id: 'daily_jumps', title: 'Acrobatics', desc: 'Perform 25 double jumps today', target: 25, reward: 100, type: 'doubleJumps' },
  { id: 'daily_powerups', title: 'Overdrive', desc: 'Collect 4 power-ups today', target: 4, reward: 140, type: 'powerups' },
]

export interface LeaderboardEntry {
  id: string
  name: string
  score: number
  distance: number
  date: string
}

export const SEED_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', name: 'ShadowKage', score: 3840, distance: 3420, date: '2026-10-24' },
  { id: '2', name: 'NeonPhantom', score: 2950, distance: 2600, date: '2026-10-25' },
  { id: '3', name: 'NightStalker', score: 2180, distance: 1980, date: '2026-10-25' },
  { id: '4', name: 'CyberVoid', score: 1640, distance: 1510, date: '2026-10-26' },
  { id: '5', name: 'BladeRunner', score: 1120, distance: 990, date: '2026-10-26' },
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
