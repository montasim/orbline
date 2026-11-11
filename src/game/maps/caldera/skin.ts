// Cinder Caldera obstacle and pickup art. Everything stays inside the obstacle's own box so the
// (unchanged) hitboxes stay fair; light comes from below and from the lava inside each object.
import { mix } from '../../engine/background'
import type { Coin, Obstacle } from '../../engine/obstacles'
import type { Skin, Tier } from '../types'
import { PALETTES, type Palette } from './scene'

const TAU = Math.PI * 2
type Pt = [number, number]

const poly = (ctx: CanvasRenderingContext2D, pts: Pt[]) => {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
}

/** Wide dim stroke + thin hot core: a glowing seam without shadowBlur. */
const glowLine = (ctx: CanvasRenderingContext2D, p: Palette, a: number, wide = 3.2) => {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = mix(p.lava, p.lava, 0, 0.4 * a)
  ctx.lineWidth = wide
  ctx.stroke()
  ctx.strokeStyle = mix(p.hot, '#ffffff', 0.15, 0.95 * a)
  ctx.lineWidth = 1.1
  ctx.stroke()
}

/** Warm light pooled under an object, clipped to its box. */
const underGlow = (ctx: CanvasRenderingContext2D, o: Obstacle, p: Palette, a: number) => {
  const { x, y, width: w, height: h } = o
  const g = ctx.createRadialGradient(x + w / 2, y + h, 0, x + w / 2, y + h, w * 0.6)
  g.addColorStop(0, mix(p.lava, p.lava, 0, a))
  g.addColorStop(1, mix(p.lava, p.lava, 0, 0))
  ctx.fillStyle = g
  ctx.fillRect(x, y + h * 0.4, w, h * 0.6)
  // soft contact shadow grounding it
  const s = ctx.createRadialGradient(x + w / 2, y + h, 0, x + w / 2, y + h, w * 0.55)
  s.addColorStop(0, 'rgba(4, 1, 1, 0.75)')
  s.addColorStop(1, 'rgba(4, 1, 1, 0)')
  ctx.fillStyle = s
  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + h, w * 0.55, 4, 0, 0, TAU)
  ctx.fill()
}

/** ~1.5px near-black outline so obstacles separate from the red scenery behind them. */
const OUTLINE = '#050203'
const outline = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'
  ctx.stroke()
}

function obsidianBoulder(ctx: CanvasRenderingContext2D, o: Obstacle, p: Palette) {
  const { x, y, width: w, height: h } = o
  const pulse = 0.75 + 0.25 * Math.sin(o.animTimer * 3)
  const P = (fx: number, fy: number): Pt => [x + w * fx, y + h * fy]
  underGlow(ctx, o, p, 0.35)
  const shape = [P(0.04, 1), P(0, 0.6), P(0.15, 0.28), P(0.38, 0.05), P(0.64, 0.02), P(0.87, 0.22), P(1, 0.6), P(0.96, 1)]
  const body = ctx.createLinearGradient(x, y, x + w, y + h)
  body.addColorStop(0, '#2b2128')
  body.addColorStop(0.5, '#110c10')
  body.addColorStop(1, '#050304')
  ctx.fillStyle = body
  poly(ctx, shape)
  ctx.fill()
  ctx.save()
  ctx.clip()
  // glassy facets catching the sky glow
  ctx.fillStyle = 'rgba(190, 160, 180, 0.16)'
  poly(ctx, [P(0.15, 0.28), P(0.38, 0.05), P(0.64, 0.02), P(0.5, 0.36)])
  ctx.fill()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  poly(ctx, [P(0.64, 0.02), P(0.87, 0.22), P(1, 0.6), P(0.62, 0.5), P(0.5, 0.36)])
  ctx.fill()
  // lit from below by the lava ground
  const rim = ctx.createLinearGradient(0, y + h, 0, y + h * 0.5)
  rim.addColorStop(0, mix(p.lava, p.lava, 0, 0.55))
  rim.addColorStop(1, mix(p.lava, p.lava, 0, 0))
  ctx.fillStyle = rim
  ctx.fillRect(x, y + h * 0.5, w, h * 0.5)
  ctx.restore()
  poly(ctx, shape)
  outline(ctx)
  // sharp specular edge
  ctx.strokeStyle = 'rgba(255, 225, 210, 0.6)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(...P(0.17, 0.3))
  ctx.lineTo(...P(0.38, 0.08))
  ctx.lineTo(...P(0.6, 0.05))
  ctx.stroke()
  // glowing cracks
  ctx.beginPath()
  ctx.moveTo(...P(0.2, 0.97))
  ctx.lineTo(...P(0.3, 0.72))
  ctx.lineTo(...P(0.27, 0.54))
  ctx.lineTo(...P(0.44, 0.4))
  ctx.moveTo(...P(0.3, 0.72))
  ctx.lineTo(...P(0.5, 0.79))
  ctx.lineTo(...P(0.6, 0.97))
  ctx.moveTo(...P(0.72, 0.34))
  ctx.lineTo(...P(0.79, 0.52))
  ctx.lineTo(...P(0.92, 0.64))
  glowLine(ctx, p, pulse)
}

// fixed jitter so every magma block is cracked the same way
const JIT: Pt[] = [
  [0.09, -0.08],
  [-0.1, 0.06],
  [0.07, 0.1],
  [-0.06, -0.07],
  [0.11, 0.04],
  [-0.08, 0.09],
  [0.05, -0.1],
  [-0.04, 0.07],
]

/** Splits a face (u,v → point) into a grid of crust plates leaving glowing gaps between them. */
function plates(ctx: CanvasRenderingContext2D, face: (u: number, v: number) => Pt, cols: number, rows: number, color: string | CanvasGradient) {
  const pt = (i: number, j: number): Pt => {
    // interior points wander; edge points slide only along their edge
    const [ju, jv] = JIT[(i * 3 + j * 5) % JIT.length]
    return face(i / cols + (i % cols ? ju : 0), j / rows + (j % rows ? jv : 0))
  }
  ctx.fillStyle = color
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const q = [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)]
      const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4
      const cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4
      poly(
        ctx,
        q.map(([px, py]) => [cx + (px - cx) * 0.88, cy + (py - cy) * 0.86] as Pt),
      )
      ctx.fill()
    }
}

function magmaBlock(ctx: CanvasRenderingContext2D, o: Obstacle, p: Palette) {
  const { x, y, width: w, height: h } = o
  const d = 8
  const pulse = 0.8 + 0.2 * Math.sin(o.animTimer * 2.6)
  const front = (u: number, v: number): Pt => [x + u * (w - d), y + d + v * (h - d)]
  const top = (u: number, v: number): Pt => [x + d * (1 - v) + u * (w - d), y + d * v]
  const side = (u: number, v: number): Pt => [x + w - d + u * d, y + d - u * d + v * (h - d)]
  const quad = (f: (u: number, v: number) => Pt) => [f(0, 0), f(1, 0), f(1, 1), f(0, 1)]
  underGlow(ctx, o, p, 0.3)
  // molten interior shows through the seams
  const core = ctx.createLinearGradient(0, y, 0, y + h)
  core.addColorStop(0, mix(p.lava, '#7a1a06', 0.3))
  core.addColorStop(1, mix(p.hot, '#ffffff', 0.1))
  ctx.globalAlpha = pulse
  ctx.fillStyle = core
  for (const f of [front, top, side]) {
    poly(ctx, quad(f))
    ctx.fill()
  }
  ctx.globalAlpha = 1
  const crust = ctx.createLinearGradient(0, y + d, 0, y + h)
  crust.addColorStop(0, '#1d1210')
  crust.addColorStop(0.75, '#140b09')
  crust.addColorStop(1, mix('#140b09', p.lava, 0.35))
  plates(ctx, front, 3, 3, crust)
  plates(ctx, top, 3, 1, '#2e201c')
  plates(ctx, side, 1, 3, '#0a0605')
  poly(ctx, [top(0, 1), top(0, 0), top(1, 0), side(1, 1), side(0, 1), front(0, 1)])
  outline(ctx)
  // front top edge catching the light
  ctx.strokeStyle = mix(p.hot, p.hot, 0, 0.55)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(...top(0, 1))
  ctx.lineTo(...top(1, 1))
  ctx.stroke()
}

function ventShards(ctx: CanvasRenderingContext2D, o: Obstacle, p: Palette) {
  const { x, y, width: w, height: h } = o
  const t = o.animTimer
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  underGlow(ctx, o, p, 0.6)
  // vent mouth
  const vent = ctx.createRadialGradient(x + w / 2, y + h, 0, x + w / 2, y + h, 10)
  vent.addColorStop(0, mix(p.hot, '#ffffff', 0.3))
  vent.addColorStop(1, mix(p.lava, p.lava, 0, 0))
  ctx.fillStyle = vent
  ctx.fillRect(x + w / 2 - 10, y + h - 10, 20, 10)
  // steam rising from the vent between the shards
  for (let k = 0; k < 4; k++) {
    const ph = (t * 0.7 + k / 4) % 1
    const sy = y + h - 4 - ph * (h - 4)
    const sr = 3 + ph * 9
    const sx = x + w / 2 + Math.sin(t * 2 + k * 1.7) * 3 * ph
    const a = 0.3 * (1 - ph) * Math.min(1, ph * 5)
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr)
    g.addColorStop(0, `rgba(255, 226, 210, ${a})`)
    g.addColorStop(1, 'rgba(255, 226, 210, 0)')
    ctx.fillStyle = g
    ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2)
  }
  const shards: [number, number, number][] = [
    [0.1, 0.55, -0.12],
    [0.28, 0.9, -0.08],
    [0.42, 0.62, -0.02],
    [0.62, 1, 0.05],
    [0.8, 0.7, 0.12],
    [0.93, 0.42, 0.18],
  ]
  for (const [fx, fh, lean] of shards) {
    const bx = x + w * fx
    const half = w * 0.085
    const tx = bx + lean * h
    const ty = y + h * (1 - fh)
    const toCentre = fx < 0.5 ? 1 : -1
    // face toward the vent is lit, the other is glass-black
    ctx.fillStyle = toCentre > 0 ? '#090609' : '#2c2028'
    poly(ctx, [
      [bx - half, y + h],
      [tx, ty],
      [bx, y + h],
    ])
    ctx.fill()
    ctx.fillStyle = toCentre > 0 ? '#2c2028' : '#090609'
    poly(ctx, [
      [bx, y + h],
      [tx, ty],
      [bx + half, y + h],
    ])
    ctx.fill()
    poly(ctx, [
      [bx - half, y + h],
      [tx, ty],
      [bx + half, y + h],
    ])
    outline(ctx)
    const lg = ctx.createLinearGradient(0, y + h, 0, ty)
    lg.addColorStop(0, mix(p.hot, p.hot, 0, 0.9))
    lg.addColorStop(1, mix(p.lava, p.lava, 0, 0.15))
    ctx.strokeStyle = lg
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(bx + toCentre * half * 0.9, y + h)
    ctx.lineTo(tx, ty)
    ctx.stroke()
  }
  ctx.restore()
}

/** Pillar: a glossy obsidian spire veined with molten lava — unlike the matte basalt scenery. */
function obsidianSpire(ctx: CanvasRenderingContext2D, o: Obstacle, p: Palette) {
  const { x, y, width: w, height: h } = o
  const t = o.animTimer
  const pulse = 0.72 + 0.28 * Math.sin(t * 2.4)
  const P = (fx: number, fy: number): Pt => [x + w * fx, y + h * fy]
  underGlow(ctx, o, p, 0.5)
  const shape = [P(0.02, 1), P(0.1, 0.62), P(0.2, 0.3), P(0.34, 0.1), P(0.5, 0), P(0.62, 0.12), P(0.72, 0.08), P(0.82, 0.34), P(0.9, 0.66), P(0.98, 1)]
  // glassy black body: lit left facet, near-black right facet, split by a sharp ridge
  const body = ctx.createLinearGradient(x, 0, x + w, 0)
  body.addColorStop(0, '#3a2a36')
  body.addColorStop(0.45, '#17101a')
  body.addColorStop(0.55, '#07040a')
  body.addColorStop(1, '#0c070c')
  ctx.fillStyle = body
  poly(ctx, shape)
  ctx.fill()
  ctx.save()
  ctx.clip()
  const heat = ctx.createLinearGradient(0, y + h, 0, y + h * 0.45)
  heat.addColorStop(0, mix(p.lava, p.lava, 0, 0.6))
  heat.addColorStop(1, mix(p.lava, p.lava, 0, 0))
  ctx.fillStyle = heat
  ctx.fillRect(x, y + h * 0.45, w, h * 0.55)
  ctx.restore()
  // specular ridge
  ctx.strokeStyle = 'rgba(255, 228, 220, 0.55)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(...P(0.5, 0.02))
  ctx.lineTo(...P(0.46, 0.4))
  ctx.lineTo(...P(0.5, 0.75))
  ctx.stroke()
  // molten veins branching up from the base
  ctx.beginPath()
  ctx.moveTo(...P(0.3, 1))
  ctx.lineTo(...P(0.36, 0.82))
  ctx.lineTo(...P(0.28, 0.66))
  ctx.lineTo(...P(0.4, 0.48))
  ctx.lineTo(...P(0.36, 0.3))
  ctx.moveTo(...P(0.36, 0.82))
  ctx.lineTo(...P(0.62, 0.7))
  ctx.lineTo(...P(0.7, 0.52))
  ctx.moveTo(...P(0.4, 0.48))
  ctx.lineTo(...P(0.6, 0.38))
  ctx.moveTo(...P(0.75, 1))
  ctx.lineTo(...P(0.7, 0.86))
  ctx.lineTo(...P(0.8, 0.74))
  glowLine(ctx, p, pulse, 3.4)
  poly(ctx, shape)
  outline(ctx)
  // hot rim up the left edge, lit from below
  const rim = ctx.createLinearGradient(0, y + h, 0, y + h * 0.2)
  rim.addColorStop(0, mix(p.hot, p.hot, 0, 0.95))
  rim.addColorStop(1, mix(p.lava, p.lava, 0, 0))
  ctx.strokeStyle = rim
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(...P(0.08, 0.98))
  ctx.lineTo(...P(0.14, 0.62))
  ctx.lineTo(...P(0.23, 0.3))
  ctx.stroke()
}

// lumpy crust outline of the lava bomb, as [angle, radius factor]
const BOMB: Pt[] = [
  [0, 1],
  [0.75, 0.88],
  [1.4, 1],
  [2.1, 0.9],
  [2.8, 1],
  [3.5, 0.86],
  [4.2, 0.98],
  [4.9, 0.9],
  [5.6, 1],
]
// how far in each crust vertex's crack runs, and which outer vertices each plate spans
const BOMB_IN = [0.5, 0.34, 0.46, 0.3, 0.52, 0.38, 0.33, 0.5, 0.4]
const BOMB_PLATES = [
  [0, 1, 2],
  [2, 3, 4],
  [4, 5, 6],
  [6, 7, 8, 0],
]

/** Lava bomb: a molten rock with a cracked crust, trailing flame and smoke behind it (to the right). */
function lavaBomb(ctx: CanvasRenderingContext2D, o: Obstacle, p: Palette) {
  const { x, y, width: w, height: h } = o
  const t = o.animTimer
  const R = 12
  const cx = x + R + 4
  const cy = y + h / 2
  const pulse = 0.75 + 0.25 * Math.sin(t * 6)
  // its shadow on the ground
  ctx.fillStyle = 'rgba(4, 1, 1, 0.35)'
  ctx.beginPath()
  ctx.ellipse(cx + 2, o.groundY - 1, 15, 3, 0, 0, TAU)
  ctx.fill()
  // smoke puffs drifting off the tail
  for (let k = 0; k < 4; k++) {
    const ph = (t * 1.4 + k / 4) % 1
    const r = 3 + ph * 4
    const sx = Math.min(x + w - r, cx + 14 + ph * (w - R - 22))
    const sy = cy - 2 - ph * 5 + Math.sin(t * 4 + k) * 1.5
    ctx.fillStyle = `rgba(48, 36, 36, ${0.5 * (1 - ph)})`
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, TAU)
    ctx.fill()
  }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // soft heat halo
  const halo = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, h / 2)
  halo.addColorStop(0, mix(p.lava, p.lava, 0, 0.35 * pulse))
  halo.addColorStop(1, mix(p.lava, p.lava, 0, 0))
  ctx.fillStyle = halo
  ctx.fillRect(x, y, w * 0.6, h)
  // flame trail: three flickering tongues streaming back from the rock
  for (const [dy, len, a] of [
    [-5, 26, 0.55],
    [0, 34, 0.8],
    [5, 24, 0.55],
  ]) {
    const L = len + Math.sin(t * 14 + dy) * 3
    const g = ctx.createLinearGradient(cx, 0, cx + L, 0)
    g.addColorStop(0, mix(p.hot, '#ffffff', 0.2, a))
    g.addColorStop(0.4, mix(p.lava, p.lava, 0, a * 0.8))
    g.addColorStop(1, mix(p.lava, p.lava, 0, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(cx, cy + dy - 6)
    ctx.quadraticCurveTo(cx + L * 0.5, cy + dy - 4 + Math.sin(t * 11 + dy) * 2, cx + L, cy + dy + Math.sin(t * 9 + dy) * 2)
    ctx.quadraticCurveTo(cx + L * 0.5, cy + dy + 4 + Math.sin(t * 13 + dy) * 2, cx, cy + dy + 6)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  // the rock, tumbling slowly
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-t * 2.5)
  const shape = BOMB.map(([a, f]) => [Math.cos(a) * R * f, Math.sin(a) * R * f] as Pt)
  // molten interior shows through the cracks
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
  core.addColorStop(0, mix(p.hot, '#ffffff', 0.35))
  core.addColorStop(1, p.lava)
  ctx.fillStyle = core
  poly(ctx, shape)
  ctx.fill()
  // crust: a few irregular plates round an off-centre cap; the molten core glows through the gaps
  const inner = shape.map(([px, py], i) => [px * BOMB_IN[i] + 1.5, py * BOMB_IN[i] - 1] as Pt)
  const crust = ctx.createLinearGradient(-R, -R, R, R)
  crust.addColorStop(0, '#3a2620')
  crust.addColorStop(1, '#0d0706')
  ctx.fillStyle = crust
  for (const g of BOMB_PLATES) {
    const q = [...g.map((i) => shape[i]), ...[...g].reverse().map((i) => inner[i])]
    const mx = q.reduce((s, v) => s + v[0], 0) / q.length
    const my = q.reduce((s, v) => s + v[1], 0) / q.length
    poly(
      ctx,
      q.map(([px, py]) => [mx + (px - mx) * 0.88, my + (py - my) * 0.86] as Pt),
    )
    ctx.fill()
  }
  poly(
    ctx,
    inner.map(([px, py]) => [1.5 + (px - 1.5) * 0.78, -1 + (py + 1) * 0.78] as Pt),
  )
  ctx.fill()
  poly(ctx, shape)
  outline(ctx)
  ctx.restore()
  // hot rim on the leading (lower) edge, lit by its own trail and the lava below
  ctx.strokeStyle = mix(p.hot, p.hot, 0, 0.7 * pulse)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(cx, cy, R - 1, 0.3, 1.9)
  ctx.stroke()
}

function emberCrystal(ctx: CanvasRenderingContext2D, c: Coin, p: Palette) {
  const t = c.animTimer
  const y = c.y + Math.sin(t) * 3
  const r = c.radius
  const flicker = 0.78 + 0.12 * Math.sin(t * 2.3) + 0.1 * Math.sin(t * 5.9 + 1)
  ctx.save()
  ctx.translate(c.x, y)
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, r + 10)
  glow.addColorStop(0, mix(p.lava, p.lava, 0, 0.5 * flicker))
  glow.addColorStop(1, mix(p.lava, p.lava, 0, 0))
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, r + 10, 0, TAU)
  ctx.fill()
  ctx.rotate(Math.sin(t * 0.5) * 0.14)
  const T: Pt = [0, -r * 1.12]
  const B: Pt = [0, r * 1.02]
  const UL: Pt = [-r * 0.6, -r * 0.32]
  const UR: Pt = [r * 0.6, -r * 0.32]
  const LL: Pt = [-r * 0.6, r * 0.38]
  const LR: Pt = [r * 0.6, r * 0.38]
  const M: Pt = [r * 0.08, -r * 0.1]
  // facets: lit upper-left, deep right
  ctx.fillStyle = '#ffe3a0'
  poly(ctx, [T, UL, M])
  ctx.fill()
  ctx.fillStyle = mix(p.hot, '#ff9a3a', 0.4)
  poly(ctx, [T, M, UR])
  ctx.fill()
  ctx.fillStyle = '#ff9a32'
  poly(ctx, [UL, LL, B, M])
  ctx.fill()
  ctx.fillStyle = mix(p.lava, '#8a1c06', 0.35)
  poly(ctx, [M, B, LR, UR])
  ctx.fill()
  // molten core
  const core = ctx.createRadialGradient(0, r * 0.05, 0, 0, r * 0.05, r * 0.7)
  core.addColorStop(0, `rgba(255, 250, 220, ${0.75 * flicker})`)
  core.addColorStop(1, 'rgba(255, 200, 120, 0)')
  ctx.fillStyle = core
  poly(ctx, [T, UR, LR, B, LL, UL])
  ctx.fill()
  ctx.strokeStyle = 'rgba(70, 14, 4, 0.75)'
  ctx.lineWidth = 1
  ctx.lineJoin = 'round'
  ctx.stroke()
  // glint
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * flicker})`
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-r * 0.42, -r * 0.3)
  ctx.lineTo(-r * 0.08, -r * 0.85)
  ctx.stroke()
  ctx.restore()
}

export const calderaSkin: Skin = {
  // dark rock on dark rock: a hot ember rim instead of a shadow
  outline: 'rgba(251, 146, 60, 0.95)',
  drawObstacle(ctx, o, tier: Tier) {
    const p = PALETTES[tier]
    ctx.save()
    switch (o.type) {
      case 'boulder':
        obsidianBoulder(ctx, o, p)
        break
      case 'iceblock':
        magmaBlock(ctx, o, p)
        break
      case 'icespikes':
        ventShards(ctx, o, p)
        break
      case 'pillar':
        obsidianSpire(ctx, o, p)
        break
      case 'flyer':
        lavaBomb(ctx, o, p)
        break
      default:
        ctx.restore()
        return false
    }
    ctx.restore()
    return true
  },
  drawCrystal(ctx, c, tier: Tier) {
    if (c.collected) return true
    emberCrystal(ctx, c, PALETTES[tier])
    return true
  },
}
