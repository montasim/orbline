// Procedural nature soundscapes (no audio files): wind, rustle, rain, rumble/water, bubbles, crackle,
// thunder — all synthesised from filtered noise with Web Audio, mixed per world and stage.
import type { Tier } from './maps/types'

interface Recipe {
  /** gusting wind: bandpassed noise whose pitch/level drift randomly */
  wind?: { level: number; pitch: number; gust: number }
  /** high hiss that swells with the gusts: leaves, blowing snow, sand */
  rustle?: { level: number; freq: number }
  /** steady rain wash plus droplet ticks per second */
  rain?: { level: number; drops: number }
  /** low swell: underwater pressure or volcanic rumble */
  rumble?: { level: number; cutoff: number }
  /** rising bubble blips per second */
  bubbles?: number
  /** lava/fire crackles per second */
  crackle?: number
  /** a thunder roll (or eruption boom) every min–max seconds */
  thunder?: { every: [number, number]; level: number; near?: boolean }
}

type Soundscape = [Recipe, Recipe, Recipe, Recipe]

/** Keyed by map id (src/game/maps); tiers follow the difficulty stages. */
const SOUNDSCAPES: Record<string, Soundscape> = {
  arctic: [
    { wind: { level: 0.1, pitch: 480, gust: 0.5 } },
    { wind: { level: 0.07, pitch: 420, gust: 0.3 } },
    { wind: { level: 0.2, pitch: 680, gust: 0.9 }, rustle: { level: 0.06, freq: 4200 } },
    { wind: { level: 0.08, pitch: 380, gust: 0.4 } },
  ],
  meadow: [
    { wind: { level: 0.05, pitch: 340, gust: 0.3 }, rustle: { level: 0.025, freq: 3400 } },
    { wind: { level: 0.06, pitch: 400, gust: 0.4 }, rustle: { level: 0.035, freq: 3600 } },
    {
      wind: { level: 0.12, pitch: 540, gust: 0.9 },
      rustle: { level: 0.06, freq: 3800 },
      rain: { level: 0.06, drops: 7 },
      thunder: { every: [16, 32], level: 0.35 },
    },
    { wind: { level: 0.04, pitch: 300, gust: 0.3 }, rustle: { level: 0.02, freq: 3200 } },
  ],
  dunes: [
    { wind: { level: 0.08, pitch: 420, gust: 0.5 }, rustle: { level: 0.02, freq: 5200 } },
    { wind: { level: 0.09, pitch: 460, gust: 0.6 }, rustle: { level: 0.025, freq: 5000 } },
    { wind: { level: 0.22, pitch: 640, gust: 1 }, rustle: { level: 0.1, freq: 4600 }, rumble: { level: 0.05, cutoff: 120 } },
    { wind: { level: 0.08, pitch: 320, gust: 0.35 }, rustle: { level: 0.015, freq: 5000 } },
  ],
  reef: [
    { rumble: { level: 0.12, cutoff: 360 }, bubbles: 1.5 },
    { rumble: { level: 0.12, cutoff: 300 }, bubbles: 1.2 },
    { rumble: { level: 0.14, cutoff: 210 }, bubbles: 0.7 },
    { rumble: { level: 0.15, cutoff: 140 }, bubbles: 0.4 },
  ],
  caldera: [
    { rumble: { level: 0.1, cutoff: 110 }, crackle: 2, wind: { level: 0.04, pitch: 300, gust: 0.4 }, thunder: { every: [20, 40], level: 0.3 } },
    { rumble: { level: 0.12, cutoff: 110 }, crackle: 3, thunder: { every: [15, 30], level: 0.35 } },
    { rumble: { level: 0.14, cutoff: 120 }, crackle: 4, thunder: { every: [12, 24], level: 0.4 } },
    { rumble: { level: 0.18, cutoff: 130 }, crackle: 6, thunder: { every: [7, 15], level: 0.5, near: true } },
  ],
}

const MASTER = 1.6
const FADE = 1.2 // seconds for tier crossfades

/** One running soundscape; created on run start, dropped on stop. */
export class Ambience {
  private master: GainNode
  private white: AudioBuffer
  private brown: AudioBuffer
  private sources: AudioScheduledSourceNode[] = []
  private wind: { gain: GainNode; band: BiquadFilterNode }
  private rustle: { gain: GainNode; band: BiquadFilterNode }
  private rain: GainNode
  private rumble: { gain: GainNode; low: BiquadFilterNode }
  private recipe: Recipe = {}
  private timer: ReturnType<typeof setInterval>
  private nextGust = 0
  private nextThunder = 0

  constructor(
    private ctx: AudioContext,
    private scape: Soundscape,
    tier: Tier,
  ) {
    this.white = noiseBuffer(ctx, 'white')
    this.brown = noiseBuffer(ctx, 'brown')
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(ctx.destination)

    const wind = this.chain(this.white, 'bandpass')
    wind.filter.Q.value = 0.9
    this.wind = { gain: wind.gain, band: wind.filter }
    const rustle = this.chain(this.white, 'bandpass')
    rustle.filter.Q.value = 0.6
    this.rustle = { gain: rustle.gain, band: rustle.filter }
    const rain = this.chain(this.white, 'highpass')
    rain.filter.frequency.value = 900
    const rainTop = ctx.createBiquadFilter()
    rainTop.type = 'lowpass'
    rainTop.frequency.value = 7000
    rain.filter.disconnect()
    rain.filter.connect(rainTop)
    rainTop.connect(rain.gain)
    this.rain = rain.gain
    const rumble = this.chain(this.brown, 'lowpass')
    this.rumble = { gain: rumble.gain, low: rumble.filter }
    // slow swell on the rumble (waves / magma breathing)
    const lfo = ctx.createOscillator()
    const lfoDepth = ctx.createGain()
    lfo.frequency.value = 0.08
    lfoDepth.gain.value = 0.35
    lfo.connect(lfoDepth)
    const swell = ctx.createGain()
    swell.gain.value = 1
    lfoDepth.connect(swell.gain)
    rumble.gain.disconnect()
    rumble.gain.connect(swell)
    swell.connect(this.master)
    lfo.start()
    this.sources.push(lfo)

    this.setTier(tier)
    this.master.gain.setTargetAtTime(MASTER, ctx.currentTime, 0.6)
    this.timer = setInterval(() => this.tick(), 100)
  }

  /** looping noise → filter → gain → master */
  private chain(buffer: AudioBuffer, type: BiquadFilterType) {
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    // random offset so voices sharing a buffer don't move in lockstep
    src.start(0, Math.random() * buffer.duration)
    this.sources.push(src)
    const filter = this.ctx.createBiquadFilter()
    filter.type = type
    const gain = this.ctx.createGain()
    gain.gain.value = 0
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    return { filter, gain }
  }

  setTier(tier: Tier) {
    const r = this.scape[tier]
    this.recipe = r
    const t = this.ctx.currentTime
    this.wind.gain.gain.setTargetAtTime(r.wind?.level ?? 0, t, FADE)
    if (r.wind) this.wind.band.frequency.setTargetAtTime(r.wind.pitch, t, FADE)
    this.rustle.gain.gain.setTargetAtTime(r.rustle?.level ?? 0, t, FADE)
    if (r.rustle) this.rustle.band.frequency.setTargetAtTime(r.rustle.freq, t, FADE)
    this.rain.gain.setTargetAtTime(r.rain?.level ?? 0, t, FADE)
    this.rumble.gain.gain.setTargetAtTime(r.rumble?.level ?? 0, t, FADE)
    if (r.rumble) this.rumble.low.frequency.setTargetAtTime(r.rumble.cutoff, t, FADE)
    if (r.thunder) this.nextThunder = t + rand(r.thunder.every[0] * 0.4, r.thunder.every[1] * 0.6)
  }

  /** 10 Hz scheduler for gusts and one-shot events */
  private tick() {
    const { ctx, recipe: r } = this
    const t = ctx.currentTime
    if (r.wind && t >= this.nextGust) {
      // a gust: wind pitch and level drift to new random targets; the rustle swells with it
      const g = r.wind.gust
      const strength = 1 - g * 0.6 + Math.random() * g * 1.2
      const tc = rand(0.6, 1.6)
      this.wind.gain.gain.setTargetAtTime(r.wind.level * strength, t, tc)
      this.wind.band.frequency.setTargetAtTime(r.wind.pitch * (0.75 + Math.random() * 0.6 * (0.5 + g)), t, tc)
      if (r.rustle) this.rustle.gain.gain.setTargetAtTime(r.rustle.level * strength * strength, t, tc)
      this.nextGust = t + rand(0.8, 2.6)
    }
    if (r.rain && Math.random() < r.rain.drops * 0.1) this.drop(t + Math.random() * 0.1, r.rain.level)
    if (r.bubbles && Math.random() < r.bubbles * 0.1) this.bubble(t + Math.random() * 0.1)
    if (r.crackle && Math.random() < r.crackle * 0.1) {
      // crackles come in little clusters
      const n = 1 + Math.floor(Math.random() * 3)
      for (let i = 0; i < n; i++) this.crack(t + Math.random() * 0.12)
    }
    if (r.thunder && t >= this.nextThunder) {
      this.thunder(t, r.thunder.level, !!r.thunder.near)
      this.nextThunder = t + rand(r.thunder.every[0], r.thunder.every[1])
    }
  }

  private burst(t: number, dur: number, type: BiquadFilterType, freq: number, q: number, level: number) {
    const src = this.ctx.createBufferSource()
    src.buffer = this.white
    const f = this.ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(level, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(t, Math.random() * (this.white.duration - dur - 0.01))
    src.stop(t + dur + 0.02)
    return { f, g }
  }

  private drop(t: number, level: number) {
    this.burst(t, rand(0.008, 0.02), 'bandpass', rand(2500, 6500), 2, level * rand(0.6, 1.6))
  }

  private crack(t: number) {
    this.burst(t, rand(0.004, 0.014), 'bandpass', rand(1500, 4500), 1.2, rand(0.05, 0.14))
  }

  private bubble(t: number) {
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    const f0 = rand(260, 620)
    const dur = rand(0.05, 0.11)
    o.type = 'sine'
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f0 * rand(1.8, 2.6), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(rand(0.02, 0.05), t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  /** a rolling rumble: low-passed noise that closes over a few seconds; `near` adds a sharp crack first */
  private thunder(t: number, level: number, near: boolean) {
    const dur = rand(3, 5.5)
    const src = this.ctx.createBufferSource()
    src.buffer = this.brown
    const f = this.ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(near ? 900 : 380, t)
    f.frequency.exponentialRampToValueAtTime(70, t + dur)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(level, t + (near ? 0.04 : 0.5))
    // a second, softer swell makes it roll rather than just decay
    g.gain.exponentialRampToValueAtTime(level * 0.35, t + dur * 0.35)
    g.gain.exponentialRampToValueAtTime(level * 0.55, t + dur * 0.5)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(t, Math.random() * (this.brown.duration - dur - 0.1))
    src.stop(t + dur + 0.05)
    if (near) this.burst(t, 0.18, 'highpass', 1200, 0.7, level * 0.5)
  }

  /** fade out, then release every node */
  stop() {
    clearInterval(this.timer)
    const t = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setTargetAtTime(0, t, 0.25)
    const sources = this.sources
    setTimeout(() => {
      for (const s of sources) {
        try {
          s.stop()
        } catch {
          // already stopped
        }
      }
      this.master.disconnect()
    }, 1500)
  }
}

export function soundscapeFor(mapId: string): Soundscape {
  return SOUNDSCAPES[mapId] ?? SOUNDSCAPES.arctic
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

// 6 s buffers: long enough that the loop point isn't audible, and one-shots can start at random offsets
function noiseBuffer(ctx: AudioContext, kind: 'white' | 'brown'): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 6)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (kind === 'white') d[i] = w
    else {
      last = (last + 0.02 * w) / 1.02 // integrated (brown) noise: deep, soft rumble
      d[i] = last * 3.5
    }
  }
  return buf
}
