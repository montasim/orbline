import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  FavouriteIcon,
  KeyboardIcon,
  LinkSquare02Icon,
  FastWindIcon,
  Settings02Icon,
  SnowIcon,
  VolumeHighIcon,
  VolumeMute02Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '#/components/ui/button'
import { Switch } from '#/components/ui/switch'
import { audio } from '#/game/audio'
import type { Settings } from '#/game/data'
import { storage } from '#/game/storage'
import { PlayerNameCard } from './NameForm'
import { CARD, DialogShell, Row, TONES } from './shared'

const toggle =
  'hit-area w-12! h-7! p-1 border-0 shadow-none data-[state=checked]:bg-lagoon data-[state=unchecked]:bg-white/15 *:size-5! *:bg-white! *:data-[state=checked]:translate-x-5!'

export function SettingsDialog({ onClose, onNameSaved }: { onClose: () => void; onNameSaved?: () => void }) {
  const [settings, setSettings] = useState(() => storage.getSettings())

  const save = (next: Settings) => {
    storage.saveSettings(next)
    setSettings(next)
  }

  return (
    <DialogShell
      tone="glacier" icon={Settings02Icon} title="Settings" subtitle="Name, sound, effects and controls" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <PlayerNameCard onSaved={onNameSaved} />
        <Row
          title="Sound effects"
          desc="Jumps, crystals and power-ups"
          icon={settings.soundEnabled ? VolumeHighIcon : VolumeMute02Icon}
          tileClassName={`ring-1 ${TONES.aurora}`}
        >
          <Switch
            aria-label="Sound effects"
            className={toggle}
            checked={settings.soundEnabled}
            onCheckedChange={(on) => {
              save({ ...settings, soundEnabled: on })
              audio.setSoundEnabled(on)
            }}
          />
        </Row>
        <Row title="Nature sounds" desc="Wind, rain and rumbles of each world" icon={FastWindIcon} tileClassName={`ring-1 ${TONES.mint}`}>
          <Switch
            aria-label="Nature sounds"
            className={toggle}
            checked={settings.musicEnabled}
            onCheckedChange={(on) => {
              save({ ...settings, musicEnabled: on })
              audio.setMusicEnabled(on)
            }}
          />
        </Row>
        <Row title="Snow and sparkles" desc="Particle detail" icon={SnowIcon} tileClassName={`ring-1 ${TONES.amber}`}>
          <Button
            variant="frost"
            size="chip"
            onClick={() => save({ ...settings, particlesQuality: settings.particlesQuality === 'high' ? 'low' : 'high' })}
            aria-label={`Particle detail: ${settings.particlesQuality}. Click to change.`}
            className="text-mint capitalize"
          >
            {settings.particlesQuality}
          </Button>
        </Row>
      </div>

      <div className={`${CARD} flex flex-col gap-3`}>
        <div className="flex items-center gap-2 text-sm font-bold text-ice">
          <HugeiconsIcon icon={KeyboardIcon} className="size-4 text-glacier" aria-hidden />
          Controls
        </div>
        {/* keyboard controls with a mouse; touch controls on touch screens */}
        <ControlList className="pointer-coarse:hidden" items={KEYS} />
        <ControlList className="hidden pointer-coarse:grid" items={TOUCH} />
      </div>

      {/* credits: the developer and a way to support the game (both open in a new tab) */}
      <div className={`${CARD} flex items-center justify-between gap-3`}>
        <div className="min-w-0 flex flex-col gap-1">
          <span className="kicker">Made by</span>
          <a
            href="https://montasim.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hit-area inline-flex items-center gap-1 font-display text-base font-bold text-ice hover:text-mint transition"
          >
            Montasim
            <HugeiconsIcon icon={LinkSquare02Icon} className="size-4 text-slate-400" aria-hidden />
            <span className="sr-only"> (montasim.dev, opens in a new tab)</span>
          </a>
          <span className="text-xs text-slate-400">montasim.dev</span>
        </div>
        <Button asChild variant="frost" size="chip" className="text-aurora shrink-0">
          <a href="https://www.supportkori.com/montasim" target="_blank" rel="noopener noreferrer">
            <HugeiconsIcon icon={FavouriteIcon} className="fill-current" aria-hidden />
            Support
            <span className="sr-only"> the developer (opens in a new tab)</span>
          </a>
        </Button>
      </div>
    </DialogShell>
  )
}

const KEYS = [
  ['Space / ↑', 'Jump'],
  ['Space ×2', 'Flip'],
  ['↓ / S', 'Slide'],
  ['P / Esc', 'Pause'],
]
const TOUCH = [
  ['Tap right', 'Jump'],
  ['Tap twice', 'Flip'],
  ['Hold left', 'Slide'],
  ['Swipe down', 'Slide / drop'],
]

function ControlList({ items, className }: { items: string[][]; className: string }) {
  return (
    <dl className={`grid grid-cols-2 gap-2 text-xs text-slate-300 ${className}`}>
      {items.map(([key, action]) => (
        <div key={key} className="flex items-center gap-2">
          <dt>
            <kbd className="nd-kbd">{key}</kbd>
          </dt>
          <dd>{action}</dd>
        </div>
      ))}
    </dl>
  )
}
