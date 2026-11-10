import { ReefScene } from './reef/scene'
import { reefSkin } from './reef/skin'
import type { GameMap } from './types'

/** Underwater reef lit from the shimmering surface; in the abyss glowing plankton, plants and crystals take over. */
export const coralDeep: GameMap = {
  id: 'reef',
  name: 'Coral Deep',
  tagline: 'Dash along a glowing ocean floor.',
  tiers: [
    { title: 'Shallow Lagoon', name: 'Cub', accent: '#67e8f9' },
    { title: 'Kelp Forest', name: 'Scout', accent: '#34d399' },
    { title: 'Shipwreck Trench', name: 'Ranger', accent: '#fda4af' },
    { title: 'Abyssal Glow', name: 'Legend', accent: '#a78bfa' },
  ],
  swatch: ['#0f3d66', '#d6c08f', '#67e8f9'],
  crystalName: 'pearls',
  createScene: (width, height, groundY) => new ReefScene(width, height, groundY),
  skin: reefSkin,
}
