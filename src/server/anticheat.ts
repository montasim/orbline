// Server-side plausibility check for a finished run. Pure: no I/O, unit-tested in anticheat.test.ts.
//
// What it guarantees: the score is recomputed here (never trusted from the client), and the claimed
// distance/crystals must be physically reachable in the wall-clock time the server measured between
// issuing the run ticket and receiving the result.
// What it can't guarantee: a scripted client that fakes *plausible* numbers inside those bounds.
// Closing that gap needs server-side replay of recorded inputs with a server-seeded RNG.
import type { Level } from '../game/data'

/** Mirrors the engine: distance += speed * 2.8 * dt * (boost ? 2 : 1), speed *= 1.55 while boosted. */
const METERS_PER_SPEED_UNIT = 2.8
const BOOST_SPEED = 1.55
const BOOST_DISTANCE = 2
/** Aurora Rush can't realistically cover more than this share of a run (expected ≈16% L1 … ≈47% L4). */
const MAX_BOOST_SHARE = 0.6
const BOOST_GRACE_SEC = 10
const BOOST_SECONDS_EACH = 5
/** Obstacles spawn on a timer with ≤4 crystals each: ≈0.17 crystals/m at most, at any level. */
const MAX_CRYSTALS_PER_METER = 0.2
const CRYSTAL_GRACE = 8
/** The ticket is issued a moment after the run starts locally (network latency). */
const START_LATENCY_GRACE_SEC = 3
const DISTANCE_TOLERANCE = 1.05
export const MAX_RUN_SECONDS = 2 * 60 * 60

export interface RunClaim {
  /** server-measured seconds between ticket issue and submission */
  elapsedSec: number
  distance: number
  crystals: number
  /** Aurora Rush pickups the client reports */
  speedBoosts: number
}

export type Verdict = { ok: true; score: number } | { ok: false; reason: string }

export const scoreFor = (distance: number, crystals: number) => Math.floor(distance + crystals * 25)

/** Farthest distance reachable in `seconds`, front-loading `boostSec` of Aurora Rush (which maximises it,
 *  because reaching faster levels sooner raises every later second's speed). */
export function maxDistance(seconds: number, boostSec: number, levels: Level[]): number {
  const dt = 0.05
  let d = 0
  for (let t = 0; t < seconds; t += dt) {
    const level = levelAt(d, levels)
    const boosted = t < boostSec
    const speed = level.baseSpeed * (boosted ? BOOST_SPEED : 1)
    d += speed * METERS_PER_SPEED_UNIT * Math.min(dt, seconds - t) * (boosted ? BOOST_DISTANCE : 1)
  }
  return d
}

function levelAt(distance: number, levels: Level[]): Level {
  for (let i = levels.length - 1; i >= 0; i--) if (distance >= levels[i].minDistance) return levels[i]
  return levels[0]
}

export function verifyRun(claim: RunClaim, levels: Level[]): Verdict {
  const { elapsedSec, distance, crystals, speedBoosts } = claim
  for (const [k, v] of Object.entries({ distance, crystals, speedBoosts })) {
    if (!Number.isFinite(v) || v < 0) return { ok: false, reason: `invalid ${k}` }
  }
  if (!Number.isInteger(crystals) || !Number.isInteger(speedBoosts)) return { ok: false, reason: 'non-integer count' }
  if (elapsedSec > MAX_RUN_SECONDS) return { ok: false, reason: 'run ticket expired' }

  const seconds = Math.max(0, elapsedSec) + START_LATENCY_GRACE_SEC
  const boostSec = Math.min(speedBoosts * BOOST_SECONDS_EACH, seconds * MAX_BOOST_SHARE + BOOST_GRACE_SEC, seconds)
  const limit = maxDistance(seconds, boostSec, levels) * DISTANCE_TOLERANCE + 10
  if (distance > limit) {
    return { ok: false, reason: `distance ${Math.round(distance)}m exceeds ${Math.round(limit)}m possible in ${Math.round(seconds)}s` }
  }
  if (crystals > distance * MAX_CRYSTALS_PER_METER + CRYSTAL_GRACE) {
    return { ok: false, reason: `${crystals} crystals impossible over ${Math.round(distance)}m` }
  }
  return { ok: true, score: scoreFor(distance, crystals) }
}
