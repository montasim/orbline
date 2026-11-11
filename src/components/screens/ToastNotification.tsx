import { HugeiconsIcon } from '@hugeicons/react'
import type { Toast } from '#/game/types'
import { cn } from '#/lib/utils'
import { DEFAULT_ICON, ICONS } from './icons'

/** `inRun`: below the HUD during a run; otherwise pinned to the top, clear of centred cards and dialogs. */
export function ToastNotification({ toast, inRun }: { toast: Toast; inRun: boolean }) {
  return (
    // pl-2 py-2: an even 8px ring around the round icon badge
    <aside
      aria-live="polite"
      className={cn(
        // in a run: just above the action (--toast-top, set from the ground line), never under the HUD
        inRun
          ? 'top-[max(calc(8rem+env(safe-area-inset-top)),var(--toast-top,40%))]'
          : 'top-[calc(1rem+env(safe-area-inset-top))]',
        // solid backing: a see-through pop-up got lost over bright worlds
        'bg-night/90',
        'fixed left-1/2 z-50 -translate-x-1/2 frost-panel frost-glow rounded-full pl-2 pr-4 py-2 flex items-center gap-3 max-w-[calc(100vw-2rem)] animate-toast-in',
      )}
    >
      <div className="size-10 rounded-full bg-gradient-to-br from-mint to-lagoon text-ink flex items-center justify-center shrink-0">
        <HugeiconsIcon icon={ICONS[toast.icon] ?? DEFAULT_ICON} className="size-5" aria-hidden />
      </div>
      <div className="flex flex-col gap-1 text-left min-w-0">
        <span className="kicker leading-tight whitespace-nowrap">{toast.title}</span>
        <span className="font-display text-sm font-bold text-ice truncate">{toast.message}</span>
      </div>
    </aside>
  )
}
