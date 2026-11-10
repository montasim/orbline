export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  life: number
  maxLife: number
  length?: number
  isStreak?: boolean
}

export interface FloatingText {
  x: number
  y: number
  text: string
  color: string
  alpha: number
  vy: number
  life: number
  maxLife: number
}

export interface Shockwave {
  x: number
  y: number
  radius: number
  maxRadius: number
  color: string
  alpha: number
  lineWidth: number
}

export class ParticleSystem {
  particles: Particle[] = []
  floatingTexts: FloatingText[] = []
  shockwaves: Shockwave[] = []

  reset() {
    this.particles = []
    this.floatingTexts = []
    this.shockwaves = []
  }

  addFootstepDust(x: number, y: number, color = '#6b7280') {
    if (this.particles.length > 50) return
    this.particles.push({
      x: x + (Math.random() * 6 - 3),
      y: y - 2,
      vx: -2 - Math.random() * 1.5,
      vy: -0.5 - Math.random() * 1,
      size: 2 + Math.random() * 2,
      color,
      alpha: 0.6,
      life: 0.22,
      maxLife: 0.22,
    })
  }

  addJumpBurst(x: number, y: number, color = '#a855f7') {
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI * 0.5 + (Math.random() * 1.2 - 0.6)
      const speed = 2 + Math.random() * 3
      this.particles.push({
        x,
        y,
        vx: -Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 2.5,
        color,
        alpha: 0.9,
        life: 0.3,
        maxLife: 0.3,
      })
    }
  }

  addDoubleJumpEffect(x: number, y: number, color = '#00f5ff') {
    this.shockwaves.push({ x, y, radius: 8, maxRadius: 40, color, alpha: 1, lineWidth: 3 })
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const speed = 3 + Math.random() * 2.5
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 2,
        color,
        alpha: 1,
        life: 0.35,
        maxLife: 0.35,
      })
    }
  }

  addCoinCollect(x: number, y: number, text = '+1') {
    this.floatingTexts.push({ x, y, text, color: '#fbbf24', alpha: 1, vy: -1.8, life: 0.6, maxLife: 0.6 })
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 3
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2.5,
        color: Math.random() > 0.5 ? '#fbbf24' : '#fef08a',
        alpha: 1,
        life: 0.3,
        maxLife: 0.3,
      })
    }
  }

  addShieldBreak(x: number, y: number) {
    this.shockwaves.push({ x, y, radius: 12, maxRadius: 55, color: '#38bdf8', alpha: 1, lineWidth: 4 })
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 5
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color: '#38bdf8',
        alpha: 1,
        life: 0.4,
        maxLife: 0.4,
      })
    }
  }

  addExplosion(x: number, y: number, color = '#ef4444') {
    this.shockwaves.push({ x, y, radius: 15, maxRadius: 65, color: '#ff4444', alpha: 1, lineWidth: 5 })
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 6
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.4 ? color : '#f97316',
        alpha: 1,
        life: 0.45,
        maxLife: 0.45,
      })
    }
  }

  addSpeedTrail(x: number, y: number, _width: number, height: number, color = '#00f5ff') {
    if (this.particles.length > 40) return
    this.particles.push({
      x: x - Math.random() * 8,
      y: y + Math.random() * height,
      vx: -(6 + Math.random() * 4),
      vy: (Math.random() - 0.5) * 1.2,
      size: 2 + Math.random() * 2,
      length: 12 + Math.random() * 14,
      color,
      alpha: 0.7,
      life: 0.2,
      maxLife: 0.2,
      isStreak: true,
    })
  }

  update(dt: number) {
    if (this.particles.length > 60) this.particles.splice(0, this.particles.length - 60)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt
      if (p.life <= 0) this.particles.splice(i, 1)
      else {
        p.x += p.vx
        p.y += p.vy
        p.alpha = Math.max(0, p.life / p.maxLife)
      }
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i]
      t.life -= dt
      if (t.life <= 0) this.floatingTexts.splice(i, 1)
      else {
        t.y += t.vy
        t.alpha = Math.max(0, t.life / t.maxLife)
      }
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i]
      s.radius += (s.maxRadius - s.radius) * 10 * dt
      s.alpha = Math.max(0, 1 - s.radius / s.maxRadius)
      if (s.alpha <= 0.05 || s.radius >= s.maxRadius - 2) this.shockwaves.splice(i, 1)
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    for (const s of this.shockwaves) {
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.lineWidth * s.alpha
      ctx.globalAlpha = s.alpha
      ctx.stroke()
    }
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      if (p.isStreak) ctx.rect(p.x, p.y, p.length || 15, p.size)
      else ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.font = 'bold 15px "Orbitron", sans-serif'
    ctx.textAlign = 'center'
    for (const t of this.floatingTexts) {
      ctx.globalAlpha = t.alpha
      ctx.fillStyle = t.color
      ctx.fillText(t.text, t.x, t.y)
    }
    ctx.restore()
  }
}
