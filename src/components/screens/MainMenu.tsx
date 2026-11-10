import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Award01Icon,
  Calendar03Icon,
  ChampionIcon,
  Coins01Icon,
  PlayIcon,
  RotateClockwiseIcon,
  Settings02Icon,
  SparklesIcon,
  TShirtIcon,
} from '@hugeicons/core-free-icons'
import { audio } from '#/game/audio'
import { storage } from '#/game/storage'

interface MainMenuProps {
  onStart: () => void
  onOpenSkins: () => void
  onOpenDaily: () => void
  onOpenAchievements: () => void
  onOpenLeaderboard: () => void
  onOpenSettings: () => void
  isPortrait: boolean
  onRotate?: () => void
}

const navBtn =
  'flex flex-col items-center gap-1 py-1.5 px-1 sm:py-2 sm:px-4 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-gray-300'
const navLabel = 'text-[9px] sm:text-[10px] font-bold uppercase tracking-wider'

export function MainMenu({
  onStart,
  onOpenSkins,
  onOpenDaily,
  onOpenAchievements,
  onOpenLeaderboard,
  onOpenSettings,
  onRotate,
}: MainMenuProps) {
  // The menu is server-rendered: storage is read after mount so markup matches.
  const [best, setBest] = useState(0)
  const [coins, setCoins] = useState(0)
  const [dailyReady, setDailyReady] = useState(false)
  useEffect(() => {
    setBest(storage.getBestScore())
    setCoins(storage.getTotalCoins())
    const d = storage.getDailyChallenge()
    setDailyReady(d.completed && !d.claimed)
  }, [])

  const click = (fn?: () => void) => () => {
    audio.playButtonClick()
    fn?.()
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-3 sm:p-6 md:p-10 select-none pointer-events-auto overflow-y-auto pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-[1px] shadow-purple shrink-0">
            <div className="w-full h-full bg-[#0d0c18] rounded-xl sm:rounded-2xl flex items-center justify-center">
              <HugeiconsIcon icon={SparklesIcon} className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300 animate-pulse" />
            </div>
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-bold text-purple-400 tracking-widest uppercase">
              Version 1.0
            </span>
            <div className="text-[11px] sm:text-xs font-semibold text-gray-300">Shadow Protocol</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={click(onRotate)}
            className="glass-panel p-2 sm:p-2.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5"
            title="Rotate to Landscape Mode"
          >
            <HugeiconsIcon icon={RotateClockwiseIcon} className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-400" />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Rotate</span>
          </button>
          <div className="glass-panel px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2.5 border border-purple-500/30">
            <HugeiconsIcon icon={ChampionIcon} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-gray-400 tracking-wider">Best</span>
              <span className="text-xs sm:text-sm font-game font-bold text-purple-300">{best}</span>
            </div>
          </div>
          <div className="glass-panel px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2.5 border border-yellow-500/30">
            <HugeiconsIcon icon={Coins01Icon} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-gray-400 tracking-wider">Orbs</span>
              <span className="text-xs sm:text-sm font-game font-bold text-yellow-300">{coins}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center text-center my-auto py-4 sm:py-8 gap-4 sm:gap-8 max-w-xl mx-auto w-full">
        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          <span className="px-3 py-0.5 sm:px-4 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-game font-bold uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
            CYBER SHADOW ENDLESS RUNNER
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-game font-black tracking-wider text-white text-glow-purple drop-shadow-2xl">
            SHADOW<span className="text-cyan-400 text-glow-cyan">RUNNER</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-300 max-w-md font-normal leading-relaxed px-2">
            Dodge lethal spikes, leap across chasms with double jumps, and harness cosmic power-ups in an endless
            sprint.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 sm:gap-3 w-full max-w-xs px-4">
          <button
            onClick={click(onStart)}
            className="w-full py-3.5 sm:py-5 px-6 sm:px-8 rounded-2xl font-game font-black text-base sm:text-xl uppercase tracking-widest bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-black shadow-cyan active:scale-95 transition-all flex items-center justify-center gap-3 animate-pulse-glow"
          >
            <HugeiconsIcon icon={PlayIcon} className="w-5 h-5 sm:w-6 sm:h-6 fill-black" />
            START SPRINT
          </button>
          <span className="text-[11px] sm:text-xs text-gray-400 tracking-wider">
            Tap screen or Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-gray-200">SPACE</kbd>
          </span>
        </div>
      </div>

      <div className="glass-panel max-w-lg w-full mx-auto p-1.5 sm:p-2.5 rounded-2xl grid grid-cols-5 sm:flex sm:justify-around border border-white/10 shadow-2xl">
        <button onClick={click(onOpenSkins)} className={`${navBtn} hover:text-cyan-300`}>
          <HugeiconsIcon icon={TShirtIcon} className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          <span className={navLabel}>Skins</span>
        </button>
        <button onClick={click(onOpenDaily)} className={`relative ${navBtn} hover:text-purple-300`}>
          {dailyReady && (
            <span className="absolute top-1 right-2 sm:right-3 w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
          )}
          <HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
          <span className={navLabel}>Daily</span>
        </button>
        <button onClick={click(onOpenAchievements)} className={`${navBtn} hover:text-cyan-300`}>
          <HugeiconsIcon icon={ChampionIcon} className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          <span className={navLabel}>Trophies</span>
        </button>
        <button onClick={click(onOpenLeaderboard)} className={`${navBtn} hover:text-yellow-300`}>
          <HugeiconsIcon icon={Award01Icon} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
          <span className={navLabel}>Ranks</span>
        </button>
        <button onClick={click(onOpenSettings)} className={`${navBtn} hover:text-white`}>
          <HugeiconsIcon icon={Settings02Icon} className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <span className={navLabel}>Settings</span>
        </button>
      </div>
    </div>
  )
}
