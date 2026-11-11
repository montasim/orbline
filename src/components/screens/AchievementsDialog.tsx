import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ChampionIcon, LockIcon } from '@hugeicons/core-free-icons'
import { ACHIEVEMENTS } from '#/game/data'
import { storage } from '#/game/storage'
import { ICONS } from './icons'
import { DialogShell, RewardChip, Row } from './shared'

export function AchievementsDialog({ onClose }: { onClose: () => void }) {
  const [unlocked] = useState(() => storage.getAchievements())
  const done = Object.keys(unlocked).length

  return (
    <DialogShell
      tone="mint"
      icon={ChampionIcon}
      title="Trophies"
      subtitle={
        <>
          <span className="font-bold text-mint">{done}</span> of {ACHIEVEMENTS.length} earned
        </>
      }
      onClose={onClose}
      className="max-w-lg"
    >
      <ul className="flex flex-col gap-2">
        {ACHIEVEMENTS.map((a) => {
          const isDone = !!unlocked[a.id]
          return (
            <li key={a.id}>
              <Row
                icon={ICONS[a.icon] ?? ChampionIcon}
                tileClassName={isDone ? 'bg-gradient-to-br from-mint to-lagoon text-ink' : 'bg-white/6 text-slate-400'}
                // locked = muted tile + lock icon, not transparency: text must stay readable over every world
                className={isDone ? 'border-mint/35' : undefined}
                title={
                  <>
                    {a.title}
                    {!isDone && <HugeiconsIcon icon={LockIcon} className="size-4 text-slate-400" aria-label="Locked" />}
                  </>
                }
                desc={a.desc}
              >
                <span className={`text-sm shrink-0 ${isDone ? '' : 'text-slate-300'}`}>
                  <RewardChip amount={a.reward} />
                </span>
              </Row>
            </li>
          )
        })}
      </ul>
    </DialogShell>
  )
}
