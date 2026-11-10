// localStorage-backed persistence. Every access is guarded: storage can be
// unavailable (SSR, private mode), and the game must still run without it.
import {
  ACHIEVEMENTS,
  type Achievement,
  DAILY_CHALLENGES,
  type DailyTemplate,
  type DailyType,
  DEFAULT_SETTINGS,
  type Settings,
} from './data'

const K = {
  // keys keep the game's earlier name (Northdash) so existing saves survive the rename to Orbline
  best: 'northdash_best_score',
  coins: 'northdash_total_coins',
  skins: 'northdash_unlocked_skins',
  skin: 'northdash_selected_skin',
  map: 'northdash_selected_map',
  settings: 'northdash_settings',
  achievements: 'northdash_achievements',
  daily: 'northdash_daily_challenge',
  player: 'northdash_player',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable: progress is just not persisted
  }
}

export interface DailyChallenge extends DailyTemplate {
  date: string
  progress: number
  completed: boolean
  claimed: boolean
}

// local calendar date (YYYY-MM-DD), so the daily rolls over at the player's midnight, not UTC's
const today = () => new Date().toLocaleDateString('en-CA')

export const storage = {
  getBestScore: (): number => Number(read(K.best, 0)) || 0,
  setBestScore: (v: number) => write(K.best, v),

  getTotalCoins: (): number => Number(read(K.coins, 0)) || 0,
  addCoins(delta: number): number {
    const next = Math.max(0, storage.getTotalCoins() + delta)
    write(K.coins, next)
    return next
  },

  getUnlockedSkins: (): string[] => read(K.skins, ['frost']),
  unlockSkin(id: string): string[] {
    const list = storage.getUnlockedSkins()
    if (!list.includes(id)) {
      list.push(id)
      write(K.skins, list)
    }
    return list
  },
  getSelectedSkin: (): string => read(K.skin, 'frost'),
  setSelectedSkin: (id: string) => write(K.skin, id),
  getSelectedMap: (): string => read(K.map, 'arctic'),
  setSelectedMap: (id: string) => write(K.map, id),

  getSettings: (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(K.settings, {}) }),
  saveSettings: (s: Settings) => write(K.settings, s),

  getAchievements: (): Record<string, { unlockedAt: string }> => read(K.achievements, {}),
  /** Unlocks and pays out the reward; returns the achievement only the first time. */
  unlockAchievement(id: string): Achievement | null {
    const all = storage.getAchievements()
    if (all[id]) return null
    all[id] = { unlockedAt: new Date().toISOString() }
    write(K.achievements, all)
    const a = ACHIEVEMENTS.find((x) => x.id === id) ?? null
    if (a) storage.addCoins(a.reward)
    return a
  },

  getDailyChallenge(): DailyChallenge {
    const date = today()
    // Same rotation as the original: sum of Y+M+D picks the challenge.
    const idx = date.split('-').reduce((s, p) => s + Number.parseInt(p, 10), 0) % DAILY_CHALLENGES.length
    const tpl = DAILY_CHALLENGES[idx]
    const saved = read<DailyChallenge | null>(K.daily, null)
    if (saved && saved.date === date && saved.id === tpl.id) return saved
    const fresh: DailyChallenge = { ...tpl, date, progress: 0, completed: false, claimed: false }
    write(K.daily, fresh)
    return fresh
  },
  updateDailyChallenge(type: DailyType, amount = 1): DailyChallenge {
    const d = storage.getDailyChallenge()
    if (d.completed || d.type !== type) return d
    d.progress = type === 'distance' ? Math.max(d.progress, amount) : d.progress + amount
    if (d.progress >= d.target) {
      d.progress = d.target
      d.completed = true
    }
    write(K.daily, d)
    return d
  },
  /** Returns the coins paid out, or 0 if not claimable. */
  claimDailyReward(): number {
    const d = storage.getDailyChallenge()
    if (!d.completed || d.claimed) return 0
    d.claimed = true
    storage.addCoins(d.reward)
    write(K.daily, d)
    return d.reward
  },

  /** Online identity for the shared leaderboard; the token proves ownership of the name. */
  getPlayer: (): { token: string; name: string } | null => read(K.player, null),
  setPlayer: (p: { token: string; name: string } | null) => write(K.player, p),
}
