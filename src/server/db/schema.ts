import { sql } from 'drizzle-orm'
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const players = pgTable(
  'players',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    /** sha256 of the secret token the client keeps; the token itself is never stored */
    tokenHash: text('token_hash').notNull(),
    bestScore: integer('best_score').notNull().default(0),
    bestDistance: integer('best_distance').notNull().default(0),
    bestAt: timestamp('best_at', { withTimezone: true }),
    createdIpHash: text('created_ip_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('players_name_ci_idx').on(sql`lower(${t.name})`),
    uniqueIndex('players_token_hash_idx').on(t.tokenHash),
    index('players_best_score_idx').on(t.bestScore),
    index('players_created_ip_idx').on(t.createdIpHash, t.createdAt),
  ],
)

export const runStatus = ['active', 'accepted', 'rejected'] as const
export type RunStatus = (typeof runStatus)[number]

/** One row per run ticket; kept after finishing as an audit trail (rejected runs record why). */
export const runs = pgTable(
  'runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id').references(() => players.id, { onDelete: 'cascade' }),
    secretHash: text('secret_hash').notNull(),
    status: text('status', { enum: runStatus }).notNull().default('active'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    distance: integer('distance'),
    crystals: integer('crystals'),
    speedBoosts: integer('speed_boosts'),
    /** computed by the server from distance + crystals, never taken from the client */
    score: integer('score'),
    rejectReason: text('reject_reason'),
    ipHash: text('ip_hash'),
  },
  (t) => [index('runs_ip_started_idx').on(t.ipHash, t.startedAt), index('runs_player_idx').on(t.playerId)],
)
