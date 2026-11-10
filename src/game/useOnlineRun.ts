// Client side of the shared leaderboard: run tickets, result submission and first-time naming.
import { useCallback, useRef, useState } from 'react'
import { finishRun, startRun } from '#/server/leaderboard'
import { storage } from './storage'
import type { OnlineRun } from './types'

interface Ticket {
  runId: string
  secret: string
}

export interface RunClaim {
  distance: number
  crystals: number
  speedBoosts: number
}

const message = (e: unknown) => (e instanceof Error ? e.message : 'Could not reach the leaderboard')

export function useOnlineRun() {
  const [onlineRun, setOnlineRun] = useState<OnlineRun>({ phase: 'idle' })
  // the ticket request starts with the run and resolves while it's being played
  const ticket = useRef<Promise<Ticket | null> | null>(null)
  const pending = useRef<RunClaim | null>(null)

  const beginRun = useCallback(() => {
    setOnlineRun({ phase: 'idle' })
    pending.current = null
    const player = storage.getPlayer()
    ticket.current = startRun({ data: { token: player?.token } }).catch(() => null)
  }, [])

  const submit = useCallback(async (token: string) => {
    const claim = pending.current
    const t = await ticket.current
    if (!claim) return
    if (!t) {
      setOnlineRun({ phase: 'offline' })
      return
    }
    setOnlineRun({ phase: 'submitting' })
    try {
      const result = await finishRun({ data: { ...t, token, ...claim } })
      pending.current = null
      setOnlineRun(result.status === 'accepted' ? { phase: 'accepted', ...result } : { phase: 'rejected', reason: result.reason })
    } catch (e) {
      if (message(e) === 'Unknown player') {
        // the saved identity no longer exists on the server (e.g. database reset): ask for a name again;
        // the run ticket is still open, so the pending run can be submitted under the new name
        storage.setPlayer(null)
        setOnlineRun({ phase: 'needsName' })
        return
      }
      setOnlineRun({ phase: 'error', message: message(e) })
    }
  }, [])

  const endRun = useCallback(
    (claim: RunClaim) => {
      pending.current = claim
      const player = storage.getPlayer()
      if (player) void submit(player.token)
      else setOnlineRun({ phase: 'needsName' })
    },
    [submit],
  )

  /** Submits a finished run that was waiting for a name, once one has been chosen (in Settings). */
  const submitPendingRun = useCallback(() => {
    const player = storage.getPlayer()
    if (pending.current && player) void submit(player.token)
  }, [submit])

  return { onlineRun, beginRun, endRun, submitPendingRun }
}
