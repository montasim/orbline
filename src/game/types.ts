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
  triggerJump: () => void
  triggerSlide: () => void
  triggerStopSlide: () => void
  showToast: (title: string, message: string, icon?: IconName) => void
}
