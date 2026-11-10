// Shared leaderboard API (TanStack Start server functions). Handlers run only on the server.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { getRequestIP } from '@tanstack/react-start/server'
import { and, count, desc, eq, gt, gte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { LEVELS } from '#/game/data'
import { verifyRun } from './anticheat'
import { nameProblem, normaliseName } from './names'
import { getDb } from './db/client'
import { players, runs } from './db/schema'

const LIMITS = {
  registrationsPerIpPerHour: 5,
  runStartsPerIpPerMinute: 30,
  topSize: 50,
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const newSecret = () => randomBytes(24).toString('base64url')
const ipHash = () => sha256(`${process.env.IP_HASH_SALT ?? 'northdash' /* unchanged on rename: keeps rate-limit hashes stable */}:${getRequestIP({ xForwardedFor: true }) ?? 'unknown'}`)

function sameHash(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// --- names -------------------------------------------------------------------------------------

const nameInput = z.string().max(64).transform(normaliseName)
const tokenInput = z.string().min(20).max(64)

async function playerByToken(token: string) {
  const db = await getDb()
  const [p] = await db.select().from(players).where(eq(players.tokenHash, sha256(token))).limit(1)
  return p ?? null
}

/** Errors whose message is safe and meant for the player; anything else is logged and hidden. */
class UserError extends Error {}

/** Never leak SQL, params or stack traces to the client: only UserError messages pass through. */
function guarded<A, R>(fn: (args: A) => Promise<R>) {
  return async (args: A): Promise<R> => {
    try {
      return await fn(args)
    } catch (e) {
      if (e instanceof UserError) throw e
      console.error('[leaderboard]', e)
      throw new Error('The leaderboard is unavailable right now. Try again soon.')
    }
  }
}

/** Postgres unique_violation, possibly wrapped by Drizzle ("Failed query: …" with the driver error as cause). */
function isUniqueViolation(e: unknown): boolean {
  for (let cur = e, depth = 0; cur && depth < 5; cur = (cur as { cause?: unknown }).cause, depth++) {
    if (typeof cur === 'object' && (cur as { code?: unknown }).code === '23505') return true
  }
  return false
}

export const registerPlayer = createServerFn({ method: 'POST' })
  .validator(z.object({ name: nameInput }))
  .handler(guarded(async ({ data }) => {
    const problem = nameProblem(data.name)
    if (problem) throw new UserError(problem)
    const db = await getDb()
    const ip = ipHash()
    const [recent] = await db
      .select({ n: count() })
      .from(players)
      .where(and(eq(players.createdIpHash, ip), gt(players.createdAt, sql`now() - interval '1 hour'`)))
    if ((recent?.n ?? 0) >= LIMITS.registrationsPerIpPerHour) throw new UserError('Too many new names from this network. Try again later.')
    const token = newSecret()
    try {
      const [p] = await db
        .insert(players)
        .values({ name: data.name, tokenHash: sha256(token), createdIpHash: ip })
        .returning({ id: players.id, name: players.name })
      return { playerId: p.id, name: p.name, token }
    } catch (e) {
      if (isUniqueViolation(e)) throw new UserError('That name is taken')
      throw e
    }
  }))

export const renamePlayer = createServerFn({ method: 'POST' })
  .validator(z.object({ token: tokenInput, name: nameInput }))
  .handler(guarded(async ({ data }) => {
    const problem = nameProblem(data.name)
    if (problem) throw new UserError(problem)
    const me = await playerByToken(data.token)
    if (!me) throw new UserError('Unknown player')
    const db = await getDb()
    try {
      await db.update(players).set({ name: data.name }).where(eq(players.id, me.id))
    } catch (e) {
      if (isUniqueViolation(e)) throw new UserError('That name is taken')
      throw e
    }
    return { name: data.name }
  }))

// --- runs --------------------------------------------------------------------------------------

/** Issues a single-use run ticket; the server clock starts now. */
export const startRun = createServerFn({ method: 'POST' })
  .validator(z.object({ token: tokenInput.optional() }))
  .handler(guarded(async ({ data }) => {
    const db = await getDb()
    const ip = ipHash()
    const [recent] = await db
      .select({ n: count() })
      .from(runs)
      .where(and(eq(runs.ipHash, ip), gt(runs.startedAt, sql`now() - interval '1 minute'`)))
    if ((recent?.n ?? 0) >= LIMITS.runStartsPerIpPerMinute) throw new UserError('Too many runs, slow down')
    const me = data.token ? await playerByToken(data.token) : null
    const secret = newSecret()
    const [run] = await db
      .insert(runs)
      .values({ playerId: me?.id ?? null, secretHash: sha256(secret), ipHash: ip })
      .returning({ id: runs.id })
    return { runId: run.id, secret }
  }))

const runResult = z.object({
  runId: z.string().uuid(),
  secret: tokenInput,
  token: tokenInput,
  distance: z.number().finite().nonnegative().max(10_000_000),
  crystals: z.number().int().nonnegative().max(1_000_000),
  speedBoosts: z.number().int().nonnegative().max(100_000),
})

export type FinishResult =
  | { status: 'accepted'; score: number; rank: number; personalBest: boolean }
  | { status: 'rejected'; reason: string }

/** Closes the ticket (once), verifies the claim against server time, and records the score. */
export const finishRun = createServerFn({ method: 'POST' })
  .validator(runResult)
  .handler(guarded(async ({ data }): Promise<FinishResult> => {
    const me = await playerByToken(data.token)
    if (!me) throw new UserError('Unknown player')
    const db = await getDb()
    const [ticket] = await db.select().from(runs).where(eq(runs.id, data.runId)).limit(1)
    if (!ticket || !sameHash(ticket.secretHash, sha256(data.secret))) throw new UserError('Invalid run ticket')
    if (ticket.playerId && ticket.playerId !== me.id) throw new UserError('Invalid run ticket')

    // claim the ticket atomically: a replayed or concurrent submit finds it no longer active
    const [closed] = await db
      .update(runs)
      .set({ status: 'rejected', finishedAt: sql`now()`, playerId: me.id, rejectReason: 'processing' })
      .where(and(eq(runs.id, ticket.id), eq(runs.status, 'active')))
      .returning({ elapsed: sql<number>`extract(epoch from (now() - ${runs.startedAt}))::float8` })
    if (!closed) throw new UserError('This run was already submitted')

    const distance = Math.floor(data.distance)
    const verdict = verifyRun(
      { elapsedSec: Number(closed.elapsed), distance, crystals: data.crystals, speedBoosts: data.speedBoosts },
      LEVELS,
    )
    const stats = { distance, crystals: data.crystals, speedBoosts: data.speedBoosts }
    if (!verdict.ok) {
      await db.update(runs).set({ ...stats, rejectReason: verdict.reason }).where(eq(runs.id, ticket.id))
      return { status: 'rejected', reason: verdict.reason }
    }
    await db
      .update(runs)
      .set({ ...stats, score: verdict.score, status: 'accepted', rejectReason: null })
      .where(eq(runs.id, ticket.id))
    const personalBest = verdict.score > me.bestScore
    if (personalBest) {
      await db
        .update(players)
        .set({ bestScore: verdict.score, bestDistance: distance, bestAt: sql`now()` })
        .where(and(eq(players.id, me.id), gt(sql`${verdict.score}`, players.bestScore)))
    }
    const best = Math.max(verdict.score, me.bestScore)
    return { status: 'accepted', score: verdict.score, rank: await rankOf(best), personalBest }
  }))

// --- board -------------------------------------------------------------------------------------

async function rankOf(score: number) {
  const db = await getDb()
  const [r] = await db.select({ n: count() }).from(players).where(gt(players.bestScore, score))
  return (r?.n ?? 0) + 1
}

export interface RankRow {
  rank: number
  name: string
  score: number
  distance: number
  isYou: boolean
}

export const getLeaderboard = createServerFn({ method: 'POST' })
  .validator(z.object({ token: tokenInput.optional() }))
  .handler(guarded(async ({ data }) => {
    const db = await getDb()
    const top = await db
      .select({ id: players.id, name: players.name, score: players.bestScore, distance: players.bestDistance })
      .from(players)
      .where(gt(players.bestScore, 0))
      .orderBy(desc(players.bestScore), players.bestAt)
      .limit(LIMITS.topSize)
    const me = data.token ? await playerByToken(data.token) : null
    // ties share a rank (standard competition ranking: 1, 2, 2, 4)
    const rows: RankRow[] = top.map((p, i) => ({
      rank: i > 0 && top[i - 1].score === p.score ? 0 : i + 1,
      name: p.name,
      score: p.score,
      distance: p.distance,
      isYou: p.id === me?.id,
    }))
    for (let i = 1; i < rows.length; i++) if (rows[i].rank === 0) rows[i].rank = rows[i - 1].rank
    const [total] = await db.select({ n: count() }).from(players).where(gte(players.bestScore, 1))
    const you = me
      ? { name: me.name, score: me.bestScore, distance: me.bestDistance, rank: me.bestScore > 0 ? await rankOf(me.bestScore) : null }
      : null
    return { top: rows, you, totalPlayers: total?.n ?? 0 }
  }))
