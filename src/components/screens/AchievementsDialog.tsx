import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ChampionIcon, CheckmarkCircle02Icon, Coins01Icon, LockIcon } from '@hugeicons/core-free-icons'
import { ACHIEVEMENTS } from '#/game/data'
import { storage } from '#/game/storage'
import { CloseButton } from './CloseButton'
import { ICONS } from './icons'

export function AchievementsDialog({ onClose }: { onClose: () => void }) {
  const [unlocked] = useState(() => storage.getAchievements())
  const done = Object.keys(unlocked).length

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="glass-panel-glow max-w-lg w-full max-h-[85vh] p-6 sm:p-7 rounded-3xl flex flex-col gap-5 border border-cyan-500/40 shadow-cyan relative animate-scale-up overflow-hidden">
        <CloseButton onClick={onClose} />

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
            <HugeiconsIcon icon={ChampionIcon} className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-game font-bold text-white text-glow-cyan">Achievements</h2>
            <p className="text-xs text-gray-400">
              Completed: <span className="text-cyan-400 font-bold">{done}</span> of {ACHIEVEMENTS.length}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {ACHIEVEMENTS.map((a) => {
            const isDone = !!unlocked[a.id]
            return (
              <div
                key={a.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${isDone ? 'glass-panel border-cyan-500/40 bg-cyan-950/20' : 'glass-panel border-white/5 opacity-60 bg-black/30'}`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${isDone ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-cyan' : 'bg-white/5 border-white/10 text-gray-500'}`}
                  >
                    {isDone ? (
                      <HugeiconsIcon icon={ICONS[a.icon] ?? ChampionIcon} className="w-6 h-6" />
                    ) : (
                      <HugeiconsIcon icon={LockIcon} className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{a.title}</h4>
                      {isDone && (
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-game font-bold shrink-0">
                  <HugeiconsIcon icon={Coins01Icon} className="w-3.5 h-3.5" />+{a.reward}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
