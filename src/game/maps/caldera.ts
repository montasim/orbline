import { CalderaScene } from './caldera/scene'
import { calderaSkin } from './caldera/skin'
import type { GameMap, Scene } from './types'

/** Volcanic night lit from below: erupting volcano, basalt cliffs, lava falls, ember-strewn black rock. */
export const cinderCaldera: GameMap = {
  id: 'caldera',
  name: 'Cinder Caldera',
  tagline: 'Outrun the eruption on molten rock.',
  tiers: [
    { title: 'Ashfall', name: 'Cub', accent: '#fb923c' },
    { title: 'Basalt Steps', name: 'Scout', accent: '#f97316' },
    { title: 'Lava Falls', name: 'Ranger', accent: '#ef4444' },
    { title: 'Heart of the Mountain', name: 'Legend', accent: '#fde047' },
  ],
  swatch: ['#1c0d0d', '#3a1410', '#ff6a2a'],
  crystalName: 'ember crystals',
  createScene(width, height, groundY): Scene {
    return new CalderaScene(width, height, groundY)
  },
  skin: calderaSkin,
}
