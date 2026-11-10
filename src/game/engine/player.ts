import { audio } from '../audio'
import { SKINS, type Skin } from '../data'
import type { Hitbox } from './collisions'
import type { ParticleSystem } from './particles'

interface Point {
  x: number
  y: number
}

interface EyeTrail extends Point {
  alpha: number
}

interface GhostTrail {
  x: number
  y: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  angle: number
  alpha: number
  color: string
}

export interface PlayerPowerups {
  shield?: boolean
  magnet?: boolean
  speedBoost?: boolean
}

export class Player {
  width = 46
  height = 66
  normalHeight = 66
  slideHeight = 34
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
  bodyAngle = 0
  idleTimer = 0
  animTimer = 0
  runSpeed = 16
  ghostTrails: GhostTrail[] = []
  scarfPointsA: Point[] = []
  scarfPointsB: Point[] = []
  eyeTrails: EyeTrail[] = []
  skinId = 'ninja'
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
    for (let i = 0; i < 7; i++) {
      this.scarfPointsA.push({ x: this.x - i * 6.5, y: this.y + 19 })
      this.scarfPointsB.push({ x: this.x - i * 6, y: this.y + 22 })
    }
  }

  setSkin(id: string) {
    this.skinId = id
    const skin = SKINS.find((s) => s.id === id)
    if (skin) this.skin = skin
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
      this.scaleX = 0.84
      this.scaleY = 1.22
      audio.playJump()
      particles?.addJumpBurst(this.x + this.width / 2, this.y + this.height, this.skin.color)
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
        this.scaleX = 1.38
        this.scaleY = 0.65
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
    if (this.isSliding) {
      this.slideTimer -= dt
      if (this.slideTimer <= 0) this.stopSlide()
      if (particles && Math.random() < 0.75) {
        particles.addFootstepDust(this.x + this.width + 12, this.groundY, '#00f5ff')
        particles.addFootstepDust(this.x - 5, this.groundY, '#fbbf24')
      }
    }
    this.scaleX += (1 - this.scaleX) * 14 * dt
    this.scaleY += (1 - this.scaleY) * 14 * dt
    if (this.isGrounded) {
      this.y = this.groundY - this.height
      this.bodyAngle = 0.09 + Math.min(speed * 0.012, 0.16)
      this.runSpeed = 12 + speed * 0.8
      this.animTimer += dt * this.runSpeed
      if (particles && Math.sin(this.animTimer) > 0.94) particles.addFootstepDust(this.x + 10, this.groundY, this.skin.color)
    } else {
      this.vy += this.gravity
      this.y += this.vy
      if (!this.isFlipping) this.bodyAngle = Math.min(Math.max(this.vy * 0.025, -0.22), 0.28)
      if (this.y >= this.groundY - this.height) {
        this.y = this.groundY - this.height
        this.vy = 0
        this.isGrounded = true
        this.jumpCount = 0
        this.canDoubleJump = true
        this.isFlipping = false
        this.flipAngle = 0
        this.scaleX = 1.22
        this.scaleY = 0.78
        particles?.addFootstepDust(this.x + this.width / 2, this.groundY, this.skin.color)
      }
    }

    // scarf: two verlet-ish ribbons trailing from the neck
    const neckX = this.x + (this.isSliding ? 14 : 16)
    const neckY = this.y + (this.isSliding ? 11 : 19)
    this.scarfPointsA[0].x = neckX
    this.scarfPointsA[0].y = neckY
    this.scarfPointsB[0].x = neckX
    this.scarfPointsB[0].y = neckY + 2.5
    for (let i = 1; i < this.scarfPointsA.length; i++) {
      const prevA = this.scarfPointsA[i - 1]
      const a = this.scarfPointsA[i]
      const waveA = this.isSliding
        ? Math.sin(this.idleTimer * 20 - i * 0.8) * 1.5
        : Math.sin(this.animTimer * 1.3 - i * 0.65) * (3 + i * 1.4)
      const targetAX = prevA.x - (this.isSliding ? 9.5 : 7) - Math.min(speed * 0.65, 8.5)
      const targetAY = prevA.y + waveA * 0.5 + this.vy * 0.16
      a.x += (targetAX - a.x) * (20 * dt)
      a.y += (targetAY - a.y) * (22 * dt)
      const prevB = this.scarfPointsB[i - 1]
      const b = this.scarfPointsB[i]
      const waveB = this.isSliding
        ? Math.cos(this.idleTimer * 20 - i * 0.8) * 1.5
        : Math.cos(this.animTimer * 1.3 - i * 0.65) * (2.8 + i * 1.2)
      const targetBX = prevB.x - (this.isSliding ? 9 : 6.5) - Math.min(speed * 0.65, 8)
      const targetBY = prevB.y + waveB * 0.5 + this.vy * 0.16 + 2
      b.x += (targetBX - b.x) * (20 * dt)
      b.y += (targetBY - b.y) * (22 * dt)
    }

    const eyeX = this.x + (this.isSliding ? this.width + 12 : this.width / 2 + 11)
    const eyeY = this.y + (this.isSliding ? 8 : 11)
    this.eyeTrails.push({ x: eyeX, y: eyeY, alpha: 0.85 })
    if (this.eyeTrails.length > 6) this.eyeTrails.shift()
    for (const t of this.eyeTrails) {
      t.x -= speed * 0.4
      t.alpha -= dt * 3.2
    }

    if (powerups.speedBoost || this.isFlipping || (!this.isGrounded && Math.abs(this.vy) > 8)) {
      this.ghostTrails.push({
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        angle: this.isFlipping ? this.flipAngle : this.bodyAngle,
        alpha: powerups.speedBoost ? 0.6 : 0.35,
        color: powerups.speedBoost ? '#00f5ff' : this.skin.trailColor,
      })
      if (powerups.speedBoost && particles && Math.random() < 0.4)
        particles.addSpeedTrail(this.x, this.y, this.width, this.height, this.skin.accent)
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
    const color = this.skin.color
    const accent = this.skin.accent

    ctx.save()
    ctx.strokeStyle = accent
    ctx.lineWidth = 2.2
    ctx.beginPath()
    for (let i = 0; i < this.eyeTrails.length; i++) {
      const t = this.eyeTrails[i]
      if (i === 0) ctx.moveTo(t.x, t.y)
      else ctx.lineTo(t.x, t.y)
    }
    ctx.stroke()
    ctx.restore()

    for (const g of this.ghostTrails) {
      ctx.save()
      ctx.globalAlpha = g.alpha * 0.75
      ctx.fillStyle = g.color
      ctx.translate(g.x + g.width / 2, g.y + g.height / 2)
      ctx.scale(g.scaleX, g.scaleY)
      ctx.rotate(g.angle)
      ctx.beginPath()
      ctx.roundRect(-g.width / 2, -g.height / 2, g.width, g.height, 8)
      ctx.fill()
      ctx.restore()
    }

    ctx.save()
    this.drawScarfRibbon(ctx, this.scarfPointsA, color, 4.2)
    this.drawScarfRibbon(ctx, this.scarfPointsB, color, 3.2)
    ctx.restore()

    const cx = this.x + this.width / 2
    const cy = this.y + this.height / 2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(this.scaleX, this.scaleY)
    const hw = this.width / 2
    const hh = this.height / 2
    if (this.isFlipping) {
      ctx.rotate(this.flipAngle)
      this.drawAcrobaticFlipPose(ctx, hw, hh, color, accent)
    } else if (this.isSliding) {
      this.drawRealisticSlidingPose(ctx, hw, hh, color, accent)
    } else {
      ctx.rotate(this.bodyAngle)
      this.drawArticulatedShinobi(ctx, hw, hh, color, accent)
    }
    ctx.restore()
    this.drawPowerupAuras(ctx, cx, cy, powerups)
    ctx.restore()
  }

  drawAcrobaticFlipPose(ctx: CanvasRenderingContext2D, _hw: number, _hh: number, color: string, accent: string) {
    ctx.save()
    ctx.strokeStyle = accent
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 0, 30, Math.PI * 0.2, Math.PI * 1.8)
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(0, 0, 30, Math.PI * 0.8, Math.PI * 1.5)
    ctx.stroke()
    ctx.restore()
    ctx.fillStyle = '#0a0a14'
    ctx.beginPath()
    ctx.arc(0, 0, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(0, 0, 18, -Math.PI * 0.7, Math.PI * 0.3)
    ctx.stroke()
    ctx.fillStyle = '#475569'
    ctx.beginPath()
    ctx.roundRect(4, -14, 11, 5, 1.5)
    ctx.fill()
    ctx.fillStyle = accent
    ctx.fillRect(8, -8, 7, 2.8)
    ctx.fillStyle = '#141426'
    ctx.beginPath()
    ctx.arc(-8, 6, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(-8, 6, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = accent
    ctx.lineWidth = 2.8
    ctx.beginPath()
    ctx.moveTo(2, 6)
    ctx.lineTo(26, -14)
    ctx.stroke()
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.moveTo(-4, 11)
    ctx.lineTo(2, 6)
    ctx.stroke()
  }

  drawRealisticSlidingPose(ctx: CanvasRenderingContext2D, hw: number, hh: number, color: string, accent: string) {
    ctx.save()
    // sparks scraping off the back foot
    ctx.save()
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 1.8
    const now = Date.now() / 1000
    for (let i = 0; i < 4; i++) {
      const len = 8 + Math.sin(now * 30 + i * 2) * 5
      const sy = hh - 2 + Math.random() * 4
      ctx.beginPath()
      ctx.moveTo(-hw - 10, sy)
      ctx.lineTo(-hw - 10 - len, sy - 3 - Math.random() * 5)
      ctx.stroke()
    }
    ctx.restore()

    // back leg stretched out
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-6, hh - 12)
    ctx.lineTo(-hw - 14, hh - 3)
    ctx.lineWidth = 6.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0a0a16'
    ctx.stroke()
    ctx.fillStyle = '#05050a'
    ctx.beginPath()
    ctx.ellipse(-hw - 16, hh - 2, 7, 3, 0.05, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-hw - 22, hh - 1)
    ctx.lineTo(-hw - 10, hh - 1)
    ctx.stroke()
    ctx.restore()

    // front leg bent
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-4, hh - 12)
    ctx.lineTo(14, hh - 8)
    ctx.lineTo(22, hh - 2)
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#141426'
    ctx.stroke()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(14, hh - 8, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#06060c'
    ctx.beginPath()
    ctx.ellipse(24, hh - 1.5, 7, 3.5, 0.05, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // torso
    ctx.fillStyle = '#0a0a14'
    ctx.beginPath()
    ctx.roundRect(-14, hh - 24, 28, 14, 5)
    ctx.fill()
    ctx.fillStyle = '#111222'
    ctx.beginPath()
    ctx.moveTo(-12, hh - 22)
    ctx.lineTo(12, hh - 22)
    ctx.lineTo(10, hh - 14)
    ctx.lineTo(-10, hh - 14)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.8
    ctx.stroke()
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(0, hh - 16, 2.8, 0, Math.PI * 2)
    ctx.fill()

    // arm reaching to the ground
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(10, hh - 20)
    ctx.lineTo(18, hh - 10)
    ctx.lineTo(22, hh - 3)
    ctx.lineWidth = 4.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#101020'
    ctx.stroke()
    ctx.fillStyle = '#05050a'
    ctx.beginPath()
    ctx.arc(22, hh - 3, 2.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#00f5ff'
    ctx.fillRect(21, hh - 2, 3, 2)
    ctx.restore()

    // katana on the back
    ctx.save()
    const swordY = hh - 19
    const tipX = -hw - 24
    const tipY = hh - 15
    ctx.strokeStyle = accent
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(-10, swordY)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(-14, swordY + 0.6)
    ctx.lineTo(tipX + 8, tipY - 0.4)
    ctx.stroke()
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.moveTo(-10, swordY)
    ctx.lineTo(-2, swordY - 2)
    ctx.stroke()
    ctx.restore()

    // head
    const headY = hh - 26
    ctx.fillStyle = '#090912'
    ctx.beginPath()
    ctx.arc(14, headY, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#475569'
    ctx.beginPath()
    ctx.roundRect(13, headY - 8, 11, 4.5, 1.5)
    ctx.fill()
    ctx.fillStyle = accent
    ctx.fillRect(18, headY - 6.5, 2.5, 1.8)
    ctx.fillStyle = '#05050c'
    ctx.fillRect(17, headY - 2, 8, 4)
    ctx.fillStyle = accent
    ctx.fillRect(18, headY - 1, 6.5, 2.4)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(19, headY - 0.5, 2, 1)
    ctx.restore()
  }

  drawArticulatedShinobi(ctx: CanvasRenderingContext2D, hw: number, hh: number, color: string, accent: string) {
    const running = this.animTimer > 0
    const phase = running ? this.animTimer : 0
    const breathe = Math.sin(this.idleTimer * 2.6) * 1.2
    const bob = running && this.isGrounded ? Math.sin(phase * 2) * 3.4 : 0
    const backSwing = Math.sin(phase)
    const frontSwing = Math.sin(phase + Math.PI)
    const backKneeDeg = this.isGrounded ? (running ? Math.max(0, -Math.cos(phase)) * 42 : 12) : 22
    const frontKneeDeg = this.isGrounded ? (running ? Math.max(0, -Math.cos(phase + Math.PI)) * 42 : 12) : 22

    // back leg
    ctx.save()
    const bHipY = 4 + (running ? bob : breathe * 0.4)
    const bThigh = this.isGrounded ? (running ? backSwing * 0.82 : -0.15) : -0.32
    const bKneeX = -4 + Math.sin(bThigh) * 16
    const bKneeY = bHipY + Math.cos(bThigh) * 16
    const bShin = bThigh + (Math.PI / 180) * backKneeDeg
    const bFootX = bKneeX + Math.sin(bShin) * 17
    const bFootY = bKneeY + Math.cos(bShin) * 17
    ctx.beginPath()
    ctx.moveTo(-4, bHipY)
    ctx.lineTo(bKneeX, bKneeY)
    ctx.lineWidth = 7.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#080814'
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(bKneeX, bKneeY)
    ctx.lineTo(bFootX, bFootY)
    ctx.lineWidth = 6.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#06060e'
    ctx.stroke()
    const bFootAngle = backSwing > 0 ? 0.35 : -0.25
    ctx.fillStyle = '#05050a'
    ctx.beginPath()
    ctx.ellipse(bFootX + 3, bFootY + 1, 6.5, 3.2, bFootAngle, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // katana across the back
    ctx.save()
    const hiltX = -hw + 4
    const hiltY = -hh + 34 + (running ? bob * 0.7 : 0)
    const tipX = hw - 2
    const tipY = -hh - 8 + (running ? bob * 0.7 : 0)
    ctx.strokeStyle = '#05050c'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.moveTo(hiltX, hiltY)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(hiltX + 2, hiltY - 2)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(hiltX - 6, hiltY + 6)
    ctx.lineTo(hiltX, hiltY)
    ctx.stroke()
    ctx.fillStyle = '#1e1e2f'
    ctx.fillRect(hiltX - 2, hiltY - 3, 4, 6)
    ctx.restore()

    // torso
    const torsoY = -hh + 17 + (running ? bob : breathe)
    ctx.fillStyle = '#0a0a14'
    ctx.beginPath()
    ctx.roundRect(-hw + 8, torsoY, this.width - 16, this.height - 35, 6)
    ctx.fill()
    ctx.fillStyle = '#111222'
    ctx.beginPath()
    ctx.moveTo(-hw + 10, torsoY + 3)
    ctx.lineTo(hw - 10, torsoY + 3)
    ctx.lineTo(hw - 12, torsoY + 16)
    ctx.lineTo(-hw + 12, torsoY + 16)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.8
    ctx.stroke()
    ctx.strokeStyle = '#1d1d32'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(-hw + 11, torsoY + 4)
    ctx.lineTo(hw - 12, torsoY + 22)
    ctx.moveTo(hw - 11, torsoY + 4)
    ctx.lineTo(-hw + 12, torsoY + 22)
    ctx.stroke()
    ctx.fillStyle = '#06060c'
    ctx.fillRect(-hw + 9, torsoY + 21, this.width - 18, 5)
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(0, torsoY + 23.5, 3.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#161628'
    ctx.fillRect(-hw + 11, torsoY + 21.5, 4, 4)
    ctx.fillRect(hw - 15, torsoY + 21.5, 4, 4)

    // front leg
    ctx.save()
    const fHipY = 4 + (running ? bob : breathe * 0.4)
    const fThigh = this.isGrounded ? (running ? frontSwing * 0.82 : 0.18) : 0.42
    const fKneeX = 4 + Math.sin(fThigh) * 16
    const fKneeY = fHipY + Math.cos(fThigh) * 16
    const fShin = fThigh + (Math.PI / 180) * frontKneeDeg
    const fFootX = fKneeX + Math.sin(fShin) * 17
    const fFootY = fKneeY + Math.cos(fShin) * 17
    ctx.beginPath()
    ctx.moveTo(4, fHipY)
    ctx.lineTo(fKneeX, fKneeY)
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#141426'
    ctx.stroke()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(fKneeX, fKneeY, 3.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(fKneeX, fKneeY)
    ctx.lineTo(fFootX, fFootY)
    ctx.lineWidth = 6.8
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f0f1c'
    ctx.stroke()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(fKneeX, fKneeY)
    ctx.lineTo(fFootX, fFootY)
    ctx.stroke()
    const fFootAngle = frontSwing > 0 ? 0.35 : -0.25
    ctx.fillStyle = '#06060c'
    ctx.beginPath()
    ctx.ellipse(fFootX + 4, fFootY + 1.5, 7.5, 3.6, fFootAngle, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(fFootX - 2, fFootY + 4)
    ctx.lineTo(fFootX + 9, fFootY + 4)
    ctx.stroke()
    ctx.restore()

    // head + mask + visor
    const headY = -hh + 10 + (running ? bob * 0.85 : breathe * 0.6)
    ctx.fillStyle = '#0a0a14'
    ctx.beginPath()
    ctx.arc(4, headY, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#10111e'
    ctx.beginPath()
    ctx.moveTo(-2, headY + 3)
    ctx.lineTo(13, headY + 3)
    ctx.lineTo(10, headY + 11)
    ctx.lineTo(0, headY + 11)
    ctx.closePath()
    ctx.fill()
    const plate = ctx.createLinearGradient(-1, headY - 8, 14, headY - 3)
    plate.addColorStop(0, '#334155')
    plate.addColorStop(0.5, '#64748b')
    plate.addColorStop(1, '#1e293b')
    ctx.fillStyle = plate
    ctx.beginPath()
    ctx.roundRect(2, headY - 8, 12, 5, 1.5)
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(3, headY - 7, 1.5, 1.5)
    ctx.fillRect(11, headY - 7, 1.5, 1.5)
    ctx.fillStyle = accent
    ctx.fillRect(7, headY - 6.5, 2.5, 2)
    ctx.fillStyle = '#05050c'
    ctx.fillRect(6, headY - 1, 9, 4.5)
    ctx.fillStyle = accent
    ctx.fillRect(8, headY, 7, 2.6)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(9, headY + 0.4, 2, 1.2)

    // front arm
    ctx.save()
    const armAngle = this.isGrounded ? (running ? -frontSwing * 0.8 : -0.2) : 0.25
    const shoulderY = -hh + 20 + (running ? bob * 0.85 : breathe)
    const elbowX = 2 + Math.sin(armAngle) * 12
    const elbowY = shoulderY + Math.cos(armAngle) * 12
    const handX = elbowX + Math.sin(armAngle - 0.45) * 11
    const handY = elbowY + Math.cos(armAngle - 0.45) * 11
    ctx.fillStyle = '#141424'
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(2, shoulderY, 4.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(2, shoulderY)
    ctx.lineTo(elbowX, elbowY)
    ctx.lineTo(handX, handY)
    ctx.lineWidth = 4.8
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#111122'
    ctx.stroke()
    ctx.fillStyle = '#06060c'
    ctx.beginPath()
    ctx.arc(handX, handY, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = accent
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(handX, handY)
    ctx.lineTo(handX + 11, handY + 6)
    ctx.stroke()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(handX - 2, handY - 1, 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  drawScarfRibbon(ctx: CanvasRenderingContext2D, points: Point[], color: string, thickness: number) {
    if (points.length < 2) return
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.lineWidth = thickness
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y - thickness * 0.5)
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y - (thickness * 0.5 - i * 0.3))
    for (let i = points.length - 1; i >= 0; i--) ctx.lineTo(points[i].x, points[i].y + (thickness * 0.5 - i * 0.2))
    ctx.closePath()
    ctx.fill()
  }

  drawPowerupAuras(ctx: CanvasRenderingContext2D, cx: number, cy: number, powerups: PlayerPowerups) {
    if (powerups.shield) {
      const r = Math.max(this.width, this.height) * 0.78 + Math.sin(Date.now() / 140) * 3
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, r + 3, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.35)'
      ctx.lineWidth = 3.5
      ctx.stroke()
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)'
      ctx.fill()
      const spin = Date.now() / 350
      for (let i = 0; i < 4; i++) {
        const a = spin + (i * Math.PI) / 2
        ctx.fillStyle = '#67e8f9'
        ctx.beginPath()
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    if (powerups.magnet) {
      const ring = (Date.now() / 22) % 45
      ctx.save()
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.85)'
      ctx.lineWidth = 2
      ctx.globalAlpha = Math.max(0, 1 - ring / 45)
      ctx.beginPath()
      ctx.arc(cx, cy, 26 + ring, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    if (powerups.speedBoost) {
      ctx.save()
      ctx.strokeStyle = '#00f5ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx + this.width, cy)
      ctx.lineTo(cx - 24, cy - 14)
      ctx.lineTo(cx - 24, cy + 14)
      ctx.closePath()
      ctx.fillStyle = 'rgba(0, 245, 255, 0.18)'
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
  }

  getHitbox(): Hitbox {
    return { x: this.x + 7, y: this.y + 6, width: this.width - 14, height: this.height - 6 - 2 }
  }
}
