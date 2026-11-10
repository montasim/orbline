import { useState } from 'react'
import type { ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  KeyboardIcon,
  MusicNote01Icon,
  Settings02Icon,
  SparklesIcon,
  VolumeHighIcon,
  VolumeMute02Icon,
} from '@hugeicons/core-free-icons'
import { Switch } from '#/components/ui/switch'
import { audio } from '#/game/audio'
import type { Settings } from '#/game/data'
import { storage } from '#/game/storage'
import { CloseButton } from './CloseButton'

// Original toggle look: 48x24 track, white 16px knob travelling 24px.
const toggle =
  'w-12! h-6! p-1 border-0 shadow-none data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-gray-700 *:size-4! *:bg-white! *:data-[state=checked]:translate-x-6!'
const kbd = 'px-1.5 py-0.5 bg-white/10 rounded text-gray-200'

function Row({ icon, title, desc, children }: { icon: ReactNode; title: string; desc: string; children: ReactNode }) {
  return (
    <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h4 className="text-sm font-bold text-white">{title}</h4>
          <p className="text-xs text-gray-400">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState(() => storage.getSettings())

  const save = (next: Settings) => {
    storage.saveSettings(next)
    setSettings(next)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="glass-panel-glow max-w-md w-full p-4 sm:p-7 rounded-3xl flex flex-col gap-4 sm:gap-6 border border-cyan-500/40 shadow-cyan relative animate-scale-up max-h-[92vh] overflow-y-auto">
        <CloseButton onClick={onClose} />

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
            <HugeiconsIcon icon={Settings02Icon} className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-game font-bold text-white text-glow-cyan">Configuration</h2>
            <p className="text-xs text-gray-400">Sound, visuals &amp; keybindings</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Row
            title="Sound Effects (SFX)"
            desc="Jump, coins, hits & abilities"
            icon={
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                {settings.soundEnabled ? (
                  <HugeiconsIcon icon={VolumeHighIcon} className="w-5 h-5" />
                ) : (
                  <HugeiconsIcon icon={VolumeMute02Icon} className="w-5 h-5 text-red-400" />
                )}
              </div>
            }
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
          <Row
            title="Cyber Synth BGM"
            desc="Tempo accelerates with level speed"
            icon={
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <HugeiconsIcon icon={MusicNote01Icon} className="w-5 h-5" />
              </div>
            }
          >
            <Switch
              aria-label="Background music"
              className={toggle}
              checked={settings.musicEnabled}
              onCheckedChange={(on) => {
                save({ ...settings, musicEnabled: on })
                audio.setMusicEnabled(on)
              }}
            />
          </Row>
          <Row
            title="Particle Quality"
            desc="Shockwaves, dust & trails"
            icon={
              <div className="p-2 rounded-xl bg-yellow-500/20 text-yellow-400">
                <HugeiconsIcon icon={SparklesIcon} className="w-5 h-5" />
              </div>
            }
          >
            <button
              onClick={() =>
                save({ ...settings, particlesQuality: settings.particlesQuality === 'high' ? 'low' : 'high' })
              }
              className="px-3 py-1 rounded-lg text-xs font-game font-bold uppercase tracking-wider bg-white/10 text-cyan-300 border border-cyan-500/30 hover:bg-white/15"
            >
              {settings.particlesQuality}
            </button>
          </Row>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
            <HugeiconsIcon icon={KeyboardIcon} className="w-4 h-4 text-purple-400" />
            Quick Controls
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div>
              <kbd className={kbd}>SPACE / ↑</kbd> Jump
            </div>
            <div>
              <kbd className={kbd}>2x Tap</kbd> Double Jump
            </div>
            <div>
              <kbd className={kbd}>↓ / S</kbd> Slide / Duck
            </div>
            <div>
              <kbd className={kbd}>P / ESC</kbd> Pause
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
