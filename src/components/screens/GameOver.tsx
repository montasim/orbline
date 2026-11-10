import type { ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Home01Icon,
  MountainSnowIcon,
  RankingIcon,
  OrbitIcon,
  RotateLeft01Icon,
  StarIcon,
} from '@hugeicons/core-free-icons'
import { audio } from '#/game/audio'
import type { OnlineRun, ScoreData } from '#/game/types'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Crystals, Overlay, PANEL, ROW } from './shared'

interface GameOverProps {
  scoreData: ScoreData
  isNewHighScore: boolean
  onRestart: () => void
  onMainMenu: () => void
  onOpenSkins: () => void
  onOpenRanks: () => void
  onlineRun: OnlineRun
  /** opens Settings, where the leaderboard name is chosen */
  onOpenSettings: () => void
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    // exception: px-2 (not the card's p-4) so three stats fit side by side at 375px
    <div className="frost-chip rounded-2xl px-2 py-4 flex flex-col items-center gap-1">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <span className="glow-num text-2xl leading-none">{children}</span>
    </div>
  )
}

export function GameOver({
  scoreData,
  isNewHighScore,
  onRestart,
  onMainMenu,
  onOpenSkins,
  onOpenRanks,
  onlineRun,
  onOpenSettings,
}: GameOverProps) {
  const click = (fn: () => void) => () => {
    audio.playButtonClick()
    fn()
  }

  return (
    <Overlay>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gameover-title"
        className={`${PANEL} max-w-md items-center text-center`}
      >
        <div className="flex flex-col items-center gap-2">
          {isNewHighScore && (
            <Badge variant="outline" className="frost-chip text-aurora border-aurora/40">
              <HugeiconsIcon icon={StarIcon} className="fill-current" aria-hidden />
              New best score!
            </Badge>
          )}
          <span className="kicker">Run complete</span>
          <h1 id="gameover-title" className="game-title text-4xl sm:text-5xl">
            Run over
          </h1>
          <p className="text-sm text-slate-400 flex items-center gap-2">
            <HugeiconsIcon icon={MountainSnowIcon} className="size-4 text-glacier" aria-hidden />
            You made it to <span className="font-bold text-ice">{scoreData.levelTitle}</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full">
          <Stat label="Distance">
            <span className="inline-flex items-baseline gap-1 text-glacier">
              {scoreData.distance}
              <span className="text-sm">m</span>
            </span>
          </Stat>
          <Stat label="Crystals">
            <Crystals amount={scoreData.coins} />
          </Stat>
          <Stat label="Score">
            <span className="text-mint">{scoreData.score}</span>
          </Stat>
        </div>

        <div className={`${ROW} w-full flex items-center justify-between gap-3 text-sm`}>
          <span className="text-slate-300">
            Level {scoreData.level} · <span className="text-slate-400">{scoreData.levelName}</span>
          </span>
          <span className="flex items-center gap-2 text-slate-300">
            <HugeiconsIcon icon={StarIcon} className="size-4 text-mint" aria-hidden />
            {/* label and number differ in font and size: share a baseline so they read as one line */}
            <span className="flex items-baseline gap-1 leading-none">
              Best
              <span className="glow-num text-ice text-base leading-none">{scoreData.bestScore}</span>
            </span>
          </span>
        </div>

        <RankPanel onlineRun={onlineRun} onOpenSettings={click(onOpenSettings)} onOpenRanks={click(onOpenRanks)} />

        <div className="flex flex-col gap-2 w-full">
          <Button variant="aurora" onClick={click(onRestart)} className="w-full">
            <HugeiconsIcon icon={RotateLeft01Icon} aria-hidden />
            Run again
          </Button>
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="frost" size="md" onClick={click(onOpenSkins)}>
              <HugeiconsIcon icon={OrbitIcon} className="text-glacier" aria-hidden />
              Orbs
            </Button>
            <Button variant="frost" size="md" onClick={click(onMainMenu)}>
              <HugeiconsIcon icon={Home01Icon} className="text-slate-400" aria-hidden />
              Menu
            </Button>
          </div>
        </div>

        <p className="pointer-coarse:hidden text-xs text-slate-400">
          Press <kbd className="nd-kbd">Space</kbd> to run again
        </p>
      </div>
    </Overlay>
  )
}

/** Where this run landed on the shared leaderboard. */
function RankPanel({
  onlineRun,
  onOpenSettings,
  onOpenRanks,
}: Pick<GameOverProps, 'onlineRun'> & { onOpenRanks: () => void; onOpenSettings: () => void }) {
  const box = `${ROW} w-full text-sm`
  switch (onlineRun.phase) {
    case 'needsName':
      return (
        <div className={`${box} flex items-center justify-between gap-3 text-left`}>
          <p className="text-slate-300">Add a name to put this run on the global ranks</p>
          <Button variant="frost" size="chip" className="text-mint shrink-0" onClick={onOpenSettings}>
            Set name
          </Button>
        </div>
      )
    case 'submitting':
      return (
        <p className={`${box} text-slate-300`} aria-live="polite">
          Checking your run…
        </p>
      )
    case 'accepted':
      return (
        <button
          type="button"
          onClick={onOpenRanks}
          aria-live="polite"
          className={`${box} flex items-center justify-between gap-3`}
        >
          <span className="flex items-center gap-2 text-slate-300">
            <HugeiconsIcon icon={RankingIcon} className="size-4 text-mint" aria-hidden />
            {onlineRun.personalBest ? 'New personal best · global rank' : 'Your global rank'}
          </span>
          <span className="glow-num text-base text-mint">#{onlineRun.rank}</span>
        </button>
      )
    case 'rejected':
      return <p className={`${box} text-slate-400`}>This run wasn't ranked: {onlineRun.reason}</p>
    case 'offline':
      return <p className={`${box} text-slate-400`}>You were offline when this run started, so it isn't ranked.</p>
    case 'error':
      return <p className={`${box} text-rose-300`}>{onlineRun.message}</p>
    default:
      return null
  }
}
