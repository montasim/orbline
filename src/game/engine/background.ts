import type { BgTheme } from '../data'
import { storage } from '../storage'

interface Star {
  x: number
  y: number
  size: number
  baseAlpha: number
  twinkleSpeed: number
  twinkleOffset: number
}

interface Flake {
  x: number
  y: number
  r: number
  vy: number
  depth: number
  phase: number
}

interface Crack {
  relX: number
  pts: number[]
}

/** Parses '#rrggbb' into [r, g, b]. */
const rgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
/** Linear blend of two '#rrggbb' colours, returned as an rgb()/rgba() string. */
export const mix = (a: string, b: string, t: number, alpha = 1) => {
  const ca = rgb(a)
  const cb = rgb(b)
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t))
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}

/** Deterministic RNG so a rebuilt layer keeps the same layout. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const SNOW_WHITE = '#eef6ff'
const QUALITY_SCALE = { low: 0.35, medium: 0.65, high: 1 } as const

/** Arctic night: sky, stars, aurora, ice peaks, snowy hills/pines, igloos, ice sheet and snowfall. */
export class Background {
  offsetLayer1 = 0
  offsetLayer2 = 0
  offsetLayer3 = 0
  offsetGround = 0
  stars: Star[] = []
  flakes: Flake[] = []
  cracks: Crack[] = []
  snowLevel = 0.35
  snowScale: number
  // parallax layers are drawn once per theme/size into tileable offscreen canvases
  layers: HTMLCanvasElement[] = []
  layerKey: BgTheme | null = null
  layerSize = ''
  auroraBuf: HTMLCanvasElement | null = null
  auroraSoft: HTMLCanvasElement | null = null

  constructor(
    public width: number,
    public height: number,
    public groundY: number,
  ) {
    for (let i = 0; i < 90; i++)
      this.stars.push({
        x: Math.random() * width,
        y: groundY * 0.7 * Math.random(),
        size: Math.random() < 0.12 ? 2 : Math.random() < 0.5 ? 1.2 : 0.7,
        baseAlpha: 0.3 + Math.random() * 0.6,
        twinkleSpeed: 1.2 + Math.random() * 2.5,
        twinkleOffset: Math.random() * Math.PI * 2,
      })
    this.snowScale = QUALITY_SCALE[storage.getSettings().particlesQuality] ?? 1
    const flakeCount = Math.round(170 * this.snowScale)
    for (let i = 0; i < flakeCount; i++) {
      const depth = 0.35 + Math.random() * 0.65
      this.flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.8 + depth * 1.8,
        vy: 0.5 + Math.random() * 0.8,
        depth,
        phase: Math.random() * Math.PI * 2,
      })
    }
    for (let i = 0; i < 9; i++) {
      const pts: number[] = []
      let cx = 0
      let cy = 0
      const segs = 2 + Math.floor(Math.random() * 2)
      for (let s = 0; s < segs; s++) {
        cx -= 6 + Math.random() * 12
        cy += 5 + Math.random() * 9
        pts.push(cx, cy)
      }
      this.cracks.push({ relX: i * 66 + Math.random() * 40, pts })
    }
  }

  resize(width: number, height: number, groundY: number) {
    this.width = width
    this.height = height
    this.groundY = groundY
    for (const s of this.stars) {
      if (s.x > width) s.x = Math.random() * width
      if (s.y > groundY * 0.7) s.y = groundY * 0.7 * Math.random()
    }
    for (const f of this.flakes) {
      if (f.x > width) f.x = Math.random() * width
      if (f.y > height) f.y = Math.random() * height
    }
  }

  update(speed: number) {
    this.offsetLayer1 = (this.offsetLayer1 + speed * 0.1) % this.width
    this.offsetLayer2 = (this.offsetLayer2 + speed * 0.24) % this.width
    this.offsetLayer3 = (this.offsetLayer3 + speed * 0.48) % this.width
    this.offsetGround = (this.offsetGround + speed) % 600
    const now = Date.now() / 1000
    const blizzard = this.snowLevel > 0.8
    const wind = blizzard ? 3.2 : 0.5
    for (const f of this.flakes) {
      f.x -= (speed * 0.22 + wind) * f.depth + Math.sin(now * 1.3 + f.phase) * 0.35
      f.y += f.vy * f.depth * (blizzard ? 2.2 : 1)
      if (f.y > this.height + 4) {
        f.y = -4
        f.x = Math.random() * (this.width + 200)
      }
      if (f.x < -6) {
        f.x = this.width + 6
        f.y = Math.random() * this.height
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, theme: BgTheme) {
    const w = this.width
    const h = this.height
    const gy = this.groundY
    this.snowLevel = theme.snow
    const sky = ctx.createLinearGradient(0, 0, 0, gy)
    sky.addColorStop(0, theme.skyGradient[0])
    sky.addColorStop(0.55, theme.skyGradient[1])
    sky.addColorStop(1, theme.skyGradient[2])
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)
    const now = Date.now() / 1000
    this.drawStars(ctx, now)
    this.drawAurora(ctx, theme, now)
    this.ensureLayers(theme)
    for (const [i, offset] of [this.offsetLayer1, this.offsetLayer2, this.offsetLayer3].entries()) {
      const layer = this.layers[i]
      const ox = Math.floor(offset)
      ctx.drawImage(layer, -ox, 0)
      ctx.drawImage(layer, w - ox, 0)
    }
    this.drawIceSheet(ctx, theme, now)
    this.drawSnowfall(ctx, theme)
  }

  drawStars(ctx: CanvasRenderingContext2D, now: number) {
    ctx.save()
    for (const s of this.stars) {
      const a = Math.max(0.1, Math.min(1, s.baseAlpha + Math.sin(now * s.twinkleSpeed + s.twinkleOffset) * 0.35))
      ctx.globalAlpha = a
      ctx.fillStyle = s.size > 1.5 ? '#e0f7ff' : '#ffffff'
      if (s.size > 1.5) {
        // four-point sparkle
        const r = s.size * 2.6
        ctx.beginPath()
        ctx.moveTo(s.x, s.y - r)
        ctx.quadraticCurveTo(s.x, s.y, s.x + r, s.y)
        ctx.quadraticCurveTo(s.x, s.y, s.x, s.y + r)
        ctx.quadraticCurveTo(s.x, s.y, s.x - r, s.y)
        ctx.quadraticCurveTo(s.x, s.y, s.x, s.y - r)
        ctx.fill()
      } else ctx.fillRect(s.x, s.y, s.size, s.size)
    }
    ctx.restore()
  }

  /**
   * Curtain-like ribbons: stacked translucent bands that brighten toward their lower edge.
   * Rendered at quarter resolution and upscaled, which both blurs the edges and keeps it cheap.
   */
  drawAurora(ctx: CanvasRenderingContext2D, theme: BgTheme, now: number) {
    const w = this.width
    const gy = this.groundY
    const [c0, c1] = theme.aurora
    const S = 4
    if (!this.auroraBuf) this.auroraBuf = document.createElement('canvas')
    const buf = this.auroraBuf
    const bw = Math.max(1, Math.ceil(w / S))
    const bh = Math.max(1, Math.ceil(gy / S))
    if (buf.width !== bw || buf.height !== bh) {
      buf.width = bw
      buf.height = bh
    }
    const b = buf.getContext('2d')
    if (!b) return
    b.setTransform(1 / S, 0, 0, 1 / S, 0, 0)
    b.clearRect(0, 0, w, gy)
    b.globalCompositeOperation = 'lighter'
    // soft horizon glow
    const glow = b.createLinearGradient(0, gy * 0.4, 0, gy)
    glow.addColorStop(0, 'rgba(0, 0, 0, 0)')
    glow.addColorStop(1, mix(c0, c0, 0, 0.14))
    b.fillStyle = glow
    b.fillRect(0, gy * 0.4, w, gy * 0.6)
    const ribbons = [
      { base: 0.34, amp: 0.06, k: 0.9, speed: 0.18, height: 0.24, phase: 0, flip: false, bright: 1 },
      { base: 0.46, amp: 0.045, k: 1.3, speed: -0.14, height: 0.17, phase: 2.1, flip: true, bright: 0.75 },
      { base: 0.22, amp: 0.035, k: 1.8, speed: 0.1, height: 0.12, phase: 4.2, flip: false, bright: 0.55 },
    ]
    const step = 16
    for (const r of ribbons) {
      const grad = b.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, mix(r.flip ? c1 : c0, c0, 0, 0))
      grad.addColorStop(0.3, mix(r.flip ? c1 : c0, c0, 0, 1))
      grad.addColorStop(0.7, mix(r.flip ? c0 : c1, c1, 0, 1))
      grad.addColorStop(1, mix(r.flip ? c0 : c1, c1, 0, 0))
      b.fillStyle = grad
      const centre = (x: number) => {
        const u = x / w
        return (
          gy *
          (r.base +
            r.amp * Math.sin(u * Math.PI * 2 * r.k + now * r.speed + r.phase) +
            r.amp * 0.35 * Math.sin(u * Math.PI * 2 * r.k * 2.7 - now * r.speed * 1.6 + r.phase))
        )
      }
      // three nested bands: tall & faint → short & bright at the bottom edge
      for (const [frac, alpha] of [
        [1, 0.1],
        [0.5, 0.14],
        [0.16, 0.24],
      ]) {
        b.globalAlpha = alpha * r.bright
        b.beginPath()
        for (let x = 0; x <= w + step; x += step) {
          const shimmer = 0.7 + 0.3 * Math.sin(x * 0.02 + now * 0.7 + r.phase)
          const y = centre(x) - gy * r.height * frac * shimmer
          if (x === 0) b.moveTo(x, y)
          else b.lineTo(x, y)
        }
        for (let x = Math.floor((w + step) / step) * step; x >= 0; x -= step) b.lineTo(x, centre(x) + 6)
        b.closePath()
        b.fill()
      }
      // vertical light rays rising from the lower edge
      b.globalAlpha = 0.1 * r.bright
      b.strokeStyle = grad
      b.lineWidth = 7
      b.beginPath()
      for (let x = (r.phase * 9) % 19; x < w; x += 19 + 12 * Math.abs(Math.sin(x * 0.31))) {
        const len = gy * r.height * (0.3 + 0.7 * Math.abs(Math.sin(x * 0.07 + now * 0.5 + r.phase)))
        const y = centre(x)
        b.moveTo(x, y)
        b.lineTo(x, y - len)
      }
      b.stroke()
    }
    b.globalAlpha = 1
    // blur at quarter resolution so rays read as soft light, not hard columns (cheap: ~320×150 px)
    if (!this.auroraSoft) this.auroraSoft = document.createElement('canvas')
    const soft = this.auroraSoft
    if (soft.width !== bw || soft.height !== bh) {
      soft.width = bw
      soft.height = bh
    }
    const s = soft.getContext('2d')
    if (!s) return
    s.clearRect(0, 0, bw, bh)
    s.filter = 'blur(1.25px)'
    s.drawImage(buf, 0, 0)
    s.filter = 'none'
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(soft, 0, 0, bw * S, bh * S)
    ctx.restore()
  }

  ensureLayers(theme: BgTheme) {
    const size = `${this.width}x${this.groundY}`
    if (this.layerKey === theme && this.layerSize === size) return
    this.layerKey = theme
    this.layerSize = size
    const make = () => {
      const c = document.createElement('canvas')
      c.width = Math.max(1, this.width)
      c.height = Math.max(1, Math.ceil(this.groundY) + 2)
      return c
    }
    this.layers = [make(), make(), make()]
    const ctxs = this.layers.map((c) => c.getContext('2d'))
    if (ctxs[0]) this.paintPeaks(ctxs[0], theme)
    if (ctxs[1]) this.paintHills(ctxs[1], theme)
    if (ctxs[2]) this.paintNear(ctxs[2], theme)
  }

  /** Calls draw(x) for x and its wrapped copies so a feature near the tile edge stays seamless. */
  tiled(x: number, margin: number, draw: (x: number) => void) {
    draw(x)
    if (x - margin < 0) draw(x + this.width)
    if (x + margin > this.width) draw(x - this.width)
  }

  paintPeaks(ctx: CanvasRenderingContext2D, theme: BgTheme) {
    const w = this.width
    const gy = this.groundY
    const rand = seeded(11)
    const maxH = Math.min(170, gy * 0.5)
    const peaks: { x: number; h: number; half: number }[] = []
    for (let x = 0; x < w; ) {
      const half = 55 + rand() * 70
      peaks.push({ x: x + half, h: maxH * (0.45 + rand() * 0.55), half })
      x += half * (1.1 + rand() * 0.5)
    }
    const base = gy
    const drawPeak = (px: number, p: { h: number; half: number }) => {
      const top = base - 18 - p.h
      const left = px - p.half * 1.25
      const right = px + p.half * 1.25
      // body
      ctx.fillStyle = theme.peakColor
      ctx.beginPath()
      ctx.moveTo(left, base)
      ctx.lineTo(px - p.half * 0.45, top + p.h * 0.42)
      ctx.lineTo(px - p.half * 0.2, top + p.h * 0.18)
      ctx.lineTo(px, top)
      ctx.lineTo(px + p.half * 0.3, top + p.h * 0.26)
      ctx.lineTo(px + p.half * 0.55, top + p.h * 0.36)
      ctx.lineTo(right, base)
      ctx.closePath()
      ctx.fill()
      ctx.save()
      ctx.clip()
      // shaded right face
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
      ctx.beginPath()
      ctx.moveTo(px, top)
      ctx.lineTo(px + p.half * 0.1, top + p.h * 0.5)
      ctx.lineTo(px - p.half * 0.05, base)
      ctx.lineTo(right + 10, base)
      ctx.lineTo(right + 10, top)
      ctx.closePath()
      ctx.fill()
      // snow cap with jagged lower edge
      const capY = top + p.h * 0.34
      ctx.fillStyle = 'rgba(238, 246, 255, 0.92)'
      ctx.beginPath()
      ctx.moveTo(px - p.half, top - 5)
      ctx.lineTo(px + p.half, top - 5)
      ctx.lineTo(px + p.half, capY - 6)
      ctx.lineTo(px + p.half * 0.45, capY + 4)
      ctx.lineTo(px + p.half * 0.22, capY - 8)
      ctx.lineTo(px, capY + 6)
      ctx.lineTo(px - p.half * 0.2, capY - 4)
      ctx.lineTo(px - p.half * 0.42, capY + 8)
      ctx.lineTo(px - p.half, capY - 2)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(120, 150, 200, 0.28)'
      ctx.beginPath()
      ctx.moveTo(px, top)
      ctx.lineTo(px + p.half, top + 30)
      ctx.lineTo(px + p.half, capY + 10)
      ctx.lineTo(px + p.half * 0.08, capY + 10)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      // pale rim light along the sunlit ridge
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.moveTo(px - p.half * 0.45, top + p.h * 0.42)
      ctx.lineTo(px - p.half * 0.2, top + p.h * 0.18)
      ctx.lineTo(px, top)
      ctx.stroke()
    }
    for (const p of peaks) this.tiled(p.x, p.half * 1.3, (x) => drawPeak(x, p))
    // atmospheric haze toward the horizon
    ctx.globalCompositeOperation = 'source-atop'
    const haze = ctx.createLinearGradient(0, base - maxH - 20, 0, base)
    haze.addColorStop(0, 'rgba(0, 0, 0, 0)')
    haze.addColorStop(1, mix(theme.skyGradient[2], theme.skyGradient[2], 0, 0.75))
    ctx.fillStyle = haze
    ctx.fillRect(0, 0, w, base)
    ctx.globalCompositeOperation = 'source-over'
  }

  paintHills(ctx: CanvasRenderingContext2D, theme: BgTheme) {
    const w = this.width
    const gy = this.groundY
    const rand = seeded(23)
    const hillY = (x: number) =>
      gy - 34 - 12 * Math.sin((x / w) * Math.PI * 4 + 0.6) - 7 * Math.sin((x / w) * Math.PI * 10 + 1.9)
    const hillPath = () => {
      ctx.beginPath()
      ctx.moveTo(0, gy + 2)
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, hillY(x))
      ctx.lineTo(w, hillY(w))
      ctx.lineTo(w, gy + 2)
      ctx.closePath()
    }
    const pineBody = mix(theme.midgroundColor, theme.skyGradient[2], 0.25)
    // pines behind the crest
    for (let x = rand() * 30; x < w; x += 22 + rand() * 46) {
      const th = 26 + rand() * 30
      this.tiled(x, 20, (px) => drawPine(ctx, px, hillY(px) + 6, th, pineBody, 'rgba(226, 240, 255, 0.7)'))
    }
    const fill = ctx.createLinearGradient(0, gy - 60, 0, gy)
    fill.addColorStop(0, mix(theme.midgroundColor, SNOW_WHITE, 0.28))
    fill.addColorStop(1, theme.midgroundColor)
    ctx.fillStyle = fill
    hillPath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(226, 240, 255, 0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, hillY(x))
    ctx.stroke()
  }

  paintNear(ctx: CanvasRenderingContext2D, theme: BgTheme) {
    const w = this.width
    const gy = this.groundY
    const rand = seeded(37)
    const body = mix(theme.midgroundColor, '#020617', 0.35)
    // snowbank the near props sit on
    ctx.fillStyle = mix(theme.midgroundColor, SNOW_WHITE, 0.45)
    ctx.beginPath()
    ctx.moveTo(0, gy + 2)
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, gy - 6 - 4 * Math.sin((x / w) * Math.PI * 6))
    ctx.lineTo(w, gy + 2)
    ctx.closePath()
    ctx.fill()
    const slot = 150
    const slots = Math.max(3, Math.round(w / slot))
    const step = w / slots
    for (let i = 0; i < slots; i++) {
      const x = i * step + rand() * step * 0.5
      const roll = rand()
      if (roll < 0.22) this.tiled(x, 50, (px) => drawIgloo(ctx, px, gy - 2))
      else if (roll < 0.34) this.tiled(x, 20, (px) => drawLantern(ctx, px, gy - 2))
      else if (roll < 0.44) this.tiled(x, 30, (px) => drawSignpost(ctx, px, gy - 2))
      const trees = 1 + Math.floor(rand() * 2)
      for (let t = 0; t < trees; t++) {
        const tx = x + 55 + t * 26 + rand() * 20
        const th = 58 + rand() * 40
        this.tiled(tx, 30, (px) => drawPine(ctx, px, gy - 2, th, body, 'rgba(238, 246, 255, 0.95)'))
      }
    }
  }

  drawIceSheet(ctx: CanvasRenderingContext2D, theme: BgTheme, now: number) {
    const w = this.width
    const h = this.height
    const gy = this.groundY
    ctx.save()
    const deep = ctx.createLinearGradient(0, gy, 0, h)
    deep.addColorStop(0, theme.groundColor)
    deep.addColorStop(0.12, mix(theme.groundColor, theme.groundAccent, 0.35))
    deep.addColorStop(0.2, mix(theme.peakColor, '#38bdf8', 0.25))
    deep.addColorStop(1, mix(theme.peakColor, '#000000', 0.6))
    ctx.fillStyle = deep
    ctx.fillRect(0, gy, w, h - gy)
    // faint strata lines in the deep ice
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.07)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const ly of [gy + 26, gy + 44, gy + 70]) {
      ctx.moveTo(0, ly)
      ctx.lineTo(w, ly)
    }
    ctx.stroke()
    // diagonal cracks scrolling with the ground
    ctx.strokeStyle = theme.crackColor
    ctx.lineWidth = 1.3
    ctx.beginPath()
    for (let base = -this.offsetGround; base < w + 600; base += 600) {
      for (const c of this.cracks) {
        const x0 = base + c.relX
        if (x0 < -40 || x0 > w + 40) continue
        ctx.moveTo(x0, gy + 3)
        for (let i = 0; i < c.pts.length; i += 2) ctx.lineTo(x0 + c.pts[i], gy + 3 + c.pts[i + 1])
        ctx.moveTo(x0 + c.pts[0], gy + 3 + c.pts[1])
        ctx.lineTo(x0 + c.pts[0] + 7, gy + 3 + c.pts[1] + 4)
      }
    }
    ctx.stroke()
    // glints on the polished top
    ctx.fillStyle = '#ffffff'
    for (let base = -this.offsetGround; base < w + 600; base += 600) {
      for (let i = 0; i < 5; i++) {
        const gx = base + 40 + i * 120
        if (gx < -10 || gx > w + 10) continue
        const a = Math.max(0, Math.sin(now * 2.2 + i * 1.7))
        if (a < 0.05) continue
        ctx.globalAlpha = a * 0.9
        const r = 3 + a * 2.5
        const gyy = gy + 6 + (i % 2) * 3
        ctx.beginPath()
        ctx.moveTo(gx, gyy - r)
        ctx.lineTo(gx + 0.8, gyy - 0.8)
        ctx.lineTo(gx + r, gyy)
        ctx.lineTo(gx + 0.8, gyy + 0.8)
        ctx.lineTo(gx, gyy + r)
        ctx.lineTo(gx - 0.8, gyy + 0.8)
        ctx.lineTo(gx - r, gyy)
        ctx.lineTo(gx - 0.8, gyy - 0.8)
        ctx.closePath()
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    // glowing rim
    const rim = ctx.createLinearGradient(0, gy - 16, 0, gy)
    rim.addColorStop(0, mix(theme.groundAccent, theme.groundAccent, 0, 0))
    rim.addColorStop(1, mix(theme.groundAccent, theme.groundAccent, 0, 0.28))
    ctx.fillStyle = rim
    ctx.fillRect(0, gy - 16, w, 16)
    ctx.strokeStyle = theme.groundAccent
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(0, gy)
    ctx.lineTo(w, gy)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, gy + 1.5)
    ctx.lineTo(w, gy + 1.5)
    ctx.stroke()
    ctx.restore()
  }

  drawSnowfall(ctx: CanvasRenderingContext2D, theme: BgTheme) {
    const n = Math.min(this.flakes.length, Math.round((25 + 145 * theme.snow) * this.snowScale))
    ctx.save()
    ctx.fillStyle = SNOW_WHITE
    const slant = theme.snow > 0.8 ? 3 : 0
    for (const [alpha, lo, hi] of [
      [0.45, 0, 0.7],
      [0.85, 0.7, 1.01],
    ]) {
      ctx.globalAlpha = alpha
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const f = this.flakes[i]
        if (f.depth < lo || f.depth >= hi) continue
        if (slant) {
          // streaked flakes in a blizzard
          ctx.moveTo(f.x + slant * f.depth, f.y - 2 * f.depth)
          ctx.lineTo(f.x + f.r, f.y)
          ctx.lineTo(f.x - slant * f.depth, f.y + 2.5 * f.depth)
          ctx.lineTo(f.x - f.r, f.y)
          ctx.closePath()
        } else {
          ctx.moveTo(f.x + f.r, f.y)
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        }
      }
      ctx.fill()
    }
    ctx.restore()
  }
}

/** Frosted pine: tiered triangles, each tier wearing a scalloped cap of snow. */
function drawPine(ctx: CanvasRenderingContext2D, x: number, baseY: number, h: number, body: string, snow: string) {
  const tiers = h > 50 ? 4 : 3
  ctx.fillStyle = body
  ctx.fillRect(x - 2.5, baseY - h * 0.16, 5, h * 0.16)
  const halfW = h * 0.32
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers
    const bottom = baseY - h * 0.12 - t * h * 0.7
    const top = bottom - h * 0.42
    const hw = halfW * (1 - t * 0.55)
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.moveTo(x - hw, bottom)
    ctx.lineTo(x, top)
    ctx.lineTo(x + hw, bottom)
    ctx.quadraticCurveTo(x, bottom - 4, x - hw, bottom)
    ctx.fill()
    const sy = top + (bottom - top) * 0.5
    const sw = hw * 0.55
    ctx.fillStyle = snow
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x + sw, sy)
    ctx.quadraticCurveTo(x + sw * 0.6, sy + 3, x + sw * 0.3, sy - 1)
    ctx.quadraticCurveTo(x, sy + 4, x - sw * 0.35, sy)
    ctx.quadraticCurveTo(x - sw * 0.7, sy + 3, x - sw, sy)
    ctx.closePath()
    ctx.fill()
    // snow lip along the tier's lower edge
    ctx.strokeStyle = snow
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(x - hw * 0.85, bottom - 1)
    ctx.quadraticCurveTo(x - hw * 0.4, bottom - 4, x - hw * 0.1, bottom - 3)
    ctx.stroke()
  }
}

function drawIgloo(ctx: CanvasRenderingContext2D, x: number, gy: number) {
  const r = 26
  const dome = ctx.createLinearGradient(x - r, gy - r, x + r, gy)
  dome.addColorStop(0, '#f8fbff')
  dome.addColorStop(1, '#9db4d6')
  // warm light spilling onto the snow
  const spill = ctx.createRadialGradient(x + r * 0.9, gy - 4, 2, x + r * 0.9, gy - 4, 40)
  spill.addColorStop(0, 'rgba(253, 186, 116, 0.45)')
  spill.addColorStop(1, 'rgba(253, 186, 116, 0)')
  ctx.fillStyle = spill
  ctx.fillRect(x + r * 0.9 - 40, gy - 44, 80, 48)
  ctx.fillStyle = dome
  ctx.beginPath()
  ctx.arc(x, gy, r, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  // block seams
  ctx.strokeStyle = 'rgba(100, 130, 175, 0.45)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (const rr of [0.4, 0.7]) {
    const yy = gy - r * rr
    const half = Math.sqrt(r * r - (r * rr) ** 2)
    ctx.moveTo(x - half, yy)
    ctx.lineTo(x + half, yy)
  }
  for (const [sx, y0, y1] of [
    [-12, 0, 0.4],
    [6, 0, 0.4],
    [-3, 0.4, 0.7],
    [13, 0.4, 0.7],
  ]) {
    ctx.moveTo(x + sx, gy - r * y0)
    ctx.lineTo(x + sx, gy - r * y1)
  }
  ctx.stroke()
  // entrance tunnel + glowing doorway
  ctx.fillStyle = '#dce8f7'
  ctx.beginPath()
  ctx.arc(x + r * 0.78, gy, 12, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  const door = ctx.createRadialGradient(x + r * 0.85, gy - 3, 1, x + r * 0.85, gy - 3, 10)
  door.addColorStop(0, '#fff7d6')
  door.addColorStop(0.5, '#fbbf24')
  door.addColorStop(1, '#c2410c')
  ctx.fillStyle = door
  ctx.beginPath()
  ctx.arc(x + r * 0.85, gy, 7.5, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, gy: number) {
  const glow = ctx.createRadialGradient(x + 6, gy - 50, 1, x + 6, gy - 50, 26)
  glow.addColorStop(0, 'rgba(253, 224, 140, 0.55)')
  glow.addColorStop(1, 'rgba(253, 224, 140, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(x - 22, gy - 78, 56, 56)
  ctx.fillStyle = '#3b2a20'
  ctx.fillRect(x - 1.5, gy - 58, 3, 58)
  ctx.fillRect(x - 1.5, gy - 58, 10, 2.5)
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(x + 2, gy - 55, 8, 2)
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.roundRect(x + 2.5, gy - 53, 7, 9, 2)
  ctx.fill()
  ctx.fillStyle = '#eef6ff'
  ctx.beginPath()
  ctx.ellipse(x, gy - 58.5, 4.5, 1.8, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawSignpost(ctx: CanvasRenderingContext2D, x: number, gy: number) {
  ctx.fillStyle = '#4a3426'
  ctx.fillRect(x - 2, gy - 46, 4, 46)
  ctx.fillStyle = '#7c5a3f'
  ctx.beginPath()
  ctx.moveTo(x - 4, gy - 44)
  ctx.lineTo(x + 18, gy - 44)
  ctx.lineTo(x + 23, gy - 39.5)
  ctx.lineTo(x + 18, gy - 35)
  ctx.lineTo(x - 4, gy - 35)
  ctx.closePath()
  ctx.moveTo(x + 4, gy - 31)
  ctx.lineTo(x - 16, gy - 31)
  ctx.lineTo(x - 21, gy - 26.5)
  ctx.lineTo(x - 16, gy - 22)
  ctx.lineTo(x + 4, gy - 22)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#eef6ff'
  ctx.fillRect(x - 4, gy - 46, 22, 2.5)
  ctx.fillRect(x - 16, gy - 33, 20, 2.2)
  ctx.beginPath()
  ctx.ellipse(x, gy - 47, 3.5, 1.8, 0, 0, Math.PI * 2)
  ctx.fill()
}
