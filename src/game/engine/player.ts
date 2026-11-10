import { audio } from '../audio'
import { POWERUPS, SKINS, type Skin } from '../data'
import { mix } from './background'
import type { Hitbox } from './collisions'
import type { ParticleSystem } from './particles'

interface Point {
  x: number
  y: number
}

interface GhostTrail extends Point {
  scaleX: number
  scaleY: number
  alpha: number
  color: string
}

export interface PlayerPowerups {
  shield?: boolean
  magnet?: boolean
  speedBoost?: boolean
}

/** orb body radius; the box is 50 wide so the glow fits around a ~44px sphere */
const R = 22
/** the slide disc is the same sphere squashed to these factors */
const DISC_X = 1.14
const DISC_Y = 0.5
const WHITE = '#ffffff'
const INK = '#0f172a'

export class Player {
  width = 50
  height = 50
  normalHeight = 50
  slideHeight = 30
  x: number
  y: number
  vy = 0
  gravity = 0.82
  jumpForce = -14.6
  doubleJumpForce = -13
  isGrounded = true
  canDoubleJump = true
  jumpCount = 0
  isSliding = false
  slideTimer = 0
  slideMaxDuration = 0.58
  scaleX = 1
  scaleY = 1
  isFlipping = false
  flipAngle = 0
  /** swirl rotation: advances with travel so the orb visibly rolls */
  rollAngle = 0
  idleTimer = 0
  animTimer = 0
  ghostTrails: GhostTrail[] = []
  trail: Point[] = []
  skinId = 'frost'
  skin: Skin = SKINS[0]
  totalDoubleJumps = 0
  invulnerableTimer = 0

  constructor(
    public canvasWidth: number,
    public canvasHeight: number,
    public groundY: number,
  ) {
    this.x = Math.max(50, Math.min(130, Math.floor(canvasWidth * 0.16)))
    this.y = groundY - this.height
  }

  setSkin(id: string) {
    this.skinId = id
    const skin = SKINS.find((s) => s.id === id)
    if (skin) this.skin = skin
  }

  /** centre of the drawn orb (or disc while sliding); it rests on the ground */
  get centerY() {
    return this.y + this.height - (this.isSliding ? 12 : R + 2)
  }

  jump(particles?: ParticleSystem | null): boolean {
    if (this.isGrounded) {
      this.vy = this.jumpForce
      this.isGrounded = false
      this.jumpCount = 1
      this.canDoubleJump = true
      this.isSliding = false
      this.height = this.normalHeight
      this.isFlipping = false
      this.flipAngle = 0
      this.scaleX = 0.8
      this.scaleY = 1.24
      audio.playJump()
      particles?.addJumpBurst(this.x + this.width / 2, this.y + this.height, this.skin.accent)
      return true
    }
    if (this.canDoubleJump && this.jumpCount === 1) {
      this.vy = this.doubleJumpForce
      this.jumpCount = 2
      this.canDoubleJump = false
      this.totalDoubleJumps++
      this.isFlipping = true
      this.flipAngle = 0
      this.scaleX = 1.15
      this.scaleY = 1.15
      audio.playDoubleJump()
      particles?.addDoubleJumpEffect(this.x + this.width / 2, this.y + this.height / 2, this.skin.accent)
      return true
    }
    return false
  }

  slide() {
    if (this.isGrounded) {
      if (!this.isSliding) {
        this.isSliding = true
        this.slideTimer = this.slideMaxDuration
        this.height = this.slideHeight
        this.y = this.groundY - this.height
        this.scaleX = 1.3
        this.scaleY = 0.7
      }
    } else {
      // fast-fall when sliding mid-air
      this.vy = 18
      this.scaleX = 0.78
      this.scaleY = 1.32
    }
  }

  stopSlide() {
    if (!this.isSliding) return
    this.isSliding = false
    this.height = this.normalHeight
    this.y = this.groundY - this.height
    this.scaleX = 0.92
    this.scaleY = 1.08
  }

  update(dt: number, groundY: number, particles: ParticleSystem | null, powerups: PlayerPowerups = {}, speed = 6) {
    this.groundY = groundY
    this.idleTimer += dt
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt
    if (this.isFlipping) {
      this.flipAngle += dt * 14.5
      if (this.flipAngle >= Math.PI * 2) {
        this.flipAngle = 0
        this.isFlipping = false
      }
    }
    this.rollAngle += dt * (1.5 + speed * 0.75) * (this.isSliding ? 1.6 : 1)
    const accent = this.skin.accent
    if (this.isSliding) {
      this.slideTimer -= dt
      if (this.slideTimer <= 0) this.stopSlide()
      if (particles && Math.random() < 0.75) {
        particles.addFootstepDust(this.x + this.width + 2, this.groundY, Math.random() < 0.5 ? WHITE : accent)
        particles.addFootstepDust(this.x + this.width - 6, this.groundY - 4, accent)
      }
    }
    this.scaleX += (1 - this.scaleX) * 14 * dt
    this.scaleY += (1 - this.scaleY) * 14 * dt
    if (this.isGrounded) {
      this.y = this.groundY - this.height
      this.animTimer += dt * (12 + speed * 0.8)
      if (particles && !this.isSliding && Math.random() < 0.08)
        particles.addFootstepDust(this.x + 12, this.groundY - 2 - Math.random() * 10, Math.random() < 0.3 ? WHITE : accent)
    } else {
      this.vy += this.gravity
      this.y += this.vy
      if (this.y >= this.groundY - this.height) {
        this.y = this.groundY - this.height
        this.vy = 0
        this.isGrounded = true
        this.jumpCount = 0
        this.canDoubleJump = true
        this.isFlipping = false
        this.flipAngle = 0
        this.scaleX = 1.24
        this.scaleY = 0.76
        particles?.addJumpBurst(this.x + this.width / 2, this.groundY, accent)
      }
    }

    // light ribbon: a short history of the orb centre, swept back with the world
    this.trail.push({ x: this.x + this.width / 2, y: this.centerY })
    if (this.trail.length > 12) this.trail.shift()
    const drift = Math.max(speed, 2.5) * 0.75
    for (const p of this.trail) p.x -= drift

    if (powerups.speedBoost || this.isFlipping || (!this.isGrounded && Math.abs(this.vy) > 8)) {
      this.ghostTrails.push({
        x: this.x + this.width / 2,
        y: this.centerY,
        scaleX: this.scaleX * (this.isSliding ? DISC_X : 1),
        scaleY: this.scaleY * (this.isSliding ? DISC_Y : 1),
        alpha: powerups.speedBoost ? 0.6 : 0.35,
        color: powerups.speedBoost ? POWERUPS.SPEED.color : this.skin.trailColor,
      })
      if (powerups.speedBoost && particles && Math.random() < 0.4)
        particles.addSpeedTrail(this.x, this.y, this.width, this.height, accent)
    }
    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      this.ghostTrails[i].alpha -= dt * 3.4
      this.ghostTrails[i].x -= speed * 0.35
      if (this.ghostTrails[i].alpha <= 0) this.ghostTrails.splice(i, 1)
    }
  }

  draw(ctx: CanvasRenderingContext2D, powerups: PlayerPowerups = {}) {
    ctx.save()
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 70) % 2 === 0) ctx.globalAlpha = 0.45
    const cx = this.x + this.width / 2
    const cy = this.centerY

    for (const g of this.ghostTrails) {
      ctx.save()
      ctx.globalAlpha *= g.alpha * 0.6
      ctx.fillStyle = g.color
      ctx.beginPath()
      ctx.ellipse(g.x, g.y, R * 0.9 * g.scaleX, R * 0.9 * g.scaleY, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    this.drawRibbon(ctx)

    ctx.save()
    // squash on the ground pivots at the contact point; in the air it pivots at the centre
    const pivot = this.isGrounded ? (this.isSliding ? 11 : R) : 0
    let sx = this.scaleX
    let sy = this.scaleY
    let lift = 0
    if (this.isSliding) {
      sx *= DISC_X
      sy *= DISC_Y
    } else if (this.isGrounded) {
      const bounce = Math.sin(this.animTimer * 0.5) * 0.035
      sx *= 1 + bounce
      sy *= 1 - bounce
      lift = Math.sin(this.idleTimer * 2.4) * 1.5 - 1.5
    }
    ctx.translate(cx, cy + pivot + lift)
    ctx.scale(sx, sy)
    ctx.translate(0, -pivot)
    if (this.isSliding) this.drawGroundGlow(ctx)
    this.drawOrb(ctx, this.rollAngle + (this.isFlipping ? this.flipAngle * 2 : 0))
    ctx.restore()

    if (this.isFlipping) this.drawSparkRing(ctx, cx, cy)
    if (this.isSliding) this.drawFrontSpray(ctx, cx, cy)
    this.drawPowerupAuras(ctx, cx, cy, powerups)
    ctx.restore()
  }

  /** The sphere at the origin: cached glow + shaded body, then a rotating energy band and rim light. */
  drawOrb(ctx: CanvasRenderingContext2D, roll: number) {
    const { glow, body } = orbSprites(this.skin)
    ctx.drawImage(glow, -glow.width / 2, -glow.height / 2)
    ctx.drawImage(body, -body.width / 2, -body.height / 2)
    const accent = this.skin.accent

    ctx.save()
    ctx.beginPath()
    ctx.arc(0, 0, R - 1, 0, Math.PI * 2)
    ctx.clip()
    ctx.rotate(roll)
    ctx.lineCap = 'round'
    // tilted equator band plus a fainter crossing band: reads as a spinning sphere
    ctx.strokeStyle = mix(accent, WHITE, 0.35, 0.7)
    ctx.lineWidth = 3.2
    ctx.beginPath()
    ctx.ellipse(0, 0, R * 0.95, R * 0.34, 0, 0, Math.PI)
    ctx.stroke()
    ctx.strokeStyle = mix(accent, accent, 0, 0.3)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(0, 0, R * 0.95, R * 0.34, 0, Math.PI, Math.PI * 2)
    ctx.moveTo(R * 0.3, -R)
    ctx.ellipse(0, 0, R * 0.3, R * 0.95, 0, -Math.PI / 2, Math.PI / 2)
    ctx.stroke()
    // energy motes riding the band
    ctx.fillStyle = WHITE
    for (let i = 0; i < 3; i++) {
      const a = 0.5 + i * 0.9
      ctx.globalAlpha = 0.9 - i * 0.2
      ctx.beginPath()
      ctx.arc(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.34, 2 - i * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // pulsing core
    ctx.save()
    ctx.globalAlpha *= 0.55 + Math.sin(this.idleTimer * 5) * 0.15
    ctx.fillStyle = WHITE
    ctx.beginPath()
    ctx.arc(-R * 0.08, -R * 0.08, R * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // crisp rim, brightest on the lower-right back-lit edge, plus a specular glint
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(0, 0, R - 0.7, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, R - 2, Math.PI * 0.05, Math.PI * 0.55)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.ellipse(-R * 0.42, -R * 0.46, 5.5, 3, -0.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  /** Tapered light ribbon from the trail history to the orb. */
  drawRibbon(ctx: CanvasRenderingContext2D) {
    const pts = this.trail
    const n = pts.length
    if (n < 3) return
    const half = (i: number) => (i / (n - 1)) ** 1.4 * R * (this.isSliding ? 0.45 : 0.75)
    const accent = this.skin.accent
    ctx.save()
    const g = ctx.createLinearGradient(pts[0].x, 0, pts[n - 1].x, 0)
    g.addColorStop(0, mix(accent, accent, 0, 0))
    g.addColorStop(1, this.skin.glowColor)
    ctx.fillStyle = g
    ctx.beginPath()
    for (let i = 0; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y - half(i))
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + half(i))
    ctx.closePath()
    ctx.fill()
    // bright core thread
    const core = ctx.createLinearGradient(pts[0].x, 0, pts[n - 1].x, 0)
    core.addColorStop(0, 'rgba(255, 255, 255, 0)')
    core.addColorStop(1, 'rgba(255, 255, 255, 0.85)')
    ctx.strokeStyle = core
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 0; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.stroke()
    ctx.restore()
  }

  /** Double jump: a tilted ring of sparks orbiting the spinning orb. */
  drawSparkRing(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const fade = Math.sin((this.flipAngle / (Math.PI * 2)) * Math.PI)
    const spin = this.flipAngle * 1.5
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-0.35)
    ctx.globalAlpha *= fade
    ctx.strokeStyle = mix(this.skin.accent, this.skin.accent, 0, 0.5)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(0, 0, R + 11, (R + 11) * 0.42, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineCap = 'round'
    for (let i = 0; i < 8; i++) {
      const a = spin + (i * Math.PI) / 4
      const px = Math.cos(a) * (R + 11)
      const py = Math.sin(a) * (R + 11) * 0.42
      const tx = Math.cos(a - 0.35) * (R + 11)
      const ty = Math.sin(a - 0.35) * (R + 11) * 0.42
      // accent body with a white-hot core reads on both dark and bright skies
      const w = Math.sin(a) > 0 ? 3.6 : 2.4
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(px, py)
      ctx.strokeStyle = this.skin.color
      ctx.lineWidth = w
      ctx.stroke()
      ctx.strokeStyle = WHITE
      ctx.lineWidth = w * 0.4
      ctx.stroke()
    }
    ctx.restore()
  }

  /** Soft light pooled on the ground under the sliding disc. */
  drawGroundGlow(ctx: CanvasRenderingContext2D) {
    const g = ctx.createRadialGradient(0, R, 0, 0, R, R * 1.3)
    g.addColorStop(0, this.skin.glowColor)
    g.addColorStop(1, mix(this.skin.accent, this.skin.accent, 0, 0))
    ctx.fillStyle = g
    ctx.fillRect(-R * 1.3, 0, R * 2.6, R * 2)
  }

  /** Short spark streaks thrown up and back from the leading edge of the disc. */
  drawFrontSpray(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const now = Date.now() / 1000
    const fx = cx + R * DISC_X - 2
    const fy = cy + 6
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineWidth = 1.6
    for (let i = 0; i < 4; i++) {
      const len = 6 + ((Math.sin(now * 31 + i * 2.1) + 1) / 2) * 8
      const a = -Math.PI * 0.55 - i * 0.22
      ctx.strokeStyle = i % 2 ? WHITE : this.skin.accent
      ctx.beginPath()
      ctx.moveTo(fx, fy)
      ctx.lineTo(fx + Math.cos(a) * len, fy + Math.sin(a) * len)
      ctx.stroke()
    }
    ctx.restore()
  }

  drawPowerupAuras(ctx: CanvasRenderingContext2D, cx: number, cy: number, powerups: PlayerPowerups) {
    const now = Date.now()
    if (powerups.shield) {
      // energy bubble
      const r = R + 14 + Math.sin(now / 160) * 2.5
      const c = POWERUPS.SHIELD.color
      ctx.save()
      const fill = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r)
      fill.addColorStop(0, mix(c, c, 0, 0))
      fill.addColorStop(1, mix(c, c, 0, 0.3))
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = c
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.82, Math.PI * 1.1, Math.PI * 1.4)
      ctx.stroke()
      ctx.fillStyle = WHITE
      const spin = now / 600
      for (let i = 0; i < 6; i++) {
        const a = spin + (i * Math.PI) / 3
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now / 200 + i)
        ctx.beginPath()
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    if (powerups.magnet) {
      ctx.save()
      ctx.strokeStyle = POWERUPS.MAGNET.color
      ctx.lineWidth = 2
      for (let k = 0; k < 2; k++) {
        const ring = (now / 22 + k * 22) % 45
        ctx.globalAlpha = Math.max(0, 1 - ring / 45) * 0.8
        ctx.beginPath()
        ctx.arc(cx, cy, R + 4 + ring, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }
    if (powerups.speedBoost) {
      // streaks streaming behind
      ctx.save()
      ctx.lineCap = 'round'
      const c = POWERUPS.SPEED.color
      for (let i = 0; i < 3; i++) {
        const y = cy - 14 + i * 14 + Math.sin(now / 90 + i * 2) * 3
        const g = ctx.createLinearGradient(cx - 80, 0, cx - R, 0)
        g.addColorStop(0, mix(c, c, 0, 0))
        g.addColorStop(1, mix(c, c, 0, 0.75))
        ctx.strokeStyle = g
        ctx.lineWidth = 4 - i
        ctx.beginPath()
        ctx.moveTo(cx - 80 + i * 10, y)
        ctx.quadraticCurveTo(cx - 50, y - 6, cx - R, y)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  /** Hugs the visible orb (or the slide disc): no hits from empty glow. */
  getHitbox(): Hitbox {
    return { x: this.x + 6, y: this.y + 8, width: this.width - 12, height: this.height - 12 }
  }
}

/** Glow and shaded sphere are static per skin, so they are rendered once instead of using shadowBlur each frame. */
const spriteCache = new Map<string, { glow: HTMLCanvasElement; body: HTMLCanvasElement }>()

function orbSprites(skin: Skin) {
  let s = spriteCache.get(skin.id)
  if (s) return s
  const G = R * 2 + 4
  const glow = document.createElement('canvas')
  glow.width = glow.height = G * 2
  const gc = glow.getContext('2d')
  if (gc) {
    const g = gc.createRadialGradient(G, G, R * 0.6, G, G, G)
    g.addColorStop(0, skin.glowColor)
    g.addColorStop(0.35, skin.trailColor)
    g.addColorStop(1, mix(skin.accent, skin.accent, 0, 0))
    gc.fillStyle = g
    gc.fillRect(0, 0, G * 2, G * 2)
  }
  const body = document.createElement('canvas')
  body.width = body.height = R * 2 + 2
  const bc = body.getContext('2d')
  if (bc) {
    const c = R + 1
    const g = bc.createRadialGradient(c - R * 0.35, c - R * 0.4, 1, c, c, R)
    g.addColorStop(0, WHITE)
    g.addColorStop(0.2, mix(skin.accent, WHITE, 0.45))
    g.addColorStop(0.55, skin.color)
    g.addColorStop(1, mix(skin.color, INK, 0.5))
    bc.fillStyle = g
    bc.beginPath()
    bc.arc(c, c, R, 0, Math.PI * 2)
    bc.fill()
  }
  s = { glow, body }
  spriteCache.set(skin.id, s)
  return s
}
