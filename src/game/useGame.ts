// Port of the original game hook: owns the engine objects, the rAF loop,
// input, resize/orientation handling, achievements and end-of-run bookkeeping.
import confetti from 'canvas-confetti'
import { useCallback, useEffect, useRef, useState } from 'react'
import { audio } from './audio'
import { type IconName, LEVELS } from './data'
import { resolveCollisions } from './engine/collisions'
import { ObstacleManager } from './engine/obstacles'
import { ParticleSystem } from './engine/particles'
import { Player } from './engine/player'
import { PowerupManager } from './engine/powerups'
import { ScoreManager } from './engine/score'
import { storage } from './storage'
import type { GameApi, GameState, PowerupStatus, ScoreData, Toast } from './types'
import { useOnlineRun } from './useOnlineRun'
import { type GameMap, mapById, type Scene, type Tier } from './maps'

interface Engine {
  player: Player | null
  obstacles: ObstacleManager | null
  powerups: PowerupManager | null
  particles: ParticleSystem | null
  score: ScoreManager | null
  background: Scene | null
  groundY: number
  lastTime: number
  animationFrameId: number | null
  isRunning: boolean
  powerupsUsedCount: number
  lastHudUpdate: number
  shake: { intensity: number }
  jumpBuffer: number
  hadSpeedBoost: boolean
  view: { w: number; h: number; scale: number }
}

interface RunStats {
  isFirstRun: boolean
  distance: number
  doubleJumps: number
  coins: number
  speedBoosts: number
}

/** Narrow (portrait) screens see at least this much track: the world is zoomed out instead of cropped. */
const MIN_VIEW_WIDTH = 760
/** Height kept clear for the on-screen Jump/Slide buttons on touch devices (button + HUD padding, CSS px). */
const touchControlsReserve = (cssW: number) => (cssW >= 640 ? 128 : 100)

/** Bottom safe-area inset in CSS px (home indicator, Android gesture bar); the HUD's safe-pad lifts the buttons by it. */
function safeAreaBottom() {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px)'
  document.body.appendChild(probe)
  const px = Number.parseFloat(getComputedStyle(probe).paddingBottom) || 0
  probe.remove()
  return px
}

/**
 * Three sizes, kept apart: CSS px (layout), logical units (what the game simulates and scenes draw in)
 * and backing pixels (CSS × device pixel ratio, so phones and tablets render sharp).
 */
function measureView() {
  const cssW = Math.max(1, window.innerWidth || document.documentElement.clientWidth)
  const cssH = Math.max(1, window.innerHeight || document.documentElement.clientHeight)
  const portrait = cssH > cssW
  const touch = window.matchMedia('(pointer: coarse)').matches
  const zoom = Math.max(1, MIN_VIEW_WIDTH / cssW) // logical units per CSS px
  // shortcut: backing store capped at 2× and ~4 MP so big screens stay fast; raise if perf allows
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / (cssW * cssH))))
  const margin = portrait ? clamp(cssH * 0.24, 90, 145) : clamp(cssH * 0.18, 55, 85)
  const groundMargin = touch ? Math.max(margin, touchControlsReserve(cssW) + safeAreaBottom()) : margin
  // keep the runner clear of the Slide button on touch screens
  const playerX = Math.max(touch ? 100 : 50, Math.min(140, cssW * (portrait ? 0.18 : 0.14)))
  return {
    portrait,
    w: cssW * zoom,
    h: cssH * zoom,
    groundY: Math.max(130, Math.round((cssH - groundMargin) * zoom)),
    playerX: Math.round(playerX * zoom),
    backingW: Math.round(cssW * dpr),
    backingH: Math.round(cssH * dpr),
    /** backing pixels per logical unit */
    scale: dpr / zoom,
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** LEVELS index (difficulty stage) the score has reached, as a map tier. */
const tierOf = (score: ScoreManager | null): Tier => ((score ? score.currentLevel.level - 1 : 0) as Tier)
/** Confetti in the aurora palette. */
const SNOW_CONFETTI = ['#5eead4', '#a7f3d0', '#7dd3fc', '#e0f2fe', '#ffffff']

export function useGame(): GameApi {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { onlineRun, beginRun, endRun, submitPendingRun } = useOnlineRun()
  const [gameState, setGameState] = useState<GameState>('MENU')
  // Storage-backed initial values are loaded in a mount effect so SSR and first client render match.
  const [selectedSkin, setSelectedSkin] = useState('frost')
  const [selectedMap, setSelectedMap] = useState('arctic')
  const mapRef = useRef<GameMap>(mapById('arctic'))
  const [scoreData, setScoreData] = useState<ScoreData>({
    distance: 0,
    coins: 0,
    score: 0,
    bestScore: 0,
    level: 1,
    levelName: LEVELS[0].name,
    levelTitle: LEVELS[0].title,
    multiplier: 1,
  })
  const [powerupStatus, setPowerupStatus] = useState<PowerupStatus>({
    shield: false,
    magnet: false,
    magnetTimer: 0,
    magnetMax: 8,
    speedBoost: false,
    speedBoostTimer: 0,
    speedBoostMax: 5,
  })
  const [toastNotification, setToastNotification] = useState<Toast | null>(null)
  const [isNewHighScore, setIsNewHighScore] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const lastJumpTime = useRef(0)
  const engine = useRef<Engine>({
    player: null,
    obstacles: null,
    powerups: null,
    particles: null,
    score: null,
    background: null,
    groundY: 0,
    lastTime: 0,
    animationFrameId: null,
    isRunning: false,
    powerupsUsedCount: 0,
    lastHudUpdate: 0,
    shake: { intensity: 0 },
    jumpBuffer: 0,
    hadSpeedBoost: false,
    view: { w: 1, h: 1, scale: 1 },
  })

  useEffect(() => {
    // dev-only handle for testing levels/power-ups from the console; stripped from production builds
    if (import.meta.env.DEV) (window as unknown as { __orbline: unknown }).__orbline = engine
    setSelectedSkin(storage.getSelectedSkin())
    // dev-only ?map=<id> preview that doesn't touch the saved choice (lets tabs preview different maps)
    const previewMap = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('map') : null
    setSelectedMap(previewMap ?? storage.getSelectedMap())
    setScoreData((d) => ({ ...d, bestScore: storage.getBestScore() }))
    return audio.unlockOnGesture()
  }, [])

  // one pop-up at a time: later ones wait their turn instead of replacing what's on screen
  const toastQueue = useRef<Toast[]>([])
  const toastShowing = useRef(false)
  const nextToast = useCallback(() => {
    const t = toastQueue.current.shift()
    toastShowing.current = !!t
    setToastNotification(t ?? null)
    if (t) setTimeout(nextToast, 3000)
  }, [])
  const showToast = useCallback(
    (title: string, message: string, icon: IconName = 'Award') => {
      const q = toastQueue.current
      const last = q.at(-1)
      if (last?.title === title && last.message === message) return // e.g. sound toggled repeatedly
      q.push({ title, message, icon })
      if (q.length > 3) q.shift() // stale news is dropped, not shown late
      if (!toastShowing.current) nextToast()
    },
    [nextToast],
  )

  const checkAchievements = useCallback(
    (stats: RunStats) => {
      const unlock = (id: string) => {
        const a = storage.unlockAchievement(id)
        if (a) showToast('Trophy unlocked', a.title, 'Trophy')
      }
      if (stats.isFirstRun) unlock('first_run')
      if (stats.distance >= 500) unlock('reach_500m')
      if (stats.distance >= 1500) unlock('reach_1500m')
      if (stats.doubleJumps >= 20) unlock('double_jumper')
      if (storage.getTotalCoins() >= 100) unlock('coin_hoarder')
      if (stats.speedBoosts >= 3) unlock('speed_demon')
    },
    [showToast],
  )

  const initEngine = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // logical size; measureView never returns 0×0 (scenes divide by width)
    const view = measureView()
    const { w: width, h: height, groundY } = view
    const map = mapById(selectedMap)
    mapRef.current = map
    const player = new Player(width, height, groundY)
    player.setSkin(selectedSkin)
    player.x = view.playerX
    const score = new ScoreManager()
    score.onLevelUpCallback = (level) => {
      const style = map.tiers[level.level - 1]
      audio.setAmbienceTier((level.level - 1) as Tier)
      showToast(style.title, `Level ${level.level} · ${style.name}`, 'Zap')
      void confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: [style.accent, ...SNOW_CONFETTI.slice(1)] })
    }
    engine.current = {
      player,
      obstacles: new ObstacleManager(),
      powerups: new PowerupManager(),
      particles: new ParticleSystem(),
      score,
      background: map.createScene(width, height, groundY),
      groundY,
      lastTime: performance.now(),
      animationFrameId: null,
      isRunning: false,
      powerupsUsedCount: 0,
      lastHudUpdate: 0,
      shake: { intensity: 0 },
      jumpBuffer: 0,
      hadSpeedBoost: false,
      view: { w: width, h: height, scale: view.scale },
    }
  }, [selectedSkin, selectedMap, showToast])

  const handleGameOver = useCallback(() => {
    const e = engine.current
    if (!e.score || !e.player) return
    e.isRunning = false
    audio.stopAmbience()
    e.shake.intensity = 16
    const finalScore = e.score.score
    // the HUD is throttled to ~10 Hz, so publish the exact final numbers the server will also see
    setScoreData((d) => ({ ...d, distance: Math.floor(e.score?.distance ?? 0), coins: e.score?.coins ?? 0, score: finalScore }))
    const newHigh = finalScore > e.score.startingBest && finalScore > 0
    setIsNewHighScore(newHigh)
    if (newHigh) void confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: SNOW_CONFETTI })
    endRun({ distance: e.score.distance, crystals: e.score.coins, speedBoosts: e.powerupsUsedCount })
    storage.updateDailyChallenge('distance', Math.floor(e.score.distance))
    storage.updateDailyChallenge('coins', e.score.coins)
    storage.updateDailyChallenge('doubleJumps', e.player.totalDoubleJumps)
    storage.updateDailyChallenge('powerups', e.powerups?.collectedCount ?? 0)
    checkAchievements({
      isFirstRun: true,
      distance: e.score.distance,
      doubleJumps: e.player.totalDoubleJumps,
      coins: e.score.coins,
      speedBoosts: e.powerupsUsedCount,
    })
    setGameState('GAMEOVER')
  }, [checkAchievements, endRun])

  const gameLoop = useCallback(
    function loop(time: number) {
      const e = engine.current
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      if (!e.isRunning) {
        // idle frame: scenery drifts, the orb idles; the menu effect schedules these
        const dt = Math.min((time - (e.lastTime || time)) / 1000, 0.05)
        e.lastTime = time
        if (e.background && e.player) {
          ctx.setTransform(e.view.scale, 0, 0, e.view.scale, 0, 0)
          // the orb rolls at an easy pace so the title scene feels alive
          const idleSpeed = 2
          e.background.update(idleSpeed)
          e.player.update(dt, e.groundY, null, {}, idleSpeed)
          e.background.draw(ctx, tierOf(e.score))
          e.player.draw(ctx, e.powerups ? e.powerups.active : {})
        }
        return
      }

      const dt = Math.min((time - e.lastTime) / 1000, 0.05)
      e.lastTime = time
      const { player, obstacles, powerups, particles, score, background, groundY } = e
      if (!player || !obstacles || !powerups || !particles || !score || !background) return
      const level = score.currentLevel
      const tier = tierOf(score)
      const map = mapRef.current
      const boosted = powerups.active.speedBoost
      const speed = boosted ? level.baseSpeed * 1.55 : level.baseSpeed

      if (e.jumpBuffer > 0) {
        e.jumpBuffer -= dt
        if (player.isGrounded) {
          player.jump(particles)
          e.jumpBuffer = 0
        }
      }
      background.update(speed)
      player.update(dt, groundY, particles, powerups.active, speed)
      powerups.update(dt, speed)
      const spawnedAt = obstacles.update(dt, time, speed, level, groundY, player, powerups.active.magnet)
      // Not in the original (spawnRandom was never called): drop a token mid-gap after the obstacle.
      if (spawnedAt !== null && Math.random() < level.powerupSpawnChance) powerups.spawnRandom(spawnedAt + 260, groundY)
      particles.update(dt)
      score.update(dt, speed, boosted)
      if (boosted && !e.hadSpeedBoost) {
        e.powerupsUsedCount++
        e.hadSpeedBoost = true
        e.shake.intensity = 5
      } else if (!boosted) e.hadSpeedBoost = false

      resolveCollisions({
        player,
        obstacleManager: obstacles,
        powerupManager: powerups,
        particleSystem: particles,
        onGameOver: handleGameOver,
        onCoinCollected: () => score.addCoin(),
        onShieldSaved: () => {
          e.shake.intensity = 10
          const a = storage.unlockAchievement('shield_savior')
          if (a) showToast('Trophy unlocked', a.title, 'Trophy')
        },
        onPowerupCollected: (def) => showToast(def.name, def.desc, def.icon),
      })

      ctx.setTransform(e.view.scale, 0, 0, e.view.scale, 0, 0)
      ctx.clearRect(0, 0, e.view.w, e.view.h)
      ctx.save()
      if (e.shake.intensity > 0) {
        ctx.translate((Math.random() - 0.5) * e.shake.intensity * 2, (Math.random() - 0.5) * e.shake.intensity * 2)
        e.shake.intensity *= 0.88
        if (e.shake.intensity < 0.2) e.shake.intensity = 0
      }
      background.draw(ctx, tier)
      obstacles.draw(ctx, map.tiers[tier].accent, map.skin, tier)
      powerups.draw(ctx)
      player.draw(ctx, powerups.active)
      particles.draw(ctx)
      ctx.restore()

      // HUD state is throttled to ~10 Hz to keep React re-renders cheap
      if (!e.lastHudUpdate || time - e.lastHudUpdate >= 95) {
        e.lastHudUpdate = time
        setScoreData({
          distance: Math.floor(score.distance),
          coins: score.coins,
          score: score.score,
          bestScore: score.bestScore,
          level: level.level,
          levelName: map.tiers[tier].name,
          levelTitle: map.tiers[tier].title,
          multiplier: score.scoreMultiplier,
        })
        setPowerupStatus({ ...powerups.active })
      }
      e.animationFrameId = requestAnimationFrame(loop)
    },
    [handleGameOver, showToast],
  )
  const startGame = useCallback(() => {
    initEngine()
    beginRun()
    const e = engine.current
    e.isRunning = true
    e.lastTime = performance.now()
    audio.startAmbience(mapRef.current.id, 0)
    setGameState('PLAYING')
    if (e.animationFrameId) cancelAnimationFrame(e.animationFrameId)
    e.animationFrameId = requestAnimationFrame(gameLoop)
  }, [initEngine, gameLoop, beginRun])

  const togglePause = useCallback(() => {
    const e = engine.current
    if (gameState === 'PLAYING') {
      e.isRunning = false
      audio.stopAmbience()
      setGameState('PAUSED')
    } else if (gameState === 'PAUSED') {
      e.isRunning = true
      e.lastTime = performance.now()
      audio.startAmbience(mapRef.current.id, tierOf(e.score))
      setGameState('PLAYING')
      e.animationFrameId = requestAnimationFrame(gameLoop)
    }
  }, [gameState, gameLoop])

  const restartGame = useCallback(() => {
    startGame()
  }, [startGame])

  const goToMenu = useCallback(() => {
    const e = engine.current
    e.isRunning = false
    audio.stopAmbience()
    if (e.animationFrameId) cancelAnimationFrame(e.animationFrameId)
    setGameState('MENU')
  }, [])

  const changeSkin = useCallback((id: string) => {
    setSelectedSkin(id)
    storage.setSelectedSkin(id)
    engine.current.player?.setSkin(id)
  }, [])

  // only offered from the title screen; the engine rebuilds via initEngine's selectedMap dependency
  const changeMap = useCallback((id: string) => {
    setSelectedMap(id)
    storage.setSelectedMap(id)
  }, [])

  const triggerJump = useCallback(() => {
    if (gameState !== 'PLAYING') return
    const now = performance.now()
    if (now - lastJumpTime.current < 110) return
    lastJumpTime.current = now
    const e = engine.current
    // a jump pressed just before landing is buffered for 160 ms
    if (e.player && !e.player.jump(e.particles) && !e.player.isGrounded && e.player.canDoubleJump) e.jumpBuffer = 0.16
  }, [gameState])

  const triggerSlide = useCallback(() => {
    if (gameState !== 'PLAYING') return
    engine.current.player?.slide()
  }, [gameState])

  const triggerStopSlide = useCallback(() => {
    if (gameState !== 'PLAYING') return
    engine.current.player?.stopSlide()
  }, [gameState])

  const requestLandscapeMode = useCallback(async () => {
    try {
      const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
      if (!document.fullscreenElement) {
        if (root.requestFullscreen) await root.requestFullscreen()
        else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen()
      }
      const orientation = window.screen?.orientation as ScreenOrientation & {
        lock?: (o: string) => Promise<void>
      }
      if (orientation?.lock) await orientation.lock('landscape')
      showToast('Landscape mode', 'Turned sideways for the best view')
    } catch {
      showToast('Turn your phone', 'Switch on auto-rotate and hold it sideways')
    }
  }, [showToast])

  // keyboard
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      // typing a leaderboard name must not jump, restart, mute or pause
      if (ev.target instanceof HTMLElement && ev.target.closest('input, textarea, [contenteditable]')) return
      if (ev.repeat && (ev.code === 'Space' || ev.code === 'ArrowUp')) return
      if (ev.code === 'Space' || ev.code === 'ArrowUp' || ev.key === 'w' || ev.key === 'W') {
        ev.preventDefault()
        if (gameState === 'PLAYING') triggerJump()
        else if (gameState === 'MENU' || gameState === 'GAMEOVER') startGame()
      } else if (ev.code === 'ArrowDown' || ev.key === 's' || ev.key === 'S') {
        ev.preventDefault()
        triggerSlide()
      } else if (ev.code === 'KeyP' || ev.code === 'Escape') {
        ev.preventDefault()
        togglePause()
      } else if (ev.code === 'KeyM') {
        const s = storage.getSettings()
        const next = { ...s, soundEnabled: !s.soundEnabled, musicEnabled: !s.soundEnabled }
        storage.saveSettings(next)
        audio.setSoundEnabled(next.soundEnabled)
        audio.setMusicEnabled(next.musicEnabled)
        showToast('Sound', next.soundEnabled ? 'Sound on' : 'Sound off')
      }
    }
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.code === 'ArrowDown' || ev.key === 's' || ev.key === 'S') triggerStopSlide()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [gameState, triggerJump, triggerSlide, triggerStopSlide, togglePause, startGame, showToast])

  // resize / orientation: backing store follows the device pixel ratio; the world uses logical units (measureView)
  useEffect(() => {
    const applySize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const view = measureView()
      canvas.width = view.backingW
      canvas.height = view.backingH
      setIsPortrait(view.portrait)
      const { w: width, h: height, groundY } = view
      const e = engine.current
      e.view = { w: width, h: height, scale: view.scale }
      const prevGroundY = e.groundY || groundY
      const deltaY = groundY - prevGroundY
      e.groundY = groundY
      const p = e.player
      if (p) {
        p.canvasWidth = width
        p.canvasHeight = height
        p.groundY = groundY
        p.x = view.playerX
        if (p.isGrounded) p.y = groundY - p.height
        else if (prevGroundY > 0 && Math.abs(deltaY) > 1) p.y += deltaY
      }
      if (prevGroundY > 0 && Math.abs(deltaY) > 1) {
        e.obstacles?.adjustGround(groundY, deltaY)
        e.powerups?.adjustGround(groundY, deltaY)
      }
      e.background?.resize(width, height, groundY)
    }
    applySize()
    // mobile browsers report final viewport sizes late after rotation, so re-measure a few times
    const onResize = () => {
      applySize()
      setTimeout(applySize, 60)
      setTimeout(applySize, 180)
      setTimeout(applySize, 380)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    window.screen?.orientation?.addEventListener('change', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      window.screen?.orientation?.removeEventListener('change', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
    }
  }, [])

  // keep the aurora scene alive behind the title screen (gameLoop takes its idle path)
  useEffect(() => {
    if (gameState !== 'MENU') return
    let id = 0
    const tick = (t: number) => {
      // once a run starts, the game loop owns the frames; calling it here would fork a second loop
      if (engine.current.isRunning) return
      gameLoop(t)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [gameState, gameLoop])

  // (re)build the engine and paint a static first frame whenever the skin changes
  useEffect(() => {
    initEngine()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const { background, score, player } = engine.current
    if (ctx && background && score && player) {
      ctx.setTransform(engine.current.view.scale, 0, 0, engine.current.view.scale, 0, 0)
      background.draw(ctx, tierOf(score))
      player.draw(ctx, {})
    }
  }, [initEngine])

  return {
    canvasRef,
    gameState,
    scoreData,
    powerupStatus,
    selectedSkin,
    toastNotification,
    isNewHighScore,
    isPortrait,
    requestLandscapeMode,
    startGame,
    togglePause,
    restartGame,
    goToMenu,
    changeSkin,
    selectedMap,
    changeMap,
    triggerJump,
    triggerSlide,
    triggerStopSlide,
    showToast,
    onlineRun,
    submitPendingRun,
  }
}
