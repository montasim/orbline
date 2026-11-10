import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { LockIcon, OrbitIcon, Tick02Icon } from '@hugeicons/core-free-icons'
import { audio } from '#/game/audio'
import { SKINS, skinById, type IconName, type Skin } from '#/game/data'
import { storage } from '#/game/storage'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { CARD, Chip, Crystals, DialogShell, OrbAvatar } from './shared'

interface SkinsDialogProps {
  selectedSkin: string
  onSelectSkin: (id: string) => void
  onClose: () => void
  showToast?: (title: string, message: string, icon?: IconName) => void
}

export function SkinsDialog({ selectedSkin, onSelectSkin, onClose, showToast }: SkinsDialogProps) {
  const [owned, setOwned] = useState(() => storage.getUnlockedSkins())
  const [crystals, setCrystals] = useState(() => storage.getTotalCoins())
  const [previewId, setPreviewId] = useState(selectedSkin)

  const skin = skinById(previewId)
  const isOwned = owned.includes(previewId)
  const isEquipped = selectedSkin === previewId
  const canAfford = crystals >= skin.price

  const unlock = (s: Skin) => {
    if (crystals < s.price) {
      showToast?.('Not enough crystals', `You need ${s.price - crystals} more crystals.`, 'Coins')
      return
    }
    audio.playPowerup()
    storage.addCoins(-s.price)
    setOwned(storage.unlockSkin(s.id))
    setCrystals(storage.getTotalCoins())
    onSelectSkin(s.id)
    showToast?.('New orb unlocked!', `${s.name} is ready to run.`, 'Shirt')
  }

  const equip = (id: string) => {
    audio.playButtonClick()
    onSelectSkin(id)
  }

  return (
    <DialogShell
      kicker="Customize"
      icon={OrbitIcon}
      title="Orbs"
      subtitle="Pick your runner's colourway"
      onClose={onClose}
      className="max-w-xl"
      aside={
        <Chip title="Your crystals">
          <Crystals amount={crystals} />
        </Chip>
      }
    >
      <div className={`${CARD} flex flex-col sm:flex-row items-center gap-4`}>
        <div
          className="relative size-32 sm:size-36 shrink-0 rounded-xl overflow-hidden flex items-end justify-center"
          style={{ background: `radial-gradient(circle at 50% 35%, ${skin.accent}59, transparent 70%), #0b1a3a` }}
        >
          <OrbAvatar skin={skin} className="w-[88%] animate-float" />
        </div>

        <div className="flex-1 flex flex-col gap-3 text-center sm:text-left w-full">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="game-title text-xl">{skin.name}</h3>
              <Badge style={{ backgroundColor: skin.accent }}>{skin.badge}</Badge>
            </div>
            <p className="text-sm text-slate-300">{skin.desc}</p>
          </div>
          {isEquipped ? (
            <div className="rounded-full h-12 px-4 bg-mint/12 border border-mint/35 text-mint font-display font-extrabold uppercase tracking-wider text-sm flex items-center justify-center gap-2">
              <HugeiconsIcon icon={Tick02Icon} className="size-4" aria-hidden />
              Running with this orb
            </div>
          ) : isOwned ? (
            <Button variant="aurora" onClick={() => equip(skin.id)} className="w-full">
              Choose {skin.name}
            </Button>
          ) : (
            <Button
              variant={canAfford ? 'aurora' : 'frost'}
              onClick={() => unlock(skin)}
              disabled={!canAfford}
              className={`w-full ${canAfford ? '' : 'font-display font-extrabold text-slate-400'}`}
            >
              <HugeiconsIcon icon={LockIcon} aria-hidden />
              Unlock for <Crystals amount={skin.price} className={canAfford ? 'text-ink' : ''} />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SKINS.map((s) => {
          const sOwned = owned.includes(s.id)
          const isPreview = previewId === s.id
          return (
            <button
              type="button"
              key={s.id}
              aria-pressed={isPreview}
              onClick={() => {
                audio.playButtonClick()
                setPreviewId(s.id)
              }}
              className={`${CARD} relative flex flex-col items-center gap-1 ${isPreview ? 'border-mint/60! bg-mint/10' : ''}`}
            >
              {selectedSkin === s.id && (
                <span className="absolute top-2 right-2 size-6 rounded-full bg-mint text-ink flex items-center justify-center">
                  <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} className="size-4" aria-hidden />
                  <span className="sr-only">Equipped</span>
                </span>
              )}
              <OrbAvatar skin={s} className="size-14" />
              <span className="font-display text-xs font-extrabold uppercase tracking-wide text-ice truncate max-w-full">{s.name}</span>
              <span className="text-xs">
                {sOwned ? <span className="font-display text-mint font-extrabold uppercase tracking-wider">Owned</span> : <Crystals amount={s.price} />}
              </span>
            </button>
          )
        })}
      </div>
    </DialogShell>
  )
}
