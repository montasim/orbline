import { useCallback, useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Medal01Icon, RankingIcon } from '@hugeicons/core-free-icons'
import { storage } from '#/game/storage'
import { Button } from '#/components/ui/button'
import { getLeaderboard } from '#/server/leaderboard'
import { CARD, DialogShell, ROW } from './shared'

// gold, silver, bronze
const MEDALS = ['bg-amber-400/15 text-amber-300 ring-amber-300/50', 'bg-slate-300/15 text-slate-200 ring-slate-300/50', 'bg-orange-400/15 text-orange-300 ring-orange-300/50']
const COLS = 'grid grid-cols-[3rem_1fr_4.5rem_4rem] items-center gap-2'

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
      tone="amber"
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
        // a table, like a scoreboard: header row, then one divided row per runner
        <div className="frost-chip rounded-2xl overflow-hidden">
          <div aria-hidden className={`${COLS} px-4 py-2 bg-white/5 font-display text-xs font-extrabold uppercase tracking-widest text-slate-400`}>
            <span>Rank</span>
            <span>Runner</span>
            <span className="text-right">Distance</span>
            <span className="text-right">Score</span>
          </div>
          <ol className="divide-y divide-white/8">
            {board.top.map((r) => (
              <RankRow key={`${r.rank}-${r.name}`} {...r} />
            ))}
            {you?.rank && !youInTop && (
              <RankRow rank={you.rank} name={you.name} score={you.score} distance={you.distance} isYou />
            )}
          </ol>
        </div>
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
  const medal = MEDALS[rank - 1]
  return (
    <li className={`${COLS} px-4 py-3 ${isYou ? 'bg-mint/10' : ''}`}>
      {medal ? (
        <span className={`size-8 rounded-full ring-1 flex items-center justify-center ${medal}`} aria-label={`Rank ${rank}`}>
          <HugeiconsIcon icon={Medal01Icon} className="size-4" aria-hidden />
        </span>
      ) : (
        <span className="font-display text-sm font-extrabold text-slate-400">#{rank}</span>
      )}
      <span className="min-w-0 truncate font-bold text-ice">
        {name}
        {isYou && <span className="text-xs font-bold text-mint"> · you</span>}
      </span>
      <span className="text-right text-sm text-slate-400 tabular-nums">{distance}m</span>
      <span className="text-right glow-num text-amber-300">{score}</span>
    </li>
  )
}
