import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  ChampionIcon,
  PlayIcon,
  RankingIcon,
  OrbitIcon,
  RotateClockwiseIcon,
  Settings02Icon,
  StarIcon,
} from '@hugeicons/core-free-icons'
import { audio } from '#/game/audio'
import { MAPS, mapById } from '#/game/maps'
import { storage } from '#/game/storage'
import { Button } from '#/components/ui/button'
import { OrblineLogo } from './Logo'
import { MapPreview } from './RegionsDialog'
import { Chip, Crystals } from './shared'

interface MainMenuProps {
  onStart: () => void
  onOpenSkins: () => void
  onOpenDaily: () => void
  onOpenAchievements: () => void
  onOpenLeaderboard: () => void
  onOpenSettings: () => void
  onOpenRegions: () => void
  /** id of the selected world; the ◀ ▶ arrows switch it in place */
  selectedMap: string
  onChangeMap: (id: string) => void
  isPortrait: boolean
  onRotate?: () => void
}

// dock keeps its own compact shape: p-2 tray, py-2 items (py-1 on short screens) so it fits landscape phones
const dockBtn =
  'relative flex flex-col items-center gap-1 py-2 short:py-1 rounded-2xl text-slate-200 hover:text-ice hover:bg-white/8 active:scale-95 transition'
const dockLabel = 'font-display text-xs font-extrabold uppercase tracking-wider'

export function MainMenu({
  onStart,
  onOpenSkins,
  onOpenDaily,
  onOpenAchievements,
  onOpenLeaderboard,
  onOpenSettings,
  onOpenRegions,
  selectedMap,
  onChangeMap,
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
  const cycleWorld = (step: number) => () => {
    audio.playButtonClick()
    const i = MAPS.findIndex((m) => m.id === world.id)
    onChangeMap(MAPS[(i + step + MAPS.length) % MAPS.length].id)
  }

  const dock = [
    { label: 'Orbs', icon: OrbitIcon, onClick: onOpenSkins },
    { label: 'Daily', icon: Calendar03Icon, onClick: onOpenDaily, dot: dailyReady },
    { label: 'Trophies', icon: ChampionIcon, onClick: onOpenAchievements },
    { label: 'Ranks', icon: RankingIcon, onClick: onOpenLeaderboard },
    { label: 'Settings', icon: Settings02Icon, onClick: onOpenSettings },
  ]

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between gap-4 p-4 sm:p-6 short:gap-2 select-none overflow-y-auto pb-[max(16px,env(safe-area-inset-bottom))]">
      {/* game-style counters on the left, rotate on the right (portrait only: it does nothing sideways) */}
      <div className="flex items-center justify-between w-full gap-2 min-h-10">
        <div className="flex items-center gap-2">
          <Chip className="pl-1" title="Best score">
            <span className="size-7 rounded-full bg-mint/20 text-mint flex items-center justify-center">
              <HugeiconsIcon icon={StarIcon} className="size-4" aria-hidden />
            </span>
            <span className="sr-only">Best score</span>
            <span className="glow-num text-base text-ice">{best}</span>
          </Chip>
          <Chip className="text-base" title="Crystals">
            <Crystals amount={crystals} className="glow-num" />
          </Chip>
        </div>
        {isPortrait && (
          <Button
            variant="frost"
            size="icon"
            onClick={click(onRotate)}
            aria-label="Rotate to landscape"
            title="Rotate to landscape"
            className="text-glacier"
          >
            <HugeiconsIcon icon={RotateClockwiseIcon} aria-hidden />
          </Button>
        )}
      </div>

      {/* one centred column. Short landscape phones put Play and the world switcher side by side under the logo */}
      <div className="flex flex-col items-center text-center my-auto gap-6 short:gap-3 w-full">
        <OrblineLogo className="w-[min(30rem,88vw)] short:w-56 animate-float" />

        <div className="flex flex-col short:flex-row items-center justify-center gap-6 short:gap-3 w-full">
        {/* play: a big round button on tall screens, a wide labelled pill on short ones */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <span aria-hidden className="play-ring absolute inset-0 rounded-full bg-mint/40 short:hidden" />
            <Button
              variant="aurora"
              onClick={click(onStart)}
              aria-label="Start run"
              className="relative size-24 p-0 short:size-auto short:h-14 short:px-8 short:gap-2 short:text-lg"
            >
              <HugeiconsIcon icon={PlayIcon} className="size-10 short:size-6 fill-current translate-x-0.5" aria-hidden />
              <span className="hidden short:inline">Play</span>
            </Button>
          </div>
          <Chip className="short:hidden h-auto py-1 font-display text-xs font-extrabold uppercase tracking-widest text-ice">
            <span className="pointer-coarse:hidden">
              Press <kbd className="nd-kbd">Space</kbd> to play
            </span>
            <span className="hidden pointer-coarse:inline">Tap to play</span>
          </Chip>
        </div>

        {/* world card: real scene thumbnail, name and tagline; arrows switch worlds, the card opens Regions */}
        <div className="frost-panel rounded-2xl short:rounded-full p-2 short:p-1 flex items-center gap-2 w-full max-w-md short:w-auto">
          <Button variant="frost" size="icon" onClick={cycleWorld(-1)} aria-label="Previous world" className="text-glacier">
            <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden />
          </Button>
          <button
            type="button"
            onClick={click(onOpenRegions)}
            className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-xl p-1 hover:bg-white/5 transition"
            aria-label={`World: ${world.name}. Open all worlds`}
          >
            <MapPreview
              key={world.id}
              map={world}
              fallback={world.swatch[0]}
              accent={world.swatch[2]}
              className="h-12 w-20 short:hidden shrink-0"
            />
            <span className="min-w-0 flex flex-col gap-1">
              <span className="font-display text-sm min-[400px]:text-base font-extrabold uppercase tracking-wide leading-tight text-ice short:whitespace-nowrap">
                {world.name}
              </span>
              <span className="short:hidden text-xs text-slate-300 truncate">{world.tagline}</span>
            </span>
          </button>
          <Button variant="frost" size="icon" onClick={cycleWorld(1)} aria-label="Next world" className="text-glacier">
            <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden />
          </Button>
        </div>
        </div>
      </div>

      <nav
        aria-label="Menu"
        className="frost-panel max-w-lg w-full mx-auto p-2 rounded-3xl grid grid-cols-5 gap-2"
      >
        {dock.map((d) => (
          <button key={d.label} type="button" onClick={click(d.onClick)} className={dockBtn}>
            {d.dot && (
              <span className="absolute top-1 right-[calc(50%-14px)] size-2 rounded-full bg-aurora ring-2 ring-navy">
                <span className="sr-only">Reward ready</span>
              </span>
            )}
            <HugeiconsIcon icon={d.icon} className="size-5 text-glacier" aria-hidden />
            <span className={dockLabel}>{d.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
