import { useId } from 'react'
import { GAME_NAME } from '#/game/data'
import { cn } from '#/lib/utils'

/**
 * The Orbline wordmark: a glowing orb is the "O", the rest is chunky Fredoka lettering with a dark
 * outline and an extruded underside (reads over any world, no backing plate), and a light streak
 * — the line — runs out from under the orb. SVG so outline and depth stay crisp at every size.
 */
export function OrblineLogo({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  const letters = GAME_NAME.slice(1).toUpperCase() // "RBLINE"; the orb is the O
  // textLength pins the word's width, so the layout holds even before the font has loaded
  const text = { x: 132, y: 112, textLength: 360, lengthAdjust: 'spacingAndGlyphs' as const }
  // Exo 2 Black Italic: the forward lean reads as speed
  const font = { fontFamily: '"Exo 2", Nunito, system-ui, sans-serif', fontWeight: 900, fontStyle: 'italic', fontSize: 100 }

  return (
    <h1 className={cn('m-0', className)}>
      <span className="sr-only">{GAME_NAME}</span>
      <svg viewBox="0 0 512 150" className="w-full h-auto overflow-visible" aria-hidden>
        <defs>
          <radialGradient id={`core${id}`} cx="0.36" cy="0.32" r="0.78">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.25" stopColor="#a7f3d0" />
            <stop offset="0.62" stopColor="#2dd4bf" />
            <stop offset="0.92" stopColor="#0f766e" />
            <stop offset="1" stopColor="#063a36" />
          </radialGradient>
          <radialGradient id={`halo${id}`}>
            <stop offset="0.55" stopColor="#5eead4" stopOpacity="0.55" />
            <stop offset="1" stopColor="#5eead4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`fill${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0fdfa" />
            <stop offset="0.45" stopColor="#99f6e4" />
            <stop offset="1" stopColor="#2dd4bf" />
          </linearGradient>
          <linearGradient id={`line${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5eead4" />
            <stop offset="0.55" stopColor="#7dd3fc" />
            <stop offset="1" stopColor="#f0abfc" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* the line: a light streak running out from under the orb */}
        <rect x="70" y="128" width="430" height="7" rx="3.5" fill={`url(#line${id})`} opacity="0.95" />
        <rect x="70" y="125" width="300" height="13" rx="6.5" fill={`url(#line${id})`} opacity="0.25" />

        {/* lettering: outline + two extrusion layers below, then the face */}
        <g {...font}>
          <text {...text} y={text.y + 9} fill="#04201f" stroke="#050b1a" strokeWidth="12" strokeLinejoin="round" paintOrder="stroke">
            {letters}
          </text>
          <text {...text} y={text.y + 5} fill="#0f766e" stroke="#050b1a" strokeWidth="10" strokeLinejoin="round" paintOrder="stroke">
            {letters}
          </text>
          <text {...text} fill={`url(#fill${id})`} stroke="#050b1a" strokeWidth="9" strokeLinejoin="round" paintOrder="stroke">
            {letters}
          </text>
        </g>

        {/* the orb is the O */}
        <circle cx="80" cy="76" r="56" fill={`url(#halo${id})`} className="orb-pulse" />
        <circle cx="80" cy="76" r="41" fill="#050b1a" />
        <circle cx="80" cy="76" r="37" fill={`url(#core${id})`} />
        <g className="orb-spin" style={{ transformOrigin: '80px 76px' }}>
          <path d="M47 85 Q80 56 113 71" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
          <path d="M52 95 Q83 78 109 87" fill="none" stroke="#a7f3d0" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx="80" cy="76" r="37" fill="none" stroke="#5eead4" strokeWidth="3" />
        <ellipse cx="68" cy="61" rx="10" ry="6" fill="#ffffff" fillOpacity="0.9" transform="rotate(-30 68 61)" />
      </svg>
    </h1>
  )
}
