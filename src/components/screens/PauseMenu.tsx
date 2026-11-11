import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Home01Icon,
  PlayIcon,
  RotateLeft01Icon,
  VolumeHighIcon,
  VolumeMute02Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '#/components/ui/button'
import { audio } from '#/game/audio'
import { storage } from '#/game/storage'
import { Overlay, PANEL } from './shared'

interface PauseMenuProps {
  onResume: () => void
  onRestart: () => void
  onMainMenu: () => void
}

export function PauseMenu({ onResume, onRestart, onMainMenu }: PauseMenuProps) {
  // Only mounted mid-run, never server-rendered.
  const [settings, setSettings] = useState(() => storage.getSettings())

  const toggleSound = () => {
    const next = { ...settings, soundEnabled: !settings.soundEnabled, musicEnabled: !settings.soundEnabled }
    storage.saveSettings(next)
    setSettings(next)
    audio.setSoundEnabled(next.soundEnabled)
    audio.setMusicEnabled(next.musicEnabled)
  }

  return (
    <Overlay>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        className={`${PANEL} max-w-sm items-center text-center`}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="kicker text-glacier">Game paused</span>
          <h2 id="pause-title" className="game-title text-4xl sm:text-5xl">
            Paused
          </h2>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <Button variant="aurora" onClick={onResume} className="w-full">
            <HugeiconsIcon icon={PlayIcon} className="fill-current" aria-hidden />
            Resume run
          </Button>
          <Button variant="frost" size="md" onClick={onRestart} className="w-full">
            <HugeiconsIcon icon={RotateLeft01Icon} className="text-aurora" aria-hidden />
            Restart run
          </Button>
          <Button variant="frost" size="md" onClick={toggleSound} className="w-full" aria-pressed={settings.soundEnabled}>
            <HugeiconsIcon
              icon={settings.soundEnabled ? VolumeHighIcon : VolumeMute02Icon}
              className="text-glacier"
              aria-hidden
            />
            {settings.soundEnabled ? 'Sound: on' : 'Sound: off'}
          </Button>
          <Button variant="frost" size="md" onClick={onMainMenu} className="w-full text-rose-300 hover:text-rose-200">
            <HugeiconsIcon icon={Home01Icon} aria-hidden />
            Quit to main menu
          </Button>
        </div>

        <p className="text-xs text-slate-400">
          Press <kbd className="nd-kbd">P</kbd> or <kbd className="nd-kbd">Esc</kbd> to resume
        </p>
      </div>
    </Overlay>
  )
}
