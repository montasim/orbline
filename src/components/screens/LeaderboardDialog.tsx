import { useCallback, useEffect, useState } from 'react'
import { RankingIcon } from '@hugeicons/core-free-icons'
import { storage } from '#/game/storage'
import { Button } from '#/components/ui/button'
import { getLeaderboard } from '#/server/leaderboard'
import { CARD, DialogShell, ROW } from './shared'

const MEDALS = ['bg-mint text-ink', 'bg-glacier text-ink', 'bg-aurora text-ink']

type Board = Awaited<ReturnType<typeof getLeaderboard>>

export function LeaderboardDialog({ onClose, onOpenSettings }: { onClose: () => void; onOpenSettings: () => void }) {
  const [board, setBoard] = useState<Board | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [player, setPlayer] = useState(() => storage.getPlayer())

  const load = useCallback(() => {
    setError(null)
    getLeaderboard({ data: { token: storage.getPlayer()?.token } })
      .then((board) => {
        // a saved identity the server doesn't know (e.g. after a database reset) is forgotten
        if (storage.getPlayer() && !board.you) {
          storage.setPlayer(null)
          setPlayer(null)
        }
        setBoard(board)
      })
      .catch(() => setError('Could not reach the leaderboard. Check your connection.'))
  }, [])
  useEffect(load, [load])

  const you = board?.you
  const youInTop = board?.top.some((r) => r.isYou)

  return (
    <DialogShell
      kicker="Global leaderboard"
      icon={RankingIcon}
      title="Ranks"
      subtitle={board ? `${board.totalPlayers} runners on the board` : 'The fastest runners in every world'}
      onClose={onClose}
      className="max-w-lg"
    >
      {error && (
        <div className={`${ROW} text-sm text-slate-300 flex items-center justify-between gap-3`}>
          {error}
          <button type="button" onClick={load} className="hit-area font-bold text-mint shrink-0">
            Retry
          </button>
        </div>
      )}
      {!board && !error && <p className="text-sm text-slate-400 py-6 text-center">Loading ranks…</p>}

      {board && board.top.length === 0 && (
        <p className={`${CARD} text-sm text-slate-300 text-center`}>
          No ranked runs yet. Finish a run and be the first name on the board!
        </p>
      )}

      {board && board.top.length > 0 && (
        <ol className="flex flex-col gap-2">
          {board.top.map((r) => (
            <RankRow key={`${r.rank}-${r.name}`} {...r} />
          ))}
          {you?.rank && !youInTop && (
            <>
              <li aria-hidden className="text-center text-slate-500 leading-none">
                ⋮
              </li>
              <RankRow rank={you.rank} name={you.name} score={you.score} distance={you.distance} isYou />
            </>
          )}
        </ol>
      )}

      {/* the name itself is chosen in Settings */}
      <div className={`${ROW} flex items-center justify-between gap-3 text-sm`}>
        <span className="text-slate-300 min-w-0 truncate">
          {player ? (
            <>
              Racing as <span className="font-bold text-ice">{player.name}</span>
              {you && !you.rank && <span className="text-slate-400"> · no ranked run yet</span>}
            </>
          ) : (
            'Pick a name in Settings to join the board.'
          )}
        </span>
        <Button variant="frost" size="chip" className="text-mint shrink-0" onClick={onOpenSettings}>
          {player ? 'Change' : 'Set name'}
        </Button>
      </div>
    </DialogShell>
  )
}

function RankRow({ rank, name, score, distance, isYou }: { rank: number; name: string; score: number; distance: number; isYou: boolean }) {
  return (
    <li className={`${ROW} flex items-center gap-3 ${isYou ? 'border-mint/50 bg-mint/10' : ''}`}>
      <span
        className={`min-w-8 h-8 px-2 shrink-0 rounded-full flex items-center justify-center font-display font-extrabold text-sm ${MEDALS[rank - 1] ?? 'bg-white/6 text-slate-300'}`}
      >
        {rank}
      </span>
      <span className="flex-1 min-w-0 truncate font-bold text-ice">
        {name}
        {isYou && <span className="sr-only"> (you)</span>}
      </span>
      <span className="text-sm text-slate-400 tabular-nums">{distance}m</span>
      <span className="w-14 text-right glow-num text-mint">{score}</span>
    </li>
  )
}
