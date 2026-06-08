import { findChunksByText, findChunksByVectorKeys, writeQueryAudit } from '../db/documents.js'
import { embedText } from '../vector/embedding.js'
import { runVectorWorker } from '../vector/workerBridge.js'

export async function executeQuery({ userId, query, filter = {}, topK = 5 }) {
  const startedAt = Date.now()
  const vector = embedText(query)

  const workerResult = await runVectorWorker({
    operation: 'search',
    query,
    vector,
    filter: {
      ...filter,
      userId
    },
    topK
  })

  const vectorKeys = workerResult.matches.map(match => match.vectorKey)
  const rows = await findChunksByVectorKeys({ userId, vectorKeys })
  const byKey = new Map(rows.map(row => [String(row.vectorKey), row]))

  const exactRows = await findChunksByText({ userId, query, limit: topK })
  const exactKeys = new Set(exactRows.map(row => String(row.vectorKey)))

  const exactResults = exactRows.map(row => ({
    ...row,
    score: 1.0
  }))

  const vectorResults = workerResult.matches
    .map(match => ({
      ...byKey.get(String(match.vectorKey)),
      score: match.score
    }))
    .filter(result => result.id && !exactKeys.has(String(result.vectorKey)))

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
