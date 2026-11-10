// Server-only database access.
// - DATABASE_URL set → real PostgreSQL via postgres.js (production, or any local/hosted Postgres).
// - DATABASE_URL unset in dev → embedded PGlite (Postgres compiled to WASM) under .pglite/, auto-migrated.
import path from 'node:path'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from './schema'

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>

const MIGRATIONS = path.resolve(process.cwd(), 'drizzle')

// survive Vite HMR in dev: one connection pool / PGlite instance per process
const g = globalThis as unknown as { __orblineDb?: Promise<Db> }

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL
  if (url) {
    const { drizzle } = await import('drizzle-orm/postgres-js')
    const postgres = (await import('postgres')).default
    // prepare:false keeps it compatible with transaction-mode poolers (Neon/Supabase pgbouncer)
    const sql = postgres(url, { max: 5, prepare: false })
    return drizzle(sql, { schema }) as unknown as Db
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not set: the shared leaderboard needs a PostgreSQL database in production.')
  }
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const { migrate } = await import('drizzle-orm/pglite/migrator')
  const client = new PGlite(path.resolve(process.cwd(), '.pglite'))
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: MIGRATIONS })
  return db as unknown as Db
}

export function getDb(): Promise<Db> {
  g.__orblineDb ??= connect().catch((err) => {
    g.__orblineDb = undefined // let the next request retry instead of caching the failure
    throw err
  })
  return g.__orblineDb
}
