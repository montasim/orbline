import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LEVELS } from '../game/data.ts'
import { maxDistance, scoreFor, verifyRun } from './anticheat.ts'
import { nameProblem, normaliseName } from './names.ts'

// legit no-boost distance after t seconds (what the engine produces at a steady 60 fps)
const legit = (seconds: number) => maxDistance(seconds, 0, LEVELS)

test('level 1 pace: 7 * 2.8 = 19.6 m/s', () => {
  assert.ok(Math.abs(legit(10) - 196) < 1)
})

test('accepts an honest run and recomputes the score server-side', () => {
  const d = legit(60)
  const v = verifyRun({ elapsedSec: 60, distance: d, crystals: 40, speedBoosts: 0 }, LEVELS)
  assert.deepEqual(v, { ok: true, score: scoreFor(d, 40) })
})

test('accepts a run with Aurora Rush pickups', () => {
  const d = maxDistance(120, 15, LEVELS) // three 5 s boosts
  assert.equal(verifyRun({ elapsedSec: 120, distance: d, crystals: 80, speedBoosts: 3 }, LEVELS).ok, true)
})

test('accepts when the ticket arrived a little after the run started', () => {
  const d = legit(32) // played 32 s, server saw 30 s
  assert.equal(verifyRun({ elapsedSec: 30, distance: d, crystals: 0, speedBoosts: 0 }, LEVELS).ok, true)
})

test('rejects distance impossible in the elapsed time', () => {
  const v = verifyRun({ elapsedSec: 20, distance: 5000, crystals: 0, speedBoosts: 0 }, LEVELS)
  assert.equal(v.ok, false)
})

test('claiming many boosts cannot exceed the boost-share cap', () => {
  const capped = maxDistance(63, 63 * 0.6 + 10, LEVELS) * 1.05 + 10
  const v = verifyRun({ elapsedSec: 60, distance: capped + 50, crystals: 0, speedBoosts: 999 }, LEVELS)
  assert.equal(v.ok, false)
})

test('rejects more crystals than could have spawned', () => {
  const v = verifyRun({ elapsedSec: 60, distance: 1000, crystals: 500, speedBoosts: 0 }, LEVELS)
  assert.equal(v.ok, false)
})

test('rejects negative, NaN and fractional counts, and expired tickets', () => {
  assert.equal(verifyRun({ elapsedSec: 10, distance: -1, crystals: 0, speedBoosts: 0 }, LEVELS).ok, false)
  assert.equal(verifyRun({ elapsedSec: 10, distance: Number.NaN, crystals: 0, speedBoosts: 0 }, LEVELS).ok, false)
  assert.equal(verifyRun({ elapsedSec: 10, distance: 10, crystals: 1.5, speedBoosts: 0 }, LEVELS).ok, false)
  assert.equal(verifyRun({ elapsedSec: 3 * 3600, distance: 10, crystals: 0, speedBoosts: 0 }, LEVELS).ok, false)
})

test('names: normalised, 3–16 chars, safe characters, blocklist', () => {
  assert.equal(normaliseName('  Polar   Star  '), 'Polar Star')
  assert.equal(nameProblem('Polar Star'), null)
  assert.equal(nameProblem('Åsa_99'), null)
  assert.ok(nameProblem('ab'))
  assert.ok(nameProblem('a'.repeat(17)))
  assert.ok(nameProblem('<script>'))
  assert.ok(nameProblem(' leading'))
  assert.ok(nameProblem('NorthDash Admin'))
})
