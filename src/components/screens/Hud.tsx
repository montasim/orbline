import { useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown02Icon,
  ArrowUp02Icon,
  Coins01Icon,
  FireIcon,
  MagnetIcon,
  PauseIcon,
  RotateClockwiseIcon,
  Shield01Icon,
  VolumeHighIcon,
  VolumeMute02Icon,
  ZapIcon,
} from '@hugeicons/core-free-icons'
import { Progress } from '#/components/ui/progress'
import { audio } from '#/game/audio'
import type { IconName } from '#/game/data'
import { storage } from '#/game/storage'
import type { PowerupStatus, ScoreData } from '#/game/types'

interface HudProps {
  scoreData: ScoreData
  powerupStatus: PowerupStatus
  onPause: () => void
  onJump?: () => void
  onSlide?: () => void
  onStopSlide?: () => void
  showToast?: (title: string, message: string, icon?: IconName) => void
  isPortrait: boolean
  onRotate?: () => void
}

const kbd = 'px-1.5 py-0.5 bg-white/10 rounded text-gray-200 font-mono'
const timerBar =
  'w-12 sm:w-16 h-1.5 bg-gray-800 rounded-full *:data-[slot=progress-indicator]:rounded-full *:data-[slot=progress-indicator]:duration-75'
// Corner buttons sit over the canvas: keep their clicks from reaching it as jumps.
const stop = (e: MouseEvent) => e.stopPropagation()

export function Hud({
  scoreData,
  powerupStatus,
  onPause,
  onJump,
  onSlide,
  onStopSlide,
  showToast,
  isPortrait,
  onRotate,
}: HudProps) {
  // Mounted only after the player starts a run (never server-rendered).
  const [muted, setMuted] = useState(() => !storage.getSettings().soundEnabled)

  const toggleMute = () => {
    const s = storage.getSettings()
    const next = { ...s, soundEnabled: !s.soundEnabled, musicEnabled: !s.soundEnabled }
    storage.saveSettings(next)
    audio.setSoundEnabled(next.soundEnabled)
    audio.setMusicEnabled(next.musicEnabled)
    setMuted(!next.soundEnabled)
    showToast?.('Audio', next.soundEnabled ? 'Unmuted' : 'Muted')
  }

  const hold = (fn?: () => void) => (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fn?.()
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5 md:p-6 z-10 select-none">
      <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="glass-panel px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl flex items-center gap-2 border border-purple-500/30">
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dist</span>
              <span className="text-base sm:text-2xl font-game font-bold text-white tracking-wider flex items-baseline gap-0.5 sm:gap-1">
                {scoreData.distance}{' '}
                <span className="text-[10px] sm:text-xs text-purple-400 font-sans font-medium">m</span>
              </span>
            </div>
            <div className="h-6 w-[1px] bg-white/10 hidden md:block" />
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Score</span>
              <span className="text-xl font-game font-bold text-purple-300">{scoreData.score}</span>
            </div>
          </div>
          <div className="glass-panel px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl flex items-center gap-1.5 border border-cyan-500/30">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[9px] font-bold text-cyan-300 uppercase tracking-wider">
                Lv.{scoreData.level}
              </span>
              <span className="text-[10px] font-semibold text-gray-200 hidden lg:inline">{scoreData.levelName}</span>
            </div>
          </div>
          {scoreData.multiplier > 1 && (
            <div className="glass-panel px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-yellow-500/50 flex items-center gap-1 animate-bounce">
              <HugeiconsIcon icon={FireIcon} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="font-game font-bold text-yellow-400 text-xs sm:text-sm">2X</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto shrink-0">
          <div className="glass-panel px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl flex items-center gap-1.5 border border-yellow-500/30">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-yellow-400/20 border border-yellow-400/80 flex items-center justify-center">
              <HugeiconsIcon icon={Coins01Icon} className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400" />
            </div>
            <span className="text-sm sm:text-lg font-game font-bold text-yellow-300">{scoreData.coins}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRotate?.()
            }}
            onMouseDown={stop}
            className="glass-panel p-2 sm:p-2.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-cyan-300 hover:text-white border border-cyan-500/30"
            title="Rotate to Landscape Mode"
          >
            <HugeiconsIcon icon={RotateClockwiseIcon} className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleMute()
            }}
            onMouseDown={stop}
            className="glass-panel p-2 sm:p-2.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-gray-300 hover:text-white"
            title="Toggle Mute (M)"
          >
            {muted ? (
              <HugeiconsIcon icon={VolumeMute02Icon} className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
            ) : (
              <HugeiconsIcon icon={VolumeHighIcon} className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPause()
            }}
            onMouseDown={stop}
            className="glass-panel p-2 sm:p-2.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-gray-300 hover:text-white"
            title="Pause Game (P or Esc)"
          >
            <HugeiconsIcon icon={PauseIcon} className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 self-center my-auto px-2 pointer-events-auto">
        {isPortrait && (
          <button
            onClick={onRotate}
            className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 text-cyan-300 text-[10px] sm:text-xs font-semibold border border-cyan-400/40 shadow-cyan mb-1 animate-pulse"
          >
            <HugeiconsIcon icon={RotateClockwiseIcon} className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>Landscape mode recommendation (Tap to Rotate)</span>
          </button>
        )}
        {powerupStatus.shield && (
          <div className="glass-panel-glow px-3 py-1 sm:px-4 sm:py-1.5 rounded-full flex items-center gap-1.5 text-cyan-300 text-[10px] sm:text-xs font-semibold animate-pulse border border-cyan-400/60 shadow-cyan">
            <HugeiconsIcon icon={Shield01Icon} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 fill-cyan-400/30" />
            <span>SHADOW AEGIS (Shield 1 Hit)</span>
          </div>
        )}
        {powerupStatus.magnet && (
          <div className="glass-panel px-3 py-1 sm:px-4 sm:py-1.5 rounded-full flex items-center gap-2 border border-pink-500/50">
            <HugeiconsIcon icon={MagnetIcon} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400" />
            <span className="text-[10px] sm:text-xs font-semibold text-pink-300">ORB MAGNET</span>
            <Progress
              value={(powerupStatus.magnetTimer / powerupStatus.magnetMax) * 100}
              className={`${timerBar} *:data-[slot=progress-indicator]:bg-pink-500`}
            />
          </div>
        )}
        {powerupStatus.speedBoost && (
          <div className="glass-panel px-3 py-1 sm:px-4 sm:py-1.5 rounded-full flex items-center gap-2 border border-cyan-400/60 shadow-cyan">
            <HugeiconsIcon icon={ZapIcon} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 fill-cyan-400/30" />
            <span className="text-[10px] sm:text-xs font-semibold text-cyan-300">SHADOW RUSH</span>
            <Progress
              value={(powerupStatus.speedBoostTimer / powerupStatus.speedBoostMax) * 100}
              className={`${timerBar} *:data-[slot=progress-indicator]:bg-cyan-400`}
            />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between w-full pointer-events-auto pb-1 sm:pb-3">
        <button
          onPointerDown={hold(onSlide)}
          onPointerUp={hold(onStopSlide)}
          onPointerLeave={(e) => {
            e.stopPropagation()
            onStopSlide?.()
          }}
          className="glass-panel w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl flex flex-col items-center justify-center gap-0.5 sm:gap-1 active:scale-90 active:bg-cyan-500/30 transition-all border-2 border-cyan-500/50 hover:border-cyan-400 shadow-cyan text-cyan-300 shrink-0 touch-none"
          title="Slide (↓ / S)"
        >
          <HugeiconsIcon icon={ArrowDown02Icon} className="w-5 h-5 sm:w-7 sm:h-7" />
          <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider">Slide</span>
        </button>
        <div className="hidden md:flex items-center gap-4 text-xs text-gray-400 glass-panel px-4 py-2 rounded-xl pointer-events-none">
          <span>
            <kbd className={kbd}>1x TAP</kbd> Jump
          </span>
          <span>
            <kbd className={kbd}>2x TAP</kbd> 360° Somersault
          </span>
          <span>
            <kbd className={kbd}>↓ / S</kbd> Slide
          </span>
          <span>
            <kbd className={kbd}>P</kbd> Pause
          </span>
        </div>
        <button
          onPointerDown={hold(onJump)}
          className="glass-panel w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl flex flex-col items-center justify-center gap-0.5 sm:gap-1 active:scale-90 active:bg-purple-500/40 transition-all border-2 border-purple-500/60 hover:border-purple-400 shadow-purple text-purple-300 shrink-0 touch-none"
          title="1st Tap = Jump | 2nd Tap = 360° Rotate"
        >
          <HugeiconsIcon icon={ArrowUp02Icon} className="w-6 h-6 sm:w-8 sm:h-8" />
          <span className="text-[11px] sm:text-sm font-game font-bold uppercase tracking-wider">Jump</span>
          <span className="text-[8px] font-sans text-purple-300/80 -mt-0.5 hidden xs:inline">2x Flip</span>
        </button>
      </div>
    </div>
  )
}
