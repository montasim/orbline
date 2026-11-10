import { mix } from '../../engine/background'
import { storage } from '../../storage'
import type { Scene, Tier } from '../types'

type C2D = CanvasRenderingContext2D

/** One tier's light & colour script. Every colour is a value step of one hue family plus the light colour. */
export interface Pal {
  sky: [string, string, string]
  sun: string
  sunX: number
  sunY: number
  sunR: number
  /** unit vector pointing toward the sun (screen coords, y down) */
  light: [number, number]
  haze: string
  far: string
  mid: string
  near: string
  grass: string
  dirt: string
  dirtDark: string
  glow: string
  shade: string
  cloud: string
  cloudShade: string
  mist: number
  wind: number
  clouds: number
  cloudSpeed: number
  rays: number
  blades: number
  shadow: number
  petals: number
  fluff: number
}

const norm = (x: number, y: number): [number, number] => {
  const l = Math.hypot(x, y)
  return [x / l, y / l]
}

export const PALETTES: [Pal, Pal, Pal, Pal] = [
  // Dewy Dawn: pastel blue sky warming to peach at the horizon, low sun, mist pooled between the hills
  {
    sky: ['#9cb8dc', '#d3def0', '#fbe5d4'],
    sun: '#fff6e6',
    sunX: 0.78,
    sunY: 0.55,
    sunR: 28,
    light: norm(0.95, -0.22),
    haze: '#ece6e8',
    far: '#a9c2c8',
    mid: '#8ebd8b',
    near: '#6ea765',
    grass: '#7bb868',
    dirt: '#d3b292',
    dirtDark: '#a5876c',
    glow: '#fff0da',
    shade: '#4b6e6a',
    cloud: '#f2ecf0',
    cloudShade: '#b3bfd6',
    mist: 0.95,
    wind: 0.5,
    clouds: 5,
    cloudSpeed: 0.12,
    rays: 0.55,
    blades: 0.8,
    shadow: 0.45,
    petals: 36,
    fluff: 20,
  },
  // Windmill Hills: clear bright midday, high sun, crisp short shadows
  {
    sky: ['#3d8dd6', '#8bc6ee', '#dcf0f6'],
    sun: '#fffdf2',
    sunX: 0.68,
    sunY: 0.13,
    sunR: 24,
    light: norm(0.45, -0.89),
    haze: '#d8ecf2',
    far: '#93c1c6',
    mid: '#7cc162',
    near: '#57a546',
    grass: '#6cc04c',
    dirt: '#d2a473',
    dirtDark: '#9b7250',
    glow: '#fffbe2',
    shade: '#2d6745',
    cloud: '#ffffff',
    cloudShade: '#b2cbe4',
    mist: 0,
    wind: 0.7,
    clouds: 4,
    cloudSpeed: 0.18,
    rays: 0.3,
    blades: 1.3,
    shadow: 0.12,
    petals: 22,
    fluff: 16,
  },
  // Blossom Gale: breezy, more cloud, fast sky, slanted petal storm and bent grass
  {
    sky: ['#6a8cc6', '#b2c4e2', '#f1e5ee'],
    sun: '#fffaf2',
    sunX: 0.74,
    sunY: 0.2,
    sunR: 22,
    light: norm(0.62, -0.78),
    haze: '#e9e0ea',
    far: '#9fbcc1',
    mid: '#6bad69',
    near: '#4e964c',
    grass: '#64b35a',
    dirt: '#cba27c',
    dirtDark: '#94704f',
    glow: '#fff6ec',
    shade: '#30605a',
    cloud: '#f6f8fb',
    cloudShade: '#9fb1ca',
    mist: 0.12,
    wind: 3.4,
    clouds: 7,
    cloudSpeed: 1.1,
    rays: 0.36,
    blades: 3.6,
    shadow: 0.2,
    petals: 115,
    fluff: 34,
  },
  // Golden Hour: amber sky, sun sitting on the horizon, everything rim-lit, long shadows
  {
    sky: ['#6b7fb0', '#e2a77b', '#ffd699'],
    sun: '#fff2c8',
    sunX: 0.84,
    sunY: 0.67,
    sunR: 34,
    light: norm(0.98, -0.12),
    haze: '#f5c993',
    far: '#c6a186',
    mid: '#95a058',
    near: '#6f8a40',
    grass: '#98ad4d',
    dirt: '#d69b63',
    dirtDark: '#9a6842',
    glow: '#ffd480',
    shade: '#5b4a3a',
    cloud: '#ffe0bf',
    cloudShade: '#b58a9c',
    mist: 0.3,
    wind: 0.5,
    clouds: 4,
    cloudSpeed: 0.1,
    rays: 0.85,
    blades: 0.6,
    shadow: 1,
    petals: 30,
    fluff: 26,
  },
]

const TAU = Math.PI * 2
const TW = 600 // ground tile width
const QUALITY = { low: 0.35, medium: 0.65, high: 1 } as const

const canvas = (w: number, h: number): [HTMLCanvasElement, C2D] => {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  return [c, c.getContext('2d') as C2D]
}
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const a0 = (c: string, a: number) => mix(c, c, 0, a)

interface Art {
  sky: HTMLCanvasElement
  rays: HTMLCanvasElement
  layers: { c: HTMLCanvasElement; top: number }[]
  ground: HTMLCanvasElement
  clouds: HTMLCanvasElement[]
  balloon: HTMLCanvasElement
  shadow: HTMLCanvasElement
}
interface Cloud {
  x: number
  y: number
  s: number
  d: number
  kind: number
}
interface Mote {
  x: number
  y: number
  vy: number
  rot: number
  vr: number
  size: number
  d: number
  ph: number
}

/** Bloom Meadow: a sunlit spring valley with windmills, a red barn and blossom trees. */
export class MeadowScene implements Scene {
  off = [0, 0, 0]
  offG = 0
  art = new Map<Tier, Art>()
  artSize = ''
  mills: { x: number; y: number; s: number }[] = []
  clouds: Cloud[] = []
  petals: Mote[] = []
  fluff: Mote[] = []
  balloon = { x: 0, y: 0, wait: 0 }
  tier: Tier = 0
  prev: Tier | null = null
  fadeStart = 0
  drawn = false
  pending = false
  q: number

  constructor(
    public w: number,
    public h: number,
    public gy: number,
  ) {
    this.q = QUALITY[storage.getSettings().particlesQuality] ?? 1
    const r = Math.random
    for (let i = 0; i < 8; i++) {
      const d = 0.3 + (i / 7) * 0.7
      this.clouds.push({ x: r() * (w + 300) - 150, y: 0, s: 0.45 + d * 0.6, d, kind: i % 4 })
    }
    this.placeCloudsY()
    const mk = (): Mote => ({
      x: r() * w,
      y: r() * h,
      vy: 0.25 + r() * 0.5,
      rot: r() * TAU,
      vr: (r() - 0.5) * 0.12,
      size: 0,
      d: 0.35 + r() * 0.65,
      ph: r() * TAU,
    })
    for (let i = 0; i < Math.round(150 * this.q); i++) {
      const m = mk()
      m.size = 1.6 + m.d * 2.4
      this.petals.push(m)
    }
    for (let i = 0; i < Math.round(34 * this.q); i++) this.fluff.push(mk())
    this.balloon = { x: w * 0.42, y: gy * 0.24, wait: 0 }
  }

  placeCloudsY() {
    const r = seeded(5)
    for (const c of this.clouds) c.y = this.gy * (0.04 + r() * 0.32) + (1 - c.d) * this.gy * 0.12
  }

  resize(w: number, h: number, gy: number) {
    this.w = w
    this.h = h
    this.gy = gy
    this.off = this.off.map((o) => o % w)
    this.placeCloudsY()
  }

  update(speed: number) {
    const p = PALETTES[this.tier]
    const w = this.w
    const h = this.h
    this.off[0] = (this.off[0] + speed * 0.1) % w
    this.off[1] = (this.off[1] + speed * 0.24) % w
    this.off[2] = (this.off[2] + speed * 0.48) % w
    this.offG = (this.offG + speed) % TW
    const now = performance.now() / 1000
    for (const c of this.clouds) {
      c.x -= (speed * 0.05 + p.cloudSpeed) * c.d
      if (c.x < -320 * c.s) c.x = w + 20 + Math.random() * 160
    }
    const b = this.balloon
    if (b.wait > 0) b.wait--
    else {
      b.x -= 0.12 + speed * 0.025 + p.wind * 0.05
      if (b.x < -60) {
        b.wait = 900 + Math.random() * 1500
        b.x = w + 40
        b.y = this.gy * (0.12 + Math.random() * 0.2)
      }
    }
    const nP = Math.min(this.petals.length, Math.round(p.petals * this.q))
    const nF = Math.min(this.fluff.length, Math.round(p.fluff * this.q))
    const gust = p.wind
    for (let i = 0; i < nP + nF; i++) {
      const m = i < nP ? this.petals[i] : this.fluff[i - nP]
      const fluff = i >= nP
      m.x -= speed * 0.3 * m.d + gust * (0.5 + m.d) * (fluff ? 0.7 : 1) + Math.sin(now * 1.6 + m.ph) * 0.4
      m.y += (fluff ? m.vy * 0.35 : m.vy) + Math.cos(now * 1.2 + m.ph) * (fluff ? 0.35 : 0.25)
      m.rot += m.vr * (1 + gust * 0.4)
      if (m.x < -12) {
        m.x = w + 12
        m.y = Math.random() * h * 0.9
      }
      if (m.y > h + 12) {
        m.y = -12
        m.x = Math.random() * (w + 200)
      }
      if (m.y < -20) m.y = h
    }
  }

  draw(ctx: CanvasRenderingContext2D, tier: Tier) {
    const now = performance.now() / 1000
    if (tier !== this.tier) {
      if (this.drawn) {
        this.prev = this.tier
        this.fadeStart = now
      }
      this.tier = tier
    }
    this.drawn = true
    this.world(ctx, tier, now, 1)
    if (this.prev !== null) {
      const f = 1 - (now - this.fadeStart) / 1.4
      if (f <= 0) this.prev = null
      else this.world(ctx, this.prev, now, f)
    }
    this.weather(ctx, tier)
    this.prebuild()
  }

  /** builds the other tiers' art in idle time so a level-up never hitches */
  prebuild() {
    if (this.art.size >= 4 || this.pending) return
    this.pending = true
    const go = () => {
      this.pending = false
      for (const t of [0, 1, 2, 3] as Tier[])
        if (!this.art.has(t)) {
          this.getArt(t)
          return
        }
    }
    if (typeof requestIdleCallback === 'function') requestIdleCallback(go)
    else setTimeout(go, 200)
  }

  getArt(tier: Tier): Art {
    const size = `${this.w}x${this.h}x${this.gy}`
    if (size !== this.artSize) {
      this.art.clear()
      this.artSize = size
    }
    let a = this.art.get(tier)
    if (!a) {
      const p = PALETTES[tier]
      a = {
        sky: this.paintSky(p),
        rays: this.paintRays(p),
        layers: [this.paintFar(p), this.paintMid(p), this.paintNear(p)].map(trimTop),
        ground: this.paintGround(p),
        clouds: [0, 1, 2, 3].map((k) => cloudSprite(p, 101 + k * 17)),
        balloon: balloonSprite(p),
        shadow: shadowSprite(p),
      }
      this.art.set(tier, a)
    }
    return a
  }

  world(ctx: C2D, tier: Tier, now: number, alpha: number) {
    const p = PALETTES[tier]
    const art = this.getArt(tier)
    const w = this.w
    const gy = this.gy
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.drawImage(art.sky, 0, 0)
    // far clouds, the balloon between them, then near clouds
    for (const pass of [0, 1]) {
      for (let i = 0; i < p.clouds; i++) {
        const c = this.clouds[i]
        if ((c.d > 0.6 ? 1 : 0) !== pass) continue
        const spr = art.clouds[c.kind]
        ctx.globalAlpha = alpha * (0.55 + 0.45 * c.d)
        ctx.drawImage(spr, c.x, c.y, spr.width * c.s, spr.height * c.s)
      }
      if (pass === 0 && this.balloon.wait <= 0) {
        const b = this.balloon
        ctx.globalAlpha = alpha * 0.92
        ctx.drawImage(art.balloon, b.x - 20, b.y + Math.sin(now * 0.6) * 4 - 30)
      }
    }
    ctx.globalAlpha = alpha
    // layer 1, then sun shafts through the haze, then the nearer layers
    this.blit(ctx, art.layers[0], this.off[0])
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = alpha * p.rays * (0.8 + 0.2 * Math.sin(now * 0.35))
    const sx = w * p.sunX
    const sy = gy * p.sunY
    ctx.translate(sx, sy)
    ctx.rotate(Math.sin(now * 0.07) * 0.025)
    ctx.drawImage(art.rays, -sx, -sy, w, gy)
    ctx.restore()
    this.blit(ctx, art.layers[1], this.off[1])
    this.drawSails(ctx, p, now)
    this.blit(ctx, art.layers[2], this.off[2])
    // ground band
    for (let x = -Math.floor(this.offG); x < w; x += TW) ctx.drawImage(art.ground, x, gy - 10)
    // cloud shadows sliding over the path
    const band = this.h - gy
    for (let i = 0; i < p.clouds; i++) {
      const c = this.clouds[i]
      if (c.d < 0.6) continue
      const cw = 300 * c.s
      ctx.globalAlpha = alpha * 0.2 * c.d
      ctx.drawImage(art.shadow, c.x - cw * 0.15 - p.light[0] * 60, gy - 14, cw * 1.3, band + 14)
    }
    ctx.restore()
  }

  blit(ctx: C2D, layer: { c: HTMLCanvasElement; top: number }, offset: number) {
    const ox = Math.floor(offset)
    ctx.drawImage(layer.c, -ox, layer.top)
    ctx.drawImage(layer.c, this.w - ox, layer.top)
  }

  /** windmill sails turn live; the towers are baked into the mid layer */
  drawSails(ctx: C2D, p: Pal, now: number) {
    const ox = Math.floor(this.off[1])
    ctx.fillStyle = mix('#f6efe4', p.haze, 0.3)
    ctx.strokeStyle = mix(p.shade, p.haze, 0.35, 0.9)
    ctx.lineWidth = 1.2
    const fill = new Path2D()
    const spars = new Path2D()
    for (const [i, m] of this.mills.entries()) {
      for (const cx of [m.x - ox, m.x - ox + this.w]) {
        const L = 30 * m.s
        if (cx < -L || cx > this.w + L) continue
        const rot = now * p.blades + i * 1.3
        for (let k = 0; k < 4; k++) {
          const a = rot + (k * Math.PI) / 2
          const dx = Math.cos(a)
          const dy = Math.sin(a)
          const P = (r: number, side: number): [number, number] => [cx + dx * r - dy * side, m.y + dy * r + dx * side]
          const pts = [P(6 * m.s, 0), P(L, 0), P(L, 6 * m.s), P(9 * m.s, 4.5 * m.s)]
          fill.moveTo(pts[0][0], pts[0][1])
          for (const q of pts.slice(1)) fill.lineTo(q[0], q[1])
          fill.closePath()
          const s0 = P(0, 0)
          const s1 = P(L + 2, 0)
          spars.moveTo(s0[0], s0[1])
          spars.lineTo(s1[0], s1[1])
        }
      }
    }
    ctx.fill(fill)
    ctx.stroke(spars)
  }

  weather(ctx: C2D, tier: Tier) {
    const p = PALETTES[tier]
    const nP = Math.min(this.petals.length, Math.round(p.petals * this.q))
    const nF = Math.min(this.fluff.length, Math.round(p.fluff * this.q))
    ctx.save()
    const tint = tier === 3 ? 0.25 : 0
    const big = p.wind > 2 ? 1.35 : 1
    if (p.wind > 2) {
      // gusts: long faint streaks sweeping right-to-left
      const now = performance.now() / 1000
      const w = this.w
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.4
      ctx.lineCap = 'round'
      for (let i = 0; i < 6; i++) {
        const span = w + 700
        const x = w + 350 - ((now * (520 + i * 60) + i * 397) % span)
        const y = this.gy * (0.25 + ((i * 0.37) % 1) * 0.7)
        const len = 140 + (i % 3) * 70
        ctx.globalAlpha = 0.22 * Math.sin(((w + 350 - x) / span) * Math.PI)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.bezierCurveTo(x + len * 0.35, y - 10, x + len * 0.65, y + 8, x + len, y - 4)
        ctx.stroke()
      }
    }
    for (const [lo, hi, col, al] of [
      [0, 0.65, mix('#f6b9cf', p.haze, 0.35 + tint), 0.75],
      [0.65, 1.01, mix('#f7a8c4', p.glow, 0.12 + tint), 0.95],
    ] as const) {
      ctx.fillStyle = col
      ctx.globalAlpha = al
      ctx.beginPath()
      for (let i = 0; i < nP; i++) {
        const m = this.petals[i]
        if (m.d < lo || m.d >= hi) continue
        // a lens of two curves (cheaper than ellipse()); its width flips as the petal tumbles
        const sz = m.size * big
        const flip = sz * 1.1 * (0.3 + 0.7 * Math.abs(Math.cos(m.rot * 1.3)))
        const cx = Math.cos(m.rot) * sz
        const cy = Math.sin(m.rot) * sz
        ctx.moveTo(m.x - cx, m.y - cy)
        ctx.quadraticCurveTo(m.x - cy * flip / sz, m.y + cx * flip / sz, m.x + cx, m.y + cy)
        ctx.quadraticCurveTo(m.x + cy * flip / sz, m.y - cx * flip / sz, m.x - cx, m.y - cy)
      }
      ctx.fill()
    }
    // dandelion fluff: a faint halo, a few filaments and a bright seed core, batched into three paths
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 0.7
    const halo = new Path2D()
    const hairs = new Path2D()
    const core = new Path2D()
    for (let i = 0; i < nF; i++) {
      const m = this.fluff[i]
      const s = 2.5 + m.d * 3.5
      halo.moveTo(m.x + s, m.y)
      halo.arc(m.x, m.y, s, 0, TAU)
      for (let k = 0; k < 6; k++) {
        const a = m.rot + (k * TAU) / 6
        hairs.moveTo(m.x, m.y)
        hairs.lineTo(m.x + Math.cos(a) * s * 1.2, m.y + Math.sin(a) * s * 1.2)
      }
      core.moveTo(m.x + 1.1, m.y)
      core.arc(m.x, m.y, 1.1, 0, TAU)
    }
    ctx.globalAlpha = 0.18
    ctx.fill(halo)
    ctx.globalAlpha = 0.55
    ctx.stroke(hairs)
    ctx.globalAlpha = 0.95
    ctx.fill(core)
    ctx.restore()
  }

  // ---------- baked art ----------

  paintSky(p: Pal) {
    const { w, gy } = this
    const [c, g] = canvas(w, gy + 2)
    const sky = g.createLinearGradient(0, 0, 0, gy)
    sky.addColorStop(0, p.sky[0])
    sky.addColorStop(0.58, p.sky[1])
    sky.addColorStop(1, p.sky[2])
    g.fillStyle = sky
    g.fillRect(0, 0, w, gy + 2)
    const sx = w * p.sunX
    const sy = gy * p.sunY
    const R = Math.max(w, gy) * 0.8
    const glow = g.createRadialGradient(sx, sy, 0, sx, sy, R)
    glow.addColorStop(0, a0(p.glow, 0.85))
    glow.addColorStop(0.06, a0(p.glow, 0.5))
    glow.addColorStop(0.22, a0(p.glow, 0.18))
    glow.addColorStop(0.55, a0(p.glow, 0.05))
    glow.addColorStop(1, a0(p.glow, 0))
    g.fillStyle = glow
    g.fillRect(0, 0, w, gy + 2)
    // faint high cirrus streaks, lit on the sun side
    const r = seeded(77)
    g.globalAlpha = 0.18
    for (let i = 0; i < 7; i++) {
      const cx = r() * w
      const cy = gy * (0.06 + r() * 0.22)
      const len = 120 + r() * 220
      const st = g.createLinearGradient(cx - len / 2, 0, cx + len / 2, 0)
      st.addColorStop(0, a0(p.glow, 0))
      st.addColorStop(0.5, a0(p.glow, 1))
      st.addColorStop(1, a0(p.glow, 0))
      g.fillStyle = st
      g.beginPath()
      g.ellipse(cx, cy, len / 2, 2 + r() * 3, -0.04, 0, TAU)
      g.fill()
    }
    g.globalAlpha = 1
    // sun disc with a soft corona
    const disc = g.createRadialGradient(sx, sy, 0, sx, sy, p.sunR * 2.2)
    disc.addColorStop(0, a0(p.sun, 1))
    disc.addColorStop(0.4, a0(p.sun, 1))
    disc.addColorStop(0.47, a0(p.sun, 0.55))
    disc.addColorStop(1, a0(p.glow, 0))
    g.fillStyle = disc
    g.fillRect(sx - p.sunR * 2.2, sy - p.sunR * 2.2, p.sunR * 4.4, p.sunR * 4.4)
    return c
  }

  /** a fan of light shafts from the sun, built and blurred at quarter resolution */
  paintRays(p: Pal) {
    const S = 4
    const { w, gy } = this
    const [c, g] = canvas(w / S, gy / S)
    g.scale(1 / S, 1 / S)
    g.globalCompositeOperation = 'lighter'
    const sx = w * p.sunX
    const sy = gy * p.sunY
    const R = Math.hypot(w, gy) * 1.1
    const r = seeded(91)
    const grad = g.createRadialGradient(sx, sy, p.sunR, sx, sy, R)
    grad.addColorStop(0, a0(p.glow, 0.3))
    grad.addColorStop(0.3, a0(p.glow, 0.1))
    grad.addColorStop(1, a0(p.glow, 0))
    g.fillStyle = grad
    for (let i = 0; i < 24; i++) {
      // spread evenly across the downward-left fan, jittered
      // high sun throws shafts downward, a low sun throws them almost level across the valley
      const a = Math.PI * (0.62 + 0.42 * p.sunY + (((i + r()) / 24) - 0.5) * 0.6)
      const dw = 0.005 + r() * 0.018
      g.globalAlpha = 0.25 + r() * 0.75
      g.beginPath()
      g.moveTo(sx, sy)
      g.lineTo(sx + Math.cos(a - dw) * R, sy + Math.sin(a - dw) * R)
      g.lineTo(sx + Math.cos(a + dw) * R, sy + Math.sin(a + dw) * R)
      g.closePath()
      g.fill()
    }
    const [c2, g2] = canvas(c.width, c.height)
    g2.filter = 'blur(2px)'
    g2.drawImage(c, 0, 0)
    return c2
  }

  /** tiled draw: x and its wrapped copies */
  tiled(x: number, margin: number, fn: (x: number) => void) {
    fn(x)
    if (x - margin < 0) fn(x + this.w)
    if (x + margin > this.w) fn(x - this.w)
  }

  /** fills a periodic ridge, then lights the flank and crest that face the sun */
  ridge(g: C2D, p: Pal, y: (x: number) => number, fill: string | CanvasGradient, glowW: number, glowA: number, rimA: number) {
    const { w, gy } = this
    const path = new Path2D()
    path.moveTo(0, gy + 2)
    for (let x = 0; x <= w; x += 6) path.lineTo(x, y(x))
    path.lineTo(w, y(w))
    path.lineTo(w, gy + 2)
    path.closePath()
    g.fillStyle = fill
    g.fill(path)
    const buckets: Path2D[] = [1, 2, 3, 4].map(() => new Path2D())
    const [lx, ly] = p.light
    for (let x = 0; x < w; x += 6) {
      const s = (y(x + 6) - y(x)) / 6
      const n = Math.hypot(s, 1)
      // relative to flat ground, so only slopes turned toward the sun catch the rim (no outline at noon)
      const lam = clamp01(0.18 + 3 * ((s / n) * lx + (-1 / n) * ly + ly))
      const lvl = Math.round(lam * 4)
      if (lvl < 1) continue
      buckets[lvl - 1].moveTo(x, y(x))
      buckets[lvl - 1].lineTo(x + 6, y(x + 6))
    }
    g.save()
    g.clip(path)
    g.lineCap = 'round'
    g.strokeStyle = p.glow
    for (let i = 0; i < 4; i++) {
      g.globalAlpha = ((i + 1) / 4) * glowA
      g.lineWidth = glowW
      g.stroke(buckets[i])
      g.globalAlpha = ((i + 1) / 4) * rimA
      g.lineWidth = 2.2
      g.stroke(buckets[i])
    }
    g.restore()
  }

  hazeOver(g: C2D, p: Pal, top: number, aTop: number, aBottom: number, mistTop: number, mistA: number) {
    const gy = this.gy
    g.save()
    g.globalCompositeOperation = 'source-atop'
    const hz = g.createLinearGradient(0, top, 0, gy)
    hz.addColorStop(0, a0(p.haze, aTop))
    hz.addColorStop(1, a0(p.haze, aBottom))
    g.fillStyle = hz
    g.fillRect(0, 0, this.w, gy + 2)
    if (mistA > 0) {
      const m = g.createLinearGradient(0, mistTop, 0, gy)
      m.addColorStop(0, a0('#fbf8f6', 0))
      m.addColorStop(0.7, a0('#fbf8f6', mistA * 0.75))
      m.addColorStop(1, a0('#fbf8f6', mistA))
      g.fillStyle = m
      g.fillRect(0, mistTop, this.w, gy + 2 - mistTop)
    }
    g.restore()
  }

  paintFar(p: Pal) {
    const { w, gy } = this
    const [c, g] = canvas(w, gy + 2)
    const H = Math.min(230, gy * 0.46)
    const u = (x: number) => (x / w) * TAU
    const yA = (x: number) =>
      gy - H * (0.66 + 0.16 * Math.sin(u(x) * 2 + 0.4) + 0.1 * Math.sin(u(x) * 5 + 1.3) + 0.04 * Math.sin(u(x) * 11 + 2.2))
    const yB = (x: number) =>
      gy - H * (0.4 + 0.12 * Math.sin(u(x) * 3 + 2) + 0.07 * Math.sin(u(x) * 7 + 0.3) + 0.03 * Math.sin(u(x) * 13))
    this.ridge(g, p, yA, mix(p.far, p.haze, 0.5), 18, 0.25, 0.5)
    const fill = g.createLinearGradient(0, gy - H * 0.6, 0, gy)
    fill.addColorStop(0, mix(p.far, p.glow, 0.12))
    fill.addColorStop(1, mix(p.far, p.shade, 0.12))
    this.ridge(g, p, yB, fill, 16, 0.3, 0.55)
    // tiny distant copses dotting the near ridge
    const r = seeded(12)
    g.fillStyle = mix(p.far, p.shade, 0.35)
    for (let i = 0; i < 26; i++) {
      const x = r() * w
      const n = 1 + Math.floor(r() * 3)
      for (let k = 0; k < n; k++) {
        const tx = x + k * 4
        const rr = 2 + r() * 2.2
        this.tiled(tx, 6, (px) => {
          g.beginPath()
          g.arc(px, yB(px) + 1 + rr * 0.3, rr, 0, TAU)
          g.fill()
        })
      }
    }
    this.hazeOver(g, p, gy - H, 0.18, 0.62, gy - H * 0.38, p.mist * 0.85)
    return c
  }

  paintMid(p: Pal) {
    const { w, gy } = this
    const [c, g] = canvas(w, gy + 2)
    const H = Math.min(150, gy * 0.3)
    const s = Math.max(0.6, Math.min(1.1, gy / 560))
    const u = (x: number) => (x / w) * TAU
    const yBack = (x: number) => gy - H * (0.82 + 0.16 * Math.sin(u(x) * 3 + 2.6) + 0.08 * Math.sin(u(x) * 7))
    const y = (x: number) =>
      gy - H * (0.5 + 0.22 * Math.sin(u(x) * 2 + 1.1) + 0.11 * Math.sin(u(x) * 5 + 0.2) + 0.05 * Math.sin(u(x) * 9 + 2))
    this.ridge(g, p, yBack, mix(p.mid, p.haze, 0.42), 14, 0.3, 0.55)
    const fill = g.createLinearGradient(0, gy - H, 0, gy)
    fill.addColorStop(0, mix(p.mid, p.glow, 0.18))
    fill.addColorStop(1, mix(p.mid, p.shade, 0.2))
    // patchwork fields with hedgerows, clipped to the front hill
    const hill = new Path2D()
    hill.moveTo(0, gy + 2)
    for (let x = 0; x <= w; x += 6) hill.lineTo(x, y(x))
    hill.lineTo(w, gy + 2)
    hill.closePath()
    g.fillStyle = fill
    g.fill(hill)
    g.save()
    g.clip(hill)
    const r = seeded(31)
    const n = Math.max(6, Math.round(w / 120))
    const edges = Array.from({ length: n }, (_, i) => (i + 0.2 + r() * 0.6) * (w / n))
    for (let i = 0; i < n; i++) {
      const x0 = edges[i]
      const x1 = i + 1 < n ? edges[i + 1] : edges[0] + w
      const tone = r()
      const col = tone < 0.3 ? mix(p.mid, p.glow, 0.22) : tone < 0.55 ? mix(p.mid, '#e8d67a', 0.25) : mix(p.mid, p.shade, 0.12)
      const lean = -26
      for (const dx of [0, -w]) {
        g.fillStyle = col
        g.globalAlpha = 0.55
        g.beginPath()
        g.moveTo(x0 + dx, gy - H * 1.2)
        g.lineTo(x1 + dx, gy - H * 1.2)
        g.lineTo(x1 + dx + lean, gy + 2)
        g.lineTo(x0 + dx + lean, gy + 2)
        g.closePath()
        g.fill()
        // furrow lines
        g.globalAlpha = 0.1
        g.strokeStyle = p.shade
        g.lineWidth = 1
        g.beginPath()
        for (let fx = x0 + 6; fx < x1 - 3; fx += 7) {
          g.moveTo(fx + dx, gy - H * 1.2)
          g.lineTo(fx + dx + lean, gy + 2)
        }
        g.stroke()
      }
    }
    g.globalAlpha = 1
    // hedgerows: bumpy dark lines along field borders
    g.strokeStyle = mix(p.mid, p.shade, 0.5)
    g.globalAlpha = 0.45
    g.lineCap = 'round'
    for (const e of edges)
      this.tiled(e, 40, (ex) => {
        const top = y(ex)
        const at = (yy: number) => ex - (26 * (yy - (gy - H * 1.2))) / (H * 1.2 + 2)
        for (const [lw, k] of [
          [2.4, 0],
          [3.4, 0.5],
        ]) {
          g.lineWidth = lw
          g.beginPath()
          const y0 = top + (gy - top) * k
          g.moveTo(at(y0), y0)
          g.lineTo(at(gy + 2), gy + 2)
          g.stroke()
        }
      })
    g.globalAlpha = 1
    g.restore()
    // light the crest of the front hill
    this.ridge(g, p, y, 'rgba(0,0,0,0)', 22, 0.32, 0.65)
    // tree clumps
    const trees = seeded(47)
    this.mills = []
    const millX = [0.16, 0.52, 0.81].map((f) => (f + (trees() - 0.5) * 0.06) * w)
    for (let i = 0; i < Math.round(w / 110); i++) {
      const x = trees() * w
      if (millX.some((m) => Math.abs(m - x) < 40 * s)) continue
      const k = 1 + Math.floor(trees() * 3)
      for (let j = 0; j < k; j++) {
        const tx = x + j * 9 * s
        const rr = (6 + trees() * 5) * s
        this.tiled(tx, 20, (px) => roundTree(g, p, px, y(px) + 3, rr, p.mid))
      }
    }
    for (const mx of millX) {
      const base = y(mx) + 4 * s
      this.tiled(mx, 40, (px) => millTower(g, p, px, base, s))
      this.mills.push({ x: mx, y: base - 50 * s - 2 * s, s })
    }
    this.hazeOver(g, p, gy - H, 0.12, 0.32, gy - H * 0.3, p.mist * 0.6)
    return c
  }

  paintNear(p: Pal) {
    const { w, gy } = this
    const [c, g] = canvas(w, gy + 2)
    const s = Math.max(0.7, Math.min(1.15, gy / 540))
    const u = (x: number) => (x / w) * TAU
    const y = (x: number) => gy - 18 * s - 7 * s * Math.sin(u(x) * 3 + 0.5) - 4 * s * Math.sin(u(x) * 8 + 1.7)
    const fill = g.createLinearGradient(0, gy - 32 * s, 0, gy)
    fill.addColorStop(0, mix(p.near, p.glow, 0.16))
    fill.addColorStop(1, mix(p.near, p.shade, 0.25))
    this.ridge(g, p, y, fill, 10, 0.35, 0.7)
    const r = seeded(59)
    // grass fringe along the bank
    const lean = -p.wind * 0.35
    for (const [col, al] of [
      [mix(p.near, p.shade, 0.3), 0.9],
      [mix(p.near, p.glow, 0.35), 0.8],
    ] as const) {
      g.strokeStyle = col
      g.globalAlpha = al
      g.lineWidth = 1.3
      g.beginPath()
      for (let x = 0; x < w; x += 3) {
        const hh = (3 + r() * 5) * s
        g.moveTo(x, y(x) + 2)
        g.quadraticCurveTo(x, y(x) - hh * 0.6, x + (lean - 0.3 + r() * 0.6) * hh, y(x) - hh)
      }
      g.stroke()
    }
    g.globalAlpha = 1
    // props: one barn per tile, blossom trees, fences, flower clumps
    const slots = Math.max(4, Math.round(w / 150))
    const step = w / slots
    const barnSlot = Math.floor(r() * slots)
    const sh = p.shadow
    for (let i = 0; i < slots; i++) {
      const x = i * step + r() * step * 0.3
      const roll = r()
      if (i === barnSlot) {
        this.tiled(x, 90 * s, (px) => barn(g, p, px, y(px + 40 * s) + 3, s, sh))
        continue
      }
      if (roll < 0.45) {
        const th = (62 + r() * 30) * s
        const seed = Math.floor(r() * 1e6)
        this.tiled(x + 30, 60 * s, (px) => blossomTree(g, p, px, y(px) + 3, th, seed, sh))
      }
      if (roll > 0.3 && roll < 0.8) {
        const fx = x + 50 + r() * 30
        const len = (60 + r() * 70) * s
        this.tiled(fx, len + 20, (px) => fence(g, p, px, len, y, s, sh))
      }
      const fl = 1 + Math.floor(r() * 3)
      for (let k = 0; k < fl; k++) {
        const fx = x + r() * step
        const seed = Math.floor(r() * 1e6)
        this.tiled(fx, 14, (px) => flowerClump(g, p, px, y(px) + 2, s, seed))
      }
    }
    // pushed back with haze so the (inked, saturated) obstacles stay the boldest thing at ground level
    this.hazeOver(g, p, gy - 120 * s, 0.2, 0.26, gy - 16 * s, p.mist * 0.22)
    return c
  }

  paintGround(p: Pal) {
    const B = this.h - this.gy
    const top = 10
    const [c, g] = canvas(TW, B + top)
    const Y = top
    const lip = Math.max(6, Math.min(12, B * 0.1))
    const pathTop = Y + lip
    const pathH = Math.max(14, B * 0.42)
    const vergeTop = pathTop + pathH
    const r = seeded(73)
    const u = (x: number) => (x / TW) * TAU
    const wrap = (x: number, m: number, fn: (x: number) => void) => {
      fn(x)
      if (x - m < 0) fn(x + TW)
      if (x + m > TW) fn(x - TW)
    }
    // foreground verge
    const verge = g.createLinearGradient(0, pathTop, 0, B + top)
    verge.addColorStop(0, mix(p.grass, p.shade, 0.18))
    verge.addColorStop(1, mix(p.grass, p.shade, 0.62))
    g.fillStyle = verge
    g.fillRect(0, pathTop, TW, B + top - pathTop)
    // dirt path with wavy edges
    const pTop = (x: number) => pathTop + 1.5 * Math.sin(u(x) * 3 + 1)
    const pBot = (x: number) => vergeTop + 3 * Math.sin(u(x) * 4 + 0.3) + 2 * Math.sin(u(x) * 9)
    const dirt = g.createLinearGradient(0, pathTop, 0, vergeTop)
    dirt.addColorStop(0, mix(p.dirt, p.glow, 0.28))
    dirt.addColorStop(0.45, p.dirt)
    dirt.addColorStop(1, mix(p.dirt, p.dirtDark, 0.55))
    g.fillStyle = dirt
    g.beginPath()
    for (let x = 0; x <= TW; x += 6) g.lineTo(x, pTop(x))
    for (let x = TW; x >= 0; x -= 6) g.lineTo(x, pBot(x))
    g.closePath()
    g.fill()
    // wheel ruts: shaded groove with a lit lower lip
    for (const f of [0.38, 0.74]) {
      const ry = (x: number) => pathTop + pathH * f + 1.6 * Math.sin(u(x) * 2 + f * 5)
      g.lineWidth = 2.2
      g.strokeStyle = a0(p.dirtDark, 0.45)
      g.beginPath()
      for (let x = 0; x <= TW; x += 10) g.lineTo(x, ry(x))
      g.stroke()
      g.lineWidth = 1.2
      g.strokeStyle = a0(p.glow, 0.35)
      g.beginPath()
      for (let x = 0; x <= TW; x += 10) g.lineTo(x, ry(x) + 2)
      g.stroke()
    }
    // pebbles with lit tops and sun-cast shadows
    const shLen = 2 + p.shadow * 9
    for (let i = 0; i < 30; i++) {
      const x = r() * TW
      const py = pathTop + 3 + r() * (pathH - 6)
      const rx = 1.2 + r() * 2.4
      wrap(x, 14, (px) => {
        g.fillStyle = a0(p.dirtDark, 0.28)
        g.beginPath()
        g.ellipse(px - shLen * 0.5 - rx * 0.3, py + rx * 0.4, rx + shLen * 0.5, rx * 0.45, 0, 0, TAU)
        g.fill()
        g.fillStyle = mix(p.dirt, p.dirtDark, 0.6)
        g.beginPath()
        g.ellipse(px, py, rx, rx * 0.7, 0, 0, TAU)
        g.fill()
        g.fillStyle = a0(p.glow, 0.75)
        g.beginPath()
        g.ellipse(px + rx * 0.25, py - rx * 0.25, rx * 0.5, rx * 0.3, 0, 0, TAU)
        g.fill()
      })
    }
    // grass lip on top (where the runner's feet land)
    const lipG = g.createLinearGradient(0, Y, 0, pathTop + 2)
    lipG.addColorStop(0, mix(p.grass, p.glow, 0.4))
    lipG.addColorStop(0.5, p.grass)
    lipG.addColorStop(1, mix(p.grass, p.shade, 0.4))
    g.fillStyle = lipG
    g.beginPath()
    g.moveTo(0, Y - 0.5)
    g.lineTo(TW, Y - 0.5)
    for (let x = TW; x >= 0; x -= 4) g.lineTo(x, pTop(x) + 1.5 + (x % 8 === 0 ? 2.5 : 0))
    g.closePath()
    g.fill()
    // blades, bent by the wind
    const bend = -0.25 - p.wind * 0.22
    for (const [col, al, hmul] of [
      [mix(p.grass, p.shade, 0.35), 1, 1],
      [mix(p.grass, p.glow, 0.45), 0.9, 0.7],
    ] as const) {
      g.fillStyle = col
      g.globalAlpha = al
      g.beginPath()
      for (let x = 0; x < TW; x += 2.6) {
        const hh = (2 + r() * 5.5) * hmul
        const tip = x + (bend + (r() - 0.5) * 0.5) * hh * 1.6
        g.moveTo(x - 1.1, Y + 2)
        g.quadraticCurveTo(x, Y - hh * 0.4, tip, Y - hh)
        g.lineTo(x + 1.1, Y + 2)
        g.closePath()
      }
      g.fill()
    }
    g.globalAlpha = 1
    const flowerCols = ['#fbf7ee', '#fbf7ee', '#f6d65e', '#f6d65e', '#f49ac1']
    const flower = (x: number, fy: number, rad: number) => {
      const col = flowerCols[Math.floor(r() * flowerCols.length)]
      wrap(x, 6, (px) => {
        g.fillStyle = col
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU
          g.beginPath()
          g.arc(px + Math.cos(a) * rad, fy + Math.sin(a) * rad * 0.7, rad * 0.75, 0, TAU)
          g.fill()
        }
        g.fillStyle = col === '#f6d65e' ? '#c98a1e' : '#f2c14e'
        g.beginPath()
        g.arc(px, fy, rad * 0.6, 0, TAU)
        g.fill()
      })
    }
    for (let i = 0; i < 12; i++) flower(r() * TW, Y - 2 - r() * 2, 1.1)
    // foreground tufts + flowers in the verge
    g.lineWidth = 1.4
    for (let i = 0; i < 34; i++) {
      const x = r() * TW
      const fy = vergeTop + 8 + r() * Math.max(4, B + top - vergeTop - 12)
      const k = 4 + Math.floor(r() * 4)
      const hh = 5 + r() * 8
      wrap(x, 12, (px) => {
        g.strokeStyle = mix(p.grass, p.glow, 0.15 + r() * 0.25)
        g.beginPath()
        for (let j = 0; j < k; j++) {
          const bx = px + (j - k / 2) * 2
          g.moveTo(bx, fy)
          g.quadraticCurveTo(bx, fy - hh * 0.6, bx + (bend * 0.8 + (j - k / 2) * 0.25) * hh, fy - hh)
        }
        g.stroke()
      })
      if (r() < 0.6) flower(x + 3, fy - hh * 0.8, 1.5 + r() * 0.8)
    }
    return c
  }
}

// ---------- sprites & props ----------

/** crops the empty sky off a layer so each frame blits only the painted rows */
function trimTop(c: HTMLCanvasElement) {
  const g = c.getContext('2d') as C2D
  const data = g.getImageData(0, 0, c.width, c.height).data
  let top = 0
  scan: for (; top < c.height; top++)
    for (let i = top * c.width * 4 + 3, end = i + c.width * 4; i < end; i += 8) if (data[i] > 0) break scan
  top = Math.max(0, top - 2)
  const [out, o] = canvas(c.width, c.height - top)
  o.drawImage(c, 0, -top)
  return { c: out, top }
}

function cloudSprite(p: Pal, seed: number) {
  const W = 300
  const H = 130
  const base = 118
  const [c, g] = canvas(W, H)
  const r = seeded(seed)
  const n = 5 + Math.floor(r() * 3)
  const puffs: [number, number, number][] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const rad = 20 + r() * 14 + Math.sin(t * Math.PI) * (20 + r() * 16)
    puffs.push([36 + t * 228 + (r() - 0.5) * 16, base - rad * (0.55 + r() * 0.25), rad])
  }
  const path = new Path2D()
  for (const [x, y, rad] of puffs) {
    path.moveTo(x + rad, y)
    path.arc(x, y, rad, 0, TAU)
  }
  path.rect(30, base - 22, 240, 22)
  const [lx, ly] = p.light
  g.save()
  g.beginPath()
  g.rect(0, 0, W, base)
  g.clip()
  g.fillStyle = mix(p.glow, '#ffffff', 0.4)
  g.fill(path)
  g.globalCompositeOperation = 'source-atop'
  g.save()
  g.translate(-lx * 7, -ly * 7)
  g.fillStyle = p.cloud
  g.fill(path)
  g.restore()
  const under = g.createLinearGradient(0, base - 70, 0, base)
  const shadeA = clamp01(0.3 + 0.55 * -ly)
  under.addColorStop(0, a0(p.cloudShade, 0))
  under.addColorStop(1, a0(p.cloudShade, shadeA))
  g.fillStyle = under
  g.fillRect(0, 0, W, base)
  // away-from-sun side falls into soft shade
  const side = g.createLinearGradient(W, 0, 0, 0)
  side.addColorStop(0, a0(p.cloudShade, 0))
  side.addColorStop(1, a0(p.cloudShade, 0.3 * Math.abs(lx)))
  g.fillStyle = side
  g.fillRect(0, 0, W, base)
  g.restore()
  const [c2, g2] = canvas(W, H)
  g2.filter = 'blur(1.4px)'
  g2.drawImage(c, 0, 0)
  return c2
}

function balloonSprite(p: Pal) {
  const [c, g] = canvas(40, 60)
  const env = new Path2D()
  env.arc(20, 19, 15, Math.PI * 0.82, Math.PI * 0.18)
  env.quadraticCurveTo(31, 31, 23.5, 39)
  env.lineTo(16.5, 39)
  env.quadraticCurveTo(9, 31, 20 - 15 * Math.cos(Math.PI * 0.18), 19 + 15 * Math.sin(Math.PI * 0.18))
  env.closePath()
  g.fillStyle = '#f6eadc'
  g.fill(env)
  g.save()
  g.clip(env)
  g.fillStyle = '#e8737f'
  for (const k of [-0.62, 0, 0.62]) {
    g.beginPath()
    g.ellipse(20 + k * 15, 22, 3.6 * (1 - Math.abs(k) * 0.35), 22, 0, 0, TAU)
    g.fill()
  }
  const shade = g.createLinearGradient(5, 0, 35, 0)
  shade.addColorStop(0, a0(p.shade, 0.45))
  shade.addColorStop(0.55, a0(p.shade, 0))
  shade.addColorStop(1, a0(p.glow, 0.45))
  g.fillStyle = shade
  g.fillRect(0, 0, 40, 40)
  g.restore()
  g.strokeStyle = '#6e5440'
  g.lineWidth = 0.8
  g.beginPath()
  g.moveTo(17, 39)
  g.lineTo(18, 46)
  g.moveTo(23, 39)
  g.lineTo(22, 46)
  g.stroke()
  g.fillStyle = '#8a6442'
  g.fillRect(17, 46, 6, 5)
  // distance haze
  g.globalCompositeOperation = 'source-atop'
  g.fillStyle = a0(p.haze, 0.3)
  g.fillRect(0, 0, 40, 60)
  return c
}

function shadowSprite(p: Pal) {
  const [c, g] = canvas(200, 60)
  g.translate(100, 30)
  g.scale(1, 0.3)
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, 100)
  rg.addColorStop(0, a0(p.shade, 1))
  rg.addColorStop(0.6, a0(p.shade, 0.6))
  rg.addColorStop(1, a0(p.shade, 0))
  g.fillStyle = rg
  g.fillRect(-100, -100, 200, 200)
  return c
}

/** soft round tree: shaded mass, lit mass nudged toward the sun, small highlight */
function roundTree(g: C2D, p: Pal, x: number, base: number, rr: number, hue: string) {
  const [lx, ly] = p.light
  g.fillStyle = mix(hue, p.shade, 0.6)
  g.fillRect(x - 1, base - rr * 0.8, 2, rr * 0.8)
  const cy = base - rr * 1.5
  g.fillStyle = mix(hue, p.shade, 0.45)
  g.beginPath()
  g.arc(x, cy, rr, 0, TAU)
  g.arc(x - rr * 0.6, cy + rr * 0.3, rr * 0.7, 0, TAU)
  g.fill()
  g.fillStyle = mix(hue, p.glow, 0.1)
  g.beginPath()
  g.arc(x + lx * rr * 0.22, cy + ly * rr * 0.22, rr * 0.78, 0, TAU)
  g.fill()
  g.fillStyle = mix(hue, p.glow, 0.45)
  g.beginPath()
  g.arc(x + lx * rr * 0.45, cy + ly * rr * 0.45, rr * 0.4, 0, TAU)
  g.fill()
}

function millTower(g: C2D, p: Pal, x: number, base: number, s: number) {
  const H = 50 * s
  const bw = 16 * s
  const tw = 8 * s
  const wall = mix('#ece4d4', p.glow, 0.15)
  g.fillStyle = a0(p.shade, 0.25)
  g.beginPath()
  g.ellipse(x - p.light[0] * p.shadow * 14, base, bw * 0.7 + p.shadow * 14, 2.5, 0, 0, TAU)
  g.fill()
  g.fillStyle = mix('#ece4d4', p.shade, 0.35)
  g.beginPath()
  g.moveTo(x - bw / 2, base)
  g.lineTo(x - tw / 2, base - H)
  g.lineTo(x + tw / 2, base - H)
  g.lineTo(x + bw / 2, base)
  g.closePath()
  g.fill()
  g.fillStyle = wall
  g.beginPath()
  g.moveTo(x - bw * 0.05, base)
  g.lineTo(x, base - H)
  g.lineTo(x + tw / 2, base - H)
  g.lineTo(x + bw / 2, base)
  g.closePath()
  g.fill()
  // cap
  g.fillStyle = mix('#7a5a50', p.shade, 0.15)
  g.beginPath()
  g.moveTo(x - tw / 2 - 3 * s, base - H + 1)
  g.quadraticCurveTo(x - tw * 0.3, base - H - 9 * s, x, base - H - 10 * s)
  g.quadraticCurveTo(x + tw * 0.4, base - H - 9 * s, x + tw / 2 + 3 * s, base - H + 1)
  g.closePath()
  g.fill()
  g.strokeStyle = a0(p.glow, 0.7)
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(x + 1, base - H - 9.5 * s)
  g.quadraticCurveTo(x + tw * 0.4, base - H - 9 * s, x + tw / 2 + 3 * s, base - H + 1)
  g.stroke()
  g.fillStyle = mix('#5b4036', p.shade, 0.3)
  g.fillRect(x - 2.5 * s, base - 8 * s, 5 * s, 8 * s)
  g.fillRect(x - 1.5 * s, base - H * 0.6, 3 * s, 4 * s)
}

function barn(g: C2D, p: Pal, x: number, base: number, s: number, sh: number) {
  const fw = 46 * s
  const sw = 30 * s
  const Hw = 30 * s
  const Hr = 24 * s
  const wall = '#e2d1b0'
  const red = '#c8423a'
  // ground shadow, stretched away from the sun
  g.fillStyle = a0(p.shade, 0.3)
  g.beginPath()
  g.ellipse(x + (fw + sw) / 2 - sh * 50 * s, base, (fw + sw) * 0.6 + sh * 50 * s, 4 * s, 0, 0, TAU)
  g.fill()
  // side wall (faces the sun)
  const sideTop = base - Hw
  g.fillStyle = mix(wall, p.glow, 0.35)
  g.fillRect(x + fw, sideTop - 2 * s, sw, Hw + 2 * s)
  g.strokeStyle = a0(p.shade, 0.18)
  g.lineWidth = 1
  g.beginPath()
  for (let k = 1; k < 6; k++) {
    g.moveTo(x + fw + (k * sw) / 6, sideTop - 2 * s)
    g.lineTo(x + fw + (k * sw) / 6, base)
  }
  g.stroke()
  // side roof: two gambrel slopes, the red accent of the scene
  const gx = x + fw / 2
  const peak = base - Hw - Hr
  const knee = base - Hw - Hr * 0.58
  g.fillStyle = mix(red, p.shade, 0.15)
  g.beginPath()
  g.moveTo(gx, peak)
  g.lineTo(gx + sw, peak - 2 * s)
  g.lineTo(x + fw * 0.88 + sw, knee - 2 * s)
  g.lineTo(x + fw * 0.88, knee)
  g.closePath()
  g.fill()
  g.fillStyle = mix(red, p.glow, 0.22)
  g.beginPath()
  g.moveTo(x + fw * 0.88, knee)
  g.lineTo(x + fw * 0.88 + sw, knee - 2 * s)
  g.lineTo(x + fw + 3 * s + sw, base - Hw - 2 * s)
  g.lineTo(x + fw + 3 * s, base - Hw)
  g.closePath()
  g.fill()
  g.strokeStyle = a0(p.glow, 0.8)
  g.lineWidth = 1.3
  g.beginPath()
  g.moveTo(gx, peak)
  g.lineTo(gx + sw, peak - 2 * s)
  g.stroke()
  // front gable (turned from the sun: cooler, darker)
  g.fillStyle = mix(wall, p.shade, 0.3)
  g.beginPath()
  g.moveTo(x, base)
  g.lineTo(x, base - Hw)
  g.lineTo(x + fw * 0.12, knee)
  g.lineTo(gx, peak)
  g.lineTo(x + fw * 0.88, knee)
  g.lineTo(x + fw, base - Hw)
  g.lineTo(x + fw, base)
  g.closePath()
  g.fill()
  // roof edge trim
  g.strokeStyle = mix(red, p.shade, 0.3)
  g.lineWidth = 3 * s
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(x - 3 * s, base - Hw + 1)
  g.lineTo(x + fw * 0.12, knee)
  g.lineTo(gx, peak)
  g.lineTo(x + fw * 0.88, knee)
  g.lineTo(x + fw + 3 * s, base - Hw + 1)
  g.stroke()
  // doors with white X bracing
  const dw = fw * 0.5
  const dh = Hw * 0.68
  const dx = gx - dw / 2
  g.fillStyle = mix('#9b4a36', p.shade, 0.25)
  g.fillRect(dx, base - dh, dw, dh)
  g.strokeStyle = mix('#f3ead8', p.shade, 0.2)
  g.lineWidth = 1.4 * s
  g.strokeRect(dx, base - dh, dw, dh)
  g.beginPath()
  g.moveTo(dx, base - dh)
  g.lineTo(dx + dw / 2, base)
  g.moveTo(dx + dw / 2, base - dh)
  g.lineTo(dx, base)
  g.moveTo(dx + dw / 2, base - dh)
  g.lineTo(dx + dw, base)
  g.moveTo(dx + dw, base - dh)
  g.lineTo(dx + dw / 2, base)
  g.moveTo(dx + dw / 2, base - dh)
  g.lineTo(dx + dw / 2, base)
  g.stroke()
  // hay loft window
  g.fillStyle = mix('#5a3a2c', p.shade, 0.3)
  g.fillRect(gx - 5 * s, base - Hw - Hr * 0.45, 10 * s, 9 * s)
  g.strokeRect(gx - 5 * s, base - Hw - Hr * 0.45, 10 * s, 9 * s)
}

function blossomTree(g: C2D, p: Pal, x: number, base: number, th: number, seed: number, sh: number) {
  const r = seeded(seed)
  const [lx, ly] = p.light
  const warm = p.shadow > 0.9 ? 0.25 : 0.05
  const pink = mix('#f2a9c4', p.glow, warm)
  const cx = x + 4
  const cy = base - th * 0.72
  const R = th * 0.36
  g.fillStyle = a0(p.shade, 0.28)
  g.beginPath()
  g.ellipse(x - sh * th * 0.6, base, R * 0.7 + sh * th * 0.6, 3.5, 0, 0, TAU)
  g.fill()
  // trunk & two limbs
  g.strokeStyle = mix('#5e4134', p.shade, 0.2)
  g.lineCap = 'round'
  g.lineWidth = th * 0.075
  g.beginPath()
  g.moveTo(x, base)
  g.quadraticCurveTo(x - 3, base - th * 0.3, cx, cy + R * 0.2)
  g.stroke()
  g.lineWidth = th * 0.04
  g.beginPath()
  g.moveTo(x - 1, base - th * 0.32)
  g.quadraticCurveTo(x - R * 0.5, base - th * 0.45, x - R * 0.7, cy + R * 0.1)
  g.moveTo(x, base - th * 0.38)
  g.quadraticCurveTo(x + R * 0.5, base - th * 0.5, x + R * 0.75, cy)
  g.stroke()
  const puffs: [number, number, number][] = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + r() * 0.5
    const d = R * (0.35 + r() * 0.45)
    puffs.push([cx + Math.cos(a) * d * 1.15, cy + Math.sin(a) * d * 0.7, R * (0.38 + r() * 0.2)])
  }
  puffs.push([cx, cy - R * 0.1, R * 0.55])
  // one canopy mass, shaded across by a gradient running away from the sun
  const body = g.createLinearGradient(cx - lx * R * 1.3, cy - ly * R * 1.3 + R * 0.4, cx + lx * R * 1.1, cy + ly * R * 1.1 - R * 0.2)
  body.addColorStop(0, mix('#cf7895', p.shade, 0.1))
  body.addColorStop(0.55, pink)
  body.addColorStop(1, mix(pink, '#fff3f6', 0.55))
  g.fillStyle = body
  g.beginPath()
  for (const [px, py, pr] of puffs) {
    g.moveTo(px + pr, py)
    g.arc(px, py, pr, 0, TAU)
  }
  g.fill()
  // lit tops of the sunward puffs, then blossom speckle
  g.fillStyle = mix(pink, '#fff6f8', 0.65)
  g.globalAlpha = 0.7
  g.beginPath()
  for (const [px, py, pr] of puffs) {
    if ((px - cx) * lx + (py - cy) * ly < -R * 0.1) continue
    const qx = px + lx * pr * 0.45
    const qy = py + ly * pr * 0.45 - pr * 0.1
    g.moveTo(qx + pr * 0.42, qy)
    g.arc(qx, qy, pr * 0.42, 0, TAU)
  }
  g.fill()
  g.globalAlpha = 1
  g.fillStyle = '#fff6f9'
  g.globalAlpha = 0.8
  for (let i = 0; i < 12; i++) {
    const a = r() * TAU
    const d = r() * R
    g.fillRect(cx + Math.cos(a) * d + lx * 4, cy + Math.sin(a) * d * 0.6 - 3, 1.5, 1.5)
  }
  g.globalAlpha = 1
  // fallen petals on the grass
  g.fillStyle = mix(pink, '#ffffff', 0.3)
  for (let i = 0; i < 10; i++) g.fillRect(x - R + r() * R * 2.2, base - 1 + r() * 3, 2, 1.2)
}

function fence(g: C2D, p: Pal, x0: number, len: number, y: (x: number) => number, s: number, sh: number) {
  const wood = mix('#a07a55', p.shade, 0.12)
  const lit = mix('#e6cba0', p.glow, 0.3)
  const ph = 22 * s
  const posts: [number, number][] = []
  for (let x = x0; x <= x0 + len; x += 20 * s) posts.push([x, y(x) + 4])
  if (sh > 0.3) {
    g.fillStyle = a0(p.shade, 0.22)
    for (const [px, py] of posts) {
      g.beginPath()
      g.moveTo(px, py)
      g.lineTo(px - ph * sh * 1.6, py + 1)
      g.lineTo(px - ph * sh * 1.6 + 3, py + 2.5)
      g.lineTo(px + 3, py + 1)
      g.fill()
    }
  }
  for (const rh of [0.75, 0.4]) {
    g.strokeStyle = wood
    g.lineWidth = 3 * s
    g.beginPath()
    for (const [i, [px, py]] of posts.entries()) (i ? g.lineTo : g.moveTo).call(g, px, py - ph * rh)
    g.stroke()
    g.strokeStyle = lit
    g.lineWidth = 1
    g.beginPath()
    for (const [i, [px, py]] of posts.entries()) (i ? g.lineTo : g.moveTo).call(g, px, py - ph * rh - 1.3 * s)
    g.stroke()
  }
  for (const [px, py] of posts) {
    g.fillStyle = wood
    g.fillRect(px - 2 * s, py - ph, 4 * s, ph)
    g.fillStyle = lit
    g.fillRect(px + 0.8 * s, py - ph, 1.2 * s, ph)
    g.fillRect(px - 2 * s, py - ph, 4 * s, 1.2)
  }
}

function flowerClump(g: C2D, p: Pal, x: number, base: number, s: number, seed: number) {
  const r = seeded(seed)
  g.lineWidth = 1.2
  g.strokeStyle = mix(p.near, p.shade, 0.25)
  g.beginPath()
  const k = 5 + Math.floor(r() * 4)
  for (let i = 0; i < k; i++) {
    const bx = x + (i - k / 2) * 2 * s
    const hh = (6 + r() * 7) * s
    g.moveTo(bx, base)
    g.quadraticCurveTo(bx, base - hh * 0.6, bx + (r() - 0.6) * 5, base - hh)
  }
  g.stroke()
  const cols = ['#fbf6ec', '#fbf6ec', '#f5d35a', '#f5d35a', '#f48fb8']
  for (let i = 0; i < 4 + Math.floor(r() * 4); i++) {
    const fx = x + (r() - 0.5) * 14 * s
    const fy = base - (5 + r() * 9) * s
    const col = cols[Math.floor(r() * cols.length)]
    g.fillStyle = mix(col, p.shade, 0.15)
    g.beginPath()
    g.arc(fx, fy, 2.2 * s, 0, TAU)
    g.fill()
    g.fillStyle = mix(col, p.glow, 0.3)
    g.beginPath()
    g.arc(fx + 0.5, fy - 0.5, 1.3 * s, 0, TAU)
    g.fill()
  }
}
