import type { BgTheme } from '../data'

interface Star {
  x: number
  y: number
  size: number
  baseAlpha: number
  twinkleSpeed: number
  twinkleOffset: number
}

interface Firefly {
  x: number
  y: number
  size: number
  driftX: number
  hoverFreq: number
  hoverAmp: number
  hoverOffset: number
  pulseSpeed: number
  pulseOffset: number
  wingFreq: number
  maxAlpha: number
  colorType: 'lime' | 'gold'
}

interface Pebble {
  relX: number
  depth: number
  width: number
  height: number
  shade: string
}

interface CirrusCloud {
  x: number
  y: number
  width: number
  height: number
  speed: number
  alpha: number
}

interface Puff {
  rx: number
  ry: number
  r: number
}

interface VolumetricCloud extends CirrusCloud {
  puffs: Puff[]
}

const isCompact = (w: number, h: number) => w < 768 || h < 520
const cloudBand = (compact: boolean, groundY: number) => Math.min(compact ? 55 : 120, groundY * (compact ? 0.22 : 0.35))

/** Parallax scenery: sky, nebula, stars, clouds, moon, skyline, forest, village, fireflies and ground. */
export class Background {
  offsetLayer1 = 0
  offsetLayer2 = 0
  offsetLayer3 = 0
  offsetGround = 0
  fogOffset = 0
  stars: Star[] = []
  fireflies: Firefly[] = []
  groundPebbles: Pebble[] = []
  cirrusClouds: CirrusCloud[] = []
  volumetricClouds: VolumetricCloud[] = []

  constructor(
    public width: number,
    public height: number,
    public groundY: number,
  ) {
    for (let i = 0; i < 85; i++)
      this.stars.push({
        x: Math.random() * width,
        y: groundY * 0.72 * Math.random(),
        size: Math.random() < 0.15 ? 2.3 : Math.random() < 0.5 ? 1.4 : 0.8,
        baseAlpha: 0.3 + Math.random() * 0.65,
        twinkleSpeed: 1.5 + Math.random() * 3,
        twinkleOffset: Math.random() * Math.PI * 2,
      })
    this.initClouds(width, height, groundY)
    for (let i = 0; i < 18; i++)
      this.fireflies.push({
        x: Math.random() * width,
        y: 60 + Math.random() * (groundY - 70),
        size: 1.2 + Math.random() * 1.5,
        driftX: 0.2 + Math.random() * 0.45,
        hoverFreq: 1.2 + Math.random() * 2.5,
        hoverAmp: 0.6 + Math.random() * 1.2,
        hoverOffset: Math.random() * Math.PI * 2,
        pulseSpeed: 2 + Math.random() * 3,
        pulseOffset: Math.random() * Math.PI * 2,
        wingFreq: 22 + Math.random() * 12,
        maxAlpha: 0.6 + Math.random() * 0.4,
        colorType: Math.random() < 0.7 ? 'lime' : 'gold',
      })
    for (let i = 0; i < 35; i++)
      this.groundPebbles.push({
        relX: Math.random() * 600,
        depth: 8 + Math.random() * 70,
        width: 6 + Math.random() * 16,
        height: 3 + Math.random() * 7,
        shade: Math.random() < 0.5 ? '#151128' : '#0d0a1b',
      })
  }

  initClouds(width: number, height: number, groundY: number) {
    const compact = isCompact(width, height)
    const band = cloudBand(compact, groundY)
    const cirrusCount = compact ? 2 : 4
    this.cirrusClouds = []
    const cirrusStep = width / cirrusCount
    for (let i = 0; i < cirrusCount; i++)
      this.cirrusClouds.push({
        x: cirrusStep * i + cirrusStep * 0.4 * Math.random(),
        y: 8 + band * 0.6 * Math.random(),
        width: compact ? 110 + Math.random() * 70 : 190 + Math.random() * 220,
        height: compact ? 16 + Math.random() * 12 : 25 + Math.random() * 32,
        speed: 0.08 + Math.random() * 0.1,
        alpha: compact ? 0.12 + Math.random() * 0.1 : 0.14 + Math.random() * 0.16,
      })
    const volCount = compact ? 3 : 5
    this.volumetricClouds = []
    const volStep = width / volCount
    for (let i = 0; i < volCount; i++)
      this.volumetricClouds.push({
        x: volStep * i + (Math.random() * 30 - 15),
        y: 12 + Math.random() * band,
        width: compact ? 120 + Math.random() * 60 : 180 + Math.random() * 130,
        height: compact ? 30 + Math.random() * 14 : 50 + Math.random() * 34,
        speed: 0.16 + Math.random() * 0.2,
        alpha: compact ? 0.22 + Math.random() * 0.16 : 0.28 + Math.random() * 0.22,
        puffs: [
          { rx: -0.38, ry: 0.12, r: 0.32 },
          { rx: -0.18, ry: -0.18, r: 0.44 },
          { rx: 0.08, ry: -0.25, r: 0.52 },
          { rx: 0.32, ry: -0.06, r: 0.38 },
          { rx: 0.46, ry: 0.14, r: 0.28 },
          { rx: -0.02, ry: 0.18, r: 0.34 },
        ],
      })
  }

  resize(width: number, height: number, groundY: number) {
    this.width = width
    this.height = height
    this.groundY = groundY
    for (const s of this.stars) {
      if (s.x > width) s.x = Math.random() * width
      if (s.y > groundY * 0.72) s.y = groundY * 0.72 * Math.random()
    }
    const compact = isCompact(width, height)
    const band = cloudBand(compact, groundY)
    const volCount = compact ? 3 : 5
    if (this.volumetricClouds.length > volCount) this.volumetricClouds = this.volumetricClouds.slice(0, volCount)
    else if (this.volumetricClouds.length < volCount) {
      this.initClouds(width, height, groundY)
      return
    }
    const volStep = width / Math.max(1, this.volumetricClouds.length)
    this.volumetricClouds.forEach((c, i) => {
      c.y = Math.min(c.y, band)
      c.width = compact ? Math.min(c.width, 180) : c.width
      c.height = compact ? Math.min(c.height, 42) : c.height
      if (c.x > width + 160) c.x = volStep * i
    })
    const cirrusCount = compact ? 2 : 4
    if (this.cirrusClouds.length > cirrusCount) this.cirrusClouds = this.cirrusClouds.slice(0, cirrusCount)
    this.cirrusClouds.forEach((c) => {
      c.y = Math.min(c.y, band * 0.65)
      if (compact && c.width > 180) c.width = 140
      if (compact && c.height > 24) c.height = 18
      if (c.x > width + 140) c.x = Math.random() * width
    })
    for (const f of this.fireflies) {
      if (f.x > width) f.x = Math.random() * width
      if (f.y > groundY - 40) f.y = 50 + Math.random() * Math.max(30, groundY - 80)
    }
  }

  update(speed: number) {
    this.offsetLayer1 = (this.offsetLayer1 + speed * 0.1) % this.width
    this.offsetLayer2 = (this.offsetLayer2 + speed * 0.24) % this.width
    this.offsetLayer3 = (this.offsetLayer3 + speed * 0.48) % this.width
    this.offsetGround = (this.offsetGround + speed) % 600
    this.fogOffset = (this.fogOffset + speed * 0.7) % this.width
    const band = cloudBand(isCompact(this.width, this.height), this.groundY)
    for (const c of this.cirrusClouds) {
      c.x -= c.speed + speed * 0.05
      if (c.x + c.width < -120) {
        c.x = this.width + 100 + Math.random() * 100
        c.y = 8 + band * 0.6 * Math.random()
      }
    }
    for (const c of this.volumetricClouds) {
      c.x -= c.speed + speed * 0.12
      if (c.x + c.width < -140) {
        c.x = this.width + 120 + Math.random() * 120
        c.y = 12 + Math.random() * band
      }
    }
    const now = Date.now() / 1000
    for (const f of this.fireflies) {
      f.x -= f.driftX + speed * 0.15
      f.y += Math.sin(now * f.hoverFreq + f.hoverOffset) * 0.5
      if (f.x < -15) {
        f.x = this.width + 15 + Math.random() * 40
        f.y = 50 + Math.random() * (this.groundY - 60)
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, theme: BgTheme) {
    const w = this.width
    const h = this.height
    const gy = this.groundY
    const sky = ctx.createLinearGradient(0, 0, 0, gy)
    sky.addColorStop(0, '#020108')
    sky.addColorStop(0.28, theme.skyGradient[0])
    sky.addColorStop(0.62, theme.skyGradient[1])
    sky.addColorStop(0.88, theme.skyGradient[2])
    sky.addColorStop(1, '#221538')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)
    this.drawCosmicNebula(ctx, w, gy)
    const now = Date.now() / 1000
    ctx.save()
    for (const s of this.stars) {
      const tw = Math.sin(now * s.twinkleSpeed + s.twinkleOffset)
      const alpha = Math.max(0.12, Math.min(1, s.baseAlpha + tw * 0.35))
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#ffffff'
      if (s.size > 1.8) {
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size + 1.2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(196, 181, 253, 0.4)'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.75})`
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(s.x - 5, s.y)
        ctx.lineTo(s.x + 5, s.y)
        ctx.moveTo(s.x, s.y - 5)
        ctx.lineTo(s.x, s.y + 5)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
    this.drawCirrusClouds(ctx)
    this.drawMasterpieceMoon(ctx, w, h, gy, theme)
    this.drawVolumetricClouds(ctx)
    ctx.save()
    ctx.fillStyle = theme.mountainColor
    this.drawSkyline(ctx, this.offsetLayer1, gy - 75, 115, 0.42)
    ctx.restore()
    this.drawFarForest(ctx, this.offsetLayer2, gy - 20, theme.mountainColor)
    this.drawHomesAndTrees(ctx, this.offsetLayer3, gy, theme)
    this.drawFireflies(ctx)
    this.drawRealisticLand(ctx, w, h, gy, theme)
  }

  drawCosmicNebula(ctx: CanvasRenderingContext2D, w: number, gy: number) {
    ctx.save()
    const violet = ctx.createRadialGradient(w * 0.35, gy * 0.25, 20, w * 0.35, gy * 0.25, w * 0.45)
    violet.addColorStop(0, 'rgba(147, 51, 234, 0.08)')
    violet.addColorStop(0.5, 'rgba(126, 34, 206, 0.04)')
    violet.addColorStop(1, 'transparent')
    ctx.fillStyle = violet
    ctx.fillRect(0, 0, w, gy)
    const cyan = ctx.createRadialGradient(w * 0.72, gy * 0.18, 15, w * 0.72, gy * 0.18, w * 0.38)
    cyan.addColorStop(0, 'rgba(6, 182, 212, 0.06)')
    cyan.addColorStop(0.6, 'rgba(14, 116, 144, 0.03)')
    cyan.addColorStop(1, 'transparent')
    ctx.fillStyle = cyan
    ctx.fillRect(0, 0, w, gy)
    ctx.restore()
  }

  drawCirrusClouds(ctx: CanvasRenderingContext2D) {
    ctx.save()
    for (const c of this.cirrusClouds) {
      const g = ctx.createLinearGradient(c.x, c.y, c.x + c.width, c.y)
      g.addColorStop(0, 'transparent')
      g.addColorStop(0.25, `rgba(186, 195, 235, ${c.alpha * 0.9})`)
      g.addColorStop(0.5, `rgba(215, 225, 255, ${c.alpha * 1.35})`)
      g.addColorStop(0.75, `rgba(175, 185, 230, ${c.alpha * 0.9})`)
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(c.x + c.width * 0.5, c.y + c.height * 0.5, c.width * 0.5, c.height * 0.5, -0.06, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgba(240, 245, 255, ${c.alpha * 0.45})`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(c.x + c.width * 0.2, c.y + c.height * 0.4)
      ctx.quadraticCurveTo(c.x + c.width * 0.5, c.y + c.height * 0.2, c.x + c.width * 0.8, c.y + c.height * 0.6)
      ctx.stroke()
    }
    ctx.restore()
  }

  drawVolumetricClouds(ctx: CanvasRenderingContext2D) {
    ctx.save()
    for (const c of this.volumetricClouds) {
      const cx = c.x + c.width * 0.5
      const cy = c.y + c.height * 0.5
      // dark underside shadow
      ctx.fillStyle = 'rgba(8, 6, 18, 0.72)'
      ctx.beginPath()
      for (const p of c.puffs) ctx.arc(cx + p.rx * c.width, cy + p.ry * c.height + 6, p.r * c.height * 1.18, 0, Math.PI * 2)
      ctx.fill()
      const body = ctx.createRadialGradient(cx, cy - 10, c.height * 0.2, cx, cy + 2, c.width * 0.52)
      body.addColorStop(0, `rgba(75, 68, 110, ${c.alpha * 1.25})`)
      body.addColorStop(0.55, `rgba(32, 25, 56, ${c.alpha * 1.05})`)
      body.addColorStop(1, 'transparent')
      ctx.fillStyle = body
      ctx.beginPath()
      for (const p of c.puffs) ctx.arc(cx + p.rx * c.width, cy + p.ry * c.height, p.r * c.height, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgba(255, 255, 255, ${c.alpha * 0.88})`
      ctx.lineWidth = 2.2
      for (const p of c.puffs) {
        ctx.beginPath()
        ctx.arc(cx + p.rx * c.width, cy + p.ry * c.height, p.r * c.height, Math.PI * 1.1, Math.PI * 1.9)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  drawMasterpieceMoon(ctx: CanvasRenderingContext2D, w: number, h: number, gy: number, theme: BgTheme) {
    const mx = Math.min(w * 0.78, w - 85)
    const my = Math.max(70, Math.min(h * 0.22, 160))
    const r = Math.max(38, Math.min(68, Math.floor(w * 0.11)))
    ctx.save()
    const halo = ctx.createRadialGradient(mx, my, r * 0.8, mx, my, r * 3.5)
    halo.addColorStop(0, theme.moonGlow)
    halo.addColorStop(0.45, 'rgba(168, 85, 247, 0.08)')
    halo.addColorStop(1, 'transparent')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(mx, my, r * 3.5, 0, Math.PI * 2)
    ctx.fill()
    const rim = ctx.createRadialGradient(mx, my, r * 0.95, mx, my, r * 1.35)
    rim.addColorStop(0, 'rgba(255, 255, 255, 0.38)')
    rim.addColorStop(0.5, 'rgba(196, 181, 253, 0.25)')
    rim.addColorStop(0.85, theme.moonGlow)
    rim.addColorStop(1, 'transparent')
    ctx.fillStyle = rim
    ctx.beginPath()
    ctx.arc(mx, my, r * 1.35, 0, Math.PI * 2)
    ctx.fill()
    const beam = ctx.createLinearGradient(mx, my, mx - 120, gy)
    beam.addColorStop(0, theme.moonGlow)
    beam.addColorStop(1, 'transparent')
    ctx.fillStyle = beam
    ctx.beginPath()
    ctx.moveTo(mx - r * 0.65, my)
    ctx.lineTo(mx - 260, gy)
    ctx.lineTo(mx + 110, gy)
    ctx.lineTo(mx + r * 0.65, my)
    ctx.closePath()
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.arc(mx, my, r, 0, Math.PI * 2)
    ctx.clip()
    const disc = ctx.createRadialGradient(mx - r * 0.3, my - r * 0.3, r * 0.08, mx + r * 0.15, my + r * 0.15, r * 1.08)
    disc.addColorStop(0, '#ffffff')
    disc.addColorStop(0.3, theme.moonColor)
    disc.addColorStop(0.72, '#c4b5fd')
    disc.addColorStop(1, '#334155')
    ctx.fillStyle = disc
    ctx.fillRect(mx - r, my - r, r * 2, r * 2)
    ctx.fillStyle = 'rgba(28, 24, 42, 0.42)'
    ctx.beginPath()
    ctx.ellipse(mx - r * 0.28, my - r * 0.18, r * 0.44, r * 0.34, -0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(mx + r * 0.24, my - r * 0.1, r * 0.34, r * 0.28, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(24, 18, 38, 0.48)'
    ctx.beginPath()
    ctx.ellipse(mx + r * 0.54, my - r * 0.15, r * 0.17, r * 0.14, 0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(28, 22, 44, 0.38)'
    ctx.beginPath()
    ctx.ellipse(mx - r * 0.15, my + r * 0.32, r * 0.32, r * 0.25, -0.3, 0, Math.PI * 2)
    ctx.fill()
    // ray crater (Tycho-like) with bright streaks
    const rayX = mx + r * 0.05
    const rayY = my + r * 0.54
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)'
    ctx.lineWidth = 1.2
    for (const angle of [-2.45, -2.15, -1.85, -1.55, -1.25, -0.85, -0.45, 0.08, 0.55]) {
      const len = r * (0.65 + Math.sin(angle * 4) * 0.25)
      ctx.beginPath()
      ctx.moveTo(rayX, rayY)
      ctx.lineTo(rayX + Math.cos(angle) * len, rayY + Math.sin(angle) * len)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(18, 14, 28, 0.75)'
    ctx.beginPath()
    ctx.arc(rayX, rayY, r * 0.075, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(rayX - 1, rayY - 1, r * 0.038, 0, Math.PI * 2)
    ctx.fill()
    const craters = [
      { x: mx - r * 0.42, y: my - r * 0.32, r: r * 0.09 },
      { x: mx - r * 0.08, y: my - r * 0.45, r: r * 0.075 },
      { x: mx + r * 0.34, y: my + r * 0.22, r: r * 0.08 },
      { x: mx - r * 0.48, y: my + r * 0.15, r: r * 0.065 },
      { x: mx + r * 0.12, y: my - r * 0.38, r: r * 0.06 },
    ]
    for (const c of craters) {
      ctx.fillStyle = 'rgba(14, 10, 24, 0.72)'
      ctx.beginPath()
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(c.x - 0.8, c.y - 0.8, c.r * 0.85, Math.PI * 0.75, Math.PI * 1.75)
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(c.x, c.y, c.r * 0.2, 0, Math.PI * 2)
      ctx.fill()
    }
    const limb = ctx.createRadialGradient(mx, my, r * 0.8, mx, my, r)
    limb.addColorStop(0, 'transparent')
    limb.addColorStop(0.85, 'rgba(0, 0, 0, 0.22)')
    limb.addColorStop(1, 'rgba(0, 0, 0, 0.6)')
    ctx.fillStyle = limb
    ctx.beginPath()
    ctx.arc(mx, my, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(mx, my, r, Math.PI * 0.85, Math.PI * 1.65)
    ctx.stroke()
    ctx.restore()
  }

  drawFireflies(ctx: CanvasRenderingContext2D) {
    const now = Date.now() / 1000
    ctx.save()
    for (const f of this.fireflies) {
      const pulse = ((Math.sin(now * f.pulseSpeed + f.pulseOffset) + 1) / 2) ** 2.5
      const alpha = Math.max(0.15, pulse * f.maxAlpha)
      const glow = f.colorType === 'lime' ? '#bef264' : '#fef08a'
      ctx.save()
      ctx.translate(f.x, f.y)
      const flap = Math.sin(now * f.wingFreq)
      ctx.fillStyle = `rgba(220, 240, 255, ${alpha * 0.45})`
      ctx.beginPath()
      ctx.ellipse(-0.5, -2, 2.2, 0.9, flap * 0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(-0.5, 2, 2.2, 0.9, -flap * 0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1f2421'
      ctx.beginPath()
      ctx.ellipse(0.6, 0, 1.2, 0.8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(-0.8, 0, f.size * 1.8, 0, Math.PI * 2)
      ctx.globalAlpha = alpha * 0.35
      ctx.fill()
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(-0.8, 0, f.size * 0.85, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  }

  drawRealisticLand(ctx: CanvasRenderingContext2D, w: number, h: number, gy: number, theme: BgTheme) {
    ctx.save()
    const soil = ctx.createLinearGradient(0, gy, 0, h)
    soil.addColorStop(0, theme.groundColor)
    soil.addColorStop(0.25, '#0b0818')
    soil.addColorStop(0.65, '#070512')
    soil.addColorStop(1, '#030208')
    ctx.fillStyle = soil
    ctx.fillRect(0, gy, w, h - gy)
    for (const p of this.groundPebbles) {
      const px = (((p.relX - this.offsetGround) % w) + w) % w
      const py = gy + p.depth
      ctx.fillStyle = p.shade
      ctx.beginPath()
      ctx.roundRect(px, py, p.width, p.height, 2.5)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px + p.width, py)
      ctx.stroke()
    }
    ctx.strokeStyle = theme.gridColor
    ctx.lineWidth = 1.2
    for (let x = -this.offsetGround; x < w; x += 70) {
      ctx.beginPath()
      ctx.moveTo(x, gy + 4)
      ctx.quadraticCurveTo(x - 8, gy + 28, x - 14, gy + 55)
      ctx.quadraticCurveTo(x - 20, gy + 75, x - 16, h)
      ctx.stroke()
    }
    for (const ly of [gy + 16, gy + 38, gy + 72]) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, ly)
      ctx.lineTo(w, ly)
      ctx.stroke()
    }
    ctx.strokeStyle = theme.groundAccent
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(0, gy)
    ctx.lineTo(w, gy)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(240, 245, 255, 0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, gy - 0.5)
    ctx.lineTo(w, gy - 0.5)
    ctx.stroke()
    const horizonGlow = ctx.createLinearGradient(0, gy - 24, 0, gy + 10)
    horizonGlow.addColorStop(0, 'transparent')
    horizonGlow.addColorStop(0.65, theme.moonGlow)
    horizonGlow.addColorStop(1, 'transparent')
    ctx.fillStyle = horizonGlow
    ctx.globalAlpha = 0.38
    ctx.fillRect(0, gy - 24, w, 34)
    ctx.globalAlpha = 1
    // swaying grass blades
    const sway = Date.now() / 420
    ctx.strokeStyle = '#1a1330'
    ctx.lineWidth = 1.8
    for (let x = 0; x < w; x += 12) {
      const bend = Math.sin(sway + x * 0.12) * 4.5
      const bladeH = 7 + Math.abs(Math.sin(x * 0.22)) * 9
      ctx.beginPath()
      ctx.moveTo(x, gy)
      ctx.quadraticCurveTo(x + bend * 0.5, gy - bladeH * 0.6, x + bend, gy - bladeH)
      ctx.stroke()
      if (x % 48 === 0) {
        ctx.fillStyle = theme.groundAccent
        ctx.beginPath()
        ctx.arc(x + bend, gy - bladeH - 1, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  drawSkyline(ctx: CanvasRenderingContext2D, offset: number, baseY: number, maxHeight: number, alpha: number) {
    ctx.globalAlpha = alpha
    const count = Math.ceil(this.width / 90) + 3
    ctx.beginPath()
    ctx.moveTo(-offset, this.height)
    for (let i = -1; i < count; i++) {
      const x = i * 90 - offset
      const peak = ((Math.sin(i * 1.8) + 1.2) / 2.2) * maxHeight
      ctx.lineTo(x, baseY - peak)
      ctx.lineTo(x + 45, baseY - peak * 0.6)
      ctx.lineTo(x + 90, baseY - peak * 1.1)
    }
    ctx.lineTo(this.width + 100, this.height)
    ctx.closePath()
    ctx.fill()
  }

  drawFarForest(ctx: CanvasRenderingContext2D, offset: number, baseY: number, color: string) {
    ctx.save()
    ctx.fillStyle = color
    ctx.globalAlpha = 0.55
    const count = Math.ceil(this.width / 45) + 3
    ctx.beginPath()
    ctx.moveTo(-offset, this.height)
    for (let i = -1; i < count; i++) {
      const x = i * 45 - offset
      const treeH = 35 + ((Math.sin(i * 2.7) + 1) / 2) * 45
      ctx.lineTo(x, baseY)
      ctx.lineTo(x + 22.5, baseY - treeH)
      ctx.lineTo(x + 45, baseY)
    }
    ctx.lineTo(this.width + 100, this.height)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  drawHomesAndTrees(ctx: CanvasRenderingContext2D, offset: number, gy: number, theme: BgTheme) {
    const count = Math.ceil(this.width / 320) + 3
    for (let i = -1; i < count; i++) {
      const x = i * 320 - offset
      if (i % 2 === 0) this.drawCottage(ctx, x + 40, gy)
      else this.drawPagoda(ctx, x + 60, gy)
      this.drawRealisticPineTree(ctx, x + 190, gy, 75, theme)
      this.drawBroadleafTree(ctx, x + 280, gy, 65)
    }
  }

  drawCottage(ctx: CanvasRenderingContext2D, x: number, gy: number) {
    ctx.save()
    const top = gy - 42
    ctx.fillStyle = '#0e0b1c'
    ctx.fillRect(x, top + 14, 55, 28)
    ctx.strokeStyle = '#1d1734'
    ctx.lineWidth = 1.5
    ctx.strokeRect(x, top + 14, 55, 28)
    ctx.fillStyle = '#090714'
    ctx.beginPath()
    ctx.moveTo(x - 10, top + 16)
    ctx.quadraticCurveTo(x + 27.5, top - 4, x + 55 + 10, top + 16)
    ctx.lineTo(x + 55 + 4, top + 10)
    ctx.quadraticCurveTo(x + 27.5, top - 8, x - 4, top + 10)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#141026'
    ctx.fillRect(x + 55 - 14, top - 2, 7, 16)
    ctx.fillRect(x + 55 - 16, top - 4, 11, 3)
    ctx.save()
    const winX = x + 12
    const winY = top + 20
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(winX, winY, 18, 14)
    ctx.strokeStyle = '#3b2310'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(winX + 9, winY)
    ctx.lineTo(winX + 9, winY + 14)
    ctx.moveTo(winX, winY + 7)
    ctx.lineTo(winX + 18, winY + 7)
    ctx.stroke()
    ctx.restore()
    ctx.save()
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(x + 38, top + 22, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.restore()
  }

  drawPagoda(ctx: CanvasRenderingContext2D, x: number, gy: number) {
    ctx.save()
    ctx.fillStyle = '#0b0817'
    ctx.fillRect(x + 12, gy - 65, 24, 65)
    ctx.fillStyle = '#070510'
    ctx.beginPath()
    ctx.moveTo(x, gy - 24)
    ctx.quadraticCurveTo(x + 24, gy - 32, x + 48, gy - 24)
    ctx.lineTo(x + 44, gy - 28)
    ctx.quadraticCurveTo(x + 24, gy - 36, x + 4, gy - 28)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x + 4, gy - 46)
    ctx.quadraticCurveTo(x + 24, gy - 54, x + 44, gy - 46)
    ctx.lineTo(x + 40, gy - 50)
    ctx.quadraticCurveTo(x + 24, gy - 58, x + 8, gy - 50)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x + 8, gy - 66)
    ctx.quadraticCurveTo(x + 24, gy - 74, x + 40, gy - 66)
    ctx.lineTo(x + 24, gy - 84)
    ctx.closePath()
    ctx.fill()
    ctx.save()
    ctx.fillStyle = '#00f5ff'
    ctx.fillRect(x + 20, gy - 42, 8, 8)
    ctx.restore()
    ctx.restore()
  }

  drawRealisticPineTree(ctx: CanvasRenderingContext2D, x: number, gy: number, treeH: number, theme: BgTheme) {
    ctx.save()
    ctx.fillStyle = '#080612'
    ctx.beginPath()
    ctx.moveTo(x - 6, gy)
    ctx.quadraticCurveTo(x - 2, gy - treeH * 0.5, x + 4, gy - treeH)
    ctx.lineTo(x + 8, gy - treeH)
    ctx.quadraticCurveTo(x + 4, gy - treeH * 0.5, x + 6, gy)
    ctx.closePath()
    ctx.fill()
    const boughs = [
      { rx: -16, ry: -treeH * 0.45, w: 28, h: 10 },
      { rx: 14, ry: -treeH * 0.62, w: 32, h: 11 },
      { rx: -12, ry: -treeH * 0.78, w: 26, h: 9 },
      { rx: 4, ry: -treeH * 0.98, w: 22, h: 8 },
    ]
    ctx.fillStyle = '#0d0a1d'
    ctx.strokeStyle = theme.groundAccent
    ctx.lineWidth = 1
    for (const b of boughs) {
      const bx = x + b.rx
      const by = gy + b.ry
      ctx.beginPath()
      ctx.ellipse(bx, by, b.w, b.h, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      for (let nx = bx - b.w * 0.8; nx <= bx + b.w * 0.8; nx += 4) {
        ctx.moveTo(nx, by - b.h * 0.6)
        ctx.lineTo(nx + 1.5, by - b.h * 0.9)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  drawBroadleafTree(ctx: CanvasRenderingContext2D, x: number, gy: number, treeH: number) {
    ctx.save()
    ctx.fillStyle = '#090714'
    ctx.beginPath()
    ctx.moveTo(x - 5, gy)
    ctx.lineTo(x - 2, gy - treeH * 0.6)
    ctx.lineTo(x + 2, gy - treeH * 0.6)
    ctx.lineTo(x + 5, gy)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#0f0c22'
    const crowns = [
      { ox: 0, oy: -treeH * 0.75, r: 22 },
      { ox: -14, oy: -treeH * 0.65, r: 16 },
      { ox: 14, oy: -treeH * 0.62, r: 17 },
      { ox: -6, oy: -treeH * 0.88, r: 15 },
      { ox: 8, oy: -treeH * 0.85, r: 14 },
    ]
    for (const c of crowns) {
      ctx.beginPath()
      ctx.arc(x + c.ox, gy + c.oy, c.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(x, gy - treeH * 0.82, 20, Math.PI * 1.1, Math.PI * 1.85)
    ctx.stroke()
    ctx.restore()
  }
}
