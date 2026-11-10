import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Home01Icon,
  PlayIcon,
  RotateLeft01Icon,
  VolumeHighIcon,
  VolumeMute02Icon,
} from '@hugeicons/core-free-icons'
import { audio } from '#/game/audio'
import { storage } from '#/game/storage'

interface PauseMenuProps {
  onResume: () => void
  onRestart: () => void
  onMainMenu: () => void
}

const kbd = 'px-1.5 py-0.5 bg-white/10 rounded font-mono text-gray-200'

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
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="glass-panel-glow max-w-sm w-full p-5 sm:p-8 rounded-3xl flex flex-col items-center text-center gap-4 sm:gap-6 border border-cyan-500/40 shadow-2xl animate-scale-up max-h-[92vh] overflow-y-auto">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs uppercase font-game font-semibold tracking-widest text-cyan-400">Game Paused</span>
          <h2 className="text-3xl sm:text-4xl font-game font-black text-white text-glow-cyan tracking-wider">STASIS</h2>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onResume}
            className="w-full py-3.5 px-6 rounded-xl font-game font-bold text-sm sm:text-base uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-cyan active:scale-95 transition-all flex items-center justify-center gap-2.5"
          >
            <HugeiconsIcon icon={PlayIcon} className="w-5 h-5 fill-black" />
            Resume Run
          </button>
          <button
            onClick={onRestart}
            className="w-full py-3.5 px-6 rounded-xl font-game font-semibold text-sm uppercase tracking-wider glass-panel hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2.5 text-gray-200 border border-white/15"
          >
            <HugeiconsIcon icon={RotateLeft01Icon} className="w-4 h-4 text-purple-400" />
            Restart Run
          </button>
          <button
            onClick={toggleSound}
            className="w-full py-3 px-6 rounded-xl font-medium text-xs sm:text-sm uppercase tracking-wider glass-panel hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2.5 text-gray-300 border border-white/10"
          >
            {settings.soundEnabled ? (
              <>
                <HugeiconsIcon icon={VolumeHighIcon} className="w-4 h-4 text-cyan-400" />
                Sound: Enabled
              </>
            ) : (
              <>
                <HugeiconsIcon icon={VolumeMute02Icon} className="w-4 h-4 text-red-400" />
                Sound: Muted
              </>
            )}
          </button>
          <button
            onClick={onMainMenu}
            className="w-full py-3 px-6 rounded-xl font-medium text-xs sm:text-sm uppercase tracking-wider glass-panel hover:bg-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2.5 text-red-300 border border-red-500/30"
          >
            <HugeiconsIcon icon={Home01Icon} className="w-4 h-4 text-red-400" />
            Quit to Main Menu
          </button>
        </div>

        <p className="text-[11px] text-gray-400 tracking-wider">
          Press <kbd className={kbd}>P</kbd> or <kbd className={kbd}>ESC</kbd> to resume
        </p>
      </div>
    </div>
  )
}
