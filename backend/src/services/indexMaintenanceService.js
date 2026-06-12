import { embedText } from '../vector/embedding.js'
import { withClient } from '../db/pool.js'
import { upsertChunkVectors } from './turbovecClient.js'

function toVectorLiteral(vector) {
  return `[${vector.map(value => Number(value) || 0).join(',')}]`
}

export async function rebuildUserVectorIndex({ userId, emitProgress = () => {} }) {
  const chunks = await withClient(async client => {
    const result = await client.query(
      `select dc.id, dc.content
       from document_chunks dc
       join documents d on d.id = dc.document_id
       where dc.user_id = $1 and d.user_id = $1
       order by dc.created_at`,
      [userId]
    )

    return result.rows
  })

  await emitProgress({
    stage: 'starting',
    percent: chunks.length === 0 ? 100 : 0,
    processed: 0,
    total: chunks.length,
    message: chunks.length === 0 ? 'No chunks to rebuild' : 'Starting vector rebuild'
  })

  for (const [index, chunk] of chunks.entries()) {
    const vector = embedText(chunk.content)

    await withClient(client => client.query(
      `update document_chunks
       set embedding = $1::vector
       where id = $2 and user_id = $3`,
      [toVectorLiteral(vector), chunk.id, userId]
    ))
    await upsertChunkVectors([{ id: chunk.id, vector }])

    const processed = index + 1
    await emitProgress({
      stage: 'rebuilding',
      percent: Math.round((processed / chunks.length) * 100),
      processed,
      total: chunks.length,
      message: `Rebuilt ${processed} of ${chunks.length} vectors`
    })
  }

  return {
    processed: chunks.length,
    total: chunks.length
  }
}
