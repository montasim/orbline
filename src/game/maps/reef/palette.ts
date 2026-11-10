// Coral Deep palettes and small paint helpers shared by the scene and the obstacle skin.
import type { Tier } from '../types'

export interface ReefTheme {
  /** water column: surface, mid-depth, seabed level */
  water: [string, string, string]
  /** far rock / wreck silhouettes (before fog) */
  far: string
  kelp: string
  /** near rocks and sponges */
  near: string
  /** the accent pink of fans and anemones */
  coral: string
  /** colour of the light that comes down from the surface */
  light: string
  sand: [string, string]
  /** 0..1 strength of surface shimmer + light shafts */
  rays: number
  rayCount: number
  /** 0..1 strength of caustic ripples on sand and near objects */
  caustics: number
  /** 0..1 how many / how tall kelp strands are */
  kelpDensity: number
  /** shipwreck scale in the far layer, 0 = none */
  wreck: number
  /** 0..1 bioluminescence: glowing plankton clouds, tube corals, seabed light vents */
  bio: number
  glow: string
  vignette: number
}

export const THEMES: [ReefTheme, ReefTheme, ReefTheme, ReefTheme] = [
  {
    // Shallow Lagoon: bright turquoise, strong caustics and rays
    water: ['#7fe2df', '#2aa9bb', '#0f6a86'],
    far: '#14627c',
    kelp: '#2c7f78',
    near: '#195a6b',
    coral: '#f4899b',
    light: '#f0fffb',
    sand: ['#d5c597', '#6f7a6a'],
    rays: 1,
    rayCount: 9,
    caustics: 1,
    kelpDensity: 0.3,
    wreck: 0.55,
    bio: 0,
    glow: '#a5f3fc',
    vignette: 0.18,
  },
  {
    // Kelp Forest: green-teal, dense kelp, dappled light
    water: ['#9be6be', '#23907c', '#0b4c4c'],
    far: '#237866',
    kelp: '#3a7444',
    near: '#173f3c',
    coral: '#ea8c8c',
    light: '#effff0',
    sand: ['#bdb68a', '#5c5b45'],
    rays: 0.8,
    rayCount: 14,
    caustics: 0.75,
    kelpDensity: 1,
    wreck: 0.35,
    bio: 0,
    glow: '#bbf7d0',
    vignette: 0.28,
  },
  {
    // Shipwreck Trench: darker blue, big wreck, few thin rays, glowing plankton
    water: ['#3d7cb0', '#174670', '#07203a'],
    far: '#123a62',
    kelp: '#1b4652',
    near: '#0e2540',
    coral: '#d7889e',
    light: '#d6ecff',
    sand: ['#6a7d92', '#1f2b3c'],
    rays: 0.75,
    rayCount: 5,
    caustics: 0.35,
    kelpDensity: 0.3,
    wreck: 1.8,
    bio: 0.4,
    glow: '#7dd3fc',
    vignette: 0.42,
  },
  {
    // Abyssal Glow: near-black, the light comes from bioluminescence
    water: ['#0c1b36', '#071126', '#03060f'],
    far: '#0c1a34',
    kelp: '#0d1d30',
    near: '#081226',
    coral: '#a78bfa',
    light: '#a5c8ff',
    sand: ['#1f2742', '#070a16'],
    rays: 0,
    rayCount: 0,
    caustics: 0,
    kelpDensity: 0.22,
    wreck: 0.9,
    bio: 1,
    glow: '#67e8f9',
    vignette: 0.62,
  },
]

export const themeOf = (tier: Tier) => THEMES[tier]

const rgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
/** Linear blend of two '#rrggbb' colours as an rgba() string. */
export const mix = (a: string, b: string, t: number, alpha = 1) => {
  const ca = rgb(a)
  const cb = rgb(b)
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t))
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}
/** Blend returned as '#rrggbb' so it can be mixed again. */
export const mixHex = (a: string, b: string, t: number) => {
  const ca = rgb(a)
  const cb = rgb(b)
  return `#${ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}
export const rgba = (hex: string, alpha: number) => mix(hex, hex, 0, alpha)

/** Deterministic RNG so a rebuilt layer keeps the same layout. */
export const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  return c
}
export const ctxOf = (c: HTMLCanvasElement) => c.getContext('2d') as CanvasRenderingContext2D

let caustic: HTMLCanvasElement | null = null
/**
 * Tileable 128px caustic network (white, alpha = brightness): the edges of a wrapped Voronoi
 * diagram, which is what light focused by surface ripples looks like on the seabed.
 */
export function causticTexture(): HTMLCanvasElement {
  if (caustic) return caustic
  const N = 128
  const c = makeCanvas(N, N)
  const g = ctxOf(c)
  const img = g.createImageData(N, N)
  const rand = seeded(5)
  const pts: number[] = []
  for (let i = 0; i < 18; i++) pts.push(rand() * N, rand() * N)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let d1 = 1e9
      let d2 = 1e9
      for (let i = 0; i < pts.length; i += 2) {
        let dx = Math.abs(x - pts[i])
        let dy = Math.abs(y - pts[i + 1])
        if (dx > N / 2) dx = N - dx
        if (dy > N / 2) dy = N - dy
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < d1) {
          d2 = d1
          d1 = d
        } else if (d < d2) d2 = d
      }
      const v = Math.max(0, 1 - (d2 - d1) / 4.5)
      const k = (y * N + x) * 4
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255
      img.data[k + 3] = Math.round(v * v * 255)
    }
  g.putImageData(img, 0, 0)
  // soften once so the upscaled network reads as light, not pixels
  const soft = makeCanvas(N, N)
  const s = ctxOf(soft)
  s.filter = 'blur(0.8px)'
  for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) s.drawImage(c, ox, oy)
  caustic = soft
  return soft
}

const patterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern>()
/** Repeating caustic pattern for a given context (patterns are created per context). */
export function causticPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  let p = patterns.get(ctx)
  if (!p) {
    p = ctx.createPattern(causticTexture(), 'repeat') ?? undefined
    if (p) patterns.set(ctx, p)
  }
  return p ?? null
}

/**
 * Light from the surface (upper-left): paints a thin rim on every edge of `c` that faces it.
 * rim = shape minus the shape shifted away from the light.
 */
export function rimLight(c: HTMLCanvasElement, color: string, dx: number, dy: number, alpha: number) {
  if (alpha <= 0) return
  const r = makeCanvas(c.width, c.height)
  const g = ctxOf(r)
  g.drawImage(c, 0, 0)
  g.globalCompositeOperation = 'source-in'
  g.fillStyle = color
  g.fillRect(0, 0, r.width, r.height)
  g.globalCompositeOperation = 'destination-out'
  g.drawImage(c, dx, dy)
  const t = ctxOf(c)
  t.save()
  t.globalAlpha = alpha
  t.globalCompositeOperation = 'source-atop'
  t.drawImage(r, 0, 0)
  t.restore()
}
