import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Calendar03Icon,
  ChampionIcon,
  PlayIcon,
  RankingIcon,
  OrbitIcon,
  RotateClockwiseIcon,
  Settings02Icon,
  SnowflakeIcon,
} from '@hugeicons/core-free-icons'
import { audio } from '#/game/audio'
import { mapById } from '#/game/maps'
import { storage } from '#/game/storage'
import { Button } from '#/components/ui/button'
import { OrblineLogo } from './Logo'
import { MapPreview } from './RegionsDialog'


interface MainMenuProps {
  onStart: () => void
  onOpenSkins: () => void
  onOpenDaily: () => void
  onOpenAchievements: () => void
  onOpenLeaderboard: () => void
  onOpenSettings: () => void
  onOpenRegions: () => void
  /** id of the selected world (picked in the Regions dialog) */
  selectedMap: string
  isPortrait: boolean
  onRotate?: () => void
}

// dock keeps its own compact shape: p-2 tray, py-2 items (py-1 on short screens) so it fits landscape phones
const dockBtn =
  'relative flex flex-col items-center gap-1 py-2 short:py-1 rounded-xl text-slate-200 hover:text-ice hover:bg-white/8 active:scale-95 transition'
// exception: 10px labels (like the reference dock) so TROPHIES and SETTINGS never touch on 320px phones
const dockLabel = 'font-display text-[0.625rem] font-bold uppercase tracking-wide leading-none'
// top-right stat tiles: a micro label over a glowing value
const tile = 'frost-panel rounded-2xl p-2 pr-3 flex items-center gap-2'
const tileLabel = 'font-display text-xs font-extrabold uppercase tracking-widest leading-none'
// vivid icon box beside each stat; phones drop it to keep the top bar on one line
const tileIcon = 'size-8 rounded-lg flex items-center justify-center shrink-0 max-sm:hidden'

export function MainMenu({
  onStart,
  onOpenSkins,
  onOpenDaily,
  onOpenAchievements,
  onOpenLeaderboard,
  onOpenSettings,
  onOpenRegions,
  selectedMap,
  isPortrait,
  onRotate,
}: MainMenuProps) {
  // The menu is server-rendered: storage is read after mount so markup matches.
  const [best, setBest] = useState(0)
  const [crystals, setCrystals] = useState(0)
  const [dailyReady, setDailyReady] = useState(false)
  useEffect(() => {
    setBest(storage.getBestScore())
    setCrystals(storage.getTotalCoins())
    const d = storage.getDailyChallenge()
    setDailyReady(d.completed && !d.claimed)
  }, [])

  const click = (fn?: () => void) => () => {
    audio.playButtonClick()
    fn?.()
  }

  const world = mapById(selectedMap)

  const dock = [
    { label: 'Orbs', icon: OrbitIcon, onClick: onOpenSkins, tint: 'text-glacier' },
    { label: 'Daily', icon: Calendar03Icon, onClick: onOpenDaily, dot: dailyReady, tint: 'text-aurora' },
    { label: 'Trophies', icon: ChampionIcon, onClick: onOpenAchievements, tint: 'text-mint' },
    { label: 'Ranks', icon: RankingIcon, onClick: onOpenLeaderboard, tint: 'text-amber-300' },
    { label: 'Settings', icon: Settings02Icon, onClick: onOpenSettings, tint: 'text-slate-300' },
  ]

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between gap-4 safe-pad short:gap-2 select-none overflow-y-auto">
      {/* top bar: the world badge on the left (opens all worlds); stat tiles on the right */}
      <div className="flex items-start justify-between w-full gap-2">
        <button
          type="button"
          onClick={click(onOpenRegions)}
          className="group min-w-0 flex items-center gap-3 text-left rounded-2xl"
          aria-label={`World: ${world.name}. Choose a world`}
        >
          <MapPreview
            key={world.id}
            map={world}
            fallback={world.swatch[0]}
            accent={world.swatch[2]}
            className="size-11 rounded-xl ring-1 ring-mint/40 shadow-[0_0_16px_-4px_var(--color-mint)] shrink-0 group-hover:ring-mint transition"
          />
          <span className="min-w-0 flex flex-col gap-1 text-shadow-md text-shadow-night">
            <span className="kicker leading-none">World</span>
            <span className="font-display text-sm font-bold text-ice leading-tight">{world.name}</span>
          </span>
        </button>

        <div className="flex items-stretch gap-2 shrink-0">
          {/* portrait only: sideways it has nothing to do */}
          {isPortrait && (
            <Button
              variant="frost"
              onClick={click(onRotate)}
              aria-label="Rotate to landscape"
              title="Rotate to landscape"
              className="h-auto rounded-2xl px-3 text-glacier max-sm:hidden"
            >
              <HugeiconsIcon icon={RotateClockwiseIcon} aria-hidden />
              Rotate
            </Button>
          )}
          <div className={tile} title="Best score">
            <span className={`${tileIcon} bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/30`}>
              <HugeiconsIcon icon={ChampionIcon} className="size-5" aria-hidden />
            </span>
            <span className="flex flex-col gap-1">
              <span className={`${tileLabel} text-amber-300`}>Best</span>
              <span className="glow-num text-base text-ice leading-none">{best}</span>
            </span>
          </div>
          <div className={`${tile} max-[359px]:hidden`} title="Crystals">
            <span className={`${tileIcon} bg-crystal/15 text-crystal ring-1 ring-crystal/30`}>
              <HugeiconsIcon icon={SnowflakeIcon} className="size-5" aria-hidden />
            </span>
            <span className="flex flex-col gap-1">
              <span className={`${tileLabel} text-crystal`}>Crystals</span>
              <span className="glow-num text-base text-ice leading-none">
                {crystals}
                <span className="sr-only"> crystals</span>
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* hero: kicker, wordmark, one-line pitch, the wide start button and its hint */}
      <div className="flex flex-col items-center text-center my-auto gap-4 short:gap-2 w-full">
        <span className="kicker frost-chip rounded-full px-4 py-1 short:hidden">Five-world orb runner</span>
        <OrblineLogo className="w-[min(30rem,88vw)] short:w-56 animate-float" />
        <p className="max-w-md text-sm sm:text-base font-semibold text-ice text-shadow-md text-shadow-night short:hidden">
          Roll through five living worlds, hop hazards with double jumps and ride power-ups as far as you can go.
        </p>
        <div className="relative mt-2 short:mt-0">
          <span aria-hidden className="play-ring absolute inset-0 rounded-full bg-mint/30" />
          <Button
            variant="aurora"
            onClick={click(onStart)}
            className="relative h-16 short:h-12 px-10 short:px-8 gap-3 text-xl short:text-lg"
          >
            <HugeiconsIcon icon={PlayIcon} className="size-6 fill-current" aria-hidden />
            Start run
          </Button>
        </div>
        <p className="text-xs font-semibold text-ice text-shadow-md text-shadow-night short:hidden">
          <span className="pointer-coarse:hidden">
            Click Start or press <kbd className="nd-kbd">Space</kbd>
          </span>
          <span className="hidden pointer-coarse:inline">Tap Start to play</span>
        </p>
      </div>

      <nav
        aria-label="Menu"
        className="frost-panel max-w-md w-full mx-auto p-1 rounded-2xl grid grid-cols-5 gap-1"
      >
        {dock.map((d) => (
          <button key={d.label} type="button" onClick={click(d.onClick)} className={dockBtn}>
            {d.dot && (
              <span className="absolute top-1 right-[calc(50%-14px)] size-2 rounded-full bg-aurora ring-2 ring-navy">
                <span className="sr-only">Reward ready</span>
              </span>
            )}
            <HugeiconsIcon icon={d.icon} className={`size-5 ${d.tint}`} aria-hidden />
            <span className={dockLabel}>{d.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
