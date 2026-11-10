import type { Level, ObstacleType } from '../data'
import type { Hitbox } from './collisions'
import type { Player } from './player'

export class Coin {
  radius = 11
  animTimer = Math.random() * Math.PI * 2
  collected = false

  constructor(
    public x: number,
    public y: number,
  ) {}

  update(dt: number, speed: number, player: Player, magnetActive: boolean) {
    this.x -= speed
    this.animTimer += dt * 5
    if (magnetActive && !this.collected) {
      const dx = player.x + player.width / 2 - this.x
      const dy = player.y + player.height / 2 - this.y
      const dist = Math.hypot(dx, dy)
      if (dist < 280) {
        const pull = 16 * (1 - dist / 350) + 6
        this.x += (dx / dist) * pull
        this.y += (dy / dist) * pull
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.collected) return
    const y = this.y + Math.sin(this.animTimer) * 3
    const pulse = Math.abs(Math.sin(this.animTimer))
    const r = this.radius * (0.85 + pulse * 0.15)
    ctx.beginPath()
    ctx.arc(this.x, y, r + 3.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(251, 191, 36, 0.28)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(this.x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = '#f59e0b'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(this.x, y, r * 0.7, 0, Math.PI * 2)
    ctx.fillStyle = '#fef08a'
    ctx.fill()
    ctx.fillStyle = '#78350f'
    ctx.fillRect(this.x - 2, y - 4, 4, 8)
  }

  getHitbox(): Hitbox {
    return { x: this.x - this.radius, y: this.y - this.radius, width: this.radius * 2, height: this.radius * 2 }
  }
}

export class Obstacle {
  passed = false
  animTimer = 0
  width: number
  height: number
  y: number
  baseY = 0

  constructor(
    public x: number,
    public groundY: number,
    public type: ObstacleType,
  ) {
    switch (type) {
      case 'stone':
        this.width = 46
        this.height = 36
        this.y = groundY - this.height
        break
      case 'crate':
        this.width = 48
        this.height = 52
        this.y = groundY - this.height
        break
      case 'spikes':
        this.width = 62
        this.height = 34
        this.y = groundY - this.height
        break
      case 'laser':
        this.width = 22
        this.height = 90
        this.y = groundY - this.height
        break
      case 'drone':
        this.width = 54
        this.height = 38
        this.y = groundY - 110
        this.baseY = this.y
        break
      default:
        this.width = 44
        this.height = 40
        this.y = groundY - this.height
    }
  }

  update(dt: number, speed: number) {
    this.x -= speed
    this.animTimer += dt
    if (this.type === 'drone') this.y = this.baseY + Math.sin(this.animTimer * 4) * 12
  }

  draw(ctx: CanvasRenderingContext2D, accentColor = '#a855f7') {
    ctx.save()
    const x = this.x
    const y = this.y
    const w = this.width
    const h = this.height
    switch (this.type) {
      case 'stone':
        ctx.fillStyle = '#171726'
        ctx.strokeStyle = accentColor
        ctx.lineWidth = 2.2
        ctx.beginPath()
        ctx.moveTo(x + 4, y + h)
        ctx.lineTo(x + 12, y + 8)
        ctx.lineTo(x + w - 14, y + 2)
        ctx.lineTo(x + w, y + 18)
        ctx.lineTo(x + w - 4, y + h)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.strokeStyle = '#e2e8f0'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(x + 20, y + 12)
        ctx.lineTo(x + 26, y + 24)
        ctx.lineTo(x + 34, y + 20)
        ctx.stroke()
        break
      case 'crate':
        ctx.fillStyle = '#1e1c2e'
        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(x, y, w, h, 5)
        ctx.fill()
        ctx.stroke()
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'
        ctx.beginPath()
        ctx.moveTo(x + 6, y + 6)
        ctx.lineTo(x + w - 6, y + h - 6)
        ctx.moveTo(x + w - 6, y + 6)
        ctx.lineTo(x + 6, y + h - 6)
        ctx.stroke()
        ctx.fillStyle = '#38bdf8'
        ctx.beginPath()
        ctx.arc(x + w / 2, y + h / 2, 5, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'spikes': {
        ctx.fillStyle = '#181824'
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        const spikeW = w / 3
        ctx.beginPath()
        ctx.moveTo(x, y + h)
        for (let i = 0; i < 3; i++) {
          const sx = x + i * spikeW
          ctx.lineTo(sx + spikeW / 2, y)
          ctx.lineTo(sx + spikeW, y + h)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
      }
      case 'laser': {
        ctx.fillStyle = '#111827'
        ctx.fillRect(x - 3, y + h - 10, w + 6, 10)
        ctx.fillRect(x - 3, y, w + 6, 10)
        const flicker = Math.sin(this.animTimer * 18)
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.35)'
        ctx.lineWidth = 10 + flicker * 2
        ctx.beginPath()
        ctx.moveTo(x + w / 2, y + 10)
        ctx.lineTo(x + w / 2, y + h - 10)
        ctx.stroke()
        ctx.strokeStyle = '#ff0055'
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(x + w / 2, y + 10)
        ctx.lineTo(x + w / 2, y + h - 10)
        ctx.stroke()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x + w / 2, y + 10)
        ctx.lineTo(x + w / 2, y + h - 10)
        ctx.stroke()
        if (Math.random() < 0.3) {
          const sparkY = y + 10 + Math.random() * (h - 20)
          ctx.strokeStyle = '#00f5ff'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(x + w / 2, sparkY)
          ctx.lineTo(x + w / 2 + (Math.random() - 0.5) * 14, sparkY + (Math.random() - 0.5) * 8)
          ctx.stroke()
        }
        break
      }
      case 'drone': {
        ctx.save()
        const sweep = Math.sin(this.animTimer * 3.5) * 24
        const beam = ctx.createLinearGradient(x + w / 2, y + h / 2, x + w / 2 + sweep, this.groundY)
        beam.addColorStop(0, 'rgba(239, 68, 68, 0.22)')
        beam.addColorStop(1, 'transparent')
        ctx.fillStyle = beam
        ctx.beginPath()
        ctx.moveTo(x + w / 2, y + h / 2)
        ctx.lineTo(x + w / 2 - 38 + sweep, this.groundY)
        ctx.lineTo(x + w / 2 + 38 + sweep, this.groundY)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
        ctx.fillStyle = '#111222'
        ctx.strokeStyle = '#a855f7'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2.8, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(x + w / 2 + Math.sin(this.animTimer * 6) * 6, y + h / 2, 4.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#00f5ff'
        ctx.lineWidth = 2
        const rotor = Math.sin(this.animTimer * 25) * 8
        ctx.beginPath()
        ctx.moveTo(x - 8, y + h / 2 + rotor)
        ctx.lineTo(x + 6, y + h / 2)
        ctx.moveTo(x + w + 8, y + h / 2 - rotor)
        ctx.lineTo(x + w - 6, y + h / 2)
        ctx.stroke()
        break
      }
    }
    ctx.restore()
  }

  getHitbox(): Hitbox {
    return { x: this.x + 4, y: this.y + 4, width: this.width - 8, height: this.height - 4 }
  }
}

/** Spawns and moves obstacles plus the coin arcs that accompany them. */
export class ObstacleManager {
  obstacles: Obstacle[] = []
  coins: Coin[] = []
  lastSpawnTime = 0
  nextSpawnInterval = 1600

  reset() {
    this.obstacles = []
    this.coins = []
    this.lastSpawnTime = 0
    this.nextSpawnInterval = 1600
  }

  /** Returns the x of an obstacle spawned this frame, or null. */
  update(dt: number, timeMs: number, speed: number, level: Level, groundY: number, player: Player, magnetActive: boolean): number | null {
    let spawnedAt: number | null = null
    if (timeMs - this.lastSpawnTime >= this.nextSpawnInterval) {
      this.lastSpawnTime = timeMs
      this.nextSpawnInterval =
        level.obstacleIntervalMin + Math.random() * (level.obstacleIntervalMax - level.obstacleIntervalMin)
      const spawnX = Math.max(player.canvasWidth + 40, player.x + 550)
      this.spawnObstaclePattern(spawnX, groundY, level)
      spawnedAt = spawnX
    }
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i]
      o.update(dt, speed)
      if (o.x + o.width < -50) this.obstacles.splice(i, 1)
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i]
      c.update(dt, speed, player, magnetActive)
      if (c.x + c.radius < -50 || c.collected) this.coins.splice(i, 1)
    }
    return spawnedAt
  }

  spawnObstaclePattern(x: number, groundY: number, level: Level) {
    const allowed = level.allowedObstacles
    const type = allowed[Math.floor(Math.random() * allowed.length)]
    const obstacle = new Obstacle(x, groundY, type)
    this.obstacles.push(obstacle)
    if (Math.random() < level.coinSpawnChance) {
      if (type === 'drone') {
        for (let i = 0; i < 3; i++) this.coins.push(new Coin(x + i * 36, groundY - 25))
      } else {
        for (let i = 0; i < 4; i++) {
          const arc = Math.sin((i / 3) * Math.PI) * 70
          this.coins.push(new Coin(x - 20 + i * 35, groundY - obstacle.height - 40 - arc))
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, accentColor: string) {
    for (const c of this.coins) c.draw(ctx)
    for (const o of this.obstacles) o.draw(ctx, accentColor)
  }

  adjustGround(groundY: number, deltaY: number) {
    for (const o of this.obstacles) {
      o.groundY = groundY
      if (o.type === 'drone') {
        o.baseY = groundY - 110
        o.y = o.baseY
      } else o.y = groundY - o.height
    }
    for (const c of this.coins) c.y += deltaY
  }
}
