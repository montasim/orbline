import { arctic } from './arctic'
import { cinderCaldera } from './caldera'
import { coralDeep } from './reef'
import { sunfallDunes } from './dunes'
import { bloomMeadow } from './meadow'
import type { GameMap } from './types'

export type { GameMap, Scene, Skin, Tier, TierStyle } from './types'

/** Picker order. New maps register here. */
export const MAPS: GameMap[] = [arctic, bloomMeadow, sunfallDunes, coralDeep, cinderCaldera]

export const mapById = (id: string): GameMap => MAPS.find((m) => m.id === id) ?? MAPS[0]
