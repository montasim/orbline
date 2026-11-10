// Engine icon names -> Hugeicons free set, in Orbline's style.
import {
  Award01Icon,
  ChampionIcon,
  CrownIcon,
  FastWindIcon,
  FireIcon,
  FootprintsIcon,
  MagnetIcon,
  OrbitIcon,
  Shield01Icon,
  SnowflakeIcon,
  SparklesIcon,
  ZapIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import type { IconName } from '#/game/data'

export const ICONS: Record<IconName, IconSvgElement> = {
  Award: Award01Icon,
  Trophy: ChampionIcon,
  Shirt: OrbitIcon,
  Zap: ZapIcon,
  Shield: Shield01Icon,
  Flame: FireIcon,
  Coins: SnowflakeIcon,
  Footprints: FootprintsIcon,
  Crown: CrownIcon,
  Wind: FastWindIcon,
  Magnet: MagnetIcon,
}

export const DEFAULT_ICON = SparklesIcon
