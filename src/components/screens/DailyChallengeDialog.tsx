import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar03Icon, CheckmarkCircle02Icon, Coins01Icon, GiftIcon } from '@hugeicons/core-free-icons'
import { Progress } from '#/components/ui/progress'
import { audio } from '#/game/audio'
import { storage } from '#/game/storage'
import { CloseButton } from './CloseButton'

interface DailyChallengeDialogProps {
  onClose: () => void
  onClaimReward?: (amount: number) => void
}

export function DailyChallengeDialog({ onClose, onClaimReward }: DailyChallengeDialogProps) {
  // Dialogs open only on user action, so reading storage at mount is client-only.
  const [daily, setDaily] = useState(() => storage.getDailyChallenge())
  const [coins, setCoins] = useState(() => storage.getTotalCoins())

  const claim = () => {
    audio.playPowerup()
    const amount = storage.claimDailyReward()
    if (amount > 0) {
      setDaily(storage.getDailyChallenge())
      setCoins(storage.getTotalCoins())
      onClaimReward?.(amount)
    }
  }

  const pct = Math.min(100, Math.round((daily.progress / daily.target) * 100))

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="glass-panel-glow max-w-md w-full p-4 sm:p-7 rounded-3xl flex flex-col gap-4 sm:gap-5 border border-purple-500/40 shadow-purple relative animate-scale-up max-h-[92vh] overflow-y-auto">
        <CloseButton onClick={onClose} />

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
            <HugeiconsIcon icon={Calendar03Icon} className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-game font-bold text-white text-glow-purple">Daily Mission</h2>
            <p className="text-xs text-gray-400">Resets every 24 hours at midnight</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Today&apos;s Target</span>
              <h3 className="text-lg font-bold text-white">{daily.title}</h3>
              <p className="text-xs text-gray-300 mt-1">{daily.desc}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-400 text-yellow-300 text-xs font-bold shrink-0">
              <HugeiconsIcon icon={Coins01Icon} className="w-3.5 h-3.5 fill-yellow-400" />+{daily.reward}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-gray-400">Progress</span>
              <span className="text-purple-300 font-game">
                {daily.progress} / {daily.target}
              </span>
            </div>
            <Progress
              value={pct}
              className="w-full h-3 bg-gray-900 rounded-full border border-white/10 *:data-[slot=progress-indicator]:rounded-full *:data-[slot=progress-indicator]:duration-300 *:data-[slot=progress-indicator]:bg-gradient-to-r *:data-[slot=progress-indicator]:from-purple-500 *:data-[slot=progress-indicator]:to-cyan-400"
            />
          </div>

          {daily.claimed ? (
            <div className="py-2.5 px-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" />
              Reward Claimed!
            </div>
          ) : daily.completed ? (
            <button
              onClick={claim}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-game font-bold text-sm uppercase tracking-wider shadow-gold active:scale-95 transition-all flex items-center justify-center gap-2 animate-pulse-glow"
            >
              <HugeiconsIcon icon={GiftIcon} className="w-5 h-5 fill-black" />
              Claim {daily.reward} Coins
            </button>
          ) : (
            <div className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-center text-xs">
              Complete the objective in any run today to unlock reward
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-3 text-xs text-gray-400">
          <span>Your Bank Balance:</span>
          <span className="font-game font-bold text-yellow-400 flex items-center gap-1.5 text-sm">
            <HugeiconsIcon icon={Coins01Icon} className="w-4 h-4 fill-yellow-400" />
            {coins}
          </span>
        </div>
      </div>
    </div>
  )
}
