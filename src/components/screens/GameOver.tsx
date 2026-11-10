import { HugeiconsIcon } from '@hugeicons/react'
import {
  ChampionIcon,
  Coins01Icon,
  FireIcon,
  Home01Icon,
  RotateLeft01Icon,
  TShirtIcon,
} from '@hugeicons/core-free-icons'
import { audio } from '#/game/audio'
import type { ScoreData } from '#/game/types'

interface GameOverProps {
  scoreData: ScoreData
  isNewHighScore: boolean
  onRestart: () => void
  onMainMenu: () => void
  onOpenSkins: () => void
}

const statLabel = 'text-[10px] font-bold text-gray-400 uppercase tracking-widest'

export function GameOver({ scoreData, isNewHighScore, onRestart, onMainMenu, onOpenSkins }: GameOverProps) {
  const click = (fn: () => void) => () => {
    audio.playButtonClick()
    fn()
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="glass-panel-glow max-w-md w-full p-4 sm:p-8 rounded-3xl flex flex-col items-center text-center gap-4 sm:gap-6 border border-red-500/40 shadow-crimson max-h-[92vh] overflow-y-auto">
        <div className="flex flex-col items-center gap-1.5">
          {isNewHighScore ? (
            <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-yellow-400/20 border border-yellow-400 text-yellow-300 text-xs font-game font-bold tracking-widest uppercase animate-bounce text-glow-gold">
              <HugeiconsIcon icon={ChampionIcon} className="w-3.5 h-3.5 fill-yellow-400" />
              New High Score!
            </div>
          ) : (
            <span className="text-xs uppercase font-game font-semibold tracking-widest text-red-400">Run Terminated</span>
          )}
          <h1 className="text-4xl sm:text-5xl font-game font-black text-white text-glow-purple tracking-wider">
            GAME OVER
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="glass-panel p-3.5 rounded-2xl flex flex-col items-center border border-purple-500/30">
            <span className={statLabel}>Distance</span>
            <span className="text-2xl sm:text-3xl font-game font-black text-purple-300">
              {scoreData.distance}
              <span className="text-sm font-sans text-purple-400">m</span>
            </span>
          </div>
          <div className="glass-panel p-3.5 rounded-2xl flex flex-col items-center border border-yellow-500/30">
            <span className={statLabel}>Orbs Gathered</span>
            <span className="text-2xl sm:text-3xl font-game font-black text-yellow-400 flex items-center gap-1">
              <HugeiconsIcon icon={Coins01Icon} className="w-5 h-5 fill-yellow-400" />
              {scoreData.coins}
            </span>
          </div>
          <div className="glass-panel p-3.5 rounded-2xl flex flex-col items-center border border-cyan-500/30">
            <span className={statLabel}>Total Score</span>
            <span className="text-2xl sm:text-3xl font-game font-black text-cyan-300">{scoreData.score}</span>
          </div>
          <div className="glass-panel p-3.5 rounded-2xl flex flex-col items-center border border-white/10">
            <span className={statLabel}>Level Reached</span>
            <span className="text-lg sm:text-xl font-game font-bold text-gray-200 flex items-center gap-1">
              <HugeiconsIcon icon={FireIcon} className="w-4 h-4 text-orange-400 fill-orange-400" />
              Lv.{scoreData.level}
            </span>
          </div>
        </div>

        <div className="w-full glass-panel py-2.5 px-4 rounded-xl flex items-center justify-between border border-white/10 text-xs sm:text-sm text-gray-300">
          <span className="flex items-center gap-2">
            <HugeiconsIcon icon={ChampionIcon} className="w-4 h-4 text-yellow-400" />
            All-Time Best
          </span>
          <span className="font-game font-bold text-yellow-400 text-base">{scoreData.bestScore}</span>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={click(onRestart)}
            className="w-full py-4 px-6 rounded-2xl font-game font-bold text-base sm:text-lg uppercase tracking-wider bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white shadow-purple active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <HugeiconsIcon icon={RotateLeft01Icon} className="w-5 h-5" />
            Play Again
          </button>
          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={click(onOpenSkins)}
              className="py-3 px-4 rounded-xl font-medium text-xs sm:text-sm uppercase tracking-wider glass-panel hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2 text-cyan-300 border border-cyan-500/30"
            >
              <HugeiconsIcon icon={TShirtIcon} className="w-4 h-4" />
              Skins
            </button>
            <button
              onClick={click(onMainMenu)}
              className="py-3 px-4 rounded-xl font-medium text-xs sm:text-sm uppercase tracking-wider glass-panel hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2 text-gray-300 border border-white/15"
            >
              <HugeiconsIcon icon={Home01Icon} className="w-4 h-4" />
              Menu
            </button>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 tracking-wider">
          Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-gray-200">SPACE</kbd> to quickly
          restart
        </p>
      </div>
    </div>
  )
}
