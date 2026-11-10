// Cinder Caldera: a volcanic night lit from below by lava. Same structure as engine/background.ts:
// cached tileable parallax layers (0.10 / 0.24 / 0.48 of scroll speed), a pre-blurred
// quarter-resolution glow buffer for the light, a full-speed ground band and weather particles.
import { mix } from '../../engine/background'
import { storage } from '../../storage'
import type { Scene, Tier } from '../types'

export interface Palette {
  skyTop: string
  skyMid: string
  horizon: string
  /** silhouettes far → near */
  far: string
  mid: string
  near: string
  lava: string
  hot: string
  /** overall light strength 0–1 */
  glow: number
  /** mean seconds between eruption pulses */
  flashEvery: number
  /** particle mix 0–1 */
  embers: number
  ash: number
  /** volcano size, cliff height */
  volcano: number
  cliffs: number
}

export const PALETTES: Palette[] = [
  // 0 Ashfall: grey-red ash dusk, the volcano a distant glow
  {
    skyTop: '#0d0a0b', skyMid: '#221718', horizon: '#553029', far: '#38231f', mid: '#1b1211', near: '#0b0707',
    lava: '#f0682c', hot: '#ffb070', glow: 0.55, flashEvery: 13, embers: 0.3, ash: 1, volcano: 0.8, cliffs: 0.7,
  },
  // 1 Basalt Steps: terraces of columns, lava pools
  {
    skyTop: '#0e090a', skyMid: '#291414', horizon: '#692c1c', far: '#40201a', mid: '#1e100e', near: '#0b0606',
    lava: '#ff6a22', hot: '#ffb45e', glow: 0.7, flashEvery: 10, embers: 0.5, ash: 0.75, volcano: 0.92, cliffs: 0.8,
  },
  // 2 Lava Falls: bright cascades, stronger orange
  {
    skyTop: '#110908', skyMid: '#331711', horizon: '#84361a', far: '#4a2318', mid: '#21100b', near: '#0c0605',
    lava: '#ff7b1c', hot: '#ffc75e', glow: 0.85, flashEvery: 7, embers: 0.7, ash: 0.55, volcano: 1.02, cliffs: 0.95,
  },
  // 3 Heart of the Mountain: inside the caldera, intense red, frequent pulses
  {
    skyTop: '#160606', skyMid: '#400e0b', horizon: '#9a2414', far: '#521a12', mid: '#250b08', near: '#0e0504',
    lava: '#ff4d1a', hot: '#ffd060', glow: 1, flashEvery: 4.2, embers: 1, ash: 0.4, volcano: 1.25, cliffs: 1.2,
  },
]

const QUALITY_SCALE = { low: 0.35, medium: 0.65, high: 1 } as const
const TAU = Math.PI * 2
const GROUND_TILE = 640

/** Deterministic RNG so a rebuilt layer keeps the same layout. */
export const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  return c
}
const ctxOf = (c: HTMLCanvasElement) => c.getContext('2d') as CanvasRenderingContext2D

interface Mote {
  x: number
  y: number
  vy: number
  depth: number
  phase: number
  size: number
}
interface Bomb {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}
interface Fall {
  x: number
  top: number
  bottom: number
  width: number
}

export class CalderaScene implements Scene {
  off = [0, 0, 0]
  offGround = 0
  tier: Tier = 0
  key = ''
  sky: HTMLCanvasElement | null = null
  glow: HTMLCanvasElement | null = null
  layers: HTMLCanvasElement[] = []
  groundBase: HTMLCanvasElement | null = null
  groundGlow: HTMLCanvasElement | null = null
  ember: HTMLCanvasElement | null = null
  falls: Fall[] = []
  crater = { x: 0, y: 0, u: 1 }
  embers: Mote[] = []
  ash: Mote[] = []
  bombs: Bomb[] = []
  quality: number
  haze: boolean
  flashStart = -100
  nextFlash = 0

  constructor(
    public w: number,
    public h: number,
    public gy: number,
  ) {
    const q = storage.getSettings().particlesQuality
    this.quality = QUALITY_SCALE[q] ?? 1
    this.haze = q !== 'low'
    for (let i = 0; i < Math.round(110 * this.quality); i++) this.embers.push(this.newEmber(true))
    for (let i = 0; i < Math.round(130 * this.quality); i++) {
      const depth = 0.35 + Math.random() * 0.65
      this.ash.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: 0.25 + Math.random() * 0.45,
        depth,
        phase: Math.random() * TAU,
        size: 0.8 + depth * 1.4,
      })
    }
  }

  newEmber(anywhere: boolean): Mote {
    const depth = 0.4 + Math.random() * 0.6
    return {
      x: Math.random() * (this.w + 120),
      y: anywhere ? Math.random() * this.h : this.gy + Math.random() * (this.h - this.gy),
      vy: 0.5 + Math.random() * 1.1,
      depth,
      phase: Math.random() * TAU,
      size: 1.6 + depth * 2.6,
    }
  }

  resize(w: number, h: number, gy: number) {
    this.w = w
    this.h = h
    this.gy = gy
    for (const m of [...this.embers, ...this.ash]) {
      if (m.x > w) m.x = Math.random() * w
      if (m.y > h) m.y = Math.random() * h
    }
  }

  update(speed: number) {
    this.off[0] = (this.off[0] + speed * 0.1) % this.w
    this.off[1] = (this.off[1] + speed * 0.24) % this.w
    this.off[2] = (this.off[2] + speed * 0.48) % this.w
    this.offGround = (this.offGround + speed) % GROUND_TILE
    const now = performance.now() / 1000
    for (const e of this.embers) {
      e.y -= e.vy * e.depth
      e.x -= speed * 0.35 * e.depth + 0.25 + Math.sin(now * 1.7 + e.phase) * 0.5
      if (e.y < -8 || e.x < -8) Object.assign(e, this.newEmber(false))
    }
    for (const a of this.ash) {
      a.y += a.vy * a.depth
      a.x -= (speed * 0.2 + 0.4) * a.depth + Math.sin(now * 0.9 + a.phase) * 0.3
      if (a.y > this.h + 4) {
        a.y = -4
        a.x = Math.random() * (this.w + 200)
      }
      if (a.x < -6) {
        a.x = this.w + 6
        a.y = Math.random() * this.h
      }
    }
    // lava bombs thrown from the crater (more during an eruption pulse)
    const c = this.crater
    const pulse = this.flashAt(now)
    if (Math.random() < 0.12 + this.tier * 0.06 + pulse * 0.8) {
      this.bombs.push({
        x: c.x + (Math.random() - 0.5) * 8 * c.u,
        y: c.y,
        vx: (Math.random() - 0.5) * 1.2 * c.u,
        vy: -(1.2 + Math.random() * 1.6) * c.u * (1 + pulse),
        life: 1,
      })
    }
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i]
      b.x += b.vx
      b.y += b.vy
      b.vy += 0.045 * c.u
      b.life -= 0.012
      if (b.life <= 0 || b.y > c.y + 60 * c.u) this.bombs.splice(i, 1)
    }
  }

  /** Eruption pulse envelope 0–1: quick 0.35 s rise, 1.8 s fall; at most one every few seconds. */
  flashAt(now: number) {
    const t = now - this.flashStart
    if (t < 0 || t > 2.15) return 0
    return t < 0.35 ? t / 0.35 : (1 - (t - 0.35) / 1.8) ** 2
  }

  draw(ctx: CanvasRenderingContext2D, tier: Tier) {
    this.tier = tier
    this.ensure(tier)
    const p = PALETTES[tier]
    const { w, gy } = this
    const now = performance.now() / 1000
    if (now >= this.nextFlash) {
      if (this.nextFlash > 0) this.flashStart = now
      this.nextFlash = now + p.flashEvery * (0.7 + Math.random() * 0.6)
    }
    const flash = this.flashAt(now)
    const breathe = 0.5 + 0.5 * Math.sin(now * 0.7)

    ctx.save()
    if (this.sky) ctx.drawImage(this.sky, 0, 0)
    // the light: crater, plume underside and horizon glow
    ctx.globalCompositeOperation = 'lighter'
    if (this.glow) {
      ctx.globalAlpha = Math.min(1, 0.72 + breathe * 0.18 + flash * 0.5)
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(this.glow, 0, 0, w, gy)
    }
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.07 * (0.6 + p.glow * 0.4)
      ctx.fillStyle = p.lava
      ctx.fillRect(0, 0, w, gy)
    }
    // lava bombs
    ctx.globalAlpha = 1
    ctx.fillStyle = p.hot
    ctx.beginPath()
    for (const b of this.bombs) {
      const r = 0.6 + b.life * 1.1
      ctx.moveTo(b.x + r, b.y)
      ctx.arc(b.x, b.y, r, 0, TAU)
    }
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    for (let i = 0; i < 3; i++) {
      const ox = Math.floor(this.off[i])
      ctx.drawImage(this.layers[i], -ox, 0)
      ctx.drawImage(this.layers[i], w - ox, 0)
      if (i === 1) this.drawFallStreaks(ctx, p, now)
    }
    if (this.haze) this.drawHaze(ctx, now)
    this.drawGround(ctx, p, now, flash)
    this.drawEmbers(ctx, p, now)
    this.drawAsh(ctx, p)
    ctx.restore()
  }

  ensure(tier: Tier) {
    const key = `${tier}:${this.w}x${this.h}:${this.gy}`
    if (key === this.key) return
    this.key = key
    const p = PALETTES[tier]
    this.sky = makeCanvas(this.w, this.gy)
    this.paintSky(ctxOf(this.sky), p)
    this.glow = makeCanvas(this.w / 4, this.gy / 4)
    this.paintGlow(this.glow, p)
    this.layers = [0, 1, 2].map(() => makeCanvas(this.w, this.gy + 2))
    this.falls = []
    this.paintFar(ctxOf(this.layers[0]), p, tier)
    this.paintCliffs(ctxOf(this.layers[1]), p, tier)
    this.paintNear(ctxOf(this.layers[2]), p, tier)
    this.groundBase = makeCanvas(GROUND_TILE, this.h - this.gy)
    this.groundGlow = makeCanvas(GROUND_TILE, this.h - this.gy)
    this.paintGround(p)
    this.ember = makeCanvas(16, 16)
    const e = ctxOf(this.ember)
    const g = e.createRadialGradient(8, 8, 0, 8, 8, 8)
    g.addColorStop(0, mix(p.hot, '#ffffff', 0.35))
    g.addColorStop(0.25, p.hot)
    g.addColorStop(0.5, mix(p.lava, p.lava, 0, 0.45))
    g.addColorStop(1, mix(p.lava, p.lava, 0, 0))
    e.fillStyle = g
    e.fillRect(0, 0, 16, 16)
  }

  tiled(x: number, margin: number, draw: (x: number) => void) {
    draw(x)
    if (x - margin < 0) draw(x + this.w)
    if (x + margin > this.w) draw(x - this.w)
  }

  /** Tileable ridge height: integer harmonics over the tile width. */
  ridge(seed: number, harmonics: [number, number][]) {
    const rand = seeded(seed)
    const terms = harmonics.map(([k, a]) => ({ k, a, ph: rand() * TAU }))
    return (x: number) => {
      let y = 0
      for (const t of terms) y += t.a * Math.sin((TAU * t.k * x) / this.w + t.ph)
      return y
    }
  }

  // ---------------------------------------------------------------- sky: gradient, volcano, ash clouds
  paintSky(ctx: CanvasRenderingContext2D, p: Palette) {
    const { w, gy } = this
    const u = gy / 600
    const sky = ctx.createLinearGradient(0, 0, 0, gy)
    sky.addColorStop(0, p.skyTop)
    sky.addColorStop(0.45, p.skyMid)
    sky.addColorStop(0.85, mix(p.skyMid, p.horizon, 0.75))
    sky.addColorStop(1, p.horizon)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, gy)

    const rand = seeded(7)
    const s = p.volcano * u
    const vx = w * 0.66
    const baseY = gy * 0.86
    const H = 230 * s
    const cy = baseY - H
    const ch = 22 * s
    this.crater = { x: vx, y: cy + 2 * s, u: s }
    // volcano silhouette: concave flanks, notched crater
    const cone = new Path2D()
    cone.moveTo(vx - H * 2.6, gy + 2)
    cone.bezierCurveTo(vx - H * 1.2, baseY - H * 0.1, vx - ch * 2.2, cy + H * 0.3, vx - ch, cy)
    cone.lineTo(vx - ch * 0.45, cy + 5 * s)
    cone.lineTo(vx + ch * 0.35, cy + 4 * s)
    cone.lineTo(vx + ch * 1.05, cy - 1 * s)
    cone.bezierCurveTo(vx + ch * 2.4, cy + H * 0.32, vx + H * 1.3, baseY - H * 0.08, vx + H * 2.7, gy + 2)
    cone.closePath()
    const body = ctx.createLinearGradient(0, cy, 0, gy)
    body.addColorStop(0, mix(p.skyMid, '#000000', 0.35))
    body.addColorStop(1, mix(p.skyMid, p.horizon, 0.45))
    ctx.fillStyle = body
    ctx.fill(cone)
    ctx.save()
    ctx.clip(cone)
    // shaded right flank
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
    ctx.beginPath()
    ctx.moveTo(vx + ch * 0.2, cy)
    ctx.quadraticCurveTo(vx + H * 0.15, baseY - H * 0.4, vx + H * 0.35, gy)
    ctx.lineTo(vx + H * 3, gy)
    ctx.lineTo(vx + H * 3, cy - 10)
    ctx.fill()
    // the crater lights its own upper slopes
    const lit = ctx.createRadialGradient(vx, cy, 2, vx, cy, H * 0.8)
    lit.addColorStop(0, mix(p.lava, p.lava, 0, 0.55 * p.glow + 0.15))
    lit.addColorStop(1, mix(p.lava, p.lava, 0, 0))
    ctx.fillStyle = lit
    ctx.fillRect(vx - H, cy - 10, H * 2, H)
    // lava streams down the flanks
    const streams = 2 + Math.round(p.glow * 3)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (let i = 0; i < streams; i++) {
      const side = i % 2 ? 1 : -1
      let x = vx + side * ch * (0.2 + rand() * 0.6)
      let y = cy + 3 * s
      const len = H * (0.35 + rand() * 0.5)
      const pts: number[] = [x, y]
      const drift = side * (0.25 + rand() * 0.55)
      for (let d = 0; d < len; d += 6 * s) {
        y += 6 * s
        x += drift * 6 * s + (rand() - 0.5) * 5 * s
        pts.push(x, y)
      }
      const path = new Path2D()
      path.moveTo(pts[0], pts[1])
      for (let k = 2; k < pts.length; k += 2) path.lineTo(pts[k], pts[k + 1])
      const fade = ctx.createLinearGradient(0, cy, 0, cy + len)
      fade.addColorStop(0, p.hot)
      fade.addColorStop(0.4, p.lava)
      fade.addColorStop(1, mix(p.lava, p.lava, 0, 0.15))
      ctx.shadowColor = p.lava
      ctx.shadowBlur = 10 * s
      ctx.strokeStyle = fade
      ctx.lineWidth = 2.6 * s
      ctx.stroke(path)
      ctx.shadowBlur = 0
    }
    // atmospheric haze toward the base
    const haze = ctx.createLinearGradient(0, cy + H * 0.3, 0, gy)
    haze.addColorStop(0, mix(p.horizon, p.horizon, 0, 0))
    haze.addColorStop(1, mix(p.horizon, p.horizon, 0, 0.7))
    ctx.fillStyle = haze
    ctx.fillRect(0, cy, w, gy - cy)
    ctx.restore()
    // glowing crater lip
    ctx.fillStyle = p.hot
    ctx.shadowColor = p.lava
    ctx.shadowBlur = 14 * s
    ctx.beginPath()
    ctx.ellipse(vx, cy + 2 * s, ch * 0.95, 2.6 * s, 0, 0, TAU)
    ctx.fill()
    ctx.shadowBlur = 0

    // ash clouds and the plume: puffs painted top-down so each lower puff's lit belly overlaps the one above
    const clouds = makeCanvas(w, gy)
    const c = ctxOf(clouds)
    const puffs: { x: number; y: number; r: number; plume: number }[] = []
    const bank = this.ridge(31, [
      [1, 12],
      [3, 8],
      [7, 4],
    ])
    for (let x = -60; x < w + 60; x += (26 + rand() * 18) * u) {
      const nearV = Math.exp(-(((x - vx) / (w * 0.3)) ** 2))
      puffs.push({ x, y: gy * 0.05 + bank(x) * u + rand() * 18 * u, r: (34 + rand() * 30) * u, plume: 0 })
      if (rand() < 0.55 + nearV * 0.4)
        puffs.push({ x: x + rand() * 20 * u, y: gy * (0.14 + nearV * 0.06) + rand() * 26 * u, r: (24 + rand() * 22 + nearV * 16) * u, plume: 0 })
    }
    const top = gy * 0.18
    for (let i = 0; i < 40; i++) {
      const t = i / 39
      const y = cy - t * (cy - top)
      puffs.push({
        x: vx - t * t * w * 0.07 + (rand() - 0.5) * (6 + t * 30) * s,
        y: y + (rand() - 0.5) * 10 * s,
        r: (5 + t * 34 + rand() * 6) * s,
        plume: 1 - t,
      })
    }
    puffs.sort((a, b) => a.y - b.y)
    const ashC = mix(p.skyTop, '#4a3a38', 0.32)
    for (const pf of puffs) {
      const light = Math.min(1, p.glow * (0.25 + 0.85 * Math.exp(-(((pf.x - vx) / (w * 0.22)) ** 2))) + pf.plume * 0.6)
      const g = c.createLinearGradient(0, pf.y - pf.r, 0, pf.y + pf.r)
      g.addColorStop(0, mix(ashC, '#000000', 0.25))
      g.addColorStop(0.55, ashC)
      g.addColorStop(0.7, mix(ashC, p.lava, light * 0.3))
      g.addColorStop(1, mix(ashC, p.lava, light * 0.7))
      c.fillStyle = g
      c.beginPath()
      c.arc(pf.x, pf.y, pf.r, 0, TAU)
      c.fill()
    }
    ctx.filter = `blur(${Math.max(1.5, 3.5 * u)}px)`
    ctx.drawImage(clouds, 0, 0)
    ctx.filter = 'none'
    // calm the top of the sky
    const vign = ctx.createLinearGradient(0, 0, 0, gy * 0.35)
    vign.addColorStop(0, mix(p.skyTop, p.skyTop, 0, 0.75))
    vign.addColorStop(1, mix(p.skyTop, p.skyTop, 0, 0))
    ctx.fillStyle = vign
    ctx.fillRect(0, 0, w, gy * 0.35)
  }

  /** Pre-blurred quarter-resolution light: crater bloom, plume belly, horizon. Added with 'lighter'. */
  paintGlow(canvas: HTMLCanvasElement, p: Palette) {
    const { w, gy } = this
    const b = ctxOf(canvas)
    b.setTransform(canvas.width / w, 0, 0, canvas.height / gy, 0, 0)
    const { x, y, u } = this.crater
    const lv = (a: number) => mix(p.lava, p.lava, 0, a)
    const hor = b.createLinearGradient(0, gy * 0.55, 0, gy)
    hor.addColorStop(0, lv(0))
    hor.addColorStop(1, lv(0.3 * p.glow))
    b.fillStyle = hor
    b.fillRect(0, gy * 0.55, w, gy * 0.45)
    const bloom = (cx: number, cy: number, r: number, a: number, color = p.lava) => {
      const g = b.createRadialGradient(cx, cy, 0, cx, cy, r)
      g.addColorStop(0, mix(color, color, 0, a))
      g.addColorStop(0.25, mix(color, color, 0, a * 0.55))
      g.addColorStop(0.55, mix(color, color, 0, a * 0.2))
      g.addColorStop(0.8, mix(color, color, 0, a * 0.05))
      g.addColorStop(1, mix(color, color, 0, 0))
      b.fillStyle = g
      b.fillRect(cx - r, cy - r, r * 2, r * 2)
    }
    bloom(x, y, 170 * u, 0.55 * p.glow)
    bloom(x, y, 40 * u, 0.5, p.hot)
    bloom(x - 20 * u, gy * 0.24, 200 * u, 0.22 * p.glow)
    const soft = makeCanvas(canvas.width, canvas.height)
    const s = ctxOf(soft)
    s.filter = 'blur(2px)'
    s.drawImage(canvas, 0, 0)
    b.setTransform(1, 0, 0, 1, 0, 0)
    b.clearRect(0, 0, canvas.width, canvas.height)
    b.drawImage(soft, 0, 0)
  }

  // ---------------------------------------------------------------- layer 1: smoky caldera rim with lava threads
  paintFar(ctx: CanvasRenderingContext2D, p: Palette, tier: Tier) {
    const { w, gy } = this
    const u = gy / 600
    const rand = seeded(19)
    const base = (36 + tier * 26) * u
    const f = this.ridge(5, [
      [2, 16],
      [5, 10],
      [11, 6],
      [23, 3],
      [41, 1.6],
    ])
    const ry = (x: number) => gy - 30 * u - base - f(x) * u * (1 + tier * 0.3)
    const path = new Path2D()
    path.moveTo(0, gy + 2)
    for (let x = 0; x <= w; x += 4) path.lineTo(x, ry(x))
    path.lineTo(w, ry(w))
    path.lineTo(w, gy + 2)
    path.closePath()
    const top = gy - base * 1.6 - 60 * u
    const fill = ctx.createLinearGradient(0, top, 0, gy)
    fill.addColorStop(0, p.far)
    fill.addColorStop(1, mix(p.far, p.lava, 0.3))
    ctx.fillStyle = fill
    ctx.fill(path)
    ctx.save()
    ctx.clip(path)
    // lava threads trickling down the rim
    ctx.lineCap = 'round'
    ctx.strokeStyle = mix(p.lava, p.horizon, 0.35, 0.75)
    ctx.lineWidth = 1.3 * u
    for (let i = 0; i < 6 + tier * 3; i++) {
      const x0 = rand() * w
      const seed = Math.floor(rand() * 1e6)
      this.tiled(x0, 30, (sx) => {
        const r = seeded(seed)
        let x = sx
        let y = ry(x0) + 4
        ctx.beginPath()
        ctx.moveTo(x, y)
        while (y < gy) {
          y += 5 * u
          x += (r() - 0.5) * 4 * u
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      })
    }
    // haze: the far rim sinks into the smoky red
    const haze = ctx.createLinearGradient(0, top, 0, gy)
    haze.addColorStop(0, mix(p.horizon, p.horizon, 0, 0.25))
    haze.addColorStop(1, mix(p.horizon, p.lava, 0.2, 0.55))
    ctx.fillStyle = haze
    ctx.fillRect(0, 0, w, gy + 2)
    ctx.restore()
    // rim light along the crest
    ctx.strokeStyle = mix(p.far, p.hot, 0.35, 0.45)
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= w; x += 4) ctx.lineTo(x, ry(x) + 0.5)
    ctx.stroke()
    // lava river at the foot, visible between the cliffs
    ctx.shadowColor = p.lava
    ctx.shadowBlur = 12 * u
    ctx.strokeStyle = mix(p.lava, p.hot, 0.3)
    ctx.lineWidth = 3 * u
    ctx.beginPath()
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, gy - 24 * u + Math.sin((TAU * 6 * x) / w) * 3 * u)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // ---------------------------------------------------------------- layer 2: basalt column cliffs, lava falls
  /**
   * Natural basalt: each massif is a ragged staircase of columns of varied widths (back row hazier),
   * with slanted or broken hexagonal tops, rising out of a talus slope; falls spill over a lip,
   * land on the scree and run down into a pool.
   */
  paintCliffs(ctx: CanvasRenderingContext2D, p: Palette, tier: Tier) {
    const { w, gy } = this
    const u = gy / 600
    const rand = seeded(43 + tier)
    const footY = gy - 20 * u
    const front: ColumnStyle = {
      lit: mix(p.mid, p.horizon, 0.3),
      mid: mix(p.mid, p.horizon, 0.08),
      dark: mix(p.mid, '#000000', 0.35),
      cap: mix(p.mid, p.horizon, 0.7),
      edge: mix(p.hot, p.horizon, 0.5, 0.3),
    }
    const back: ColumnStyle = {
      lit: mix(p.mid, p.horizon, 0.42),
      mid: mix(p.mid, p.horizon, 0.3),
      dark: mix(p.mid, p.horizon, 0.18),
      cap: mix(p.mid, p.horizon, 0.62),
      edge: mix(p.horizon, p.horizon, 0, 0),
    }
    const talusC = mix(p.mid, p.horizon, 0.16)
    // continuous scree band under everything, so nothing stands on flat ground
    const scree = this.ridge(9, [
      [3, 6],
      [8, 4],
      [19, 2],
      [41, 1],
    ])
    const screeY = (x: number) => footY - 6 * u - scree(x) * u
    ctx.fillStyle = talusC
    ctx.beginPath()
    ctx.moveTo(0, gy + 2)
    for (let x = 0; x <= w; x += 5) ctx.lineTo(x, screeY(x))
    ctx.lineTo(w, gy + 2)
    ctx.fill()
    const falls: Fall[] = []
    const massifs = Math.max(3, Math.round(w / 300))
    const step = w / massifs
    for (let i = 0; i < massifs; i++) {
      const cx0 = i * step + rand() * step * 0.3
      const span = step * (0.5 + rand() * 0.35)
      const peak = gy * (0.13 + rand() * 0.13) * p.cliffs
      const crest = 0.25 + rand() * 0.5
      const env = (t: number) =>
        Math.max(0, t < crest ? Math.sin(((t / crest) * Math.PI) / 2) : Math.cos((((t - crest) / (1 - crest)) * Math.PI) / 2))
      const talusH = (t: number) => peak * 0.42 * env(t) ** 0.7 + 8 * u
      const row = (scale: number, jitter: number): Column[] => {
        const out: Column[] = []
        let x = -rand() * 8 * u
        let prev = 0
        let sticky = 0
        while (x < span) {
          const cw = (7 + rand() * 10) * u
          const t = (x + cw / 2) / span
          let hh = peak * scale * (0.1 + 0.9 * env(t) ** 0.9) * (1 - jitter / 2 + rand() * jitter)
          // short terraces: at most three neighbours share a step
          if (prev && sticky < 2 && rand() < 0.4) {
            hh = prev + (rand() - 0.5) * 5 * u
            sticky++
          } else {
            sticky = 0
            // neighbours stay related: a staircase, not isolated towers
            if (prev) hh = prev + (hh - prev) * 0.55
          }
          prev = hh
          out.push({ x, cw, top: footY - talusH(t) * 0.4 - hh, tilt: (rand() - 0.5) * cw * 0.8, broken: rand() < 0.22, seed: Math.floor(rand() * 1e6) })
          x += cw
        }
        return out
      }
      const backRow = row(1.12, 0.5).filter(() => rand() < 0.7)
      const frontRow = row(1, 0.35)
      // talus surface: lumpy rubble, fixed per massif
      const talus: Pt2[] = []
      for (let x = -40 * u; x <= span + 40 * u; x += (4 + rand() * 7) * u) {
        const t = Math.min(1, Math.max(0, x / span))
        const edgeFade = Math.min(1, Math.min(x + 40 * u, span + 40 * u - x) / (40 * u))
        talus.push([x, footY - talusH(t) * edgeFade - rand() * 4 * u])
      }
      const rocks: [number, number, number][] = []
      for (let k = 0; k < span / (14 * u); k++) {
        const x = rand() * span
        rocks.push([x, footY - talusH(x / span) * (0.2 + rand() * 0.7), (2 + rand() * 4) * u])
      }
      // a fall spills off the right lip of a tall column whose right neighbour steps down
      let fall: (Fall & { lipX: number; lipY: number }) | null = null
      const wantsFall = tier >= 2 ? rand() < 0.85 : tier === 1 ? rand() < 0.3 : false
      if (wantsFall) {
        let best = -1
        for (let k = 0; k < frontRow.length - 1; k++)
          if (frontRow[k + 1].top > frontRow[k].top + 6 * u && (best < 0 || frontRow[k].top < frontRow[best].top)) best = k
        if (best >= 0) {
          const c = frontRow[best]
          const lipX = c.x + c.cw
          const lipY = c.top + c.tilt / 2
          const width = (3 + rand() * 2.5 + tier) * u
          const fx = lipX + width * 0.7
          const t = fx / span
          fall = { x: cx0 + fx, top: lipY + 4 * u, bottom: footY - talusH(t) + 4 * u, width, lipX, lipY }
          falls.push({ x: fall.x, top: fall.top, bottom: fall.bottom, width })
        }
      }
      const poolR = (16 + rand() * 14) * u
      const poolDx = fall ? fall.x - cx0 + (rand() - 0.3) * 10 * u : span + 20 * u
      const hasPool = !!fall || (tier >= 1 && rand() < 0.6)
      this.tiled(cx0, span + 60 * u, (sx) => {
        const dx = sx - cx0
        for (const c of backRow) drawBasalt(ctx, c, sx + c.cw * 0.5, footY, back, null)
        for (const c of frontRow) drawBasalt(ctx, c, sx, footY, front, seeded(c.seed))
        if (fall) drawFall(ctx, { ...fall, x: fall.x + dx }, fall.lipX + sx, fall.lipY, p, u)
        // talus in front of the column feet
        const g = ctx.createLinearGradient(0, footY - peak * 0.35, 0, footY)
        g.addColorStop(0, mix(talusC, p.horizon, 0.25))
        g.addColorStop(1, talusC)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(sx + talus[0][0], gy + 2)
        for (const [tx, ty] of talus) ctx.lineTo(sx + tx, ty)
        ctx.lineTo(sx + talus[talus.length - 1][0], gy + 2)
        ctx.fill()
        ctx.fillStyle = mix(talusC, '#000000', 0.3)
        ctx.strokeStyle = mix(p.horizon, p.hot, 0.2, 0.35)
        ctx.lineWidth = 1
        for (const [rx, ry, rr] of rocks) {
          ctx.beginPath()
          ctx.moveTo(sx + rx - rr, ry + rr * 0.5)
          ctx.lineTo(sx + rx - rr * 0.6, ry - rr * 0.5)
          ctx.lineTo(sx + rx + rr * 0.5, ry - rr * 0.6)
          ctx.lineTo(sx + rx + rr, ry + rr * 0.5)
          ctx.closePath()
          ctx.fill()
          ctx.beginPath()
          ctx.moveTo(sx + rx - rr * 0.6, ry - rr * 0.5)
          ctx.lineTo(sx + rx + rr * 0.5, ry - rr * 0.6)
          ctx.stroke()
        }
        if (fall) drawRivulet(ctx, fall.x + dx, fall.bottom - 4 * u, footY, fall.width, p, u)
        if (hasPool) drawPool(ctx, sx + poolDx, footY, poolR, 3.5 * u, p)
      })
    }
    // fallen column chunks scattered on the scree between massifs
    for (let k = 0; k < w / (90 * u); k++) {
      const x = rand() * w
      const len = (8 + rand() * 14) * u
      const th = (4 + rand() * 4) * u
      const ang = (rand() - 0.5) * 0.9
      this.tiled(x, len, (sx) => {
        ctx.save()
        ctx.translate(sx, screeY(sx) + th * 0.3)
        ctx.rotate(ang)
        ctx.fillStyle = front.mid
        ctx.fillRect(-len / 2, -th, len, th)
        ctx.fillStyle = front.cap
        ctx.fillRect(-len / 2, -th, th * 0.5, th)
        ctx.restore()
      })
    }
    // light from below: faces warm toward the lava, smokier up top
    ctx.save()
    ctx.globalCompositeOperation = 'source-atop'
    const warm = ctx.createLinearGradient(0, gy * 0.55, 0, gy)
    warm.addColorStop(0, mix(p.horizon, p.horizon, 0, 0.32))
    warm.addColorStop(0.6, mix(p.horizon, p.horizon, 0, 0.14))
    warm.addColorStop(1, mix(p.lava, p.lava, 0, 0.3 * p.glow))
    ctx.fillStyle = warm
    ctx.fillRect(0, 0, w, gy + 2)
    ctx.restore()
    this.falls = falls
  }

  drawFallStreaks(ctx: CanvasRenderingContext2D, p: Palette, now: number) {
    if (!this.falls.length) return
    const ox = Math.floor(this.off[1])
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = mix(p.hot, '#ffffff', 0.2, 0.35)
    ctx.beginPath()
    for (const f of this.falls) {
      for (const shift of [0, this.w]) {
        const x = f.x - ox + shift
        if (x < -20 || x > this.w + 20) continue
        const len = f.bottom - f.top
        for (let k = 0; k < 3; k++) {
          const t = (now * 0.55 + k / 3 + f.x * 0.01) % 1
          const y = f.top + t * len
          const sl = Math.min(len * 0.22, f.bottom - y)
          ctx.rect(x - f.width * 0.22 + (k - 1) * f.width * 0.18, y, f.width * 0.25, sl)
        }
      }
    }
    ctx.fill()
    ctx.restore()
  }

  // ---------------------------------------------------------------- layer 3: charred trees, cooling boulders, pools
  paintNear(ctx: CanvasRenderingContext2D, p: Palette, tier: Tier) {
    const { w, gy } = this
    const u = Math.min(1.2, gy / 600)
    const rand = seeded(71 + tier)
    const crest = this.ridge(13, [
      [4, 4],
      [9, 2.5],
      [17, 1.2],
    ])
    ctx.fillStyle = p.near
    ctx.beginPath()
    ctx.moveTo(0, gy + 2)
    for (let x = 0; x <= w; x += 6) ctx.lineTo(x, gy - 9 - crest(x))
    ctx.lineTo(w, gy + 2)
    ctx.fill()
    const slots = Math.max(4, Math.round(w / 170))
    const step = w / slots
    const glows: [number, number, number][] = []
    for (let i = 0; i < slots; i++) {
      const x = i * step + rand() * step * 0.4
      const roll = rand()
      if (roll < 0.5) {
        const th = (55 + rand() * 60) * u
        const seed = Math.floor(rand() * 1e6)
        this.tiled(x, th, (sx) => drawDeadTree(ctx, sx, gy - 6, th, p.near, seeded(seed)))
      }
      if (roll > 0.3) {
        const bx = x + (40 + rand() * 50) * u
        const br = (10 + rand() * 12) * u
        const seed = Math.floor(rand() * 1e6)
        this.tiled(bx, br * 2, (sx) => drawCoolingBoulder(ctx, sx, gy - 4, br, p, seeded(seed)))
      }
      if (rand() < 0.35 + tier * 0.12) {
        const px = x + (90 + rand() * 40) * u
        const pr = (14 + rand() * 12) * u
        this.tiled(px, pr * 3, (sx) => drawPool(ctx, sx, gy - 4, pr, 3 * u, p))
        glows.push([px, gy - 4, pr * 3])
      }
    }
    // smoky haze pushes the props back behind the obstacles; bases catch the lava light
    ctx.save()
    ctx.globalCompositeOperation = 'source-atop'
    ctx.fillStyle = mix(p.horizon, p.mid, 0.3, 0.3)
    ctx.fillRect(0, 0, w, gy + 2)
    const warm = ctx.createLinearGradient(0, gy - 70 * u, 0, gy)
    warm.addColorStop(0, mix(p.lava, p.lava, 0, 0))
    warm.addColorStop(1, mix(p.lava, p.lava, 0, 0.32 * p.glow))
    ctx.fillStyle = warm
    ctx.fillRect(0, gy - 70 * u, w, 72 * u)
    ctx.restore()
    // pool light spilling onto nearby silhouettes
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const [gx, gyy, r] of glows)
      this.tiled(gx, r, (sx) => {
        const g = ctx.createRadialGradient(sx, gyy, 0, sx, gyy, r)
        g.addColorStop(0, mix(p.lava, p.lava, 0, 0.3))
        g.addColorStop(1, mix(p.lava, p.lava, 0, 0))
        ctx.fillStyle = g
        ctx.fillRect(sx - r, gyy - r, r * 2, r)
      })
    ctx.restore()
  }

  /** Vertical strips just above the ground line nudged sideways: shimmering heat. */
  drawHaze(ctx: CanvasRenderingContext2D, now: number) {
    const { w, gy } = this
    const band = 64
    const strip = 4
    // the source rect is in canvas pixels, the destination in logical units: map through the current
    // transform (device-pixel scale + screen shake) so the copied rows line up on every screen
    const m = ctx.getTransform()
    for (let y = gy - band; y < gy - 2; y += strip) {
      const k = (y - (gy - band)) / band
      const dx = Math.round(Math.sin(y * 0.23 + now * 3.2) * 1.4 * k)
      if (dx) ctx.drawImage(ctx.canvas, m.e, y * m.d + m.f, w * m.a, strip * m.d, dx, y, w, strip)
    }
  }

  // ---------------------------------------------------------------- ground: black rock, pulsing lava cracks
  paintGround(p: Palette) {
    if (!this.groundBase || !this.groundGlow) return
    const T = GROUND_TILE
    const gh = this.h - this.gy
    const b = ctxOf(this.groundBase)
    const rand = seeded(97)
    const g = b.createLinearGradient(0, 0, 0, gh)
    g.addColorStop(0, mix(p.near, p.lava, 0.22))
    g.addColorStop(0.05, mix(p.near, '#2a1612', 0.6))
    g.addColorStop(0.3, '#100907')
    g.addColorStop(1, '#040202')
    b.fillStyle = g
    b.fillRect(0, 0, T, gh)
    // rock slabs: faint facets
    for (let i = 0; i < 40; i++) {
      const x = rand() * T
      const y = 6 + rand() * (gh - 10)
      const r = 14 + rand() * 30
      const shade = rand() < 0.5
      b.fillStyle = shade ? 'rgba(0, 0, 0, 0.22)' : mix(p.mid, p.horizon, 0.2, 0.18 * (1 - y / gh))
      for (const sx of [x, x - T, x + T]) {
        b.beginPath()
        b.moveTo(sx - r, y + r * 0.2)
        b.lineTo(sx - r * 0.3, y - r * 0.25)
        b.lineTo(sx + r * 0.8, y - r * 0.15)
        b.lineTo(sx + r, y + r * 0.25)
        b.lineTo(sx + r * 0.1, y + r * 0.35)
        b.closePath()
        b.fill()
      }
    }
    // crack network (shared by the dark base and the glow overlay)
    const crack = new Path2D()
    for (let i = 0; i < 7; i++) {
      let x = (i / 7) * T + rand() * 50
      let y = 4 + rand() * gh * 0.6
      const pts: number[] = [x, y]
      const segs = 5 + Math.floor(rand() * 6)
      for (let s = 0; s < segs; s++) {
        x += 10 + rand() * 22
        y = Math.max(3, Math.min(gh - 3, y + (rand() - 0.45) * 18))
        pts.push(x, y)
        if (rand() < 0.3) {
          crack.moveTo(x, y)
          crack.lineTo(x + 6 + rand() * 10, y + (rand() < 0.5 ? -1 : 1) * (6 + rand() * 10))
        }
      }
      for (const shift of [0, -T]) {
        crack.moveTo(pts[0] + shift, pts[1])
        for (let k = 2; k < pts.length; k += 2) crack.lineTo(pts[k] + shift, pts[k + 1])
      }
    }
    b.strokeStyle = '#030101'
    b.lineWidth = 3
    b.lineJoin = 'round'
    b.stroke(crack)
    const c = ctxOf(this.groundGlow)
    c.lineJoin = 'round'
    c.lineCap = 'round'
    c.shadowColor = p.lava
    c.shadowBlur = 10
    c.strokeStyle = mix(p.lava, p.lava, 0, 0.7)
    c.lineWidth = 2.4
    c.stroke(crack)
    c.shadowBlur = 0
    c.strokeStyle = p.hot
    c.lineWidth = 0.9
    c.stroke(crack)
    // deeper cracks fade out
    c.globalCompositeOperation = 'destination-in'
    const fade = c.createLinearGradient(0, 0, 0, gh)
    fade.addColorStop(0, 'rgba(0,0,0,1)')
    fade.addColorStop(1, 'rgba(0,0,0,0.25)')
    c.fillStyle = fade
    c.fillRect(0, 0, T, gh)
  }

  drawGround(ctx: CanvasRenderingContext2D, p: Palette, now: number, flash: number) {
    const { w, gy } = this
    const ox = Math.floor(this.offGround)
    if (this.groundBase && this.groundGlow) {
      for (let x = -ox; x < w; x += GROUND_TILE) ctx.drawImage(this.groundBase, x, gy)
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = Math.min(1, 0.5 + 0.3 * (0.5 + 0.5 * Math.sin(now * 1.6)) + flash * 0.3)
      for (let x = -ox; x < w; x += GROUND_TILE) ctx.drawImage(this.groundGlow, x, gy)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }
    // glow hugging the surface and a hot rim line
    const rim = ctx.createLinearGradient(0, gy - 18, 0, gy)
    rim.addColorStop(0, mix(p.lava, p.lava, 0, 0))
    rim.addColorStop(1, mix(p.lava, p.lava, 0, 0.16 + 0.12 * p.glow + flash * 0.15))
    ctx.fillStyle = rim
    ctx.fillRect(0, gy - 18, w, 18)
    ctx.fillStyle = mix(p.lava, p.hot, 0.3, 0.55)
    ctx.fillRect(0, gy, w, 1.5)
  }

  drawEmbers(ctx: CanvasRenderingContext2D, p: Palette, now: number) {
    if (!this.ember) return
    const n = Math.round(this.embers.length * (0.25 + 0.75 * p.embers))
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < n; i++) {
      const e = this.embers[i]
      const a = 0.45 + 0.4 * Math.sin(now * (3 + e.depth * 4) + e.phase)
      // embers cool (dim) as they rise
      const cool = Math.max(0.15, Math.min(1, e.y / this.gy))
      ctx.globalAlpha = Math.max(0, a * cool)
      const s = e.size
      ctx.drawImage(this.ember, e.x - s, e.y - s, s * 2, s * 2)
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  drawAsh(ctx: CanvasRenderingContext2D, p: Palette) {
    const n = Math.round(this.ash.length * p.ash)
    ctx.fillStyle = mix('#b8aaa4', p.horizon, 0.35)
    for (const [alpha, lo, hi] of [
      [0.3, 0, 0.7],
      [0.55, 0.7, 1.01],
    ]) {
      ctx.globalAlpha = alpha
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const a = this.ash[i]
        if (a.depth < lo || a.depth >= hi) continue
        ctx.rect(a.x, a.y, a.size, a.size * 0.7)
      }
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

type Pt2 = [number, number]
interface Column {
  x: number
  cw: number
  top: number
  /** right top edge minus left top edge: slanted tops */
  tilt: number
  broken: boolean
  seed: number
}
interface ColumnStyle {
  lit: string
  mid: string
  dark: string
  cap: string
  edge: string
}

/** One basalt column at ox + c.x: lit/mid/dark facets, a slanted hexagonal (or broken) top, uneven joints. */
function drawBasalt(ctx: CanvasRenderingContext2D, c: Column, ox: number, foot: number, s: ColumnStyle, rand: (() => number) | null) {
  const x = ox + c.x
  const cw = c.cw
  const a = cw * 0.3
  const b = cw * 0.72
  const yAt = (dx: number) => c.top + (c.tilt * dx) / cw
  const ch = Math.max(1.2, cw * 0.17)
  const facet = (x0: number, x1: number, color: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x + x0, yAt(x0))
    ctx.lineTo(x + x1, yAt(x1))
    ctx.lineTo(x + x1, foot)
    ctx.lineTo(x + x0, foot)
    ctx.closePath()
    ctx.fill()
  }
  facet(0, a, s.lit)
  facet(a, b, s.mid)
  facet(b, cw, s.dark)
  if (c.broken) {
    // snapped top: a jagged break, lit on its upper edges
    ctx.fillStyle = s.cap
    ctx.beginPath()
    ctx.moveTo(x, yAt(0))
    ctx.lineTo(x + cw * 0.3, yAt(cw * 0.3) - cw * 0.45)
    ctx.lineTo(x + cw * 0.55, yAt(cw * 0.55) + cw * 0.1)
    ctx.lineTo(x + cw * 0.8, yAt(cw * 0.8) - cw * 0.25)
    ctx.lineTo(x + cw, yAt(cw))
    ctx.lineTo(x + cw, yAt(cw) + ch)
    ctx.lineTo(x, yAt(0) + ch)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.fillStyle = s.cap
    ctx.beginPath()
    ctx.moveTo(x, yAt(0))
    ctx.lineTo(x + a, yAt(a) - ch * 0.5)
    ctx.lineTo(x + b, yAt(b) - ch * 0.5)
    ctx.lineTo(x + cw, yAt(cw))
    ctx.lineTo(x + b, yAt(b) + ch * 0.5)
    ctx.lineTo(x + a, yAt(a) + ch * 0.5)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = s.edge
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, yAt(0))
    ctx.lineTo(x + a, yAt(a) - ch * 0.5)
    ctx.lineTo(x + b, yAt(b) - ch * 0.5)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 0.5, yAt(0) + 2)
  ctx.lineTo(x + 0.5, foot)
  if (rand) {
    // uneven joints, each slanted a little differently
    for (let y = c.top + 8 + rand() * 18; y < foot - 6; y += 10 + rand() * 34) {
      const sl = (rand() - 0.5) * cw * 0.4
      ctx.moveTo(x, y)
      ctx.lineTo(x + a, y + ch * 0.4 + sl * 0.3)
      ctx.lineTo(x + b, y + ch * 0.4 + sl * 0.7)
      ctx.lineTo(x + cw, y + sl)
    }
  }
  ctx.stroke()
}

/** A lava fall: spills over the column lip in an arc, falls with wavy widening edges, splashes on the scree. */
function drawFall(ctx: CanvasRenderingContext2D, f: Fall, lipX: number, lipY: number, p: Palette, u: number) {
  const len = f.bottom - f.top
  const edge = (side: number) => {
    const pts: Pt2[] = []
    for (let k = 0; k <= 12; k++) {
      const t = k / 12
      const half = f.width * (0.45 + 0.35 * t) * (1 + 0.18 * Math.sin(t * 9 + side * 2))
      pts.push([f.x + side * half + Math.sin(t * 6 + side) * 0.8 * u, f.top + t * len])
    }
    return pts
  }
  const L = edge(-1)
  const R = edge(1)
  ctx.save()
  // glow behind
  ctx.shadowColor = p.lava
  ctx.shadowBlur = 18 * u
  ctx.fillStyle = mix(p.lava, p.lava, 0, 0.28)
  ctx.beginPath()
  ctx.ellipse(f.x, f.top + len * 0.55, f.width * 2.2, len * 0.55, 0, 0, TAU)
  ctx.fill()
  ctx.shadowBlur = 0
  // spill over the lip
  ctx.strokeStyle = mix(p.hot, '#ffffff', 0.15)
  ctx.lineCap = 'round'
  ctx.lineWidth = f.width * 0.8
  ctx.beginPath()
  ctx.moveTo(lipX - f.width * 0.9, lipY + 1)
  ctx.quadraticCurveTo(f.x, lipY - f.width * 0.4, f.x, f.top + 2 * u)
  ctx.stroke()
  const g = ctx.createLinearGradient(0, f.top, 0, f.bottom)
  g.addColorStop(0, mix(p.hot, '#ffffff', 0.2))
  g.addColorStop(0.35, p.lava)
  g.addColorStop(0.8, mix(p.lava, '#8a1a06', 0.25))
  g.addColorStop(1, p.hot)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(L[0][0], L[0][1])
  for (const [x, y] of L) ctx.lineTo(x, y)
  for (let k = R.length - 1; k >= 0; k--) ctx.lineTo(R[k][0], R[k][1])
  ctx.closePath()
  ctx.fill()
  // splash mist where it lands
  const m = ctx.createRadialGradient(f.x, f.bottom, 0, f.x, f.bottom, f.width * 3)
  m.addColorStop(0, mix(p.hot, p.hot, 0, 0.7))
  m.addColorStop(1, mix(p.lava, p.lava, 0, 0))
  ctx.fillStyle = m
  ctx.fillRect(f.x - f.width * 3, f.bottom - f.width * 3, f.width * 6, f.width * 3.5)
  ctx.restore()
}

/** Lava running down the talus from the fall into the pool. */
function drawRivulet(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, width: number, p: Palette, u: number) {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = p.lava
  ctx.shadowBlur = 8 * u
  ctx.strokeStyle = mix(p.lava, p.hot, 0.4)
  ctx.lineWidth = width * 0.55
  ctx.beginPath()
  ctx.moveTo(x, top)
  const n = Math.max(2, Math.round((bottom - top) / (4 * u)))
  for (let k = 1; k <= n; k++) ctx.lineTo(x + Math.sin(k * 1.7) * 2.5 * u + k * 0.6 * u, top + ((bottom - top) * k) / n)
  ctx.stroke()
  ctx.restore()
}

function drawPool(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, p: Palette) {
  const halo = ctx.createRadialGradient(x, y, 0, x, y, rx * 1.8)
  halo.addColorStop(0, mix(p.lava, p.lava, 0, 0.45))
  halo.addColorStop(1, mix(p.lava, p.lava, 0, 0))
  ctx.fillStyle = halo
  ctx.fillRect(x - rx * 1.8, y - rx * 1.2, rx * 3.6, rx * 1.4)
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx)
  g.addColorStop(0, mix(p.hot, '#ffffff', 0.25))
  g.addColorStop(0.45, p.hot)
  g.addColorStop(0.85, p.lava)
  g.addColorStop(1, mix(p.lava, '#2a0a04', 0.6))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU)
  ctx.fill()
  // crust skins floating on the surface
  ctx.fillStyle = 'rgba(30, 10, 6, 0.55)'
  ctx.beginPath()
  ctx.ellipse(x - rx * 0.35, y + ry * 0.1, rx * 0.22, ry * 0.35, 0, 0, TAU)
  ctx.ellipse(x + rx * 0.45, y - ry * 0.05, rx * 0.15, ry * 0.3, 0, 0, TAU)
  ctx.fill()
}

/** Charred dead tree: a tapered trunk with a few broken, forking branches. */
function drawDeadTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, h: number, color: string, rand: () => number) {
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  const lean = (rand() - 0.5) * h * 0.12
  ctx.beginPath()
  ctx.moveTo(x - h * 0.05, baseY + 2)
  ctx.quadraticCurveTo(x - h * 0.02, baseY - h * 0.5, x + lean - 1, baseY - h)
  ctx.lineTo(x + lean + 1, baseY - h)
  ctx.quadraticCurveTo(x + h * 0.03, baseY - h * 0.5, x + h * 0.05, baseY + 2)
  ctx.fill()
  const branch = (bx: number, by: number, ang: number, len: number, width: number, depth: number) => {
    const ex = bx + Math.cos(ang) * len
    const ey = by + Math.sin(ang) * len
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.quadraticCurveTo((bx + ex) / 2 + (rand() - 0.5) * len * 0.3, (by + ey) / 2, ex, ey)
    ctx.stroke()
    if (depth > 0) {
      branch(ex, ey, ang - 0.4 - rand() * 0.3, len * 0.6, width * 0.6, depth - 1)
      if (rand() < 0.6) branch(ex, ey, ang + 0.35 + rand() * 0.3, len * 0.5, width * 0.55, depth - 1)
    }
  }
  const n = 3 + Math.floor(rand() * 2)
  for (let i = 0; i < n; i++) {
    const t = 0.35 + (i / n) * 0.55
    const side = i % 2 ? 1 : -1
    const bx = x + lean * t
    const by = baseY - h * t
    branch(bx, by, -Math.PI / 2 + side * (0.6 + rand() * 0.5), h * (0.22 + rand() * 0.15) * (1.1 - t * 0.5), h * 0.035, 2)
  }
}

/** Cooling lava boulder: a dark crusted lump split by thin glowing seams. */
function drawCoolingBoulder(ctx: CanvasRenderingContext2D, x: number, baseY: number, r: number, p: Palette, rand: () => number) {
  const path = new Path2D()
  path.moveTo(x - r * 1.3, baseY + 2)
  path.quadraticCurveTo(x - r * 1.35, baseY - r * 0.9, x - r * 0.3, baseY - r * 1.05)
  path.quadraticCurveTo(x + r * 0.9, baseY - r * 1.15, x + r * 1.25, baseY - r * 0.2)
  path.lineTo(x + r * 1.3, baseY + 2)
  path.closePath()
  const g = ctx.createLinearGradient(0, baseY - r, 0, baseY)
  g.addColorStop(0, mix(p.near, p.mid, 0.9))
  g.addColorStop(1, mix(p.near, p.lava, 0.18))
  ctx.fillStyle = g
  ctx.fill(path)
  ctx.save()
  ctx.clip(path)
  ctx.strokeStyle = mix(p.horizon, p.hot, 0.3, 0.35)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x - r * 1.1, baseY - r * 0.55)
  ctx.quadraticCurveTo(x - r * 0.5, baseY - r * 1.05, x + r * 0.4, baseY - r * 1)
  ctx.stroke()
  ctx.shadowColor = p.lava
  ctx.shadowBlur = 6
  ctx.strokeStyle = mix(p.lava, p.hot, 0.4)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  let cx = x - r * (0.6 - rand() * 0.4)
  let cy = baseY + 1
  ctx.moveTo(cx, cy)
  for (let i = 0; i < 4; i++) {
    cx += (rand() - 0.3) * r * 0.5
    cy -= r * 0.22
    ctx.lineTo(cx, cy)
  }
  ctx.moveTo(x + r * 0.5, baseY + 1)
  ctx.lineTo(x + r * 0.35, baseY - r * 0.4)
  ctx.lineTo(x + r * 0.6, baseY - r * 0.6)
  ctx.stroke()
  ctx.restore()
}
