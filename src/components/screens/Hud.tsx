import { useState } from 'react'
import type { CSSProperties, MouseEvent, PointerEvent } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown02Icon,
  ArrowUp02Icon,
  MagnetIcon,
  PauseIcon,
  RotateClockwiseIcon,
  Shield01Icon,
  SparklesIcon,
  VolumeHighIcon,
  VolumeMute02Icon,
  ZapIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { Progress } from '#/components/ui/progress'
import { audio } from '#/game/audio'
import { type IconName, POWERUPS, type PowerupDef } from '#/game/data'
import { storage } from '#/game/storage'
import type { PowerupStatus, ScoreData } from '#/game/types'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Chip, Crystals } from './shared'

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

// slate-300, not 400: these sit on glass over bright worlds too (Bloom Meadow's sky)
const label = 'font-display text-xs font-extrabold uppercase tracking-wider min-[400px]:tracking-widest text-slate-300 leading-none'
// large touch controls keep their own round shape; spacing, type and icons follow DESIGN.md.
// Touch screens only: with a mouse/keyboard they would just cover the track.
const touchBtn =
  'pointer-fine:hidden frost-chip rounded-full flex flex-col items-center justify-center gap-1 text-sm font-bold active:scale-90 shrink-0 touch-none'
// Corner buttons sit over the canvas: keep their clicks from reaching it as jumps.
const stop = (e: MouseEvent) => e.stopPropagation()

function PowerupPill({ def, icon, value, text }: { def: PowerupDef; icon: IconSvgElement; value?: number; text?: string }) {
  return (
    <Chip
      className="pl-1 pr-3 short:pr-1 animate-pop-in"
      style={{ borderColor: `${def.color}66`, boxShadow: `0 0 18px -6px ${def.glowColor}` }}
    >
      <span
        className="size-7 rounded-full flex items-center justify-center text-ink"
        style={{ backgroundColor: def.color }}
      >
        <HugeiconsIcon icon={icon} className="size-4" aria-hidden />
      </span>
      <span className="font-bold text-ice short:hidden">{def.name}</span>
      {text && <span className="text-xs text-slate-300 short:hidden">{text}</span>}
      {value !== undefined && (
        <Progress
          value={value}
          aria-label={`${def.name} time left`}
          className="w-12 sm:w-16 h-2 bg-white/10 *:data-[slot=progress-indicator]:rounded-full *:data-[slot=progress-indicator]:duration-75 *:data-[slot=progress-indicator]:bg-(--pill)"
          style={{ '--pill': def.color } as CSSProperties}
        />
      )}
    </Chip>
  )
}

/** The active power-up pills (rendered in the top area, or compact at the bottom on short screens). */
function PowerupPills({ status }: { status: PowerupStatus }) {
  return (
    <>
      {status.shield && <PowerupPill def={POWERUPS.SHIELD} icon={Shield01Icon} text="Blocks 1 hit" />}
      {status.magnet && (
        <PowerupPill def={POWERUPS.MAGNET} icon={MagnetIcon} value={(status.magnetTimer / status.magnetMax) * 100} />
      )}
      {status.speedBoost && (
        <PowerupPill def={POWERUPS.SPEED} icon={ZapIcon} value={(status.speedBoostTimer / status.speedBoostMax) * 100} />
      )}
    </>
  )
}

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
    showToast?.('Sound', next.soundEnabled ? 'Sound on' : 'Sound off')
  }

  const hold = (fn?: () => void) => (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fn?.()
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between gap-2 p-4 sm:p-6 z-10 select-none">
      {/* one row on every screen: all run stats in a single panel left, the two controls right */}
      <div className="flex items-start justify-between gap-2 sm:gap-4 w-full">
        {/* exception: py-2, gap-2 and text-base numbers under 400px keep the row clear of the buttons on small phones */}
        <div className="frost-chip rounded-2xl px-3 py-2 sm:px-4 flex items-center gap-2 min-[400px]:gap-3 sm:gap-4 min-w-0">
          <div className="flex flex-col gap-1">
            <span className={label}>Distance</span>
            <span className="flex items-baseline gap-1 glow-num text-base min-[400px]:text-lg sm:text-2xl text-ice leading-none">
              {scoreData.distance}
              <span className="text-xs text-slate-200">m</span>
            </span>
          </div>
          <div className="h-8 w-px bg-white/12" />
          <div className="flex flex-col gap-1">
            <span className={label}>Score</span>
            <span className="glow-num text-base min-[400px]:text-lg sm:text-2xl text-mint leading-none">{scoreData.score}</span>
          </div>
          <div className="h-8 w-px bg-white/12" />
          <div className="flex flex-col gap-1">
            <span className={label}>Crystals</span>
            <Crystals amount={scoreData.coins} className="text-base min-[400px]:text-lg sm:text-2xl leading-none tabular-nums" />
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
            className="max-[359px]:hidden"
          >
            <HugeiconsIcon icon={muted ? VolumeMute02Icon : VolumeHighIcon} className="text-glacier" aria-hidden />
          </Button>
          <Button
            variant="frost"
            size="icon"
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

      {/* tucked under the top bar in one row, so the lane ahead stays clear */}
      <div className="flex flex-wrap justify-center items-center gap-2 self-center mb-auto pointer-events-auto">
        <Chip className="pl-2" title={scoreData.levelName}>
          <Badge>Lv {scoreData.level}</Badge>
          <span className="font-display font-bold uppercase tracking-wider text-xs text-ice hidden sm:inline short:hidden">
            {scoreData.levelTitle}
          </span>
        </Chip>
        {scoreData.multiplier > 1 && (
          <Chip className="border-aurora/50 animate-pop-in">
            <HugeiconsIcon icon={SparklesIcon} className="size-4 text-aurora" aria-hidden />
            <span className="glow-num text-aurora">×{scoreData.multiplier}</span>
          </Chip>
        )}
        {isPortrait && (
          <Button variant="frost" size="chip" onClick={onRotate} onMouseDown={stop} className="text-glacier">
            <HugeiconsIcon icon={RotateClockwiseIcon} aria-hidden />
            Turn sideways
          </Button>
        )}
        {/* short (landscape-phone) screens show them at the bottom instead, clear of the jump arc */}
        <div className="contents short:hidden">
          <PowerupPills status={powerupStatus} />
        </div>
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
          className={`${touchBtn} frost-glow size-20 sm:size-24 text-glacier active:bg-glacier/20`}
          aria-label="Slide (Down or S)"
          title="Slide (↓ / S)"
        >
          <HugeiconsIcon icon={ArrowDown02Icon} className="size-6" aria-hidden />
          Slide
        </button>
        <div className="flex flex-col items-center gap-2 mx-auto">
          <div className="hidden short:flex gap-2">
            <PowerupPills status={powerupStatus} />
          </div>
        {/* hint strips: chips whose groups are spaced like sections (gap-4), with hint-sized text.
            Keyboard hints for mouse/keyboard screens; touch hints only where they fit between the buttons. */}
        <Chip className="hidden pointer-coarse:sm:inline-flex gap-4 px-4 text-xs text-slate-300 pointer-events-none">
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
        </Chip>
        </div>
        <button
          type="button"
          onPointerDown={hold(onJump)}
          className={`${touchBtn} frost-glow size-20 sm:size-24 text-mint active:bg-mint/20`}
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
