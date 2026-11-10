import type { Level, ObstacleType } from '../data'
import type { Hitbox } from './collisions'
import type { Player } from './player'
import type { Skin, Tier } from '../maps/types'

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

  /** Six-armed snowflake crystal with a soft glow, gently spinning and pulsing. */
  draw(ctx: CanvasRenderingContext2D) {
    if (this.collected) return
    const y = this.y + Math.sin(this.animTimer) * 3
    const pulse = Math.abs(Math.sin(this.animTimer))
    const r = this.radius * (0.88 + pulse * 0.12)
    ctx.save()
    ctx.translate(this.x, y)
    ctx.fillStyle = 'rgba(165, 243, 252, 0.16)'
    ctx.beginPath()
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(165, 243, 252, 0.22)'
    ctx.beginPath()
    ctx.arc(0, 0, r + 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.rotate(this.animTimer * 0.25)
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      ctx.moveTo(0, 0)
      ctx.lineTo(ca * r, sa * r)
      // little V branches
      const bx = ca * r * 0.55
      const by = sa * r * 0.55
      for (const s of [-1, 1]) {
        const ba = a + s * 0.75
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + Math.cos(ba) * r * 0.32, by + Math.sin(ba) * r * 0.32)
      }
    }
    ctx.strokeStyle = '#7dd3fc'
    ctx.lineWidth = 3.4
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.6
    ctx.stroke()
    ctx.fillStyle = '#e0f7ff'
    ctx.beginPath()
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
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
      case 'boulder':
        this.width = 46
        this.height = 36
        this.y = groundY - this.height
        break
      case 'iceblock':
        this.width = 48
        this.height = 52
        this.y = groundY - this.height
        break
      case 'icespikes':
        this.width = 62
        this.height = 34
        this.y = groundY - this.height
        break
      case 'pillar':
        this.width = 22
        this.height = 90
        this.y = groundY - this.height
        break
      case 'flyer':
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
    if (this.type === 'flyer') this.y = this.baseY + Math.sin(this.animTimer * 4) * 12
  }

  draw(ctx: CanvasRenderingContext2D, accentColor = '#5eead4') {
    ctx.save()
    const x = this.x
    const y = this.y
    const w = this.width
    const h = this.height
    switch (this.type) {
      case 'boulder': {
        // round rock with a snow cap
        const rock = ctx.createRadialGradient(x + w * 0.35, y + h * 0.3, 3, x + w / 2, y + h * 0.6, w * 0.7)
        rock.addColorStop(0, '#7b8aa3')
        rock.addColorStop(0.6, '#3f4b63')
        rock.addColorStop(1, '#1e2638')
        ctx.fillStyle = rock
        ctx.beginPath()
        ctx.moveTo(x + 2, y + h)
        ctx.bezierCurveTo(x - 2, y + h * 0.4, x + w * 0.2, y + 1, x + w * 0.5, y + 1)
        ctx.bezierCurveTo(x + w * 0.85, y + 1, x + w + 2, y + h * 0.45, x + w - 1, y + h)
        ctx.closePath()
        ctx.fill()
        ctx.save()
        ctx.clip()
        ctx.fillStyle = '#eef6ff'
        ctx.beginPath()
        ctx.moveTo(x - 2, y + h * 0.42)
        ctx.quadraticCurveTo(x + w * 0.2, y + h * 0.52, x + w * 0.34, y + h * 0.36)
        ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.5, x + w * 0.66, y + h * 0.33)
        ctx.quadraticCurveTo(x + w * 0.82, y + h * 0.46, x + w + 2, y + h * 0.36)
        ctx.lineTo(x + w + 2, y - 2)
        ctx.lineTo(x - 2, y - 2)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(148, 178, 214, 0.5)'
        ctx.fillRect(x + w * 0.62, y - 2, w * 0.4, h * 0.42)
        ctx.restore()
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)'
        ctx.lineWidth = 1.3
        ctx.beginPath()
        ctx.moveTo(x + w * 0.66, y + h * 0.56)
        ctx.lineTo(x + w * 0.74, y + h * 0.72)
        ctx.lineTo(x + w * 0.72, y + h * 0.9)
        ctx.moveTo(x + w * 0.74, y + h * 0.72)
        ctx.lineTo(x + w * 0.84, y + h * 0.76)
        ctx.stroke()
        ctx.strokeStyle = accentColor
        ctx.globalAlpha = 0.55
        ctx.beginPath()
        ctx.moveTo(x + 3, y + h * 0.75)
        ctx.quadraticCurveTo(x + 2, y + h * 0.45, x + w * 0.2, y + h * 0.2)
        ctx.stroke()
        break
      }
      case 'iceblock': {
        // translucent cube: top face, side face, front face
        const d = 8
        ctx.fillStyle = 'rgba(207, 250, 254, 0.8)'
        ctx.beginPath()
        ctx.moveTo(x, y + d)
        ctx.lineTo(x + d, y)
        ctx.lineTo(x + w, y)
        ctx.lineTo(x + w - d, y + d)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(56, 152, 196, 0.6)'
        ctx.beginPath()
        ctx.moveTo(x + w - d, y + d)
        ctx.lineTo(x + w, y)
        ctx.lineTo(x + w, y + h - d)
        ctx.lineTo(x + w - d, y + h)
        ctx.closePath()
        ctx.fill()
        const face = ctx.createLinearGradient(x, y + d, x + w - d, y + h)
        face.addColorStop(0, 'rgba(186, 240, 252, 0.75)')
        face.addColorStop(1, 'rgba(56, 189, 248, 0.5)')
        ctx.fillStyle = face
        ctx.fillRect(x, y + d, w - d, h - d)
        ctx.strokeStyle = 'rgba(240, 249, 255, 0.9)'
        ctx.lineWidth = 1.5
        ctx.strokeRect(x, y + d, w - d, h - d)
        // inner cracks + glint
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x + w * 0.58, y + d)
        ctx.lineTo(x + w * 0.46, y + h * 0.42)
        ctx.lineTo(x + w * 0.56, y + h * 0.6)
        ctx.moveTo(x + w * 0.46, y + h * 0.42)
        ctx.lineTo(x + w * 0.2, y + h * 0.55)
        ctx.stroke()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.beginPath()
        ctx.moveTo(x + 4, y + d + 4)
        ctx.lineTo(x + 14, y + d + 4)
        ctx.lineTo(x + 4, y + d + 18)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#eef6ff'
        ctx.beginPath()
        ctx.ellipse(x + w * 0.45, y + d * 0.55, w * 0.32, 3, 0, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'icespikes': {
        // a cluster of shards, each with a lit and a shaded face
        const shards: [number, number, number][] = [
          [0.12, 0.55, -0.1],
          [0.3, 0.85, -0.05],
          [0.5, 1, 0.03],
          [0.7, 0.75, 0.1],
          [0.88, 0.5, 0.15],
        ]
        for (const [fx, fh, lean] of shards) {
          const bx = x + w * fx
          const half = w * 0.11
          const tipX = bx + lean * h
          const tipY = y + h * (1 - fh)
          ctx.fillStyle = '#bdeefe'
          ctx.beginPath()
          ctx.moveTo(bx - half, y + h)
          ctx.lineTo(tipX, tipY)
          ctx.lineTo(bx, y + h)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = '#4fa3c7'
          ctx.beginPath()
          ctx.moveTo(bx, y + h)
          ctx.lineTo(tipX, tipY)
          ctx.lineTo(bx + half, y + h)
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(bx - half * 0.6, y + h - 2)
          ctx.lineTo(tipX, tipY)
          ctx.stroke()
        }
        ctx.fillStyle = '#eef6ff'
        ctx.beginPath()
        ctx.ellipse(x + w / 2, y + h, w * 0.52, 4, 0, Math.PI, 0)
        ctx.fill()
        break
      }
      case 'pillar': {
        const pulse = 0.5 + 0.5 * Math.sin(this.animTimer * 3)
        const cx = x + w / 2
        // cold glow
        const glow = ctx.createLinearGradient(x - 16, 0, x + w + 16, 0)
        glow.addColorStop(0, 'rgba(0, 0, 0, 0)')
        glow.addColorStop(0.5, accentColor)
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.globalAlpha = 0.18 + pulse * 0.14
        ctx.fillStyle = glow
        ctx.fillRect(x - 16, y - 6, w + 32, h + 6)
        ctx.globalAlpha = 1
        // column with a jagged crown
        const col = ctx.createLinearGradient(x, 0, x + w, 0)
        col.addColorStop(0, '#e0f7ff')
        col.addColorStop(0.45, '#7cc8e8')
        col.addColorStop(1, '#3b86b0')
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.moveTo(x + 1, y + h)
        ctx.lineTo(x + 3, y + h * 0.55)
        ctx.lineTo(x, y + h * 0.3)
        ctx.lineTo(x + 2, y + 6)
        ctx.lineTo(x + w * 0.3, y + 10)
        ctx.lineTo(x + w * 0.45, y)
        ctx.lineTo(x + w * 0.65, y + 8)
        ctx.lineTo(x + w - 1, y + 2)
        ctx.lineTo(x + w, y + h * 0.4)
        ctx.lineTo(x + w - 3, y + h * 0.7)
        ctx.lineTo(x + w - 1, y + h)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x + w * 0.32, y + 14)
        ctx.lineTo(x + w * 0.28, y + h - 8)
        ctx.stroke()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx + 3, y + h * 0.25)
        ctx.lineTo(cx - 1, y + h * 0.4)
        ctx.lineTo(cx + 4, y + h * 0.5)
        ctx.stroke()
        ctx.fillStyle = '#eef6ff'
        ctx.beginPath()
        ctx.ellipse(cx, y + h, w * 0.85, 5, 0, Math.PI, 0)
        ctx.fill()
        break
      }
      case 'flyer': {
        // floating ice-crystal cluster, slowly spinning around a glowing core
        const cx = x + w / 2
        const cy = y + h / 2
        const pulse = 0.5 + 0.5 * Math.sin(this.animTimer * 3)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.18)'
        ctx.beginPath()
        ctx.ellipse(cx, this.groundY - 1, 16, 3, 0, 0, Math.PI * 2)
        ctx.fill()
        const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, h / 2)
        glow.addColorStop(0, `rgba(165, 243, 252, ${0.3 + pulse * 0.2})`)
        glow.addColorStop(1, 'rgba(165, 243, 252, 0)')
        ctx.fillStyle = glow
        ctx.fillRect(x, y, w, h)
        ctx.translate(cx, cy)
        ctx.rotate(this.animTimer * 0.8)
        // [angle, length]; the longest stays under h / 2 so the spin never leaves the box
        for (const [a, len] of [
          [0, 18],
          [1.7, 12],
          [3.25, 16],
          [4.75, 11],
        ]) {
          const ca = Math.cos(a)
          const sa = Math.sin(a)
          const bx = ca * 3
          const by = sa * 3
          const px = -sa * 4.6
          const py = ca * 4.6
          const tx = ca * len
          const ty = sa * len
          ctx.fillStyle = 'rgba(189, 238, 254, 0.85)'
          ctx.beginPath()
          ctx.moveTo(bx + px, by + py)
          ctx.lineTo(tx, ty)
          ctx.lineTo(bx, by)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = 'rgba(79, 163, 199, 0.75)'
          ctx.beginPath()
          ctx.moveTo(bx - px, by - py)
          ctx.lineTo(tx, ty)
          ctx.lineTo(bx, by)
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = 'rgba(30, 64, 110, 0.45)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(bx + px, by + py)
          ctx.lineTo(tx, ty)
          ctx.lineTo(bx - px, by - py)
          ctx.stroke()
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
          ctx.beginPath()
          ctx.moveTo(bx + px * 0.5, by + py * 0.5)
          ctx.lineTo(tx, ty)
          ctx.stroke()
        }
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 6)
        core.addColorStop(0, '#ffffff')
        core.addColorStop(0.5, `rgba(207, 250, 254, ${0.8 + pulse * 0.2})`)
        core.addColorStop(1, 'rgba(125, 211, 252, 0)')
        ctx.fillStyle = core
        ctx.beginPath()
        ctx.arc(0, 0, 6, 0, Math.PI * 2)
        ctx.fill()
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
      if (type === 'flyer') {
        for (let i = 0; i < 3; i++) this.coins.push(new Coin(x + i * 36, groundY - 25))
      } else {
        for (let i = 0; i < 4; i++) {
          const arc = Math.sin((i / 3) * Math.PI) * 70
          this.coins.push(new Coin(x - 20 + i * 35, groundY - obstacle.height - 40 - arc))
        }
      }
    }
  }

  /** A map skin may take over the art; hitboxes and behaviour stay the same. */
  draw(ctx: CanvasRenderingContext2D, accentColor: string, skin: Skin = {}, tier: Tier = 0) {
    for (const c of this.coins) if (!c.collected && !skin.drawCrystal?.(ctx, c, tier)) c.draw(ctx)
    for (const o of this.obstacles) if (!skin.drawObstacle?.(ctx, o, tier)) o.draw(ctx, accentColor)
  }

  adjustGround(groundY: number, deltaY: number) {
    for (const o of this.obstacles) {
      o.groundY = groundY
      if (o.type === 'flyer') {
        o.baseY = groundY - 110
        o.y = o.baseY
      } else o.y = groundY - o.height
    }
    for (const c of this.coins) c.y += deltaY
  }
}
