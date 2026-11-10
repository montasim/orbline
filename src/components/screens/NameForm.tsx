import { useId, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserCircleIcon } from '@hugeicons/core-free-icons'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { storage } from '#/game/storage'
import { cn } from '#/lib/utils'
import { registerPlayer, renamePlayer } from '#/server/leaderboard'
import { nameProblem, normaliseName } from '#/server/names'
import { ROW } from './shared'

interface NameFormProps {
  /** throws with a user-facing message (name taken, too many attempts…) */
  onSubmit: (name: string) => Promise<void>
  submitLabel: string
  initial?: string
}

/** Leaderboard name entry: same rules as the server, checked instantly, server errors shown inline. */
export function NameForm({ onSubmit, submitLabel, initial = '' }: NameFormProps) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const errorId = useId()

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const name = normaliseName(value)
    const problem = nameProblem(name)
    if (problem) return setError(problem)
    setBusy(true)
    setError(null)
    try {
      await onSubmit(name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 w-full" noValidate>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          maxLength={16}
          placeholder="Your name"
          aria-label="Leaderboard name"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          autoComplete="nickname"
          className="h-12 rounded-full bg-white/8 border-white/15 px-4 text-sm text-ice placeholder:text-slate-500"
        />
        <Button type="submit" variant="aurora" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-rose-300 text-left px-4">
          {error}
        </p>
      )}
    </form>
  )
}

/**
 * The player's leaderboard identity (lives in Settings): shows the current name and lets the player
 * choose one (registers) or change it (renames). `onSaved` lets the caller submit a run that was
 * waiting for a name.
 */
export function PlayerNameCard({ onSaved }: { onSaved?: () => void }) {
  const [player, setPlayer] = useState(() => storage.getPlayer())
  const [editing, setEditing] = useState(false)

  const save = async (name: string) => {
    if (player) {
      try {
        await renamePlayer({ data: { token: player.token, name } })
        storage.setPlayer({ ...player, name })
      } catch (e) {
        // the saved identity is gone on the server (e.g. database reset): start fresh with this name
        if (!(e instanceof Error) || e.message !== 'Unknown player') throw e
        const p = await registerPlayer({ data: { name } })
        storage.setPlayer({ token: p.token, name: p.name })
      }
    } else {
      const p = await registerPlayer({ data: { name } })
      storage.setPlayer({ token: p.token, name: p.name })
    }
    setPlayer(storage.getPlayer())
    setEditing(false)
    onSaved?.()
  }

  return (
    <div className={cn(ROW, 'flex flex-col gap-3')}>
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl flex items-center justify-center shrink-0 bg-mint/15 text-mint">
          <HugeiconsIcon icon={UserCircleIcon} className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <h4 className="font-display text-base font-bold text-ice leading-tight">Leaderboard name</h4>
          <p className="text-xs text-slate-400">
            {player ? (
              <>
                Racing as <span className="font-bold text-ice">{player.name}</span>
              </>
            ) : (
              'Pick a name to put your runs on the global ranks'
            )}
          </p>
        </div>
        {!editing && (
          <Button variant="frost" size="chip" className="text-mint" onClick={() => setEditing(true)}>
            {player ? 'Change' : 'Choose'}
          </Button>
        )}
      </div>
      {editing && <NameForm onSubmit={save} submitLabel="Save" initial={player?.name} />}
    </div>
  )
}
