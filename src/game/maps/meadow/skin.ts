import { mix } from '../../engine/background'
import type { Coin, Obstacle } from '../../engine/obstacles'
import type { Skin, Tier } from '../types'
import { PALETTES } from './scene'

type C2D = CanvasRenderingContext2D
const TAU = Math.PI * 2

/** soft contact shadow, stretched away from the sun (to the left) in Golden Hour */
function contact(ctx: C2D, cx: number, by: number, rx: number, tier: Tier) {
  const p = PALETTES[tier]
  const L = p.shadow * rx * 1.2
  const k = ink(tier)
  ctx.fillStyle = mix(k, k, 0, 0.22)
  ctx.beginPath()
  ctx.ellipse(cx - L * 0.6, by + 1.5, rx + 4 + L * 0.6, 5, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = mix(k, k, 0, 0.4)
  ctx.beginPath()
  ctx.ellipse(cx - L * 0.3, by + 0.5, rx * 0.85 + L * 0.3, 2.6, 0, 0, TAU)
  ctx.fill()
}

/** obstacles get a dark warm ink line so they read as danger against the scenery */
const ink = (tier: Tier) => mix(PALETTES[tier].shade, '#2a1a10', 0.55)
/** strokes the path (or the current one); width 3 stroked under a refill gives a 1.5px outer line */
function inkLine(ctx: C2D, tier: Tier, path?: Path2D, width = 1.5) {
  ctx.strokeStyle = ink(tier)
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  if (path) ctx.stroke(path)
  else ctx.stroke()
}

function hayBale(ctx: C2D, o: Obstacle, tier: Tier) {
  const p = PALETTES[tier]
  const { x, y, width: w, height: h } = o
  contact(ctx, x + w / 2, y + h, w * 0.5, tier)
  const fr = 10 // face half-width (ellipse rx)
  const fx = x + w - fr - 1
  // rolled side
  const side = ctx.createLinearGradient(0, y, 0, y + h)
  side.addColorStop(0, mix('#f6cc5a', p.glow, 0.3))
  side.addColorStop(0.45, '#e2a62f')
  side.addColorStop(1, mix('#a8701e', p.shade, 0.2))
  const body = new Path2D()
  body.ellipse(x + fr + 1, y + h / 2, fr, h / 2 - 0.75, 0, Math.PI * 0.5, Math.PI * 1.5)
  body.lineTo(fx, y + 0.75)
  body.lineTo(fx, y + h - 0.75)
  body.closePath()
  inkLine(ctx, tier, body, 3)
  ctx.fillStyle = side
  ctx.fill(body)
  // straw texture
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(138, 96, 34, 0.45)'
  ctx.beginPath()
  for (let i = 1; i < 7; i++) {
    const yy = y + (h * i) / 7
    ctx.moveTo(x + 4, yy)
    ctx.quadraticCurveTo(x + w * 0.4, yy + 1.5, fx - 2, yy - 0.5)
  }
  ctx.stroke()
  ctx.strokeStyle = mix('#fff0b8', p.glow, 0.3, 0.55)
  ctx.beginPath()
  for (let i = 1; i < 5; i++) {
    const yy = y + (h * i) / 9
    ctx.moveTo(x + 8, yy + 2)
    ctx.quadraticCurveTo(x + w * 0.4, yy + 3, fx - 4, yy + 1)
  }
  ctx.stroke()
  // twine
  ctx.strokeStyle = '#9a5a2e'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  for (const t of [0.36, 0.62]) {
    ctx.moveTo(x + w * t, y + 1)
    ctx.quadraticCurveTo(x + w * t - 2, y + h / 2, x + w * t, y + h - 1)
  }
  ctx.stroke()
  // sunlit end face with the spiral roll
  const face = ctx.createRadialGradient(fx + 2, y + h * 0.42, 1, fx, y + h / 2, h / 2)
  face.addColorStop(0, mix('#ffe9a6', p.glow, 0.3))
  face.addColorStop(1, '#d4a443')
  ctx.fillStyle = face
  ctx.beginPath()
  ctx.ellipse(fx, y + h / 2, fr, h / 2 - 0.75, 0, 0, TAU)
  ctx.fill()
  inkLine(ctx, tier)
  ctx.strokeStyle = 'rgba(150, 104, 36, 0.6)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (const k of [0.28, 0.55, 0.8]) {
    ctx.moveTo(fx + fr * k, y + h / 2)
    ctx.ellipse(fx, y + h / 2, fr * k, (h / 2) * k, 0, 0, TAU * 0.85)
  }
  ctx.stroke()
  // loose straws on top
  ctx.strokeStyle = '#f3d27a'
  ctx.beginPath()
  ctx.moveTo(x + 12, y + 2)
  ctx.lineTo(x + 7, y - 0)
  ctx.moveTo(x + 22, y + 1.5)
  ctx.lineTo(x + 26, y)
  ctx.stroke()
}

function appleCrate(ctx: C2D, o: Obstacle, tier: Tier) {
  const p = PALETTES[tier]
  const { x, y, width: w, height: h } = o
  contact(ctx, x + w / 2, y + h, w * 0.5, tier)
  const top = y + 15
  // apples heaped above the rim
  for (const [ax, ay, r] of [
    [9, 10, 7],
    [33, 9, 7],
    [21, 7, 7],
    [41, 12, 6],
    [14, 14, 6.5],
    [28, 14, 6.5],
  ]) {
    const cx = x + ax
    const cy = y + ay
    const ap = ctx.createRadialGradient(cx + r * 0.35, cy - r * 0.35, 0.5, cx, cy, r)
    ap.addColorStop(0, mix('#ff9a86', p.glow, 0.25))
    ap.addColorStop(0.45, '#d83a2e')
    ap.addColorStop(1, mix('#8a1d1a', p.shade, 0.2))
    ctx.fillStyle = ap
    ctx.beginPath()
    ctx.arc(cx, cy, r - 0.5, 0, TAU)
    inkLine(ctx, tier, undefined, 2.4)
    ctx.fill()
    ctx.strokeStyle = '#5b3a24'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(cx, cy - r + 1.5)
    ctx.lineTo(cx + 1, cy - r - 1.5)
    ctx.stroke()
  }
  ctx.fillStyle = '#5fae4a'
  ctx.beginPath()
  ctx.ellipse(x + 24, y + 1.8, 3.2, 1.5, -0.5, 0, TAU)
  ctx.fill()
  // crate body
  const wood = ctx.createLinearGradient(x, 0, x + w, 0)
  wood.addColorStop(0, mix('#b0743a', p.shade, 0.2))
  wood.addColorStop(0.7, '#cf8f48')
  wood.addColorStop(1, mix('#e8b574', p.glow, 0.3))
  ctx.fillStyle = mix('#6b4528', p.shade, 0.2)
  ctx.fillRect(x, top, w, h - (top - y))
  const ph = (h - (top - y) - 4) / 3
  ctx.fillStyle = wood
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 1, top + 1 + i * (ph + 1.5), w - 2, ph)
  // corner posts
  ctx.fillStyle = mix('#9c6b3c', p.shade, 0.15)
  ctx.fillRect(x, top, 5, h - (top - y))
  ctx.fillStyle = mix('#d9b07a', p.glow, 0.3)
  ctx.fillRect(x + w - 5, top, 5, h - (top - y))
  // lit top edges + nails
  ctx.fillStyle = mix('#fbe2b4', p.glow, 0.4, 0.8)
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 1, top + 1 + i * (ph + 1.5), w - 2, 1.2)
  ctx.fillStyle = '#4a3020'
  for (let i = 0; i < 3; i++) {
    const ny = top + 1 + i * (ph + 1.5) + ph / 2
    ctx.fillRect(x + 2, ny, 1.4, 1.4)
    ctx.fillRect(x + w - 3.5, ny, 1.4, 1.4)
  }
  // stencilled apple mark
  ctx.fillStyle = 'rgba(110, 60, 30, 0.45)'
  ctx.beginPath()
  ctx.arc(x + w / 2, top + ph * 1.5 + 2.5, 4, 0, TAU)
  ctx.fill()
  ctx.beginPath()
  ctx.rect(x + 0.75, top + 0.75, w - 1.5, h - (top - y) - 1.5)
  inkLine(ctx, tier)
}

function thistles(ctx: C2D, o: Obstacle, tier: Tier) {
  const p = PALETTES[tier]
  const { x, y, width: w, height: h } = o
  contact(ctx, x + w / 2, y + h, w * 0.5, tier)
  const leaf = mix('#4c7a45', p.shade, 0.1)
  const leafLit = mix('#8cbf72', p.glow, 0.25)
  const heads: [number, number][] = [
    [0.14, 0.5],
    [0.36, 0.95],
    [0.6, 0.78],
    [0.84, 0.55],
  ]
  // stems, inked underneath
  ctx.beginPath()
  for (const [fx, fh] of heads) {
    const hx = x + w * fx
    const hy = y + 9 + (1 - fh) * (h - 16)
    ctx.moveTo(hx + (fx - 0.5) * 6, y + h)
    ctx.quadraticCurveTo(hx - 2, (hy + y + h) / 2, hx, hy + 4)
  }
  inkLine(ctx, tier, undefined, 4.5)
  ctx.strokeStyle = leaf
  ctx.lineWidth = 2
  ctx.stroke()
  // spiky leaf rosette at the base (zig-zag blades)
  for (const [col, off] of [
    [leaf, 0],
    [leafLit, 3],
  ] as const) {
    ctx.fillStyle = col
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const bx = x + 5 + off + i * ((w - 10) / 4)
      const dir = i % 2 ? 1 : -1
      const L = 12 + (i % 3) * 3
      ctx.moveTo(bx - 3, y + h)
      for (let k = 1; k <= 4; k++) {
        const t = k / 4
        const px = bx + dir * L * t
        const py = y + h - L * 0.75 * t
        ctx.lineTo(px + (k % 2 ? 3 : -1), py + (k % 2 ? -3 : 1))
      }
      ctx.lineTo(bx + 3, y + h)
      ctx.closePath()
    }
    if (off === 0) inkLine(ctx, tier, undefined, 3)
    ctx.fill()
  }
  // heads: spiny green bulb under a purple brush
  for (const [fx, fh] of heads) {
    const hx = x + w * fx
    const hy = y + 9 + (1 - fh) * (h - 16)
    ctx.fillStyle = mix('#7a9a5e', p.shade, 0.1)
    ctx.beginPath()
    ctx.ellipse(hx, hy + 2, 4.6, 4.2, 0, 0, TAU)
    ctx.fill()
    inkLine(ctx, tier, undefined, 1.3)
    // ink behind the purple brush
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let k = -3; k <= 3; k++) {
      ctx.moveTo(hx + k * 0.6, hy - 1)
      ctx.lineTo(hx + k * 1.4, hy - 7 + Math.abs(k) * 0.6)
    }
    inkLine(ctx, tier, undefined, 3.4)
    ctx.strokeStyle = leafLit
    ctx.lineWidth = 0.9
    ctx.beginPath()
    for (const a of [-2.6, -0.5, 0.5, 2.6, 1.6]) {
      ctx.moveTo(hx + Math.cos(a) * 4, hy + 2 + Math.sin(a) * 4)
      ctx.lineTo(hx + Math.cos(a) * 7, hy + 2 + Math.sin(a) * 7)
    }
    ctx.stroke()
    ctx.lineCap = 'round'
    ctx.lineWidth = 1.8
    ctx.strokeStyle = '#9a45c4'
    ctx.beginPath()
    for (let k = -3; k <= 3; k++) {
      ctx.moveTo(hx + k * 0.6, hy - 1)
      ctx.lineTo(hx + k * 1.4, hy - 7 + Math.abs(k) * 0.6)
    }
    ctx.stroke()
    ctx.strokeStyle = mix('#d8a6ef', p.glow, 0.25)
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let k = 0; k <= 3; k++) {
      ctx.moveTo(hx + k * 0.7, hy - 2)
      ctx.lineTo(hx + k * 1.45, hy - 7.2 + k * 0.6)
    }
    ctx.stroke()
    ctx.lineCap = 'butt'
  }
}

function scarecrow(ctx: C2D, o: Obstacle, tier: Tier) {
  const p = PALETTES[tier]
  const { x, y, width: w, height: h } = o
  const cx = x + w / 2
  contact(ctx, cx, y + h, 11, tier)
  ctx.save()
  // a slight sway around the foot of the pole
  ctx.translate(cx, y + h)
  ctx.rotate(Math.sin(o.animTimer * 1.6) * 0.015)
  ctx.translate(-cx, -(y + h))
  const pole = mix('#7a5638', p.shade, 0.15)
  const k = ink(tier)
  // ink silhouette first: pole, shirt+sleeves, head, hat; the fills then leave a ~1.5px rim
  ctx.fillStyle = k
  ctx.fillRect(cx - 3.1, y + 50, 6.2, h - 50)
  const shirtPath = new Path2D()
  shirtPath.moveTo(x + 4, y + 29)
  shirtPath.lineTo(x + w - 4, y + 29)
  shirtPath.lineTo(x + w - 5, y + 58)
  shirtPath.lineTo(x + 5, y + 58)
  shirtPath.closePath()
  shirtPath.rect(x + 0.75, y + 29.5, w - 1.5, 7)
  inkLine(ctx, tier, shirtPath, 3)
  ctx.beginPath()
  ctx.arc(cx, y + 21, 7.5, 0, TAU)
  inkLine(ctx, tier, undefined, 3)
  ctx.beginPath()
  ctx.ellipse(cx, y + 14, w / 2 - 1.25, 2.6, 0, 0, TAU)
  ctx.roundRect(cx - 6, y + 3, 12, 11, [5, 5, 1, 1])
  inkLine(ctx, tier, undefined, 3)
  ctx.fillStyle = pole
  ctx.fillRect(cx - 1.6, y + 50, 3.2, h - 50)
  ctx.fillStyle = mix('#b48a5e', p.glow, 0.2)
  ctx.fillRect(cx + 0.4, y + 50, 1.2, h - 50)
  // shirt + sleeves on the crossbar
  ctx.fillStyle = pole
  ctx.fillRect(x, y + 32, w, 3)
  const shirt = mix('#3f74b8', p.shade, 0.08)
  const shirtLit = mix('#6fa2dc', p.glow, 0.2)
  ctx.fillStyle = shirt
  ctx.fill(shirtPath)
  ctx.fillStyle = shirtLit
  ctx.fillRect(cx + 1, y + 30, w / 2 - 5, 27)
  ctx.fillRect(cx + 1, y + 29.5, w / 2 - 1, 3)
  // plaid lines + patch
  ctx.strokeStyle = 'rgba(30, 50, 80, 0.35)'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  for (const yy of [38, 45, 52]) {
    ctx.moveTo(x + 5, y + yy)
    ctx.lineTo(x + w - 5, y + yy)
  }
  for (const xx of [8, 14]) {
    ctx.moveTo(x + xx, y + 30)
    ctx.lineTo(x + xx, y + 58)
  }
  ctx.stroke()
  ctx.fillStyle = '#d9b36a'
  ctx.fillRect(x + 6, y + 47, 5, 5)
  // straw tufts at cuffs, neck and hem
  ctx.strokeStyle = '#efc964'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (const sx of [x + 0.8, x + 2.2, x + w - 0.8, x + w - 2.2]) {
    ctx.moveTo(sx, y + 36)
    ctx.lineTo(sx + (sx < cx ? -0.3 : 0.3), y + 41)
  }
  for (let k = 0; k < 5; k++) {
    ctx.moveTo(x + 6 + k * 2.5, y + 58)
    ctx.lineTo(x + 5.5 + k * 2.7, y + 62)
  }
  ctx.stroke()
  // burlap head
  const head = ctx.createRadialGradient(cx + 2.5, y + 18, 1, cx, y + 21, 8)
  head.addColorStop(0, mix('#ead3a4', p.glow, 0.3))
  head.addColorStop(1, mix('#b9976a', p.shade, 0.15))
  ctx.fillStyle = head
  ctx.beginPath()
  ctx.arc(cx, y + 21, 7.5, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#3b2a20'
  ctx.fillRect(cx - 4, y + 19, 2, 2)
  ctx.fillRect(cx + 1.5, y + 19, 2, 2)
  ctx.strokeStyle = '#3b2a20'
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.moveTo(cx - 3.5, y + 24.5)
  ctx.quadraticCurveTo(cx, y + 26.5, cx + 3.5, y + 24.5)
  ctx.stroke()
  // straw hat
  ctx.fillStyle = mix('#c9973f', p.shade, 0.1)
  ctx.beginPath()
  ctx.ellipse(cx, y + 14, w / 2 - 1.25, 2.6, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = mix('#ddb05a', p.glow, 0.2)
  ctx.beginPath()
  ctx.roundRect(cx - 6, y + 3, 12, 11, [5, 5, 1, 1])
  ctx.fill()
  ctx.fillStyle = '#b8443a'
  ctx.fillRect(cx - 6, y + 10, 12, 2.4)
  ctx.restore()
}

/** runaway diamond kite: a bow-tie tail streams behind it (to the right) and its broken string trails off */
function kite(ctx: C2D, o: Obstacle, tier: Tier) {
  const p = PALETTES[tier]
  const { x, y, width: w, height: h } = o
  const t = o.animTimer
  const kx = x + 15
  const ky = y + h / 2 - 1
  // shadow on the path
  const k = ink(tier)
  ctx.fillStyle = mix(k, k, 0, 0.26)
  ctx.beginPath()
  ctx.ellipse(kx + 4 - p.shadow * 10, o.groundY + 1, 15 + p.shadow * 8, 3.5, 0, 0, TAU)
  ctx.fill()
  // loose string trailing up to the right
  ctx.lineCap = 'round'
  ctx.strokeStyle = mix('#f4ead2', p.glow, 0.3, 0.85)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(kx + 2, ky)
  ctx.quadraticCurveTo(x + w * 0.62, y + 6 + Math.sin(t * 5) * 3, x + w - 1, y + 2)
  ctx.stroke()
  // tail: a fluttering cord with bow-ties along it
  const tail: [number, number][] = []
  for (let i = 0; i <= 8; i++) {
    const tx = kx + 2 + i * ((x + w - 4 - kx) / 8)
    tail.push([tx, y + h - 8 + Math.sin(t * 9 - i * 0.9) * (0.8 + i * 0.35)])
  }
  ctx.beginPath()
  ctx.moveTo(kx, ky + 15)
  for (const [tx, ty] of tail) ctx.lineTo(tx, ty)
  inkLine(ctx, tier, undefined, 3)
  ctx.strokeStyle = mix('#f4ead2', p.glow, 0.3)
  ctx.lineWidth = 1.2
  ctx.stroke()
  const bowCols = [mix('#3f8fd8', p.shade, 0.1), mix('#f6c445', p.glow, 0.2), mix('#e0473a', p.shade, 0.1)]
  for (const [n, i] of [
    [0, 3],
    [1, 5],
    [2, 8],
  ]) {
    const [bx, by] = tail[i]
    const a = Math.sin(t * 9 - i * 0.9) * 0.5
    ctx.save()
    ctx.translate(bx, by)
    ctx.rotate(a)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-3.5, -3)
    ctx.lineTo(-3.5, 3)
    ctx.closePath()
    ctx.moveTo(0, 0)
    ctx.lineTo(3.5, -3)
    ctx.lineTo(3.5, 3)
    ctx.closePath()
    ctx.fillStyle = bowCols[n]
    inkLine(ctx, tier, undefined, 2.4)
    ctx.fill()
    ctx.restore()
  }
  // the kite itself, leaning into the wind with a gentle wobble
  ctx.save()
  ctx.translate(kx, ky)
  ctx.rotate(-0.22 + Math.sin(t * 3.2) * 0.08)
  const T: [number, number] = [0, -16]
  const R: [number, number] = [11, -4]
  const B: [number, number] = [0, 16]
  const Lf: [number, number] = [-11, -4]
  const C: [number, number] = [0, -4]
  const body = new Path2D()
  body.moveTo(...T)
  body.lineTo(...R)
  body.lineTo(...B)
  body.lineTo(...Lf)
  body.closePath()
  inkLine(ctx, tier, body, 3)
  const red = mix('#e0473a', p.shade, 0.12)
  const redLit = mix('#ff7a5c', p.glow, 0.3)
  const yel = mix('#e9a92c', p.shade, 0.12)
  const yelLit = mix('#ffe27a', p.glow, 0.3)
  for (const [a, b, col] of [
    [T, R, redLit],
    [R, B, yel],
    [B, Lf, red],
    [Lf, T, yelLit],
  ] as const) {
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.moveTo(...C)
    ctx.lineTo(...a)
    ctx.lineTo(...b)
    ctx.closePath()
    ctx.fill()
  }
  // cross spars
  ctx.strokeStyle = mix('#6b4528', p.shade, 0.2, 0.85)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(...T)
  ctx.lineTo(...B)
  ctx.moveTo(...Lf)
  ctx.lineTo(...R)
  ctx.stroke()
  // sunlit edge
  ctx.strokeStyle = mix('#fff6d8', p.glow, 0.3, 0.8)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(1, -14)
  ctx.lineTo(9.5, -4.5)
  ctx.stroke()
  ctx.restore()
  ctx.lineCap = 'butt'
}

const seedSprites = new Map<Tier, HTMLCanvasElement>()

/** golden sunseed: a glowing almond seed with a tiny sprout */
function seedSprite(tier: Tier) {
  let c = seedSprites.get(tier)
  if (c) return c
  const p = PALETTES[tier]
  c = document.createElement('canvas')
  c.width = 48
  c.height = 48
  const g = c.getContext('2d') as C2D
  g.translate(24, 24)
  const halo = g.createRadialGradient(0, 0, 2, 0, 0, 22)
  halo.addColorStop(0, 'rgba(255, 214, 90, 0.55)')
  halo.addColorStop(0.45, 'rgba(255, 200, 70, 0.18)')
  halo.addColorStop(1, 'rgba(255, 200, 70, 0)')
  g.fillStyle = halo
  g.fillRect(-24, -24, 48, 48)
  const seed = new Path2D()
  seed.moveTo(0, -11)
  seed.bezierCurveTo(8, -7, 8, 6, 0, 11)
  seed.bezierCurveTo(-8, 6, -8, -7, 0, -11)
  const body = g.createLinearGradient(6, -8, -6, 9)
  body.addColorStop(0, mix('#fff6c4', p.glow, 0.3))
  body.addColorStop(0.4, '#ffc93a')
  body.addColorStop(1, '#c47a10')
  g.fillStyle = body
  g.fill(seed)
  g.strokeStyle = 'rgba(150, 82, 8, 0.55)'
  g.lineWidth = 1
  g.stroke(seed)
  // centre groove with a lit edge
  g.strokeStyle = 'rgba(176, 102, 14, 0.6)'
  g.beginPath()
  g.moveTo(0, -8)
  g.quadraticCurveTo(-1.5, 0, 0, 8)
  g.stroke()
  g.strokeStyle = 'rgba(255, 250, 220, 0.85)'
  g.lineWidth = 1.6
  g.beginPath()
  g.moveTo(3, -7)
  g.quadraticCurveTo(5.5, -2, 4, 3)
  g.stroke()
  // sprout
  g.fillStyle = '#6cbf4a'
  g.beginPath()
  g.ellipse(3.5, -12.5, 3.4, 1.6, -0.5, 0, TAU)
  g.fill()
  g.strokeStyle = '#4f9a3a'
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(0, -10.5)
  g.quadraticCurveTo(0.5, -13, 2, -13.5)
  g.stroke()
  seedSprites.set(tier, c)
  return c
}

export const meadowSkin: Skin = {
  drawObstacle(ctx, o, tier) {
    ctx.save()
    switch (o.type) {
      case 'boulder':
        hayBale(ctx, o, tier)
        break
      case 'iceblock':
        appleCrate(ctx, o, tier)
        break
      case 'icespikes':
        thistles(ctx, o, tier)
        break
      case 'pillar':
        scarecrow(ctx, o, tier)
        break
      case 'flyer':
        kite(ctx, o, tier)
        break
      default:
        ctx.restore()
        return false
    }
    ctx.restore()
    return true
  },
  drawCrystal(ctx, c: Coin, tier) {
    const y = c.y + Math.sin(c.animTimer) * 3
    ctx.save()
    ctx.translate(c.x, y)
    ctx.rotate(Math.sin(c.animTimer * 0.5) * 0.18)
    ctx.drawImage(seedSprite(tier), -24, -24)
    // rotating glint
    const a = Math.max(0, Math.sin(c.animTimer * 0.9))
    if (a > 0.05) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = a
      ctx.fillStyle = '#fffbe6'
      ctx.translate(4, -6)
      ctx.rotate(c.animTimer * 0.4)
      const r = 3 + a * 4
      ctx.beginPath()
      ctx.moveTo(0, -r)
      ctx.lineTo(0.9, -0.9)
      ctx.lineTo(r, 0)
      ctx.lineTo(0.9, 0.9)
      ctx.lineTo(0, r)
      ctx.lineTo(-0.9, 0.9)
      ctx.lineTo(-r, 0)
      ctx.lineTo(-0.9, -0.9)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
    return true
  },
}
