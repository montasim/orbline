import { useEffect, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { MapsIcon, Tick02Icon } from '@hugeicons/core-free-icons'
import { audio } from '#/game/audio'
import { type GameMap, MAPS } from '#/game/maps'
import { CARD, DialogShell } from './shared'

// rendered at game-like proportions, then scaled down by CSS so layers aren't cramped
const PREVIEW_W = 640
const PREVIEW_H = 260
const PREVIEW_GROUND = 205

/** A real frame of the map's scene (first stage), so the picker shows what you'll actually run through. */
export function MapPreview({
  map,
  fallback,
  accent,
  className = 'h-20 w-full',
}: {
  map: GameMap
  fallback: string
  accent: string
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    try {
      const scene = map.createScene(PREVIEW_W, PREVIEW_H, PREVIEW_GROUND)
      for (let i = 0; i < 30; i++) scene.update(2) // let weather/particles spread out
      scene.draw(ctx, 0)
    } catch {
      // a broken scene must not break the picker; the gradient fallback stays visible
    }
  }, [map])
  return (
    <span aria-hidden className={`relative block overflow-hidden rounded-xl ${className}`} style={{ background: fallback }}>
      <canvas ref={ref} width={PREVIEW_W} height={PREVIEW_H} className="absolute inset-0 size-full object-cover" />
      <span className="absolute inset-x-0 bottom-0 h-0.5 opacity-80" style={{ background: accent }} />
    </span>
  )
}

interface RegionsDialogProps {
  selectedMap: string
  onSelect: (id: string) => void
  onClose: () => void
}

/** Pick the world for the next run. Every region plays identically; only the look changes. */
export function RegionsDialog({ selectedMap, onSelect, onClose }: RegionsDialogProps) {
  return (
    <DialogShell
      tone="glacier" icon={MapsIcon} title="Regions" subtitle="Choose the world for your next run" onClose={onClose} className="max-w-lg">
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MAPS.map((m) => {
          const active = m.id === selectedMap
          const [sky, land, accent] = m.swatch
          return (
            <li key={m.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => {
                  audio.playButtonClick()
                  onSelect(m.id)
                  onClose()
                }}
                className={`${CARD} w-full text-left flex flex-col gap-3 transition ${active ? 'border-mint/60 bg-mint/10' : ''}`}
              >
                <MapPreview map={m} fallback={`linear-gradient(${sky} 0%, ${sky} 55%, ${land} 55%, ${land} 100%)`} accent={accent} />
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex flex-col gap-1">
                    <span className="block font-display font-extrabold uppercase tracking-wide text-ice">{m.name}</span>
                    <span className="block text-xs text-slate-400">{m.tagline}</span>
                  </span>
                  {active && <HugeiconsIcon icon={Tick02Icon} className="size-5 text-mint shrink-0" aria-label="Selected" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </DialogShell>
  )
}
