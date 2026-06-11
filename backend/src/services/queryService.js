import { findChunksByText, findChunksByVector, writeQueryAudit } from '../db/documents.js'
import { embedText } from '../vector/embedding.js'

function getQueryTerms(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map(term => term.replace(/[^\p{L}\p{N}_-]/gu, ''))
    .filter(term => term.length > 1)
}

function createSnippet(content, query) {
  const text = String(content || '').replace(/\s+/g, ' ').trim()
  if (text.length <= 360) return text

  const terms = getQueryTerms(query)
  const lowerText = text.toLowerCase()
  const firstHit = terms
    .map(term => lowerText.indexOf(term))
    .filter(index => index >= 0)
    .sort((left, right) => left - right)[0]

  if (firstHit === undefined) return `${text.slice(0, 340)}...`

  const start = Math.max(0, firstHit - 140)
  const end = Math.min(text.length, firstHit + 220)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''

  return `${prefix}${text.slice(start, end)}${suffix}`
}

function formatResult(row, query, score) {
  if (!row) return null

  return {
    ...row,
    content: createSnippet(row.content, query),
    score
  }
}

export async function executeQuery({ userId, query, filter = {}, topK = 5 }) {
  const startedAt = Date.now()
  const vector = embedText(query)

  const exactRows = await findChunksByText({ userId, query, limit: topK })
  const exactKeys = new Set(exactRows.map(row => String(row.vectorKey)))

  const exactResults = exactRows.map(row => formatResult(row, query, 1.0))
  const vectorRows = await findChunksByVector({
    userId,
    vector,
    filter: {
      ...filter,
      userId
    },
    limit: topK
  })

  const vectorResults = vectorRows
    .map(row => formatResult(row, query, row.score))
    .filter(result => result?.id && !exactKeys.has(String(result.vectorKey)))

  const results = exactResults.concat(vectorResults).slice(0, topK)
  const latencyMs = Date.now() - startedAt

  await writeQueryAudit({
    userId,
    query,
    filter,
    latencyMs,
    resultCount: results.length
  })

  return {
    latencyMs,
    results
  }
}
