import { DuneScene } from './dunes/scene'
import { dunesSkin } from './dunes/skin'
import type { GameMap } from './types'

/** Sunset desert: a huge low sun, layered dunes, mesas and lantern-lit ruins. Art lives in ./dunes/. */
export const sunfallDunes: GameMap = {
  id: 'dunes',
  name: 'Sunfall Dunes',
  tagline: 'Chase the sunset over endless sand.',
  tiers: [
    { title: 'Copper Dusk', name: 'Cub', accent: '#2dd4bf' },
    { title: 'Ruin Road', name: 'Scout', accent: '#fbbf24' },
    { title: 'Sandstorm', name: 'Ranger', accent: '#f97316' },
    { title: 'Twilight Mesa', name: 'Legend', accent: '#c084fc' },
  ],
  swatch: ['#e9774c', '#d68a52', '#2dd4bf'],
  crystalName: 'sun-gems',
  createScene: (width, height, groundY) => new DuneScene(width, height, groundY),
  skin: dunesSkin,
}
