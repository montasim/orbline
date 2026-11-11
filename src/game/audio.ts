// Procedural Web Audio sound effects + nature soundscapes (see ambience.ts). Nothing touches the
// browser at import time (SSR); settings are read on first use.
// The ambience toggle is stored as `musicEnabled` so existing saved settings keep working.
import { Ambience, soundscapeFor } from './ambience'
import type { Tier } from './maps/types'
import { storage } from './storage'

type AudioCtor = typeof AudioContext

class GameAudio {
  private ctx: AudioContext | null = null
  private ambience: Ambience | null = null
  /** what should be playing, so toggling the setting back on can resume it */
  private wanted: { mapId: string; tier: Tier } | null = null
  private settingsLoaded = false
  private _isMuted = false
  private _musicMuted = false

  private loadSettings() {
    if (this.settingsLoaded || typeof window === 'undefined') return
    this.settingsLoaded = true
    const s = storage.getSettings()
    this._isMuted = !s.soundEnabled
    this._musicMuted = !s.musicEnabled
  }

  get isMuted() {
    this.loadSettings()
    return this._isMuted
  }

  get musicMuted() {
    this.loadSettings()
    return this._musicMuted
  }

  init() {
    if (typeof window === 'undefined') return
    if (!this.ctx) {
      // iPhone: 'playback' keeps game sound on even with the ring/silent switch set to silent (Safari 16.4+)
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
      if (session) session.type = 'playback'
      const Ctor: AudioCtor | undefined =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
      if (Ctor) this.ctx = new Ctor()
    }
    // iOS parks the context as 'interrupted' (calls, Siri, app switch), not only 'suspended'
    if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume().catch(() => {})
  }

  /**
   * iOS only lets audio start or resume inside a user gesture, so every tap/key wakes it.
   * Without this, sound stays off after an interruption until the page is reloaded.
   */
  unlockOnGesture() {
    if (typeof window === 'undefined') return () => {}
    const wake = () => this.init()
    const events = ['pointerup', 'touchend', 'keydown'] as const
    for (const ev of events) window.addEventListener(ev, wake, { capture: true, passive: true })
    return () => {
      for (const ev of events) window.removeEventListener(ev, wake, { capture: true })
    }
  }

  setSoundEnabled(enabled: boolean) {
    this.loadSettings()
    this._isMuted = !enabled
  }

  setMusicEnabled(enabled: boolean) {
    this.loadSettings()
    this._musicMuted = !enabled
    if (this._musicMuted) this.stopNodes()
    else if (this.wanted) this.startAmbience(this.wanted.mapId, this.wanted.tier)
  }

  /** Returns the context if sound effects may play now. */
  private sfx(): AudioContext | null {
    if (this.isMuted) return null
    this.init()
    return this.ctx
  }

  playJump() {
    const ctx = this.sfx()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const t = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(140, t)
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.14)
    gain.gain.setValueAtTime(0.2, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.16)
  }

  playDoubleJump() {
    const ctx = this.sfx()
    if (!ctx) return
    const now = ctx.currentTime
    ;[320, 640].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.05
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.15)
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.18)
    })
  }

  playCoin() {
    const ctx = this.sfx()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(987.77, t)
    osc.frequency.setValueAtTime(1318.51, t + 0.07)
    gain.gain.setValueAtTime(0.18, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.24)
  }

  playPowerup() {
    const ctx = this.sfx()
    if (!ctx) return
    const now = ctx.currentTime
    ;[440, 554.37, 659.25, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.06
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.12, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.2)
    })
  }

  playShieldBreak() {
    const ctx = this.sfx()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(500, t)
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.35)
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1200, t)
    filter.Q.setValueAtTime(3, t)
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.4)
  }

  playHit() {
    const ctx = this.sfx()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(120, t)
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3)
    gain.gain.setValueAtTime(0.4, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.38)
  }

  playLevelUp() {
    const ctx = this.sfx()
    if (!ctx) return
    const now = ctx.currentTime
    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.08
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.2, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.35)
    })
  }

  playButtonClick() {
    const ctx = this.sfx()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, t)
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.05)
    gain.gain.setValueAtTime(0.1, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.06)
  }

  /** Starts (or restarts) the soundscape for a map at a stage; fades in. */
  startAmbience(mapId: string, tier: Tier) {
    this.wanted = { mapId, tier }
    this.stopNodes()
    if (this.musicMuted) return
    this.init()
    if (!this.ctx) return
    this.ambience = new Ambience(this.ctx, soundscapeFor(mapId), tier)
  }

  /** Crossfades the running soundscape to another stage (level-up). */
  setAmbienceTier(tier: Tier) {
    if (this.wanted) this.wanted.tier = tier
    this.ambience?.setTier(tier)
  }

  /** Fades out (pause, game over, menu). */
  stopAmbience() {
    this.wanted = null
    this.stopNodes()
  }

  private stopNodes() {
    this.ambience?.stop()
    this.ambience = null
  }
}

export const audio = new GameAudio()
