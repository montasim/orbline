// Coral Deep obstacle + pickup art. Everything stays inside the obstacle's own box (o.x, o.y,
// o.width, o.height) so hitboxes stay fair; static bodies are cached as sprites per tier.
import type { Coin, Obstacle } from '../../engine/obstacles'
import type { Skin, Tier } from '../types'
import { THEMES, causticPattern, ctxOf, makeCanvas, mix, mixHex, rgba } from './palette'

/** how much each tier's water tints the props, and how strong the top rim light is */
const LIGHT = [
  { amb: 0.12, rim: 0.85 },
  { amb: 0.2, rim: 0.75 },
  { amb: 0.32, rim: 0.6 },
  { amb: 0.42, rim: 0.55 },
] as const

const lightOf = (tier: Tier) => {
  const T = THEMES[tier]
  return T.rays > 0 ? T.light : T.glow
}

const PAD = 14
const sprites = new Map<string, HTMLCanvasElement>()
function sprite(key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  let c = sprites.get(key)
  if (!c) {
    c = makeCanvas(w + PAD * 2, h + PAD * 2)
    const g = ctxOf(c)
    g.translate(PAD, PAD)
    paint(g)
    sprites.set(key, c)
  }
  return c
}

const shadow = (g: CanvasRenderingContext2D, cx: number, y: number, rx: number) => {
  const sg = g.createRadialGradient(cx, y, 0, cx, y, rx)
  sg.addColorStop(0, 'rgba(0, 0, 0, 0.62)')
  sg.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)')
  sg.addColorStop(1, 'rgba(0, 0, 0, 0)')
  g.fillStyle = sg
  g.save()
  g.translate(cx, y)
  g.scale(1, 0.18)
  g.translate(-cx, -y)
  g.fillRect(cx - rx, y - rx, rx * 2, rx * 2)
  g.restore()
}

/** a soft top-left → bottom-right stroke gradient: rim light on the edges facing the surface */
const rimStroke = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, col: string, a: number) => {
  const rg = g.createLinearGradient(x0, y0, x1, y1)
  rg.addColorStop(0, rgba(col, a))
  rg.addColorStop(0.5, rgba(col, a * 0.35))
  rg.addColorStop(1, rgba(col, 0))
  return rg
}

/**
 * Readability: every ground obstacle sits on a dark contact shadow; in the abyss it also gets a
 * soft bioluminescent backlight so its silhouette separates from the near-black scenery.
 */
const backing = (g: CanvasRenderingContext2D, w: number, h: number, tier: Tier, rx: number) => {
  if (tier === 3) {
    // elliptical halo that fades out exactly at the sprite's padded edge (no clipped corners)
    const hg = g.createRadialGradient(0, 0, 0, 0, 0, 1)
    hg.addColorStop(0, rgba(THEMES[3].glow, 0.3))
    hg.addColorStop(0.6, rgba(THEMES[3].glow, 0.12))
    hg.addColorStop(1, rgba(THEMES[3].glow, 0))
    g.save()
    g.translate(w / 2, h / 2)
    g.scale(w / 2 + PAD, h / 2 + PAD)
    g.fillStyle = hg
    g.fillRect(-1, -1, 2, 2)
    g.restore()
  }
  shadow(g, w / 2, h, rx)
}

/** thin outline in the tier's deepest blue, so the shape reads at speed */
const outline = (g: CanvasRenderingContext2D, tier: Tier) => {
  g.strokeStyle = mixHex(THEMES[tier].water[2], '#000000', 0.45)
  g.lineWidth = 1.5
  g.stroke()
}

/** in the abyss the rim comes from the glow and is stronger */
const rimA = (tier: Tier) => (tier === 3 ? 0.95 : LIGHT[tier].rim)

// ---------------------------------------------------------------- brain coral (boulder)

const domePath = (g: CanvasRenderingContext2D, w: number, h: number) => {
  g.beginPath()
  g.moveTo(1, h)
  g.bezierCurveTo(-1, h * 0.35, w * 0.2, 1, w * 0.5, 1)
  g.bezierCurveTo(w * 0.8, 1, w + 1, h * 0.35, w - 1, h)
  g.closePath()
}

function paintBrain(g: CanvasRenderingContext2D, w: number, h: number, tier: Tier) {
  const T = THEMES[tier]
  const Lc = lightOf(tier)
  // warm orange: a hue the scenery never uses, so the dome always reads as the hazard
  const body = mixHex('#ff7a3d', T.water[1], LIGHT[tier].amb * 0.45)
  backing(g, w, h, tier, w * 0.62)
  const rg = g.createRadialGradient(w * 0.34, h * 0.22, 2, w * 0.5, h * 0.6, w * 0.78)
  rg.addColorStop(0, mix(body, Lc, 0.4))
  rg.addColorStop(0.5, body)
  rg.addColorStop(1, mix(body, '#000000', 0.5))
  g.fillStyle = rg
  domePath(g, w, h)
  g.fill()
  g.save()
  g.clip()
  // meandering grooves following the dome, embossed: dark valley + light ridge
  const groove = (dx: number, dy: number, style: string, lw: number) => {
    g.strokeStyle = style
    g.lineWidth = lw
    g.beginPath()
    for (let k = 1; k <= 5; k++) {
      const f = k / 5.6
      for (let i = 0; i <= 44; i++) {
        const t = Math.PI + (i / 44) * Math.PI
        const wob = Math.sin(t * 13 + k * 2.1) * 2.2 + Math.sin(t * 29 + k) * 0.8
        const px = w / 2 + Math.cos(t) * (w * 0.5 * f + wob) + dx
        const py = h + Math.sin(t) * (h * f + wob) + dy
        if (i === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
    }
    // short cross-links make it read as a maze, not rings
    for (let i = 0; i < 9; i++) {
      const t = Math.PI + ((i + 0.5) / 9) * Math.PI
      const f0 = (1 + (i % 4)) / 5.6
      const f1 = f0 + 0.18
      g.moveTo(w / 2 + Math.cos(t) * w * 0.5 * f0 + dx, h + Math.sin(t) * h * f0 + dy)
      g.lineTo(w / 2 + Math.cos(t + 0.06) * w * 0.5 * f1 + dx, h + Math.sin(t + 0.06) * h * f1 + dy)
    }
    g.stroke()
  }
  groove(0, 0, mix(body, '#000000', 0.55, 0.8), 1.7)
  groove(-0.7, -0.9, mix(body, Lc, 0.5, 0.45), 0.9)
  // ambient occlusion toward the base
  const ao = g.createLinearGradient(0, h * 0.55, 0, h)
  ao.addColorStop(0, 'rgba(0, 0, 0, 0)')
  ao.addColorStop(1, 'rgba(0, 0, 0, 0.35)')
  g.fillStyle = ao
  g.fillRect(0, 0, w, h)
  g.restore()
  domePath(g, w, h)
  outline(g, tier)
  g.strokeStyle = rimStroke(g, 0, 0, w, h, Lc, rimA(tier))
  g.lineWidth = 1.6
  g.stroke()
}

// ---------------------------------------------------------------- treasure chest (iceblock)

function paintChest(g: CanvasRenderingContext2D, w: number, h: number, tier: Tier) {
  const T = THEMES[tier]
  const Lc = lightOf(tier)
  const amb = LIGHT[tier].amb
  const wood = mixHex('#7a4a2b', T.water[2], amb)
  const woodDark = mixHex('#3d2314', T.water[2], amb)
  const gold = mixHex('#e6b450', T.water[1], amb * 0.6)
  const goldDark = mixHex('#8a5a1c', T.water[2], amb)
  backing(g, w, h, tier, w * 0.62)
  const lidBottom = 21
  // glow from inside the ajar lid
  const gl = g.createRadialGradient(w / 2, lidBottom, 1, w / 2, lidBottom, w * 0.6)
  gl.addColorStop(0, rgba('#ffd98a', tier === 3 ? 0.55 : 0.4))
  gl.addColorStop(1, rgba('#ffd98a', 0))
  g.fillStyle = gl
  g.fillRect(-PAD, lidBottom - 18, w + PAD * 2, 30)
  // body
  const bg = g.createLinearGradient(0, lidBottom, 0, h)
  bg.addColorStop(0, wood)
  bg.addColorStop(1, woodDark)
  g.fillStyle = bg
  g.beginPath()
  g.roundRect(2, lidBottom + 1, w - 4, h - lidBottom - 1, 2)
  g.fill()
  outline(g, tier)
  g.strokeStyle = rgba('#000000', 0.35)
  g.lineWidth = 1
  g.beginPath()
  for (const py of [lidBottom + 11, lidBottom + 21]) {
    g.moveTo(3, py)
    g.lineTo(w - 3, py)
  }
  g.stroke()
  // the treasure peeking out of the gap
  g.fillStyle = '#fff1b8'
  g.fillRect(6, lidBottom - 1, w - 12, 2.5)
  g.fillStyle = '#ffe08a'
  for (let i = 0; i < 6; i++) {
    g.beginPath()
    g.arc(9 + i * 6, lidBottom - 0.5, 2, Math.PI, 0)
    g.fill()
  }
  // lid: rounded, tilted open a crack
  g.save()
  g.translate(2, lidBottom - 2)
  g.rotate(-0.06)
  const lg = g.createLinearGradient(0, -17, 0, 0)
  lg.addColorStop(0, mix(wood, Lc, 0.28))
  lg.addColorStop(1, woodDark)
  g.fillStyle = lg
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0, -9)
  g.quadraticCurveTo(0, -18, (w - 4) / 2, -18)
  g.quadraticCurveTo(w - 4, -18, w - 4, -9)
  g.lineTo(w - 4, 0)
  g.closePath()
  g.fill()
  g.strokeStyle = rimStroke(g, 0, -18, w - 4, 0, Lc, LIGHT[tier].rim)
  g.lineWidth = 1.5
  g.stroke()
  // lid bands
  g.fillStyle = gold
  for (const bx of [7, w - 15]) g.fillRect(bx, -16.5, 4, 16.5)
  g.fillRect(0, -2.5, w - 4, 2.5)
  g.restore()
  // body bands + corners
  const band = g.createLinearGradient(0, lidBottom, 0, h)
  band.addColorStop(0, mix(gold, Lc, 0.25))
  band.addColorStop(1, goldDark)
  g.fillStyle = band
  for (const bx of [9, w - 13]) g.fillRect(bx, lidBottom + 1, 4, h - lidBottom - 1)
  g.fillRect(2, h - 4, w - 4, 3)
  // lock plate + keyhole
  g.fillStyle = gold
  g.beginPath()
  g.roundRect(w / 2 - 5, lidBottom, 10, 12, 2)
  g.fill()
  g.fillStyle = rgba('#1a0f08', 0.9)
  g.beginPath()
  g.arc(w / 2, lidBottom + 5, 1.8, 0, Math.PI * 2)
  g.fill()
  g.fillRect(w / 2 - 0.8, lidBottom + 5, 1.6, 4)
  // barnacles + a draped strand of weed, so it has clearly lain here a while
  g.fillStyle = mixHex('#e7e2d3', T.water[1], 0.35 + amb)
  for (const [bx, by, r] of [
    [5, h - 8, 2],
    [8, h - 5, 1.4],
    [w - 6, lidBottom + 6, 1.7],
    [w - 9, lidBottom + 3, 1.2],
  ]) {
    g.beginPath()
    g.arc(bx, by, r, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = mixHex('#3f7a52', T.water[1], amb + 0.15)
  g.lineWidth = 2.2
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(w * 0.62, 4)
  g.quadraticCurveTo(w - 2, 6, w - 3, lidBottom + 2)
  g.quadraticCurveTo(w - 6, lidBottom + 14, w - 2, h - 6)
  g.stroke()
  g.lineCap = 'butt'
}

// ---------------------------------------------------------------- volcanic rock spikes (icespikes)

function paintSpikes(g: CanvasRenderingContext2D, w: number, h: number, tier: Tier) {
  const T = THEMES[tier]
  const Lc = lightOf(tier)
  const amb = LIGHT[tier].amb
  // dark basalt with a violet cast: reads as hard, sharp rock against the blue-green scenery
  const body = mixHex('#3a3046', T.water[2], amb * 0.6)
  const tip = tier === 3 ? '#d8b4fe' : tier === 2 ? T.glow : mixHex('#c9b6e4', Lc, 0.35)
  backing(g, w, h, tier, w * 0.58)
  // [centre x, base half-width, height, tip lean]; back spikes first
  const spikes: [number, number, number, number][] = [
    [44, 8, 24, 3],
    [17, 8, 22, -3],
    [30, 10, 33, 1],
    [6, 5.5, 13, -2],
    [55, 6, 15, 2],
  ]
  for (const [i, [sx, bw, H, lean]] of spikes.entries()) {
    const tx = sx + lean
    const ty = h - H
    // jagged flanks: a few chipped notches on each side
    const left: [number, number][] = []
    const right: [number, number][] = []
    for (let k = 1; k < 4; k++) {
      const u = k / 4
      const j = Math.sin(i * 5.1 + k * 2.7) * 1.4
      left.push([sx - bw + (tx - sx + bw) * u + j, h - H * u])
      right.push([sx + bw + (tx - sx - bw) * u - j * 0.8, h - H * u])
    }
    const path = () => {
      g.beginPath()
      g.moveTo(sx - bw, h)
      for (const [x, y] of left) g.lineTo(x, y)
      g.lineTo(tx, ty)
      for (const [x, y] of right.slice().reverse()) g.lineTo(x, y)
      g.lineTo(sx + bw, h)
      g.closePath()
    }
    const bg = g.createLinearGradient(sx - bw, ty, sx + bw, h)
    bg.addColorStop(0, mix(body, Lc, 0.4))
    bg.addColorStop(0.5, body)
    bg.addColorStop(1, mix(body, '#000000', 0.5))
    g.fillStyle = bg
    path()
    g.fill()
    g.save()
    g.clip()
    // shaded right facet + a glowing fissure up the middle
    g.fillStyle = 'rgba(0, 0, 0, 0.3)'
    g.beginPath()
    g.moveTo(tx, ty)
    g.lineTo(sx + bw * 0.15, h)
    g.lineTo(sx + bw + 2, h)
    g.lineTo(sx + bw + 2, ty)
    g.closePath()
    g.fill()
    g.strokeStyle = rgba(tip, tier >= 2 ? 0.55 : 0.25)
    g.lineWidth = 0.9
    g.beginPath()
    g.moveTo(tx, ty + 3)
    g.lineTo(sx - 1, h - H * 0.45)
    g.lineTo(sx + 1.5, h - 2)
    g.stroke()
    g.restore()
    path()
    outline(g, tier)
    g.strokeStyle = rimStroke(g, sx - bw, ty, sx + bw, h, Lc, rimA(tier))
    g.lineWidth = 1.2
    g.stroke()
    // sharp, glowing tip
    const tg = g.createRadialGradient(tx, ty + 1.5, 0, tx, ty + 1.5, 5)
    tg.addColorStop(0, rgba('#ffffff', tier >= 2 ? 0.9 : 0.6))
    tg.addColorStop(0.35, rgba(tip, tier >= 2 ? 0.75 : 0.4))
    tg.addColorStop(1, rgba(tip, 0))
    g.fillStyle = tg
    g.fillRect(tx - 5, ty - 3.5, 10, 10)
  }
}

// ---------------------------------------------------------------- pillar coral (pillar)

function paintPillar(g: CanvasRenderingContext2D, w: number, h: number, tier: Tier) {
  const T = THEMES[tier]
  const Lc = lightOf(tier)
  const amb = LIGHT[tier].amb
  // saturated gold column with glowing polyp tips: no scenery prop shares this colour
  const body = mixHex('#f2b33d', T.water[1], amb * 0.45)
  const tipCol = tier >= 2 ? T.glow : '#fff6d0'
  backing(g, w, h, tier, w * 1.1)
  const edge = (y: number, side: number) =>
    (side < 0 ? 3.5 : w - 3.5) + (Math.sin(y * 0.16 + side) * 1.3 + Math.sin(y * 0.47 + side * 2) * 0.8) * side
  const path = () => {
    g.beginPath()
    // knobbly side lobes
    for (const [ny, side, r] of [
      [24, -1, 3.2],
      [47, 1, 3.4],
      [66, -1, 2.8],
    ]) {
      const nx = side < 0 ? 3.2 : w - 3.2
      g.moveTo(nx + r, ny)
      g.arc(nx, ny, r, 0, Math.PI * 2)
    }
    g.moveTo(edge(h, -1) - 1.5, h)
    for (let y = h; y >= 9; y -= 4) g.lineTo(edge(y, -1), y)
    g.quadraticCurveTo(w * 0.15, 0, w / 2, 0.5)
    g.quadraticCurveTo(w * 0.85, 0, edge(9, 1), 9)
    for (let y = 9; y <= h; y += 4) g.lineTo(edge(y, 1), y)
    g.lineTo(edge(h, 1) + 1.5, h)
    g.closePath()
  }
  const cg = g.createLinearGradient(0, 0, w, 0)
  cg.addColorStop(0, mix(body, Lc, 0.38))
  cg.addColorStop(0.35, body)
  cg.addColorStop(1, mix(body, '#000000', 0.55))
  g.fillStyle = cg
  path()
  g.fill()
  g.save()
  g.clip()
  // vertical depth: lit crown, darker base
  const vg = g.createLinearGradient(0, 0, 0, h)
  vg.addColorStop(0, rgba(Lc, 0.22))
  vg.addColorStop(0.4, rgba(Lc, 0))
  vg.addColorStop(1, 'rgba(0, 0, 0, 0.35)')
  g.fillStyle = vg
  g.fillRect(0, 0, w, h)
  // growth bands
  g.strokeStyle = 'rgba(0, 0, 0, 0.14)'
  g.lineWidth = 1.2
  g.beginPath()
  for (let by = 14; by < h - 4; by += 11 + (by % 3)) {
    g.moveTo(0, by)
    g.quadraticCurveTo(w / 2, by + 2.5, w, by)
  }
  g.stroke()
  // polyps in offset rows: dark cup + bright glowing tip
  for (let row = 0; row * 4.2 < h - 4; row++) {
    const y = 5 + row * 4.2
    for (let col = 0; col < 5; col++) {
      const x = 3 + col * 4.2 + (row % 2) * 2.1
      const lit = 1 - x / w
      g.fillStyle = rgba(mixHex(body, '#5a2a00', 0.5), 0.5)
      g.beginPath()
      g.arc(x, y + 0.5, 1.4, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = rgba(tipCol, 0.45 + 0.5 * lit)
      g.beginPath()
      g.arc(x - 0.3, y - 0.2, 0.85, 0, Math.PI * 2)
      g.fill()
    }
  }
  g.restore()
  path()
  outline(g, tier)
  g.strokeStyle = rimStroke(g, 0, 0, w * 1.4, h * 0.5, Lc, rimA(tier))
  g.lineWidth = 1.5
  g.stroke()
  // a kelp ribbon curling around the column
  g.strokeStyle = mixHex('#3f7a52', T.water[1], amb + 0.2)
  g.lineWidth = 2
  g.beginPath()
  for (let y = h; y > h * 0.35; y -= 3) {
    const x = w / 2 + Math.sin(y * 0.11) * (w / 2 - 1)
    if (y === h) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.stroke()
}

// ---------------------------------------------------------------- sea mine (flyer)

const MINE_R = 11.5
const MINE_CY = 15.5

/** static body, cached: stubby spikes, riveted steel sphere, lamp housing on top */
function paintMine(g: CanvasRenderingContext2D, w: number, tier: Tier) {
  const T = THEMES[tier]
  const Lc = lightOf(tier)
  const amb = LIGHT[tier].amb
  const steel = mixHex('#55606c', T.water[2], amb * 0.7)
  const cx = w / 2
  const cy = MINE_CY
  const r = MINE_R
  // spikes first so the sphere overlaps their roots
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4
    if (i % 4 === 0) continue // lamp on top, chain shackle below
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const px = -sa
    const py = ca
    const r0 = r - 1
    const r1 = r + 4.6
    g.beginPath()
    g.moveTo(cx + ca * r0 + px * 3, cy + sa * r0 + py * 3)
    g.lineTo(cx + ca * r1 + px * 1.7, cy + sa * r1 + py * 1.7)
    g.arc(cx + ca * r1, cy + sa * r1, 1.7, a + Math.PI / 2, a - Math.PI / 2, true)
    g.lineTo(cx + ca * r0 - px * 3, cy + sa * r0 - py * 3)
    g.closePath()
    // outline under the fill: spikes are thin, so only the outer half of the stroke shows
    outline(g, tier)
    g.fillStyle = mix(mixHex(steel, '#b8c2cc', 0.35), Lc, Math.max(0, -sa * 0.5 - ca * 0.25) * 0.5)
    g.fill()
  }
  // lamp housing
  g.beginPath()
  g.roundRect(cx - 3.5, cy - r - 3.5, 7, 5, 1.5)
  g.fillStyle = mix(steel, '#000000', 0.25)
  g.fill()
  outline(g, tier)
  // sphere
  const bg = g.createRadialGradient(cx - r * 0.4, cy - r * 0.45, 1, cx, cy, r * 1.1)
  bg.addColorStop(0, mix(steel, Lc, 0.55))
  bg.addColorStop(0.5, steel)
  bg.addColorStop(1, mix(steel, '#000000', 0.55))
  g.fillStyle = bg
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
  g.fill()
  g.save()
  g.clip()
  // welded equator band with rivets, plus a little rust
  g.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  g.lineWidth = 1.4
  g.beginPath()
  g.ellipse(cx, cy + 1, r, r * 0.28, 0, 0, Math.PI)
  g.stroke()
  g.fillStyle = mix(steel, Lc, 0.45, 0.8)
  for (let i = 0; i < 7; i++) {
    const a = 0.25 + (i / 6) * (Math.PI - 0.5)
    g.beginPath()
    g.arc(cx + Math.cos(a) * r * 0.97, cy + 1 + Math.sin(a) * r * 0.27 - 1.6, 0.8, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = rgba(mixHex('#8a4a22', T.water[2], amb), 0.45)
  g.beginPath()
  g.ellipse(cx + r * 0.45, cy + r * 0.5, 3.5, 2, 0.4, 0, Math.PI * 2)
  g.ellipse(cx - r * 0.55, cy + r * 0.2, 2, 1.3, -0.3, 0, Math.PI * 2)
  g.fill()
  g.restore()
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
  outline(g, tier)
  g.strokeStyle = rimStroke(g, cx - r, cy - r, cx + r, cy + r, Lc, rimA(tier))
  g.lineWidth = 1.5
  g.stroke()
  // specular
  g.fillStyle = 'rgba(255, 255, 255, 0.5)'
  g.beginPath()
  g.ellipse(cx - r * 0.42, cy - r * 0.45, r * 0.26, r * 0.14, -0.6, 0, Math.PI * 2)
  g.fill()
}

/** per frame: readable halo, swaying chain, the cached body, blinking warning lamp */
function drawMine(ctx: CanvasRenderingContext2D, o: Obstacle, tier: Tier, key: string) {
  const T = THEMES[tier]
  const t = o.animTimer
  const { x, y, width: w, height: h } = o
  const cx = x + w / 2
  const cy = y + MINE_CY
  // slow blink: mostly dark, a soft swell of red every ~2.5s
  const blink = Math.max(0, Math.sin(t * 2.5)) ** 3
  ctx.save()
  // halo (no shadowBlur): additive in the dark tiers so the mine pops out of the black
  const glow = tier >= 2 ? T.glow : '#e0f2fe'
  const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, 40)
  halo.addColorStop(0, rgba(glow, tier >= 2 ? 0.42 : 0.22))
  halo.addColorStop(1, rgba(glow, 0))
  if (tier >= 2) ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = halo
  ctx.fillRect(cx - 40, cy - 40, 80, 80)
  ctx.globalCompositeOperation = 'source-over'
  // short anchor chain: alternating links, swinging a little against the bob
  const sway = Math.sin(t * 4 + 0.8) * 0.18
  const steel = mixHex('#55606c', T.water[2], LIGHT[tier].amb * 0.7)
  const top = cy + MINE_R - 1
  const n = 4
  const len = y + h - 1.5 - top
  ctx.lineWidth = 1.6
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n
    const lx = cx + Math.sin(sway) * len * u
    const ly = top + len * u
    ctx.beginPath()
    if (i % 2) ctx.ellipse(lx, ly, 0.9, len / n / 2 + 0.6, -sway, 0, Math.PI * 2)
    else ctx.ellipse(lx, ly, 2.2, len / n / 2 + 0.6, -sway, 0, Math.PI * 2)
    ctx.strokeStyle = mixHex(THEMES[tier].water[2], '#000000', 0.45)
    ctx.lineWidth = 2.8
    ctx.stroke()
    ctx.strokeStyle = mix(steel, lightOf(tier), 0.5)
    ctx.lineWidth = 1.4
    ctx.stroke()
  }
  ctx.restore()
  ctx.drawImage(sprite(key, w, h, (g) => paintMine(g, w, tier)), x - PAD, y - PAD)
  // warning lamp
  const lx = cx
  const ly = cy - MINE_R - 2.5
  ctx.save()
  ctx.fillStyle = mix('#5a1010', '#ff5a4a', blink)
  ctx.beginPath()
  ctx.arc(lx, ly, 2.2, 0, Math.PI * 2)
  ctx.fill()
  if (blink > 0.02) {
    ctx.globalCompositeOperation = 'lighter'
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 14)
    lg.addColorStop(0, rgba('#ff6b5a', 0.75 * blink))
    lg.addColorStop(1, rgba('#ff6b5a', 0))
    ctx.fillStyle = lg
    ctx.fillRect(lx - 14, ly - 14, 28, 28)
  }
  ctx.restore()
}

// ---------------------------------------------------------------- caustics on props

function caustics(ctx: CanvasRenderingContext2D, o: Obstacle, tier: Tier, clip: () => void) {
  const k = THEMES[tier].caustics
  if (k <= 0) return
  const pat = causticPattern(ctx)
  if (!pat) return
  ctx.save()
  clip()
  ctx.clip()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = k * 0.22
  const now = performance.now() / 1000
  pat.setTransform(new DOMMatrix().translate(o.x * 0.3 + now * 12, now * 5).scale(1.2))
  ctx.fillStyle = pat
  ctx.fillRect(o.x, o.y, o.width, o.height * 0.7)
  ctx.restore()
}

// ---------------------------------------------------------------- pearl (crystal)

function drawPearl(ctx: CanvasRenderingContext2D, c: Coin, tier: Tier) {
  const T = THEMES[tier]
  const y = c.y + Math.sin(c.animTimer) * 3
  const r = c.radius * 0.88
  const glow = tier === 3 ? T.glow : '#fdf4ff'
  ctx.save()
  ctx.translate(c.x, y)
  const halo = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.1)
  halo.addColorStop(0, rgba(glow, tier >= 2 ? 0.45 : 0.35))
  halo.addColorStop(1, rgba(glow, 0))
  if (tier >= 2) ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = halo
  ctx.fillRect(-r * 2.1, -r * 2.1, r * 4.2, r * 4.2)
  ctx.globalCompositeOperation = 'source-over'
  const body = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 0.5, 0, 0, r * 1.05)
  body.addColorStop(0, '#ffffff')
  body.addColorStop(0.35, '#f6f2fb')
  body.addColorStop(0.8, mix('#d5dcec', T.water[1], 0.18))
  body.addColorStop(1, mix('#9fb2c9', T.water[2], 0.25))
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  // iridescent sheen slowly turning
  const sheen = ctx.createConicGradient(c.animTimer * 0.35, 0, 0)
  sheen.addColorStop(0, 'rgba(244, 170, 210, 0.32)')
  sheen.addColorStop(0.25, 'rgba(160, 230, 245, 0.3)')
  sheen.addColorStop(0.5, 'rgba(200, 180, 250, 0.3)')
  sheen.addColorStop(0.75, 'rgba(250, 225, 170, 0.28)')
  sheen.addColorStop(1, 'rgba(244, 170, 210, 0.32)')
  ctx.fillStyle = sheen
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2)
  ctx.fill()
  // bounce light from below + crisp specular
  ctx.strokeStyle = rgba(T.rays > 0 ? '#c9fbff' : T.glow, 0.6)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(0, 0, r - 1.2, 0.35, Math.PI - 0.35)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.36, -r * 0.42, r * 0.28, r * 0.17, -0.6, 0, Math.PI * 2)
  ctx.fill()
  // glint
  const gA = Math.max(0, Math.sin(c.animTimer * 0.8))
  if (gA > 0.1) {
    const s = 3 + gA * 5
    const gx = -r * 0.42
    const gy = -r * 0.48
    ctx.globalAlpha = gA
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(gx, gy - s)
    ctx.quadraticCurveTo(gx, gy, gx + s, gy)
    ctx.quadraticCurveTo(gx, gy, gx, gy + s)
    ctx.quadraticCurveTo(gx, gy, gx - s, gy)
    ctx.quadraticCurveTo(gx, gy, gx, gy - s)
    ctx.fill()
  }
  ctx.restore()
}

// ---------------------------------------------------------------- skin

export const reefSkin: Skin = {
  outline: 'rgba(2, 24, 44, 0.85)',
  drawObstacle(ctx, o, tier) {
    const { x, y, width: w, height: h } = o
    const key = `${o.type}:${tier}:${w}x${h}`
    switch (o.type) {
      case 'boulder':
        ctx.drawImage(sprite(key, w, h, (g) => paintBrain(g, w, h, tier)), x - PAD, y - PAD)
        caustics(ctx, o, tier, () => {
          ctx.translate(x, y)
          domePath(ctx, w, h)
          ctx.translate(-x, -y)
        })
        return true
      case 'iceblock': {
        ctx.drawImage(sprite(key, w, h, (g) => paintChest(g, w, h, tier)), x - PAD, y - PAD)
        caustics(ctx, o, tier, () => {
          ctx.beginPath()
          ctx.rect(x + 2, y + 3, w - 4, h - 3)
        })
        // glint on the lock
        const gA = Math.max(0, Math.sin(o.animTimer * 2.6))
        if (gA > 0.2) {
          ctx.save()
          ctx.globalAlpha = gA
          ctx.fillStyle = '#fffbe6'
          const gx = x + w / 2 - 3
          const gy = y + 22
          const s = 2 + gA * 3
          ctx.beginPath()
          ctx.moveTo(gx, gy - s)
          ctx.lineTo(gx + 0.7, gy - 0.7)
          ctx.lineTo(gx + s, gy)
          ctx.lineTo(gx + 0.7, gy + 0.7)
          ctx.lineTo(gx, gy + s)
          ctx.lineTo(gx - 0.7, gy + 0.7)
          ctx.lineTo(gx - s, gy)
          ctx.lineTo(gx - 0.7, gy - 0.7)
          ctx.fill()
          ctx.restore()
        }
        return true
      }
      case 'icespikes':
        ctx.drawImage(sprite(key, w, h, (g) => paintSpikes(g, w, h, tier)), x - PAD, y - PAD)
        return true
      case 'pillar':
        ctx.drawImage(sprite(key, w, h, (g) => paintPillar(g, w, h, tier)), x - PAD, y - PAD)
        return true
      case 'flyer':
        drawMine(ctx, o, tier, key)
        return true
      default:
        return false
    }
  },
  drawCrystal(ctx, c, tier) {
    drawPearl(ctx, c, tier)
    return true
  },
}
