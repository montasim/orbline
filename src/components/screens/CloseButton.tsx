import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { Button } from '#/components/ui/button'

/** Top-right close button shared by every menu dialog. */
export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Close"
      onClick={onClick}
      className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white glass-panel hover:bg-white/10 active:scale-95 transition-all"
    >
      <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
    </Button>
  )
}
