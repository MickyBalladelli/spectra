import dotenv from 'dotenv'
import fs from 'fs/promises'
import pg from 'pg'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

dotenv.config({ path: join(root, '.env') })
dotenv.config()

const databaseUrl = process.env.DATABASE_URL || 'postgres://spectra:spectra@localhost:5432/spectra'
const adminUrl = process.env.POSTGRES_ADMIN_URL || 'postgres://localhost:5432/postgres'
const targetDatabase = getDatabaseName(databaseUrl)
const targetUser = getUserName(databaseUrl)
const targetPassword = getPassword(databaseUrl)

function getAdminUrl(url) {
  const parsed = new URL(url)
  parsed.pathname = '/postgres'
  return parsed.toString()
}

function getAdminTargetUrl(url) {
  const parsed = new URL(adminUrl)
  parsed.pathname = new URL(url).pathname
  return parsed.toString()
}

function getDatabaseName(url) {
  const parsed = new URL(url)
  return parsed.pathname.replace('/', '')
}

function getUserName(url) {
  const parsed = new URL(url)
  return decodeURIComponent(parsed.username)
}

function getPassword(url) {
  const parsed = new URL(url)
  return decodeURIComponent(parsed.password)
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`
}

function quoteLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`
}

async function databaseExists(client, name) {
  const result = await client.query('select 1 from pg_database where datname = $1', [name])
  return result.rowCount > 0
}

async function roleExists(client, name) {
  const result = await client.query('select 1 from pg_roles where rolname = $1', [name])
  return result.rowCount > 0
}

async function createDatabase() {
  const client = new pg.Client({ connectionString: adminUrl })
  await client.connect()

  try {
    if (!(await roleExists(client, targetUser))) {
      await client.query(`create role ${quoteIdentifier(targetUser)} with login password ${quoteLiteral(targetPassword)}`)
      console.log(`Created role ${targetUser}`)
    }

    if (await databaseExists(client, targetDatabase)) {
      console.log(`Database ${targetDatabase} already exists`)
      return
    }

    await client.query(`create database ${quoteIdentifier(targetDatabase)} owner ${quoteIdentifier(targetUser)}`)
    console.log(`Created database ${targetDatabase}`)
  } finally {
    await client.end()
  }
}

async function applySchema() {
  const schema = await fs.readFile(join(root, 'backend/db/schema.sql'), 'utf8')
  const extensionClient = new pg.Client({ connectionString: getAdminTargetUrl(databaseUrl) })
  await extensionClient.connect()

  try {
    await extensionClient.query(`create extension if not exists vector`)
  } finally {
    await extensionClient.end()
  }

  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    await client.query(schema)
    console.log('Applied schema')
  } finally {
    await client.end()
  }
}

async function main() {
  await createDatabase()
  await applySchema()
}

main().catch(error => {
  console.error(error.stack || error.message || error)
  process.exit(1)
})
