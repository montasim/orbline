import { type RefObject, useRef } from 'react'
import type { GameState } from '#/game/types'

interface GameCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  onJump?: () => void
  onSlide?: () => void
  onStopSlide?: () => void
  gameState: GameState
}

/** Full-screen game canvas: tap/click to jump, swipe down to slide. */
export function GameCanvas({ canvasRef, onJump, onSlide, onStopSlide, gameState }: GameCanvasProps) {
  const touchStart = useRef({ x: 0, y: 0, time: 0 })
  // once a touch is seen, ignore the synthetic mousedown that follows it
  const isTouch = useRef(false)

  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden select-none cursor-pointer touch-none"
      onMouseDown={(e) => {
        if (isTouch.current) return
        if (e.button === 0 && gameState === 'PLAYING') onJump?.()
      }}
      onTouchStart={(e) => {
        isTouch.current = true
        if (gameState !== 'PLAYING') return
        const t = e.touches[0]
        touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() }
      }}
      onTouchEnd={(e) => {
        if (gameState !== 'PLAYING') return
        const t = e.changedTouches[0]
        const dx = t.clientX - touchStart.current.x
        const dy = t.clientY - touchStart.current.y
        if (dy > 35 && Math.abs(dy) > Math.abs(dx)) {
          onSlide?.()
          setTimeout(() => onStopSlide?.(), 500)
        } else onJump?.()
      }}
    >
      <canvas ref={canvasRef} id="gameCanvas" className="block w-full h-full bg-[#06060c]" />
    </div>
  )
}
