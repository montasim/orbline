import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar03Icon, CheckmarkCircle02Icon, GiftIcon } from '@hugeicons/core-free-icons'
import { Progress } from '#/components/ui/progress'
import { audio } from '#/game/audio'
import { storage } from '#/game/storage'
import { Button } from '#/components/ui/button'
import { CARD, Crystals, DialogShell, RewardChip } from './shared'

interface DailyChallengeDialogProps {
  onClose: () => void
  onClaimReward?: (amount: number) => void
}

export function DailyChallengeDialog({ onClose, onClaimReward }: DailyChallengeDialogProps) {
  // Dialogs open only on user action, so reading storage at mount is client-only.
  const [daily, setDaily] = useState(() => storage.getDailyChallenge())
  const [crystals, setCrystals] = useState(() => storage.getTotalCoins())

  const claim = () => {
    audio.playPowerup()
    const amount = storage.claimDailyReward()
    if (amount > 0) {
      setDaily(storage.getDailyChallenge())
      setCrystals(storage.getTotalCoins())
      onClaimReward?.(amount)
    }
  }

  const pct = Math.min(100, Math.round((daily.progress / daily.target) * 100))

  return (
    <DialogShell
      tone="aurora" icon={Calendar03Icon} title="Daily trek" subtitle="A new challenge every midnight" onClose={onClose}>
      <div className={`${CARD} flex flex-col gap-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="kicker text-aurora">Today&apos;s target</span>
            <h3 className="font-display text-xl font-extrabold text-ice leading-tight">{daily.title}</h3>
            <p className="text-sm text-slate-300">{daily.desc}</p>
          </div>
          <RewardChip amount={daily.reward} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-400">Progress</span>
            <span className="glow-num text-ice">
              {daily.progress} / {daily.target}
            </span>
          </div>
          <Progress
            value={pct}
            aria-label="Daily challenge progress"
            className="h-2 bg-white/10 *:data-[slot=progress-indicator]:rounded-full *:data-[slot=progress-indicator]:duration-300 *:data-[slot=progress-indicator]:bg-gradient-to-r *:data-[slot=progress-indicator]:from-lagoon *:data-[slot=progress-indicator]:to-mint"
          />
        </div>

        {daily.claimed ? (
          <div className="rounded-full h-12 px-4 bg-mint/12 border border-mint/35 text-mint flex items-center justify-center gap-2 font-display text-sm font-extrabold uppercase tracking-wider">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" aria-hidden />
            Reward collected. See you tomorrow!
          </div>
        ) : daily.completed ? (
          <Button variant="aurora" onClick={claim} className="w-full">
            <HugeiconsIcon icon={GiftIcon} aria-hidden />
            Collect {daily.reward} crystals
          </Button>
        ) : (
          <p className="rounded-2xl py-3 px-4 bg-white/5 text-slate-400 text-center text-sm">
            Finish the challenge in any run today to collect your reward.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between px-4 text-sm text-slate-400">
        <span>Your crystals</span>
        <Crystals amount={crystals} className="text-base" />
      </div>
    </DialogShell>
  )
}
