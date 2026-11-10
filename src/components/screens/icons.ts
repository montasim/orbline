// lucide (original bundle) -> Hugeicons free equivalents.
import {
  Award01Icon,
  ChampionIcon,
  Coins01Icon,
  CrownIcon,
  FastWindIcon,
  FireIcon,
  FootprintsIcon,
  MagnetIcon,
  Shield01Icon,
  SparklesIcon,
  TShirtIcon,
  ZapIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import type { IconName } from '#/game/data'

export const ICONS: Record<IconName, IconSvgElement> = {
  Award: Award01Icon,
  Trophy: ChampionIcon,
  Shirt: TShirtIcon,
  Zap: ZapIcon,
  Shield: Shield01Icon,
  Flame: FireIcon,
  Coins: Coins01Icon,
  Footprints: FootprintsIcon,
  Crown: CrownIcon,
  Wind: FastWindIcon,
  Magnet: MagnetIcon,
}

/** Fallback used by the original toast (lucide `sparkles`). */
export const DEFAULT_ICON = SparklesIcon
