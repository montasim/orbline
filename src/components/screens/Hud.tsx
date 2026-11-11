import { useEffect } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown02Icon, ArrowUp02Icon, PauseIcon } from '@hugeicons/core-free-icons'
import { Progress } from '#/components/ui/progress'
import { LEVELS, POWERUPS, type IconName, type PowerupDef } from '#/game/data'
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
  'pointer-fine:hidden frost-chip frost-glow size-20 sm:size-24 rounded-full flex flex-col items-center justify-center gap-1 text-sm font-bold active:scale-90 shrink-0 touch-none'

// the rotate tip is a one-off per visit, not a permanent button
let rotateTipShown = false

/** 0–100 through the current level's distance band (full on the last level). */
function levelProgress(level: number, distance: number) {
  const from = LEVELS[level - 1]?.minDistance ?? 0
  const to = LEVELS[level]?.minDistance
  return to === undefined ? 100 : Math.min(100, ((distance - from) / (to - from)) * 100)
}

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
  const progress = levelProgress(scoreData.level, scoreData.distance)

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between gap-2 p-4 sm:p-6 z-10 select-none">
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="flex flex-col landscape:flex-row landscape:items-start gap-2 min-w-0">
          {/* one panel for the run: score is the hero, distance and crystals support it, the bar is level progress */}
          <div className="frost-chip rounded-2xl px-4 py-3 flex flex-col gap-2 w-48 sm:w-56" aria-label="Run stats">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-baseline gap-2 min-w-0">
                <span className="glow-num text-2xl sm:text-3xl text-mint leading-none">
                  {scoreData.score}
                  <span className="sr-only"> points</span>
                </span>
                {scoreData.multiplier > 1 && (
                  <span className="glow-num text-sm text-aurora animate-pop-in">×{scoreData.multiplier}</span>
                )}
              </span>
              <Badge title={`${scoreData.levelTitle} · ${scoreData.levelName}`}>Lv {scoreData.level}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm leading-none">
              <span className="flex items-baseline gap-1 glow-num text-ice">
                {scoreData.distance}
                <span className="text-xs text-slate-300">m</span>
              </span>
              <Crystals amount={scoreData.coins} className="tabular-nums" />
            </div>
            <Progress
              value={progress}
              aria-label={`Level ${scoreData.level} progress`}
              className="h-1 bg-white/10 *:data-[slot=progress-indicator]:bg-mint"
            />
          </div>

          {(p.shield || p.magnet || p.speedBoost) && (
            <div className="flex gap-2">
              {p.shield && <PowerupBadge def={POWERUPS.SHIELD} left={1} />}
              {p.magnet && <PowerupBadge def={POWERUPS.MAGNET} left={p.magnetTimer / p.magnetMax} />}
              {p.speedBoost && <PowerupBadge def={POWERUPS.SPEED} left={p.speedBoostTimer / p.speedBoostMax} />}
            </div>
          )}
        </div>

        <Button
          variant="frost"
          size="icon"
          className="pointer-events-auto"
          onClick={(e: MouseEvent) => {
            e.stopPropagation()
            onPause()
          }}
          // corner buttons sit over the canvas: keep their clicks from reaching it as jumps
          onMouseDown={(e: MouseEvent) => e.stopPropagation()}
          aria-label="Pause (P or Esc)"
          title="Pause (P or Esc)"
        >
          <HugeiconsIcon icon={PauseIcon} className="text-mint" aria-hidden />
        </Button>
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
