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
  const hits = terms
    .flatMap(term => {
      const indexes = []
      let index = lowerText.indexOf(term)
      while (index >= 0) {
        indexes.push(index)
        index = lowerText.indexOf(term, index + term.length)
      }
      return indexes
    })
    .sort((left, right) => left - right)

  if (hits.length === 0) return `${text.slice(0, 340)}...`

  const bestHit = hits
    .map(index => ({
      index,
      count: hits.filter(hit => hit >= index - 140 && hit <= index + 220).length
    }))
    .sort((left, right) => (right.count - left.count) || (left.index - right.index))[0].index

  const start = Math.max(0, bestHit - 140)
  const end = Math.min(text.length, bestHit + 220)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''

  return `${prefix}${text.slice(start, end)}${suffix}`
}

function formatResult(row, query, scores) {
  if (!row) return null

  const terms = getQueryTerms(query)
  const keywordHits = terms
    .filter(term => String(row.content || '').toLowerCase().includes(term))
    .length
  const textScore = scores.textScore ?? (terms.length ? keywordHits / terms.length : 0)
  const vectorScore = scores.vectorScore ?? 0
  const combinedScore = (textScore * 0.6) + (vectorScore * 0.4)

  return {
    ...row,
    content: createSnippet(row.content, query),
    keywordHits,
    textScore: Number(textScore.toFixed(4)),
    vectorScore: Number(vectorScore.toFixed(4)),
    confidence: combinedScore >= 0.55 ? 'high' : combinedScore >= env.searchMinScore ? 'medium' : 'low',
    score: Number(combinedScore.toFixed(4))
  }
}

export async function executeQuery({ userId, query, filter = {}, searchFilters = {}, topK = 5, collectionId = null }) {
  const startedAt = Date.now()
  const normalizedQuery = normalizeQuery(query) || query
  const vector = embedText(normalizedQuery)

  if (collectionId && !(await userCanAccessCollection({ userId, collectionId }))) {
    const error = new Error('Collection not found')
    error.status = 404
    throw error
  }

  const poolLimit = Math.max(topK * 4, 20)
  const exactRows = await findChunksByText({ userId, query: normalizedQuery, collectionId, searchFilters, limit: poolLimit })

  const queryTermCount = getQueryTerms(normalizedQuery).length || 1
  const vectorRows = await findChunksByVector({
    userId,
    vector,
    collectionId,
    searchFilters,
    filter,
    limit: poolLimit
  })

  const byKey = new Map()
  for (const row of exactRows) {
    byKey.set(String(row.vectorKey), {
      row,
      textScore: (row.keywordHits || 0) / queryTermCount,
      vectorScore: 0
    })
  }

  for (const row of vectorRows) {
    const key = String(row.vectorKey)
    const current = byKey.get(key) || { row, textScore: 0, vectorScore: 0 }
    current.row = { ...current.row, ...row }
    current.vectorScore = row.score || 0
    byKey.set(key, current)
  }

  const results = Array.from(byKey.values())
    .map(match => formatResult(match.row, normalizedQuery, {
      textScore: match.textScore,
      vectorScore: match.vectorScore
    }))
    .filter(result => result?.id && result.score >= env.searchMinScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, topK)
  const latencyMs = Date.now() - startedAt

  const queryAudit = await writeQueryAudit({
    userId,
    query,
    filter,
    searchFilters,
    latencyMs,
    resultCount: results.length
  })

  return {
    queryAuditId: queryAudit?.id || null,
    latencyMs,
    normalizedQuery,
    results
  }
}
