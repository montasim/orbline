import { audio } from '../audio'
import { POWERUPS, type PowerupDef } from '../data'
import type { PowerupStatus } from '../types'
import { mix } from './background'
import type { Hitbox } from './collisions'
import type { ParticleSystem } from './particles'

export class PowerupToken {
  width = 36
  height = 36
  animTimer = Math.random() * Math.PI * 2
  collected = false

  constructor(
    public x: number,
    public y: number,
    public type: PowerupDef,
  ) {}

  update(dt: number, speed: number) {
    this.x -= speed
    this.animTimer += dt * 3.5
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.collected) return
    ctx.save()
    const top = this.y + Math.sin(this.animTimer) * 5
    const cx = this.x + this.width / 2
    const cy = top + this.height / 2
    const c = this.type.color
    // frosted bubble badge
    ctx.globalAlpha = 0.18 + 0.08 * Math.sin(this.animTimer * 2)
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(cx, cy, 23, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    const bubble = ctx.createRadialGradient(cx - 5, cy - 6, 2, cx, cy, 18)
    bubble.addColorStop(0, 'rgba(255, 255, 255, 0.55)')
    bubble.addColorStop(0.55, mix(c, c, 0, 0.35))
    bubble.addColorStop(1, mix(c, '#0f172a', 0.25, 0.75))
    ctx.fillStyle = bubble
    ctx.beginPath()
    ctx.arc(cx, cy, 17, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = c
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(cx, cy, 13, Math.PI * 1.1, Math.PI * 1.45)
    ctx.stroke()
    // glyph
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = mix(c, '#0f172a', 0.55)
    ctx.lineWidth = 1.4
    ctx.lineJoin = 'round'
    ctx.beginPath()
    if (this.type.id === 'shield') {
      ctx.moveTo(cx, cy - 9)
      ctx.lineTo(cx + 8, cy - 6)
      ctx.quadraticCurveTo(cx + 8, cy + 5, cx, cy + 10)
      ctx.quadraticCurveTo(cx - 8, cy + 5, cx - 8, cy - 6)
      ctx.closePath()
    } else if (this.type.id === 'magnet') {
      ctx.arc(cx, cy - 1, 7.5, Math.PI, 0, false)
      ctx.lineTo(cx + 7.5, cy + 7)
      ctx.lineTo(cx + 3.5, cy + 7)
      ctx.lineTo(cx + 3.5, cy - 1)
      ctx.arc(cx, cy - 1, 3.5, 0, Math.PI, true)
      ctx.lineTo(cx - 3.5, cy + 7)
      ctx.lineTo(cx - 7.5, cy + 7)
      ctx.closePath()
    } else {
      ctx.moveTo(cx + 3, cy - 10)
      ctx.lineTo(cx - 6, cy + 1)
      ctx.lineTo(cx - 0.5, cy + 1)
      ctx.lineTo(cx - 3, cy + 10)
      ctx.lineTo(cx + 6, cy - 1.5)
      ctx.lineTo(cx + 0.5, cy - 1.5)
      ctx.closePath()
    }
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  getHitbox(): Hitbox {
    return { x: this.x + 2, y: this.y + 2, width: this.width - 4, height: this.height - 4 }
  }
}

const freshStatus = (): PowerupStatus => ({
  shield: false,
  magnet: false,
  magnetTimer: 0,
  magnetMax: 8,
  speedBoost: false,
  speedBoostTimer: 0,
  speedBoostMax: 5,
})

export class PowerupManager {
  tokens: PowerupToken[] = []
  active: PowerupStatus = freshStatus()
  collectedCount = 0

  reset() {
    this.tokens = []
    this.active = freshStatus()
    this.collectedCount = 0
  }

  spawnRandom(x: number, groundY: number) {
    const keys = Object.keys(POWERUPS) as (keyof typeof POWERUPS)[]
    const type = POWERUPS[keys[Math.floor(Math.random() * keys.length)]]
    const heights = [groundY - 120, groundY - 75, groundY - 160]
    const y = heights[Math.floor(Math.random() * heights.length)]
    this.tokens.push(new PowerupToken(x, y, type))
  }

  collect(token: PowerupToken, particles?: ParticleSystem | null) {
    token.collected = true
    this.collectedCount++
    audio.playPowerup()
    if (token.type.id === 'shield') this.active.shield = true
    else if (token.type.id === 'magnet') {
      this.active.magnet = true
      this.active.magnetTimer = this.active.magnetMax
    } else if (token.type.id === 'speedBoost') {
      this.active.speedBoost = true
      this.active.speedBoostTimer = this.active.speedBoostMax
    }
    particles?.addCoinCollect(token.x + 18, token.y + 18, token.type.name)
  }

  update(dt: number, speed: number) {
    if (this.active.magnet) {
      this.active.magnetTimer -= dt
      if (this.active.magnetTimer <= 0) {
        this.active.magnet = false
        this.active.magnetTimer = 0
      }
    }
    if (this.active.speedBoost) {
      this.active.speedBoostTimer -= dt
      if (this.active.speedBoostTimer <= 0) {
        this.active.speedBoost = false
        this.active.speedBoostTimer = 0
      }
    }
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const t = this.tokens[i]
      t.update(dt, speed)
      if (t.x + t.width < -50 || t.collected) this.tokens.splice(i, 1)
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const t of this.tokens) t.draw(ctx)
  }

  adjustGround(_groundY: number, deltaY: number) {
    for (const t of this.tokens) t.y += deltaY
  }
}
