import type { ComponentProps, ReactNode } from 'react'
import { useEffect, useId } from 'react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Cancel01Icon, SnowflakeIcon } from '@hugeicons/core-free-icons'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import type { Skin } from '#/game/data'

// Surfaces from components/DESIGN.md, shared so every screen uses the same values.
/** frosted card: content blocks inside dialogs */
export const CARD = 'frost-chip rounded-2xl p-4'
/** frosted row: one-line list items and status lines */
export const ROW = 'frost-chip rounded-2xl px-4 py-3'

/** Snowflake crystal + amount, the in-game currency badge. */
export function Crystals({ amount, className = '' }: { amount: number | string; className?: string }) {
  return (
    // exception: gap-1 and an em-sized icon — the glyph reads as part of the number at every text size
    <span className={cn('inline-flex items-center gap-1 glow-num text-crystal', className)}>
      <HugeiconsIcon icon={SnowflakeIcon} className="size-[1.05em] shrink-0" aria-hidden />
      {amount}
      <span className="sr-only"> crystals</span>
    </span>
  )
}

/** Frosted pill for read-only values (best score, crystals, level, power-ups). */
export function Chip({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('frost-chip rounded-full h-9 px-3 inline-flex items-center gap-2 text-sm shrink-0 [&_svg]:shrink-0', className)}
      {...props}
    />
  )
}

/** Icon tile + title + description, with a trailing control or value (Settings, Trophies). */
export function Row({
  icon,
  title,
  desc,
  tileClassName = 'bg-white/6 text-glacier',
  className,
  children,
}: {
  icon: IconSvgElement
  title: ReactNode
  desc: ReactNode
  tileClassName?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={cn(ROW, 'flex items-center gap-3', className)}>
      <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', tileClassName)}>
        <HugeiconsIcon icon={icon} className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <h4 className="font-display text-base font-bold text-ice leading-tight flex items-center gap-2">{title}</h4>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
      {children}
    </div>
  )
}

interface DialogShellProps {
  icon: IconSvgElement
  title: string
  subtitle?: ReactNode
  /** colour of the header tile: every dialog has its own (see TONES) */
  tone?: Tone
  onClose: () => void
  /** Right side of the header, e.g. the crystal balance. */
  aside?: ReactNode
  className?: string
  children: ReactNode
}

/** Frosted modal used by Orbs, Daily, Trophies, Ranks, Settings and Regions. */
export function DialogShell({ icon, title, subtitle, tone = 'mint', onClose, aside, className = 'max-w-md', children }: DialogShellProps) {
  const titleId = useId()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <Overlay className="z-40 fixed">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(PANEL, className)}
      >
        <header className="flex items-center gap-3">
          <IconBadge icon={icon} tone={tone} />
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <h2 id={titleId} className="game-title normal-case tracking-normal text-xl sm:text-2xl leading-tight">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
          </div>
          {aside}
          <Button variant="frost" size="icon" aria-label="Close" onClick={onClose} className="rounded-xl text-slate-300 hover:text-ice">
            <HugeiconsIcon icon={Cancel01Icon} aria-hidden />
          </Button>
        </header>
        {children}
      </div>
    </Overlay>
  )
}

/** Outermost dialog surface (DialogShell, Paused, Run over). */
export const PANEL =
  'frost-panel w-full max-h-[92dvh] overflow-y-auto rounded-3xl p-4 sm:p-6 flex flex-col gap-4 animate-pop-in'

/** Dimmed, centred backdrop for dialogs; screen-edge padding per DESIGN.md. */
export function Overlay({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('absolute inset-0 z-30 flex items-center justify-center safe-pad night-scrim animate-fade-in select-none', className)}>
      {children}
    </div>
  )
}

/** Vivid tints for header tiles, row tiles and reward chips. */
export const TONES = {
  mint: 'bg-mint/15 text-mint ring-mint/40',
  glacier: 'bg-glacier/15 text-glacier ring-glacier/40',
  aurora: 'bg-aurora/15 text-aurora ring-aurora/40',
  amber: 'bg-amber-400/15 text-amber-300 ring-amber-300/40',
  crystal: 'bg-crystal/15 text-crystal ring-crystal/40',
}
export type Tone = keyof typeof TONES

/** Header badge for dialogs and screens: a tinted tile in the dialog's own colour. */
export function IconBadge({ icon, tone = 'mint' }: { icon: IconSvgElement; tone?: Tone }) {
  return (
    <div className={cn('size-12 shrink-0 rounded-2xl ring-1 flex items-center justify-center', TONES[tone])}>
      <HugeiconsIcon icon={icon} className="size-6" aria-hidden />
    </div>
  )
}

/** Amber "+N" crystal reward pill (Daily, Trophies). */
export function RewardChip({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-1 h-7 px-2 rounded-full ring-1 bg-amber-400/15 text-amber-300 ring-amber-300/40 glow-num text-sm shrink-0">
      <HugeiconsIcon icon={SnowflakeIcon} className="size-4" aria-hidden />+{amount}
      <span className="sr-only"> crystals</span>
    </span>
  )
}

/** A skin as a glowing orb: soft halo, lit core, rim light and an energy band (matches the in-game runner). */
export function OrbAvatar({ skin, className = '' }: { skin: Skin; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`${skin.name} preview`}>
      <defs>
        <radialGradient id={`halo${id}`}>
          <stop offset="0.45" stopColor={skin.accent} stopOpacity="0.55" />
          <stop offset="1" stopColor={skin.accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`core${id}`} cx="0.38" cy="0.34" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.28" stopColor={skin.accent} />
          <stop offset="0.85" stopColor={skin.color} />
          <stop offset="1" stopColor="#050b1a" stopOpacity="0.9" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="46" fill={`url(#halo${id})`} />
      <circle cx="50" cy="52" r="27" fill={`url(#core${id})`} />
      <path d="M26 58 Q50 40 74 50" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 66 Q52 54 72 60" fill="none" stroke={skin.accent} strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="52" r="27" fill="none" stroke={skin.accent} strokeWidth="1.5" strokeOpacity="0.9" />
      <ellipse cx="40" cy="40" rx="7" ry="4.5" fill="#ffffff" fillOpacity="0.85" transform="rotate(-30 40 40)" />
    </svg>
  )
}
