// Procedural Web Audio sound effects + bass-line BGM. Nothing touches the
// browser at import time (SSR); settings are read on first use.
import { storage } from './storage'

type AudioCtor = typeof AudioContext

class GameAudio {
  private ctx: AudioContext | null = null
  private bgmInterval: ReturnType<typeof setInterval> | null = null
  private settingsLoaded = false
  private _isMuted = false
  private _musicMuted = false
  private currentStep = 0
  private tempo = 120

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
      const Ctor: AudioCtor | undefined =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
      if (Ctor) this.ctx = new Ctor()
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setSoundEnabled(enabled: boolean) {
    this.loadSettings()
    this._isMuted = !enabled
  }

  setMusicEnabled(enabled: boolean) {
    this.loadSettings()
    this._musicMuted = !enabled
    if (this._musicMuted) this.stopBgm()
    else this.startBgm()
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

  startBgm() {
    if (this.musicMuted || this.bgmInterval) return
    this.init()
    if (!this.ctx) return
    const bassline = [55, 55, 65.4, 73.4, 55, 55, 82.4, 73.4]
    this.currentStep = 0
    const stepMs = (60 / this.tempo / 2) * 1000
    this.bgmInterval = setInterval(() => {
      const ctx = this.ctx
      if (this._musicMuted || !ctx) return
      const t = ctx.currentTime
      const freq = bassline[this.currentStep % bassline.length]
      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, t)
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(350, t)
      filter.frequency.exponentialRampToValueAtTime(100, t + 0.18)
      gain.gain.setValueAtTime(0.07, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.22)
      if (this.currentStep % 2 === 1) {
        // off-beat hi-hat: short burst of high-passed white noise
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < buffer.length; i++) data[i] = Math.random() * 2 - 1
        const src = ctx.createBufferSource()
        src.buffer = buffer
        const hp = ctx.createBiquadFilter()
        hp.type = 'highpass'
        hp.frequency.setValueAtTime(7000, t)
        const hatGain = ctx.createGain()
        hatGain.gain.setValueAtTime(0.025, t)
        hatGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
        src.connect(hp)
        hp.connect(hatGain)
        hatGain.connect(ctx.destination)
        src.start(t)
      }
      this.currentStep++
    }, stepMs)
  }

  stopBgm() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval)
      this.bgmInterval = null
    }
  }

  updateTempo(level: number) {
    this.tempo = 118 + (level - 1) * 12
    if (this.bgmInterval) {
      this.stopBgm()
      this.startBgm()
    }
  }
}

export const audio = new GameAudio()
