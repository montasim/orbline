// Sunfall Dunes palettes: one hue family per tier, lit by a single low sun on the right of the horizon.
import type { Tier } from '../types'

export interface Look {
  /** sky top → upper → lower → horizon */
  sky: [string, string, string, string]
  sunX: number
  /** sun centre relative to the horizon, in sun radii (negative = above) */
  sunDrop: number
  sunR: number
  sunCore: string
  sunEdge: string
  halo: string
  haloAlpha: number
  discAlpha: number
  rays: number
  clouds: number
  /** dune values far → near (lit faces) and the cool shadow they fall into */
  far: string
  mid: string
  near: string
  shade: string
  rock: string
  rim: string
  rimAlpha: number
  haze: string
  hazeFar: number
  hazeMid: number
  hazeNear: number
  ground: [string, string, string]
  sand: string
  storm: number
  shimmer: number
  stars: boolean
  lanterns: number
  ruins: number
  shadow: number
}

export const LOOKS: Record<Tier, Look> = {
  // Copper Dusk: a huge sun resting on the horizon
  0: {
    sky: ['#3a1d3d', '#8e3439', '#e0693e', '#ffb062'],
    sunX: 0.72,
    sunDrop: -0.42,
    sunR: 1,
    sunCore: '#fff6dc',
    sunEdge: '#ffb24c',
    halo: '#ffb35c',
    haloAlpha: 0.6,
    discAlpha: 1,
    rays: 0.55,
    clouds: 0.8,
    far: '#eba872',
    mid: '#c46a3f',
    near: '#8e3f28',
    shade: '#5a2a3c',
    rock: '#b8603a',
    rim: '#ffe2a8',
    rimAlpha: 0.85,
    haze: '#f7a865',
    hazeFar: 0.55,
    hazeMid: 0.18,
    hazeNear: 0.06,
    ground: ['#d98a52', '#a5512f', '#5c2621'],
    sand: '#ffd6a6',
    storm: 0,
    shimmer: 1.6,
    stars: false,
    lanterns: 0,
    ruins: 0.25,
    shadow: 0.42,
  },
  // Ruin Road: the sun half set, ruins and arches crowding the road
  1: {
    sky: ['#2e1838', '#7a2c3a', '#c9533a', '#f58c4c'],
    sunX: 0.72,
    sunDrop: 0.04,
    sunR: 1.05,
    sunCore: '#ffe9bf',
    sunEdge: '#ff8a3a',
    halo: '#ff9248',
    haloAlpha: 0.55,
    discAlpha: 1,
    rays: 0.4,
    clouds: 0.7,
    far: '#d58252',
    mid: '#ad5634',
    near: '#7e3624',
    shade: '#4a2236',
    rock: '#a9532f',
    rim: '#ffc98a',
    rimAlpha: 0.75,
    haze: '#ec864c',
    hazeFar: 0.5,
    hazeMid: 0.16,
    hazeNear: 0.05,
    ground: ['#c8743f', '#94452a', '#4e1f1d'],
    sand: '#ffc690',
    storm: 0,
    shimmer: 1.1,
    stars: false,
    lanterns: 0.55,
    ruins: 1,
    shadow: 0.5,
  },
  // Sandstorm: everything drowned in hot orange haze, the sun a pale coin
  2: {
    sky: ['#7a3a22', '#a8552b', '#cf763a', '#e59c5e'],
    sunX: 0.66,
    sunDrop: -1.5,
    sunR: 0.62,
    sunCore: '#fff2d6',
    sunEdge: '#ffdcaa',
    halo: '#ffc27c',
    haloAlpha: 0.5,
    discAlpha: 0.6,
    rays: 0,
    clouds: 0,
    far: '#d68b53',
    mid: '#b8693b',
    near: '#8a4628',
    shade: '#6a3326',
    rock: '#a65a34',
    rim: '#ffd29c',
    rimAlpha: 0.35,
    haze: '#da884b',
    hazeFar: 0.88,
    hazeMid: 0.66,
    hazeNear: 0.26,
    ground: ['#c9844c', '#9a5532', '#55291e'],
    sand: '#f8c891',
    storm: 1,
    shimmer: 0,
    stars: false,
    lanterns: 0.35,
    ruins: 0.7,
    shadow: 0.12,
  },
  // Twilight Mesa: violet afterglow, first stars, lanterns lit in the ruins
  3: {
    sky: ['#121432', '#2c2453', '#77396a', '#e27a5c'],
    sunX: 0.72,
    sunDrop: 1.3,
    sunR: 1,
    sunCore: '#ffb08a',
    sunEdge: '#e0604a',
    halo: '#ff8a5c',
    haloAlpha: 0.42,
    discAlpha: 0,
    rays: 0.22,
    clouds: 0.55,
    far: '#a8698a',
    mid: '#3d2a4a',
    near: '#241a35',
    shade: '#120f22',
    rock: '#46304f',
    rim: '#ffa184',
    rimAlpha: 0.5,
    haze: '#a05a78',
    hazeFar: 0.42,
    hazeMid: 0.12,
    hazeNear: 0.04,
    ground: ['#5e3f5e', '#3a2846', '#171223'],
    sand: '#e0b0bc',
    storm: 0,
    shimmer: 0,
    stars: true,
    lanterns: 1,
    ruins: 0.9,
    shadow: 0.14,
  },
}

const hex = (c: string) => {
  const n = Number.parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
/** Blend two '#rrggbb' colours; opaque results stay '#rrggbb' so they can be blended again. */
export const mix = (a: string, b: string, t: number, alpha = 1) => {
  const ca = hex(a)
  const cb = hex(b)
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t))
  if (alpha === 1) return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}
export const rgba = (c: string, alpha: number) => mix(c, c, 0, alpha)

/** Deterministic RNG so rebuilt layers keep their layout. */
export const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  return c
}
