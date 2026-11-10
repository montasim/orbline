import { audio } from '../audio'
import { POWERUPS, type PowerupDef } from '../data'
import type { PowerupStatus } from '../types'
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
    ctx.beginPath()
    ctx.moveTo(cx, cy - 22)
    ctx.lineTo(cx + 22, cy)
    ctx.lineTo(cx, cy + 22)
    ctx.lineTo(cx - 22, cy)
    ctx.closePath()
    ctx.fillStyle = this.type.glowColor ? this.type.glowColor.replace('0.9', '0.25') : 'rgba(0, 245, 255, 0.25)'
    ctx.fill()
    ctx.fillStyle = 'rgba(15, 15, 30, 0.9)'
    ctx.strokeStyle = this.type.color
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(cx, cy - 18)
    ctx.lineTo(cx + 18, cy)
    ctx.lineTo(cx, cy + 18)
    ctx.lineTo(cx - 18, cy)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = this.type.color
    ctx.beginPath()
    if (this.type.id === 'shield') {
      ctx.moveTo(cx, cy - 8)
      ctx.lineTo(cx + 8, cy - 4)
      ctx.lineTo(cx + 6, cy + 6)
      ctx.lineTo(cx, cy + 10)
      ctx.lineTo(cx - 6, cy + 6)
      ctx.lineTo(cx - 8, cy - 4)
      ctx.closePath()
    } else if (this.type.id === 'magnet') {
      ctx.arc(cx, cy - 2, 7, Math.PI, 0, false)
      ctx.lineTo(cx + 7, cy + 6)
      ctx.lineTo(cx + 3, cy + 6)
      ctx.lineTo(cx + 3, cy)
      ctx.arc(cx, cy, 3, 0, Math.PI, true)
      ctx.lineTo(cx - 3, cy + 6)
      ctx.lineTo(cx - 7, cy + 6)
      ctx.closePath()
    } else {
      ctx.moveTo(cx + 2, cy - 9)
      ctx.lineTo(cx - 5, cy)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx - 2, cy + 9)
      ctx.lineTo(cx + 5, cy)
      ctx.lineTo(cx, cy)
      ctx.closePath()
    }
    ctx.fill()
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

  reset() {
    this.tokens = []
    this.active = freshStatus()
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
