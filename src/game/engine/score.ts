import { audio } from '../audio'
import { type Level, levelForDistance } from '../data'
import { storage } from '../storage'

/** Distance/coins/score tracking and level progression. Construct client-side only (reads storage). */
export class ScoreManager {
  distance = 0
  coins = 0
  score = 0
  bestScore = storage.getBestScore()
  currentLevel: Level = levelForDistance(0)
  scoreMultiplier = 1
  onLevelUpCallback: ((level: Level) => void) | null = null

  reset() {
    this.distance = 0
    this.coins = 0
    this.score = 0
    this.bestScore = storage.getBestScore()
    this.currentLevel = levelForDistance(0)
    this.scoreMultiplier = 1
  }

  update(dt: number, speed: number, speedBoost: boolean) {
    this.scoreMultiplier = speedBoost ? 2 : 1
    this.distance += speed * 2.8 * dt * this.scoreMultiplier
    this.score = Math.floor(this.distance + this.coins * 25)
    const level = levelForDistance(this.distance)
    if (level.level > this.currentLevel.level) {
      this.currentLevel = level
      audio.playLevelUp()
      audio.updateTempo(level.level)
      this.onLevelUpCallback?.(level)
    }
    this.saveBest()
  }

  addCoin() {
    this.coins++
    this.score = Math.floor(this.distance + this.coins * 25)
    storage.addCoins(1)
    this.saveBest()
  }

  private saveBest() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score
      storage.setBestScore(this.bestScore)
    }
  }
}
