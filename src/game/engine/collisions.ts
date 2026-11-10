import { audio } from '../audio'
import type { ObstacleManager } from './obstacles'
import type { ParticleSystem } from './particles'
import type { Player } from './player'
import type { PowerupManager } from './powerups'

export interface Hitbox {
  x: number
  y: number
  width: number
  height: number
}

export function intersects(a: Hitbox, b: Hitbox): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

interface CollisionContext {
  player: Player
  obstacleManager: ObstacleManager
  powerupManager: PowerupManager
  particleSystem: ParticleSystem | null
  onGameOver?: () => void
  onCoinCollected?: () => void
  onShieldSaved?: () => void
}

/** Coin pickup, power-up pickup, then obstacle hits (speed boost smashes, shield absorbs, else game over). */
export function resolveCollisions({
  player,
  obstacleManager,
  powerupManager,
  particleSystem,
  onGameOver,
  onCoinCollected,
  onShieldSaved,
}: CollisionContext) {
  const hitbox = player.getHitbox()
  const active = powerupManager.active
  for (const coin of obstacleManager.coins) {
    if (coin.collected || !intersects(hitbox, coin.getHitbox())) continue
    coin.collected = true
    audio.playCoin()
    particleSystem?.addCoinCollect(coin.x, coin.y, '+1')
    onCoinCollected?.()
  }
  for (const token of powerupManager.tokens) {
    if (!token.collected && intersects(hitbox, token.getHitbox())) powerupManager.collect(token, particleSystem)
  }
  if (player.invulnerableTimer > 0) return
  const obstacles = obstacleManager.obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i]
    if (!intersects(hitbox, o.getHitbox())) continue
    if (active.speedBoost) {
      obstacles.splice(i, 1)
      audio.playHit()
      particleSystem?.addExplosion(o.x + o.width / 2, o.y + o.height / 2, '#00f5ff')
      continue
    }
    if (active.shield) {
      active.shield = false
      player.invulnerableTimer = 1.2
      obstacles.splice(i, 1)
      audio.playShieldBreak()
      particleSystem?.addShieldBreak(player.x + player.width / 2, player.y + player.height / 2)
      onShieldSaved?.()
      continue
    }
    audio.playHit()
    particleSystem?.addExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ef4444')
    onGameOver?.()
    return
  }
}
