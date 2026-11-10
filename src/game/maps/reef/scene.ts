// Coral Deep scene: water column, surface light shafts, far arches + wreck, swaying kelp,
// near coral garden, sandy seabed with moving caustics, bubbles and plankton. The deep tiers
// glow with non-living light: plankton clouds, tube corals, seabed vents and a crystal outcrop.
// Static silhouettes are painted once per tier/size into tileable offscreen canvases.
import { storage } from '../../storage'
import type { Scene, Tier } from '../types'
import {
  type ReefTheme,
  THEMES,
  causticPattern,
  ctxOf,
  makeCanvas,
  mix,
  mixHex,
  rgba,
  rimLight,
  seeded,
} from './palette'

const QUALITY = { low: 0.35, medium: 0.65, high: 1 } as const
const SAND_TILE = 640
const GLOW_S = 4

interface Layers {
  far: HTMLCanvasElement
  farTop: number
  /** back, front A, front B: each sways with its own phase */
  kelp: HTMLCanvasElement[]
  kelpTop: number
  near: HTMLCanvasElement
  nearSway: HTMLCanvasElement
  nearTop: number
  sand: HTMLCanvasElement
  /** glowing tube-coral clusters in the near layer (layer coords), one halo each */
  tubes: { x: number; y: number; col: string }[]
  /** light vents in the sand tile (tile coords) */
  vents: { x: number; y: number; ph: number }[]
}

interface Bubble {
  x: number
  y: number
  r: number
  v: number
  ph: number
  d: number
}
interface Mote {
  x: number
  y: number
  r: number
  d: number
  ph: number
}
/** a drifting cloud of plankton specks that slowly swirl around its centre */
interface Cloud {
  x: number
  y: number
  drift: number
  d: number
  specks: { dx: number; dy: number; ph: number; s: number }[]
}
interface Halo {
  x: number
  y: number
  r: number
  color: string
  a: number
}

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export class ReefScene implements Scene {
  o1 = 0
  o2 = 0
  o3 = 0
  oG = 0
  layers: Layers | null = null
  layerKey = ''
  glowBuf = makeCanvas(1, 1)
  glowSoft = makeCanvas(1, 1)
  nearBuf = makeCanvas(1, 1)
  bubbles: Bubble[] = []
  motes: Mote[] = []
  clouds: Cloud[] = []
  /** distant glowing crystal outcrop on the far ridge (abyss only) */
  crystalX = 0
  halos: Halo[] = []
  q: number

  constructor(
    public w: number,
    public h: number,
    public gy: number,
  ) {
    this.q = QUALITY[storage.getSettings().particlesQuality] ?? 1
    const nB = Math.round(70 * this.q)
    for (let i = 0; i < nB; i++) this.bubbles.push(this.newBubble(Math.random() * h))
    const nM = Math.round(110 * this.q)
    for (let i = 0; i < nM; i++) {
      const d = 0.3 + Math.random() * 0.7
      this.motes.push({ x: Math.random() * w, y: Math.random() * gy, r: 0.6 + d * 1.1, d, ph: Math.random() * 6.3 })
    }
    for (let i = 0; i < 5; i++) this.clouds.push(this.newCloud(Math.random() * w))
    this.crystalX = w * 0.72
  }

  newBubble(y: number): Bubble {
    const big = Math.random() < 0.12
    const d = 0.4 + Math.random() * 0.6
    return {
      x: Math.random() * (this.w + 120),
      y,
      r: big ? 3.5 + Math.random() * 3 : 0.8 + Math.random() * 2.2,
      v: (big ? 0.9 : 0.45) + Math.random() * 0.6,
      ph: Math.random() * 6.3,
      d,
    }
  }

  newCloud(x: number): Cloud {
    const n = 14 + Math.floor(Math.random() * 10)
    const specks = []
    for (let i = 0; i < n; i++) {
      // dense core, sparse fringe
      const a = Math.random() * 6.3
      const r = (Math.random() + Math.random()) * 0.5
      specks.push({ dx: Math.cos(a) * r * 60, dy: Math.sin(a) * r * 30, ph: Math.random() * 6.3, s: 0.5 + Math.random() * 0.6 })
    }
    return { x, y: this.gy * (0.22 + Math.random() * 0.5), drift: 0.04 + Math.random() * 0.08, d: 0.6 + Math.random() * 0.4, specks }
  }

  resize(w: number, h: number, gy: number) {
    this.w = w
    this.h = h
    this.gy = gy
    for (const b of this.bubbles) if (b.x > w + 120) b.x = Math.random() * w
    for (const m of this.motes) {
      if (m.x > w) m.x = Math.random() * w
      if (m.y > gy) m.y = Math.random() * gy
    }
  }

  update(speed: number) {
    const w = this.w
    this.o1 = (this.o1 + speed * 0.1) % w
    this.o2 = (this.o2 + speed * 0.24) % w
    this.o3 = (this.o3 + speed * 0.48) % w
    this.oG = (this.oG + speed) % SAND_TILE
    for (const b of this.bubbles) {
      b.y -= b.v * (0.6 + b.d * 0.6)
      b.x -= speed * 0.4 * b.d
      if (b.y < -10) Object.assign(b, this.newBubble(this.gy + Math.random() * (this.h - this.gy) * 0.6))
      if (b.x < -10) b.x += w + 20
    }
    for (const m of this.motes) {
      m.x -= speed * 0.3 * m.d + 0.08
      m.y -= 0.04 * m.d
      if (m.x < -4) m.x += w + 8
      if (m.y < -4) m.y = this.gy
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i]
      c.x -= speed * 0.2 * c.d + c.drift
      if (c.x < -90) this.clouds[i] = this.newCloud(w + 90 + Math.random() * w * 0.6)
    }
    // sits on the far ridge, so it scrolls exactly with it
    this.crystalX -= speed * 0.1
    if (this.crystalX < -120) this.crystalX = w + 120 + Math.random() * w * 0.5
  }

  draw(ctx: CanvasRenderingContext2D, tier: Tier) {
    const T = THEMES[tier]
    const { w, h, gy } = this
    const now = performance.now() / 1000
    const L = this.ensureLayers(tier, T)
    this.halos.length = 0

    const water = ctx.createLinearGradient(0, 0, 0, gy)
    water.addColorStop(0, T.water[0])
    water.addColorStop(0.45, T.water[1])
    water.addColorStop(1, T.water[2])
    ctx.fillStyle = water
    ctx.fillRect(0, 0, w, h)

    this.blit(ctx, L.far, this.o1, L.farTop)
    if (tier === 3) this.drawCrystals(ctx, T, now)
    this.drawPlankton(ctx, T, now, tier)
    for (const [i, c] of L.kelp.entries()) {
      // shear anchored at the seabed = the whole group leans and sways together
      const k = Math.sin(now * (0.45 + i * 0.13) + i * 2.1) * 0.035 + Math.sin(now * 1.1 + i) * 0.008
      ctx.save()
      ctx.transform(1, 0, k, 1, -k * gy, 0)
      this.blit(ctx, c, this.o2, L.kelpTop)
      ctx.restore()
    }
    if (T.bio > 0) this.tubeHalos(T, L, now)
    this.drawGlow(ctx, T, now)
    this.drawNear(ctx, T, L, now)
    this.drawSeabed(ctx, T, L, now)
    this.drawParticles(ctx, T, now, tier)

    if (T.vignette > 0) {
      const v = ctx.createRadialGradient(w * 0.5, gy * 0.42, Math.min(w, h) * 0.25, w * 0.5, gy * 0.42, Math.max(w, h) * 0.78)
      v.addColorStop(0, rgba(T.water[2], 0))
      v.addColorStop(1, mix(T.water[2], '#000000', 0.5, T.vignette))
      ctx.fillStyle = v
      ctx.fillRect(0, 0, w, h)
    }
  }

  blit(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, offset: number, y: number) {
    const ox = Math.floor(offset)
    ctx.drawImage(img, -ox, y)
    ctx.drawImage(img, this.w - ox, y)
  }

  /** Calls draw(x) for x and its wrapped copies so a feature near the tile edge stays seamless. */
  tiled(x: number, margin: number, draw: (x: number) => void, period = this.w) {
    draw(x)
    if (x - margin < 0) draw(x + period)
    if (x + margin > period) draw(x - period)
  }

  // ---------------------------------------------------------------- per-frame pieces

  /** Abyss: a distant outcrop of glowing crystals on the far ridge, gently pulsing. */
  drawCrystals(ctx: CanvasRenderingContext2D, T: ReefTheme, now: number) {
    const spr = crystalSprite(T.glow)
    const x = this.crystalX
    const base = this.gy - 20
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.9)
    const sx = x - spr.width / 2
    const sy = base - spr.height + 6
    ctx.drawImage(spr, sx, sy)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.08 + 0.17 * pulse
    ctx.drawImage(spr, sx, sy)
    ctx.restore()
    this.halos.push({ x, y: base - 36, r: 95, color: T.glow, a: 0.3 + 0.15 * pulse })
    this.halos.push({ x: x + 22, y: base - 22, r: 55, color: '#c4b5fd', a: 0.22 + 0.12 * (1 - pulse) })
  }

  /** Plankton clouds: sun-glints in the bright tiers, bioluminescent swirls in the deep ones. */
  drawPlankton(ctx: CanvasRenderingContext2D, T: ReefTheme, now: number, tier: Tier) {
    const deep = tier >= 2
    const dot = dotSprite(deep ? T.glow : T.light)
    const dot2 = deep ? dotSprite('#c4b5fd') : dot
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const c of this.clouds) {
      if (deep) this.halos.push({ x: c.x, y: c.y, r: 70 * c.d, color: T.glow, a: 0.1 + 0.12 * T.bio })
      for (let i = 0; i < c.specks.length; i++) {
        const p = c.specks[i]
        const x = c.x + p.dx + Math.sin(now * 0.35 + p.ph) * 7
        const y = c.y + p.dy + Math.cos(now * 0.3 + p.ph) * 5
        const r = (deep ? 4.2 : 2.6) * p.s * c.d
        const tw = 0.5 + 0.5 * Math.sin(now * 1.7 + p.ph * 3)
        ctx.globalAlpha = deep ? 0.45 + 0.55 * tw : 0.12 + 0.2 * tw
        ctx.drawImage(i % 5 === 0 ? dot2 : dot, x - r, y - r, r * 2, r * 2)
      }
    }
    ctx.restore()
  }

  /** soft, pulsing halos above the tube-coral tips (they scroll with the near layer) */
  tubeHalos(T: ReefTheme, L: Layers, now: number) {
    const w = this.w
    const ox = Math.floor(this.o3)
    for (const t of L.tubes) {
      const p = 0.5 + 0.5 * Math.sin(now * 1.2 + t.x * 0.05)
      for (const x of [t.x - ox, t.x - ox + w])
        if (x > -40 && x < w + 40) this.halos.push({ x, y: L.nearTop + t.y, r: 52, color: t.col, a: (0.22 + 0.2 * p) * T.bio + 0.08 })
    }
  }

  /** Quarter-resolution light buffer: surface shimmer, slanted shafts and bioluminescent halos. */
  drawGlow(ctx: CanvasRenderingContext2D, T: ReefTheme, now: number) {
    if (T.rays <= 0 && this.halos.length === 0) return
    const { w, gy } = this
    const bw = Math.ceil(w / GLOW_S)
    const bh = Math.ceil(gy / GLOW_S)
    for (const c of [this.glowBuf, this.glowSoft])
      if (c.width !== bw || c.height !== bh) {
        c.width = bw
        c.height = bh
      }
    const b = ctxOf(this.glowBuf)
    b.setTransform(1 / GLOW_S, 0, 0, 1 / GLOW_S, 0, 0)
    b.clearRect(0, 0, w, gy)
    b.globalCompositeOperation = 'lighter'
    const L = T.light
    if (T.rays > 0) {
      // bright, rippling ceiling
      const sg = b.createLinearGradient(0, 0, 0, gy * 0.24)
      sg.addColorStop(0, rgba(L, 0.3 * T.rays))
      sg.addColorStop(1, rgba(L, 0))
      b.fillStyle = sg
      b.fillRect(0, 0, w, gy * 0.24)
      b.lineWidth = 7
      b.setLineDash([70, 46])
      for (let k = 0; k < 4; k++) {
        b.strokeStyle = rgba(L, (0.4 - k * 0.08) * T.rays)
        b.lineDashOffset = (k % 2 ? 1 : -1) * now * 18 - this.o1 * 0.4
        b.beginPath()
        for (let x = -40; x <= w + 40; x += 24) {
          const y = 6 + k * 15 + Math.sin(x * 0.012 + now * (0.7 + k * 0.2) + k) * 4 + Math.sin(x * 0.033 - now * 1.1 + k) * 2
          if (x === -40) b.moveTo(x, y)
          else b.lineTo(x, y)
        }
        b.stroke()
      }
      b.setLineDash([])
      // volumetric shafts, slanting down-right from the surface and fading with depth
      const span = w + 500
      const slant = 0.42
      for (let i = 0; i < T.rayCount; i++) {
        const base = ((i + 0.5) / T.rayCount) * span + Math.sin(i * 12.9) * 50
        const x0 = ((((base - this.o1 * 0.6 + Math.sin(now * 0.16 + i * 1.3) * 34) % span) + span) % span) - 300
        const topW = (14 + 46 * hash(i)) * (T.rayCount <= 5 ? 0.45 : 1)
        const len = gy * (0.6 + 0.4 * hash(i + 7))
        const a = T.rays * (T.rayCount <= 5 ? 1.7 : 1) * (0.1 + 0.1 * hash(i + 3)) * (0.55 + 0.45 * Math.sin(now * (0.35 + 0.25 * hash(i + 1)) + i * 2.3))
        if (a <= 0.005) continue
        const g = b.createLinearGradient(0, 0, 0, len)
        g.addColorStop(0, rgba(L, a))
        g.addColorStop(0.45, rgba(L, a * 0.5))
        g.addColorStop(1, rgba(L, 0))
        b.fillStyle = g
        b.beginPath()
        b.moveTo(x0, 0)
        b.lineTo(x0 + topW, 0)
        b.lineTo(x0 + topW * 2 + slant * len, len)
        b.lineTo(x0 - topW * 0.2 + slant * len, len)
        b.closePath()
        b.fill()
      }
    }
    for (const g of this.halos) {
      const rg = b.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r)
      rg.addColorStop(0, rgba(g.color, g.a))
      rg.addColorStop(0.35, rgba(g.color, g.a * 0.35))
      rg.addColorStop(1, rgba(g.color, 0))
      b.fillStyle = rg
      b.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2)
    }
    const s = ctxOf(this.glowSoft)
    s.clearRect(0, 0, bw, bh)
    s.filter = 'blur(2px)'
    s.drawImage(this.glowBuf, 0, 0)
    s.filter = 'none'
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.glowSoft, 0, 0, bw * GLOW_S, bh * GLOW_S)
    ctx.restore()
  }

  /** Near coral garden: static + swaying parts, with caustic light dancing over them. */
  drawNear(ctx: CanvasRenderingContext2D, T: ReefTheme, L: Layers, now: number) {
    const nb = this.nearBuf
    if (nb.width !== L.near.width || nb.height !== L.near.height) {
      nb.width = L.near.width
      nb.height = L.near.height
    }
    const n = ctxOf(nb)
    n.globalCompositeOperation = 'source-over'
    n.globalAlpha = 1
    n.clearRect(0, 0, nb.width, nb.height)
    this.blit(n, L.near, this.o3, 0)
    const k = Math.sin(now * 0.8) * 0.06 + Math.sin(now * 1.9) * 0.015
    n.save()
    n.transform(1, 0, k, 1, -k * (this.gy - L.nearTop), 0)
    this.blit(n, L.nearSway, this.o3, 0)
    n.restore()
    const pat = T.caustics > 0 ? causticPattern(n) : null
    if (pat) {
      n.globalCompositeOperation = 'source-atop'
      n.fillStyle = pat
      n.globalAlpha = T.caustics * 0.3
      pat.setTransform(new DOMMatrix().translate(-this.o3 + now * 11, now * 4).scale(1.5))
      n.fillRect(0, 0, nb.width, nb.height)
      pat.setTransform(new DOMMatrix().translate(-this.o3 - now * 8, -now * 6 + 40).scale(1.15))
      n.fillRect(0, 0, nb.width, nb.height)
      n.globalAlpha = 1
      n.globalCompositeOperation = 'source-over'
    }
    ctx.drawImage(nb, 0, L.nearTop)
  }

  drawSeabed(ctx: CanvasRenderingContext2D, T: ReefTheme, L: Layers, now: number) {
    const { w, h, gy } = this
    const ox = Math.floor(this.oG)
    for (let x = -ox; x < w; x += SAND_TILE) ctx.drawImage(L.sand, x, gy)
    const pat = T.caustics > 0 ? causticPattern(ctx) : null
    ctx.save()
    if (pat) {
      ctx.beginPath()
      ctx.rect(0, gy, w, h - gy)
      ctx.clip()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = pat
      ctx.globalAlpha = T.caustics * 0.26
      // seen at a grazing angle: squashed vertically; two drifting copies interfere and "dance"
      pat.setTransform(new DOMMatrix().translate(-this.oG + now * 10, gy + now * 3).scale(2.3, 0.75))
      ctx.fillRect(0, gy, w, h - gy)
      pat.setTransform(new DOMMatrix().translate(-this.oG - now * 9 + 50, gy - now * 2).scale(1.8, 0.6))
      ctx.fillRect(0, gy, w, h - gy)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }
    // light pools on the near edge and falls off with depth into the sand
    const depth = ctx.createLinearGradient(0, gy, 0, h)
    depth.addColorStop(0, rgba(T.water[2], 0))
    depth.addColorStop(0.25, rgba(T.water[2], 0.05))
    depth.addColorStop(1, mix(T.water[2], '#000000', 0.4, 0.62))
    ctx.fillStyle = depth
    ctx.fillRect(0, gy, w, h - gy)
    const rim = ctx.createLinearGradient(0, gy - 14, 0, gy + 4)
    const glowCol = T.rays > 0 ? T.light : T.glow
    const rimA = T.rays > 0 ? 0.22 * T.rays + 0.05 : 0.1
    rim.addColorStop(0, rgba(glowCol, 0))
    rim.addColorStop(0.8, rgba(glowCol, rimA))
    rim.addColorStop(1, rgba(glowCol, 0))
    ctx.fillStyle = rim
    ctx.fillRect(0, gy - 14, w, 18)
    if (L.vents.length) {
      // light vents: a pulsing orb of light hovering over each mound (sprites, additive)
      ctx.globalCompositeOperation = 'lighter'
      const dot = dotSprite(T.glow)
      for (let x0 = -ox; x0 < w; x0 += SAND_TILE)
        for (const v of L.vents) {
          const x = x0 + v.x
          if (x < -40 || x > w + 40) continue
          const p = 0.5 + 0.5 * Math.sin(now * 1.4 + v.ph)
          const y = gy + v.y - 8 - p * 2
          const r = 14 + 8 * p
          ctx.globalAlpha = (0.35 + 0.45 * p) * T.bio
          ctx.drawImage(dot, x - r, y - r, r * 2, r * 2)
          ctx.globalAlpha = 0.6 + 0.4 * p
          ctx.drawImage(dot, x - 4, y - 4, 8, 8)
        }
    }
    ctx.restore()
  }

  drawParticles(ctx: CanvasRenderingContext2D, T: ReefTheme, now: number, tier: Tier) {
    ctx.save()
    // plankton motes: soft dot sprites (much cheaper than hundreds of arcs)
    const bio = T.bio > 0.5
    if (bio) ctx.globalCompositeOperation = 'lighter'
    const dot = dotSprite(bio ? T.glow : T.light)
    const dot2 = bio ? dotSprite('#c4b5fd') : dot
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i]
      const tw = bio ? 0.5 + 0.5 * Math.sin(now * 2 + m.ph) : 0.75 + 0.25 * Math.sin(now * 1.3 + m.ph)
      const r = m.r * (bio ? 3.4 : 2.4)
      const y = m.y + Math.sin(now * 0.6 + m.ph) * 6
      ctx.globalAlpha = tw * (bio ? 0.9 : 0.55)
      ctx.drawImage(i % 4 === 0 ? dot2 : dot, m.x - r, y - r, r * 2, r * 2)
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = tier === 3 ? 0.65 : 1
    // bubbles: ring + highlight sprite
    const bub = bubbleSprite(tier === 3 ? mixHex(T.glow, '#ffffff', 0.4) : T.light)
    for (const b of this.bubbles) {
      const x = b.x + Math.sin(now * 2.2 + b.ph) * (1 + b.r * 0.3)
      const r = b.r + 0.5
      ctx.drawImage(bub, x - r, b.y - r, r * 2, r * 2)
    }
    ctx.restore()
  }

  // ---------------------------------------------------------------- cached layers

  ensureLayers(tier: Tier, T: ReefTheme): Layers {
    const key = `${tier}:${this.w}x${this.h}x${this.gy}`
    if (this.layers && this.layerKey === key) return this.layers
    this.layerKey = key
    const { w, gy } = this
    const farTop = Math.floor(gy * 0.38)
    const kelpTop = Math.floor(gy * (0.12 + 0.3 * (1 - T.kelpDensity)))
    const nearTop = Math.floor(gy - 150)
    const far = makeCanvas(w, gy - farTop + 2)
    const kelp = [0, 1, 2].map(() => makeCanvas(w, gy - kelpTop + 2))
    const near = makeCanvas(w, gy - nearTop + 2)
    const nearSway = makeCanvas(w, gy - nearTop + 2)
    const sand = makeCanvas(SAND_TILE, this.h - gy)
    this.layers = { far, farTop, kelp, kelpTop, near, nearSway, nearTop, sand, tubes: [], vents: [] }
    this.paintFar(far, farTop, T)
    this.paintKelp(kelp, kelpTop, T)
    this.paintNear(near, nearSway, nearTop, T, this.layers.tubes)
    this.paintSand(sand, T, this.layers.vents)
    return this.layers
  }

  /** water-coloured fog over a layer: the same gradient as the water, so far shapes melt into it */
  fog(c: HTMLCanvasElement, top: number, T: ReefTheme, alpha: number, floor: number) {
    const g = ctxOf(c)
    g.save()
    g.globalCompositeOperation = 'source-atop'
    g.translate(0, -top)
    const wg = g.createLinearGradient(0, 0, 0, this.gy)
    wg.addColorStop(0, rgba(T.water[0], alpha))
    wg.addColorStop(0.45, rgba(T.water[1], alpha))
    wg.addColorStop(1, rgba(T.water[2], alpha))
    g.fillStyle = wg
    g.fillRect(0, top, c.width, c.height)
    if (floor > 0) {
      const fg = g.createLinearGradient(0, this.gy - 90, 0, this.gy)
      fg.addColorStop(0, rgba(T.water[2], 0))
      fg.addColorStop(1, mix(T.water[1], T.water[2], 0.5, floor))
      g.fillStyle = fg
      g.fillRect(0, this.gy - 90, c.width, 92)
    }
    g.restore()
  }

  /** top-lit shading: brighter toward the surface, darker at the base */
  shade(c: HTMLCanvasElement, T: ReefTheme, topA: number, botA: number) {
    const g = ctxOf(c)
    g.save()
    g.globalCompositeOperation = 'source-atop'
    const sg = g.createLinearGradient(0, 0, 0, c.height)
    const lc = T.rays > 0 ? T.light : T.glow
    sg.addColorStop(0, rgba(lc, topA))
    sg.addColorStop(0.55, rgba(lc, 0))
    sg.addColorStop(1, rgba('#000000', botA))
    g.fillStyle = sg
    g.fillRect(0, 0, c.width, c.height)
    g.restore()
  }

  paintFar(c: HTMLCanvasElement, top: number, T: ReefTheme) {
    const g = ctxOf(c)
    const { w, gy } = this
    const rand = seeded(101)
    g.translate(0, -top)
    g.fillStyle = T.far
    g.strokeStyle = T.far
    if (T.wreck > 0) {
      const wx = w * 0.6
      this.tiled(wx, 260 * T.wreck, (x) => drawWreck(g, x, gy - 16, T.wreck))
    }
    g.fillStyle = T.far
    // arches
    const arches = 2 + Math.floor(rand() * 2)
    for (let i = 0; i < arches; i++) {
      const ax = (i + 0.2 + rand() * 0.4) * (w / arches)
      if (T.wreck > 0.9 && Math.abs(ax - w * 0.6) < 300) continue
      const rx = 55 + rand() * 60
      const ry = 70 + rand() * 80
      const noise = Array.from({ length: 34 }, () => (rand() - 0.5) * 0.14)
      this.tiled(ax, rx * 1.2, (x) => drawArch(g, x, gy - 10, rx, ry, noise))
    }
    // rock spires
    for (let i = 0; i < 5; i++) {
      const sx = rand() * w
      const sh = 50 + rand() * 110
      const sw = 12 + rand() * 16
      const jit = Array.from({ length: 8 }, () => (rand() - 0.5) * sw * 0.5)
      this.tiled(sx, sw * 2, (x) => drawSpire(g, x, gy - 8, sw, sh, jit))
    }
    // continuous rocky ridge the far shapes stand on
    g.beginPath()
    g.moveTo(0, gy + 2)
    for (let x = 0; x <= w; x += 6) {
      const u = (x / w) * Math.PI * 2
      g.lineTo(x, gy - 22 - 10 * Math.sin(u * 3 + 0.7) - 6 * Math.sin(u * 7 + 2.1) - 3 * Math.sin(u * 17))
    }
    g.lineTo(w, gy + 2)
    g.closePath()
    g.fill()
    g.setTransform(1, 0, 0, 1, 0, 0)
    this.shade(c, T, 0.22, 0.1)
    rimLight(c, T.rays > 0 ? T.light : T.glow, 2, 3, T.rays > 0 ? 0.35 * T.rays : 0.12)
    this.fog(c, top, T, 0.36, 0.5)
  }

  paintKelp(cs: HTMLCanvasElement[], top: number, T: ReefTheme) {
    const { w, gy } = this
    const rand = seeded(202)
    const d = T.kelpDensity
    const spacing = 280 - 170 * d
    const maxH = gy * (0.32 + 0.38 * d)
    const bodies = cs.map((c, i) => {
      const g = ctxOf(c)
      g.translate(0, -top)
      const grad = g.createLinearGradient(0, gy - maxH, 0, gy)
      const col = i === 0 ? mixHex(T.kelp, T.water[1], 0.35) : T.kelp
      grad.addColorStop(0, mix(col, T.rays > 0 ? T.light : T.glow, T.rays > 0 ? 0.28 : 0.08))
      grad.addColorStop(0.5, col)
      grad.addColorStop(1, mix(col, '#000000', 0.35))
      g.fillStyle = grad
      return g
    })
    let n = 0
    for (let cx = rand() * spacing; cx < w; cx += spacing * (0.6 + rand() * 0.8)) {
      const strands = 2 + Math.floor(rand() * (2 + 3 * d))
      for (let s = 0; s < strands; s++) {
        const x = cx + (rand() - 0.5) * 50
        const back = rand() < 0.4
        const H = maxH * (back ? 0.55 + rand() * 0.45 : 0.4 + rand() * 0.5)
        const ph = rand() * 6.3
        const lean = (rand() - 0.5) * 30
        const g = bodies[back ? 0 : 1 + (n++ % 2)]
        this.tiled(x, 40, (px) => drawKelp(g, px, gy + 2, H, ph, lean))
      }
    }
    for (const [i, c] of cs.entries()) {
      ctxOf(c).setTransform(1, 0, 0, 1, 0, 0)
      rimLight(c, T.rays > 0 ? T.light : T.glow, 1.5, 2, T.rays > 0 ? 0.22 * T.rays : 0.12)
      this.fog(c, top, T, i === 0 ? 0.42 : 0.18, i === 0 ? 0.4 : 0.2)
    }
  }

  paintNear(near: HTMLCanvasElement, sway: HTMLCanvasElement, top: number, T: ReefTheme, tubes: Layers['tubes']) {
    const { w, gy } = this
    const rand = seeded(303)
    const g = ctxOf(near)
    const s = ctxOf(sway)
    g.translate(0, -top)
    s.translate(0, -top)
    const rock = T.near
    const tips: Layers['tubes'] = []
    // background fans stay dimmer than the obstacles in front of them
    const fan = mixHex(T.coral, T.water[1], 0.3 + 0.3 * T.bio)
    // no domes or columns here: those shapes belong to the obstacles (brain coral, pillar coral)
    const slot = 95
    const slots = Math.max(3, Math.round(w / slot))
    const step = w / slots
    for (let i = 0; i < slots; i++) {
      const x = i * step + rand() * step * 0.6
      const roll = rand() * 0.95
      if (roll < 0.3) {
        // long, flat slab of reef rock
        const rx = 26 + rand() * 24
        const ry = 7 + rand() * 6
        this.tiled(x, rx * 1.2, (px) => drawRock(g, px, gy + 1, rx, ry, rock))
      } else if (roll < 0.55) {
        const hgt = 36 + rand() * 50
        const ph = rand() * 10
        this.tiled(x, hgt, (px) => drawSeaFan(s, px, gy - 2, hgt, fan, ph))
      } else if (roll < (T.bio > 0 ? 0.66 : 0.78)) {
        const k = 0.8 + rand() * 0.5
        this.tiled(x, 30, (px) => drawAnemone(s, px, gy - 2, k, fan, T.bio > 0.5))
      } else if (T.bio > 0) {
        // bioluminescent tube corals: bodies fogged with the layer, tips lit after the fog
        const k = 0.85 + rand() * 0.4
        const seed = rand() * 100
        const col = rand() < 0.65 ? T.glow : '#c4b5fd'
        const ts = tubeTips(x, gy, k, seed)
        for (const t of ts) tips.push({ x: t.x, y: t.y - top, col })
        tubes.push({ x, y: ts.reduce((a, t) => a + t.y, 0) / ts.length - top, col })
        this.tiled(x, 30, (px) => drawTubes(g, px, gy, k, seed, mixHex(rock, fan, 0.6)))
      }
      // rocks + grass tufts between features
      if (rand() < 0.5) {
        const rx = x + 40 + rand() * 40
        const rr = 6 + rand() * 7
        this.tiled(rx, rr * 2.4, (px) => drawRock(g, px, gy + 1, rr * 2.2, rr, rock))
      }
      const tx = x + 20 + rand() * 80
      const ph = rand() * 6
      this.tiled(tx, 16, (px) => drawGrass(s, px, gy, mixHex(T.kelp, T.light, 0.12), ph))
    }
    // low rubble band the garden grows from
    g.fillStyle = rock
    g.beginPath()
    g.moveTo(0, gy + 2)
    for (let x = 0; x <= w; x += 5) {
      const u = (x / w) * Math.PI * 2
      g.lineTo(x, gy - 4 - 3 * Math.sin(u * 11 + 1) - 2 * Math.sin(u * 29))
    }
    g.lineTo(w, gy + 2)
    g.closePath()
    g.fill()
    g.setTransform(1, 0, 0, 1, 0, 0)
    s.setTransform(1, 0, 0, 1, 0, 0)
    for (const c of [near, sway]) {
      // pushed back: soft rim, strong blue haze, low contrast, so obstacles own the foreground
      this.shade(c, T, 0.1, 0.15)
      rimLight(c, T.rays > 0 ? T.light : T.glow, 1.5, 2, T.rays > 0 ? 0.3 * T.rays + 0.05 : 0.15)
      this.fog(c, top, T, 0.38, 0.3)
    }
    // glowing tube tips, painted after the fog so they stay bright
    g.save()
    g.globalCompositeOperation = 'lighter'
    for (const t of tips)
      this.tiled(t.x, 10, (px) => {
        const rg = g.createRadialGradient(px, t.y, 0, px, t.y, 5)
        rg.addColorStop(0, rgba('#ffffff', 0.85))
        rg.addColorStop(0.3, rgba(t.col, 0.75))
        rg.addColorStop(1, rgba(t.col, 0))
        g.fillStyle = rg
        g.fillRect(px - 5, t.y - 5, 10, 10)
      })
    g.restore()
  }

  paintSand(c: HTMLCanvasElement, T: ReefTheme, vents: Layers['vents']) {
    const g = ctxOf(c)
    const P = SAND_TILE
    const sh = c.height
    const rand = seeded(404)
    const bg = g.createLinearGradient(0, 0, 0, sh)
    bg.addColorStop(0, mix(T.sand[0], T.rays > 0 ? T.light : T.glow, T.rays > 0 ? 0.18 : 0.06))
    bg.addColorStop(0.12, T.sand[0])
    bg.addColorStop(1, T.sand[1])
    g.fillStyle = bg
    g.fillRect(0, 0, P, sh)
    // wind-less ripples: sine bands that repeat exactly every tile
    for (let j = 0; j < 7; j++) {
      const y0 = 7 + j * (8 + j * 3.2)
      if (y0 > sh) break
      const k = 3 + (j % 3)
      const amp = 2 + j * 0.6
      const ripple = (dy: number) => {
        g.beginPath()
        for (let x = 0; x <= P; x += 8) {
          const u = (x / P) * Math.PI * 2
          const y = y0 + dy + Math.sin(u * k + j) * amp + Math.sin(u * (k * 3 + 1) + j * 2) * 1.2
          if (x === 0) g.moveTo(x, y)
          else g.lineTo(x, y)
        }
        g.stroke()
      }
      g.lineWidth = 1.4 + j * 0.25
      g.strokeStyle = rgba('#000000', 0.1)
      ripple(1.6)
      g.strokeStyle = rgba(T.rays > 0 ? T.light : T.sand[0], T.rays > 0 ? 0.2 : 0.08)
      ripple(0)
    }
    // grains
    for (let i = 0; i < 260; i++) {
      const y = rand() * sh
      g.fillStyle = rand() < 0.5 ? rgba('#000000', 0.12) : rgba('#ffffff', 0.12 * (1 - y / sh))
      g.fillRect(rand() * P, y, 1.2, 1.2)
    }
    const shellCol = mixHex('#f6ece0', T.water[1], T.rays > 0 ? 0.15 : 0.6)
    const pebble = mixHex(T.sand[1], T.near, 0.5)
    for (let i = 0; i < 9; i++) {
      const x = rand() * P
      const y = 8 + rand() * Math.min(40, sh - 10)
      const k = 0.7 + (y / 48) * 0.6
      const roll = rand()
      const rot = (rand() - 0.5) * 1.2
      const pr = (3 + rand() * 4) * k
      this.tiled(
        x,
        14,
        (px) => {
          if (roll < 0.35) drawScallop(g, px, y, 6 * k, rot, shellCol)
          else if (roll < 0.55) drawConch(g, px, y, 6 * k, rot, shellCol)
          else drawPebble(g, px, y, pr, pebble)
        },
        P,
      )
    }
    if (T.rays > 0.6) {
      const sx = P * 0.7
      // a little cluster of sun-bleached shells
      const pink = mixHex('#f2a28a', T.water[1], 0.25)
      this.tiled(
        sx,
        16,
        (px) => {
          drawScallop(g, px, 20, 7, -0.3, pink)
          drawConch(g, px + 11, 24, 4.5, 0.5, shellCol)
          drawPebble(g, px - 9, 25, 3, pebble)
        },
        P,
      )
    }
    if (T.bio > 0.5) {
      // glowing specks in the abyssal ooze
      g.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 40; i++) {
        const x = rand() * P
        const y = 3 + rand() * Math.min(50, sh - 4)
        const col = rand() < 0.6 ? T.glow : '#c4b5fd'
        const rg = g.createRadialGradient(x, y, 0, x, y, 4)
        rg.addColorStop(0, rgba(col, 0.5))
        rg.addColorStop(1, rgba(col, 0))
        g.fillStyle = rg
        g.fillRect(x - 4, y - 4, 8, 8)
      }
      g.globalCompositeOperation = 'source-over'
    }
    if (T.bio > 0) {
      // light-vent mounds; their pulsing orbs are drawn per frame in drawSeabed
      const mound = mixHex(T.sand[1], T.near, 0.4)
      for (let i = 0; i < 3; i++) {
        const v = { x: (i + 0.15 + rand() * 0.7) * (P / 3), y: 16 + rand() * Math.max(0, Math.min(18, sh - 30)), ph: rand() * 6.3 }
        vents.push(v)
        this.tiled(v.x, 20, (px) => drawVent(g, px, v.y, mound, T.glow), P)
      }
    }
  }
}

// ---------------------------------------------------------------- silhouette painters

function drawWreck(g: CanvasRenderingContext2D, x: number, base: number, s: number) {
  g.save()
  g.translate(x, base)
  g.rotate(-0.09)
  const L = 260 * s
  const H = 50 * s
  g.beginPath()
  g.moveTo(-L / 2, -H * 0.9)
  g.lineTo(-L / 2 + 8 * s, -H * 1.35)
  g.lineTo(-L / 2 + 62 * s, -H * 1.3)
  g.lineTo(-L / 2 + 70 * s, -H * 0.88)
  g.lineTo(L / 2 - 50 * s, -H * 0.8)
  g.quadraticCurveTo(L / 2 - 4 * s, -H * 0.85, L / 2 + 22 * s, -H * 1.12)
  g.lineTo(L / 2 + 12 * s, -H * 0.6)
  g.quadraticCurveTo(L / 2 - 14 * s, H * 0.05, L / 2 - 70 * s, H * 0.3)
  g.lineTo(-L / 2 + 26 * s, H * 0.3)
  g.quadraticCurveTo(-L / 2 - 6 * s, 0, -L / 2, -H * 0.9)
  g.closePath()
  g.fill()
  // broken hull: a hole with ribs showing through
  g.save()
  g.globalCompositeOperation = 'destination-out'
  g.beginPath()
  g.ellipse(L * 0.08, -H * 0.38, 26 * s, 13 * s, 0.15, 0, Math.PI * 2)
  g.fill()
  g.restore()
  g.lineWidth = 2.4 * s
  g.beginPath()
  for (let r = -2; r <= 2; r++) {
    g.moveTo(L * 0.08 + r * 9 * s, -H * 0.62)
    g.quadraticCurveTo(L * 0.08 + r * 9 * s + 3 * s, -H * 0.38, L * 0.08 + r * 9 * s, -H * 0.12)
  }
  g.stroke()
  // masts: main broken at the top, a stump, a bowsprit, slack rigging
  g.lineWidth = 4 * s
  g.beginPath()
  g.moveTo(-L * 0.08, -H * 0.82)
  g.lineTo(-L * 0.11, -H * 3.4)
  g.moveTo(L * 0.22, -H * 0.8)
  g.lineTo(L * 0.2, -H * 1.9)
  g.moveTo(L / 2 + 12 * s, -H * 1.0)
  g.lineTo(L / 2 + 60 * s, -H * 1.5)
  g.stroke()
  g.beginPath()
  g.moveTo(-L * 0.11 - 3 * s, -H * 3.4)
  g.lineTo(-L * 0.11 + 4 * s, -H * 3.6)
  g.lineTo(-L * 0.11 + 2 * s, -H * 3.35)
  g.fill()
  g.lineWidth = 3 * s
  g.beginPath()
  g.moveTo(-L * 0.11 - 40 * s, -H * 2.75)
  g.lineTo(-L * 0.11 + 34 * s, -H * 2.95)
  g.stroke()
  g.lineWidth = 1 * s
  g.beginPath()
  g.moveTo(-L * 0.11, -H * 3.3)
  g.lineTo(-L / 2 + 10 * s, -H * 1.3)
  g.moveTo(-L * 0.11, -H * 3.3)
  g.quadraticCurveTo(L * 0.2, -H * 1.6, L / 2 + 50 * s, -H * 1.45)
  g.moveTo(-L * 0.11 + 34 * s, -H * 2.95)
  g.quadraticCurveTo(-L * 0.11 + 40 * s, -H * 2.2, -L * 0.11 + 30 * s, -H * 1.8)
  g.stroke()
  g.restore()
}

function drawArch(g: CanvasRenderingContext2D, x: number, base: number, rx: number, ry: number, noise: number[]) {
  const n = noise.length / 2
  g.beginPath()
  g.moveTo(x - rx * 1.15, base + 4)
  for (let i = 0; i <= n - 1; i++) {
    const t = Math.PI + (i / (n - 1)) * Math.PI
    const k = 1 + noise[i]
    g.lineTo(x + Math.cos(t) * rx * k, base + Math.sin(t) * ry * k)
  }
  g.lineTo(x + rx * 1.15, base + 4)
  g.lineTo(x + rx * 0.5, base + 4)
  for (let i = n - 1; i >= 0; i--) {
    const t = Math.PI + (i / (n - 1)) * Math.PI
    const k = 1 + noise[n + i] * 0.6
    g.lineTo(x + Math.cos(t) * rx * 0.5 * k, base + Math.sin(t) * ry * 0.58 * k)
  }
  g.lineTo(x - rx * 0.5, base + 4)
  g.closePath()
  g.fill()
}

function drawSpire(g: CanvasRenderingContext2D, x: number, base: number, sw: number, sh: number, jit: number[]) {
  g.beginPath()
  g.moveTo(x - sw, base + 4)
  const n = jit.length
  for (let i = 1; i < n; i++) {
    const u = i / n
    g.lineTo(x - sw * (1 - u * 0.7) + jit[i], base - sh * u)
  }
  g.quadraticCurveTo(x, base - sh - sw * 0.5, x + sw * 0.3 + jit[0] * 0.3, base - sh)
  for (let i = n - 1; i >= 1; i--) {
    const u = i / n
    g.lineTo(x + sw * (1 - u * 0.7) + jit[n - i] * 0.8, base - sh * u)
  }
  g.lineTo(x + sw, base + 4)
  g.closePath()
  g.fill()
}

/** Giant kelp: tapering wavy stipe with alternating blades and little gas bulbs. */
function drawKelp(g: CanvasRenderingContext2D, x0: number, base: number, H: number, ph: number, lean: number) {
  const segs = Math.max(6, Math.ceil(H / 9))
  const cx: number[] = []
  const cy: number[] = []
  for (let i = 0; i <= segs; i++) {
    const u = i / segs
    cx.push(x0 + Math.sin(u * 5 + ph) * 12 * u + Math.sin(u * 11 + ph * 2) * 2.5 + u * u * lean)
    cy.push(base - u * H)
  }
  const width = (u: number) => 3.4 * (1 - u) + 1
  g.beginPath()
  for (let i = 0; i <= segs; i++) g.lineTo(cx[i] - width(i / segs), cy[i])
  for (let i = segs; i >= 0; i--) g.lineTo(cx[i] + width(i / segs), cy[i])
  g.closePath()
  g.fill()
  g.beginPath()
  for (let i = 2; i <= segs; i += 2) {
    const r = Math.sin(i * 12.9898 + ph * 78.233) * 43758.5453
    const rnd = r - Math.floor(r)
    if (rnd < 0.2) continue
    const u = i / segs
    const side = (i / 2) % 2 ? 1 : -1
    // long leaf blades that stream up and slightly downstream (to the right)
    const len = (24 + 18 * Math.sin(u * Math.PI) + 10 * rnd) * (1 - u * 0.35)
    const wid = 4.5 + 3 * rnd
    // mostly sideways, a little upward, all bent the same way by the current
    const a = side > 0 ? -0.25 - 0.45 * rnd : Math.PI + 0.55 + 0.4 * rnd
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const px = cx[i]
    const py = cy[i]
    // leaf in local coords (along a): base (0,0) → tip (len,0), bulging ±wid
    const P = (lx: number, ly: number): [number, number] => [px + ca * lx - sa * ly, py + sa * lx + ca * ly]
    const [tx, ty] = P(len, side * 2)
    const [c1x, c1y] = P(len * 0.35, -wid)
    const [c2x, c2y] = P(len * 0.45, wid * 0.8)
    g.moveTo(px, py)
    g.quadraticCurveTo(c1x, c1y, tx, ty)
    g.quadraticCurveTo(c2x, c2y, px, py)
    g.moveTo(px + side * 2.6, py + 0.5)
    g.arc(px + side * 1.2, py + 0.5, 1.7, 0, Math.PI * 2)
  }
  // frond at the tip
  const tx = cx[segs]
  const ty = cy[segs]
  g.moveTo(tx, ty)
  g.quadraticCurveTo(tx + 8, ty - 10, tx + 3, ty - 20)
  g.quadraticCurveTo(tx - 4, ty - 8, tx, ty)
  g.fill()
}

function drawSeaFan(g: CanvasRenderingContext2D, x: number, base: number, h: number, col: string, ph: number) {
  g.strokeStyle = col
  g.lineCap = 'round'
  const branch = (bx: number, by: number, a: number, len: number, d: number, lw: number) => {
    const ex = bx + Math.cos(a) * len
    const ey = by + Math.sin(a) * len
    g.lineWidth = lw
    g.beginPath()
    g.moveTo(bx, by)
    g.quadraticCurveTo(bx + Math.cos(a + 0.3) * len * 0.5, by + Math.sin(a + 0.3) * len * 0.5, ex, ey)
    g.stroke()
    if (d <= 0) return
    const spread = 0.42 + 0.08 * Math.sin(ph + d)
    branch(ex, ey, a - spread, len * 0.74, d - 1, lw * 0.72)
    branch(ex, ey, a + spread, len * 0.74, d - 1, lw * 0.72)
  }
  branch(x, base, -Math.PI / 2, h * 0.27, 6, 3.2)
  g.lineCap = 'butt'
}

function drawAnemone(g: CanvasRenderingContext2D, x: number, base: number, k: number, col: string, glow: boolean) {
  const body = mixHex(col, '#4a2040', 0.45)
  g.fillStyle = body
  g.beginPath()
  g.moveTo(x - 9 * k, base + 2)
  g.quadraticCurveTo(x - 10 * k, base - 10 * k, x - 7 * k, base - 13 * k)
  g.lineTo(x + 7 * k, base - 13 * k)
  g.quadraticCurveTo(x + 10 * k, base - 10 * k, x + 9 * k, base + 2)
  g.closePath()
  g.fill()
  g.lineCap = 'round'
  const n = 13
  for (const [lw, c] of [
    [3.2 * k, col],
    [1.4 * k, mixHex(col, '#ffffff', 0.35)],
  ] as const) {
    g.strokeStyle = c
    g.lineWidth = lw
    g.beginPath()
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5
      const sx = x + u * 13 * k
      const sy = base - 13 * k
      const len = (16 + 6 * Math.cos(u * 3)) * k
      const ex = sx + u * len * 1.3
      const ey = sy - len * (1 - Math.abs(u) * 0.6)
      g.moveTo(sx, sy)
      g.quadraticCurveTo(sx + u * len * 0.2, sy - len * 0.7, ex, ey)
    }
    g.stroke()
  }
  g.fillStyle = glow ? '#e9d5ff' : mixHex(col, '#ffffff', 0.6)
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - 0.5
    const len = (16 + 6 * Math.cos(u * 3)) * k
    const ex = x + u * 13 * k + u * len * 1.3
    const ey = base - 13 * k - len * (1 - Math.abs(u) * 0.6)
    g.moveTo(ex + 1.6 * k, ey)
    g.arc(ex, ey, 1.6 * k, 0, Math.PI * 2)
  }
  g.fill()
  g.lineCap = 'butt'
}

function drawRock(g: CanvasRenderingContext2D, x: number, base: number, rx: number, ry: number, col: string) {
  g.fillStyle = col
  g.beginPath()
  g.moveTo(x - rx, base)
  g.bezierCurveTo(x - rx, base - ry * 0.8, x - rx * 0.3, base - ry * 1.05, x + rx * 0.1, base - ry)
  g.bezierCurveTo(x + rx * 0.7, base - ry * 0.95, x + rx * 1.05, base - ry * 0.4, x + rx, base)
  g.closePath()
  g.fill()
}

function drawGrass(g: CanvasRenderingContext2D, x: number, base: number, col: string, ph: number) {
  g.strokeStyle = col
  g.lineWidth = 1.6
  g.lineCap = 'round'
  g.beginPath()
  for (let i = 0; i < 6; i++) {
    const bx = x + (i - 2.5) * 2.4
    const hgt = 12 + 9 * Math.abs(Math.sin(ph + i * 1.7))
    g.moveTo(bx, base)
    g.quadraticCurveTo(bx + (i - 2.5) * 1.5, base - hgt * 0.6, bx + (i - 2.5) * 3 + 2, base - hgt)
  }
  g.stroke()
  g.lineCap = 'butt'
}

function drawScallop(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, col: string) {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.fillStyle = rgba('#000000', 0.18)
  g.beginPath()
  g.ellipse(1, 2, r * 1.05, r * 0.5, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = col
  g.beginPath()
  g.moveTo(0, r * 0.35)
  g.arc(0, r * 0.35, r, Math.PI * 1.15, Math.PI * 1.85)
  g.closePath()
  g.fill()
  g.strokeStyle = rgba('#000000', 0.18)
  g.lineWidth = 0.8
  g.beginPath()
  for (let i = 1; i < 6; i++) {
    const a = Math.PI * 1.15 + (i / 6) * Math.PI * 0.7
    g.moveTo(0, r * 0.35)
    g.lineTo(Math.cos(a) * r * 0.95, r * 0.35 + Math.sin(a) * r * 0.95)
  }
  g.stroke()
  g.restore()
}

function drawConch(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, col: string) {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.fillStyle = col
  g.beginPath()
  g.moveTo(-r * 1.3, 0)
  g.quadraticCurveTo(-r * 0.2, -r * 0.9, r * 0.9, -r * 0.2)
  g.quadraticCurveTo(r * 0.6, r * 0.5, -r * 1.3, 0)
  g.fill()
  g.strokeStyle = rgba('#000000', 0.2)
  g.lineWidth = 0.8
  g.beginPath()
  for (let i = 1; i < 4; i++) {
    g.moveTo(-r * 1.3 + i * r * 0.5, -r * 0.35 - (i % 2) * 0.6)
    g.lineTo(-r * 1.1 + i * r * 0.5, r * 0.18)
  }
  g.stroke()
  g.restore()
}

function drawPebble(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  g.fillStyle = col
  g.beginPath()
  g.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = rgba('#ffffff', 0.18)
  g.beginPath()
  g.ellipse(x - r * 0.3, y - r * 0.25, r * 0.4, r * 0.2, 0, 0, Math.PI * 2)
  g.fill()
}

/** tube-coral cluster: tip centres (absolute coords) for the given seed */
function tubeTips(x: number, base: number, k: number, seed: number) {
  const tips: { x: number; y: number }[] = []
  for (let i = 0; i < 5; i++) {
    const r = hash(seed + i)
    // fanned out with gaps, outer tubes shorter
    tips.push({ x: x + (i - 2) * 8 * k + (r - 0.5) * 3, y: base - (14 + 22 * hash(seed + i + 9) + (2 - Math.abs(i - 2)) * 7) * k })
  }
  return tips
}

function drawTubes(g: CanvasRenderingContext2D, x: number, base: number, k: number, seed: number, col: string) {
  g.fillStyle = col
  g.strokeStyle = mixHex(col, '#000000', 0.4)
  g.lineWidth = 1.2
  for (const [i, t] of tubeTips(x, base, k, seed).entries()) {
    const tw = (1.8 + 0.7 * hash(seed + i + 3)) * k
    const bx = x + (i - 2) * 2.5 * k
    g.beginPath()
    g.moveTo(bx - tw, base + 2)
    g.quadraticCurveTo(t.x - tw * 1.1, (base + t.y) / 2, t.x - tw, t.y)
    g.lineTo(t.x + tw, t.y)
    g.quadraticCurveTo(t.x + tw * 1.1, (base + t.y) / 2, bx + tw, base + 2)
    g.closePath()
    g.fill()
    // open mouth at the top
    g.beginPath()
    g.ellipse(t.x, t.y, tw, tw * 0.4, 0, 0, Math.PI * 2)
    g.stroke()
  }
}

function drawVent(g: CanvasRenderingContext2D, x: number, y: number, col: string, glow: string) {
  g.fillStyle = col
  g.beginPath()
  g.moveTo(x - 16, y + 4)
  g.quadraticCurveTo(x - 9, y - 2, x - 4, y - 6)
  g.lineTo(x + 4, y - 6)
  g.quadraticCurveTo(x + 9, y - 2, x + 16, y + 4)
  g.closePath()
  g.fill()
  g.save()
  g.globalCompositeOperation = 'lighter'
  const rg = g.createRadialGradient(x, y - 6, 0, x, y - 6, 9)
  rg.addColorStop(0, rgba(glow, 0.7))
  rg.addColorStop(1, rgba(glow, 0))
  g.fillStyle = rg
  g.fillRect(x - 9, y - 15, 18, 18)
  g.restore()
}

/** crystal outcrop: faceted shards fanning up from one base, cyan tips over a violet heart */
function crystalSprite(glow: string) {
  const key = `crystal${glow}`
  let c = spriteCache.get(key)
  if (!c) {
    const W = 150
    const H = 110
    c = makeCanvas(W, H)
    const g = ctxOf(c)
    const bx = W / 2
    const by = H - 6
    // [lean, length, half-width]
    const shards: [number, number, number][] = [
      [-0.85, 22, 5],
      [0.8, 26, 5],
      [-0.62, 38, 6],
      [0.55, 34, 6],
      [-0.35, 62, 8],
      [0.3, 54, 7],
      [0.08, 74, 9],
      [-0.12, 92, 10],
    ]
    for (const [a, len, wd] of shards) {
      g.save()
      g.translate(bx + a * 30, by)
      g.rotate(a * 0.9)
      const sg = g.createLinearGradient(0, 0, 0, -len)
      sg.addColorStop(0, mix('#3b2a6b', '#000000', 0.2))
      sg.addColorStop(0.55, mix('#7c6cf0', glow, 0.4))
      sg.addColorStop(1, mix(glow, '#ffffff', 0.25))
      g.fillStyle = sg
      g.beginPath()
      g.moveTo(-wd, 0)
      g.lineTo(-wd, -len * 0.8)
      g.lineTo(0, -len)
      g.lineTo(wd, -len * 0.8)
      g.lineTo(wd, 0)
      g.closePath()
      g.fill()
      // lit facet + crisp ridge
      g.fillStyle = rgba('#ffffff', 0.16)
      g.beginPath()
      g.moveTo(-wd, 0)
      g.lineTo(-wd, -len * 0.8)
      g.lineTo(0, -len)
      g.lineTo(-wd * 0.15, 0)
      g.closePath()
      g.fill()
      g.strokeStyle = rgba(mixHex(glow, '#ffffff', 0.4), 0.55)
      g.lineWidth = 1
      g.beginPath()
      g.moveTo(0, -2)
      g.lineTo(0, -len)
      g.stroke()
      g.restore()
    }
    // rock the cluster grows out of
    g.fillStyle = '#0a1428'
    g.beginPath()
    g.ellipse(bx, by + 2, 52, 10, 0, Math.PI, 0)
    g.fill()
    spriteCache.set(key, c)
  }
  return c
}

// ---------------------------------------------------------------- particle sprites

const spriteCache = new Map<string, HTMLCanvasElement>()

/** soft glowing dot: bright core, gaussian-ish falloff */
function dotSprite(color: string) {
  const key = `dot${color}`
  let c = spriteCache.get(key)
  if (!c) {
    c = makeCanvas(32, 32)
    const g = ctxOf(c)
    const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16)
    rg.addColorStop(0, rgba('#ffffff', 1))
    rg.addColorStop(0.12, rgba(color, 0.95))
    rg.addColorStop(0.35, rgba(color, 0.25))
    rg.addColorStop(1, rgba(color, 0))
    g.fillStyle = rg
    g.fillRect(0, 0, 32, 32)
    spriteCache.set(key, c)
  }
  return c
}

/** bubble: thin bright rim, faint body, specular highlight up-left (toward the surface light) */
function bubbleSprite(color: string) {
  const key = `bub${color}`
  let c = spriteCache.get(key)
  if (!c) {
    c = makeCanvas(32, 32)
    const g = ctxOf(c)
    const body = g.createRadialGradient(13, 12, 2, 16, 16, 15)
    body.addColorStop(0, rgba(color, 0.05))
    body.addColorStop(0.8, rgba(color, 0.18))
    body.addColorStop(1, rgba(color, 0.5))
    g.fillStyle = body
    g.beginPath()
    g.arc(16, 16, 14.5, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = rgba(color, 0.75)
    g.lineWidth = 2
    g.stroke()
    g.fillStyle = 'rgba(255, 255, 255, 0.9)'
    g.beginPath()
    g.ellipse(11, 10, 4, 2.6, -0.7, 0, Math.PI * 2)
    g.fill()
    spriteCache.set(key, c)
  }
  return c
}
