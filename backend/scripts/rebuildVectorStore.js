import { pool } from '../src/db/pool.js'
import { embedText } from '../src/vector/embedding.js'

function toVectorLiteral(vector) {
  return `[${vector.map(value => Number(value) || 0).join(',')}]`
}

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

  for (const chunk of chunks) {
    await pool.query(
      `update document_chunks
       set embedding = $1::vector
       where vector_key = $2`,
      [toVectorLiteral(embedText(chunk.content)), chunk.vectorKey]
    )
  }

  console.log(`Rebuilt ${chunks.length} pgvector embeddings`)
}

rebuild()
  .catch(error => {
    console.error(error.stack || error.message || error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
