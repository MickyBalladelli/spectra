import { pool } from '../src/db/pool.js'
import { embedText } from '../src/vector/embedding.js'
import { runVectorWorker } from '../src/vector/workerBridge.js'

async function loadChunks() {
  const result = await pool.query(
    `select dc.document_id as "documentId", dc.chunk_index as "chunkIndex",
      dc.vector_key as "vectorKey", dc.content, dc.metadata
     from document_chunks dc
     order by dc.document_id, dc.chunk_index`
  )

  return result.rows
}

async function rebuild() {
  const chunks = await loadChunks()
  const byDocument = new Map()

  for (const chunk of chunks) {
    const current = byDocument.get(chunk.documentId) || []
    current.push({
      chunkIndex: chunk.chunkIndex,
      vectorKey: chunk.vectorKey,
      vector: embedText(chunk.content),
      metadata: chunk.metadata
    })
    byDocument.set(chunk.documentId, current)
  }

  for (const [documentId, documentChunks] of byDocument.entries()) {
    await runVectorWorker({
      operation: 'upsert',
      documentId,
      chunks: documentChunks
    })
  }

  console.log(`Rebuilt ${chunks.length} vectors from ${byDocument.size} documents`)
}

rebuild()
  .catch(error => {
    console.error(error.stack || error.message || error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
