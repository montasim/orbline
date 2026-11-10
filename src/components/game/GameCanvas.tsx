import { type RefObject, useRef } from 'react'
import type { GameState } from '#/game/types'

interface GameCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  onJump?: () => void
  onSlide?: () => void
  onStopSlide?: () => void
  gameState: GameState
}

/** Left part of the screen is the slide zone on touch screens; the rest jumps. */
const SLIDE_ZONE = 0.4
/** A downward drag this long (CSS px) counts as a swipe-to-slide. */
const SWIPE_DOWN = 32

/**
 * Full-screen game canvas.
 * Touch: tap the right side to jump (instantly, on touch-down; tap again to flip), hold the left side to
 * slide, or swipe down anywhere (mid-air that's a fast-fall). Each finger is tracked on its own, so one
 * thumb can hold a slide while the other jumps. Mouse: click to jump.
 */
export function GameCanvas({ canvasRef, onJump, onSlide, onStopSlide, gameState }: GameCanvasProps) {
  // active touch pointers: where they started and whether they're holding a slide
  const pointers = useRef(new Map<number, { y: number; sliding: boolean }>())
  const playing = gameState === 'PLAYING'

  const release = (id: number) => {
    const p = pointers.current.get(id)
    pointers.current.delete(id)
    if (p?.sliding && ![...pointers.current.values()].some((q) => q.sliding)) onStopSlide?.()
  }

  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden select-none cursor-pointer touch-none"
      onPointerDown={(e) => {
        if (!playing) return
        if (e.pointerType === 'mouse') {
          if (e.button === 0) onJump?.()
          return
        }
        const inSlideZone = e.clientX < e.currentTarget.clientWidth * SLIDE_ZONE
        pointers.current.set(e.pointerId, { y: e.clientY, sliding: inSlideZone })
        if (inSlideZone) onSlide?.()
        else onJump?.()
      }}
      onPointerMove={(e) => {
        const p = pointers.current.get(e.pointerId)
        if (!playing || !p || p.sliding) return
        if (e.clientY - p.y > SWIPE_DOWN) {
          p.sliding = true
          onSlide?.()
        }
      }}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} id="gameCanvas" className="block w-full h-full bg-[#050b1a]" />
    </div>
  )
}
