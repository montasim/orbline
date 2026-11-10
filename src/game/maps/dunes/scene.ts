// Sunfall Dunes scene: a huge low sun on the right of the horizon lights layered dunes, mesas and ruins.
// Static art (sky, glow, three parallax layers, ground tile, dust) is cached per tier/size; per frame
// we only blit those, shimmer the horizon, and move sand grains.
import { storage } from '../../storage'
import type { Scene, Tier } from '../types'
import { canvas, LOOKS, type Look, mix, rgba, seeded } from './look'

type Ctx = CanvasRenderingContext2D
type Rand = () => number

const QUALITY = { low: 0.35, medium: 0.65, high: 1 } as const
const GROUND_TILE = 512
const FADE_FRAMES = 50

interface Art {
  key: string
  look: Look
  sky: HTMLCanvasElement
  glow: HTMLCanvasElement
  layers: HTMLCanvasElement[]
  ground: HTMLCanvasElement
  dust: HTMLCanvasElement
}

interface Grain {
  x: number
  y: number
  len: number
  depth: number
  phase: number
}

interface Star {
  x: number
  y: number
  a: number
  s: number
  tw: number
}

interface Geo {
  w: number
  gy: number
  hy: number
  S: number
  sx: number
  sy: number
  R: number
}

export class DuneScene implements Scene {
  w: number
  h: number
  gy: number
  offs = [0, 0, 0]
  offG = 0
  dustOff = 0
  arts = new Map<Tier, Art>()
  tier: Tier = 0
  prevTier: Tier | null = null
  fade = 1
  grains: Grain[] = []
  stars: Star[] = []
  clock = 0
  gustAt = 300
  gustAge = 1e9
  gustLen = 150
  gust = 0

  constructor(width: number, height: number, groundY: number) {
    this.w = width
    this.h = height
    this.gy = groundY
    const n = Math.round(240 * (QUALITY[storage.getSettings().particlesQuality] ?? 1))
    for (let i = 0; i < n; i++) {
      const g: Grain = { x: 0, y: 0, len: 0, depth: 0, phase: Math.random() * 7 }
      this.respawn(g, Math.random() * width)
      this.grains.push(g)
    }
    for (let i = 0; i < 90; i++)
      this.stars.push({
        x: Math.random(),
        y: Math.pow(Math.random(), 1.3) * 0.6,
        a: 0.35 + Math.random() * 0.6,
        s: Math.random() < 0.1 ? 1.8 : Math.random() < 0.5 ? 1.1 : 0.7,
        tw: Math.random() * 7,
      })
  }

  respawn(g: Grain, x: number) {
    g.x = x
    // calm air: grains skim low over the sand; a storm fills the whole frame
    g.y = this.h - Math.pow(Math.random(), 1.7) * this.h * 0.5
    g.depth = 0.3 + Math.random() * 0.7
    g.len = 5 + Math.random() * 14
  }

  resize(width: number, height: number, groundY: number) {
    this.w = width
    this.h = height
    this.gy = groundY
    for (const g of this.grains) if (g.x > width || g.y > height) this.respawn(g, Math.random() * width)
  }

  get look() {
    return LOOKS[this.tier]
  }

  update(speed: number) {
    const w = Math.max(1, this.w)
    this.offs[0] = (this.offs[0] + speed * 0.1) % w
    this.offs[1] = (this.offs[1] + speed * 0.24) % w
    this.offs[2] = (this.offs[2] + speed * 0.48) % w
    this.offG = (this.offG + speed) % GROUND_TILE
    const storm = this.look.storm
    // gusts: a soft swell every 7–15 s
    this.clock++
    if (this.clock >= this.gustAt) {
      this.gustAge = 0
      this.gustLen = 120 + Math.random() * 90
      this.gustAt = this.clock + 420 + Math.random() * 480
    }
    this.gust = this.gustAge < this.gustLen ? Math.sin((Math.PI * this.gustAge) / this.gustLen) ** 2 : 0
    this.gustAge++
    this.dustOff = (this.dustOff + speed * 0.55 + 1.5 + storm * 7 + this.gust * 5) % w
    const t = this.clock / 60
    const wind = 1.4 + this.gust * 7 + storm * 9
    const fall = storm * 1.6 + this.gust * 0.3
    for (const g of this.grains) {
      g.x -= (speed * 0.3 + wind) * g.depth
      g.y += fall * g.depth + Math.sin(t * 2.3 + g.phase) * 0.25
      if (g.x < -40) {
        this.respawn(g, this.w + Math.random() * 60)
        if (storm) g.y = Math.random() * this.h
      }
      if (g.y > this.h + 6) {
        g.y = -6
        g.x = Math.random() * this.w
      }
    }
  }

  draw(ctx: Ctx, tier: Tier) {
    if (tier !== this.tier) {
      this.prevTier = this.tier
      this.tier = tier
      this.fade = 0
    }
    const art = this.ensure(tier)
    if (this.prevTier !== null && this.fade < 1) {
      this.paintWorld(ctx, this.ensure(this.prevTier), 1)
      this.fade = Math.min(1, this.fade + 1 / FADE_FRAMES)
      this.paintWorld(ctx, art, this.fade)
      if (this.fade >= 1) {
        this.arts.delete(this.prevTier)
        this.prevTier = null
      }
    } else this.paintWorld(ctx, art, 1)
    this.paintWeather(ctx, art)
  }

  geo(look: Look): Geo {
    const w = this.w
    const gy = this.gy
    const hy = Math.round(gy * 0.64)
    const R0 = Math.min(w * 0.14, gy * 0.24)
    return {
      w,
      gy,
      hy,
      S: Math.min(1.25, Math.max(0.5, gy / 600)),
      sx: w * look.sunX,
      sy: hy + look.sunDrop * R0,
      R: R0 * look.sunR,
    }
  }

  ensure(tier: Tier): Art {
    const key = `${this.w}x${this.h}x${this.gy}`
    const have = this.arts.get(tier)
    if (have && have.key === key) return have
    const look = LOOKS[tier]
    const g = this.geo(look)
    const art: Art = {
      key,
      look,
      sky: paintSky(look, g),
      glow: paintGlow(look, g),
      layers: [paintFar(look, g, tier), paintMid(look, g, tier), paintNear(look, g, tier)],
      ground: paintGround(look, Math.max(1, this.h - this.gy)),
      dust: paintDust(look, g.w, this.h),
    }
    this.arts.set(tier, art)
    return art
  }

  /** Blits a tileable layer (rows sy..sy+sh) scrolled by ox, optionally nudged by dx for shimmer. */
  tile(ctx: Ctx, img: HTMLCanvasElement, ox: number, sy: number, sh: number, dx = 0) {
    const w = this.w
    const o = Math.floor(ox)
    ctx.drawImage(img, 0, sy, w, sh, -o + dx, sy, w, sh)
    ctx.drawImage(img, 0, sy, w, sh, w - o + dx, sy, w, sh)
  }

  paintWorld(ctx: Ctx, art: Art, alpha: number) {
    const L = art.look
    const g = this.geo(L)
    const { w, gy, hy, S } = g
    const t = performance.now() / 1000
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.drawImage(art.sky, 0, 0)
    if (L.stars) this.paintStars(ctx, g, t, alpha)
    // heat shimmer: the horizon band is redrawn in thin rows, each nudged sideways
    const y0 = Math.max(0, Math.round(hy - 46 * S))
    const y1 = Math.min(gy, Math.round(hy + 16 * S))
    const band = (dy: number) => {
      const edge = Math.sin((Math.PI * (dy - y0)) / (y1 - y0))
      return Math.sin(dy * 0.42 + t * 3.1) * L.shimmer * edge + Math.sin(dy * 0.17 - t * 1.7) * L.shimmer * 0.5 * edge
    }
    if (L.shimmer > 0) for (let y = y0; y < y1; y += 2) ctx.drawImage(art.sky, 0, y, w, 2, band(y), y, w, 2)
    const far = art.layers[0]
    if (L.shimmer > 0) {
      this.tile(ctx, far, this.offs[0], 0, y0)
      for (let y = y0; y < y1; y += 2) this.tile(ctx, far, this.offs[0], y, 2, band(y))
      this.tile(ctx, far, this.offs[0], y1, far.height - y1)
    } else this.tile(ctx, far, this.offs[0], 0, far.height)
    this.tile(ctx, art.layers[1], this.offs[1], 0, art.layers[1].height)
    // the sun's light wraps over far and mid silhouettes
    ctx.globalCompositeOperation = 'screen'
    ctx.drawImage(art.glow, 0, 0, w, gy)
    ctx.globalCompositeOperation = 'source-over'
    if (L.storm > 0) {
      ctx.fillStyle = rgba(L.haze, 0.28 * L.storm)
      ctx.fillRect(0, 0, w, gy)
    }
    this.tile(ctx, art.layers[2], this.offs[2], 0, art.layers[2].height)
    // ground: cached ripple tile scrolling at full speed
    const gh = this.h - gy
    for (let x = -Math.floor(this.offG); x < w; x += GROUND_TILE) ctx.drawImage(art.ground, x, gy, GROUND_TILE, gh)
    ctx.fillStyle = rgba(L.rim, 0.5 * L.rimAlpha)
    ctx.fillRect(0, gy, w, 1.5)
    ctx.restore()
  }

  paintStars(ctx: Ctx, g: Geo, t: number, alpha: number) {
    ctx.fillStyle = '#fff4e8'
    for (const s of this.stars) {
      const y = s.y * g.hy
      const a = s.a * (0.7 + 0.3 * Math.sin(t * 1.8 + s.tw)) * (1 - y / (g.hy * 0.62))
      if (a <= 0.02) continue
      ctx.globalAlpha = a * alpha
      ctx.fillRect(s.x * g.w, y, s.s, s.s)
    }
    ctx.globalAlpha = alpha
  }

  paintWeather(ctx: Ctx, art: Art) {
    const L = art.look
    const w = this.w
    const h = this.h
    const storm = L.storm
    const gust = this.gust
    ctx.save()
    // drifting dust veil: always in a storm, a low sweep during gusts
    const veil = storm * 0.6 + gust * 0.35
    if (veil > 0.02) {
      ctx.globalAlpha = veil
      const o = Math.floor(this.dustOff)
      ctx.drawImage(art.dust, -o, 0, w, h)
      ctx.drawImage(art.dust, w - o, 0, w, h)
    }
    if (storm > 0) {
      ctx.globalAlpha = 1
      ctx.fillStyle = rgba(L.haze, 0.12 * storm)
      ctx.fillRect(0, 0, w, h)
    }
    // sand streaks, slanted down-left with the wind
    const n = storm > 0 ? this.grains.length : Math.round(this.grains.length * (0.2 + gust * 0.65))
    const stretch = 1 + gust * 1.4 + storm * 1.8
    const lift = 0.06 + storm * 0.3
    ctx.strokeStyle = L.sand
    ctx.lineCap = 'round'
    for (const [alpha, lw, lo, hi] of [
      [0.28, 1, 0, 0.65],
      [0.55, 1.6, 0.65, 1.01],
    ]) {
      ctx.globalAlpha = alpha * (storm > 0 ? 1 : 0.85)
      ctx.lineWidth = lw
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const p = this.grains[i]
        if (p.depth < lo || p.depth >= hi) continue
        const len = p.len * p.depth * stretch
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x + len, p.y - len * lift)
      }
      ctx.stroke()
    }
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ cached art */

function tiled(w: number, x: number, margin: number, draw: (x: number) => void) {
  draw(x)
  if (x - margin < 0) draw(x + w)
  if (x + margin > w) draw(x - w)
}

function paintSky(L: Look, g: Geo) {
  const { w, gy, hy, sx, sy, R, S } = g
  const c = canvas(w, gy + 2)
  const x = c.getContext('2d')
  if (!x) return c
  const hf = hy / gy
  const grad = x.createLinearGradient(0, 0, 0, gy)
  grad.addColorStop(0, L.sky[0])
  grad.addColorStop(hf * 0.42, L.sky[1])
  grad.addColorStop(hf * 0.8, L.sky[2])
  grad.addColorStop(hf, L.sky[3])
  grad.addColorStop(1, mix(L.sky[3], L.haze, 0.5))
  x.fillStyle = grad
  x.fillRect(0, 0, w, gy + 2)
  const rand = seeded(5)
  const lightY = Math.min(sy, hy)
  // broad halo + a flattened bloom hugging the horizon
  x.globalCompositeOperation = 'screen'
  const halo = x.createRadialGradient(sx, lightY, R * 0.5, sx, lightY, R * 6)
  halo.addColorStop(0, rgba(L.halo, L.haloAlpha))
  halo.addColorStop(0.3, rgba(L.halo, L.haloAlpha * 0.28))
  halo.addColorStop(1, rgba(L.halo, 0))
  x.fillStyle = halo
  x.fillRect(0, 0, w, gy + 2)
  x.save()
  x.translate(sx, hy)
  x.scale(1, 0.16)
  const bloom = x.createRadialGradient(0, 0, 0, 0, 0, w * 0.8)
  bloom.addColorStop(0, rgba(L.sunCore, L.haloAlpha * 0.7))
  bloom.addColorStop(0.4, rgba(L.halo, L.haloAlpha * 0.25))
  bloom.addColorStop(1, rgba(L.halo, 0))
  x.fillStyle = bloom
  x.fillRect(-w * 2, -hy * 7, w * 4, hy * 14)
  x.restore()
  // crepuscular rays fanning up from the sun, softened by blur
  if (L.rays > 0) {
    x.save()
    x.filter = `blur(${Math.round(9 * S)}px)`
    const ray = x.createRadialGradient(sx, sy, R * 0.8, sx, sy, w * 0.75)
    ray.addColorStop(0, rgba(L.halo, L.rays * 0.5))
    ray.addColorStop(1, rgba(L.halo, 0))
    x.fillStyle = ray
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * (1.04 + (0.92 * (i + rand() * 0.6)) / 16)
      const spread = 0.012 + rand() * 0.022
      x.globalAlpha = 0.35 + rand() * 0.65
      x.beginPath()
      x.moveTo(sx, sy)
      x.lineTo(sx + Math.cos(a - spread) * w * 1.2, sy + Math.sin(a - spread) * w * 1.2)
      x.lineTo(sx + Math.cos(a + spread) * w * 1.2, sy + Math.sin(a + spread) * w * 1.2)
      x.closePath()
      x.fill()
    }
    x.restore()
  }
  x.globalCompositeOperation = 'source-over'
  // sun disc: soft corona, bright core, reddened lower limb
  if (L.discAlpha > 0) {
    x.save()
    const corona = x.createRadialGradient(sx, sy, R * 0.85, sx, sy, R * 1.35)
    corona.addColorStop(0, rgba(L.sunEdge, 0.55 * L.discAlpha))
    corona.addColorStop(1, rgba(L.sunEdge, 0))
    x.fillStyle = corona
    x.fillRect(sx - R * 1.4, sy - R * 1.4, R * 2.8, R * 2.8)
    x.globalAlpha = L.discAlpha
    const disc = x.createRadialGradient(sx, sy - R * 0.2, R * 0.1, sx, sy, R)
    disc.addColorStop(0, '#fffdf4')
    disc.addColorStop(0.35, L.sunCore)
    disc.addColorStop(1, mix(L.sunCore, L.sunEdge, 0.75))
    x.fillStyle = disc
    x.beginPath()
    x.arc(sx, sy, R, 0, Math.PI * 2)
    x.fill()
    x.clip()
    const limb = x.createLinearGradient(0, sy - R * 0.2, 0, sy + R)
    limb.addColorStop(0, rgba(L.sunEdge, 0))
    limb.addColorStop(1, rgba(L.sunEdge, 0.7))
    x.fillStyle = limb
    x.fillRect(sx - R, sy - R, R * 2, R * 2)
    x.restore()
  }
  // a few thin cloud wisps, underlit by the sun (drawn over the disc so they band across it)
  if (L.clouds > 0) {
    x.save()
    x.filter = `blur(${Math.max(2, Math.round(5 * S))}px)`
    const n = Math.round(7 * L.clouds)
    for (let i = 0; i < n; i++) {
      const cy = hy * (0.18 + rand() * 0.62)
      const cx = i === 0 ? sx - R * 0.3 : rand() * w
      const len = (160 + rand() * 300) * S
      const th = (2.5 + rand() * 4) * S
      const near = Math.max(0, 1 - Math.abs(cx - sx) / (w * 0.6)) * (cy / hy)
      x.fillStyle = mix(L.sky[1], L.shade, 0.35, 0.3)
      for (const [dx, k] of [
        [-0.18, 0.55],
        [0.12, 0.7],
        [0, 1],
      ]) {
        x.beginPath()
        x.ellipse(cx + len * dx, cy - th * (1 - k), (len / 2) * k, th * (0.6 + k * 0.5), 0, 0, Math.PI * 2)
        x.fill()
      }
      x.fillStyle = rgba(L.halo, 0.25 + near * 0.55)
      x.beginPath()
      x.ellipse(cx + len * 0.06, cy + th * 0.6, len * 0.42, th * 0.45, 0, 0, Math.PI * 2)
      x.fill()
    }
    x.restore()
  }
  if (L.stars) paintMoon(x, w * 0.2, hy * 0.26, 15 * S)
  return c
}

function paintMoon(x: Ctx, mx: number, my: number, r: number) {
  const glow = x.createRadialGradient(mx, my, r * 0.5, mx, my, r * 4)
  glow.addColorStop(0, 'rgba(255, 236, 214, 0.16)')
  glow.addColorStop(1, 'rgba(255, 236, 214, 0)')
  x.fillStyle = glow
  x.fillRect(mx - r * 4, my - r * 4, r * 8, r * 8)
  const m = canvas(r * 2 + 4, r * 2 + 4)
  const mc = m.getContext('2d')
  if (!mc) return
  mc.fillStyle = '#fff2dc'
  mc.beginPath()
  mc.arc(r + 2, r + 2, r, 0, Math.PI * 2)
  mc.fill()
  mc.globalCompositeOperation = 'destination-out'
  mc.beginPath()
  mc.arc(r + 2 + r * 0.42, r + 2 - r * 0.16, r * 0.95, 0, Math.PI * 2)
  mc.fill()
  x.drawImage(m, mx - r - 2, my - r - 2)
}

/** Quarter-resolution light wrap: drawn with 'screen' over the far and mid layers. */
function paintGlow(L: Look, g: Geo) {
  const Q = 4
  const { w, gy, hy, sx, sy, R } = g
  const c = canvas(w / Q, gy / Q)
  const x = c.getContext('2d')
  if (!x) return c
  x.scale(1 / Q, 1 / Q)
  const ly = Math.min(sy, hy - R * 0.1)
  const rad = x.createRadialGradient(sx, ly, R * 0.3, sx, ly, R * 3.4)
  rad.addColorStop(0, rgba(L.halo, L.haloAlpha * 0.55))
  rad.addColorStop(1, rgba(L.halo, 0))
  x.fillStyle = rad
  x.fillRect(0, 0, w, gy)
  x.translate(sx, hy)
  x.scale(1, 0.12)
  const flare = x.createRadialGradient(0, 0, 0, 0, 0, w * 0.6)
  flare.addColorStop(0, rgba(L.sunCore, L.haloAlpha * 0.45))
  flare.addColorStop(1, rgba(L.halo, 0))
  x.fillStyle = flare
  x.fillRect(-w * 2, -hy * 9, w * 4, hy * 18)
  return c
}

interface RowOpts {
  rand: Rand
  crestLo: number
  crestHi: number
  base: number
  bottom: number
  spanLo: number
  spanHi: number
  lit: string
  shade: string
  shadeA: number
  rim: string
  rimA: number
  lines: number
}

/** A row of overlapping dunes: gentle sunlit windward slope on the right, steep shaded slip face on the left. */
function paintDuneRow(x: Ctx, w: number, o: RowOpts) {
  const dunes: { x: number; py: number; L: number; R: number }[] = []
  for (let px = o.rand() * o.spanLo * 0.5; px < w; ) {
    const span = o.spanLo + (o.spanHi - o.spanLo) * o.rand()
    dunes.push({
      x: px,
      py: o.crestLo + (o.crestHi - o.crestLo) * o.rand(),
      L: span * (0.32 + o.rand() * 0.14),
      R: span * (0.62 + o.rand() * 0.3),
    })
    px += span * (0.5 + o.rand() * 0.35)
  }
  // fill below the row's base so the next layer down never shows gaps
  x.fillStyle = mix(o.lit, o.shade, 0.32)
  x.fillRect(0, o.base - 1, w, o.bottom - o.base + 1)
  dunes.sort((a, b) => a.py - b.py)
  for (const d of dunes) tiled(w, d.x, Math.max(d.L, d.R) + 6, (px) => drawDune(x, px, d, o))
}

function drawDune(x: Ctx, px: number, d: { py: number; L: number; R: number }, o: RowOpts) {
  const H = o.base - d.py
  const n = 14
  const left: number[] = []
  const right: number[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    left.push(px - d.L * (1 - t), o.base - H * t ** 1.8)
    const s = t * t * (3 - 2 * t)
    right.push(px + d.R * t, o.base - H * (1 - s))
  }
  x.save()
  x.beginPath()
  x.moveTo(px - d.L, o.bottom)
  for (let i = 0; i < left.length; i += 2) x.lineTo(left[i], left[i + 1])
  for (let i = 2; i < right.length; i += 2) x.lineTo(right[i], right[i + 1])
  x.lineTo(px + d.R, o.bottom)
  x.closePath()
  const body = x.createLinearGradient(0, d.py, 0, o.base)
  body.addColorStop(0, mix(o.lit, o.rim, 0.14))
  body.addColorStop(1, mix(o.lit, o.shade, 0.32))
  x.fillStyle = body
  x.fill()
  x.clip()
  // slip face in cool shadow, crisp at the crest
  const sh = x.createLinearGradient(0, d.py, 0, o.base)
  sh.addColorStop(0, rgba(o.shade, o.shadeA))
  sh.addColorStop(1, rgba(o.shade, o.shadeA * 0.45))
  x.fillStyle = sh
  x.beginPath()
  x.moveTo(px + 0.5, d.py - 2)
  x.quadraticCurveTo(px - d.L * 0.06, d.py + H * 0.55, px - d.L * 0.42, o.base + 2)
  x.lineTo(px - d.L - 8, o.base + 2)
  x.lineTo(px - d.L - 8, d.py - 8)
  x.closePath()
  x.fill()
  // wind lines across the sunlit face
  for (let k = 1; k <= o.lines; k++) {
    const dy = H * 0.17 * k
    x.lineWidth = 1
    for (const [col, a, off] of [
      [o.shade, 0.16, 0],
      [o.rim, 0.12, 1.3],
    ] as const) {
      x.strokeStyle = rgba(col, a)
      x.beginPath()
      for (let i = 1; i <= n * 0.75; i++) {
        const xx = right[i * 2] - k * 4
        const yy = right[i * 2 + 1] + dy + off + Math.sin(i * 0.9 + k) * 0.8
        if (i === 1) x.moveTo(xx, yy)
        else x.lineTo(xx, yy)
      }
      x.stroke()
    }
  }
  x.restore()
  // backlit rim: bright along the crest, fading down the windward slope
  if (o.rimA > 0) {
    const rimGrad = x.createLinearGradient(px, 0, px + d.R * 0.6, 0)
    rimGrad.addColorStop(0, rgba(o.rim, o.rimA))
    rimGrad.addColorStop(1, rgba(o.rim, 0))
    x.strokeStyle = rimGrad
    x.lineWidth = 1.6
    x.beginPath()
    x.moveTo(left[left.length - 6], left[left.length - 5])
    x.lineTo(left[left.length - 4], left[left.length - 3])
    x.lineTo(px, d.py)
    for (let i = 2; i < right.length * 0.6; i += 2) x.lineTo(right[i], right[i + 1])
    x.stroke()
  }
}

interface Paint {
  col: string
  shade: string
  rim: string
  rimA: number
}

/** Flat-topped sandstone mesa with strata, a shaded left flank and a lit right rim. */
function drawMesa(x: Ctx, cx: number, base: number, top: number, hw: number, p: Paint, rand: Rand) {
  const H = base - top
  const tw = hw * (0.42 + rand() * 0.16)
  const pts = [
    cx - hw * 1.6, base,
    cx - hw * 1.08, base - H * 0.26,
    cx - hw * 0.9, base - H * 0.4,
    cx - tw - 5, top + H * 0.14,
    cx - tw, top + 2,
    cx - tw * 0.55, top - 1,
    cx - tw * 0.2, top + 1,
    cx - tw * 0.1, top + H * 0.07,
    cx + tw * 0.5, top + H * 0.08,
    cx + tw, top + H * 0.09,
    cx + tw + 3, top + H * 0.2,
    cx + hw * 0.76, top + H * 0.3,
    cx + hw * 0.86, base - H * 0.42,
    cx + hw * 1.1, base - H * 0.24,
    cx + hw * 1.6, base,
  ]
  const path = () => {
    x.beginPath()
    x.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1])
    x.closePath()
  }
  x.save()
  path()
  x.fillStyle = p.col
  x.fill()
  x.clip()
  for (let y = top + 5, k = 0; y < base; y += 6 + rand() * 8, k++) {
    x.fillStyle = k % 2 ? rgba(p.shade, 0.16) : rgba(p.rim, 0.07)
    x.fillRect(cx - hw * 2, y, hw * 4, 1.2 + rand() * 2.4)
  }
  x.fillStyle = rgba(p.shade, 0.55)
  x.beginPath()
  x.moveTo(cx - tw + 8, top - 2)
  x.lineTo(cx - tw + 4, top + H * 0.3)
  x.lineTo(cx - hw * 0.62, base)
  x.lineTo(cx - hw * 2, base)
  x.lineTo(cx - hw * 2, top - 2)
  x.closePath()
  x.fill()
  const talus = x.createLinearGradient(0, base - H * 0.42, 0, base)
  talus.addColorStop(0, rgba(p.shade, 0))
  talus.addColorStop(1, rgba(p.shade, 0.35))
  x.fillStyle = talus
  x.fillRect(cx - hw * 2, base - H * 0.42, hw * 4, H * 0.42)
  x.restore()
  x.strokeStyle = rgba(p.rim, p.rimA)
  x.lineWidth = 1.4
  x.beginPath()
  x.moveTo(pts[8], pts[9])
  for (let i = 10; i <= 22; i += 2) x.lineTo(pts[i], pts[i + 1])
  x.stroke()
}

/** Ruined arch of stacked blocks; returns where a lantern would hang under the keystone. */
function drawArch(x: Ctx, cx: number, base: number, H: number, p: Paint, broken: boolean) {
  const W = H * 0.92
  const pw = W * 0.24
  const r = W / 2 - pw
  const spring = base - H * 0.6
  const l = cx - W / 2
  const rr = cx + W / 2
  x.save()
  x.beginPath()
  x.moveTo(l, base)
  x.lineTo(l, base - H)
  if (broken) {
    x.lineTo(cx + W * 0.02, base - H)
    x.lineTo(cx + W * 0.08, base - H * 0.93)
    x.lineTo(cx + W * 0.14, base - H * 0.95)
    x.lineTo(cx + W * 0.22, base - H * 0.82)
    x.lineTo(rr - pw * 0.4, base - H * 0.78)
    x.lineTo(rr, base - H * 0.7)
  } else x.lineTo(rr, base - H)
  x.lineTo(rr, base)
  x.lineTo(rr - pw, base)
  x.lineTo(rr - pw, spring)
  x.arc(cx, spring, r, 0, Math.PI, true)
  x.lineTo(l + pw, base)
  x.closePath()
  x.fillStyle = p.col
  x.fill()
  x.clip()
  // shaded outer-left faces of both piers
  x.fillStyle = rgba(p.shade, 0.5)
  x.fillRect(l, base - H - 2, pw * 0.42, H + 4)
  x.fillRect(rr - pw, spring - 2, pw * 0.38, base - spring + 4)
  // underside of the arch
  x.strokeStyle = rgba(p.shade, 0.45)
  x.lineWidth = 4
  x.beginPath()
  x.arc(cx, spring, r + 2, Math.PI, 0)
  x.stroke()
  // block joints
  x.strokeStyle = rgba(p.shade, 0.3)
  x.lineWidth = 1
  x.beginPath()
  for (let y = base - H / 7; y > spring; y -= H / 7) {
    x.moveTo(l, y)
    x.lineTo(l + pw, y)
    x.moveTo(rr - pw, y)
    x.lineTo(rr, y)
  }
  for (let a = Math.PI * 1.1; a < Math.PI * 2; a += Math.PI / 7) {
    x.moveTo(cx + Math.cos(a) * r, spring + Math.sin(a) * r)
    x.lineTo(cx + Math.cos(a) * (r + pw * 0.9), spring + Math.sin(a) * (r + pw * 0.9))
  }
  x.stroke()
  x.restore()
  x.strokeStyle = rgba(p.rim, p.rimA)
  x.lineWidth = 1.4
  x.beginPath()
  x.moveTo(l + pw * 0.4, base - H)
  x.lineTo(broken ? cx : rr, base - H)
  x.moveTo(rr, broken ? base - H * 0.7 : base - H)
  x.lineTo(rr, base)
  x.moveTo(l + pw, base)
  x.lineTo(l + pw, spring)
  x.stroke()
  return { x: cx, y: spring - r + 4 }
}

/** Fluted column; broken ones end in a jagged stump. Returns its top. */
function drawColumn(x: Ctx, cx: number, base: number, h: number, r: number, broken: boolean, p: Paint, rand: Rand) {
  const top = base - h
  x.save()
  x.beginPath()
  x.rect(cx - r * 1.5, base - r * 0.7, r * 3, r * 0.7)
  if (broken) {
    x.moveTo(cx - r, base)
    x.lineTo(cx - r, top + r * 0.8)
    x.lineTo(cx - r * 0.4, top + r * (0.2 + rand()))
    x.lineTo(cx + r * 0.1, top + r * 1.4)
    x.lineTo(cx + r * 0.6, top)
    x.lineTo(cx + r, top + r * 0.6)
    x.lineTo(cx + r, base)
  } else {
    x.rect(cx - r * 0.95, top + r * 0.8, r * 1.9, h - r * 0.8)
    x.rect(cx - r * 1.5, top, r * 3, r * 0.8)
  }
  x.fillStyle = p.col
  x.fill()
  x.clip()
  x.fillStyle = rgba(p.shade, 0.48)
  x.fillRect(cx - r * 1.6, top - 2, r * 1.25, h + 4)
  x.strokeStyle = rgba(p.shade, 0.22)
  x.lineWidth = 1
  x.beginPath()
  for (const f of [-0.35, 0.3]) {
    x.moveTo(cx + f * r, top + r)
    x.lineTo(cx + f * r, base - r * 0.7)
  }
  x.moveTo(cx - r * 2, base - r * 0.7)
  x.lineTo(cx + r * 2, base - r * 0.7)
  x.stroke()
  x.restore()
  x.strokeStyle = rgba(p.rim, p.rimA)
  x.lineWidth = 1.3
  x.beginPath()
  x.moveTo(cx + (broken ? r * 0.6 : r * 1.5), top)
  x.lineTo(cx + r * (broken ? 1 : 1.5), top + (broken ? r * 0.6 : 0))
  x.moveTo(cx + r * 0.95, top + r)
  x.lineTo(cx + r * 0.95, base - r * 0.7)
  x.stroke()
  return top
}

function drawLanternGlow(x: Ctx, lx: number, ly: number, s: number, k: number) {
  if (k <= 0) return
  x.save()
  x.globalCompositeOperation = 'lighter'
  const r = (26 + 16 * k) * s
  const g = x.createRadialGradient(lx, ly, 0, lx, ly, r)
  g.addColorStop(0, `rgba(255, 196, 102, ${0.55 * k})`)
  g.addColorStop(0.3, `rgba(255, 150, 60, ${0.2 * k})`)
  g.addColorStop(1, 'rgba(255, 140, 50, 0)')
  x.fillStyle = g
  x.fillRect(lx - r, ly - r, r * 2, r * 2)
  x.restore()
  x.fillStyle = `rgba(255, 236, 180, ${0.5 + 0.5 * k})`
  x.beginPath()
  x.roundRect(lx - 2.2 * s, ly - 3 * s, 4.4 * s, 6 * s, 1.5 * s)
  x.fill()
}

function haze(x: Ctx, w: number, top: number, bottom: number, col: string, a0: number, a1: number) {
  x.globalCompositeOperation = 'source-atop'
  const g = x.createLinearGradient(0, top, 0, bottom)
  g.addColorStop(0, rgba(col, a0))
  g.addColorStop(1, rgba(col, a1))
  x.fillStyle = g
  x.fillRect(0, 0, w, bottom + 4)
  x.globalCompositeOperation = 'source-over'
}

function layerCanvas(g: Geo) {
  const c = canvas(g.w, g.gy + 2)
  return { c, x: c.getContext('2d') }
}

function paintFar(L: Look, g: Geo, tier: Tier) {
  const { c, x } = layerCanvas(g)
  if (!x) return c
  const { w, gy, hy, S } = g
  const rand = seeded(101 + tier)
  const butteCol = mix(L.far, L.haze, 0.42)
  const p: Paint = { col: butteCol, shade: mix(L.shade, L.haze, 0.5), rim: L.rim, rimA: L.rimAlpha * 0.4 }
  const buttes = 2 + Math.round(L.ruins * 2) + (tier === 3 ? 2 : 0)
  for (let i = 0; i < buttes; i++) {
    const bx = rand() * w
    const hw = (26 + rand() * 50) * S
    tiled(w, bx, hw * 1.7, (px) => drawMesa(x, px, hy + 16 * S, hy - (18 + rand() * 40) * S, hw, p, seeded(i + 7)))
  }
  const row = (crestLo: number, crestHi: number, base: number, k: number, seed: number) =>
    paintDuneRow(x, w, {
      rand: seeded(seed),
      crestLo,
      crestHi,
      base,
      bottom: gy + 2,
      spanLo: 160 * S,
      spanHi: 340 * S,
      lit: mix(L.far, L.haze, k),
      shade: mix(L.shade, L.haze, k + 0.3),
      shadeA: 0.5,
      rim: L.rim,
      rimA: L.rimAlpha * 0.55,
      lines: 1,
    })
  row(hy - 16 * S, hy + 6 * S, hy + 30 * S, 0.35, 201 + tier)
  row(hy + 14 * S, hy + 40 * S, hy + 66 * S, 0.12, 301 + tier)
  haze(x, w, hy - 70 * S, gy, L.haze, L.hazeFar * 0.3, L.hazeFar)
  return c
}

function paintMid(L: Look, g: Geo, tier: Tier) {
  const { c, x } = layerCanvas(g)
  if (!x) return c
  const { w, gy, S } = g
  const rand = seeded(401 + tier)
  const p: Paint = { col: mix(L.rock, L.haze, 0.18), shade: L.shade, rim: L.rim, rimA: L.rimAlpha * 0.8 }
  const lanterns: { x: number; y: number }[] = []
  const footing = gy - 40 * S
  // two big mesas anchor the skyline, ruins fill the rest
  for (let i = 0; i < 2; i++) {
    const mx = (i + 0.2 + rand() * 0.5) * (w / 2)
    const hw = (95 + rand() * 60) * S
    const top = gy - (165 + rand() * 50) * S
    const r = seeded(500 + i + tier)
    tiled(w, mx, hw * 1.7, (px) => drawMesa(x, px, footing - 4 * S, top, hw, p, r))
  }
  const step = 230 * S
  for (let sx = rand() * step; sx < w; sx += step * (0.8 + rand() * 0.5)) {
    const roll = rand()
    const archP = 0.15 + L.ruins * 0.3
    const colP = archP + 0.15 + L.ruins * 0.3
    if (roll < archP) {
      const H = (95 + rand() * 50) * S
      const broken = rand() < 0.5
      tiled(w, sx, H, (px) => {
        const at = drawArch(x, px, footing, H, p, broken)
        if (L.lanterns <= 0) return
        x.strokeStyle = rgba(L.shade, 0.7)
        x.lineWidth = 1
        x.beginPath()
        x.moveTo(at.x, at.y - 4)
        x.lineTo(at.x, at.y + 11 * S)
        x.stroke()
        if (px === sx) lanterns.push({ x: at.x, y: at.y + 14 * S })
      })
    } else if (roll < colP) {
      const n = 2 + Math.floor(rand() * 3)
      const r = (8 + rand() * 2.5) * S
      const gap = r * (4.6 + rand() * 1.6)
      const hh = (95 + rand() * 35) * S
      const intact: boolean[] = []
      for (let i = 0; i < n; i++) {
        const broken = rand() < 0.45
        intact.push(!broken)
        const h = broken ? hh * (0.35 + rand() * 0.5) : hh
        const cr = seeded(600 + i + Math.floor(sx))
        const cxp = sx + i * gap
        tiled(w, cxp, r * 2, (px) => drawColumn(x, px, footing + 6 * S, h, r, broken, p, cr))
        if (!broken && L.lanterns > 0 && rand() < 0.5) lanterns.push({ x: cxp, y: footing + 6 * S - hh - 5 * S })
      }
      // lintel across the first intact pair
      for (let i = 0; i < n - 1; i++)
        if (intact[i] && intact[i + 1]) {
          const lx = sx + i * gap - r * 1.5
          const ly = footing + 6 * S - hh - r * 1.3
          tiled(w, lx + gap / 2, gap, (px) => {
            const x0 = px - gap / 2
            x.fillStyle = p.col
            x.fillRect(x0, ly, gap + r * 3, r * 1.3)
            x.fillStyle = rgba(L.shade, 0.35)
            x.fillRect(x0, ly + r * 0.9, gap + r * 3, r * 0.4)
            x.fillStyle = rgba(L.rim, p.rimA)
            x.fillRect(x0, ly, gap + r * 3, 1.2)
          })
          break
        }
    }
  }
  paintDuneRow(x, w, {
    rand: seeded(701 + tier),
    crestLo: gy - 95 * S,
    crestHi: gy - 55 * S,
    base: gy - 26 * S,
    bottom: gy + 2,
    spanLo: 200 * S,
    spanHi: 420 * S,
    lit: L.mid,
    shade: L.shade,
    shadeA: 0.72,
    rim: L.rim,
    rimA: L.rimAlpha * 0.75,
    lines: 2,
  })
  haze(x, w, gy - 260 * S, gy, L.haze, L.hazeMid * 0.55, L.hazeMid)
  for (const l of lanterns) tiled(w, l.x, 40, (px) => drawLanternGlow(x, px, l.y, S * 0.9, L.lanterns * 0.85))
  return c
}

function paintNear(L: Look, g: Geo, tier: Tier) {
  const { c, x } = layerCanvas(g)
  if (!x) return c
  const { w, gy, S } = g
  const rand = seeded(801 + tier)
  // a few taller dunes behind the bank
  paintDuneRow(x, w, {
    rand: seeded(901 + tier),
    crestLo: gy - 58 * S,
    crestHi: gy - 30 * S,
    base: gy - 8 * S,
    bottom: gy + 2,
    spanLo: 260 * S,
    spanHi: 520 * S,
    lit: mix(L.near, L.mid, 0.3),
    shade: L.shade,
    shadeA: 0.75,
    rim: L.rim,
    rimA: L.rimAlpha * 0.8,
    lines: 2,
  })
  const bankY = (px: number) =>
    gy - S * (11 + 4 * Math.sin((px / w) * Math.PI * 4 + 0.7) + 3 * Math.sin((px / w) * Math.PI * 10 + 2.1))
  const bank = x.createLinearGradient(0, gy - 22 * S, 0, gy)
  bank.addColorStop(0, mix(L.near, L.rim, 0.12))
  bank.addColorStop(1, mix(L.near, L.shade, 0.35))
  x.fillStyle = bank
  x.beginPath()
  x.moveTo(0, gy + 2)
  for (let px = 0; px <= w; px += 6) x.lineTo(px, bankY(px))
  x.lineTo(w, bankY(w))
  x.lineTo(w, gy + 2)
  x.closePath()
  x.fill()
  x.strokeStyle = rgba(L.rim, L.rimAlpha * 0.55)
  x.lineWidth = 1.3
  x.beginPath()
  for (let px = 0; px <= w; px += 6) x.lineTo(px, bankY(px))
  x.stroke()
  const propCol = mix(L.near, L.shade, 0.25)
  const cactus = mix('#5f6b3a', L.near, tier === 3 ? 0.78 : 0.62)
  const rockP: Paint = { col: mix(L.rock, L.near, 0.45), shade: L.shade, rim: L.rim, rimA: L.rimAlpha * 0.85 }
  const bone = mix('#ecd3ae', L.near, tier === 3 ? 0.62 : 0.42)
  const lanterns: { x: number; y: number }[] = []
  const slot = 170 * S
  const slots = Math.max(3, Math.round(w / slot))
  const step = w / slots
  for (let i = 0; i < slots; i++) {
    const px0 = i * step + rand() * step * 0.6
    const roll = rand()
    const s = S * (0.8 + rand() * 0.45)
    const seed = 1000 + i
    let draw: ((px: number, by: number) => void) | null = null
    let ph = 0
    if (roll < 0.34) {
      ph = 70 * s + rand() * 40 * s
      const arms = rand()
      draw = (px, by) => drawSaguaro(x, px, by, ph, s, cactus, L, arms)
    } else if (roll < 0.52) {
      ph = 40 * s
      const ang = (rand() - 0.5) * 0.7
      draw = (px, by) => drawFallenPillar(x, px, by, ph, s, ang, rockP, mix(L.near, L.rim, 0.1))
    } else if (roll < 0.66) {
      ph = 22 * s
      draw = (px, by) => drawBones(x, px, by, s, bone, L)
    } else if (roll < 0.86) {
      ph = 26 * s
      draw = (px, by) => drawRock(x, px, by, s, rockP, seeded(seed))
    } else if (L.lanterns > 0) {
      ph = 56 * s
      draw = (px, by) => {
        drawLanternPost(x, px, by, s, propCol)
        if (px === px0) lanterns.push({ x: px + 9 * s, y: by - 46 * s })
      }
    }
    if (!draw) continue
    const d = draw
    const len = ph * (1 + L.shadow * 3)
    tiled(w, px0, Math.max(60, len + 20), (px) => {
      const by = bankY(px) + 2
      // long shadow stretching away from the sun
      if (L.shadow > 0) {
        const sg = x.createLinearGradient(px, 0, px - len, 0)
        sg.addColorStop(0, rgba(L.shade, 0.55 * Math.min(1, L.shadow * 1.6)))
        sg.addColorStop(1, rgba(L.shade, 0))
        x.fillStyle = sg
        x.beginPath()
        x.moveTo(px + 6 * S, by)
        x.lineTo(px - len, by - 1)
        x.lineTo(px - len, by + 2)
        x.lineTo(px - 4 * S, by + 3)
        x.closePath()
        x.fill()
      }
      d(px, by)
    })
  }
  haze(x, w, gy - 150 * S, gy, L.haze, L.hazeNear * 0.4, L.hazeNear)
  for (const l of lanterns) tiled(w, l.x, 40, (px) => drawLanternGlow(x, px, l.y, S, L.lanterns))
  return c
}

function rimLine(x: Ctx, L: Look, a: number, pts: number[]) {
  x.strokeStyle = rgba(L.rim, L.rimAlpha * a)
  x.lineWidth = 1.4
  x.beginPath()
  x.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1])
  x.stroke()
}

function drawSaguaro(x: Ctx, cx: number, by: number, h: number, s: number, col: string, L: Look, arms: number) {
  const tw = 5.5 * s
  const top = by - h
  const shapes: [number, number, number, number][] = [[cx - tw, top, tw * 2, h]]
  const armList: [number, number, number][] = []
  if (arms < 0.8) armList.push([1, by - h * 0.5, h * 0.36])
  if (arms > 0.35) armList.push([-1, by - h * 0.38, h * 0.28])
  const at = tw * 0.75
  for (const [side, ay, up] of armList) {
    const out = 11 * s
    const ax = cx + side * (tw + out - at)
    shapes.push([Math.min(cx, ax), ay - at, Math.abs(ax - cx) + at, at * 2])
    shapes.push([ax - at, ay - up, at * 2, up + at])
  }
  x.fillStyle = col
  x.beginPath()
  for (const [rx, ry, rw, rh] of shapes) x.roundRect(rx, ry, rw, rh, Math.min(rw, rh) / 2)
  x.fill()
  // ribs and the shaded left half
  x.save()
  x.clip()
  x.fillStyle = rgba(L.shade, 0.4)
  for (const [rx, ry, rw, rh] of shapes) x.fillRect(rx, ry, rw * 0.45, rh)
  x.strokeStyle = rgba(L.shade, 0.35)
  x.lineWidth = 0.8
  x.beginPath()
  for (const f of [-0.45, 0, 0.45]) {
    x.moveTo(cx + f * tw, top + 3)
    x.lineTo(cx + f * tw, by)
  }
  x.stroke()
  x.restore()
  rimLine(x, L, 0.9, [cx + tw - 0.8, by, cx + tw - 0.8, top + tw, cx + tw * 0.2, top + 0.6])
  for (const [side, ay, up] of armList) {
    const ax = cx + side * (tw + 11 * s - at)
    rimLine(x, L, 0.75, [ax + at - 0.6, ay, ax + at - 0.6, ay - up + at, ax, ay - up + 0.5])
  }
}

function drawFallenPillar(x: Ctx, cx: number, by: number, len: number, s: number, ang: number, p: Paint, sand: string) {
  const r = 7 * s
  x.save()
  x.translate(cx, by + 4 * s)
  x.rotate(ang)
  x.fillStyle = p.col
  x.fillRect(-r, -len, r * 2, len)
  x.fillRect(-r * 1.45, -len - r * 0.7, r * 2.9, r * 0.8)
  x.fillStyle = rgba(p.shade, 0.5)
  x.fillRect(-r, -len, r * 0.85, len)
  x.fillRect(-r * 1.45, -len - r * 0.7, r * 1.1, r * 0.8)
  x.strokeStyle = rgba(p.shade, 0.25)
  x.lineWidth = 1
  x.beginPath()
  x.moveTo(r * 0.3, -len + 2)
  x.lineTo(r * 0.3, 0)
  x.moveTo(-r, -len * 0.45)
  x.lineTo(r, -len * 0.42)
  x.stroke()
  x.strokeStyle = rgba(p.rim, p.rimA)
  x.lineWidth = 1.3
  x.beginPath()
  x.moveTo(r * 1.45, -len - r * 0.7)
  x.lineTo(r * 1.45, -len + 0.1 * r)
  x.moveTo(r, -len + r * 0.2)
  x.lineTo(r, 0)
  x.stroke()
  x.restore()
  // sand drifted against the base
  x.fillStyle = sand
  x.beginPath()
  x.ellipse(cx, by + 1, 16 * s, 5 * s, 0, Math.PI, 0)
  x.fill()
}

function drawBones(x: Ctx, cx: number, by: number, s: number, bone: string, L: Look) {
  x.lineCap = 'round'
  // ribs curve up and over toward the left, shrinking toward the tail
  for (const [col, lw, off] of [
    [bone, 2.4 * s, 0],
    [rgba(L.rim, L.rimAlpha * 0.45), 0.9 * s, -0.6],
  ] as const) {
    x.strokeStyle = col
    x.lineWidth = lw
    x.beginPath()
    for (let i = 0; i < 5; i++) {
      const rx = cx - 10 * s + i * 6.5 * s
      const rh = (22 - i * 3) * s
      x.moveTo(rx + off, by + 1)
      x.quadraticCurveTo(rx + 1.5 * s + off, by - rh, rx - 8 * s + off, by - rh * 0.78)
    }
    x.stroke()
  }
  x.strokeStyle = bone
  x.lineWidth = 2.8 * s
  x.beginPath()
  x.moveTo(cx - 16 * s, by - 16 * s)
  x.quadraticCurveTo(cx + 4 * s, by - 20 * s, cx + 22 * s, by - 4 * s)
  x.stroke()
  // a stray long bone in the sand
  x.lineWidth = 2 * s
  x.beginPath()
  x.moveTo(cx + 26 * s, by - 1.5 * s)
  x.lineTo(cx + 40 * s, by - 2.5 * s)
  x.stroke()
  x.fillStyle = bone
  for (const ex of [26, 40]) {
    x.beginPath()
    x.arc(cx + ex * s, by - 2 * s, 2 * s, 0, Math.PI * 2)
    x.fill()
  }
  x.lineCap = 'butt'
}

function drawRock(x: Ctx, cx: number, by: number, s: number, p: Paint, rand: Rand) {
  const pts: number[] = []
  const n = 7
  const wd = (26 + rand() * 18) * s
  const ht = (16 + rand() * 16) * s
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const px = cx - wd / 2 + wd * t
    const py = by - ht * Math.sin(Math.PI * t) ** 0.6 * (0.75 + rand() * 0.3)
    pts.push(px, py)
  }
  x.save()
  x.beginPath()
  x.moveTo(cx - wd / 2 - 3, by + 2)
  for (let i = 0; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1])
  x.lineTo(cx + wd / 2 + 3, by + 2)
  x.closePath()
  x.fillStyle = p.col
  x.fill()
  x.clip()
  x.fillStyle = rgba(p.shade, 0.5)
  x.beginPath()
  x.moveTo(cx - wd, by + 4)
  x.lineTo(cx - wd, by - ht - 4)
  x.lineTo(cx - wd * 0.05, by - ht - 4)
  x.lineTo(cx - wd * 0.15, by + 4)
  x.fill()
  x.fillStyle = rgba(p.shade, 0.18)
  x.fillRect(cx - wd, by - ht * 0.45, wd * 2, 1.5)
  x.restore()
  x.strokeStyle = rgba(p.rim, p.rimA)
  x.lineWidth = 1.3
  x.beginPath()
  for (let i = 2 * Math.floor(n / 2); i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1])
  x.stroke()
}

function drawLanternPost(x: Ctx, cx: number, by: number, s: number, col: string) {
  x.fillStyle = col
  x.fillRect(cx - 1.5 * s, by - 56 * s, 3 * s, 56 * s)
  x.fillRect(cx - 1.5 * s, by - 56 * s, 12 * s, 2.5 * s)
  x.fillRect(cx + 9 * s - 0.5, by - 54 * s, 1, 3 * s)
  x.fillRect(cx + 5.5 * s, by - 51 * s, 7 * s, 1.6 * s)
}

/** Ground tile: sand gradient with wind ripples that spread apart toward the viewer. */
function paintGround(L: Look, gh: number) {
  const P = GROUND_TILE
  const c = canvas(P, gh)
  const x = c.getContext('2d')
  if (!x) return c
  const grad = x.createLinearGradient(0, 0, 0, gh)
  grad.addColorStop(0, mix(L.ground[0], L.rim, 0.12))
  grad.addColorStop(0.1, L.ground[0])
  grad.addColorStop(0.45, L.ground[1])
  grad.addColorStop(1, L.ground[2])
  x.fillStyle = grad
  x.fillRect(0, 0, P, gh)
  const rand = seeded(77)
  x.lineCap = 'round'
  for (let y = 5, k = 0; y < gh - 2; k++) {
    const depth = y / gh
    const amp = 1 + depth * 3
    const waves = 2 + Math.floor(rand() * 3)
    const ph = rand() * 7
    const segs = 3 + Math.floor(rand() * 3)
    for (let sgi = 0; sgi < segs; sgi++) {
      const sx = rand() * P
      const len = 50 + rand() * 170
      for (const off of [0, -P]) {
        for (const [col, a, dy, lw] of [
          [L.shade, 0.28, 1.4, 1.2 + depth],
          [L.rim, 0.22 * (1 - depth * 0.6), 0, 0.9 + depth * 0.6],
        ] as const) {
          x.strokeStyle = rgba(col, a)
          x.lineWidth = lw
          x.beginPath()
          for (let px = sx; px <= sx + len; px += 6) {
            const yy = y + dy + Math.sin((px / P) * Math.PI * 2 * waves + ph) * amp
            if (px === sx) x.moveTo(px + off, yy)
            else x.lineTo(px + off, yy)
          }
          x.stroke()
        }
      }
    }
    y += 4 + depth * 13 + rand() * 3
  }
  // scattered pebbles with a lit top
  for (let i = 0; i < 7; i++) {
    const px = rand() * (P - 10) + 5
    const py = gh * (0.2 + rand() * 0.7)
    const r = 1.5 + rand() * 2.5
    x.fillStyle = rgba(L.shade, 0.7)
    x.beginPath()
    x.ellipse(px, py, r * 1.4, r, 0, 0, Math.PI * 2)
    x.fill()
    x.fillStyle = rgba(L.rim, 0.35)
    x.beginPath()
    x.ellipse(px + r * 0.3, py - r * 0.4, r * 0.8, r * 0.4, 0, 0, Math.PI * 2)
    x.fill()
  }
  return c
}

/** Quarter-res soft dust blobs, stretched over the frame for gusts and the storm veil. */
function paintDust(L: Look, w: number, h: number) {
  const Q = 4
  const c = canvas(w / Q, h / Q)
  const x = c.getContext('2d')
  if (!x) return c
  const rand = seeded(55)
  const cw = c.width
  const ch = c.height
  const n = L.storm > 0 ? 34 : 22
  for (let i = 0; i < n; i++) {
    const bx = rand() * cw
    const by = L.storm > 0 ? rand() * ch : ch * (1 - Math.pow(rand(), 1.5) * 0.45)
    const rx = (20 + rand() * 45) * (w / 1280)
    for (const ox of [0, -cw, cw]) {
      x.save()
      x.translate(bx + ox, by)
      x.scale(2.4, 1)
      const g = x.createRadialGradient(0, 0, 0, 0, 0, rx)
      g.addColorStop(0, rgba(L.haze, 0.35))
      g.addColorStop(1, rgba(L.haze, 0))
      x.fillStyle = g
      x.fillRect(-rx, -rx, rx * 2, rx * 2)
      x.restore()
    }
  }
  return c
}
