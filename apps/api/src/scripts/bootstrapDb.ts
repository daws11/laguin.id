import { loadEnv } from '../lib/env'
import { spawnSync } from 'node:child_process'

loadEnv()

function runPsql(args: string[]) {
  const res = spawnSync('psql', args, { stdio: 'inherit' })
  if (res.status !== 0) {
    throw new Error(`psql failed (exit ${res.status ?? 'unknown'})`)
  }
}

function runPsqlCapture(args: string[]) {
  const res = spawnSync('psql', args, { encoding: 'utf8' })
  if (res.status !== 0) {
    // include stderr when failing
    process.stderr.write(res.stderr ?? '')
    throw new Error(`psql failed (exit ${res.status ?? 'unknown'})`)
  }
  return (res.stdout ?? '').trim()
}

function required(name: string, value: string | undefined | null) {
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function escapeLiteral(value: string) {
  return value.replace(/'/g, "''")
}

function quoteIdent(value: string) {
  // minimal identifier quoting for Postgres
  return `"${value.replace(/"/g, '""')}"`
}

function main() {
  const databaseUrl = required('DATABASE_URL', process.env.DATABASE_URL)
  const u = new URL(databaseUrl)

  const host = u.hostname || 'localhost'
  const port = u.port || '5432'
  const dbName = u.pathname.replace(/^\//, '')
  const dbUser = decodeURIComponent(u.username || '')
  const dbPass = decodeURIComponent(u.password || '')

  if (!dbName) throw new Error('DATABASE_URL missing database name')
  if (!dbUser) throw new Error('DATABASE_URL missing username')

  // Use admin connection if provided. Otherwise rely on local psql auth (common for dev).
  // Example:
  // PG_ADMIN_URL="postgresql://postgres:postgres@localhost:5432/postgres"
  const adminUrl = process.env.PG_ADMIN_URL
  const psqlBaseArgs = adminUrl
    ? [adminUrl]
    : ['-h', host, '-p', port, '-d', 'postgres']

  console.log(`[bootstrap-db] ensuring role "${dbUser}" and database "${dbName}" exist…`)
  const userExists = runPsqlCapture([
    ...psqlBaseArgs,
    '-tA',
    '-c',
    `SELECT 1 FROM pg_roles WHERE rolname = '${escapeLiteral(dbUser)}'`,
  ])
  if (!userExists) {
    const createRoleSql =
      dbPass.length > 0
        ? `CREATE ROLE ${quoteIdent(dbUser)} WITH LOGIN PASSWORD '${escapeLiteral(dbPass)}';`
        : `CREATE ROLE ${quoteIdent(dbUser)} WITH LOGIN;`
    runPsql([...psqlBaseArgs, '-v', 'ON_ERROR_STOP=1', '-c', createRoleSql])
  }

  // Prisma migrate dev uses a "shadow database" and needs CREATEDB.
  // We grant CREATEDB for local MVP convenience.
  runPsql([...psqlBaseArgs, '-v', 'ON_ERROR_STOP=1', '-c', `ALTER ROLE ${quoteIdent(dbUser)} CREATEDB;`])

  const dbExists = runPsqlCapture([
    ...psqlBaseArgs,
    '-tA',
    '-c',
    `SELECT 1 FROM pg_database WHERE datname = '${escapeLiteral(dbName)}'`,
  ])
  if (!dbExists) {
    const createDbSql = `CREATE DATABASE ${quoteIdent(dbName)} OWNER ${quoteIdent(dbUser)};`
    runPsql([...psqlBaseArgs, '-v', 'ON_ERROR_STOP=1', '-c', createDbSql])
  }

  // Ensure privileges (safe even if already owner).
  const grantSql = `GRANT ALL PRIVILEGES ON DATABASE ${quoteIdent(dbName)} TO ${quoteIdent(dbUser)};`
  runPsql([...psqlBaseArgs, '-v', 'ON_ERROR_STOP=1', '-c', grantSql])

  console.log('[bootstrap-db] done')
}

main()

