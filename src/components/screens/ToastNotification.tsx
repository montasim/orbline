import { HugeiconsIcon } from '@hugeicons/react'
import type { Toast } from '#/game/types'
import { DEFAULT_ICON, ICONS } from './icons'

export function ToastNotification({ toast }: { toast: Toast }) {
  return (
    <aside
      aria-label="Notification"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 glass-panel-glow px-5 py-2.5 rounded-2xl flex items-center gap-3 border border-cyan-400 shadow-cyan animate-bounce"
    >
      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
        <HugeiconsIcon icon={ICONS[toast.icon] ?? DEFAULT_ICON} className="w-4 h-4" />
      </div>
      <div className="flex flex-col text-left">
        <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">{toast.title}</span>
        <span className="text-xs font-semibold text-white">{toast.message}</span>
      </div>
    </aside>
  )
}
