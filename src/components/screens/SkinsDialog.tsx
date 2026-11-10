import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Coins01Icon, LockIcon, TShirtIcon, Tick02Icon } from '@hugeicons/core-free-icons'
import { audio } from '#/game/audio'
import { SKINS, skinById, type IconName, type Skin } from '#/game/data'
import { storage } from '#/game/storage'
import { CloseButton } from './CloseButton'

interface SkinsDialogProps {
  selectedSkin: string
  onSelectSkin: (id: string) => void
  onClose: () => void
  showToast?: (title: string, message: string, icon?: IconName) => void
}

export function SkinsDialog({ selectedSkin, onSelectSkin, onClose, showToast }: SkinsDialogProps) {
  const [owned, setOwned] = useState(() => storage.getUnlockedSkins())
  const [coins, setCoins] = useState(() => storage.getTotalCoins())
  const [previewId, setPreviewId] = useState(selectedSkin)

  const skin = skinById(previewId)
  const isOwned = owned.includes(previewId)
  const isEquipped = selectedSkin === previewId
  const canAfford = coins >= skin.price

  const unlock = (s: Skin) => {
    if (coins < s.price) {
      showToast?.('Insufficient Coins', `You need ${s.price - coins} more coins!`, 'Coins')
      return
    }
    audio.playPowerup()
    storage.addCoins(-s.price)
    setOwned(storage.unlockSkin(s.id))
    setCoins(storage.getTotalCoins())
    onSelectSkin(s.id)
    showToast?.('Skin Unlocked!', `${s.name} is now equipped!`, 'Shirt')
  }

  const equip = (id: string) => {
    audio.playButtonClick()
    onSelectSkin(id)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="glass-panel-glow max-w-xl w-full p-4 sm:p-7 rounded-3xl flex flex-col gap-4 sm:gap-6 border border-purple-500/40 shadow-purple relative animate-scale-up max-h-[92vh] overflow-y-auto">
        <CloseButton onClick={onClose} />

        <div className="flex items-center justify-between pr-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
              <HugeiconsIcon icon={TShirtIcon} className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-game font-bold text-white text-glow-purple">Shadow Wardrobe</h2>
              <p className="text-xs text-gray-400">Unlock unique silhouettes, trails &amp; energy auras</p>
            </div>
          </div>
          <div className="glass-panel px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-yellow-500/30">
            <HugeiconsIcon icon={Coins01Icon} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="font-game font-bold text-yellow-300 text-sm">{coins}</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-br from-black/50 via-purple-950/20 to-black/50">
          <div className="relative w-36 h-36 rounded-2xl flex items-center justify-center border border-white/10 bg-black/60 overflow-hidden shadow-2xl">
            <div className="absolute inset-0 opacity-40 blur-xl" style={{ background: skin.color }} />
            <div className="relative flex flex-col items-center animate-float">
              <div
                className="w-8 h-8 rounded-full bg-[#0b0c14] border flex items-center justify-center relative shadow-lg"
                style={{ borderColor: skin.color }}
              >
                <div
                  className="w-4 h-1.5 rounded-sm"
                  style={{ backgroundColor: skin.accent, boxShadow: `0 0 10px ${skin.accent}` }}
                />
              </div>
              <div className="w-10 h-3 rounded-full -mt-1 shadow-md" style={{ backgroundColor: skin.color }} />
              <div className="w-8 h-10 bg-[#0f0f1c] rounded-md mt-0.5 border border-white/10 flex items-center justify-center">
                <div className="w-5 h-0.5" style={{ backgroundColor: skin.color }} />
              </div>
              <div className="flex gap-2 -mt-0.5">
                <div className="w-2.5 h-6 bg-[#07070e] rounded-b-sm" />
                <div className="w-2.5 h-6 bg-[#161626] rounded-b-sm border-t" style={{ borderColor: skin.color }} />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3 text-center sm:text-left">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-xl font-game font-bold text-white">{skin.name}</h3>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-black"
                  style={{ backgroundColor: skin.accent }}
                >
                  {skin.badge}
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1">{skin.desc}</p>
            </div>
            <div className="mt-2">
              {isEquipped ? (
                <div className="py-2.5 px-4 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                  <HugeiconsIcon icon={Tick02Icon} className="w-4 h-4" />
                  Currently Equipped
                </div>
              ) : isOwned ? (
                <button
                  onClick={() => equip(skin.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-game font-bold text-xs uppercase tracking-wider shadow-purple active:scale-95 transition-all"
                >
                  Equip Skin
                </button>
              ) : (
                <button
                  onClick={() => unlock(skin)}
                  disabled={!canAfford}
                  className={`w-full py-2.5 px-4 rounded-xl font-game font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${canAfford ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 text-black shadow-gold active:scale-95' : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5'}`}
                >
                  <HugeiconsIcon icon={LockIcon} className="w-4 h-4" />
                  Unlock for {skin.price} Coins
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SKINS.map((s) => {
            const sOwned = owned.includes(s.id)
            const isPreview = previewId === s.id
            return (
              <button
                key={s.id}
                onClick={() => {
                  audio.playButtonClick()
                  setPreviewId(s.id)
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all relative ${isPreview ? 'glass-panel-glow border-purple-400 scale-[1.03] shadow-purple' : 'glass-panel border-white/10 hover:border-white/20'}`}
              >
                {selectedSkin === s.id && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-green-500 text-black flex items-center justify-center">
                    <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: `${s.color}33`, borderColor: s.color, borderWidth: 1 }}
                >
                  <HugeiconsIcon icon={TShirtIcon} className="w-4 h-4" style={{ color: s.accent }} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white truncate">{s.name}</h4>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {sOwned ? (
                      <span className="text-cyan-400">Owned</span>
                    ) : (
                      <span className="text-yellow-400 flex items-center gap-1">
                        <HugeiconsIcon icon={Coins01Icon} className="w-3 h-3" />
                        {s.price}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
