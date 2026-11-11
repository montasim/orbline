import { useEffect, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown02Icon,
  ArrowUp02Icon,
  PauseIcon,
  SparklesIcon,
  VolumeHighIcon,
  VolumeMute02Icon,
} from '@hugeicons/core-free-icons'
import { audio } from '#/game/audio'
import { POWERUPS, type IconName, type PowerupDef } from '#/game/data'
import { storage } from '#/game/storage'
import type { PowerupStatus, ScoreData } from '#/game/types'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Chip, Crystals } from './shared'
import { ICONS } from './icons'

interface HudProps {
  scoreData: ScoreData
  powerupStatus: PowerupStatus
  onPause: () => void
  onJump?: () => void
  onSlide?: () => void
  onStopSlide?: () => void
  showToast?: (title: string, message: string, icon?: IconName) => void
  isPortrait: boolean
}

// large touch controls keep their own round shape; spacing, type and icons follow DESIGN.md.
// Touch screens only: with a mouse/keyboard they would just cover the track.
const touchBtn =
  'pointer-fine:hidden frost-chip frost-glow size-20 sm:size-24 rounded-3xl flex flex-col items-center justify-center gap-1 text-sm font-bold active:scale-90 shrink-0 touch-none'

// slate-300, not 400: these sit on glass over bright worlds too (Bloom Meadow's sky)
const label = 'font-display text-xs font-extrabold uppercase tracking-wider min-[400px]:tracking-widest text-slate-300 leading-none'
const num = 'glow-num text-base min-[400px]:text-lg sm:text-2xl leading-none'
// corner buttons sit over the canvas: keep their clicks from reaching it as jumps
const stop = (e: MouseEvent) => e.stopPropagation()

// the rotate tip is a one-off per visit, not a permanent button
let rotateTipShown = false

/** Round power-up badge: its ring drains as the effect runs out (Frost Ward has no timer, so stays full). */
function PowerupBadge({ def, left }: { def: PowerupDef; left: number }) {
  const pct = Math.max(0, Math.min(1, left)) * 100
  return (
    <div
      role="img"
      aria-label={def.duration ? `${def.name}, ${Math.ceil(left * def.duration)} seconds left` : def.name}
      title={def.name}
      className="size-11 rounded-full p-1 animate-pop-in shrink-0"
      style={{
        background: `conic-gradient(${def.color} ${pct}%, rgba(5,11,26,.6) 0)`,
        boxShadow: `0 0 16px -4px ${def.glowColor}`,
      }}
    >
      <span className="size-full rounded-full bg-night/90 flex items-center justify-center" style={{ color: def.color }}>
        <HugeiconsIcon icon={ICONS[def.icon]} className="size-5" aria-hidden />
      </span>
    </div>
  )
}

export function Hud({ scoreData, powerupStatus: p, onPause, onJump, onSlide, onStopSlide, showToast, isPortrait }: HudProps) {
  useEffect(() => {
    if (rotateTipShown || !isPortrait || !window.matchMedia('(pointer: coarse)').matches) return
    rotateTipShown = true
    showToast?.('Tip', 'Turn sideways for the best view', 'Rotate')
  }, [isPortrait, showToast])

  const hold = (fn?: () => void) => (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fn?.()
  }
  // Mounted only after the player starts a run (never server-rendered).
  const [muted, setMuted] = useState(() => !storage.getSettings().soundEnabled)
  const toggleMute = () => {
    const s = storage.getSettings()
    const next = { ...s, soundEnabled: !s.soundEnabled, musicEnabled: !s.soundEnabled }
    storage.saveSettings(next)
    audio.setSoundEnabled(next.soundEnabled)
    audio.setMusicEnabled(next.musicEnabled)
    setMuted(!next.soundEnabled)
    showToast?.('Sound', next.soundEnabled ? 'Sound on' : 'Sound off')
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between gap-2 p-4 sm:p-6 z-10 select-none">
      {/* one row on every screen: all run stats in a single panel left, the two controls right */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* exception: py-2, gap-2 and text-base numbers under 400px keep the row clear of the buttons on small phones */}
        <div
          className="frost-chip rounded-2xl px-3 py-2 sm:px-4 flex items-center gap-2 min-[400px]:gap-3 sm:gap-4 min-w-0"
          aria-label="Run stats"
        >
          <div className="flex flex-col gap-1">
            <span className={label}>Distance</span>
            <span className={`flex items-baseline gap-1 text-ice ${num}`}>
              {scoreData.distance}
              <span className="text-xs text-slate-200">m</span>
            </span>
          </div>
          <div className="h-8 w-px bg-white/12" />
          <div className="flex flex-col gap-1">
            <span className={label}>Score</span>
            <span className={`text-mint ${num}`}>{scoreData.score}</span>
          </div>
          <div className="h-8 w-px bg-white/12" />
          <div className="flex flex-col gap-1">
            <span className={label}>Crystals</span>
            <Crystals amount={scoreData.coins} className={`tabular-nums ${num}`} />
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          <Button
            variant="frost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              toggleMute()
            }}
            onMouseDown={stop}
            aria-label={muted ? 'Turn sound on (M)' : 'Turn sound off (M)'}
            title={muted ? 'Sound off (M)' : 'Sound on (M)'}
            // under 360px the stats need the room; Pause has the same sound toggle
            className="rounded-xl max-[359px]:hidden"
          >
            <HugeiconsIcon icon={muted ? VolumeMute02Icon : VolumeHighIcon} className="text-glacier" aria-hidden />
          </Button>
          <Button
            variant="frost"
            size="icon"
            className="rounded-xl"
            onClick={(e) => {
              e.stopPropagation()
              onPause()
            }}
            onMouseDown={stop}
            aria-label="Pause (P or Esc)"
            title="Pause (P or Esc)"
          >
            <HugeiconsIcon icon={PauseIcon} className="text-mint" aria-hidden />
          </Button>
        </div>
      </div>

      {/* level, multiplier and live power-ups: one row under the panel, so the lane ahead stays clear */}
      <div className="flex flex-wrap items-center gap-2 self-start mb-auto">
        <Chip className="pl-2 pointer-coarse:h-11" title={scoreData.levelName}>
          <Badge>Lv {scoreData.level}</Badge>
          <span className="font-display font-bold uppercase tracking-wider text-xs text-ice hidden sm:inline short:hidden">
            {scoreData.levelTitle}
          </span>
        </Chip>
        {scoreData.multiplier > 1 && (
          <Chip className="border-aurora/50 animate-pop-in pointer-coarse:h-11">
            <HugeiconsIcon icon={SparklesIcon} className="size-4 text-aurora" aria-hidden />
            <span className="glow-num text-aurora">×{scoreData.multiplier}</span>
          </Chip>
        )}
        {p.shield && <PowerupBadge def={POWERUPS.SHIELD} left={1} />}
        {p.magnet && <PowerupBadge def={POWERUPS.MAGNET} left={p.magnetTimer / p.magnetMax} />}
        {p.speedBoost && <PowerupBadge def={POWERUPS.SPEED} left={p.speedBoostTimer / p.speedBoostMax} />}
      </div>

      <div className="flex items-end justify-between w-full pointer-events-auto">
        <button
          type="button"
          onPointerDown={hold(onSlide)}
          onPointerUp={hold(onStopSlide)}
          onPointerLeave={(e) => {
            e.stopPropagation()
            onStopSlide?.()
          }}
          className={`${touchBtn} text-glacier active:bg-glacier/20`}
          aria-label="Slide (Down or S)"
          title="Slide (↓ / S)"
        >
          <HugeiconsIcon icon={ArrowDown02Icon} className="size-6" aria-hidden />
          Slide
        </button>
        {/* hint strips: touch hints only where they fit between the buttons; keyboard hints for mouse/keyboard */}
        <Chip className="hidden pointer-coarse:sm:inline-flex mx-auto gap-4 px-4 text-xs text-slate-300 pointer-events-none">
          <span>
            <kbd className="nd-kbd">Tap right</kbd> Jump
          </span>
          <span>
            <kbd className="nd-kbd">Tap twice</kbd> Flip
          </span>
          <span>
            <kbd className="nd-kbd">Hold left</kbd> Slide
          </span>
        </Chip>
        <Chip className="hidden pointer-fine:md:inline-flex mx-auto gap-4 px-4 text-xs text-slate-300 pointer-events-none">
          <span>
            <kbd className="nd-kbd">Space</kbd> Jump
          </span>
          <span>
            <kbd className="nd-kbd">Space ×2</kbd> Flip
          </span>
          <span>
            <kbd className="nd-kbd">↓</kbd> <kbd className="nd-kbd">S</kbd> Slide
          </span>
          <span>
            <kbd className="nd-kbd">P</kbd> Pause
          </span>
          <span>
            <kbd className="nd-kbd">M</kbd> Sound
          </span>
        </Chip>
        <button
          type="button"
          onPointerDown={hold(onJump)}
          className={`${touchBtn} text-mint active:bg-mint/20`}
          aria-label="Jump (tap twice to flip)"
          title="Tap to jump, tap again to flip"
        >
          <HugeiconsIcon icon={ArrowUp02Icon} className="size-6" aria-hidden />
          Jump
        </button>
      </div>
    </div>
  )
}
