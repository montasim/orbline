// Sunfall Dunes obstacle and pickup art. Everything stays inside the obstacle's own box; only a flat
// ground shadow spills left, away from the sun. Static obstacles are cached as sprites per tier.
import type { Coin, Obstacle } from '../../engine/obstacles'
import type { Skin, Tier } from '../types'
import { canvas, LOOKS, type Look, mix, rgba, seeded } from './look'

type Ctx = CanvasRenderingContext2D

const PAD_L = 44
const PAD = 6
const sprites = new Map<string, HTMLCanvasElement>()

function sprite(o: Obstacle, tier: Tier, paint: (x: Ctx, w: number, h: number, L: Look) => void) {
  const key = `${o.type}|${tier}|${o.width}x${o.height}`
  let c = sprites.get(key)
  if (!c) {
    c = canvas(o.width + PAD_L + PAD, o.height + PAD * 2)
    const x = c.getContext('2d')
    if (x) {
      x.translate(PAD_L, PAD)
      paint(x, o.width, o.height, LOOKS[tier])
    }
    sprites.set(key, c)
  }
  return c
}

/** Flat shadow on the sand, stretching left from the base. */
function groundShadow(x: Ctx, w: number, h: number, L: Look) {
  const len = PAD_L + w * 0.3
  const g = x.createLinearGradient(w * 0.7, 0, -PAD_L, 0)
  g.addColorStop(0, rgba(L.shade, 0.5))
  g.addColorStop(1, rgba(L.shade, 0))
  x.fillStyle = g
  x.beginPath()
  x.ellipse(w * 0.7 - len / 2, h, len / 2 + 4, 3.5, 0, 0, Math.PI * 2)
  x.fill()
}

function stroke(x: Ctx, col: string, lw: number, pts: number[]) {
  x.strokeStyle = col
  x.lineWidth = lw
  x.beginPath()
  x.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1])
  x.stroke()
}

// obstacles sit a value step darker and more saturated than the scenery so they always read
const stone = (L: Look) => ({
  lit: mix(L.rock, L.rim, 0.32),
  base: mix(L.rock, L.shade, 0.22),
  dark: mix(L.rock, L.shade, 0.68),
})

/** Thin dark contour so the silhouette separates from the dunes behind it. */
function contour(x: Ctx, L: Look) {
  x.strokeStyle = rgba(L.shade, 0.75)
  x.lineWidth = 1.2
  x.lineJoin = 'round'
  x.stroke()
}

function paintBoulder(x: Ctx, w: number, h: number, L: Look) {
  const s = stone(L)
  groundShadow(x, w, h, L)
  const outline = [2, h, 0, h * 0.6, w * 0.13, h * 0.28, w * 0.36, h * 0.07, w * 0.6, 1, w * 0.85, h * 0.15, w - 0.5, h * 0.52, w - 2, h]
  const poly = (p: number[]) => {
    x.beginPath()
    x.moveTo(p[0], p[1])
    for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1])
    x.closePath()
  }
  poly(outline)
  const g = x.createLinearGradient(0, 0, w, h)
  // a shade darker than the sandstone cliffs behind it, with a heavy edge, so it reads as a hazard
  g.addColorStop(0, mix(s.base, L.shade, 0.25))
  g.addColorStop(1, mix(L.rock, L.shade, 0.6))
  x.fillStyle = g
  x.fill()
  x.strokeStyle = rgba(L.shade, 0.95)
  x.lineWidth = 2.2
  x.lineJoin = 'round'
  x.stroke()
  // sunlit upper-right plane
  x.fillStyle = s.lit
  poly([w * 0.36, h * 0.07, w * 0.6, 1, w * 0.85, h * 0.15, w - 0.5, h * 0.52, w * 0.66, h * 0.44, w * 0.42, h * 0.3])
  x.fill()
  x.fillStyle = mix(L.rock, L.rim, 0.12)
  poly([w * 0.42, h * 0.3, w * 0.66, h * 0.44, w - 0.5, h * 0.52, w - 2, h, w * 0.6, h])
  x.fill()
  // shaded left plane, away from the sun
  x.fillStyle = s.dark
  poly([2, h, 0, h * 0.6, w * 0.13, h * 0.28, w * 0.36, h * 0.07, w * 0.42, h * 0.3, w * 0.3, h])
  x.fill()
  stroke(x, rgba(L.shade, 0.55), 1.1, [w * 0.66, h * 0.44, w * 0.72, h * 0.66, w * 0.68, h * 0.86])
  stroke(x, rgba(L.rim, 0.95 * L.rimAlpha + 0.05), 1.7, [w * 0.36, h * 0.07, w * 0.6, 1, w * 0.85, h * 0.15, w - 0.5, h * 0.52])
  // sand drifted on the base
  x.fillStyle = mix(L.ground[0], L.shade, 0.15)
  x.beginPath()
  x.ellipse(w * 0.45, h, w * 0.55, 4, 0, Math.PI, 0)
  x.fill()
}

function paintRuinBlock(x: Ctx, w: number, h: number, L: Look) {
  const s = stone(L)
  const d = 7
  groundShadow(x, w, h, L)
  // lit top and right (sun-facing) faces, chipped top-left corner
  x.fillStyle = s.lit
  x.beginPath()
  x.moveTo(6, d)
  x.lineTo(d + 6, 0)
  x.lineTo(w, 0)
  x.lineTo(w - d, d)
  x.closePath()
  x.fill()
  x.fillStyle = mix(L.rock, L.rim, 0.25)
  x.beginPath()
  x.moveTo(w - d, d)
  x.lineTo(w, 0)
  x.lineTo(w, h - d)
  x.lineTo(w - d, h)
  x.closePath()
  x.fill()
  const fw = w - d
  x.beginPath()
  x.moveTo(0, d + 7)
  x.lineTo(d + 6, 0)
  x.lineTo(w, 0)
  x.lineTo(w, h - d)
  x.lineTo(w - d, h)
  x.lineTo(0, h)
  x.closePath()
  contour(x, L)
  const face = x.createLinearGradient(0, d, fw, h)
  face.addColorStop(0, s.dark)
  face.addColorStop(1, mix(L.rock, L.shade, 0.3))
  x.fillStyle = face
  x.beginPath()
  x.moveTo(0, d + 7)
  x.lineTo(6, d)
  x.lineTo(fw, d)
  x.lineTo(fw, h)
  x.lineTo(0, h)
  x.closePath()
  x.fill()
  // joint line and weathering
  stroke(x, rgba(L.shade, 0.45), 1, [0, h * 0.62, fw, h * 0.62])
  stroke(x, rgba(L.rim, 0.12), 1, [0, h * 0.62 + 1.2, fw, h * 0.62 + 1.2])
  // carved sun glyph, incised (dark upper-left, lit lower-right edge)
  const cx = fw / 2
  const cy = d + (h * 0.62 - d) / 2
  const r = Math.min(fw, h) * 0.15
  for (const [col, off] of [
    [rgba(L.shade, 0.75), -0.6],
    [rgba(L.rim, 0.35), 0.8],
  ] as const) {
    x.strokeStyle = col
    x.lineWidth = 1.6
    x.beginPath()
    x.arc(cx + off, cy + off, r, 0, Math.PI * 2)
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4
      x.moveTo(cx + off + Math.cos(a) * r * 1.4, cy + off + Math.sin(a) * r * 1.4)
      x.lineTo(cx + off + Math.cos(a) * r * 1.95, cy + off + Math.sin(a) * r * 1.95)
    }
    x.stroke()
  }
  // turquoise inlay: the accent pop
  const inlay = x.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, r * 0.7)
  inlay.addColorStop(0, '#b6fff3')
  inlay.addColorStop(0.5, '#2dd4bf')
  inlay.addColorStop(1, '#0f766e')
  x.fillStyle = inlay
  x.beginPath()
  x.arc(cx, cy, r * 0.62, 0, Math.PI * 2)
  x.fill()
  // lower course: a row of worn carved notches
  x.fillStyle = rgba(L.shade, 0.4)
  for (let i = 0; i < 4; i++) x.fillRect(5 + i * ((fw - 10) / 4), h * 0.72, (fw - 10) / 4 - 4, h * 0.14)
  // rim light on the sun-facing edges
  stroke(x, rgba(L.rim, 0.9 * L.rimAlpha + 0.1), 1.6, [d + 6, 0.5, w - 0.5, 0.5, w - 0.5, h - d])
  stroke(x, rgba(L.rim, 0.4), 1, [w - d, d, w - d, h])
  x.fillStyle = mix(L.ground[0], L.shade, 0.15)
  x.beginPath()
  x.ellipse(w * 0.3, h, w * 0.4, 3.5, 0, Math.PI, 0)
  x.fill()
}

function paintCacti(x: Ctx, w: number, h: number, L: Look) {
  groundShadow(x, w, h, L)
  const tier3 = L.stars
  const green = mix('#6f7f45', L.near, tier3 ? 0.55 : 0.25)
  const dark = mix('#3d4a2a', L.shade, 0.4)
  const lit = mix('#a9b86a', L.rim, 0.35)
  const shadeHalf = (cx: number, rw: number) => {
    const g = x.createLinearGradient(cx - rw, 0, cx + rw, 0)
    g.addColorStop(0, dark)
    g.addColorStop(0.55, green)
    g.addColorStop(1, lit)
    return g
  }
  // prickly-pear pads on the left
  const pads: [number, number, number, number, number][] = [
    [w * 0.14, h * 0.68, 8, 10, -0.3],
    [w * 0.26, h * 0.5, 7.5, 9.5, 0.25],
    [w * 0.1, h * 0.38, 6, 7.5, -0.5],
  ]
  for (const [px, py, rx, ry, a] of pads) {
    x.fillStyle = shadeHalf(px, rx)
    x.beginPath()
    x.ellipse(px, py, rx, ry, a, 0, Math.PI * 2)
    x.fill()
    x.strokeStyle = rgba(L.rim, 0.7 * L.rimAlpha + 0.1)
    x.lineWidth = 1.2
    x.beginPath()
    x.ellipse(px, py, rx, ry, a, -Math.PI * 0.45, Math.PI * 0.2)
    x.stroke()
    x.fillStyle = rgba(L.rim, 0.7)
    for (let i = 0; i < 4; i++) x.fillRect(px - 3 + (i % 2) * 5, py - 4 + i * 2.5, 1, 1)
  }
  // tall barrel cactus with ribs and a coral bloom
  const bx = w * 0.52
  const bw = 10
  x.fillStyle = shadeHalf(bx, bw)
  x.beginPath()
  x.roundRect(bx - bw, 5, bw * 2, h - 5, [bw, bw, 3, 3])
  x.fill()
  x.strokeStyle = rgba(L.shade, 0.4)
  x.lineWidth = 1
  x.beginPath()
  for (const f of [-0.55, -0.15, 0.25, 0.62]) {
    x.moveTo(bx + f * bw, 8)
    x.quadraticCurveTo(bx + f * bw * 1.15, h * 0.55, bx + f * bw, h)
  }
  x.stroke()
  stroke(x, rgba(L.rim, 0.85 * L.rimAlpha + 0.15), 1.4, [bx + bw - 0.7, h, bx + bw - 0.7, 5 + bw, bx + bw * 0.3, 5.6])
  x.fillStyle = rgba(L.rim, 0.75)
  for (let i = 0; i < 6; i++) x.fillRect(bx - bw * 0.6 + (i % 3) * bw * 0.6, 10 + i * 4, 1.2, 1.2)
  // bloom
  x.fillStyle = '#ff7a6b'
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.55
    x.beginPath()
    x.ellipse(bx + Math.cos(a) * 3, 4 + Math.sin(a) * 3, 2.6, 1.5, a, 0, Math.PI * 2)
    x.fill()
  }
  x.fillStyle = '#ffd38a'
  x.beginPath()
  x.arc(bx, 4.5, 1.6, 0, Math.PI * 2)
  x.fill()
  // short barrel on the right
  const sx = w * 0.82
  const sw = 8
  const st = h * 0.42
  x.fillStyle = shadeHalf(sx, sw)
  x.beginPath()
  x.roundRect(sx - sw, st, sw * 2, h - st, [sw, sw, 2, 2])
  x.fill()
  stroke(x, rgba(L.shade, 0.35), 1, [sx, st + 3, sx, h])
  stroke(x, rgba(L.rim, 0.85 * L.rimAlpha + 0.15), 1.3, [sx + sw - 0.7, h, sx + sw - 0.7, st + sw, sx + sw * 0.2, st + 0.6])
  x.fillStyle = mix(L.ground[0], L.shade, 0.15)
  x.beginPath()
  x.ellipse(w * 0.5, h, w * 0.52, 3.5, 0, Math.PI, 0)
  x.fill()
}

function paintObelisk(x: Ctx, w: number, h: number, L: Look) {
  const s = stone(L)
  groundShadow(x, w, h, L)
  const tip = 13
  const topHalf = w * 0.31
  const cx = w / 2
  // tapering shaft: shaded left face, lit right face
  x.fillStyle = s.dark
  x.beginPath()
  x.moveTo(1, h)
  x.lineTo(cx - topHalf, tip)
  x.lineTo(cx + 1, tip)
  x.lineTo(cx + 1, h)
  x.closePath()
  x.fill()
  const lit = x.createLinearGradient(0, tip, 0, h)
  lit.addColorStop(0, s.lit)
  lit.addColorStop(1, s.base)
  x.fillStyle = lit
  x.beginPath()
  x.moveTo(cx, h)
  x.lineTo(cx, tip)
  x.lineTo(cx + topHalf, tip)
  x.lineTo(w - 1, h)
  x.closePath()
  x.fill()
  x.beginPath()
  x.moveTo(1, h)
  x.lineTo(cx - topHalf, tip)
  x.lineTo(cx, 0)
  x.lineTo(cx + topHalf, tip)
  x.lineTo(w - 1, h)
  x.closePath()
  contour(x, L)
  // carved glyph column down the centre
  x.fillStyle = rgba(L.shade, 0.55)
  const glyphs = 6
  for (let i = 0; i < glyphs; i++) {
    const gy = tip + 9 + i * ((h - tip - 18) / glyphs)
    const k = i % 3
    if (k === 0) x.fillRect(cx - 2.5, gy, 5, 2)
    else if (k === 1) {
      x.beginPath()
      x.arc(cx, gy + 2, 2.2, 0, Math.PI * 2)
      x.fill()
    } else x.fillRect(cx - 0.8, gy - 1, 1.6, 5)
  }
  // gilded pyramidion catching the last sun
  x.fillStyle = '#b4772a'
  x.beginPath()
  x.moveTo(cx - topHalf - 0.5, tip)
  x.lineTo(cx, 0)
  x.lineTo(cx, tip)
  x.closePath()
  x.fill()
  x.fillStyle = L.stars ? '#e9b06a' : '#ffd66e'
  x.beginPath()
  x.moveTo(cx, 0)
  x.lineTo(cx + topHalf + 0.5, tip)
  x.lineTo(cx, tip)
  x.closePath()
  x.fill()
  stroke(x, rgba(L.rim, 0.9 * L.rimAlpha + 0.1), 1.5, [cx + 0.5, 0.5, cx + topHalf + 0.5, tip, w - 1, h])
  stroke(x, rgba(L.shade, 0.5), 1, [cx - topHalf, tip + 0.5, cx + topHalf, tip + 0.5])
  x.fillStyle = mix(L.ground[0], L.shade, 0.15)
  x.beginPath()
  x.ellipse(cx, h, w * 0.7, 3.5, 0, Math.PI, 0)
  x.fill()
}

/* ------------------------------------------------------------- tumbleweed */

const TW_R = 17
const TW = TW_R * 2 + 4
const tumbleSprites = new Map<Tier, HTMLCanvasElement>()

/** A tangled ball of dry branches, cached per tier; it is spun as a whole when drawn. */
function tumbleSprite(tier: Tier) {
  let c = tumbleSprites.get(tier)
  if (c) return c
  const L = LOOKS[tier]
  c = canvas(TW, TW)
  tumbleSprites.set(tier, c)
  const x = c.getContext('2d')
  if (!x) return c
  x.translate(TW / 2, TW / 2)
  const rnd = seeded(7)
  // tangled twigs: bent chords across the ball, a few of them pale and sun-bleached
  const twigs = new Path2D()
  const pale = new Path2D()
  const rim = (a: number, f = 1): [number, number] => [Math.cos(a) * (TW_R - 1) * f, Math.sin(a) * (TW_R - 1) * f]
  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2
    const b = a + 1.6 + rnd() * 2.4
    const path = i % 4 === 0 ? pale : twigs
    path.moveTo(...rim(a, 0.8 + rnd() * 0.2))
    path.quadraticCurveTo((rnd() - 0.5) * TW_R, (rnd() - 0.5) * TW_R, ...rim(b, 0.8 + rnd() * 0.2))
  }
  // outer hoops give the round silhouette
  for (let i = 0; i < 5; i++) {
    const s = rnd() * Math.PI * 2
    twigs.moveTo(...rim(s, 0.94))
    twigs.arc(0, 0, (TW_R - 1) * 0.94, s, s + 1.4 + rnd() * 1.4)
  }
  // twig ends poking out of the silhouette
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + rnd() * 0.3
    twigs.moveTo(...rim(a, 0.7))
    twigs.lineTo(...rim(a + 0.18, 1))
  }
  x.lineCap = 'round'
  x.lineJoin = 'round'
  x.strokeStyle = rgba(L.shade, 0.75)
  x.lineWidth = 2.6
  x.stroke(twigs)
  x.stroke(pale)
  x.strokeStyle = mix('#9a7444', L.shade, 0.3)
  x.lineWidth = 1.1
  x.stroke(twigs)
  x.strokeStyle = mix('#e2bf86', L.rim, 0.35)
  x.stroke(pale)
  return c
}

/** Wind-blown tumbleweed rolling toward the runner, kicking up dust behind it. Drawn live (it spins). */
function drawTumbleweed(ctx: Ctx, o: Obstacle, tier: Tier) {
  const L = LOOKS[tier]
  const { x, y, width: w, height: h } = o
  const t = o.animTimer
  const cx = x + TW_R + 2
  const cy = y + h / 2
  // flat shadow on the sand below, stretching left from the sun
  const sh = ctx.createLinearGradient(cx + 12, 0, cx - 30, 0)
  sh.addColorStop(0, rgba(L.shade, 0.4))
  sh.addColorStop(1, rgba(L.shade, 0))
  ctx.fillStyle = sh
  ctx.beginPath()
  ctx.ellipse(cx - 8, o.groundY - 1, 22, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  // dust puffs streaming behind (to the right)
  const dust = mix(L.ground[0], '#fff1d6', 0.55)
  for (let k = 0; k < 4; k++) {
    const ph = (t * 1.6 + k / 4) % 1
    const r = 3 + ph * 6
    const px = Math.min(x + w - r, cx + 10 + ph * (w - TW_R - 14))
    const py = Math.min(y + h - r, cy + 6 - ph * 4 + Math.sin(t * 3 + k) * 2)
    ctx.fillStyle = rgba(dust, 0.45 * (1 - ph))
    ctx.beginPath()
    ctx.arc(px, py, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-t * 5)
  ctx.drawImage(tumbleSprite(tier), -TW / 2, -TW / 2)
  ctx.restore()
}

/* ------------------------------------------------------------------ sun-gem */

let gemSprite: HTMLCanvasElement | null = null
const GEM = 44

/** Faceted turquoise gem lit from the upper right, with a soft halo; cached once. */
function gem() {
  if (gemSprite) return gemSprite
  const c = canvas(GEM, GEM)
  const x = c.getContext('2d')
  gemSprite = c
  if (!x) return c
  x.translate(GEM / 2, GEM / 2)
  const halo = x.createRadialGradient(0, 0, 4, 0, 0, GEM / 2)
  halo.addColorStop(0, 'rgba(94, 234, 212, 0.45)')
  halo.addColorStop(1, 'rgba(94, 234, 212, 0)')
  x.fillStyle = halo
  x.fillRect(-GEM / 2, -GEM / 2, GEM, GEM)
  // girdle at y=-3, table on top, culet at the bottom
  const T = -10
  const G = -3
  const B = 11
  const facets: [number[], string][] = [
    [[-11, G, -5, T, -2, G], '#2bb5a6'],
    [[-5, T, 5, T, 2, G, -2, G], '#8ff5e4'],
    [[5, T, 11, G, 2, G], '#c8fff5'],
    [[-11, G, -2, G, 0, B], '#0e7a70'],
    [[-2, G, 2, G, 0, B], '#1fb8a6'],
    [[2, G, 11, G, 0, B], '#4fe3cf'],
  ]
  for (const [p, col] of facets) {
    x.fillStyle = col
    x.beginPath()
    x.moveTo(p[0], p[1])
    for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1])
    x.closePath()
    x.fill()
  }
  x.strokeStyle = 'rgba(8, 70, 66, 0.85)'
  x.lineWidth = 1
  x.lineJoin = 'round'
  x.beginPath()
  x.moveTo(-5, T)
  x.lineTo(5, T)
  x.lineTo(11, G)
  x.lineTo(0, B)
  x.lineTo(-11, G)
  x.closePath()
  x.stroke()
  x.strokeStyle = 'rgba(230, 255, 250, 0.7)'
  x.beginPath()
  x.moveTo(5, T)
  x.lineTo(11, G)
  x.stroke()
  x.fillStyle = 'rgba(255, 255, 255, 0.85)'
  x.beginPath()
  x.moveTo(-3, T + 1.5)
  x.lineTo(1, T + 1.5)
  x.lineTo(-1, G - 1)
  x.closePath()
  x.fill()
  return c
}

export const dunesSkin: Skin = {
  outline: 'rgba(48, 16, 4, 0.9)',
  drawObstacle(ctx, o, tier) {
    const L = LOOKS[tier]
    if (o.type === 'flyer') {
      drawTumbleweed(ctx, o, tier)
      return true
    }
    const paint =
      o.type === 'boulder'
        ? paintBoulder
        : o.type === 'iceblock'
          ? paintRuinBlock
          : o.type === 'icespikes'
            ? paintCacti
            : o.type === 'pillar'
              ? paintObelisk
              : null
    if (!paint) return false
    ctx.drawImage(sprite(o, tier, paint), Math.round(o.x) - PAD_L, Math.round(o.y) - PAD)
    // the obelisk's gilded tip pulses softly
    if (o.type === 'pillar' && !L.stars) {
      const a = 0.25 + 0.2 * Math.sin(o.animTimer * 3)
      const g = ctx.createRadialGradient(o.x + o.width / 2 + 2, o.y + 6, 0, o.x + o.width / 2 + 2, o.y + 6, 14)
      g.addColorStop(0, `rgba(255, 220, 140, ${a})`)
      g.addColorStop(1, 'rgba(255, 220, 140, 0)')
      ctx.fillStyle = g
      ctx.fillRect(o.x - 4, o.y - 8, o.width + 8, 28)
    }
    return true
  },
  drawCrystal(ctx, c: Coin) {
    const y = c.y + Math.sin(c.animTimer) * 3
    // slow turn: squash horizontally so the facets seem to rotate
    const turn = 0.78 + 0.22 * Math.abs(Math.cos(c.animTimer * 0.45))
    ctx.save()
    ctx.translate(c.x, y)
    ctx.scale(turn, 1)
    ctx.drawImage(gem(), -GEM / 2, -GEM / 2)
    ctx.restore()
    // periodic glint on the lit crown
    const k = Math.max(0, Math.sin(c.animTimer * 0.8)) ** 8
    if (k > 0.03) {
      const gx = c.x + 5 * turn
      const gy = y - 7
      const r = 3 + k * 5
      ctx.save()
      ctx.globalAlpha = k
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(gx, gy - r)
      ctx.quadraticCurveTo(gx, gy, gx + r, gy)
      ctx.quadraticCurveTo(gx, gy, gx, gy + r)
      ctx.quadraticCurveTo(gx, gy, gx - r, gy)
      ctx.quadraticCurveTo(gx, gy, gx, gy - r)
      ctx.fill()
      ctx.restore()
    }
    return true
  },
}
