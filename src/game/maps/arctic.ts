import { LEVELS } from '../data'
import { Background } from '../engine/background'
import type { GameMap, Scene, Tier } from './types'

/** The first Orbline world (Northern Glacier); its art lives in engine/background.ts and the default obstacle art. */
export const arctic: GameMap = {
  id: 'arctic',
  name: 'Northern Glacier',
  tagline: 'Race the aurora across the endless ice.',
  tiers: [
    { title: LEVELS[0].title, name: LEVELS[0].name, accent: LEVELS[0].bgTheme.groundAccent },
    { title: LEVELS[1].title, name: LEVELS[1].name, accent: LEVELS[1].bgTheme.groundAccent },
    { title: LEVELS[2].title, name: LEVELS[2].name, accent: LEVELS[2].bgTheme.groundAccent },
    { title: LEVELS[3].title, name: LEVELS[3].name, accent: LEVELS[3].bgTheme.groundAccent },
  ],
  swatch: ['#0b1a3a', '#dbeafe', '#5eead4'],
  crystalName: 'crystals',
  createScene(width, height, groundY): Scene {
    const bg = new Background(width, height, groundY)
    return {
      resize: (w, h, gy) => bg.resize(w, h, gy),
      update: (speed) => bg.update(speed),
      draw: (ctx, tier: Tier) => bg.draw(ctx, LEVELS[tier].bgTheme),
    }
  },
  skin: { outline: 'rgba(8, 18, 45, 0.95)' },
}
