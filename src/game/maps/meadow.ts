import { MeadowScene } from './meadow/scene'
import { meadowSkin } from './meadow/skin'
import type { GameMap } from './types'

/** The only daytime world: a sunlit spring valley that runs from misty dawn to golden hour. */
export const bloomMeadow: GameMap = {
  id: 'meadow',
  name: 'Bloom Meadow',
  tagline: 'Sprint through sunlit spring hills.',
  tiers: [
    { title: 'Dewy Dawn', name: 'Cub', accent: '#f472b6' },
    { title: 'Windmill Hills', name: 'Scout', accent: '#facc15' },
    { title: 'Blossom Gale', name: 'Ranger', accent: '#fb7185' },
    { title: 'Golden Hour', name: 'Legend', accent: '#f59e0b' },
  ],
  swatch: ['#9fd6f2', '#7cc56a', '#f472b6'],
  crystalName: 'sunseeds',
  createScene: (width, height, groundY) => new MeadowScene(width, height, groundY),
  skin: meadowSkin,
}
