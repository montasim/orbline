import type { RefObject } from 'react'
import type { IconName } from './data'

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'

export interface ScoreData {
  distance: number
  coins: number
  score: number
  bestScore: number
  level: number
  levelName: string
  levelTitle: string
  multiplier: number
}

export interface PowerupStatus {
  shield: boolean
  magnet: boolean
  magnetTimer: number
  magnetMax: number
  speedBoost: boolean
  speedBoostTimer: number
  speedBoostMax: number
}

export interface Toast {
  title: string
  message: string
  icon: IconName
}

/** Where the just-finished run stands on the shared leaderboard. */
export type OnlineRun =
  | { phase: 'idle' }
  /** no run ticket (server unreachable when the run started): the run can't be ranked */
  | { phase: 'offline' }
  /** finished, but this device has no leaderboard name yet */
  | { phase: 'needsName' }
  | { phase: 'submitting' }
  | { phase: 'accepted'; score: number; rank: number; personalBest: boolean }
  | { phase: 'rejected'; reason: string }
  | { phase: 'error'; message: string }

/** Contract between the engine hook (src/game/useGame.ts) and the UI. */
export interface GameApi {
  canvasRef: RefObject<HTMLCanvasElement | null>
  gameState: GameState
  scoreData: ScoreData
  powerupStatus: PowerupStatus
  selectedSkin: string
  toastNotification: Toast | null
  isNewHighScore: boolean
  isPortrait: boolean
  requestLandscapeMode: () => void
  startGame: () => void
  togglePause: () => void
  restartGame: () => void
  goToMenu: () => void
  changeSkin: (id: string) => void
  /** id of the chosen map (region); see src/game/maps */
  selectedMap: string
  changeMap: (id: string) => void
  triggerJump: () => void
  triggerSlide: () => void
  triggerStopSlide: () => void
  showToast: (title: string, message: string, icon?: IconName) => void
  onlineRun: OnlineRun
  /** submits a finished run that was waiting for a leaderboard name (call after a name is saved) */
  submitPendingRun: () => void
}
