// Port of the original game hook: owns the engine objects, the rAF loop,
// input, resize/orientation handling, achievements and end-of-run bookkeeping.
import confetti from 'canvas-confetti'
import { useCallback, useEffect, useRef, useState } from 'react'
import { audio } from './audio'
import { type BgTheme, type IconName, LEVELS } from './data'
import { Background } from './engine/background'
import { resolveCollisions } from './engine/collisions'
import { ObstacleManager } from './engine/obstacles'
import { ParticleSystem } from './engine/particles'
import { Player } from './engine/player'
import { PowerupManager } from './engine/powerups'
import { ScoreManager } from './engine/score'
import { storage } from './storage'
import type { GameApi, GameState, PowerupStatus, ScoreData, Toast } from './types'

interface Engine {
  player: Player | null
  obstacles: ObstacleManager | null
  powerups: PowerupManager | null
  particles: ParticleSystem | null
  score: ScoreManager | null
  background: Background | null
  groundY: number
  lastTime: number
  animationFrameId: number | null
  isRunning: boolean
  powerupsUsedCount: number
  lastHudUpdate: number
  shake: { intensity: number }
  jumpBuffer: number
  hadSpeedBoost: boolean
}

interface RunStats {
  isFirstRun: boolean
  distance: number
  doubleJumps: number
  coins: number
  speedBoosts: number
}

const MENU_THEME: BgTheme = LEVELS[0].bgTheme

export function useGame(): GameApi {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>('MENU')
  // Storage-backed initial values are loaded in a mount effect so SSR and first client render match.
  const [selectedSkin, setSelectedSkin] = useState('ninja')
  const [scoreData, setScoreData] = useState<ScoreData>({
    distance: 0,
    coins: 0,
    score: 0,
    bestScore: 0,
    level: 1,
    levelName: 'Beginner',
    levelTitle: 'Twilight Forest',
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
  })

  useEffect(() => {
    setSelectedSkin(storage.getSelectedSkin())
    setScoreData((d) => ({ ...d, bestScore: storage.getBestScore() }))
  }, [])

  const showToast = useCallback((title: string, message: string, icon: IconName = 'Award') => {
    setToastNotification({ title, message, icon })
    setTimeout(() => setToastNotification(null), 3800)
  }, [])

  const checkAchievements = useCallback(
    (stats: RunStats) => {
      const unlock = (id: string) => {
        const a = storage.unlockAchievement(id)
        if (a) showToast('Achievement Unlocked!', a.title)
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
    const width = canvas.width || window.innerWidth
    const height = canvas.height || window.innerHeight
    const groundY = Math.max(160, height - Math.min(110, Math.floor(height * 0.22)))
    const player = new Player(width, height, groundY)
    player.setSkin(selectedSkin)
    const score = new ScoreManager()
    score.onLevelUpCallback = (level) => {
      showToast(`Level ${level.level} Reached!`, level.title, 'Zap')
      void confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } })
    }
    engine.current = {
      player,
      obstacles: new ObstacleManager(),
      powerups: new PowerupManager(),
      particles: new ParticleSystem(),
      score,
      background: new Background(width, height, groundY),
      groundY,
      lastTime: performance.now(),
      animationFrameId: null,
      isRunning: false,
      powerupsUsedCount: 0,
      lastHudUpdate: 0,
      shake: { intensity: 0 },
      jumpBuffer: 0,
      hadSpeedBoost: false,
    }
  }, [selectedSkin, showToast])

  const handleGameOver = useCallback(() => {
    const e = engine.current
    if (!e.score || !e.player) return
    e.isRunning = false
    audio.stopBgm()
    e.shake.intensity = 16
    const finalScore = e.score.score
    const newHigh = finalScore > storage.getBestScore() && finalScore > 0
    setIsNewHighScore(newHigh)
    if (newHigh) void confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } })
    storage.saveLeaderboardScore('You', finalScore, e.score.distance)
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
  }, [checkAchievements])

  const gameLoop = useCallback(
    function loop(time: number) {
      const e = engine.current
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      if (!e.isRunning) {
        // idle frame: animate scenery only, no new frame is scheduled
        const dt = Math.min((time - (e.lastTime || time)) / 1000, 0.05)
        e.lastTime = time
        if (e.background && e.player) {
          e.background.update(0.4)
          e.player.idleTimer += dt
          e.background.draw(ctx, e.score ? e.score.currentLevel.bgTheme : MENU_THEME)
          e.player.draw(ctx, e.powerups ? e.powerups.active : {})
        }
        return
      }

      const dt = Math.min((time - e.lastTime) / 1000, 0.05)
      e.lastTime = time
      const { player, obstacles, powerups, particles, score, background, groundY } = e
      if (!player || !obstacles || !powerups || !particles || !score || !background) return
      const level = score.currentLevel
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
          if (a) showToast('Achievement Unlocked!', a.title)
        },
      })

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      if (e.shake.intensity > 0) {
        ctx.translate((Math.random() - 0.5) * e.shake.intensity * 2, (Math.random() - 0.5) * e.shake.intensity * 2)
        e.shake.intensity *= 0.88
        if (e.shake.intensity < 0.2) e.shake.intensity = 0
      }
      background.draw(ctx, level.bgTheme)
      obstacles.draw(ctx, level.bgTheme.groundAccent)
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
          levelName: level.name,
          levelTitle: level.title,
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
    const e = engine.current
    e.isRunning = true
    e.lastTime = performance.now()
    audio.startBgm()
    audio.updateTempo(1)
    setGameState('PLAYING')
    if (e.animationFrameId) cancelAnimationFrame(e.animationFrameId)
    e.animationFrameId = requestAnimationFrame(gameLoop)
  }, [initEngine, gameLoop])

  const togglePause = useCallback(() => {
    const e = engine.current
    if (gameState === 'PLAYING') {
      e.isRunning = false
      audio.stopBgm()
      setGameState('PAUSED')
    } else if (gameState === 'PAUSED') {
      e.isRunning = true
      e.lastTime = performance.now()
      audio.startBgm()
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
    audio.stopBgm()
    if (e.animationFrameId) cancelAnimationFrame(e.animationFrameId)
    setGameState('MENU')
  }, [])

  const changeSkin = useCallback((id: string) => {
    setSelectedSkin(id)
    storage.setSelectedSkin(id)
    engine.current.player?.setSkin(id)
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
      showToast('Screen Mode', 'Rotated to Landscape Mode!', 'Zap')
    } catch {
      showToast('Screen Rotate', 'Please turn on Auto-Rotate on your phone and rotate sideways!', 'Zap')
    }
  }, [showToast])

  // keyboard
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
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
        showToast('Audio Settings', next.soundEnabled ? 'Sound Unmuted' : 'Sound Muted')
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

  // resize / orientation: canvas is sized in CSS pixels (no devicePixelRatio scaling, as in the original)
  useEffect(() => {
    const applySize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const width = window.innerWidth || document.documentElement.clientWidth
      const height = window.innerHeight || document.documentElement.clientHeight
      canvas.width = width
      canvas.height = height
      const portrait = height > width
      setIsPortrait(portrait)
      const landscape = !portrait
      const groundMargin = landscape
        ? Math.min(85, Math.max(55, Math.floor(height * 0.18)))
        : Math.min(145, Math.max(90, Math.floor(height * 0.24)))
      const groundY = Math.max(130, height - groundMargin)
      const e = engine.current
      const prevGroundY = e.groundY || groundY
      const deltaY = groundY - prevGroundY
      e.groundY = groundY
      const p = e.player
      if (p) {
        p.canvasWidth = width
        p.canvasHeight = height
        p.groundY = groundY
        p.x = Math.max(50, Math.min(140, Math.floor(width * (landscape ? 0.14 : 0.18))))
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

  // (re)build the engine and paint a static first frame whenever the skin changes
  useEffect(() => {
    initEngine()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const { background, score, player } = engine.current
    if (ctx && background && score && player) {
      background.draw(ctx, score.currentLevel.bgTheme)
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
    triggerJump,
    triggerSlide,
    triggerStopSlide,
    showToast,
  }
}
