import { findChunksByText, findChunksByVector, writeQueryAudit } from '../db/documents.js'
import { env } from '../config/env.js'
import { embedText } from '../vector/embedding.js'
import { userCanAccessCollection } from '../db/collections.js'

function getQueryTerms(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map(term => term.replace(/[^\p{L}\p{N}_-]/gu, ''))
    .filter(term => term.length > 1)
}

function normalizeQuery(query) {
  return String(query || '')
    .trim()
    .replace(/^(please\s+)?(find|search|show|look\s+for|get|give\s+me|tell\s+me\s+about)\s+/i, '')
    .replace(/\s+/g, ' ')
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

  const terms = getQueryTerms(query)
  const keywordHits = terms
    .filter(term => String(row.content || '').toLowerCase().includes(term))
    .length
  const adjustedScore = Math.max(score, terms.length ? keywordHits / terms.length : score)

  return {
    ...row,
    content: createSnippet(row.content, query),
    keywordHits,
    confidence: adjustedScore >= 0.55 ? 'high' : adjustedScore >= env.searchMinScore ? 'medium' : 'low',
    score: Number(adjustedScore.toFixed(4))
  }
}

export async function executeQuery({ userId, query, filter = {}, topK = 5, collectionId = null }) {
  const startedAt = Date.now()
  const normalizedQuery = normalizeQuery(query) || query
  const vector = embedText(normalizedQuery)

  if (collectionId && !(await userCanAccessCollection({ userId, collectionId }))) {
    const error = new Error('Collection not found')
    error.status = 404
    throw error
  }

  const exactRows = await findChunksByText({ userId, query: normalizedQuery, collectionId, limit: topK })
  const exactKeys = new Set(exactRows.map(row => String(row.vectorKey)))

  const queryTermCount = getQueryTerms(normalizedQuery).length || 1
  const exactResults = exactRows
    .map(row => formatResult(row, normalizedQuery, (row.keywordHits || 0) / queryTermCount))
    .filter(result => result.score >= env.searchMinScore)
  const vectorRows = await findChunksByVector({
    userId,
    vector,
    collectionId,
    filter: {
      ...filter,
      userId
    },
    limit: topK
  })

  const vectorResults = vectorRows
    .map(row => formatResult(row, normalizedQuery, row.score))
    .filter(result => result?.id && result.score >= env.searchMinScore && !exactKeys.has(String(result.vectorKey)))
    .sort((left, right) => (right.keywordHits - left.keywordHits) || (right.score - left.score))

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
    normalizedQuery,
    results
  }
}
